import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  applyCalibratedFingerPose,
  applyClosedGripFingerCurl,
  calibrateHandFingerChains,
  createDefaultBonePoseState,
  discoverHandFingerChains,
  type CalibratedHandFingers,
  type DirectBonePoseState,
  type FingerChainBones,
  type FingerPoseMode,
  GLOBAL_RIG_CALIBRATION,
  isBakedHandheldWeaponObject
} from './rigCalibration';

export interface GlbModelConfig {
  file: string;
  /** Target world height in meters (for humanoids ~1.78m) */
  targetHeight: number;
  /** Optional max-axis span override for winged dragons & quadrupeds */
  targetSpan?: number;
  /** Yaw rotation (radians) so model faces Horizon's local -Z forward axis (default Math.PI since glTF faces +Z) */
  yawOffset?: number;
  rxOffset?: number;
  rzOffset?: number;
  yOffset?: number;
  /** Optional subtle color tint multiplied onto materials for variant archetypes */
  tintHex?: number;
  /** Whether to strip flat display stands/pedestals & detached showcase props automatically */
  stripPedestal?: boolean;
  /** Optional head bone proportion scale (e.g. 0.58 normalizes chibi-proportioned heads to heroic 1:6.5 anime proportions) */
  headScale?: number;
  /** If true, uses authentic Mojang 1.8 articulated boxy Minecraft rig instead of GLB mesh */
  isMinecraftRig?: boolean;
}

interface CachedTemplate {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  naturalBox: THREE.Box3;
  naturalSize: THREE.Vector3;
}

export interface HumanoidBoneMap {
  hips?: THREE.Bone;
  head?: THREE.Bone;
  neck?: THREE.Bone;
  spine?: THREE.Bone;
  armL?: THREE.Bone;
  foreArmL?: THREE.Bone;
  handL?: THREE.Bone;
  armR?: THREE.Bone;
  foreArmR?: THREE.Bone;
  handR?: THREE.Bone;
  thighL?: THREE.Bone;
  shinL?: THREE.Bone;
  footL?: THREE.Bone;
  thighR?: THREE.Bone;
  shinR?: THREE.Bone;
  footR?: THREE.Bone;
}

interface RestBoneState {
  bone: THREE.Bone;
  restQuat: THREE.Quaternion;
  /** Local rotation axis that swings limb forward/back along character -Z/+Z (wrapper +X) */
  pitchAxisLocal: THREE.Vector3;
  /** Local rotation axis for yaw/twist (wrapper +Y) */
  yawAxisLocal: THREE.Vector3;
  /** Local rotation axis for lateral abduction/roll (wrapper +Z) */
  rollAxisLocal: THREE.Vector3;
}

function isNonDeformingHelperBone(name: string): boolean {
  return /^(?:vis_|mch-|org-|deform_|gp_|unused(?:[_.\-\s]|$)|_dummy_|_shadow_|gd_(?:thigh|calf|uparm|lowarm|knee|elbow|groin|shldr|hip|neck_scl|chest_scl|stomach_scl|waist_scl|pelvis_scl))|_end(?:_|\d|$)|_sup(?:_|\d|$)|_(?:ik|fk)(?:[lr]|\b|_|\d)|ik_pole|lookelbow|widget|tweak|_parent|socket|jiggle|driver|effector|(?:^|[_.\-\s])(?:adj|twist|null)(?:[_.\-\s\d]|$)|roll|(?:[._]|(?<=[lr]))00[1-9](?:_|$)/i.test(
    name
  );
}

function hasCoatOrAccessoryAncestor(bone: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = bone.parent;
  while (cur) {
    if (/coat|cort|cape|mantle|skirt|koshinuno|hair|wing|tail|sheath|scabbard|weapon|pipe_weapon/i.test(cur.name || '')) {
      return true;
    }
    cur = cur.parent;
  }
  return false;
}

function matchesBoneSide(name: string, side: 'L' | 'R'): boolean {
  if (isNonDeformingHelperBone(name)) return false;
  if (
    /clavicle|collar|breast|pec|(?:^|[_.\-\s])(?:eye|ear|brow|lid|lip|jaw)s?(?:[_.\-\s\d]|$)|tooth|teeth|tongue|cheek|hair|cape|skirt|coat|cort|wing|tail|finger|thumb|index|middle|ring|pinky|toe|twist|armor|pad|cloth|ribbon|scabbard|sheath|weapon|sword|hand_(?:fist|hold|open)/i.test(
      name
    )
  ) {
    return false;
  }
  if (side === 'L') {
    return (
      /left/i.test(name) ||
      /\bbip0*1\s+l\b/i.test(name) ||
      /(?:^|[_.\-\s:])l(?:[_.\-\s\d]|$)/i.test(name) ||
      /^L[A-Z_]/.test(name) ||
      /[a-z]L(?:[_.\-\s\d]|$)/.test(name) ||
      name.includes('左')
    );
  }
  return (
    /right/i.test(name) ||
    /\bbip0*1\s+r\b/i.test(name) ||
    /(?:^|[_.\-\s:])r(?:[_.\-\s\d]|$)/i.test(name) ||
    /^R[A-Z_]/.test(name) ||
    /[a-z]R(?:[_.\-\s\d]|$)/.test(name) ||
    name.includes('右')
  );
}

/**
 * Checks whether an AnimationClip actually contains non-trivial joint rotation/motion
 * (filters out 1-frame FBX bind-pose exports, Take 001 static poses, and zero-delta tracks).
 */
function hasRealAnimationMotion(clip: THREE.AnimationClip): boolean {
  if (!clip || clip.duration < 0.12 || clip.tracks.length === 0) return false;
  if (/rest.?pose|t.?pose|a.?pose|bind|reference|static/i.test(clip.name)) return false;

  // Reject partial/dummy Take 001 exports with fewer than 8 animated joint tracks (e.g. kakashi.glb 1-track dummy clip)
  const animatedNodes = new Set<string>();
  let maxQuatDelta = 0;
  let maxVecDelta = 0;
  for (const track of clip.tracks) {
    const dotIdx = track.name.lastIndexOf('.');
    if (dotIdx > 0) animatedNodes.add(track.name.slice(0, dotIdx));
    const vals = track.values;
    const stride = track.getValueSize();
    if (!vals || vals.length < stride * 2) continue;
    const isQuat = track.name.endsWith('.quaternion');
    const isScale = track.name.endsWith('.scale');
    if (isScale) continue;

    const frames = Math.floor(vals.length / stride);
    const step = Math.max(1, Math.floor(frames / 12));
    for (let f = step; f < frames; f += step) {
      const base = f * stride;
      if (isQuat && stride === 4) {
        const dot = Math.abs(
          vals[0] * vals[base] +
            vals[1] * vals[base + 1] +
            vals[2] * vals[base + 2] +
            vals[3] * vals[base + 3]
        );
        const angleDelta = 2 * Math.acos(Math.min(1, dot));
        if (angleDelta > maxQuatDelta) maxQuatDelta = angleDelta;
      } else if (stride === 3) {
        const d = Math.hypot(
          vals[base] - vals[0],
          vals[base + 1] - vals[1],
          vals[base + 2] - vals[2]
        );
        if (d > maxVecDelta) maxVecDelta = d;
      }
    }
  }
  if (animatedNodes.size < 8) return false;
  return maxQuatDelta > 0.065 || maxVecDelta > 0.04;
}

export class GlbAnimatedRig {
  public readonly wrapper = new THREE.Group();
  public readonly modelRoot: THREE.Object3D;
  public readonly rightHandSocket = new THREE.Group();
  public readonly leftHandSocket = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private clipIdle: THREE.AnimationClip | null = null;
  private clipWalk: THREE.AnimationClip | null = null;
  private clipRun: THREE.AnimationClip | null = null;
  private clipAttack: THREE.AnimationClip | null = null;
  private activeAction: THREE.AnimationAction | null = null;
  private activeClipKind: 'none' | 'idle' | 'walk' | 'run' | 'attack' = 'none';
  private attackAnimTimer = 0;

  private bones: HumanoidBoneMap = {};
  private restStates = new Map<keyof HumanoidBoneMap, RestBoneState>();
  private hasProceduralLimbs = false;
  private targetHeight = 1.78;
  private baseScale = 1;
  private baseY = 0;
  private baseYaw = Math.PI;
  private baseRx = 0;
  private baseRz = 0;
  private clonedMaterials: THREE.MeshStandardMaterial[] = [];
  private clonedGeometries: THREE.BufferGeometry[] = [];
  private isAutoRigged = false;
  private isQuadrupedOrWinged = false;
  private rightFingerChains: FingerChainBones | null = null;
  private leftFingerChains: FingerChainBones | null = null;
  private rightCalibratedFingers: CalibratedHandFingers | null = null;
  private leftCalibratedFingers: CalibratedHandFingers | null = null;
  private fingerRestQuats = new Map<THREE.Bone, THREE.Quaternion>();
  private bakedWeaponNodes: Array<{
    obj: THREE.Object3D;
    restScale: THREE.Vector3;
    isBone: boolean;
    alwaysHidden?: boolean;
  }> = [];
  private handVariantMeshes = {
    rightOpen: [] as THREE.Object3D[],
    rightClose: [] as THREE.Object3D[],
    rightHold: [] as THREE.Object3D[],
    leftOpen: [] as THREE.Object3D[],
    leftClose: [] as THREE.Object3D[],
    leftHold: [] as THREE.Object3D[]
  };
  private headBoneScale = 1.0;

  constructor(template: CachedTemplate, cfg: GlbModelConfig) {
    this.targetHeight = cfg.targetHeight || 1.78;
    this.isQuadrupedOrWinged = Boolean(cfg.targetSpan && cfg.targetSpan > 0);
    this.headBoneScale = cfg.headScale ?? 1.0;
    this.modelRoot = SkeletonUtils.clone(template.scene);
    this.wrapper.add(this.modelRoot);

    // Clone materials lightly (reusing shared GPU textures!) so hurt flash / optional tint never mutates shared cache
    this.modelRoot.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        if (mesh.geometry) {
          mesh.geometry.userData = { ...mesh.geometry.userData, shared: true };
        }
        const cloneOne = (mat: THREE.Material): THREE.Material => {
          const c = mat.clone();
          if ((c as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            const std = c as THREE.MeshStandardMaterial;
            if (cfg.tintHex !== undefined) {
              std.color.lerp(new THREE.Color(cfg.tintHex), 0.28);
            }
            std.userData = { ...std.userData, baseEmissive: std.emissive ? std.emissive.getHex() : 0x000000 };
            this.clonedMaterials.push(std);
          }
          return c;
        };
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(cloneOne);
        } else if (mesh.material) {
          mesh.material = cloneOne(mesh.material);
        }
      }
    });

    // Apply orientation offsets BEFORE measuring final grounded bounds & bone sides
    this.baseYaw = cfg.yawOffset ?? Math.PI;
    this.baseRx = cfg.rxOffset ?? 0;
    this.baseRz = cfg.rzOffset ?? 0;
    this.modelRoot.rotation.set(this.baseRx, this.baseYaw, this.baseRz);
    this.modelRoot.updateMatrixWorld(true);

    // Discover humanoid bones (regex + independent per-slot 3D geometric fallback)
    this.discoverBones();

    // Filter out static 1-frame bind-pose clips so no model ever freezes in A-pose/T-pose
    const validClips = template.animations.filter(hasRealAnimationMotion);
    let useMixer = validClips.length > 0;

    if (useMixer) {
      this.mixer = new THREE.AnimationMixer(this.modelRoot);
      this.classifyClips(validClips);
      if (this.clipIdle) {
        this.playClip('idle', this.clipIdle, true);
        this.mixer.update(0.05);
        this.modelRoot.updateMatrixWorld(true);
      }
      // If clips have NO idle and NO walk/run (e.g. Komamura attack-only clips), or leave character in T-pose without walk/run:
      if ((!this.clipIdle && !this.clipWalk && !this.clipRun) || (!this.clipWalk && !this.clipRun && this.isCurrentlyInTPose())) {
        this.mixer.stopAllAction();
        this.mixer = null;
        this.clipIdle = null;
        this.clipAttack = null;
        useMixer = false;
      }
    }

    if (!useMixer) {
      this.reparentDetachedTwistDeformBones();
      this.relaxTPoseAndCaptureRest();
      this.normalizeWideLegStance();
      this.modelRoot.updateMatrixWorld(true);
    }

    // Normalize scale to targetHeight (using anthropometric head crown estimate when overhead swords/wings inflate Box3!)
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const size = new THREE.Vector3();
    box.getSize(size);

    if (cfg.targetSpan && cfg.targetSpan > 0) {
      const maxAxis = Math.max(0.01, size.x, size.y, size.z);
      this.baseScale = cfg.targetSpan / maxAxis;
    } else {
      let rawHeight = Math.max(0.01, size.y);
      if (this.bones.head) {
        const wHead = new THREE.Vector3();
        this.bones.head.getWorldPosition(wHead);
        const headCrownEst = (wHead.y - box.min.y) * 1.14;
        if (headCrownEst > size.y * 0.45 && size.y > headCrownEst * 1.16) {
          rawHeight = headCrownEst;
        }
      }
      this.baseScale = cfg.targetHeight / rawHeight;
    }
    this.modelRoot.scale.multiplyScalar(this.baseScale);
    this.modelRoot.updateMatrixWorld(true);

    const boxScaled = new THREE.Box3().setFromObject(this.modelRoot);
    const centerScaled = new THREE.Vector3();
    boxScaled.getCenter(centerScaled);

    // Center X/Z on core pelvis/spine axis when available so asymmetric capes/weapons never shift character sideways!
    let centerX = centerScaled.x;
    let centerZ = centerScaled.z;
    const coreBone = this.bones.hips || this.bones.spine;
    if (coreBone && !cfg.targetSpan) {
      const wCore = new THREE.Vector3();
      coreBone.getWorldPosition(wCore);
      if (Math.abs(wCore.x - centerScaled.x) < cfg.targetHeight * 0.65) {
        centerX = wCore.x;
        centerZ = wCore.z;
      }
    }

    this.baseY = -boxScaled.min.y + (cfg.yOffset ?? 0);
    this.modelRoot.position.set(-centerX, this.baseY, -centerZ);
    this.wrapper.updateMatrixWorld(true);

    // UNIVERSAL AUTO-RIGGER: If humanoid model has NO skeleton/limb bones, relax baked T/A-pose AND bind a real 13-bone SkinnedMesh skeleton!
    if (!this.mixer && (!this.bones.thighL || !this.bones.thighR || !this.bones.armR) && !cfg.targetSpan) {
      if (!this.bones.armL && !this.bones.armR) {
        this.relaxStaticMeshTPose(cfg.targetHeight);
        this.wrapper.updateMatrixWorld(true);
      }
      if (!this.bones.thighL || !this.bones.thighR) {
        this.autoRigStaticHumanoidMesh(cfg.targetHeight);
        this.wrapper.updateMatrixWorld(true);
      }
    }

    // Re-run bone discovery if handR/handL were still missing after scaling, then capture local axes
    if ((this.bones.armR && !this.bones.handR) || (this.bones.armL && !this.bones.handL)) {
      this.discoverBones();
    }
    this.captureBoneAxes();
    this.discoverFingersAndBakedWeapons();
    this.syncHandVariantMeshes(false, false, false, false);

    // Mount weapon & shield sockets
    this.setupHandSockets(cfg.targetHeight);
  }

  private discoverBones() {
    const rawBones: THREE.Bone[] = [];
    const weightedBones = new Set<THREE.Bone>();
    this.modelRoot.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        rawBones.push(o as THREE.Bone);
      }
      const sm = o as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh && sm.skeleton && sm.geometry) {
        const sIdx = sm.geometry.attributes.skinIndex as THREE.BufferAttribute | undefined;
        const sWgt = sm.geometry.attributes.skinWeight as THREE.BufferAttribute | undefined;
        const skBones = sm.skeleton.bones;
        if (sIdx && sWgt && skBones.length > 0) {
          const sums = new Float32Array(skBones.length);
          const step = Math.max(1, Math.floor(sIdx.count / 4000));
          for (let i = 0; i < sIdx.count; i += step) {
            const b0 = sIdx.getX(i), b1 = sIdx.getY(i), b2 = sIdx.getZ(i), b3 = sIdx.getW(i);
            if (b0 < sums.length) sums[b0] += sWgt.getX(i);
            if (b1 < sums.length) sums[b1] += sWgt.getY(i);
            if (b2 < sums.length) sums[b2] += sWgt.getZ(i);
            if (b3 < sums.length) sums[b3] += sWgt.getW(i);
          }
          for (let bi = 0; bi < skBones.length; bi++) {
            if (sums[bi] > 1e-4 && skBones[bi]) weightedBones.add(skBones[bi]);
          }
        }
      }
    });
    if (rawBones.length === 0) return;
    // Propagate weighted status up `.parent` so FK parent limb bones (`G_uparm_L/R`, `Bip001 UpperArm`, Shift-JIS upper arms)
    // whose vertex weights live on child twist/GD deform bones are preserved while dead dummy leaf chains stay excluded!
    for (const wb of Array.from(weightedBones)) {
      let p = wb.parent;
      while (p && (p as THREE.Bone).isBone) {
        weightedBones.add(p as THREE.Bone);
        p = p.parent;
      }
    }
    const hasWeighted = weightedBones.size >= 6;
    const cleanRawBones = rawBones.filter((b) => !isNonDeformingHelperBone(b.name) && !hasCoatOrAccessoryAncestor(b));
    const deformingBones = cleanRawBones.filter((b) => !hasWeighted || weightedBones.has(b));
    const allBones = deformingBones.length >= 6 ? deformingBones : cleanRawBones.length >= 6 ? cleanRawBones : rawBones;

    const findBone = (patterns: RegExp[], side?: 'L' | 'R', allowUnweightedStub = false): THREE.Bone | undefined => {
      for (const pat of patterns) {
        for (const b of allBones) {
          const n = b.name;
          if (!pat.test(n)) continue;
          if (side && !matchesBoneSide(n, side)) continue;
          return b;
        }
      }
      if (allowUnweightedStub && allBones !== cleanRawBones) {
        for (const pat of patterns) {
          for (const b of cleanRawBones) {
            const n = b.name;
            if (!pat.test(n)) continue;
            if (side && !matchesBoneSide(n, side)) continue;
            return b;
          }
        }
      }
      return undefined;
    };

    if (!this.bones.hips) {
      this.bones.hips = findBone([/hips|body_pelvis|(?<!def-)pelvis|腰|センター|koshi|^def-spine(?:_\d+)?$/i]);
    }
    if (!this.bones.head) {
      this.bones.head = findBone([/head_face|(?<!dragon\s)head|def-spine\.?006|atama|頭/i]);
    }
    if (!this.bones.neck) {
      this.bones.neck = findBone([/head_neck|neck|def-spine\.?00[45]|kubi|首/i]);
    }
    if (!this.bones.spine) {
      this.bones.spine = findBone([/spine_?0?[23]|spine[12]|def-spine\.?00[23]|upper_?chest|chest|spine|torso|body|mune|上半身/i]);
    }

    if (!this.bones.armL) {
      this.bones.armL =
        findBone([/arm_?upper|upper_?arm|up_?arm|ude/i], 'L', true) ||
        findBone([/(?<!fore|lower|low)arm|腕/i], 'L', true) ||
        findBone([/shoulder/i], 'L');
    }
    if (!this.bones.foreArmL) {
      this.bones.foreArmL = findBone([/arm_?fore|fore_?arm|lower_?arm|low_?arm|elbow|hiji|ひじ/i], 'L', true);
    }
    if (!this.bones.handL) {
      this.bones.handL = findBone([/hand_?palm|(?<!fore_)hand|wrist|(?:^|[_.\-])te(?:[_.\-]|$)|手首/i], 'L', true);
    }

    if (!this.bones.armR) {
      this.bones.armR =
        findBone([/arm_?upper|upper_?arm|up_?arm|ude/i], 'R') ||
        findBone([/(?<!fore|lower|low)arm|腕/i], 'R') ||
        findBone([/shoulder/i], 'R');
    }
    if (!this.bones.foreArmR) {
      this.bones.foreArmR = findBone([/arm_?fore|fore_?arm|lower_?arm|low_?arm|elbow|hiji|ひじ/i], 'R');
    }
    if (!this.bones.handR) {
      this.bones.handR = findBone([/hand_?palm|(?<!fore_)hand|wrist|(?:^|[_.\-])te(?:[_.\-]|$)|手首/i], 'R');
    }

    if (!this.bones.thighL) {
      this.bones.thighL =
        findBone([/up_?leg|upper_?leg|thigh|leg_?upper|^(?!.*_as0\d)groin_[lr](?:_|\d|$)|momo|足/i], 'L') ||
        findBone([/^left_?leg|leg_?l/i], 'L');
    }
    if (!this.bones.shinL) {
      this.bones.shinL = findBone([/^(?!.*_as0\d).*(?:calf|shin|knee|lower_?leg|low_?leg|leg_?fore|sune|hiza|(?<!up|upper|up_|left|left_)leg|ひざ)/i], 'L');
      if (this.bones.shinL === this.bones.thighL) this.bones.shinL = undefined;
    }
    if (!this.bones.thighL && this.bones.shinL?.parent && (this.bones.shinL.parent as THREE.Bone).isBone && this.bones.shinL.parent !== this.bones.hips) {
      this.bones.thighL = this.bones.shinL.parent as THREE.Bone;
    }
    if (!this.bones.footL) {
      this.bones.footL = findBone([/foot|ankle|heel|足首/i], 'L');
    }

    if (!this.bones.thighR) {
      this.bones.thighR =
        findBone([/up_?leg|upper_?leg|thigh|leg_?upper|^(?!.*_as0\d)groin_[lr](?:_|\d|$)|momo|足/i], 'R') ||
        findBone([/^right_?leg|leg_?r/i], 'R');
    }
    if (!this.bones.shinR) {
      this.bones.shinR = findBone([/^(?!.*_as0\d).*(?:calf|shin|knee|lower_?leg|low_?leg|leg_?fore|sune|hiza|(?<!up|upper|up_|right|right_)leg|ひざ)/i], 'R');
      if (this.bones.shinR === this.bones.thighR) this.bones.shinR = undefined;
    }
    if (!this.bones.thighR && this.bones.shinR?.parent && (this.bones.shinR.parent as THREE.Bone).isBone && this.bones.shinR.parent !== this.bones.hips) {
      this.bones.thighR = this.bones.shinR.parent as THREE.Bone;
    }
    if (!this.bones.footR) {
      this.bones.footR = findBone([/foot|ankle|heel|足首/i], 'R');
    }

    // Independent per-slot 3D geometric & finger-hub topology fallback (ensures ID* / Object_* rigs like Naruto find exact wrists!)
    this.modelRoot.updateMatrixWorld(true);
    const mBox = new THREE.Box3().setFromObject(this.modelRoot);
    const mSize = new THREE.Vector3();
    const mCenter = new THREE.Vector3();
    mBox.getSize(mSize);
    mBox.getCenter(mCenter);
    const H = Math.max(0.001, mSize.y);

    const posMap = new Map<THREE.Bone, THREE.Vector3>();
    for (const b of rawBones) {
      const wp = new THREE.Vector3();
      b.getWorldPosition(wp);
      posMap.set(b, wp);
    }

    const isDescendantOf = (node: THREE.Object3D, ancestor?: THREE.Object3D): boolean => {
      if (!ancestor) return true;
      let cur: THREE.Object3D | null = node.parent;
      while (cur) {
        if (cur === ancestor) return true;
        cur = cur.parent;
      }
      return false;
    };

    // 1. 5-Finger Hub Topology Detector: any wrist bone with 4..6 multi-phalange finger chains (including 1-level metacarpal hubs like DBFZ GD_fist) gives 100% exact hand -> foreArm -> arm!
    if (!this.bones.handR || !this.bones.handL) {
      const isFingerBoneOk = (c: THREE.Object3D) =>
        (c as THREE.Bone).isBone &&
        !/weapon|sword|handle|kanabo|hyotan|sup|(?:^|[_.\-\s])(?:adj|twist|null)(?:[_.\-\s\d]|$)|^gp_|_ik|_fk|tweak|meta_0/i.test(
          c.name || ''
        );

      const isFingerChain = (f: THREE.Bone): boolean => {
        let cur: THREE.Bone | undefined = f;
        let depth = 0;
        while (cur && depth < 6) {
          const bCh = cur.children.filter(isFingerBoneOk) as THREE.Bone[];
          if (bCh.length === 0) return depth >= 1;
          if (bCh.length > 2) return false;
          cur = bCh[0];
          depth++;
        }
        return false;
      };

      for (const b of allBones) {
        if (b === this.bones.hips || b === this.bones.spine || b === this.bones.neck || b === this.bones.head) continue;
        if (this.bones.head && isDescendantOf(this.bones.head, b)) continue;
        const bPos = posMap.get(b);
        if (!bPos || Math.abs(bPos.x - mCenter.x) < 0.085 * H) continue;
        const directCh = b.children.filter(isFingerBoneOk) as THREE.Bone[];
        if (directCh.length < 3 || directCh.length > 8) continue;
        const expandedCh: THREE.Bone[] = [];
        for (const ch of directCh) {
          const sub = ch.children.filter(isFingerBoneOk) as THREE.Bone[];
          if (sub.length >= 2 && sub.length <= 5) expandedCh.push(...sub);
          else expandedCh.push(ch);
        }
        const fingerCount = expandedCh.filter(isFingerChain).length;
        if (fingerCount < 4 || fingerCount > 6) continue;
        const fore =
          b.parent && (b.parent as THREE.Bone).isBone && b.parent !== this.bones.spine && b.parent !== this.bones.hips
            ? (b.parent as THREE.Bone)
            : undefined;
        const upper =
          fore?.parent && (fore.parent as THREE.Bone).isBone && fore.parent !== this.bones.spine && fore.parent !== this.bones.hips
            ? (fore.parent as THREE.Bone)
            : undefined;
        const isRight = bPos.x >= mCenter.x;
        if (isRight) {
          if (!this.bones.handR) this.bones.handR = b;
          if (!this.bones.foreArmR && fore) this.bones.foreArmR = fore;
          if (!this.bones.armR && upper) this.bones.armR = upper;
        } else {
          if (!this.bones.handL) this.bones.handL = b;
          if (!this.bones.foreArmL && fore) this.bones.foreArmL = fore;
          if (!this.bones.armL && upper) this.bones.armL = upper;
        }
      }
    }

    // Pick distal limb child bone (skips zero-offset twist/armor helper bones!)
    const distalBoneChild = (b: THREE.Bone, mode: 'arm' | 'leg', signX: -1 | 1): THREE.Bone | undefined => {
      const bp = posMap.get(b)!;
      const candidates: THREE.Bone[] = [];
      const queue = b.children.filter((c) => (c as THREE.Bone).isBone && !isNonDeformingHelperBone(c.name)) as THREE.Bone[];
      for (const ch of queue) {
        if (
          ch === this.bones.hips ||
          ch === this.bones.spine ||
          ch === this.bones.neck ||
          ch === this.bones.head ||
          (this.bones.head && isDescendantOf(this.bones.head, ch)) ||
          /clavicle|collar|twist|armor|pad|cape|cloak|coat|cort|mantle|skirt|cloth|hair|spine|chest|torso|neck|head|pelvis|waist|hip|root|tail|wing|sleeve|weapon|sword|finger|thumb|index|middle|ring|pinky/i.test(
            ch.name
          )
        ) {
          continue;
        }
        const cp = posMap.get(ch)!;
        const dist = cp.distanceTo(bp);
        if (dist < H * 0.025) {
          for (const gch of ch.children) {
            if ((gch as THREE.Bone).isBone && !isNonDeformingHelperBone(gch.name)) candidates.push(gch as THREE.Bone);
          }
        } else {
          candidates.push(ch);
        }
      }
      if (candidates.length === 0) return undefined;
      candidates.sort((a, c) => {
        const pa = posMap.get(a)!;
        const pc = posMap.get(c)!;
        if (mode === 'arm') {
          const sa = (pa.x - bp.x) * signX + (bp.y - pa.y) * 0.85;
          const sc = (pc.x - bp.x) * signX + (bp.y - pc.y) * 0.85;
          return sc - sa;
        }
        return pa.y - pc.y; // lowest Y wins for leg
      });
      return candidates[0];
    };

    const findArmByGeom = (signX: -1 | 1): THREE.Bone | undefined => {
      let best: THREE.Bone | undefined;
      let bestScore = Infinity;
      for (const b of allBones) {
        if (
          b === this.bones.hips ||
          b === this.bones.spine ||
          b === this.bones.neck ||
          b === this.bones.head ||
          b === this.bones.armR ||
          b === this.bones.armL ||
          (this.bones.head && isDescendantOf(this.bones.head, b)) ||
          /cape|cloak|coat|cort|mantle|skirt|cloth|hair|spine|chest|torso|neck|head|pelvis|waist|hip|root|tail|wing/i.test(b.name)
        ) {
          continue;
        }
        const p = posMap.get(b)!;
        const nx = (p.x - mCenter.x) / H;
        const ny = (p.y - mBox.min.y) / H;
        if (nx * signX < 0.055 || nx * signX > 0.22) continue;
        if (ny < 0.64 || ny > 0.90) continue;
        const ch = distalBoneChild(b, 'arm', signX);
        if (!ch) continue;
        const cp = posMap.get(ch)!;
        const dx = ((cp.x - p.x) * signX) / H;
        const dy = (p.y - cp.y) / H;
        if (dx + dy < 0.04) continue;
        const score = Math.hypot(Math.abs(nx) - 0.105, ny - 0.78);
        if (score < bestScore) {
          bestScore = score;
          best = b;
        }
      }
      return best;
    };

    const findThighByGeom = (signX: -1 | 1): THREE.Bone | undefined => {
      let best: THREE.Bone | undefined;
      let bestScore = Infinity;
      for (const b of allBones) {
        const p = posMap.get(b)!;
        const nx = (p.x - mCenter.x) / H;
        const ny = (p.y - mBox.min.y) / H;
        if (nx * signX < 0.018 || nx * signX > 0.14) continue;
        if (ny < 0.36 || ny > 0.63) continue;
        const ch = distalBoneChild(b, 'leg', signX);
        if (!ch) continue;
        const cp = posMap.get(ch)!;
        if ((p.y - cp.y) / H < 0.05) continue;
        const score = Math.hypot(Math.abs(nx) - 0.055, ny - 0.51);
        if (score < bestScore) {
          bestScore = score;
          best = b;
        }
      }
      return best;
    };

    if (!this.bones.armR) this.bones.armR = findArmByGeom(1);
    if (this.bones.armR && !this.bones.foreArmR) {
      this.bones.foreArmR = distalBoneChild(this.bones.armR, 'arm', 1);
    }
    if (this.bones.foreArmR && !this.bones.handR) {
      this.bones.handR = distalBoneChild(this.bones.foreArmR, 'arm', 1);
    }

    if (!this.bones.armL) this.bones.armL = findArmByGeom(-1);
    if (this.bones.armL && !this.bones.foreArmL) {
      this.bones.foreArmL = distalBoneChild(this.bones.armL, 'arm', -1);
    }
    if (this.bones.foreArmL && !this.bones.handL) {
      this.bones.handL = distalBoneChild(this.bones.foreArmL, 'arm', -1);
    }

    // Extreme distal bone fallback for handR / handL ONLY within the arm subtree (never hip pouches or pelvis sockets!)
    const findExtremeHandByGeom = (signX: -1 | 1, upper?: THREE.Bone, fore?: THREE.Bone): THREE.Bone | undefined => {
      const anchor = fore || upper;
      let best: THREE.Bone | undefined;
      let bestScore = -Infinity;
      for (const b of allBones) {
        if (b === upper || b === fore || /finger|thumb|index|middle|ring|pinky|weapon|sword/i.test(b.name)) continue;
        if (anchor && !isDescendantOf(b, anchor)) continue;
        const p = posMap.get(b)!;
        const nx = ((p.x - mCenter.x) * signX) / H;
        const ny = (p.y - mBox.min.y) / H;
        if (nx < 0.08 || ny < 0.30 || ny > 0.86) continue;
        const score = nx * 1.4 - Math.abs(ny - 0.52) * 0.8;
        if (score > bestScore) {
          bestScore = score;
          best = b;
        }
      }
      return best;
    };
    if (!this.bones.handR && allBones.length >= 8) {
      this.bones.handR = findExtremeHandByGeom(1, this.bones.armR, this.bones.foreArmR);
    }
    if (!this.bones.handL && allBones.length >= 8) {
      this.bones.handL = findExtremeHandByGeom(-1, this.bones.armL, this.bones.foreArmL);
    }

    if (!this.bones.thighR) this.bones.thighR = findThighByGeom(1);
    if (this.bones.thighR && !this.bones.shinR) {
      this.bones.shinR = distalBoneChild(this.bones.thighR, 'leg', 1);
    }
    if (this.bones.shinR && !this.bones.footR) {
      this.bones.footR = distalBoneChild(this.bones.shinR, 'leg', 1);
    }
    if (!this.bones.thighL) this.bones.thighL = findThighByGeom(-1);
    if (this.bones.thighL && !this.bones.shinL) {
      this.bones.shinL = distalBoneChild(this.bones.thighL, 'leg', -1);
    }
    if (this.bones.shinL && !this.bones.footL) {
      this.bones.footL = distalBoneChild(this.bones.shinL, 'leg', -1);
    }

    if (!this.bones.hips && this.bones.thighL?.parent && (this.bones.thighL.parent as THREE.Bone).isBone) {
      this.bones.hips = this.bones.thighL.parent as THREE.Bone;
    }
    if (!this.bones.spine && this.bones.hips) {
      const pHip = posMap.get(this.bones.hips);
      if (pHip) {
        let bestSpine: THREE.Bone | undefined;
        let bestY = pHip.y;
        for (const ch of this.bones.hips.children) {
          if (!(ch as THREE.Bone).isBone || ch === this.bones.thighL || ch === this.bones.thighR) continue;
          const pc = posMap.get(ch as THREE.Bone);
          if (pc && pc.y > bestY + H * 0.02 && Math.abs(pc.x - mCenter.x) < H * 0.08) {
            bestY = pc.y;
            bestSpine = ch as THREE.Bone;
          }
        }
        if (bestSpine) this.bones.spine = bestSpine;
      }
    }

    if (!this.bones.head) {
      let bestH: THREE.Bone | undefined;
      let bestD = Infinity;
      for (const b of allBones) {
        const p = posMap.get(b)!;
        const nx = Math.abs((p.x - mCenter.x) / H);
        const ny = (p.y - mBox.min.y) / H;
        if (nx < 0.06 && ny > 0.76 && ny < 0.96) {
          const d = Math.hypot(nx, ny - 0.85);
          if (d < bestD) {
            bestD = d;
            bestH = b;
          }
        }
      }
      this.bones.head = bestH;
    }
    if (!this.bones.neck && this.bones.head?.parent && (this.bones.head.parent as THREE.Bone).isBone) {
      const p = this.bones.head.parent as THREE.Bone;
      if (p !== this.bones.spine && p !== this.bones.hips) {
        this.bones.neck = p;
      }
    }
  }

  /**
   * Re-attaches constraint-orphaned ArcSys / DBFZ helper volume deform bones (`GD_uparm`, `_shadow_GD_lowarm`, etc.)
   * onto their true anatomical FK limb bones (`arm`, `foreArm`, `thigh`, `shin`) while preserving exact rest-pose world matrices!
   * Fixes Frieza-style exports where Blender Copy-Transform constraints were dropped during glTF export.
   */
  private reparentDetachedTwistDeformBones() {
    this.modelRoot.updateMatrixWorld(true);
    const isDescendant = (node: THREE.Object3D, ancestor: THREE.Object3D): boolean => {
      let cur: THREE.Object3D | null = node.parent;
      while (cur) {
        if (cur === ancestor) return true;
        cur = cur.parent;
      }
      return false;
    };
    const all: THREE.Bone[] = [];
    this.modelRoot.traverse((o) => {
      if ((o as THREE.Bone).isBone) all.push(o as THREE.Bone);
    });
    for (const b of all) {
      const nm = b.name || '';
      const mUpArm = /(?:^|_)(?:gd|gp)_(?:uparm|elbow)(?:_[a-z]+)?_([lr])(?:_|\b|\d)/i.exec(nm);
      if (mUpArm) {
        const target = mUpArm[1].toLowerCase() === 'r' ? this.bones.armR : this.bones.armL;
        if (target && b !== target && !isDescendant(b, target) && !isDescendant(target, b)) {
          target.attach(b);
          target.updateMatrixWorld(true);
        }
        continue;
      }
      const mLowArm = /(?:^|_)(?:gd|gp)_lowarm(?:_[a-z]+)?_([lr])(?:_|\b|\d)/i.exec(nm);
      if (mLowArm) {
        const target = mLowArm[1].toLowerCase() === 'r' ? this.bones.foreArmR : this.bones.foreArmL;
        if (target && b !== target && !isDescendant(b, target) && !isDescendant(target, b)) {
          target.attach(b);
          target.updateMatrixWorld(true);
        }
        continue;
      }
      const mThigh = /(?:^|_)(?:gd|gp)_(?:thigh|knee)(?:_[a-z]+)?_([lr])(?:_|\b|\d)/i.exec(nm);
      if (mThigh) {
        const target = mThigh[1].toLowerCase() === 'r' ? this.bones.thighR : this.bones.thighL;
        if (target && b !== target && !isDescendant(b, target) && !isDescendant(target, b)) {
          target.attach(b);
          target.updateMatrixWorld(true);
        }
        continue;
      }
      const mCalf = /(?:^|_)(?:gd|gp)_calf(?:_[a-z]+)?_([lr])(?:_|\b|\d)/i.exec(nm);
      if (mCalf) {
        const target = mCalf[1].toLowerCase() === 'r' ? this.bones.shinR : this.bones.shinL;
        if (target && b !== target && !isDescendant(b, target) && !isDescendant(target, b)) {
          target.attach(b);
          target.updateMatrixWorld(true);
        }
      }
    }
  }

  private relaxStaticMeshTPose(height: number) {
    const meshes: THREE.Mesh[] = [];
    this.modelRoot.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh) {
        meshes.push(o as THREE.Mesh);
      }
    });
    if (meshes.length === 0) return;

    // Must update BOTH parent ancestors (avatar root x/y/z/yaw modified this frame!) AND bone children before inverting!
    this.wrapper.updateWorldMatrix(true, true);
    const invWrapper = this.wrapper.matrixWorld.clone().invert();
    let maxArmX = 0;
    const tmp = new THREE.Vector3();

    for (const m of meshes) {
      const pos = m.geometry?.attributes?.position as THREE.BufferAttribute | undefined;
      if (!pos) continue;
      const toWrap = invWrapper.clone().multiply(m.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        tmp.fromBufferAttribute(pos, i).applyMatrix4(toWrap);
        if (tmp.y >= height * 0.54 && tmp.y <= height * 0.87) {
          const ax = Math.abs(tmp.x);
          if (ax > maxArmX) maxArmX = ax;
        }
      }
    }

    // Relax both wide T-poses and 45-deg A-poses cleanly into natural side stance!
    if (maxArmX <= height * 0.215) return;

    let tipYSum = 0;
    let tipCnt = 0;
    for (const m of meshes) {
      const pos = m.geometry?.attributes?.position as THREE.BufferAttribute | undefined;
      if (!pos) continue;
      const toWrap = invWrapper.clone().multiply(m.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        tmp.fromBufferAttribute(pos, i).applyMatrix4(toWrap);
        if (Math.abs(tmp.x) >= maxArmX * 0.84 && tmp.y >= height * 0.34 && tmp.y <= height * 0.92) {
          tipYSum += tmp.y;
          tipCnt++;
        }
      }
    }
    if (tipCnt === 0) return;

    const tipY = tipYSum / tipCnt;
    // Measure actual central ribcage half-width (strictly ax < 0.145H so A-pose forearms are never mistaken for waist!)
    let waistMaxX = height * 0.095;
    for (const m of meshes) {
      const pos = m.geometry?.attributes?.position as THREE.BufferAttribute | undefined;
      if (!pos) continue;
      const toWrap = invWrapper.clone().multiply(m.matrixWorld);
      const step = Math.max(1, Math.floor(pos.count / 1000));
      for (let i = 0; i < pos.count; i += step) {
        tmp.fromBufferAttribute(pos, i).applyMatrix4(toWrap);
        const ax = Math.abs(tmp.x);
        if (tmp.y >= height * 0.54 && tmp.y <= height * 0.66 && ax < height * 0.145 && ax > waistMaxX) {
          waistMaxX = ax;
        }
      }
    }
    const shX = THREE.MathUtils.clamp(waistMaxX * 0.92, height * 0.092, height * 0.138);
    const shY = height * 0.78;
    const dxArm = Math.max(height * 0.10, maxArmX - shX);
    const trueArmLen = Math.hypot(dxArm, Math.max(0, shY - tipY));
    const curDrop = Math.atan2(shY - tipY, dxArm);
    // Keep relaxed hands safely at >= 0.43H while dropping 40-deg A-poses & T-poses cleanly to natural side stance!
    const maxSafeSin = THREE.MathUtils.clamp((shY - height * 0.43) / Math.max(height * 0.16, trueArmLen), 0.45, 0.96);
    const targetDrop = Math.min(1.30, Math.asin(maxSafeSin));
    const deltaAngle = targetDrop - curDrop;
    if (deltaAngle <= 0.08) return;

    for (const m of meshes) {
      const origGeo = m.geometry;
      if (!origGeo?.attributes?.position) continue;
      const clonedGeo = origGeo.clone();
      clonedGeo.userData = { ...origGeo.userData, shared: false };
      this.clonedGeometries.push(clonedGeo);
      m.geometry = clonedGeo;

      const pos = clonedGeo.attributes.position as THREE.BufferAttribute;
      const toWrap = invWrapper.clone().multiply(m.matrixWorld);
      const toLocal = toWrap.clone().invert();

      for (let i = 0; i < pos.count; i++) {
        tmp.fromBufferAttribute(pos, i).applyMatrix4(toWrap);
        const ax = Math.abs(tmp.x);
        // Protect central front beard/chest/tabard (e.g. Yamamoto's long white beard) from arm-relaxation shear
        if (ax < shX * 0.92 && tmp.z < height * 0.06) continue;
        const outerClear = THREE.MathUtils.smoothstep(ax, shX * 1.15, shX * 1.55);
        const tOut = THREE.MathUtils.smoothstep(ax, shX * 0.88, shX * 1.42);
        const tLow = Math.max(
          outerClear * THREE.MathUtils.smoothstep(tmp.y, height * 0.35, height * 0.43),
          THREE.MathUtils.smoothstep(tmp.y, height * 0.52, height * 0.62)
        );
        const tHigh = Math.max(outerClear, 1 - THREE.MathUtils.smoothstep(tmp.y, height * 0.86, height * 0.92));
        const w = tOut * tLow * tHigh;
        if (w > 0.001) {
          const sgn = tmp.x >= 0 ? 1 : -1;
          const dx = ax - shX;
          const dy = tmp.y - shY;
          const ang = deltaAngle * w;
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          const newDx = dx * cosA + dy * sinA;
          const newDy = -dx * sinA + dy * cosA;
          tmp.x = sgn * (shX + newDx);
          tmp.y = shY + newDy;
          const elbowT = THREE.MathUtils.smoothstep(ax, shX * 1.55, maxArmX * 0.92);
          tmp.z -= elbowT * w * 0.09;
          tmp.applyMatrix4(toLocal);
          pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
        }
      }
      pos.needsUpdate = true;
      clonedGeo.computeVertexNormals();
      clonedGeo.computeBoundingBox();
    }
  }

  /**
   * UNIVERSAL HUMANOID AUTO-RIGGER:
   * Automatically builds a 13-bone humanoid THREE.Skeleton and converts static meshes into GPU-skinned THREE.SkinnedMeshes!
   * Guarantees zero "statue gliding" even on unrigged Sketchfab sculpts (Archmage, Yamamoto, Rimuru, Hinata, Itachi, Void Reaper, etc.).
   */
  private autoRigStaticHumanoidMesh(height: number) {
    const staticMeshes: THREE.Mesh[] = [];
    this.modelRoot.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh) {
        staticMeshes.push(o as THREE.Mesh);
      }
    });
    if (staticMeshes.length === 0) return;

    // Must update BOTH parent ancestors (avatar root x/y/z/yaw modified this frame!) AND bone children before inverting!
    this.wrapper.updateWorldMatrix(true, true);
    const invWrapper = this.wrapper.matrixWorld.clone().invert();
    const tmp = new THREE.Vector3();

    // Measure actual arm outer span & lower-leg stance width in wrapper space after pose relaxation!
    let armSpanSum = 0;
    let armSpanCnt = 0;
    let handYSum = 0;
    let legOuterMax = height * 0.12;
    let waistHalfMax = height * 0.105;
    for (const m of staticMeshes) {
      const pos = m.geometry?.attributes?.position as THREE.BufferAttribute | undefined;
      if (!pos) continue;
      const toWrap = invWrapper.clone().multiply(m.matrixWorld);
      const step = Math.max(1, Math.floor(pos.count / 1500));
      for (let i = 0; i < pos.count; i += step) {
        tmp.fromBufferAttribute(pos, i).applyMatrix4(toWrap);
        const ax = Math.abs(tmp.x);
        if (tmp.y >= height * 0.04 && tmp.y <= height * 0.30 && ax > legOuterMax && ax < height * 0.52) {
          legOuterMax = ax;
        }
        if (tmp.y >= height * 0.52 && tmp.y <= height * 0.62 && ax < height * 0.22 && ax > waistHalfMax) {
          waistHalfMax = ax;
        }
      }
    }
    const isWideStance = legOuterMax > height * 0.24;
    const armMinY = isWideStance ? height * 0.42 : height * 0.37;
    let postRelaxMaxArmX = height * 0.16;
    for (const m of staticMeshes) {
      const pos = m.geometry?.attributes?.position as THREE.BufferAttribute | undefined;
      if (!pos) continue;
      const toWrap = invWrapper.clone().multiply(m.matrixWorld);
      const step = Math.max(1, Math.floor(pos.count / 2000));
      for (let i = 0; i < pos.count; i += step) {
        tmp.fromBufferAttribute(pos, i).applyMatrix4(toWrap);
        const ax = Math.abs(tmp.x);
        if (tmp.y >= armMinY && tmp.y <= height * 0.66 && ax > postRelaxMaxArmX && ax <= height * 0.52) {
          postRelaxMaxArmX = ax;
        }
      }
    }
    // Sample ONLY the outermost hand/glove cluster (>= 80% of outer arm span) so skirts/cloaks never pull Auto_Hand inward!
    const handClusterMinX = Math.max(height * 0.135, postRelaxMaxArmX * 0.80);
    for (const m of staticMeshes) {
      const pos = m.geometry?.attributes?.position as THREE.BufferAttribute | undefined;
      if (!pos) continue;
      const toWrap = invWrapper.clone().multiply(m.matrixWorld);
      const step = Math.max(1, Math.floor(pos.count / 2000));
      for (let i = 0; i < pos.count; i += step) {
        tmp.fromBufferAttribute(pos, i).applyMatrix4(toWrap);
        const ax = Math.abs(tmp.x);
        if (tmp.y >= armMinY && tmp.y <= height * 0.64 && ax >= handClusterMinX && ax <= height * 0.52) {
          armSpanSum += ax;
          handYSum += tmp.y;
          armSpanCnt++;
        }
      }
    }

    const H = height;
    const shX = THREE.MathUtils.clamp(waistHalfMax * 0.88, H * 0.095, H * 0.145);
    const avgArmX = armSpanCnt > 4 ? armSpanSum / armSpanCnt : postRelaxMaxArmX * 0.90;
    const hdX = THREE.MathUtils.clamp(avgArmX * 0.96, H * 0.145, H * 0.385);
    const hdY = armSpanCnt > 4 ? THREE.MathUtils.clamp(handYSum / armSpanCnt - H * 0.02, H * 0.39, H * 0.55) : H * 0.46;
    const elX = THREE.MathUtils.clamp(shX + (hdX - shX) * 0.56, H * 0.125, H * 0.305);
    const hipX = isWideStance ? H * 0.14 : H * 0.058;

    // 13-bone hierarchy in wrapper local space (+X right, +Y up, -Z forward):
    // 0:hips, 1:spine, 2:head, 3:armL, 4:foreArmL, 5:handL, 6:armR, 7:foreArmR, 8:handR, 9:thighL, 10:shinL, 11:thighR, 12:shinR
    const bHips = new THREE.Bone();
    bHips.name = 'Auto_Hips';
    bHips.position.set(0, H * 0.52, 0);

    const bSpine = new THREE.Bone();
    bSpine.name = 'Auto_Spine';
    bSpine.position.set(0, H * 0.07, 0); // y = 0.59H
    bHips.add(bSpine);

    const bHead = new THREE.Bone();
    bHead.name = 'Auto_Head';
    bHead.position.set(0, H * 0.22, 0); // y = 0.81H
    bSpine.add(bHead);

    const mkArmChain = (sgn: -1 | 1, tag: 'L' | 'R') => {
      const arm = new THREE.Bone();
      arm.name = `Auto_Arm_${tag}`;
      arm.position.set(sgn * shX, H * 0.18, 0); // y = 0.77H
      bSpine.add(arm);

      const fore = new THREE.Bone();
      fore.name = `Auto_ForeArm_${tag}`;
      fore.position.set(sgn * (elX - shX), -H * 0.15, -H * 0.015); // y = 0.62H
      arm.add(fore);

      const hand = new THREE.Bone();
      hand.name = `Auto_Hand_${tag}`;
      hand.position.set(sgn * (hdX - elX), hdY - H * 0.62, -H * 0.035); // y = hdY
      fore.add(hand);
      return { arm, fore, hand };
    };

    const mkLegChain = (sgn: -1 | 1, tag: 'L' | 'R') => {
      const thigh = new THREE.Bone();
      thigh.name = `Auto_Thigh_${tag}`;
      thigh.position.set(sgn * hipX, -H * 0.01, 0); // y = 0.51H
      bHips.add(thigh);

      const shin = new THREE.Bone();
      shin.name = `Auto_Shin_${tag}`;
      shin.position.set(0, -H * 0.24, 0); // y = 0.27H
      thigh.add(shin);
      return { thigh, shin };
    };

    const leftArm = mkArmChain(-1, 'L');
    const rightArm = mkArmChain(1, 'R');
    const leftLeg = mkLegChain(-1, 'L');
    const rightLeg = mkLegChain(1, 'R');

    this.wrapper.add(bHips);
    this.wrapper.updateMatrixWorld(true);

    const boneList: THREE.Bone[] = [
      bHips,
      bSpine,
      bHead,
      leftArm.arm,
      leftArm.fore,
      leftArm.hand,
      rightArm.arm,
      rightArm.fore,
      rightArm.hand,
      leftLeg.thigh,
      leftLeg.shin,
      rightLeg.thigh,
      rightLeg.shin
    ];
    const skeleton = new THREE.Skeleton(boneList);

    for (const mesh of staticMeshes) {
      const parent = mesh.parent;
      const origGeo = mesh.geometry;
      if (!parent || !origGeo?.attributes?.position) continue;

      let workGeo = origGeo;
      if (origGeo.userData?.shared !== false) {
        workGeo = origGeo.clone();
        workGeo.userData = { ...origGeo.userData, shared: false };
        this.clonedGeometries.push(workGeo);
      }

      const pos = workGeo.attributes.position as THREE.BufferAttribute;
      const vCount = pos.count;
      const skinIndices = new Uint16Array(vCount * 4);
      const skinWeights = new Float32Array(vCount * 4);
      const toWrap = invWrapper.clone().multiply(mesh.matrixWorld);

      for (let i = 0; i < vCount; i++) {
        tmp.fromBufferAttribute(pos, i).applyMatrix4(toWrap);
        const wx = tmp.x;
        const wy = tmp.y;
        const ax = Math.abs(wx);
        const ny = wy / H;

        // Determine anatomical region weights smoothly so robes, coats, shoulders & knees deform without tearing!
        const isRight = wx >= 0;
        const armIdx = isRight ? 6 : 3;
        const foreIdx = isRight ? 7 : 4;
        const handIdx = isRight ? 8 : 5;

        // Arm lateral mask: vertices outside torso/hakama width between y=0.34H..0.90H
        // Tightened ribHalf so relaxed forearms/wrists receive 100% armLat weight and track Auto_Hand_L / Auto_Hand_R 1:1!
        const wideHakamaPad = isWideStance ? (1 - THREE.MathUtils.smoothstep(ny, 0.30, 0.41)) * H * 0.085 : 0;
        const ribHalf = (ny > 0.68 ? Math.max(H * 0.104, shX * 0.78) : Math.max(H * 0.106, shX * 0.80)) + wideHakamaPad;
        const isCentralFrontBeard = ax < H * 0.125 && tmp.z < H * 0.04 && ny >= 0.42;
        const armLat = isCentralFrontBeard
          ? 0
          : THREE.MathUtils.smoothstep(ax, ribHalf, ribHalf + H * 0.030) *
            THREE.MathUtils.smoothstep(ny, 0.34, 0.40) *
            (1 - THREE.MathUtils.smoothstep(ny, 0.85, 0.91));

        const wArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        if (armLat > 0.001) {
          const hdNy = hdY / H;
          const foreT = 1 - THREE.MathUtils.smoothstep(ny, Math.max(0.58, hdNy + 0.055), Math.max(0.66, hdNy + 0.135));
          const handT = 1 - THREE.MathUtils.smoothstep(ny, hdNy - 0.025, hdNy + 0.045);
          wArr[armIdx] += armLat * (1 - foreT);
          wArr[foreIdx] += armLat * foreT * (1 - handT);
          wArr[handIdx] += armLat * foreT * handT;
        }

        const coreW = 1 - armLat;
        if (coreW > 0.001) {
          if (ny >= 0.77) {
            const headT = THREE.MathUtils.smoothstep(ny, 0.77, 0.83) * (1 - THREE.MathUtils.smoothstep(ax, H * 0.14, H * 0.22));
            wArr[2] += coreW * headT;
            wArr[1] += coreW * (1 - headT);
          } else if (ny >= 0.53 || isCentralFrontBeard) {
            const spineT = THREE.MathUtils.smoothstep(ny, 0.46, 0.60);
            wArr[1] += coreW * spineT;
            wArr[0] += coreW * (1 - spineT);
          } else {
            const legBlendIn = 1 - THREE.MathUtils.smoothstep(ny, 0.47, 0.54);
            const shinT = 1 - THREE.MathUtils.smoothstep(ny, 0.23, 0.31);
            // Smooth cross-center blend across x=0 so long robes/coats (Archmage, Aizen, Hashirama) stride cleanly!
            const rightFrac = THREE.MathUtils.smoothstep(wx, -H * 0.035, H * 0.035);
            const leftFrac = 1 - rightFrac;

            wArr[0] += coreW * (1 - legBlendIn);
            const legW = coreW * legBlendIn;
            wArr[9] += legW * leftFrac * (1 - shinT);
            wArr[10] += legW * leftFrac * shinT;
            wArr[11] += legW * rightFrac * (1 - shinT);
            wArr[12] += legW * rightFrac * shinT;
          }
        }

        // Pick top 4 bone weights & normalize to 1.0
        const top: Array<{ idx: number; w: number }> = [];
        for (let b = 0; b < 13; b++) {
          if (wArr[b] > 0.0005) top.push({ idx: b, w: wArr[b] });
        }
        top.sort((a, b) => b.w - a.w);
        const k = Math.min(4, top.length);
        let sum = 0;
        for (let j = 0; j < k; j++) sum += top[j].w;
        const base4 = i * 4;
        if (sum > 0) {
          for (let j = 0; j < k; j++) {
            skinIndices[base4 + j] = top[j].idx;
            skinWeights[base4 + j] = top[j].w / sum;
          }
        } else {
          skinIndices[base4] = 0;
          skinWeights[base4] = 1;
        }
      }

      workGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
      workGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

      const skMesh = new THREE.SkinnedMesh(workGeo, mesh.material);
      skMesh.name = mesh.name;
      skMesh.position.copy(mesh.position);
      skMesh.quaternion.copy(mesh.quaternion);
      skMesh.scale.copy(mesh.scale);
      skMesh.castShadow = false;
      skMesh.receiveShadow = false;
      skMesh.frustumCulled = false;

      parent.add(skMesh);
      parent.remove(mesh);
      skMesh.updateMatrixWorld(true);
      skMesh.bind(skeleton, skMesh.matrixWorld);
    }

    this.bones = {
      hips: bHips,
      spine: bSpine,
      head: bHead,
      armL: leftArm.arm,
      foreArmL: leftArm.fore,
      handL: leftArm.hand,
      armR: rightArm.arm,
      foreArmR: rightArm.fore,
      handR: rightArm.hand,
      thighL: leftLeg.thigh,
      shinL: leftLeg.shin,
      thighR: rightLeg.thigh,
      shinR: rightLeg.shin
    };
    this.isAutoRigged = true;
  }

  private isCurrentlyInTPose(): boolean {
    const upper = this.bones.armL || this.bones.armR;
    const lower = this.bones.foreArmL || this.bones.handL || this.bones.foreArmR || this.bones.handR;
    if (!upper || !lower) return false;
    upper.updateWorldMatrix(true, true);
    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    upper.getWorldPosition(p0);
    lower.getWorldPosition(p1);
    const dir = p1.sub(p0);
    if (dir.lengthSq() < 1e-6) return false;
    dir.normalize();
    return dir.y > -0.78;
  }

  private relaxTPoseAndCaptureRest() {
    const relaxArm = (upper?: THREE.Bone, lower?: THREE.Bone, hand?: THREE.Bone) => {
      if (!upper) return;
      const child = lower || hand || (upper.children.find((c) => (c as THREE.Bone).isBone) as THREE.Bone | undefined);
      if (!child) return;

      upper.updateWorldMatrix(true, true);
      const p0 = new THREE.Vector3();
      const p1 = new THREE.Vector3();
      upper.getWorldPosition(p0);
      child.getWorldPosition(p1);
      const dir = p1.sub(p0);
      const len = dir.length();
      if (len < 0.0001) return;
      dir.divideScalar(len);

      const outSign = p0.x >= 0 ? 1 : -1;
      if (dir.y > -0.90) {
        const targetDir = new THREE.Vector3(outSign * 0.19, -0.975, -0.09).normalize();
        const worldDelta = new THREE.Quaternion().setFromUnitVectors(dir, targetDir);

        const parentWorldQuat = new THREE.Quaternion();
        if (upper.parent) {
          upper.parent.getWorldQuaternion(parentWorldQuat);
        }
        const parentInv = parentWorldQuat.clone().invert();
        const newWorldQuat = worldDelta.multiply(upper.getWorldQuaternion(new THREE.Quaternion()));
        upper.quaternion.copy(parentInv.multiply(newWorldQuat));
        upper.updateMatrixWorld(true);
      }

      if (lower && hand) {
        lower.updateWorldMatrix(true, true);
        const f0 = new THREE.Vector3();
        const f1 = new THREE.Vector3();
        lower.getWorldPosition(f0);
        hand.getWorldPosition(f1);
        const fDir = f1.sub(f0);
        if (fDir.lengthSq() > 1e-6) {
          fDir.normalize();
          if (fDir.y > -0.84) {
            const targetFore = new THREE.Vector3(outSign * 0.14, -0.92, -0.34).normalize();
            const wDelta = new THREE.Quaternion().setFromUnitVectors(fDir, targetFore);
            const pQuat = new THREE.Quaternion();
            if (lower.parent) lower.parent.getWorldQuaternion(pQuat);
            const nw = wDelta.multiply(lower.getWorldQuaternion(new THREE.Quaternion()));
            lower.quaternion.copy(pQuat.invert().multiply(nw));
            lower.updateMatrixWorld(true);
          }
        }

        // Straighten bent T-pose wrists (e.g. Gohan / DBZ rigs) so palm aligns naturally with forearm
        hand.updateWorldMatrix(true, true);
        const tempChains = discoverHandFingerChains(hand);
        const boneKids = hand.children.filter((c) => (c as THREE.Bone).isBone && !isNonDeformingHelperBone(c.name)) as THREE.Bone[];
        const fingerChild =
          tempChains?.middle?.[0] ||
          tempChains?.index?.[0] ||
          tempChains?.ring?.[0] ||
          boneKids.find((b) => /mid|index|ring|finger|中指|人差/i.test(b.name) && !/thumb|oyayubi|親指/i.test(b.name));
        if (fingerChild) {
          const wFore = new THREE.Vector3();
          const wHand = new THREE.Vector3();
          const wFing = new THREE.Vector3();
          lower.getWorldPosition(wFore);
          hand.getWorldPosition(wHand);
          fingerChild.getWorldPosition(wFing);
          const foreVec = wHand.clone().sub(wFore);
          const handVec = wFing.clone().sub(wHand);
          if (foreVec.lengthSq() > 1e-6 && handVec.lengthSq() > 1e-6) {
            foreVec.normalize();
            handVec.normalize();
            if (foreVec.dot(handVec) < 0.86) {
              const targetHand = foreVec
                .clone()
                .lerp(new THREE.Vector3(outSign * 0.08, -0.92, -0.36).normalize(), 0.25)
                .normalize();
              const hDelta = new THREE.Quaternion().setFromUnitVectors(handVec, targetHand);
              const hpQuat = new THREE.Quaternion();
              if (hand.parent) hand.parent.getWorldQuaternion(hpQuat);
              const hNew = hDelta.multiply(hand.getWorldQuaternion(new THREE.Quaternion()));
              hand.quaternion.copy(hpQuat.invert().multiply(hNew));
              hand.updateMatrixWorld(true);
            }
          }
        }

        // Radioulnar Pronation Normalization (fixes forward-facing dissection palms & 90° outward thumbs like Gohan):
        // Ensures relaxed palms face naturally inward (-outSign * X) with thumbs pointing forward-up (-Z / +Y)!
        const bThumb = tempChains?.thumb?.[0];
        const bPinky = tempChains?.pinky?.[0] || tempChains?.ring?.[0] || tempChains?.middle?.[0] || tempChains?.index?.[0];
        if (bThumb && bPinky && bThumb !== bPinky) {
          hand.updateWorldMatrix(true, true);
          const pElb = new THREE.Vector3();
          const pWri = new THREE.Vector3();
          const pTh = new THREE.Vector3();
          const pPk = new THREE.Vector3();
          lower.getWorldPosition(pElb);
          hand.getWorldPosition(pWri);
          bThumb.getWorldPosition(pTh);
          bPinky.getWorldPosition(pPk);
          const axis = pWri.clone().sub(pElb);
          if (axis.lengthSq() > 1e-6) {
            axis.normalize();
            const curThumb = pTh.sub(pPk);
            curThumb.addScaledVector(axis, -curThumb.dot(axis));
            const desiredThumb = new THREE.Vector3(-outSign * 0.14, 0.34, -0.93);
            desiredThumb.addScaledVector(axis, -desiredThumb.dot(axis));
            if (curThumb.lengthSq() > 1e-6 && desiredThumb.lengthSq() > 1e-6) {
              curThumb.normalize();
              desiredThumb.normalize();
              const dot = THREE.MathUtils.clamp(curThumb.dot(desiredThumb), -1, 1);
              if (dot < 0.72) {
                const cross = new THREE.Vector3().crossVectors(curThumb, desiredThumb);
                const sign = cross.dot(axis) >= 0 ? 1 : -1;
                const totalAng = Math.min(1.48, Math.acos(dot)) * sign;
                // Split pronation 55% on forearm (radius/ulna) + 45% on wrist so skin never candy-wrapper pinches!
                const qFore = new THREE.Quaternion().setFromAxisAngle(axis, totalAng * 0.55);
                const lpQuat = new THREE.Quaternion();
                if (lower.parent) lower.parent.getWorldQuaternion(lpQuat);
                const lNew = qFore.multiply(lower.getWorldQuaternion(new THREE.Quaternion()));
                lower.quaternion.copy(lpQuat.invert().multiply(lNew));
                lower.updateMatrixWorld(true);

                hand.updateWorldMatrix(true, false);
                const qHand = new THREE.Quaternion().setFromAxisAngle(axis, totalAng * 0.45);
                const hpQuat2 = new THREE.Quaternion();
                if (hand.parent) hand.parent.getWorldQuaternion(hpQuat2);
                const hNew2 = qHand.multiply(hand.getWorldQuaternion(new THREE.Quaternion()));
                hand.quaternion.copy(hpQuat2.invert().multiply(hNew2));
                hand.updateMatrixWorld(true);
              }
            }
          }
        }
      }
    };

    relaxArm(this.bones.armL, this.bones.foreArmL, this.bones.handL);
    relaxArm(this.bones.armR, this.bones.foreArmR, this.bones.handR);
  }

  /**
   * Normalizes overly splayed A-pose / wide-stance legs into a natural shoulder-width warrior combat stance
   * so both feet sit balanced beneath the character's center of gravity.
   */
  private normalizeWideLegStance() {
    const adduceThigh = (thigh?: THREE.Bone, shin?: THREE.Bone) => {
      if (!thigh) return;
      const child = shin || (thigh.children.find((c) => (c as THREE.Bone).isBone) as THREE.Bone | undefined);
      if (!child) return;
      thigh.updateWorldMatrix(true, true);
      const p0 = new THREE.Vector3();
      const p1 = new THREE.Vector3();
      thigh.getWorldPosition(p0);
      child.getWorldPosition(p1);
      const dir = p1.sub(p0);
      if (dir.lengthSq() < 1e-6) return;
      dir.normalize();
      const outSign = p0.x >= 0 ? 1 : -1;
      // If thigh flares outward by > 12 degrees (|dir.x| > 0.21), bring it cleanly toward shoulder-width (0.09)
      if (dir.x * outSign > 0.21 && dir.y < -0.45) {
        const targetDir = new THREE.Vector3(outSign * 0.09, -0.992, dir.z * 0.65).normalize();
        const worldDelta = new THREE.Quaternion().setFromUnitVectors(dir, targetDir);
        const parentWorldQuat = new THREE.Quaternion();
        if (thigh.parent) thigh.parent.getWorldQuaternion(parentWorldQuat);
        const newWorldQuat = worldDelta.multiply(thigh.getWorldQuaternion(new THREE.Quaternion()));
        thigh.quaternion.copy(parentWorldQuat.invert().multiply(newWorldQuat));
        thigh.updateMatrixWorld(true);
      }
    };
    adduceThigh(this.bones.thighL, this.bones.shinL);
    adduceThigh(this.bones.thighR, this.bones.shinR);
  }

  /**
   * Injects synthetic GPU-skinned finger chains (`Synth_Thumb`, `Synth_Index`, `Synth_Middle`, `Synth_Pinky`)
   * for single-hand-bone humanoids lacking finger bones and lacking swap-hand variants (e.g. `luffy_gear5`, auto-rigged sculpts).
   * Preserves exact rest-pose vertex coordinates (`synthInverse = inv(synthWorld) * handWorld * handInverse`).
   */
  private injectSyntheticHandFingers(handBone: THREE.Bone | undefined, sideSign: -1 | 1) {
    if (!handBone || this.isQuadrupedOrWinged) return;
    const tag = sideSign > 0 ? 'R' : 'L';
    if (handBone.children.some((c) => c.name.startsWith('Synth_'))) return;

    this.wrapper.updateWorldMatrix(true, true);
    const invWrapper = this.wrapper.matrixWorld.clone().invert();
    const invHandWorld = handBone.matrixWorld.clone().invert();
    const pWristWrap = new THREE.Vector3();
    handBone.getWorldPosition(pWristWrap);
    pWristWrap.applyMatrix4(invWrapper);

    const targetMeshes: Array<{ sm: THREE.SkinnedMesh; handIdx: number }> = [];
    this.modelRoot.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh || !sm.skeleton || !sm.geometry?.attributes?.skinIndex) return;
      const hi = sm.skeleton.bones.indexOf(handBone);
      if (hi >= 0) targetMeshes.push({ sm, handIdx: hi });
    });
    if (targetMeshes.length === 0) return;

    // Measure distal hand vertex span in wrapper space
    const vTmp = new THREE.Vector3();
    let maxDist = 0;
    const sumDir = new THREE.Vector3();
    let sampleCnt = 0;
    const minSampleHw = this.isAutoRigged ? 0.20 : 0.35;
    for (const { sm, handIdx } of targetMeshes) {
      sm.skeleton.update();
      const pos = sm.geometry.attributes.position as THREE.BufferAttribute;
      const sIdx = sm.geometry.attributes.skinIndex as THREE.BufferAttribute;
      const sWgt = sm.geometry.attributes.skinWeight as THREE.BufferAttribute;
      const toWrap = invWrapper.clone().multiply(sm.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        let hw = 0;
        if (sIdx.getX(i) === handIdx) hw += sWgt.getX(i);
        if (sIdx.getY(i) === handIdx) hw += sWgt.getY(i);
        if (sIdx.getZ(i) === handIdx) hw += sWgt.getZ(i);
        if (sIdx.getW(i) === handIdx) hw += sWgt.getW(i);
        if (hw < minSampleHw) continue;
        vTmp.fromBufferAttribute(pos, i);
        sm.applyBoneTransform(i, vTmp);
        vTmp.applyMatrix4(toWrap);
        const diff = vTmp.sub(pWristWrap);
        const d = diff.length();
        if (d > 0.006 && d < this.targetHeight * 0.24) {
          if (d > maxDist) maxDist = d;
          sumDir.add(diff);
          sampleCnt++;
        }
      }
    }
    if (sampleCnt < 4 || maxDist < 0.015) return;

    const handDirWrap = sumDir.normalize();
    const thumbDirWrap = new THREE.Vector3(-sideSign * 0.14, 0.28, -0.95);
    thumbDirWrap.addScaledVector(handDirWrap, -thumbDirWrap.dot(handDirWrap));
    if (thumbDirWrap.lengthSq() < 1e-6) thumbDirWrap.set(0, 0, -1);
    thumbDirWrap.normalize();

    const mkChain = (baseName: string, latFrac: number, proxFrac: number, distFrac: number): [THREE.Bone, THREE.Bone] => {
      const p1Wrap = pWristWrap
        .clone()
        .addScaledVector(handDirWrap, maxDist * proxFrac)
        .addScaledVector(thumbDirWrap, maxDist * 0.28 * latFrac);
      const p2Wrap = pWristWrap
        .clone()
        .addScaledVector(handDirWrap, maxDist * distFrac)
        .addScaledVector(thumbDirWrap, maxDist * 0.28 * latFrac);
      const p1World = p1Wrap.applyMatrix4(this.wrapper.matrixWorld);
      const p2World = p2Wrap.applyMatrix4(this.wrapper.matrixWorld);

      const b1 = new THREE.Bone();
      b1.name = `Synth_${baseName}1_${tag}`;
      b1.position.copy(p1World.clone().applyMatrix4(invHandWorld));
      handBone.add(b1);
      b1.updateMatrixWorld(true);

      const b2 = new THREE.Bone();
      b2.name = `Synth_${baseName}2_${tag}`;
      b2.position.copy(p2World.applyMatrix4(b1.matrixWorld.clone().invert()));
      b1.add(b2);
      b2.updateMatrixWorld(true);
      return [b1, b2];
    };

    const [th1, th2] = mkChain('Thumb', 0.85, 0.24, 0.56);
    const [ix1, ix2] = mkChain('Index', 0.35, 0.38, 0.72);
    const [md1, md2] = mkChain('Middle', -0.15, 0.40, 0.75);
    const [pk1, pk2] = mkChain('Pinky', -0.70, 0.38, 0.70);
    const addedBones = [th1, th2, ix1, ix2, md1, md2, pk1, pk2];

    const patchedSkeletons = new Map<THREE.Skeleton, { skel: THREE.Skeleton; baseIdx: number }>();
    for (const { sm, handIdx } of targetMeshes) {
      let patched = patchedSkeletons.get(sm.skeleton);
      if (!patched) {
        // NEVER mutate `sm.skeleton.bones` or `sm.skeleton.boneInverses` in place because `SkeletonUtils.clone`
        // shares `sourceSkeleton.boneInverses` by reference across clones and meshes!
        const baseIdx = sm.skeleton.bones.length;
        const nextBones = [...sm.skeleton.bones, ...addedBones];
        const nextInverses = [...sm.skeleton.boneInverses];
        const handInv = sm.skeleton.boneInverses[handIdx];
        for (const sb of addedBones) {
          const synthInv = sb.matrixWorld
            .clone()
            .invert()
            .multiply(handBone.matrixWorld)
            .multiply(handInv);
          nextInverses.push(synthInv);
        }
        const newSkel = new THREE.Skeleton(nextBones, nextInverses);
        newSkel.update();
        patched = { skel: newSkel, baseIdx };
        patchedSkeletons.set(sm.skeleton, patched);
      }
      const baseNewIdx = patched.baseIdx;
      sm.bind(patched.skel, sm.bindMatrix.clone());
      patched.skel.update();

      if (sm.geometry.userData?.shared !== false) {
        const cg = sm.geometry.clone();
        cg.userData = { ...sm.geometry.userData, shared: false };
        this.clonedGeometries.push(cg);
        sm.geometry = cg;
      }

      const pos = sm.geometry.attributes.position as THREE.BufferAttribute;
      const origSkinIdx = sm.geometry.attributes.skinIndex as THREE.BufferAttribute;
      const origSkinWgt = sm.geometry.attributes.skinWeight as THREE.BufferAttribute;
      // Always allocate fresh non-interleaved Uint16 & Float32 skin attributes so indices >= 256 (e.g. luffy_gear5 302+ joints)
      // never overflow Uint8Array and never mutate shared glTF InterleavedBuffers!
      const idxArr = new Uint16Array(pos.count * 4);
      const wgtArr = new Float32Array(pos.count * 4);
      for (let i = 0; i < pos.count; i++) {
        const b = i * 4;
        idxArr[b] = origSkinIdx.getX(i);
        idxArr[b + 1] = origSkinIdx.getY(i);
        idxArr[b + 2] = origSkinIdx.getZ(i);
        idxArr[b + 3] = origSkinIdx.getW(i);
        wgtArr[b] = origSkinWgt.getX(i);
        wgtArr[b + 1] = origSkinWgt.getY(i);
        wgtArr[b + 2] = origSkinWgt.getZ(i);
        wgtArr[b + 3] = origSkinWgt.getW(i);
      }
      const sIdx = new THREE.Uint16BufferAttribute(idxArr, 4);
      const sWgt = new THREE.Float32BufferAttribute(wgtArr, 4);
      sm.geometry.setAttribute('skinIndex', sIdx);
      sm.geometry.setAttribute('skinWeight', sWgt);

      const toWrap = invWrapper.clone().multiply(sm.matrixWorld);
      const minAssignHw = this.isAutoRigged ? 0.16 : 0.25;

      for (let i = 0; i < pos.count; i++) {
        let slot = -1;
        let hw = 0;
        for (let c = 0; c < 4; c++) {
          const bi = idxArr[i * 4 + c];
          if (bi === handIdx) {
            const w = wgtArr[i * 4 + c];
            if (w > hw) {
              hw = w;
              slot = c;
            }
          }
        }
        if (slot < 0 || hw < minAssignHw) continue;

        vTmp.fromBufferAttribute(pos, i);
        sm.applyBoneTransform(i, vTmp);
        vTmp.applyMatrix4(toWrap);
        const rel = vTmp.sub(pWristWrap);
        const along = rel.dot(handDirWrap) / maxDist;
        if (along < 0.28) continue;

        const lat = rel.dot(thumbDirWrap) / (maxDist * 0.32);
        const isDistal = along > 0.62 ? 1 : 0;
        let fingerOffset = 4; // Middle1/2
        if (lat > 0.48 && along < 0.72) fingerOffset = 0; // Thumb1/2
        else if (lat > 0.12) fingerOffset = 2; // Index1/2
        else if (lat < -0.35) fingerOffset = 6; // Pinky1/2

        const targetBi = baseNewIdx + fingerOffset + isDistal;
        const blend = THREE.MathUtils.smoothstep(along, 0.26, 0.55);
        if (blend >= 0.88) {
          idxArr[i * 4 + slot] = targetBi;
        } else {
          // Find zero-weight slot to split smoothly between wrist & proximal knuckle
          let freeSlot = -1;
          for (let c = 0; c < 4; c++) {
            if (wgtArr[i * 4 + c] < 0.01) {
              freeSlot = c;
              break;
            }
          }
          if (freeSlot >= 0) {
            wgtArr[i * 4 + slot] = hw * (1 - blend);
            idxArr[i * 4 + freeSlot] = targetBi;
            wgtArr[i * 4 + freeSlot] = hw * blend;
          }
        }
      }
      sIdx.needsUpdate = true;
      sWgt.needsUpdate = true;
      sm.skeleton.update();
    }
  }

  private discoverFingersAndBakedWeapons() {
    this.bakedWeaponNodes.length = 0;
    this.handVariantMeshes.rightOpen.length = 0;
    this.handVariantMeshes.rightClose.length = 0;
    this.handVariantMeshes.rightHold.length = 0;
    this.handVariantMeshes.leftOpen.length = 0;
    this.handVariantMeshes.leftClose.length = 0;
    this.handVariantMeshes.leftHold.length = 0;

    const protectedLimbs = new Set<THREE.Object3D>();
    const markAncestors = (o?: THREE.Object3D) => {
      let cur: THREE.Object3D | null | undefined = o;
      while (cur) {
        protectedLimbs.add(cur);
        cur = cur.parent;
      }
    };
    markAncestors(this.bones.handR);
    markAncestors(this.bones.handL);
    markAncestors(this.bones.foreArmR);
    markAncestors(this.bones.foreArmL);

    this.modelRoot.traverse((obj) => {
      const nm = (obj.name || '').toLowerCase();
      if ((obj as THREE.Mesh).isMesh) {
        if (/(?:^|_)r_?(?:hand|glove)_(?:open|par)/.test(nm)) this.handVariantMeshes.rightOpen.push(obj);
        else if (/(?:^|_)r_?(?:hand|glove)_hold/.test(nm)) this.handVariantMeshes.rightHold.push(obj);
        else if (/(?:^|_)r_?(?:hand|glove)_(?:close|fist)/.test(nm)) this.handVariantMeshes.rightClose.push(obj);
        else if (/(?:^|_)l_?(?:hand|glove)_(?:open|par)/.test(nm)) this.handVariantMeshes.leftOpen.push(obj);
        else if (/(?:^|_)l_?(?:hand|glove)_hold/.test(nm)) this.handVariantMeshes.leftHold.push(obj);
        else if (/(?:^|_)l_?(?:hand|glove)_(?:close|fist)/.test(nm)) this.handVariantMeshes.leftClose.push(obj);
      }

      if (obj === this.modelRoot || protectedLimbs.has(obj)) return;
      const matName =
        (obj as THREE.Mesh).isMesh && !Array.isArray((obj as THREE.Mesh).material)
          ? (((obj as THREE.Mesh).material as THREE.Material)?.name || '')
          : '';
      if (isBakedHandheldWeaponObject(obj.name) || (matName && isBakedHandheldWeaponObject(matName))) {
        let attachedToHand = false;
        let cur: THREE.Object3D | null = obj.parent;
        while (cur) {
          if (cur === this.bones.handR || cur === this.bones.handL || cur === this.bones.foreArmR || cur === this.bones.foreArmL) {
            attachedToHand = true;
            break;
          }
          cur = cur.parent;
        }
        const isBone = Boolean((obj as THREE.Bone).isBone);
        const alwaysHidden = !attachedToHand;
        if (alwaysHidden) {
          if (isBone) obj.scale.setScalar(0);
          else obj.visible = false;
        }
        this.bakedWeaponNodes.push({
          obj,
          restScale: obj.scale.clone(),
          isBone,
          alwaysHidden
        });
      }
    });

    this.rightFingerChains = discoverHandFingerChains(this.bones.handR);
    this.leftFingerChains = discoverHandFingerChains(this.bones.handL);

    // If a humanoid SkinnedMesh has NO finger chains and NO swap-hand fist meshes, inject synthetic GPU-skinned fingers!
    const hasRightSwap = this.handVariantMeshes.rightClose.length > 0 || this.handVariantMeshes.rightHold.length > 0;
    const hasLeftSwap = this.handVariantMeshes.leftClose.length > 0 || this.handVariantMeshes.leftHold.length > 0;
    if (!this.rightFingerChains && !hasRightSwap && this.bones.handR) {
      this.injectSyntheticHandFingers(this.bones.handR, 1);
      this.rightFingerChains = discoverHandFingerChains(this.bones.handR);
    }
    if (!this.leftFingerChains && !hasLeftSwap && this.bones.handL) {
      this.injectSyntheticHandFingers(this.bones.handL, -1);
      this.leftFingerChains = discoverHandFingerChains(this.bones.handL);
    }

    this.fingerRestQuats.clear();
    const saveChainRest = (chains: FingerChainBones | null) => {
      if (!chains) return;
      for (const list of [chains.thumb, chains.index, chains.middle, chains.ring, chains.pinky]) {
        for (const b of list) {
          this.fingerRestQuats.set(b, b.quaternion.clone());
        }
      }
    };
    saveChainRest(this.rightFingerChains);
    saveChainRest(this.leftFingerChains);

    this.rightCalibratedFingers = calibrateHandFingerChains(this.bones.handR, this.rightFingerChains, this.wrapper, true);
    this.leftCalibratedFingers = calibrateHandFingerChains(this.bones.handL, this.leftFingerChains, this.wrapper, false);
  }

  public syncHandVariantMeshes(rightClosed: boolean, rightHold: boolean, leftClosed: boolean, leftHold: boolean) {
    const applySide = (
      openList: THREE.Object3D[],
      closeList: THREE.Object3D[],
      holdList: THREE.Object3D[],
      closed: boolean,
      hold: boolean
    ) => {
      if (openList.length === 0 && closeList.length === 0 && holdList.length === 0) return;
      // Prioritize true closed-fist variant (`r_hand_close`) over custom 2-finger gesture `r_hand_hold` (fixes Shanks devil-horns!)
      const useClose = (closed || hold) && closeList.length > 0;
      const useHold = !useClose && hold && holdList.length > 0;
      const useOpen = !useClose && !useHold && openList.length > 0;
      for (const m of openList) m.visible = useOpen || (!useHold && !useClose);
      for (const m of closeList) m.visible = useClose || (!useHold && !useOpen && holdList.length === 0);
      for (const m of holdList) m.visible = useHold || (!useClose && !useOpen);
    };
    applySide(
      this.handVariantMeshes.rightOpen,
      this.handVariantMeshes.rightClose,
      this.handVariantMeshes.rightHold,
      rightClosed,
      rightHold
    );
    applySide(
      this.handVariantMeshes.leftOpen,
      this.handVariantMeshes.leftClose,
      this.handVariantMeshes.leftHold,
      leftClosed,
      leftHold
    );
  }

  private captureBoneAxes() {
    this.restStates.clear();
    const entries = Object.entries(this.bones) as [keyof HumanoidBoneMap, THREE.Bone | undefined][];
    const worldX = new THREE.Vector3(1, 0, 0);
    const worldY = new THREE.Vector3(0, 1, 0);
    const worldZ = new THREE.Vector3(0, 0, 1);

    for (const [key, bone] of entries) {
      if (!bone) continue;
      bone.updateWorldMatrix(true, false);
      const boneWorldQuat = bone.getWorldQuaternion(new THREE.Quaternion());
      const invWorld = boneWorldQuat.clone().invert();
      const pitchAxisLocal = worldX.clone().applyQuaternion(invWorld).normalize();
      const yawAxisLocal = worldY.clone().applyQuaternion(invWorld).normalize();
      const rollAxisLocal = worldZ.clone().applyQuaternion(invWorld).normalize();
      this.restStates.set(key, {
        bone,
        restQuat: bone.quaternion.clone(),
        pitchAxisLocal,
        yawAxisLocal,
        rollAxisLocal
      });
    }
    this.hasProceduralLimbs = !!(this.bones.thighL && this.bones.thighR);
  }

  private classifyClips(clips: THREE.AnimationClip[]) {
    if (clips.length === 0) return;
    const find = (re: RegExp) => clips.find((c) => re.test(c.name));
    const isActionOnlyClip = (name: string) =>
      /atk|attack|slash|skill|skl|combo|hit|damage|die|death|down|jump|flagget|boost|earthquake|flingshards|melee/i.test(name);
    this.clipIdle =
      find(/idle|stand|wait|breath|howl|caution/i) ||
      clips.find((c) => !isActionOnlyClip(c.name) && !/walk|run|sprint|move|\bgo\b|_go$/i.test(c.name)) ||
      null;
    this.clipWalk = find(/walk|move|\bgo\b|_go$/i) || find(/run|sprint|fast/i) || null;
    this.clipRun = find(/run|sprint|dash|fast/i) || this.clipWalk;
    this.clipAttack = find(/atk|attack|slash|skill|skl|combo|flame|roar|lunge|meleehit/i) || null;
  }

  private playClip(kind: 'idle' | 'walk' | 'run' | 'attack', clip: THREE.AnimationClip, loop = true) {
    if (!this.mixer || (this.activeClipKind === kind && kind !== 'attack')) return;
    const next = this.mixer.clipAction(clip);
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    if (this.activeAction && this.activeAction !== next) {
      this.activeAction.fadeOut(0.16);
      next.fadeIn(0.16);
    }
    next.play();
    this.activeAction = next;
    this.activeClipKind = kind;
  }

  private setupHandSockets(height: number) {
    this.rightHandSocket.userData.isGlbHandSocket = true;
    this.leftHandSocket.userData.isGlbHandSocket = true;
    this.rightHandSocket.position.set(0.22, height * 0.48, -0.14);
    this.leftHandSocket.position.set(-0.22, height * 0.50, -0.12);
    this.wrapper.add(this.rightHandSocket, this.leftHandSocket);
  }

  public setHurtFlash(hurt: boolean) {
    for (const mat of this.clonedMaterials) {
      if (mat.emissive) {
        mat.emissive.setHex(hurt ? 0x991111 : (mat.userData?.baseEmissive ?? 0x000000));
      }
    }
  }

  public triggerAttack() {
    this.attackAnimTimer = 0.34;
    if (this.mixer && this.clipAttack) {
      this.playClip('attack', this.clipAttack, false);
    }
  }

  public update(
    dt: number,
    speed: number,
    walkPhase: number,
    idleClock: number,
    pitch: number,
    headYaw: number,
    swingTimer: number,
    blocking: boolean,
    sneaking: boolean,
    poseMode = 'none',
    poseState?: DirectBonePoseState
  ) {
    const moving = Math.min(1, speed / 4.2);
    const sprinting = speed > 4.6 ? Math.min(1, (speed - 4.6) / 2.2) : 0;
    if (swingTimer > 0.20 && this.attackAnimTimer <= 0.05) {
      this.triggerAttack();
    }
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    }

    const hasRightHeld = this.rightHandSocket.children.some((c) => c.visible && c.children.length > 0);
    const hasLeftHeld = this.leftHandSocket.children.some((c) => c.visible && c.children.length > 0);

    // Deconflict character's baked handheld blade/weapon against externally equipped right-hand items
    for (const bw of this.bakedWeaponNodes) {
      const hide = Boolean(bw.alwaysHidden) || hasRightHeld;
      if (bw.isBone) {
        if (hide) bw.obj.scale.setScalar(bw.alwaysHidden ? 0 : 0.0001);
        else bw.obj.scale.copy(bw.restScale);
      } else {
        bw.obj.visible = !hide;
      }
    }

    const applyBoneAngles = (
      key: keyof HumanoidBoneMap,
      pitchAngle: number,
      yawAngle = 0,
      rollAngle = 0,
      additive = false
    ) => {
      const st = this.restStates.get(key);
      if (!st) return;
      if (!additive) {
        st.bone.quaternion.copy(st.restQuat);
      }
      if (Math.abs(pitchAngle) > 0.0005) {
        const qPitch = new THREE.Quaternion().setFromAxisAngle(st.pitchAxisLocal, pitchAngle);
        st.bone.quaternion.multiply(qPitch);
      }
      if (Math.abs(yawAngle) > 0.0005) {
        const qYaw = new THREE.Quaternion().setFromAxisAngle(st.yawAxisLocal, yawAngle);
        st.bone.quaternion.multiply(qYaw);
      }
      if (Math.abs(rollAngle) > 0.0005) {
        const qRoll = new THREE.Quaternion().setFromAxisAngle(st.rollAxisLocal, rollAngle);
        st.bone.quaternion.multiply(qRoll);
      }
    };

    const strafe = poseState?.strafeRatio ?? 0;
    const onGround = poseState?.onGround ?? true;
    const vertVel = poseState?.verticalVel ?? 0;
    const landComp = poseState?.landingCompress ?? 0;
    const comboStage = poseState?.comboStage ?? 0;
    const rollTimer = poseState?.dodgeRollTimer ?? 0;
    const emote = poseState?.emote ?? 'none';
    const emoteT = poseState?.emoteClock ?? idleClock;

    // Reset dodge-roll wrapper somersault when not rolling
    if (rollTimer > 0) {
      const rollFrac = 1 - Math.max(0, Math.min(1, rollTimer / 0.48));
      const spin = -rollFrac * Math.PI * 2;
      const arcLift = Math.sin(rollFrac * Math.PI) * 0.28;
      const pivotH = this.targetHeight * 0.44;
      this.wrapper.rotation.x = spin;
      this.wrapper.position.y = pivotH - Math.cos(spin) * pivotH + arcLift;
      this.wrapper.position.z = Math.sin(spin) * pivotH * 0.35;
    } else {
      this.wrapper.rotation.x = 0;
      this.wrapper.position.set(0, 0, 0);
    }

    const computeComboArmPose = (p: number) => {
      const s = Math.sin(p * Math.PI);
      if (comboStage === 1) {
        if (!hasRightHeld) {
          // Stage 2 unarmed: crisp Left Hook / Counter Jab while Right Hand guards chin!
          return {
            armRPitch: 0.72,
            armRYaw: 0.22,
            armRRoll: 0.08,
            foreRPitch: 0.95,
            armLPitch: 0.45 + s * 1.18,
            armLYaw: -s * 0.34,
            armLRoll: -0.10,
            foreLPitch: 0.82 - s * 0.62,
            spineYaw: -s * 0.34,
            spineLean: -s * 0.10
          };
        }
        // Stage 2 armed: rising reverse backhand cross-slash!
        return {
          armRPitch: 0.42 + p * 1.25,
          armRYaw: 0.48 - p * 0.96,
          armRRoll: 0.18,
          foreRPitch: 0.48 - s * 0.22,
          armLPitch: blocking ? 0.88 : 0.35,
          armLYaw: 0.14,
          armLRoll: -0.14,
          foreLPitch: blocking ? 0.54 : 0.42,
          spineYaw: -0.26 + p * 0.56,
          spineLean: -s * 0.10
        };
      }
      if (comboStage === 2) {
        // Stage 3: Heavy Overhead Spin / Finisher Cleave!
        const cleave = p < 0.32 ? (p / 0.32) * 2.15 : 2.15 - ((p - 0.32) / 0.68) * 1.95;
        return {
          armRPitch: cleave,
          armRYaw: -0.18 + p * 0.42,
          armRRoll: 0.08,
          foreRPitch: 0.52 - Math.max(0, p - 0.32) * 0.42,
          armLPitch: blocking ? 0.88 : 0.52 - s * 0.35,
          armLYaw: 0.18,
          armLRoll: -0.18,
          foreLPitch: 0.45,
          spineYaw: 0.30 - p * 0.65,
          spineLean: -s * 0.24
        };
      }
      // Stage 1: Fast Diagonal Right Slash / Right Cross!
      return {
        armRPitch: 1.56 - Math.sin(p * Math.PI * 0.88) * 1.16,
        armRYaw: -0.32 + p * 0.72,
        armRRoll: 0.14,
        foreRPitch: 0.36 - s * 0.18,
        armLPitch: blocking ? 0.88 : -0.15 * s + 0.18,
        armLYaw: 0.12,
        armLRoll: -0.14,
        foreLPitch: blocking ? 0.54 : 0.38,
        spineYaw: 0.24 - p * 0.48,
        spineLean: -s * 0.12
      };
    };

    if (this.mixer) {
      if (this.attackAnimTimer <= 0) {
        if (speed > 4.4 && this.clipRun) {
          this.playClip('run', this.clipRun, true);
          if (this.activeAction) this.activeAction.timeScale = Math.min(1.45, speed / 5.2);
        } else if (speed > 0.25 && (this.clipWalk || this.clipRun)) {
          const c = (this.clipWalk || this.clipRun)!;
          this.playClip('walk', c, true);
          if (this.activeAction) this.activeAction.timeScale = Math.max(0.75, Math.min(1.35, speed / 3.4));
        } else if (this.clipIdle) {
          this.playClip('idle', this.clipIdle, true);
          if (this.activeAction) this.activeAction.timeScale = 1.0;
        }
      }
      this.mixer.update(dt);
      if (this.headBoneScale !== 1.0 && this.bones.head) {
        this.bones.head.scale.setScalar(this.headBoneScale);
      }

      // Layer head look onto mixer models so characters look naturally where camera aims!
      if (this.bones.head && (Math.abs(pitch) > 0.01 || Math.abs(headYaw) > 0.01)) {
        applyBoneAngles(
          'head',
          THREE.MathUtils.clamp(-pitch * 0.45, -0.48, 0.48),
          THREE.MathUtils.clamp(headYaw * 0.60, -0.68, 0.68),
          0,
          true
        );
      }

      // Hybrid Full-Body Biomechanical Assist when GLB only has an idle clip (zero gliding statues!)
      const needsGaitAssist = !this.clipWalk && !this.clipRun && this.hasProceduralLimbs;
      if (needsGaitAssist && (moving > 0.03 || !onGround || landComp > 0.02 || swingTimer > 0 || sneaking || rollTimer > 0)) {
        const strideAmp = (0.64 + sprinting * 0.20) * moving;
        const stride = Math.sin(walkPhase) * strideAmp;
        const kneeL = -Math.max(0, -Math.sin(walkPhase - 0.30)) * (0.76 + sprinting * 0.18) * moving;
        const kneeR = -Math.max(0, Math.sin(walkPhase - 0.30)) * (0.76 + sprinting * 0.18) * moving;
        const airL = !onGround ? (vertVel > 0 ? 0.42 : 0.22) : 0;
        const airR = !onGround ? (vertVel > 0 ? 0.14 : 0.30) : 0;
        const airKnee = !onGround ? -0.58 : 0;
        const rollTuck = rollTimer > 0 ? 0.85 : 0;

        applyBoneAngles('hips', 0, -Math.sin(walkPhase) * 0.08 * moving + strafe * 0.12, Math.cos(walkPhase) * 0.04 * moving, true);
        applyBoneAngles(
          'thighL',
          (onGround ? stride : airL) + (sneaking ? 0.24 : 0) + landComp * 0.30 + rollTuck,
          0,
          -strafe * 0.16 * moving,
          true
        );
        applyBoneAngles(
          'thighR',
          (onGround ? -stride : airR) + (sneaking ? 0.24 : 0) + landComp * 0.30 + rollTuck,
          0,
          -strafe * 0.16 * moving,
          true
        );
        applyBoneAngles('shinL', (onGround ? kneeL : airKnee) + (sneaking ? -0.32 : 0) - landComp * 0.52 - rollTuck * 1.15, 0, 0, true);
        applyBoneAngles('shinR', (onGround ? kneeR : airKnee) + (sneaking ? -0.32 : 0) - landComp * 0.52 - rollTuck * 1.15, 0, 0, true);
        applyBoneAngles('footL', onGround ? Math.cos(walkPhase) * 0.26 * moving : -0.20, 0, 0, true);
        applyBoneAngles('footR', onGround ? -Math.cos(walkPhase) * 0.26 * moving : -0.20, 0, 0, true);
        applyBoneAngles('spine', -(sneaking ? 0.20 : 0.09 * moving + sprinting * 0.08), Math.sin(walkPhase) * 0.10 * moving, 0, true);

        if (swingTimer > 0) {
          const cb = computeComboArmPose(1 - swingTimer / 0.26);
          applyBoneAngles('armR', cb.armRPitch, cb.armRYaw, cb.armRRoll, true);
          applyBoneAngles('foreArmR', cb.foreRPitch, 0, 0, true);
          applyBoneAngles('armL', cb.armLPitch, cb.armLYaw, cb.armLRoll, true);
          applyBoneAngles('foreArmL', cb.foreLPitch, 0, 0, true);
          applyBoneAngles('spine', cb.spineLean, cb.spineYaw, 0, true);
        } else {
          const armSwing = -stride * 0.72;
          applyBoneAngles('armR', armSwing, 0, 0.04 * moving, true);
          applyBoneAngles('foreArmR', Math.max(0, armSwing) * 0.42 + sprinting * 0.28, 0, 0, true);
          applyBoneAngles('armL', blocking ? 0.85 : -armSwing, 0, -0.04 * moving, true);
          applyBoneAngles('foreArmL', blocking ? 0.52 : Math.max(0, -armSwing) * 0.42 + sprinting * 0.28, 0, 0, true);
        }
      } else if (swingTimer > 0 && (!this.clipAttack || this.attackAnimTimer <= 0)) {
        const cb = computeComboArmPose(1 - swingTimer / 0.26);
        applyBoneAngles('armR', cb.armRPitch, cb.armRYaw, cb.armRRoll, true);
        applyBoneAngles('foreArmR', cb.foreRPitch, 0, 0, true);
        applyBoneAngles('spine', cb.spineLean, cb.spineYaw, 0, true);
      }

      if (swingTimer <= 0 && rollTimer <= 0) {
        if (poseMode === 'bow') {
          const aimP = THREE.MathUtils.clamp(-pitch * 0.75, -0.65, 0.65);
          applyBoneAngles('armL', 1.38 + aimP, -0.28, 0, false);
          applyBoneAngles('foreArmL', 0.14, 0, 0, false);
          applyBoneAngles('armR', 1.32 + aimP, 0.24, 0, false);
          applyBoneAngles('foreArmR', 0.88, 0, 0, false);
          applyBoneAngles('spine', 0, -0.32, 0, true);
        } else if (poseMode === 'crossbow' || poseMode === 'spyglass') {
          const aimP = THREE.MathUtils.clamp(-pitch * 0.75, -0.65, 0.65);
          applyBoneAngles('armR', 1.28 + aimP, 0.16, 0, false);
          applyBoneAngles('foreArmR', 0.34, 0, 0, false);
          if (poseMode === 'crossbow') {
            applyBoneAngles('armL', 1.18 + aimP, -0.34, 0, false);
            applyBoneAngles('foreArmL', 0.42, 0, 0, false);
          }
        } else if (poseMode === 'trident') {
          const aimP = THREE.MathUtils.clamp(-pitch * 0.55, -0.5, 0.5);
          applyBoneAngles('armR', 2.28 + aimP * 0.5, -0.18, 0.18, false);
          applyBoneAngles('foreArmR', 0.42, 0, 0, false);
          applyBoneAngles('armL', 0.72 + aimP * 0.4, 0, 0, false);
          applyBoneAngles('foreArmL', 0.36, 0, 0, false);
          applyBoneAngles('spine', 0, 0.28, 0, true);
        } else if (poseMode === 'eat') {
          const chew = Math.abs(Math.sin(idleClock * 18)) * 0.18;
          applyBoneAngles('armR', 1.18 + chew, 0.36, 0, false);
          applyBoneAngles('foreArmR', 0.96 + chew, 0, 0, false);
        }
      }

      const hop = needsGaitAssist && onGround && moving > 0.05 ? Math.abs(Math.sin(walkPhase)) * 0.048 * moving : 0;
      this.modelRoot.position.y = this.baseY + hop - (sneaking ? 0.09 : 0) - landComp * 0.09;
      this.modelRoot.rotation.x = this.baseRx + (sneaking ? 0.14 : 0);
    } else if (this.hasProceduralLimbs) {
      const strideAmp = (0.68 + sprinting * 0.22) * moving;
      const stride = Math.sin(walkPhase) * strideAmp;
      const kneeL = -Math.max(0, -Math.sin(walkPhase - 0.32)) * (0.84 + sprinting * 0.20) * moving;
      const kneeR = -Math.max(0, Math.sin(walkPhase - 0.32)) * (0.84 + sprinting * 0.20) * moving;
      const breath = Math.sin(idleClock * 1.9) * 0.026;
      const idleShift = Math.sin(idleClock * 0.95) * 0.022 * (1 - moving);
      const idleKnee = -0.07 * (1 - moving);

      const airL = !onGround ? (vertVel > 0 ? 0.46 : 0.24) : 0;
      const airR = !onGround ? (vertVel > 0 ? 0.16 : 0.32) : 0;
      const airKnee = !onGround ? -0.64 : 0;
      const rollTuck = rollTimer > 0 ? 0.92 : 0;

      // 1. Pelvis / Hips weight transfer & counter-rotation
      applyBoneAngles(
        'hips',
        0,
        -Math.sin(walkPhase) * 0.09 * moving + strafe * 0.15 + idleShift * 0.6,
        Math.cos(walkPhase) * 0.045 * moving + idleShift
      );

      // 2. Thighs, Knees & Ankles (full human heel-to-toe & jump/landing Squat IK!)
      const lThighPitch = (onGround ? stride : airL) + (sneaking ? 0.28 : 0.04 * (1 - moving)) + landComp * 0.34 + rollTuck;
      const rThighPitch = (onGround ? -stride : airR) + (sneaking ? 0.28 : -0.03 * (1 - moving)) + landComp * 0.34 + rollTuck;
      const lShinPitch = (onGround ? kneeL : airKnee) + (sneaking ? -0.40 : idleKnee) - landComp * 0.58 - rollTuck * 1.22;
      const rShinPitch = (onGround ? kneeR : airKnee) + (sneaking ? -0.40 : idleKnee) - landComp * 0.58 - rollTuck * 1.22;

      applyBoneAngles('thighL', lThighPitch, 0, -strafe * 0.18 * moving);
      applyBoneAngles('thighR', rThighPitch, 0, -strafe * 0.18 * moving);
      applyBoneAngles('shinL', lShinPitch);
      applyBoneAngles('shinR', rShinPitch);
      applyBoneAngles('footL', onGround ? Math.cos(walkPhase) * 0.30 * moving : -0.24);
      applyBoneAngles('footR', onGround ? -Math.cos(walkPhase) * 0.30 * moving : -0.24);

      // 3. Spine, Neck & Head (athletic sprint lean, counter-twist, and smooth split look tracking)
      let spinePitch = -(sneaking ? 0.24 : 0.09 * moving + sprinting * 0.10) + breath - THREE.MathUtils.clamp(pitch * 0.16, -0.18, 0.18) - rollTuck * 0.45;
      let spineYaw = Math.sin(walkPhase) * 0.11 * moving - strafe * 0.10;
      const targetHeadPitch = THREE.MathUtils.clamp(-pitch, -0.75, 0.75) + (poseState?.headPitchOffset ?? 0);
      const targetHeadYaw = THREE.MathUtils.clamp(headYaw, -0.95, 0.95) + (poseState?.headYawOffset ?? 0);
      if (this.bones.neck) {
        applyBoneAngles('neck', targetHeadPitch * 0.35, targetHeadYaw * 0.35);
        applyBoneAngles('head', targetHeadPitch * 0.65, targetHeadYaw * 0.65);
      } else {
        applyBoneAngles('head', targetHeadPitch * 0.78, targetHeadYaw * 0.80);
      }
      if (this.headBoneScale !== 1.0 && this.bones.head) {
        this.bones.head.scale.setScalar(this.headBoneScale);
      }

      // 4. Arms & Forearms (bent-elbow stride, bow/trident/crossbow aim, and 3-stage melee combos!)
      const armSwingScale = this.isAutoRigged ? 0.44 : 0.76;
      const heldForeR = this.isAutoRigged ? 0.22 : 0.46;
      const heldForeL = this.isAutoRigged ? 0.18 : 0.40;
      const rSwing = -stride * armSwingScale;
      const lSwing = stride * armSwingScale;

      let armRPitch = rSwing + breath + (hasRightHeld ? (this.isAutoRigged ? 0.20 : 0.26) : 0.05 * (1 - moving));
      let armRYaw = hasRightHeld ? -0.06 : 0;
      let armRRoll = !onGround ? 0.22 : 0.04 + sprinting * 0.05;
      let foreRPitch = hasRightHeld
        ? heldForeR + Math.max(0, rSwing) * 0.20
        : 0.16 * (1 - moving) + Math.max(0, rSwing) * (this.isAutoRigged ? 0.22 : 0.48) + sprinting * 0.28;

      let armLPitch = blocking
        ? 0.90
        : lSwing - breath + (hasLeftHeld ? (this.isAutoRigged ? 0.20 : 0.26) : 0.05 * (1 - moving));
      let armLYaw = blocking ? -0.36 : hasLeftHeld ? 0.08 : 0;
      let armLRoll = blocking ? 0.18 : !onGround ? -0.22 : -(0.04 + sprinting * 0.05);
      let foreLPitch = blocking
        ? 0.58
        : hasLeftHeld
          ? heldForeL + Math.max(0, lSwing) * 0.18
          : 0.15 * (1 - moving) + Math.max(0, lSwing) * (this.isAutoRigged ? 0.22 : 0.48) + sprinting * 0.28;

      if (rollTimer > 0) {
        armRPitch = 0.95;
        foreRPitch = 1.10;
        armLPitch = 0.95;
        foreLPitch = 1.10;
      } else if (swingTimer > 0) {
        const cb = computeComboArmPose(1 - swingTimer / 0.26);
        armRPitch = cb.armRPitch;
        armRYaw = cb.armRYaw;
        armRRoll = cb.armRRoll;
        foreRPitch = cb.foreRPitch;
        if (!blocking) {
          armLPitch = cb.armLPitch;
          armLYaw = cb.armLYaw;
          armLRoll = cb.armLRoll;
          foreLPitch = cb.foreLPitch;
        }
        spineYaw += cb.spineYaw;
        spinePitch += cb.spineLean;
      } else if (poseMode === 'bow') {
        const aimP = THREE.MathUtils.clamp(-pitch * 0.75, -0.65, 0.65);
        armLPitch = 1.38 + aimP;
        armLYaw = -0.28;
        foreLPitch = 0.14;
        armRPitch = 1.32 + aimP;
        armRYaw = 0.24;
        foreRPitch = 0.88;
        spineYaw -= 0.32;
      } else if (poseMode === 'crossbow' || poseMode === 'spyglass') {
        const aimP = THREE.MathUtils.clamp(-pitch * 0.75, -0.65, 0.65);
        armRPitch = 1.28 + aimP;
        armRYaw = 0.16;
        foreRPitch = 0.34;
        if (poseMode === 'crossbow') {
          armLPitch = 1.18 + aimP;
          armLYaw = -0.34;
          foreLPitch = 0.42;
        }
      } else if (poseMode === 'trident') {
        const aimP = THREE.MathUtils.clamp(-pitch * 0.55, -0.5, 0.5);
        armRPitch = 2.28 + aimP * 0.5;
        armRYaw = -0.18;
        armRRoll = 0.18;
        foreRPitch = 0.42;
        armLPitch = 0.72 + aimP * 0.4;
        foreLPitch = 0.36;
        spineYaw += 0.28;
      } else if (poseMode === 'eat') {
        const chew = Math.abs(Math.sin(idleClock * 18)) * 0.18;
        armRPitch = 1.18 + chew;
        armRYaw = 0.36;
        foreRPitch = 0.96 + chew;
      }

      applyBoneAngles('spine', spinePitch, spineYaw, -strafe * 0.05 * moving);
      applyBoneAngles('armR', armRPitch, armRYaw, armRRoll);
      applyBoneAngles('foreArmR', foreRPitch);
      applyBoneAngles('armL', armLPitch, armLYaw, armLRoll);
      applyBoneAngles('foreArmL', foreLPitch);

      const hop = onGround ? Math.abs(Math.sin(walkPhase)) * (0.045 + sprinting * 0.022) * moving : 0;
      this.modelRoot.position.y = this.baseY + hop - (sneaking ? 0.10 : 0) - landComp * 0.10;
    } else {
      const hop = onGround ? Math.abs(Math.sin(walkPhase)) * 0.05 * moving : 0;
      const sway = Math.sin(walkPhase) * 0.04 * moving;
      const slashYaw = swingTimer > 0 ? Math.sin((1 - swingTimer / 0.26) * 0.32 * Math.PI) : 0;
      this.modelRoot.position.y = this.baseY + hop - (sneaking ? 0.08 : 0) - landComp * 0.08;
      this.modelRoot.rotation.y = this.baseYaw + slashYaw;
      this.modelRoot.rotation.z = this.baseRz + sway;
      this.modelRoot.rotation.x = this.baseRx + (sneaking ? -0.16 : -0.06 * moving);
    }

    // 5. Human Action Emotes & Authentic Multi-Phase Universe Skill Cast Choreography
    let emoteFingerR: number | null = null;
    let emoteFingerL: number | null = null;
    let fingerModeR: FingerPoseMode = 'auto';
    let fingerModeL: FingerPoseMode = 'auto';
    const isMixerAdditive = Boolean(this.mixer);
    const castTimer = poseState?.skillCastTimer ?? 0;
    const castDur = Math.max(0.2, poseState?.skillCastDuration ?? 0.68);
    const castStyle = poseState?.skillCastStyle ?? 'none';

    if (castTimer > 0 && castStyle !== 'none' && rollTimer <= 0) {
      const u = 1 - THREE.MathUtils.clamp(castTimer / castDur, 0, 1);
      const aimP = THREE.MathUtils.clamp(-pitch * 0.72, -0.62, 0.62);
      if (castStyle === 'naruto_hand_seals') {
        if (u < 0.66) {
          // Rapid 3-Seal Shinobi Kuji-in (Tiger -> Snake -> Ram) clasped at sternum!
          const sealIdx = Math.min(2, Math.floor(u / 0.22));
          const sub = (u - sealIdx * 0.22) / 0.22;
          const snap = Math.sin(sub * Math.PI);
          const sealMode: FingerPoseMode = sealIdx === 0 ? 'jutsu_tiger' : sealIdx === 1 ? 'jutsu_snake' : 'jutsu_ram';
          applyBoneAngles('spine', -0.14 - snap * 0.04, 0, 0, isMixerAdditive);
          applyBoneAngles('head', -0.10, 0, 0, isMixerAdditive);
          applyBoneAngles('armR', 0.98 + snap * 0.12, 0.56, -0.18, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.22 + (sealIdx === 1 ? 0.14 : 0), 0.24, 0, isMixerAdditive);
          applyBoneAngles('handR', snap * 0.14, sealIdx === 1 ? 0.35 : -0.15, 0, true);
          applyBoneAngles('armL', 0.98 + snap * 0.12, -0.56, 0.18, isMixerAdditive);
          applyBoneAngles('foreArmL', 1.22 + (sealIdx === 2 ? 0.14 : 0), -0.24, 0, isMixerAdditive);
          applyBoneAngles('handL', snap * 0.14, sealIdx === 1 ? -0.35 : 0.15, 0, true);
          fingerModeR = sealMode;
          fingerModeL = sealMode;
          emoteFingerR = 0.85;
          emoteFingerL = 0.85;
        } else {
          // Jutsu Release Thrust!
          const rel = (u - 0.66) / 0.34;
          const ease = Math.sin(Math.min(1, rel * 1.35) * Math.PI * 0.5);
          applyBoneAngles('spine', -0.22 * ease, -0.18 * ease, 0, isMixerAdditive);
          applyBoneAngles('armR', 0.98 + ease * (0.54 + aimP), 0.56 * (1 - ease), 0.08, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.22 * (1 - ease) + 0.12 * ease, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 0.92, -0.46, 0.14, isMixerAdditive);
          applyBoneAngles('foreArmL', 1.08, 0, 0, isMixerAdditive);
          fingerModeR = 'open';
          fingerModeL = 'jutsu_ram';
          emoteFingerR = -0.05;
          emoteFingerL = 0.65;
        }
      } else if (castStyle === 'naruto_rasengan') {
        if (u < 0.26) {
          const snap = Math.sin((u / 0.26) * Math.PI);
          applyBoneAngles('armR', 0.96 + snap * 0.10, 0.54, -0.16, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.20, 0.22, 0, isMixerAdditive);
          applyBoneAngles('armL', 0.96 + snap * 0.10, -0.54, 0.16, isMixerAdditive);
          applyBoneAngles('foreArmL', 1.20, -0.22, 0, isMixerAdditive);
          fingerModeR = 'jutsu_ram';
          fingerModeL = 'jutsu_ram';
          emoteFingerR = 0.85;
          emoteFingerL = 0.85;
        } else if (u < 0.58) {
          // Left hand molds spinning chakra sphere over cupped right palm!
          const spin = Math.sin(u * 48) * 0.16;
          applyBoneAngles('spine', -0.18, 0.26, 0, isMixerAdditive);
          applyBoneAngles('armR', 0.68, 0.32, 0.12, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.08, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 1.06 + spin * 0.4, -0.48 + spin, 0.18, isMixerAdditive);
          applyBoneAngles('foreArmL', 1.14, 0, 0, isMixerAdditive);
          fingerModeR = 'ki_cup';
          fingerModeL = 'ki_cup';
          emoteFingerR = 0.48;
          emoteFingerL = 0.48;
        } else {
          const rel = (u - 0.58) / 0.42;
          const ease = Math.sin(Math.min(1, rel * 1.4) * Math.PI * 0.5);
          applyBoneAngles('spine', -0.30 * ease, -0.34 * ease, 0, isMixerAdditive);
          applyBoneAngles('armR', 0.68 + ease * (0.88 + aimP), 0.32 * (1 - ease), 0.10, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.08 * (1 - ease) + 0.08 * ease, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', -0.42 * ease, 0.22, -0.20, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.45, 0, 0, isMixerAdditive);
          fingerModeR = 'ki_cup';
          emoteFingerR = 0.48;
        }
      } else if (castStyle === 'dbz_kamehameha') {
        if (u < 0.45) {
          // Cupped hands coiled at right hip ("Ka-me-ha-me...")
          const chg = u / 0.45;
          const vib = Math.sin(u * 55) * 0.03;
          applyBoneAngles('spine', -0.16, -0.48 * chg, 0, isMixerAdditive);
          applyBoneAngles('armR', 0.22 + vib, -0.26, 0.24, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.24, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 0.68 - vib, -0.72 * chg, 0.18, isMixerAdditive);
          applyBoneAngles('foreArmL', 1.12, 0, 0, isMixerAdditive);
          applyBoneAngles('thighL', 0.26, 0, -0.18, isMixerAdditive);
          applyBoneAngles('shinL', -0.44, 0, 0, isMixerAdditive);
          applyBoneAngles('thighR', -0.18, 0, 0.18, isMixerAdditive);
          applyBoneAngles('shinR', -0.38, 0, 0, isMixerAdditive);
          this.modelRoot.position.y -= 0.09;
        } else {
          // Double-cupped palm thrust straight forward ("...HA!!")
          const rel = Math.min(1, (u - 0.45) / 0.22);
          applyBoneAngles('spine', -0.24 * rel, -0.48 * (1 - rel), 0, isMixerAdditive);
          applyBoneAngles('armR', 0.22 + rel * (1.28 + aimP), 0.22 * rel, 0, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.24 * (1 - rel) + 0.12 * rel, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 0.68 + rel * (0.82 + aimP), -0.22 * rel, 0, isMixerAdditive);
          applyBoneAngles('foreArmL', 1.12 * (1 - rel) + 0.12 * rel, 0, 0, isMixerAdditive);
          applyBoneAngles('handR', -0.45 * rel, 0, 0, true);
          applyBoneAngles('handL', -0.45 * rel, 0, 0, true);
        }
        fingerModeR = 'ki_cup';
        fingerModeL = 'ki_cup';
        emoteFingerR = 0.46;
        emoteFingerL = 0.46;
      } else if (castStyle === 'dbz_masenko') {
        if (u < 0.42) {
          applyBoneAngles('spine', 0.08, 0, 0, isMixerAdditive);
          applyBoneAngles('armR', 2.02, 0.42, 0.12, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.16, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 2.00, -0.42, -0.12, isMixerAdditive);
          applyBoneAngles('foreArmL', 1.16, 0, 0, isMixerAdditive);
          fingerModeR = 'open';
          fingerModeL = 'open';
        } else {
          const rel = Math.min(1, (u - 0.42) / 0.22);
          applyBoneAngles('spine', -0.22 * rel, 0, 0, isMixerAdditive);
          applyBoneAngles('armR', 2.02 - rel * (0.56 - aimP), 0.20, 0, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.16 * (1 - rel) + 0.14 * rel, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 2.00 - rel * (0.54 - aimP), -0.20, 0, isMixerAdditive);
          applyBoneAngles('foreArmL', 1.16 * (1 - rel) + 0.14 * rel, 0, 0, isMixerAdditive);
          fingerModeR = 'ki_cup';
          fingerModeL = 'ki_cup';
        }
        emoteFingerR = 0.42;
        emoteFingerL = 0.42;
      } else if (castStyle === 'dbz_final_flash') {
        if (u < 0.46) {
          const vib = Math.sin(u * 50) * 0.03;
          applyBoneAngles('spine', 0.10, 0, 0, isMixerAdditive);
          applyBoneAngles('armR', 1.24 + vib, -0.76, 0.42, isMixerAdditive);
          applyBoneAngles('foreArmR', 0.24, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 1.24 - vib, 0.76, -0.42, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.24, 0, 0, isMixerAdditive);
          fingerModeR = 'open';
          fingerModeL = 'open';
        } else {
          const rel = Math.min(1, (u - 0.46) / 0.20);
          applyBoneAngles('spine', -0.20 * rel, 0, 0, isMixerAdditive);
          applyBoneAngles('armR', 1.48 + aimP, -0.76 * (1 - rel) + 0.22 * rel, 0, isMixerAdditive);
          applyBoneAngles('foreArmR', 0.12, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 1.48 + aimP, 0.76 * (1 - rel) - 0.22 * rel, 0, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.12, 0, 0, isMixerAdditive);
          fingerModeR = 'ki_cup';
          fingerModeL = 'ki_cup';
        }
        emoteFingerR = 0.44;
        emoteFingerL = 0.44;
      } else if (castStyle === 'dbz_finger_beam') {
        if (u < 0.40) {
          applyBoneAngles('armR', 1.72, 0.44, 0.10, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.36, 0, 0, isMixerAdditive);
        } else {
          const rel = Math.min(1, (u - 0.40) / 0.20);
          applyBoneAngles('spine', -0.14 * rel, -0.22 * rel, 0, isMixerAdditive);
          applyBoneAngles('armR', 1.50 + aimP, 0.06, 0, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.36 * (1 - rel) + 0.06 * rel, 0, 0, isMixerAdditive);
        }
        fingerModeR = 'point';
        emoteFingerR = 0.95;
      } else if (castStyle === 'bleach_getsuga') {
        if (u < 0.36) {
          const chg = u / 0.36;
          applyBoneAngles('spine', 0.14 * chg, 0.24 * chg, 0, isMixerAdditive);
          applyBoneAngles('armR', 2.25 * chg, 0.20, 0.12, isMixerAdditive);
          applyBoneAngles('foreArmR', 0.62, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 2.02 * chg, -0.36, -0.12, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.68, 0, 0, isMixerAdditive);
        } else {
          const sl = Math.min(1, (u - 0.36) / 0.48);
          applyBoneAngles('spine', 0.14 - sl * 0.42, 0.24 - sl * 0.62, 0, isMixerAdditive);
          applyBoneAngles('armR', 2.25 - sl * 1.92, 0.20 - sl * 0.52, 0.16, isMixerAdditive);
          applyBoneAngles('foreArmR', 0.62 - sl * 0.40, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 2.02 - sl * 1.65, -0.36 + sl * 0.22, -0.12, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.68 - sl * 0.30, 0, 0, isMixerAdditive);
        }
        emoteFingerR = 1.02;
        emoteFingerL = 0.95;
      } else if (castStyle === 'bleach_cero') {
        applyBoneAngles('spine', -0.10, 0.22, 0, isMixerAdditive);
        applyBoneAngles('armL', 1.48 + aimP, -0.08, 0, isMixerAdditive);
        applyBoneAngles('foreArmL', 0.08, 0, 0, isMixerAdditive);
        applyBoneAngles('armR', u < 0.35 ? 0.78 : 1.46 + aimP, 0.12, 0, isMixerAdditive);
        applyBoneAngles('foreArmR', u < 0.35 ? 0.95 : 0.12, 0, 0, isMixerAdditive);
        fingerModeL = 'point';
        fingerModeR = 'open';
        emoteFingerL = 0.92;
        emoteFingerR = -0.06;
      } else if (castStyle === 'onepiece_haki_slash') {
        if (u < 0.38) {
          const c = u / 0.38;
          applyBoneAngles('spine', -0.18 * c, 0.48 * c, 0, isMixerAdditive);
          applyBoneAngles('armR', 0.32, 0.64 * c, -0.18, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.15, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 0.56, 0.34 * c, 0.12, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.92, 0, 0, isMixerAdditive);
        } else {
          const sl = Math.min(1, (u - 0.38) / 0.44);
          applyBoneAngles('spine', -0.22, 0.48 - sl * 1.02, 0, isMixerAdditive);
          applyBoneAngles('armR', 1.38 + aimP * 0.5, 0.64 - sl * 1.32, 0.22, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.15 * (1 - sl) + 0.16 * sl, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 0.42, -0.32 * sl, -0.18, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.52, 0, 0, isMixerAdditive);
        }
        emoteFingerR = 1.04;
        emoteFingerL = 0.88;
      } else if (castStyle === 'onepiece_gum_punch') {
        if (u < 0.38) {
          const c = u / 0.38;
          applyBoneAngles('spine', -0.08, -0.54 * c, 0, isMixerAdditive);
          applyBoneAngles('armR', -0.68 * c, -0.36 * c, 0.22, isMixerAdditive);
          applyBoneAngles('foreArmR', 0.96, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 1.12 * c, -0.24, -0.12, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.65, 0, 0, isMixerAdditive);
        } else {
          const p = Math.min(1, (u - 0.38) / 0.28);
          applyBoneAngles('spine', -0.26 * p, -0.54 * (1 - p) + 0.38 * p, 0, isMixerAdditive);
          applyBoneAngles('armR', -0.68 * (1 - p) + (1.54 + aimP) * p, 0.08 * p, 0, isMixerAdditive);
          applyBoneAngles('foreArmR', 0.96 * (1 - p) + 0.05 * p, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 1.12 * (1 - p) - 0.35 * p, 0.18, -0.18, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.72, 0, 0, isMixerAdditive);
        }
        emoteFingerR = 1.08;
        emoteFingerL = 0.92;
      } else if (castStyle === 'onepiece_quake') {
        if (u < 0.42) {
          applyBoneAngles('spine', -0.12, 0, 0, isMixerAdditive);
          applyBoneAngles('armR', 1.04, 0.58, -0.20, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.28, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 1.04, -0.58, 0.20, isMixerAdditive);
          applyBoneAngles('foreArmL', 1.28, 0, 0, isMixerAdditive);
        } else {
          const sl = Math.min(1, (u - 0.42) / 0.26);
          applyBoneAngles('spine', -0.22 * sl, 0, 0, isMixerAdditive);
          applyBoneAngles('armR', 1.32, 0.58 - sl * 1.12, 0.36 * sl, isMixerAdditive);
          applyBoneAngles('foreArmR', 1.28 * (1 - sl) + 0.26 * sl, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 1.32, -0.58 + sl * 1.12, -0.36 * sl, isMixerAdditive);
          applyBoneAngles('foreArmL', 1.28 * (1 - sl) + 0.26 * sl, 0, 0, isMixerAdditive);
        }
        emoteFingerR = 1.08;
        emoteFingerL = 1.08;
      } else if (castStyle === 'onepiece_room') {
        applyBoneAngles('armL', 1.42 + aimP * 0.4, -0.18, 0, isMixerAdditive);
        applyBoneAngles('foreArmL', 0.16, 0, 0, isMixerAdditive);
        applyBoneAngles('handL', 0.35, 0, 0, true);
        const flick = u < 0.45 ? 0.62 : 1.58 + aimP * 0.5;
        applyBoneAngles('armR', flick, 0.14, 0, isMixerAdditive);
        applyBoneAngles('foreArmR', u < 0.45 ? 1.05 : 0.20, 0, 0, isMixerAdditive);
        fingerModeL = 'open';
        fingerModeR = 'jutsu_tiger';
        emoteFingerL = -0.08;
        emoteFingerR = 0.82;
      } else if (castStyle === 'onepiece_kick') {
        const k = Math.sin(u * Math.PI);
        applyBoneAngles('spine', 0.28 * k, 0.36 * k, -0.18 * k, isMixerAdditive);
        applyBoneAngles('armR', 0.34, 0.22, 0.18, isMixerAdditive);
        applyBoneAngles('foreArmR', 1.18, 0, 0, isMixerAdditive);
        applyBoneAngles('armL', 0.34, -0.22, -0.18, isMixerAdditive);
        applyBoneAngles('foreArmL', 1.18, 0, 0, isMixerAdditive);
        applyBoneAngles('thighR', 1.88 * k, -0.24 * k, 0.22 * k, isMixerAdditive);
        applyBoneAngles('shinR', -0.12 * k, 0, 0, isMixerAdditive);
        emoteFingerR = 0.92;
        emoteFingerL = 0.92;
      } else if (castStyle === 'tensura_nova') {
        if (u < 0.45) {
          const c = u / 0.45;
          applyBoneAngles('spine', 0.12 * c, 0, 0, isMixerAdditive);
          applyBoneAngles('armR', 2.42 * c, -0.18, 0.24, isMixerAdditive);
          applyBoneAngles('foreArmR', 0.22, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 2.42 * c, 0.18, -0.24, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.22, 0, 0, isMixerAdditive);
        } else {
          const rel = Math.min(1, (u - 0.45) / 0.28);
          applyBoneAngles('spine', -0.18 * rel, 0, 0, isMixerAdditive);
          applyBoneAngles('armR', 2.42 - rel * (0.94 - aimP), 0.16 * rel, 0, isMixerAdditive);
          applyBoneAngles('foreArmR', 0.16, 0, 0, isMixerAdditive);
          applyBoneAngles('armL', 2.42 - rel * (0.94 - aimP), -0.16 * rel, 0, isMixerAdditive);
          applyBoneAngles('foreArmL', 0.16, 0, 0, isMixerAdditive);
        }
        fingerModeR = 'open';
        fingerModeL = 'open';
        emoteFingerR = -0.06;
        emoteFingerL = -0.06;
      } else {
        // `tensura_devour` (Beelzebuth / Void Vortex claw)
        const pulse = Math.sin(u * Math.PI * 3) * 0.08;
        applyBoneAngles('spine', -0.16, -0.18, 0, isMixerAdditive);
        applyBoneAngles('armR', 1.48 + aimP + pulse, 0.12, 0, isMixerAdditive);
        applyBoneAngles('foreArmR', 0.16, 0, 0, isMixerAdditive);
        applyBoneAngles('armL', 1.18 + aimP * 0.6, -0.28, 0, isMixerAdditive);
        applyBoneAngles('foreArmL', 0.48, 0, 0, isMixerAdditive);
        fingerModeR = 'ki_cup';
        fingerModeL = 'ki_cup';
        emoteFingerR = 0.52;
        emoteFingerL = 0.52;
      }
    } else if (emote !== 'none' && emote !== 'roll' && rollTimer <= 0 && swingTimer <= 0) {
      if (emote === 'wave') {
        const wv = Math.sin(emoteT * 8.5) * 0.38;
        applyBoneAngles('armR', 1.65, -0.18, 0.55 + wv * 0.25, isMixerAdditive);
        applyBoneAngles('foreArmR', 0.85 + wv * 0.35, 0, wv * 0.55, isMixerAdditive);
        applyBoneAngles('handR', 0, 0, wv * 0.45, isMixerAdditive);
        emoteFingerR = -0.12;
        fingerModeR = 'open';
      } else if (emote === 'point') {
        const aimP = THREE.MathUtils.clamp(-pitch, -0.75, 0.75);
        applyBoneAngles('armR', 1.48 + aimP, headYaw * 0.5, 0.06, isMixerAdditive);
        applyBoneAngles('foreArmR', 0.08, 0, 0, isMixerAdditive);
        emoteFingerR = 0.95;
        fingerModeR = 'point';
      } else if (emote === 'guard') {
        const bob = Math.sin(emoteT * 4.2) * 0.05;
        applyBoneAngles('spine', -0.14, -0.26, 0, isMixerAdditive);
        applyBoneAngles('armR', 0.92 + bob, 0.28, 0.14, isMixerAdditive);
        applyBoneAngles('foreArmR', 1.15, 0, 0, isMixerAdditive);
        applyBoneAngles('armL', 1.08 - bob, -0.22, -0.14, isMixerAdditive);
        applyBoneAngles('foreArmL', 1.05, 0, 0, isMixerAdditive);
        applyBoneAngles('thighL', 0.24, 0, -0.08, isMixerAdditive);
        applyBoneAngles('shinL', -0.38, 0, 0, isMixerAdditive);
        applyBoneAngles('thighR', -0.16, 0, 0.08, isMixerAdditive);
        applyBoneAngles('shinR', -0.32, 0, 0, isMixerAdditive);
        this.modelRoot.position.y -= 0.07;
        emoteFingerR = 1.0;
        emoteFingerL = 1.0;
      } else if (emote === 'cross_arms') {
        applyBoneAngles('spine', 0.06, 0, 0, isMixerAdditive);
        applyBoneAngles('armR', 0.72, 0.58, -0.22, isMixerAdditive);
        applyBoneAngles('foreArmR', 1.28, 0.35, 0, isMixerAdditive);
        applyBoneAngles('armL', 0.70, -0.58, 0.22, isMixerAdditive);
        applyBoneAngles('foreArmL', 1.26, -0.35, 0, isMixerAdditive);
        emoteFingerR = 0.45;
        emoteFingerL = 0.45;
      } else if (emote === 'power_charge') {
        const vib = Math.sin(emoteT * 28) * 0.035;
        const pulse = Math.sin(emoteT * 4.5) * 0.06;
        applyBoneAngles('spine', -0.18 + pulse, 0, 0, isMixerAdditive);
        applyBoneAngles('head', -0.16 + pulse, 0, 0, isMixerAdditive);
        applyBoneAngles('armR', 0.36 + vib, -0.18, 0.38, isMixerAdditive);
        applyBoneAngles('foreArmR', 1.32 + vib, 0, 0, isMixerAdditive);
        applyBoneAngles('armL', 0.36 - vib, 0.18, -0.38, isMixerAdditive);
        applyBoneAngles('foreArmL', 1.32 - vib, 0, 0, isMixerAdditive);
        applyBoneAngles('thighL', 0.32, 0, -0.22, isMixerAdditive);
        applyBoneAngles('shinL', -0.56, 0, 0, isMixerAdditive);
        applyBoneAngles('thighR', 0.32, 0, 0.22, isMixerAdditive);
        applyBoneAngles('shinR', -0.56, 0, 0, isMixerAdditive);
        this.modelRoot.position.y -= 0.14;
        emoteFingerR = 1.05;
        emoteFingerL = 1.05;
      } else if (emote === 'meditate') {
        const hover = Math.sin(emoteT * 2.2) * 0.04;
        applyBoneAngles('spine', 0.04, 0, 0, isMixerAdditive);
        applyBoneAngles('armR', 0.46, 0.38, -0.12, isMixerAdditive);
        applyBoneAngles('foreArmR', 0.92, 0.24, 0, isMixerAdditive);
        applyBoneAngles('armL', 0.46, -0.38, 0.12, isMixerAdditive);
        applyBoneAngles('foreArmL', 0.92, -0.24, 0, isMixerAdditive);
        applyBoneAngles('thighL', 1.05, -0.35, -0.52, isMixerAdditive);
        applyBoneAngles('shinL', -1.45, 0, 0, isMixerAdditive);
        applyBoneAngles('thighR', 1.05, 0.35, 0.52, isMixerAdditive);
        applyBoneAngles('shinR', -1.45, 0, 0, isMixerAdditive);
        this.modelRoot.position.y = this.baseY - this.targetHeight * 0.26 + hover;
        emoteFingerR = 0.15;
        emoteFingerL = 0.15;
      } else if (emote === 'victory') {
        const pump = Math.sin(emoteT * 5.0) * 0.08;
        applyBoneAngles('spine', 0.08, -0.14, 0.05, isMixerAdditive);
        applyBoneAngles('armR', 2.45 + pump, -0.12, 0.28, isMixerAdditive);
        applyBoneAngles('foreArmR', 0.32, 0, 0, isMixerAdditive);
        applyBoneAngles('armL', 0.18, 0.25, -0.36, isMixerAdditive);
        applyBoneAngles('foreArmL', 0.95, 0, 0, isMixerAdditive);
        emoteFingerR = 1.05;
        emoteFingerL = 0.75;
      }
    }

    // 6. Direct Live Arm Reach (`[C]`) & Joint Studio Sliders (`[G]`)
    if (poseState && (poseState.liveArmActive || poseState.manualOverrideActive)) {
      if (poseState.liveArmActive || Math.abs(poseState.reachPitchR) > 0.005 || Math.abs(poseState.reachYawR) > 0.005 || Math.abs(poseState.elbowBendR) > 0.005) {
        applyBoneAngles(
          'armR',
          poseState.reachPitchR,
          poseState.reachYawR,
          Math.max(0, -poseState.reachYawR) * 0.25,
          isMixerAdditive && !poseState.manualOverrideActive
        );
        applyBoneAngles('foreArmR', poseState.elbowBendR, 0, 0, isMixerAdditive && !poseState.manualOverrideActive);
        applyBoneAngles('handR', 0, poseState.wristTwistR, 0, true);
      }
      if (poseState.liveArmLeftActive || poseState.manualOverrideActive) {
        if (poseState.liveArmLeftActive || Math.abs(poseState.reachPitchL) > 0.005 || Math.abs(poseState.reachYawL) > 0.005 || Math.abs(poseState.elbowBendL) > 0.005) {
          applyBoneAngles(
            'armL',
            poseState.reachPitchL,
            poseState.reachYawL,
            -Math.max(0, poseState.reachYawL) * 0.25,
            isMixerAdditive && !poseState.manualOverrideActive
          );
          applyBoneAngles('foreArmL', poseState.elbowBendL, 0, 0, isMixerAdditive && !poseState.manualOverrideActive);
          applyBoneAngles('handL', 0, poseState.wristTwistL, 0, true);
        }
      }
      if (poseState.manualOverrideActive) {
        if (Math.abs(poseState.spineLean) > 0.005 || Math.abs(poseState.spineTwist) > 0.005) {
          applyBoneAngles('spine', -poseState.spineLean, poseState.spineTwist, 0, isMixerAdditive);
        }
        if (Math.abs(poseState.headPitchOffset) > 0.005 || Math.abs(poseState.headYawOffset) > 0.005) {
          applyBoneAngles('head', poseState.headPitchOffset, poseState.headYawOffset, 0, isMixerAdditive);
        }
        if (Math.abs(poseState.legRStride) > 0.005 || Math.abs(poseState.kneeRBend) > 0.005) {
          applyBoneAngles('thighR', poseState.legRStride, 0, 0, isMixerAdditive);
          applyBoneAngles('shinR', -poseState.kneeRBend, 0, 0, isMixerAdditive);
        }
        if (Math.abs(poseState.legLStride) > 0.005 || Math.abs(poseState.kneeLBend) > 0.005) {
          applyBoneAngles('thighL', poseState.legLStride, 0, 0, isMixerAdditive);
          applyBoneAngles('shinL', -poseState.kneeLBend, 0, 0, isMixerAdditive);
        }
      }
    }

    // 7. Dynamic Calibrated 5-Finger Articulation & One Piece Swappable Hand Variant Sync
    const manualCurlR = poseState && poseState.fingerCurlR >= -0.25 ? poseState.fingerCurlR : null;
    const manualCurlL = poseState && poseState.fingerCurlL >= -0.25 ? poseState.fingerCurlL : null;
    const effCurlR =
      manualCurlR !== null
        ? manualCurlR
        : emoteFingerR !== null
          ? emoteFingerR
          : hasRightHeld
            ? 1.02
            : swingTimer > 0
              ? 0.96
              : 0.28 + moving * 0.14;
    const effCurlL =
      manualCurlL !== null
        ? manualCurlL
        : emoteFingerL !== null
          ? emoteFingerL
          : hasLeftHeld || blocking
            ? 0.95
            : swingTimer > 0 && comboStage === 1
              ? 0.96
              : 0.26 + moving * 0.14;

    // When holding an item in right hand, disable bare-hand Jutsu finger poses so the fist stays wrapped on the hilt
    const finalModeR: FingerPoseMode = hasRightHeld && fingerModeR !== 'auto' ? 'grip' : fingerModeR;
    const finalModeL: FingerPoseMode = hasLeftHeld && fingerModeL !== 'auto' ? 'grip' : fingerModeL;

    if (this.rightCalibratedFingers) {
      applyCalibratedFingerPose(this.rightCalibratedFingers, effCurlR, finalModeR);
    } else if (this.rightFingerChains) {
      applyClosedGripFingerCurl(this.rightFingerChains, this.fingerRestQuats, effCurlR);
    }
    if (this.leftCalibratedFingers) {
      applyCalibratedFingerPose(this.leftCalibratedFingers, effCurlL, finalModeL);
    } else if (this.leftFingerChains) {
      applyClosedGripFingerCurl(this.leftFingerChains, this.fingerRestQuats, effCurlL);
    }
    this.syncHandVariantMeshes(effCurlR >= 0.55, hasRightHeld, effCurlL >= 0.55, hasLeftHeld);

    // ANATOMICAL PALM & FOREARM SOCKET TRACKING:
    // Places weapons inside the closed palmar hollow (using calibrated palmar normal + knuckle center or RHand_Weapon bone)
    // and aligns leftHandSocket parallel to the left forearm so shields NEVER pierce the hand!
    this.wrapper.updateWorldMatrix(true, true);
    const invWrapper = this.wrapper.matrixWorld.clone().invert();
    const invWrapperQuat = this.wrapper.getWorldQuaternion(new THREE.Quaternion()).invert();
    const swingFrac = swingTimer > 0 ? Math.sin((1 - swingTimer / 0.26) * Math.PI) : 0;
    const hRatio = this.targetHeight / 1.78;

    const resolveLimbInWrapper = (
      hand?: THREE.Bone,
      fore?: THREE.Bone,
      upper?: THREE.Bone,
      sideSign: -1 | 1 = 1,
      fingerChains?: FingerChainBones | null,
      calFingers?: CalibratedHandFingers | null
    ): { palm: THREE.Vector3; wrist: THREE.Vector3; elbow: THREE.Vector3; armDir: THREE.Vector3; palmNormal: THREE.Vector3 | null } | null => {
      const distal = hand || fore;
      const prox = hand ? fore || upper : upper;
      if (distal && prox && distal !== prox) {
        const pProx = new THREE.Vector3();
        const pDist = new THREE.Vector3();
        prox.getWorldPosition(pProx);
        distal.getWorldPosition(pDist);
        pProx.applyMatrix4(invWrapper);
        pDist.applyMatrix4(invWrapper);
        const dir = pDist.clone().sub(pProx);
        if (dir.lengthSq() > 1e-5) {
          dir.normalize();
          let palm: THREE.Vector3 | null = null;
          let palmNormal: THREE.Vector3 | null = null;

          // Check artist-authored weapon socket child bone first (e.g. RHand_Weapon on Shanks/Mihawk/Law/Sabo/Kaido)
          if (hand) {
            const wpnBone = hand.children.find((c) => (c as THREE.Bone).isBone && isBakedHandheldWeaponObject(c.name || ''));
            if (wpnBone) {
              const pWpn = new THREE.Vector3();
              wpnBone.getWorldPosition(pWpn);
              pWpn.applyMatrix4(invWrapper);
              if (pWpn.distanceTo(pDist) < 0.20 * this.targetHeight) {
                palm = pWpn;
              }
            }
            if (calFingers) {
              const qHandWrap = invWrapperQuat.clone().multiply(hand.getWorldQuaternion(new THREE.Quaternion()));
              palmNormal = calFingers.palmNormalLocal.clone().applyQuaternion(qHandWrap).normalize();
            } else if (/^rhand_palm/i.test(hand.name || '')) {
              const qHandWrap = invWrapperQuat.clone().multiply(hand.getWorldQuaternion(new THREE.Quaternion()));
              palmNormal = new THREE.Vector3(0, -1, 0).applyQuaternion(qHandWrap).normalize();
            }
          }

          if (!palm) {
            const midFinger = fingerChains?.middle?.[0] || fingerChains?.index?.[0];
            if (hand && midFinger) {
              const pKnuckle = new THREE.Vector3();
              midFinger.getWorldPosition(pKnuckle);
              pKnuckle.applyMatrix4(invWrapper);
              palm = pDist.clone().lerp(pKnuckle, 0.66);
            } else {
              const palmAdvance = (hand ? 0.048 : 0.175) * hRatio;
              palm = pDist.clone().addScaledVector(dir, palmAdvance);
            }
            if (palmNormal) {
              palm.addScaledVector(palmNormal, 0.028 * hRatio);
            } else {
              palm.x -= sideSign * 0.024 * hRatio;
              palm.z -= 0.010 * hRatio;
            }
          }
          return { palm, wrist: pDist, elbow: pProx, armDir: dir, palmNormal };
        }
      }
      if (hand) {
        const pDist = new THREE.Vector3();
        hand.getWorldPosition(pDist);
        pDist.applyMatrix4(invWrapper);
        const fallbackDir = new THREE.Vector3(sideSign * 0.08, -0.82, -0.56).normalize();
        const palm = pDist.clone().addScaledVector(fallbackDir, 0.046 * hRatio);
        return { palm, wrist: pDist, elbow: pDist.clone().addScaledVector(fallbackDir, -0.24), armDir: fallbackDir, palmNormal: null };
      }
      if (upper) {
        const pShoulder = new THREE.Vector3();
        upper.getWorldPosition(pShoulder);
        const pFist = new THREE.Vector3(0, -0.52, 0).applyMatrix4(upper.matrixWorld);
        pShoulder.applyMatrix4(invWrapper);
        pFist.applyMatrix4(invWrapper);
        const dir = pFist.clone().sub(pShoulder);
        if (dir.lengthSq() > 1e-5) dir.normalize();
        else dir.set(0, -0.86, -0.50);
        return { palm: pFist, wrist: pFist, elbow: pShoulder.clone().lerp(pFist, 0.5), armDir: dir, palmNormal: null };
      }
      return null;
    };

    const freeSocketDir = Boolean(
      poseMode === 'bow' ||
        poseMode === 'crossbow' ||
        poseMode === 'trident' ||
        poseState?.liveArmActive ||
        poseState?.manualOverrideActive ||
        emote !== 'none' ||
        (castTimer > 0 && castStyle !== 'none')
    );

    const rTrack = resolveLimbInWrapper(
      this.bones.handR,
      this.bones.foreArmR,
      this.bones.armR,
      1,
      this.rightFingerChains,
      this.rightCalibratedFingers
    );
    if (rTrack) {
      this.rightHandSocket.position.copy(rTrack.palm);
      const cleanDir = freeSocketDir
        ? rTrack.armDir.clone().normalize()
        : new THREE.Vector3(
            THREE.MathUtils.clamp(rTrack.armDir.x, -0.10, 0.16),
            THREE.MathUtils.clamp(rTrack.armDir.y, -0.56, -0.18),
            Math.min(-0.78, rTrack.armDir.z)
          ).normalize();
      let refRight =
        freeSocketDir && rTrack.palmNormal
          ? rTrack.palmNormal.clone().negate()
          : Math.abs(cleanDir.x) > 0.92
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(1, 0, 0);
      refRight.addScaledVector(cleanDir, -refRight.dot(cleanDir));
      if (refRight.lengthSq() < 1e-5) refRight.set(1, 0, 0);
      const basisX = refRight.normalize();
      const basisY = new THREE.Vector3().crossVectors(basisX, cleanDir).normalize();
      const basisZ = new THREE.Vector3().crossVectors(basisX, basisY).normalize();
      const mat4 = new THREE.Matrix4().makeBasis(basisX, basisY, basisZ);
      this.rightHandSocket.quaternion.setFromRotationMatrix(mat4);
      if (swingFrac > 0.001) {
        const slashPitch = comboStage === 2 ? -swingFrac * 0.92 : -swingFrac * 0.65;
        const qSlash = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), slashPitch);
        this.rightHandSocket.quaternion.multiply(qSlash);
      }
    } else {
      this.rightHandSocket.position.set(0.22 * hRatio, 0.84 * hRatio, -0.18 * hRatio);
      this.rightHandSocket.rotation.set(-0.75 - swingFrac * 0.85, 0, 0);
    }

    const lTrack = resolveLimbInWrapper(
      this.bones.handL,
      this.bones.foreArmL,
      this.bones.armL,
      -1,
      this.leftFingerChains,
      this.leftCalibratedFingers
    );
    if (lTrack) {
      if (blocking) {
        this.leftHandSocket.position.set(-0.14 * hRatio, 1.06 * hRatio, -0.32 * hRatio);
        this.leftHandSocket.rotation.set(-0.10, 0.32, 0);
      } else {
        const strapPos = lTrack.wrist.clone().lerp(lTrack.elbow, 0.30);
        this.leftHandSocket.position.copy(strapPos);
        const cleanDir = freeSocketDir
          ? lTrack.armDir.clone().normalize()
          : new THREE.Vector3(
              THREE.MathUtils.clamp(lTrack.armDir.x, -0.24, 0.12),
              lTrack.armDir.y,
              Math.min(-0.18, lTrack.armDir.z)
            ).normalize();
        const refRight = Math.abs(cleanDir.x) > 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const basisX = refRight.clone().addScaledVector(cleanDir, -refRight.dot(cleanDir)).normalize();
        const basisY = new THREE.Vector3().crossVectors(basisX, cleanDir).normalize();
        const basisZ = new THREE.Vector3().crossVectors(basisX, basisY).normalize();
        const mat4 = new THREE.Matrix4().makeBasis(basisX, basisY, basisZ);
        this.leftHandSocket.quaternion.setFromRotationMatrix(mat4);
      }
    } else {
      this.leftHandSocket.position.set(blocking ? -0.14 : -0.26, blocking ? 1.06 : 0.90, blocking ? -0.32 : -0.18);
      this.leftHandSocket.rotation.set(blocking ? -0.10 : -0.55, blocking ? 0.32 : 0, 0);
    }
  }

  public getFpExtractorRefs() {
    return {
      bones: this.bones,
      restStates: this.restStates,
      rightFingerChains: this.rightFingerChains,
      rightCalibratedFingers: this.rightCalibratedFingers,
      fingerRestQuats: this.fingerRestQuats,
      bakedWeaponNodes: this.bakedWeaponNodes,
      handVariantMeshes: this.handVariantMeshes,
      clonedGeometries: this.clonedGeometries,
      clonedMaterials: this.clonedMaterials
    };
  }

  public dispose() {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.modelRoot);
    }
    for (const m of this.clonedMaterials) {
      m.dispose();
    }
    this.clonedMaterials.length = 0;
    for (const g of this.clonedGeometries) {
      g.dispose();
    }
    this.clonedGeometries.length = 0;
  }
}

// ============================================================================
// SINGLETON GLB LOADER & CACHE
// ============================================================================
const gltfLoader = new GLTFLoader();
const templateCache = new Map<string, CachedTemplate>();
const inflightLoads = new Map<string, Promise<CachedTemplate | null>>();

function resolveModelUrl(file: string): string {
  const base = typeof document !== 'undefined' ? document.baseURI : '/';
  return new URL(`models/${file}.glb`, base).href;
}

function normalizeLoadedScene(scene: THREE.Group, stripPedestal = true, isWeapon = false) {
  scene.updateMatrixWorld(true);

  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      meshes.push(o as THREE.Mesh);
    }
  });

  // 1. Strip obvious display stands, ground planes, stage maps, and detached side-display props (NEVER strip face mesh '0'!)
  if (meshes.length > 1) {
    let weightedX = 0;
    let totalVerts = 0;
    const fullBox = new THREE.Box3();
    const meshInfos = meshes.map((m) => {
      m.geometry.computeBoundingBox();
      const mb = m.geometry.boundingBox ? m.geometry.boundingBox.clone() : new THREE.Box3().setFromObject(m);
      if (!(m as THREE.SkinnedMesh).isSkinnedMesh) {
        mb.applyMatrix4(m.matrixWorld);
      }
      fullBox.union(mb);
      const ms = new THREE.Vector3();
      const mc = new THREE.Vector3();
      mb.getSize(ms);
      mb.getCenter(mc);
      const vCount = m.geometry?.attributes?.position?.count ?? 0;
      weightedX += mc.x * vCount;
      totalVerts += vCount;
      return { m, mb, ms, mc, vCount };
    });
    const fullSize = new THREE.Vector3();
    fullBox.getSize(fullSize);
    const mainX = totalVerts > 0 ? weightedX / totalVerts : 0;

    let coreHeight = 0;
    for (const info of meshInfos) {
      if (info.vCount >= totalVerts * 0.12 && info.ms.y > coreHeight) {
        coreHeight = info.ms.y;
      }
    }
    if (coreHeight <= 0) coreHeight = fullSize.y;

    const hasSkinnedBody = meshInfos.some((info) => Boolean((info.m as THREE.SkinnedMesh).isSkinnedMesh));

    for (const { m, mb, ms, vCount } of meshInfos) {
      const nm = (m.name || '').toLowerCase();
      const pnm = (m.parent?.name || '').toLowerCase();
      // Strip alternate facial expression / dragon-claw swap meshes in anime game rigs while keeping open/close/hold hand variants for dynamic switching!
      if (
        !isWeapon &&
        /(?:face_attack|face_damage|hand_dragon|glove_dragon|sp_[lr]_leg|heartcube|hat_hair)_pl_|fork_neutral|pithfork|40_-sword\s*(?:left|right)/.test(
          nm + ' ' + pnm
        )
      ) {
        m.visible = false;
        m.parent?.remove(m);
        continue;
      }

      if (
        stripPedestal &&
        /pedestal|stand|floor|ground|backdrop|background|stage|turntable|base_plate|shadow_plane|skybox|dome|sub_.*map|_map_|_p_6_w|^weapon_d|cha_toshiro_g_6_chain/.test(
          nm + ' ' + pnm
        )
      ) {
        m.visible = false;
        m.parent?.remove(m);
        continue;
      }

      if (stripPedestal && !(m as THREE.SkinnedMesh).isSkinnedMesh && meshes.length >= 3) {
        if (
          ms.y < fullSize.y * 0.055 &&
          Math.max(ms.x, ms.z) > fullSize.y * 0.65 &&
          Math.abs(mb.min.y - fullBox.min.y) < fullSize.y * 0.04
        ) {
          m.visible = false;
          m.parent?.remove(m);
          continue;
        }
      }

      // Detached horizontal side-showcase prop stripper:
      // Unskinned static props inside a skinned character GLB (e.g. knight_armor Object_2 ground polearm) use tighter ±0.40*H limit;
      // skinned meshes keep T-pose hands within ±0.58*H intact!
      if (!isWeapon && stripPedestal && vCount < totalVerts * 0.42) {
        const isUnskinnedPropInRig = hasSkinnedBody && !(m as THREE.SkinnedMesh).isSkinnedMesh;
        const horizLimit = Math.max(coreHeight, fullSize.y * 0.88) * (isUnskinnedPropInRig ? 0.40 : 0.58);
        if (mb.min.x > mainX + horizLimit || mb.max.x < mainX - horizLimit) {
          m.visible = false;
          m.parent?.remove(m);
          continue;
        }
      } else if (isWeapon && vCount < totalVerts * 0.45) {
        const maxRef = Math.max(fullSize.x, fullSize.y, fullSize.z);
        if (mb.min.x > mainX + maxRef * 0.12 || mb.max.x < mainX - maxRef * 0.12) {
          m.visible = false;
          m.parent?.remove(m);
          continue;
        }
      }
    }
  } else if (meshes.length === 1 && stripPedestal && !isWeapon && !(meshes[0] as THREE.SkinnedMesh).isSkinnedMesh) {
    const m = meshes[0];
    const pos = m.geometry?.attributes?.position as THREE.BufferAttribute | undefined;
    const idx = m.geometry?.index;
    if (pos && idx && pos.count > 100) {
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox!;
      const h = bb.max.y - bb.min.y;
      let sumX = 0;
      const step = Math.max(1, Math.floor(pos.count / 500));
      let cnt = 0;
      for (let i = 0; i < pos.count; i += step) {
        sumX += pos.getX(i);
        cnt++;
      }
      const medX = cnt > 0 ? sumX / cnt : 0;
      const limitX = h * 0.58;
      if (bb.max.x - medX > h * 0.62 || medX - bb.min.x > h * 0.62) {
        const arr = idx.array as Uint16Array | Uint32Array;
        let stripped = false;
        for (let t = 0; t + 2 < arr.length; t += 3) {
          const x0 = Math.abs(pos.getX(arr[t]) - medX);
          const x1 = Math.abs(pos.getX(arr[t + 1]) - medX);
          const x2 = Math.abs(pos.getX(arr[t + 2]) - medX);
          if (x0 > limitX && x1 > limitX && x2 > limitX) {
            arr[t + 1] = arr[t];
            arr[t + 2] = arr[t];
            stripped = true;
          }
        }
        if (stripped) {
          idx.needsUpdate = true;
          for (let i = 0; i < pos.count; i++) {
            if (Math.abs(pos.getX(i) - medX) > limitX * 1.12) {
              pos.setXYZ(i, medX, bb.min.y + h * 0.5, 0);
            }
          }
          pos.needsUpdate = true;
          m.geometry.computeBoundingBox();
        }
      }
    }
  }

  // 1b. Strip detached ground-standing / floating showcase weapon sub-meshes baked into SkinnedMesh triangles
  //     (e.g. Urahara's ground-standing Benihime `wp1_047` + `Bone_swordtrail_048`, Benimaru's floating `Bone044_086`/`Bone045_088`,
  //      Hitsugaya's horizontal `Weapon chain01..06` / `Weapon1_069`) so zero stray weapons ever float or stand in the ground!
  if (!isWeapon && stripPedestal) {
    const detachedPropBoneRe = /(?:^|_|\b)(?:wp\d+|bone_swordtrail|swordtrail|weapon\s*chain0\d|weapon1_069|bip001[\s_]*prop\d+|bone044_086|bone045_088)(?:$|_|\d|\b)/i;
    scene.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh || !sm.skeleton || !sm.geometry) return;
      const skinIdx = sm.geometry.attributes.skinIndex as THREE.BufferAttribute | undefined;
      const skinWgt = sm.geometry.attributes.skinWeight as THREE.BufferAttribute | undefined;
      const pos = sm.geometry.attributes.position as THREE.BufferAttribute | undefined;
      const idx = sm.geometry.index;
      if (!skinIdx || !skinWgt || !pos || !idx) return;

      const detachedBoneIndices = new Set<number>();
      sm.skeleton.bones.forEach((bone, bi) => {
        if (bone && detachedPropBoneRe.test(bone.name || '')) {
          detachedBoneIndices.add(bi);
        }
      });
      if (detachedBoneIndices.size === 0) return;

      const vCount = pos.count;
      const vertDetachedWeight = new Float32Array(vCount);
      let anyDetachedVert = false;
      for (let v = 0; v < vCount; v++) {
        let dw = 0;
        const i0 = skinIdx.getX(v), w0 = skinWgt.getX(v);
        const i1 = skinIdx.getY(v), w1 = skinWgt.getY(v);
        const i2 = skinIdx.getZ(v), w2 = skinWgt.getZ(v);
        const i3 = skinIdx.getW(v), w3 = skinWgt.getW(v);
        if (w0 > 0 && detachedBoneIndices.has(i0)) dw += w0;
        if (w1 > 0 && detachedBoneIndices.has(i1)) dw += w1;
        if (w2 > 0 && detachedBoneIndices.has(i2)) dw += w2;
        if (w3 > 0 && detachedBoneIndices.has(i3)) dw += w3;
        vertDetachedWeight[v] = dw;
        if (dw >= 0.45) anyDetachedVert = true;
      }
      if (!anyDetachedVert) return;

      const arr = idx.array as Uint16Array | Uint32Array;
      let strippedTris = false;
      for (let t = 0; t + 2 < arr.length; t += 3) {
        const a = arr[t], b = arr[t + 1], c = arr[t + 2];
        if (vertDetachedWeight[a] >= 0.45 || vertDetachedWeight[b] >= 0.45 || vertDetachedWeight[c] >= 0.45) {
          arr[t + 1] = a;
          arr[t + 2] = a;
          strippedTris = true;
        }
      }
      if (strippedTris) {
        idx.needsUpdate = true;
        let minY = Infinity, maxY = -Infinity, sumX = 0, bodyCnt = 0;
        for (let v = 0; v < vCount; v++) {
          if (vertDetachedWeight[v] < 0.2) {
            const y = pos.getY(v);
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            sumX += pos.getX(v);
            bodyCnt++;
          }
        }
        const safeX = bodyCnt > 0 ? sumX / bodyCnt : 0;
        const safeY = Number.isFinite(minY) && Number.isFinite(maxY) ? (minY + maxY) * 0.5 : 0.8;
        for (let v = 0; v < vCount; v++) {
          if (vertDetachedWeight[v] >= 0.45) {
            pos.setXYZ(v, safeX, safeY, 0);
            skinWgt.setXYZW(v, 0, 0, 0, 0);
          }
        }
        pos.needsUpdate = true;
        skinWgt.needsUpdate = true;
        sm.geometry.computeBoundingBox();
        sm.geometry.computeBoundingSphere();
      }
    });
  }

  // 2. Strip inverted-hull toon outline shells (which turn opaque grey/black under DoubleSide) & normalize PBR materials
  const isOutlineName = (s: string) =>
    /(?:^|[_.\-\s])(?:oh_outline|m_fp_outline|outline_mat|outline_material|toon_outline|line_mat)(?:[_.\-\s\d]|$)|^outline$/i.test(
      s.trim()
    );
  const outlineMeshesToRemove: THREE.Mesh[] = [];

  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      if (!isWeapon && isOutlineName(mesh.name || '')) {
        outlineMeshesToRemove.push(mesh);
        return;
      }
      if (mesh.geometry) {
        mesh.geometry.userData = { ...mesh.geometry.userData, shared: true };
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      if (!isWeapon && mats.length > 0 && mats.every((mt) => isOutlineName(mt?.name || ''))) {
        outlineMeshesToRemove.push(mesh);
        return;
      }
      const fixMat = (mat: THREE.Material) => {
        if (!isWeapon && isOutlineName(mat.name || '')) {
          mat.visible = false;
          return;
        }
        mat.side = THREE.DoubleSide;
        if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const std = mat as THREE.MeshStandardMaterial;
          // Promote unlit/emission-exported anime diffuse textures (`!map && emissiveMap`, e.g. Rimuru) to baseColor map!
          if (!std.map && std.emissiveMap) {
            std.map = std.emissiveMap;
            std.color.setHex(0xffffff);
            std.emissive.setHex(0x14161d);
            std.emissiveIntensity = 0.16;
          }
          const texSlots = [std.map, std.emissiveMap, std.normalMap, std.roughnessMap, std.metalnessMap, std.aoMap];
          for (const t of texSlots) {
            if (t) {
              t.userData = { ...t.userData, shared: true };
            }
          }
          if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
          if (std.emissiveMap) std.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          if (!isWeapon) {
            // Harmonize 3D character PBR roughness/metalness with the matte voxel grass & sunlight world (zero plastic glare!)
            std.metalness = Math.min(0.18, std.metalness);
            std.roughness = THREE.MathUtils.clamp(Math.max(0.62, std.roughness), 0.62, 0.94);
          } else if (std.metalness > 0.46) {
            std.metalness = 0.34;
            std.roughness = Math.max(0.28, std.roughness);
          }
          if (std.emissive && std.emissive.r === 0 && std.emissive.g === 0 && std.emissive.b === 0) {
            std.emissive.setHex(0x020305);
          }
          if (std.transparent && std.opacity >= 0.98 && std.map) {
            std.alphaTest = 0.25;
          }
          std.needsUpdate = true;
        }
      };
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(fixMat);
      } else if (mesh.material) {
        fixMat(mesh.material);
      }
    }
  });

  for (const om of outlineMeshesToRemove) {
    om.visible = false;
    om.parent?.remove(om);
  }

  scene.updateMatrixWorld(true);
}

export async function loadGlbTemplate(file: string, stripPedestal = true): Promise<CachedTemplate | null> {
  const cached = templateCache.get(file);
  if (cached) return cached;

  const existing = inflightLoads.get(file);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const url = resolveModelUrl(file);
      const gltf: GLTF = await gltfLoader.loadAsync(url);
      // Restore semantic glTF mesh names (`r_hand_open_pl_*`, `r_hand_close_pl_*`, `coat_pl_*`, `weapon_equip_pl_*`)
      // when Sketchfab's exporter names scene leaf nodes generically (`Object_6`, `Object_14`, etc.).
      const parser = (
        gltf as unknown as {
          parser?: {
            associations?: Map<object, { meshes?: number }>;
            json?: { meshes?: Array<{ name?: string }> };
          };
        }
      ).parser;
      if (parser?.associations && parser?.json?.meshes) {
        gltf.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const assoc = parser.associations!.get(obj);
            if (assoc && typeof assoc.meshes === 'number') {
              const rawName = parser.json!.meshes![assoc.meshes]?.name;
              if (rawName && !obj.name.includes(rawName)) {
                obj.name = /^object_\d+$/i.test(obj.name) ? rawName : `${obj.name}__${rawName}`;
              }
            }
          }
        });
      }
      const isWeapon = file.startsWith('wpn_') || file === 'fp_arm';
      normalizeLoadedScene(gltf.scene, stripPedestal, isWeapon);
      const naturalBox = new THREE.Box3().setFromObject(gltf.scene);
      const naturalSize = new THREE.Vector3();
      naturalBox.getSize(naturalSize);
      const tpl: CachedTemplate = {
        scene: gltf.scene,
        animations: gltf.animations || [],
        naturalBox,
        naturalSize
      };
      templateCache.set(file, tpl);
      return tpl;
    } catch (err) {
      console.warn(`[GlbModelRegistry] Failed to load ${file}.glb:`, err);
      return null;
    } finally {
      inflightLoads.delete(file);
    }
  })();

  inflightLoads.set(file, promise);
  return promise;
}

// ============================================================================
// CHARACTER ID -> AUTHENTIC SKETCHFAB GLB / MINECRAFT RIG MAPPING (108 Characters!)
// ============================================================================
export const CHARACTER_GLB_CONFIGS: Record<string, GlbModelConfig> = {
  // Minecraft Legends Universe (12) — Uses crisp Mojang 1.8 articulated Minecraft boxy rigs!
  mc_steve: { file: 'mc_alex', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true },
  mc_alex: { file: 'mc_alex', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true },
  mc_herobrine: { file: 'mc_herobrine', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true },
  mc_technoblade: { file: 'mc_technoblade', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true },
  mc_diamond_steve: { file: 'mc_alex', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true },
  mc_netherite_warrior: { file: 'mc_alex', targetHeight: 1.82, yawOffset: Math.PI, isMinecraftRig: true },
  mc_sunny: { file: 'mc_alex', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true },
  mc_noor: { file: 'mc_alex', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true },
  mc_zuri: { file: 'mc_alex', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true },
  mc_ari: { file: 'mc_alex', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true },
  mc_kai: { file: 'mc_alex', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true },
  mc_warden_knight: { file: 'mc_warden', targetHeight: 1.92, yawOffset: Math.PI, isMinecraftRig: true },

  // Naruto Universe (25 Canonical Powerhouses!)
  naruto_baryon: { file: 'naruto', targetHeight: 1.78, yawOffset: Math.PI },
  sasuke_rinnegan: { file: 'sasuke', targetHeight: 1.79, yawOffset: Math.PI },
  madara_six_paths: { file: 'madara', targetHeight: 1.84, yawOffset: Math.PI },
  itachi_uchiha: { file: 'itachi', targetHeight: 1.79, yawOffset: Math.PI },
  minato_namikaze: { file: 'minato', targetHeight: 1.80, yawOffset: Math.PI },
  kakashi_dms: { file: 'kakashi', targetHeight: 1.80, yawOffset: Math.PI },
  hashirama_senju: { file: 'hashirama', targetHeight: 1.84, yawOffset: Math.PI },
  pain_nagato: { file: 'pain', targetHeight: 1.79, yawOffset: Math.PI },
  jiraiya_sage: { file: 'jiraiya', targetHeight: 1.88, yawOffset: Math.PI },
  gaara_kazekage: { file: 'gaara', targetHeight: 1.74, yawOffset: Math.PI },
  obito_jinchuriki: { file: 'obito', targetHeight: 1.82, yawOffset: Math.PI },
  might_guy_8gates: { file: 'sanji', targetHeight: 1.84, yawOffset: Math.PI, tintHex: 0xef4444 },
  rock_lee: { file: 'sanji', targetHeight: 1.76, yawOffset: Math.PI, tintHex: 0x22c55e },
  kaguya_otsutsuki: { file: 'vampire_queen', targetHeight: 1.86, yawOffset: Math.PI, tintHex: 0xf8fafc },
  hagoromo_sage: { file: 'madara', targetHeight: 1.88, yawOffset: Math.PI, tintHex: 0xfef3c7 },
  tobirama_senju: { file: 'kakashi', targetHeight: 1.83, yawOffset: Math.PI, tintHex: 0x38bdf8 },
  hiruzen_sarutobi: { file: 'jiraiya', targetHeight: 1.74, yawOffset: Math.PI, tintHex: 0xd97706 },
  tsunade_senju: { file: 'shion', targetHeight: 1.75, yawOffset: Math.PI, tintHex: 0x4ade80 },
  orochimaru_sannin: { file: 'sasuke', targetHeight: 1.82, yawOffset: Math.PI, tintHex: 0xa855f7 },
  killer_bee_hachibi: { file: 'broly', targetHeight: 1.90, yawOffset: Math.PI, tintHex: 0xef4444 },
  kisame_hoshigaki: { file: 'itachi', targetHeight: 1.94, yawOffset: Math.PI, tintHex: 0x0284c7 },
  shisui_uchiha: { file: 'sasuke', targetHeight: 1.78, yawOffset: Math.PI, tintHex: 0x10b981 },
  deidara_akatsuki: { file: 'pain', targetHeight: 1.77, yawOffset: Math.PI, tintHex: 0xfacc15 },
  hidan_akatsuki: { file: 'itachi', targetHeight: 1.80, yawOffset: Math.PI, tintHex: 0xe11d48 },
  hinata_hyuga: { file: 'hinata_hyuga', targetHeight: 1.70, yawOffset: Math.PI },

  // Bleach Universe (24 Canonical Powerhouses — Captains, Royal Guard, Sternritter & Espada!)
  ichigo_bankai: { file: 'ichigo', targetHeight: 1.80, yawOffset: Math.PI },
  aizen_hogyoku: { file: 'aizen', targetHeight: 1.84, yawOffset: Math.PI },
  yamamoto_bankai: { file: 'yamamoto', targetHeight: 1.82, yawOffset: Math.PI + 0.05 },
  kenpachi_zaraki: { file: 'kenpachi', targetHeight: 1.92, yawOffset: Math.PI },
  byakuya_kuchiki: { file: 'byakuya', targetHeight: 1.80, yawOffset: Math.PI },
  ulquiorra_cifer: { file: 'ulquiorra', targetHeight: 1.78, yawOffset: Math.PI },
  grimmjow_pantera: { file: 'grimmjow', targetHeight: 1.82, yawOffset: Math.PI },
  hitsugaya_toshiro: { file: 'hitsugaya', targetHeight: 1.68, yawOffset: Math.PI },
  rukia_bankai: { file: 'rukia', targetHeight: 1.66, yawOffset: Math.PI },
  kisuke_urahara: { file: 'urahara', targetHeight: 1.81, yawOffset: Math.PI },
  shunsui_kyoraku: { file: 'shunsui', targetHeight: 1.84, yawOffset: Math.PI },
  komamura_bankai: { file: 'komamura', targetHeight: 2.04, yawOffset: Math.PI },
  yhwach_almighty: { file: 'aizen', targetHeight: 1.90, yawOffset: Math.PI, tintHex: 0x334155 },
  ichibe_hyosube: { file: 'yamamoto', targetHeight: 1.94, yawOffset: Math.PI + 0.05, tintHex: 0xf8fafc },
  unohana_retsu: { file: 'rukia', targetHeight: 1.72, yawOffset: Math.PI, tintHex: 0x991b1b },
  yoruichi_shihouin: { file: 'hinata_hyuga', targetHeight: 1.74, yawOffset: Math.PI, tintHex: 0x7c3aed },
  gin_ichimaru: { file: 'byakuya', targetHeight: 1.83, yawOffset: Math.PI, tintHex: 0xcbd5e1 },
  mayuri_kurotsuchi: { file: 'urahara', targetHeight: 1.80, yawOffset: Math.PI, tintHex: 0xfacc15 },
  renji_abarai: { file: 'ichigo', targetHeight: 1.85, yawOffset: Math.PI, tintHex: 0xdc2626 },
  uryu_ishida: { file: 'sasuke', targetHeight: 1.77, yawOffset: Math.PI, tintHex: 0xe0f2fe },
  jugram_haschwalth: { file: 'byakuya', targetHeight: 1.86, yawOffset: Math.PI, tintHex: 0xfef08a },
  coyote_starrk: { file: 'shunsui', targetHeight: 1.84, yawOffset: Math.PI, tintHex: 0xe2e8f0 },
  barragan_espada: { file: 'void_reaper', targetHeight: 1.92, yawOffset: Math.PI, tintHex: 0x9333ea },
  shinji_hirako: { file: 'urahara', targetHeight: 1.78, yawOffset: Math.PI, tintHex: 0xfde047 },

  // Dragon Ball Super Universe (10)
  goku_mui: { file: 'goku_mui', targetHeight: 1.82, yawOffset: Math.PI },
  vegeta_ultra_ego: { file: 'vegeta', targetHeight: 1.74, yawOffset: Math.PI },
  gohan_beast: { file: 'gohan', targetHeight: 1.80, yawOffset: Math.PI },
  broly_lssj: { file: 'broly', targetHeight: 2.08, yawOffset: Math.PI },
  gogeta_blue: { file: 'gogeta', targetHeight: 1.83, yawOffset: Math.PI },
  beerus_destroyer: { file: 'beerus', targetHeight: 1.78, yawOffset: Math.PI },
  goku_black_rose: { file: 'goku_black', targetHeight: 1.82, yawOffset: Math.PI },
  black_frieza: { file: 'frieza', targetHeight: 1.68, yawOffset: Math.PI },
  orange_piccolo: { file: 'piccolo', targetHeight: 1.96, yawOffset: Math.PI },
  future_trunks: { file: 'trunks', targetHeight: 1.78, yawOffset: Math.PI },

  // One Piece Universe (10)
  luffy_gear5: { file: 'luffy_gear5', targetHeight: 1.78, yawOffset: 0 },
  zoro_king_of_hell: { file: 'zoro', targetHeight: 1.81, yawOffset: Math.PI },
  shanks_yonko: { file: 'shanks', targetHeight: 1.85, yawOffset: Math.PI },
  whitebeard: { file: 'whitebeard', targetHeight: 2.15, yawOffset: Math.PI },
  kaido_dragon: { file: 'kaido', targetHeight: 2.22, yawOffset: Math.PI },
  trafalgar_law: { file: 'law', targetHeight: 1.82, yawOffset: Math.PI },
  dracule_mihawk: { file: 'mihawk', targetHeight: 1.86, yawOffset: Math.PI },
  sanji_ifrit: { file: 'sanji', targetHeight: 1.80, yawOffset: Math.PI },
  portgas_d_ace: { file: 'ace', targetHeight: 1.81, yawOffset: Math.PI },
  sabo_flame: { file: 'sabo', targetHeight: 1.81, yawOffset: Math.PI },

  // Mythic RPG Classes (6)
  class_dragon_knight: { file: 'knight_armor', targetHeight: 1.85, yawOffset: 0 },
  class_astral_archmage: { file: 'archmage', targetHeight: 1.78, yawOffset: Math.PI },
  class_shadow_assassin: { file: 'ninja_assassin', targetHeight: 1.78, yawOffset: Math.PI },
  class_holy_paladin: { file: 'paladin_gold', targetHeight: 1.86, yawOffset: Math.PI },
  class_void_reaper: { file: 'void_reaper', targetHeight: 1.86, yawOffset: Math.PI },
  class_storm_ranger: { file: 'elf_archer', targetHeight: 1.76, yawOffset: Math.PI },

  // Core Tensura Characters (50) — Zero chibi samurai_oni! Distinct authentic anime models!
  rimuru: { file: 'rimuru', targetHeight: 1.76, yawOffset: Math.PI },
  ciel: { file: 'rimuru', targetHeight: 1.76, yawOffset: Math.PI, tintHex: 0xe0f2fe },
  shion: { file: 'shion', targetHeight: 1.78, yawOffset: Math.PI },
  benimaru: { file: 'benimaru', targetHeight: 1.82, yawOffset: Math.PI },
  hakurou: { file: 'shunsui', targetHeight: 1.78, yawOffset: Math.PI },
  souei: { file: 'obito', targetHeight: 1.80, yawOffset: Math.PI, tintHex: 0x3b82f6 },
  gobta: { file: 'goblin_warrior', targetHeight: 1.48, yawOffset: Math.PI },
  ranga: { file: 'komamura', targetHeight: 1.98, yawOffset: Math.PI },
  carrion: { file: 'komamura', targetHeight: 1.96, yawOffset: Math.PI, tintHex: 0xfacc15 },
  hinata: { file: 'hinata_hyuga', targetHeight: 1.74, yawOffset: Math.PI },
  luminous: { file: 'vampire_queen', targetHeight: 1.74, yawOffset: Math.PI },
  milim: { file: 'archmage', targetHeight: 1.66, yawOffset: Math.PI, tintHex: 0xf472b6 },
  testarossa: { file: 'vampire_queen', targetHeight: 1.76, yawOffset: Math.PI, tintHex: 0xf8fafc },
  ultima: { file: 'vampire_queen', targetHeight: 1.68, yawOffset: Math.PI, tintHex: 0xa855f7 },
  carrera: { file: 'elf_archer', targetHeight: 1.74, yawOffset: Math.PI, tintHex: 0xfacc15 },
  chloe: { file: 'rukia', targetHeight: 1.72, yawOffset: Math.PI },
  shuna: { file: 'hinata_hyuga', targetHeight: 1.70, yawOffset: Math.PI, tintHex: 0xfbcfe8 },
  treyni: { file: 'elf_archer', targetHeight: 1.74, yawOffset: Math.PI, tintHex: 0x4ade80 },
  ramiris: { file: 'elf_archer', targetHeight: 1.56, yawOffset: Math.PI, tintHex: 0xf472b6 },
  diablo: { file: 'aizen', targetHeight: 1.83, yawOffset: Math.PI, tintHex: 0x18181b },
  guy: { file: 'shanks', targetHeight: 1.84, yawOffset: Math.PI, tintHex: 0xdc2626 },
  veldanava: { file: 'paladin_gold', targetHeight: 1.88, yawOffset: Math.PI },
  rudra: { file: 'paladin_gold', targetHeight: 1.84, yawOffset: Math.PI },
  michael: { file: 'paladin_gold', targetHeight: 1.84, yawOffset: Math.PI, tintHex: 0xef4444 },
  leon: { file: 'minato', targetHeight: 1.82, yawOffset: Math.PI, tintHex: 0xfef08a },
  feldway: { file: 'byakuya', targetHeight: 1.82, yawOffset: Math.PI, tintHex: 0xf8fafc },
  veldora: { file: 'gogeta', targetHeight: 1.88, yawOffset: Math.PI, tintHex: 0xfacc15 },
  velzard: { file: 'rukia', targetHeight: 1.76, yawOffset: Math.PI, tintHex: 0xbae6fd },
  velgrynd: { file: 'shion', targetHeight: 1.76, yawOffset: Math.PI, tintHex: 0xef4444 },
  albert: { file: 'knight_armor', targetHeight: 1.84, yawOffset: 0 },
  geld: { file: 'kaido', targetHeight: 1.98, yawOffset: Math.PI, tintHex: 0xd97706 },
  granbell: { file: 'knight_armor', targetHeight: 1.84, yawOffset: 0, tintHex: 0xfef08a },
  adalmann: { file: 'void_reaper', targetHeight: 1.82, yawOffset: Math.PI },
  clayman: { file: 'void_reaper', targetHeight: 1.80, yawOffset: Math.PI, tintHex: 0xa855f7 },
  jahil: { file: 'archmage', targetHeight: 1.78, yawOffset: Math.PI, tintHex: 0xf97316 }
};

export function resolveCharacterGlbConfig(charId: string, faction?: string): GlbModelConfig {
  const direct = CHARACTER_GLB_CONFIGS[charId];
  if (direct) return direct;
  if (charId.startsWith('mc_')) {
    return { file: 'mc_alex', targetHeight: 1.80, yawOffset: Math.PI, isMinecraftRig: true };
  }
  if (faction === 'dragon') return { file: 'knight_armor', targetHeight: 1.86, yawOffset: 0, tintHex: 0xf59e0b };
  if (faction === 'primordial') return { file: 'void_reaper', targetHeight: 1.82, yawOffset: Math.PI };
  if (faction === 'octagram') return { file: 'paladin_gold', targetHeight: 1.84, yawOffset: Math.PI };
  if (faction === 'tempest') return { file: 'benimaru', targetHeight: 1.80, yawOffset: Math.PI };
  return { file: 'knight_armor', targetHeight: 1.82, yawOffset: 0 };
}

// ============================================================================
// WEAPON / TOOL / SHIELD GLB MOUNTING (FPS + TPS — Canonical +Y Shaft & YZ Blade Plane!)
// ============================================================================
export interface WeaponGlbMountOpts {
  file: string;
  targetLength: number;
  /** Grip anchor fraction from bottom along +Y (0 = bottom pommel, 0.20 = sword/tool grip, 0.5 = shield center) */
  gripAnchorY?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  tintHex?: number;
  tintStrength?: number;
}

export function mountGlbWeaponIntoGroup(
  container: THREE.Group,
  opts: WeaponGlbMountOpts,
  hideFallbackChildren = true
): void {
  container.userData.smooth3d = true;
  loadGlbTemplate(opts.file, false).then((tpl) => {
    if (!tpl || (container as unknown as { userData?: { disposed?: boolean } }).userData?.disposed) return;

    const inst = SkeletonUtils.clone(tpl.scene);
    const rotHolder = new THREE.Group();
    rotHolder.add(inst);

    inst.updateMatrixWorld(true);
    const rawBox = new THREE.Box3().setFromObject(inst);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);

    if (opts.file !== 'wpn_shield') {
      // 1. Stand longest weapon axis cleanly along +Y
      if (rawSize.x > rawSize.y * 1.4 && rawSize.x >= rawSize.z) {
        inst.rotation.z = Math.PI / 2;
      } else if (rawSize.z > rawSize.y * 1.4 && rawSize.z > rawSize.x) {
        inst.rotation.x = -Math.PI / 2;
      }
      inst.updateMatrixWorld(true);
      const midBox = new THREE.Box3().setFromObject(inst);
      const midSize = new THREE.Vector3();
      midBox.getSize(midSize);

      // 2. Align blade width / pickaxe prongs / axe head / bow limbs into YZ forward combat plane (thin flat side along X)!
      if (midSize.x > midSize.z * 1.25) {
        inst.rotation.y += Math.PI / 2;
        inst.updateMatrixWorld(true);
      }

      // 3. Ensure asymmetric blades (scythe, single-bit axe, katana curve, bow limbs) point forward (-Z) rather than backward (+Z)!
      const zBox = new THREE.Box3().setFromObject(inst);
      const zCenter = new THREE.Vector3();
      zBox.getCenter(zCenter);
      if (opts.file === 'wpn_scythe' || opts.file === 'wpn_bow') {
        const spanNegZ = Math.abs(zBox.min.z);
        const spanPosZ = Math.abs(zBox.max.z);
        if (spanPosZ > spanNegZ * 1.25) {
          inst.rotation.y += Math.PI;
          inst.updateMatrixWorld(true);
        }
      }
    } else {
      // Shield: broad shield face in X-Y, thin thickness along Z!
      if (rawSize.x < rawSize.z * 0.55) {
        inst.rotation.y = Math.PI / 2;
      } else if (rawSize.y < rawSize.z * 0.55) {
        inst.rotation.x = Math.PI / 2;
      }
    }

    if (opts.rx) rotHolder.rotation.x = opts.rx;
    if (opts.ry) rotHolder.rotation.y = opts.ry;
    if (opts.rz) rotHolder.rotation.z = opts.rz;

    rotHolder.updateMatrixWorld(true);
    const alignedBox = new THREE.Box3().setFromObject(rotHolder);
    const alignedSize = new THREE.Vector3();
    alignedBox.getSize(alignedSize);

    const maxAxis = Math.max(0.001, alignedSize.x, alignedSize.y, alignedSize.z);
    const s = opts.targetLength / maxAxis;
    rotHolder.scale.setScalar(s);
    rotHolder.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(rotHolder);
    const finalSize = new THREE.Vector3();
    const finalCenter = new THREE.Vector3();
    finalBox.getSize(finalSize);
    finalBox.getCenter(finalCenter);

    const anchorFrac = opts.gripAnchorY ?? 0.20;
    const anchorY = finalBox.min.y + finalSize.y * anchorFrac;

    // Hilt-Slice Centroid Alignment:
    // For swords, scythes, axes, pickaxes, bows & staves, center X/Z strictly on the handle cross-section at `anchorY`
    // rather than `finalCenter` of the curved blade/head so the shaft sits dead-center at (0,0,0) inside the closed palm!
    let gripX = finalCenter.x;
    let gripZ = finalCenter.z;
    if (opts.file !== 'wpn_shield') {
      const findSliceCenter = (bandRatio: number): { x: number; z: number; cnt: number } => {
        const halfBand = Math.max(0.012, finalSize.y * bandRatio);
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        let cnt = 0;
        const vTmp = new THREE.Vector3();
        rotHolder.traverse((o) => {
          if (!(o as THREE.Mesh).isMesh) return;
          const pos = (o as THREE.Mesh).geometry?.attributes?.position as THREE.BufferAttribute | undefined;
          if (!pos) return;
          const matW = o.matrixWorld;
          for (let i = 0; i < pos.count; i++) {
            vTmp.fromBufferAttribute(pos, i).applyMatrix4(matW);
            if (Math.abs(vTmp.y - anchorY) <= halfBand) {
              if (vTmp.x < minX) minX = vTmp.x;
              if (vTmp.x > maxX) maxX = vTmp.x;
              if (vTmp.z < minZ) minZ = vTmp.z;
              if (vTmp.z > maxZ) maxZ = vTmp.z;
              cnt++;
            }
          }
        });
        return { x: (minX + maxX) * 0.5, z: (minZ + maxZ) * 0.5, cnt };
      };

      let slice = findSliceCenter(GLOBAL_RIG_CALIBRATION.hiltSliceBandRatio);
      if (slice.cnt < 4) {
        slice = findSliceCenter(0.14);
      }
      if (slice.cnt >= 3 && Number.isFinite(slice.x) && Number.isFinite(slice.z)) {
        gripX = slice.x;
        gripZ = slice.z;
      }
    }
    rotHolder.position.set(-gripX, -anchorY, -gripZ);

    rotHolder.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.frustumCulled = false;
        if (m.geometry) {
          m.geometry.userData = { ...m.geometry.userData, shared: true };
        }
        const patchMat = (mat: THREE.Material): THREE.Material => {
          const c = mat.clone();
          c.depthTest = true;
          c.depthWrite = true;
          if ((c as THREE.MeshStandardMaterial).isMeshStandardMaterial && opts.tintHex !== undefined) {
            (c as THREE.MeshStandardMaterial).color.lerp(
              new THREE.Color(opts.tintHex),
              opts.tintStrength ?? 0.42
            );
          }
          return c;
        };
        if (Array.isArray(m.material)) m.material = m.material.map(patchMat);
        else if (m.material) m.material = patchMat(m.material);
      }
    });

    if (hideFallbackChildren) {
      for (const ch of container.children) {
        if (!ch.userData?.keepWithGlb) {
          ch.visible = false;
        }
      }
    }
    rotHolder.name = '__glb_weapon__';
    container.add(rotHolder);
  });
}

// Mounts real 5-fingered gloved FPS right forearm (`fp_arm.glb`) into the First-Person Hand group!
export function mountGlbFpArmIntoGroup(
  container: THREE.Group,
  opts: { targetLength?: number; skinTintHex?: number; isGripPose?: boolean } = {}
) {
  void loadGlbTemplate('fp_arm', false).then((tpl) => {
    if (!tpl || !container) return;
    const inst = SkeletonUtils.clone(tpl.scene) as THREE.Group;
    inst.updateMatrixWorld(true);

    // `fp_arm.glb` is an un-mirrored right forearm in glTF A-pose:
    // sleeve cuff sits near (83% X, 96% Y, 20% Z) and 5 gloved fingers sit near (20% X, 18% Y, 76% Z).
    const aBox = new THREE.Box3().setFromObject(inst);
    const aSize = new THREE.Vector3();
    aBox.getSize(aSize);
    const diag = Math.max(0.001, Math.hypot(aSize.x, aSize.y, aSize.z));
    const targetLen = opts.targetLength ?? (opts.isGripPose ? 0.50 : 0.58);
    const s = targetLen / diag;
    inst.scale.setScalar(s);
    inst.updateMatrixWorld(true);

    const fBox = new THREE.Box3().setFromObject(inst);
    const fSize = new THREE.Vector3();
    fBox.getSize(fSize);

    const cuffPt = new THREE.Vector3(
      fBox.min.x + fSize.x * 0.83,
      fBox.min.y + fSize.y * 0.96,
      fBox.min.z + fSize.z * 0.20
    );
    const palmPt = new THREE.Vector3(
      fBox.min.x + fSize.x * 0.20,
      fBox.min.y + fSize.y * 0.18,
      fBox.min.z + fSize.z * 0.76
    );

    // Anchor 5-finger palm right at local origin (0,0,0) of `holder`, then orient cuff -> palm along (-X, +Y, -Z)
    // so the 5 gloved fingers point up-left-forward into view while the sleeve cuff tucks into bottom-right shoulder!
    inst.position.set(-palmPt.x, -palmPt.y, -palmPt.z);

    const rawDir = palmPt.clone().sub(cuffPt).normalize();
    const targetDir = opts.isGripPose
      ? new THREE.Vector3(-0.48, 0.58, -0.66).normalize()
      : new THREE.Vector3(-0.46, 0.64, -0.61).normalize();
    const qAlign = new THREE.Quaternion().setFromUnitVectors(rawDir, targetDir);

    // Align thumb/radial side (+Z in glTF A-pose) upward-inward so thumb sits naturally on top of grip!
    const thumbRaw = new THREE.Vector3(0, 0, 1).applyQuaternion(qAlign);
    thumbRaw.addScaledVector(targetDir, -thumbRaw.dot(targetDir)).normalize();
    const thumbDesired = new THREE.Vector3(-0.32, 0.92, -0.22);
    thumbDesired.addScaledVector(targetDir, -thumbDesired.dot(targetDir)).normalize();
    const qTwist = new THREE.Quaternion().setFromUnitVectors(thumbRaw, thumbDesired);

    const holder = new THREE.Group();
    holder.quaternion.multiplyQuaternions(qTwist, qAlign);
    if (opts.isGripPose) {
      holder.position.set(0.015, -0.02, 0.025);
    } else {
      holder.position.set(-0.045, 0.065, -0.055);
    }
    holder.add(inst);

    holder.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.frustumCulled = false;
        if (m.geometry) m.geometry.userData = { ...m.geometry.userData, shared: true };
        const patch = (mat: THREE.Material) => {
          const c = mat.clone();
          // fpScene clears world depth buffer before rendering, so true hardware Z-buffering gives crisp 5-finger occlusion!
          c.depthTest = true;
          c.depthWrite = true;
          if ((c as THREE.MeshStandardMaterial).isMeshStandardMaterial && opts.skinTintHex !== undefined) {
            (c as THREE.MeshStandardMaterial).color.lerp(new THREE.Color(opts.skinTintHex), 0.18);
          }
          return c;
        };
        if (Array.isArray(m.material)) m.material = m.material.map(patch);
        else if (m.material) m.material = patch(m.material);
      }
    });

    for (const ch of container.children) {
      ch.visible = false;
    }
    holder.name = '__glb_fp_arm__';
    container.add(holder);
  });
}

// ============================================================================
// MOB / BOSS / DRAGON / NPC GLB CONFIGS (Zero samurai_oni!)
// ============================================================================
export const MOB_GLB_CONFIGS: Record<string, GlbModelConfig> = {
  fire_dragon: { file: 'mob_dragon', targetHeight: 4.4, targetSpan: 7.8, yawOffset: Math.PI, tintHex: 0xef4444 },
  ice_dragon: { file: 'mob_holy_dragon', targetHeight: 4.2, targetSpan: 7.5, yawOffset: Math.PI, tintHex: 0x38bdf8 },
  storm_dragon: { file: 'mob_holy_dragon', targetHeight: 4.4, targetSpan: 7.8, yawOffset: Math.PI, tintHex: 0xfacc15 },
  oni_warlord: { file: 'kaido', targetHeight: 2.35, yawOffset: Math.PI, tintHex: 0xdc2626 },
  hollow_menos: { file: 'void_reaper', targetHeight: 2.95, yawOffset: Math.PI },
  rogue_shinobi: { file: 'ninja_assassin', targetHeight: 1.82, yawOffset: Math.PI },
  villager: { file: 'mob_villager', targetHeight: 1.78, yawOffset: Math.PI },
  wandering_trader: { file: 'archmage', targetHeight: 1.78, yawOffset: Math.PI, tintHex: 0x2563eb },
  pillager: { file: 'knight_armor', targetHeight: 1.82, yawOffset: 0, tintHex: 0x475569 },
  vindicator: { file: 'goblin_warrior', targetHeight: 1.84, yawOffset: Math.PI },
  evoker: { file: 'archmage', targetHeight: 1.82, yawOffset: Math.PI, tintHex: 0xfacc15 },
  witch: { file: 'archmage', targetHeight: 1.78, yawOffset: Math.PI, tintHex: 0x9333ea },
  skeleton: { file: 'mob_skeleton', targetHeight: 1.82, yawOffset: Math.PI },
  stray: { file: 'mob_skeleton', targetHeight: 1.82, yawOffset: Math.PI, tintHex: 0x7dd3fc },
  bogged: { file: 'mob_skeleton', targetHeight: 1.82, yawOffset: Math.PI, tintHex: 0x4ade80 },
  wither_skeleton: { file: 'mob_skeleton', targetHeight: 2.18, yawOffset: Math.PI, tintHex: 0x18181b },
  zombie: { file: 'mob_zombie', targetHeight: 1.80, yawOffset: Math.PI },
  husk: { file: 'mob_zombie', targetHeight: 1.82, yawOffset: Math.PI, tintHex: 0xd97706 },
  drowned: { file: 'mob_zombie', targetHeight: 1.80, yawOffset: Math.PI, tintHex: 0x2dd4bf },
  wolf: { file: 'mob_wolf', targetHeight: 0.90, targetSpan: 1.25, yawOffset: Math.PI },
  iron_golem: { file: 'mob_golem', targetHeight: 2.65, yawOffset: Math.PI },
  warden: { file: 'mc_warden', targetHeight: 2.90, yawOffset: Math.PI }
};

// ============================================================================
// AUTHENTIC CHARACTER 1ST-PERSON SKINNED ARM & 5-FINGER HAND EXTRACTOR
// Extracts the active character's REAL 3D right sleeve, forearm, wrist & 5-fingered hand
// directly from their .glb SkinnedMesh so 1st-person matches 3rd-person 1:1!
// ============================================================================
export interface CharacterFpArmPoseOpts {
  hasItem: boolean;
  gripCurl: number;
  fingerMode?: FingerPoseMode;
  reachPitch?: number;
  reachYaw?: number;
  elbowFlex?: number;
  wristTwist?: number;
}

export interface CharacterFpArmHandle {
  root: THREE.Group;
  /** Anatomical palmar fist-tunnel socket inside `poseOffsetGroup` so held axes/swords NEVER pierce dorsal hand! */
  gripSocket: THREE.Group;
  charId: string;
  setPose: (opts: CharacterFpArmPoseOpts) => void;
  dispose: () => void;
}

function pointToSegmentDistSq(
  p: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3
): { distSq: number; t: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const lenSq = abx * abx + aby * aby + abz * abz;
  if (lenSq < 1e-8) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    const dz = p.z - a.z;
    return { distSq: dx * dx + dy * dy + dz * dz, t: 0 };
  }
  const t = THREE.MathUtils.clamp(
    ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / lenSq,
    0,
    1
  );
  const cx = a.x + abx * t - p.x;
  const cy = a.y + aby * t - p.y;
  const cz = a.z + abz * t - p.z;
  return { distSq: cx * cx + cy * cy + cz * cz, t };
}

export async function buildCharacterFirstPersonArmRig(
  charId: string,
  faction?: string
): Promise<CharacterFpArmHandle | null> {
  const cfg = resolveCharacterGlbConfig(charId, faction);
  if (cfg.isMinecraftRig) return null;

  const tpl = await loadGlbTemplate(cfg.file, cfg.stripPedestal ?? true);
  if (!tpl) return null;

  const rig = new GlbAnimatedRig(tpl, cfg);
  const refs = rig.getFpExtractorRefs();
  const { bones, restStates, rightFingerChains, rightCalibratedFingers, fingerRestQuats, bakedWeaponNodes, handVariantMeshes } = refs;

  if (!bones.armR && !bones.foreArmR && !bones.handR) {
    rig.dispose();
    return null;
  }

  // Detect artist-authored weapon socket bone under `handR` BEFORE scaling baked weapons down!
  rig.wrapper.updateWorldMatrix(true, true);
  const invWrapperPre = rig.wrapper.matrixWorld.clone().invert();
  const invWrapperQuatPre = rig.wrapper.getWorldQuaternion(new THREE.Quaternion()).invert();
  const H = Math.max(0.5, cfg.targetHeight || 1.78);
  let authoredWpnWrap: THREE.Vector3 | null = null;
  if (bones.handR) {
    const wpnBone = bones.handR.children.find(
      (c) => (c as THREE.Bone).isBone && isBakedHandheldWeaponObject(c.name || '') && !/hyotan|gourd/i.test(c.name || '')
    );
    if (wpnBone) {
      const pw = new THREE.Vector3();
      const ph = new THREE.Vector3();
      wpnBone.getWorldPosition(pw);
      bones.handR.getWorldPosition(ph);
      pw.applyMatrix4(invWrapperPre);
      ph.applyMatrix4(invWrapperPre);
      if (pw.distanceTo(ph) < 0.13 * H) {
        authoredWpnWrap = pw;
      }
    }
  }

  // 1. Hide baked weapons & remove left-hand variant meshes; temporarily enable all right-hand variants for geometry filtering
  for (const bw of bakedWeaponNodes) {
    if (bw.isBone) bw.obj.scale.setScalar(0.0001);
    else bw.obj.visible = false;
  }
  for (const lm of [
    ...handVariantMeshes.leftOpen,
    ...handVariantMeshes.leftClose,
    ...handVariantMeshes.leftHold
  ]) {
    lm.visible = false;
    lm.parent?.remove(lm);
  }
  for (const rm of [
    ...handVariantMeshes.rightOpen,
    ...handVariantMeshes.rightClose,
    ...handVariantMeshes.rightHold
  ]) {
    rm.visible = true;
  }

  rig.wrapper.updateWorldMatrix(true, true);
  const invWrapper = rig.wrapper.matrixWorld.clone().invert();

  const inWrapper = (obj: THREE.Object3D): THREE.Vector3 => {
    const v = new THREE.Vector3();
    obj.getWorldPosition(v);
    return v.applyMatrix4(invWrapper);
  };

  const pShoulder = bones.armR ? inWrapper(bones.armR) : new THREE.Vector3(0.16 * H, 0.78 * H, 0);
  const pWrist = bones.handR
    ? inWrapper(bones.handR)
    : bones.foreArmR
      ? inWrapper(bones.foreArmR).add(new THREE.Vector3(0.03 * H, -0.13 * H, -0.04 * H))
      : pShoulder.clone().add(new THREE.Vector3(0.06 * H, -0.30 * H, -0.05 * H));
  const pElbow = bones.foreArmR
    ? inWrapper(bones.foreArmR)
    : pShoulder.clone().lerp(pWrist, 0.52);

  const rawForearmDir = pWrist.clone().sub(pElbow);
  if (rawForearmDir.lengthSq() < 1e-6) rawForearmDir.set(0.12, -0.92, -0.36);
  rawForearmDir.normalize();

  // Compute exact palm / fist-tunnel center from authored weapon socket or proximal finger knuckles
  const pPalm = pWrist.clone().addScaledVector(rawForearmDir, 0.044 * (H / 1.78));
  if (authoredWpnWrap) {
    pPalm.copy(authoredWpnWrap);
  } else if (rightFingerChains) {
    const knuckles = [
      rightFingerChains.index[0],
      rightFingerChains.middle[0],
      rightFingerChains.ring[0],
      rightFingerChains.pinky[0]
    ].filter(Boolean) as THREE.Bone[];
    if (knuckles.length >= 2) {
      const sum = new THREE.Vector3();
      for (const k of knuckles) sum.add(inWrapper(k));
      sum.divideScalar(knuckles.length);
      pPalm.lerp(sum, 0.72);
    }
  }
  const isAutoRig = Boolean(bones.handR?.name?.startsWith('Auto_'));
  const pFingerTipExt = pPalm.clone().addScaledVector(rawForearmDir, (isAutoRig ? 0.068 : 0.145) * H);

  // Detect radial (pinky -> thumb) vector in wrapper space with 100% anatomical accuracy across fingered & swap-hand rigs!
  let vRadial = new THREE.Vector3(-0.14, 0.24, -0.96);
  if (rightCalibratedFingers && bones.handR) {
    const qHandWrap = invWrapperQuatPre.clone().multiply(bones.handR.getWorldQuaternion(new THREE.Quaternion()));
    vRadial = rightCalibratedFingers.thumbSideLocal.clone().applyQuaternion(qHandWrap).normalize();
  } else if (bones.handR && /^rhand_palm/i.test(bones.handR.name || '')) {
    // One Piece Bounty Rush RHand_Palm rigs: local -X = distal, local -Y = palmar, local +Z = thumb!
    const qHandWrap = invWrapperQuatPre.clone().multiply(bones.handR.getWorldQuaternion(new THREE.Quaternion()));
    vRadial = new THREE.Vector3(0, 0, 1).applyQuaternion(qHandWrap).normalize();
  } else if (rightFingerChains && rightFingerChains.thumb.length > 0 && rightFingerChains.pinky.length > 0) {
    const pThumb = inWrapper(rightFingerChains.thumb[0]);
    const pPinky = inWrapper(rightFingerChains.pinky[0]);
    const diff = pThumb.sub(pPinky);
    if (diff.lengthSq() > 1e-6) {
      vRadial = diff.normalize();
    }
  }

  // Collect strictly right-arm bone subtree + direct sibling twist helpers (NEVER leg/pelvis/torso bones!)
  const armSubtreeBones = new Set<THREE.Object3D>();
  const markArmTree = (rootBone?: THREE.Bone) => {
    if (!rootBone) return;
    rootBone.traverse((b) => {
      if ((b as THREE.Bone).isBone && !hasCoatOrAccessoryAncestor(b) && !isBakedHandheldWeaponObject(b.name || '')) {
        armSubtreeBones.add(b);
      }
    });
    if (rootBone.parent) {
      for (const sib of rootBone.parent.children) {
        if (
          (sib as THREE.Bone).isBone &&
          sib !== rootBone &&
          !hasCoatOrAccessoryAncestor(sib) &&
          !isBakedHandheldWeaponObject(sib.name || '') &&
          /twist|roll|sup|gd_uparm|gd_lowarm|gp_uparm|gp_lowarm|sleeve|cuff|forearm|upperarm/i.test(sib.name || '') &&
          !/left|(?:^|[_.\-\s:])l(?:[_.\-\s\d]|$)/i.test(sib.name || '')
        ) {
          armSubtreeBones.add(sib);
        }
      }
    }
  };
  markArmTree(bones.armR);
  markArmTree(bones.foreArmR);
  markArmTree(bones.handR);

  // 2. Filter all meshes inside rig.modelRoot using TRUE GPU-skinned posed positions (`sm.applyBoneTransform`)
  //    so ONLY the character's genuine right sleeve, forearm, wrist & 5 fingers remain on T-pose, A-pose & auto-rigged models!
  rig.wrapper.updateWorldMatrix(true, true);
  const allMeshes: THREE.Mesh[] = [];
  rig.modelRoot.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) allMeshes.push(o as THREE.Mesh);
  });

  let keptTrianglesTotal = 0;
  const vTmp = new THREE.Vector3();
  for (const mesh of allMeshes) {
    const nm = (mesh.name || '').toLowerCase();
    const isRightHandVariant = /(?:^|_)r_?(?:hand|glove)_(?:open|close|fist|hold|par)/i.test(nm);
    if (
      (!mesh.visible && !isRightHandVariant) ||
      isBakedHandheldWeaponObject(nm) ||
      /(?:^|[_.\-\s])(?:l_hand|l_glove|left_hand|geo_l_hand|cape_pl_|coat_pl_|cort|outline)(?:[_.\-\s\d]|$)/i.test(
        nm
      )
    ) {
      mesh.visible = false;
      mesh.parent?.remove(mesh);
      continue;
    }

    const sm = mesh as THREE.SkinnedMesh;
    const origGeo = mesh.geometry;
    const posAttr = origGeo?.attributes?.position as THREE.BufferAttribute | undefined;
    if (!sm.isSkinnedMesh || !sm.skeleton || !posAttr) {
      mesh.visible = false;
      mesh.parent?.remove(mesh);
      continue;
    }

    sm.skeleton.update();

    const validBoneIdx = new Set<number>();
    const skBones = sm.skeleton.bones;
    for (let bi = 0; bi < skBones.length; bi++) {
      const b = skBones[bi];
      if (b && armSubtreeBones.has(b)) {
        validBoneIdx.add(bi);
      }
    }

    if (validBoneIdx.size === 0) {
      mesh.visible = false;
      mesh.parent?.remove(mesh);
      continue;
    }

    const skinIdx = origGeo.attributes.skinIndex as THREE.BufferAttribute | undefined;
    const skinWgt = origGeo.attributes.skinWeight as THREE.BufferAttribute | undefined;
    if (!skinIdx || !skinWgt) {
      mesh.visible = false;
      mesh.parent?.remove(mesh);
      continue;
    }

    const toWrap = invWrapper.clone().multiply(sm.matrixWorld);
    const vCount = posAttr.count;
    const keepVert = new Uint8Array(vCount);
    let keptVerts = 0;
    const minRw = isRightHandVariant ? 0.20 : isAutoRig ? 0.22 : 0.40;

    for (let i = 0; i < vCount; i++) {
      let rw = 0;
      const i0 = skinIdx.getX(i);
      const i1 = skinIdx.getY(i);
      const i2 = skinIdx.getZ(i);
      const i3 = skinIdx.getW(i);
      if (validBoneIdx.has(i0)) rw += skinWgt.getX(i);
      if (validBoneIdx.has(i1)) rw += skinWgt.getY(i);
      if (validBoneIdx.has(i2)) rw += skinWgt.getZ(i);
      if (validBoneIdx.has(i3)) rw += skinWgt.getW(i);
      if (rw < minRw) continue;

      if (!isRightHandVariant) {
        // Transform bind-pose vertex through posed skeleton (`applyBoneTransform`) into current `rig.wrapper` space!
        vTmp.fromBufferAttribute(posAttr, i);
        sm.applyBoneTransform(i, vTmp);
        vTmp.applyMatrix4(toWrap);

        if (isAutoRig && vTmp.z > pElbow.z + 0.065 * H) continue;
        const sUpper = pointToSegmentDistSq(vTmp, pShoulder, pElbow);
        const sLower = pointToSegmentDistSq(vTmp, pElbow, pFingerTipExt);
        const rUpper = (isAutoRig ? 0.125 - 0.022 * sUpper.t : 0.28 - 0.04 * sUpper.t) * H;
        const rLower = (isAutoRig ? 0.098 - 0.025 * sLower.t : 0.22 - 0.05 * sLower.t) * H;
        if (sUpper.distSq > rUpper * rUpper && sLower.distSq > rLower * rLower) continue;

        const uArc = sLower.distSq <= sUpper.distSq ? 0.5 + sLower.t * 0.5 : sUpper.t * 0.5;
        if (uArc < (isAutoRig ? 0.10 : 0.12)) continue;
      }

      keepVert[i] = 1;
      keptVerts++;
    }

    if (keptVerts < 3) {
      mesh.visible = false;
      mesh.parent?.remove(mesh);
      continue;
    }

    const geo = origGeo.clone();
    geo.userData = { ...geo.userData, shared: false };
    refs.clonedGeometries.push(geo);

    const srcIndex = geo.index;
    const totalIndices = srcIndex ? srcIndex.count : Math.floor(vCount / 3) * 3;
    const getIdx = srcIndex ? (k: number) => srcIndex.getX(k) : (k: number) => k;

    const srcGroups =
      geo.groups && geo.groups.length > 0
        ? geo.groups.map((g) => ({ start: g.start, count: g.count, materialIndex: g.materialIndex ?? 0 }))
        : [{ start: 0, count: totalIndices, materialIndex: 0 }];

    const outIndices: number[] = [];
    geo.clearGroups();

    for (const grp of srcGroups) {
      const newStart = outIndices.length;
      const end = Math.min(totalIndices, grp.start + grp.count);
      for (let k = grp.start; k + 2 < end; k += 3) {
        const a = getIdx(k);
        const b = getIdx(k + 1);
        const c = getIdx(k + 2);
        if (keepVert[a] && keepVert[b] && keepVert[c]) {
          outIndices.push(a, b, c);
        }
      }
      const newCount = outIndices.length - newStart;
      if (newCount > 0) {
        geo.addGroup(newStart, newCount, grp.materialIndex);
      }
    }

    if (outIndices.length < 3) {
      mesh.visible = false;
      mesh.parent?.remove(mesh);
      continue;
    }

    keptTrianglesTotal += outIndices.length / 3;
    const IndexCtor = vCount > 65535 ? THREE.Uint32BufferAttribute : THREE.Uint16BufferAttribute;
    geo.setIndex(new IndexCtor(outIndices, 1));
    sm.geometry = geo;
    sm.frustumCulled = false;

    const patchFpMat = (mat: THREE.Material) => {
      mat.depthTest = true;
      mat.depthWrite = true;
      mat.side = THREE.DoubleSide;
    };
    if (Array.isArray(sm.material)) sm.material.forEach(patchFpMat);
    else if (sm.material) patchFpMat(sm.material);
  }

  if (keptTrianglesTotal < 4) {
    rig.dispose();
    return null;
  }

  // 3. Normalize 1st-person arm scale & anchor right palm at (0,0,0) pointing naturally forward-up-left into FPS camera view!
  const fpScale = 1.38 * (1.78 / H);
  rig.wrapper.scale.setScalar(fpScale);
  rig.wrapper.position.set(-pPalm.x * fpScale, -pPalm.y * fpScale, -pPalm.z * fpScale);

  const targetForearmDir = new THREE.Vector3(-0.36, 0.28, -0.89).normalize();
  const qAlign = new THREE.Quaternion().setFromUnitVectors(rawForearmDir, targetForearmDir);

  const radialAligned = vRadial.clone().applyQuaternion(qAlign);
  radialAligned.addScaledVector(targetForearmDir, -radialAligned.dot(targetForearmDir));
  if (radialAligned.lengthSq() < 1e-6) radialAligned.set(0, 1, 0);
  radialAligned.normalize();

  const desiredThumbUp = new THREE.Vector3(-0.12, 0.98, 0.14);
  desiredThumbUp.addScaledVector(targetForearmDir, -desiredThumbUp.dot(targetForearmDir)).normalize();
  const qTwist = new THREE.Quaternion().setFromUnitVectors(radialAligned, desiredThumbUp);

  // Anatomical palmar fist-tunnel basis in `alignHolder` space:
  // `vPalmAligned` points OUT of the inner palm (-X left), `shaftY` runs cleanly from pinky-bottom through thumb-top!
  const vPalmAligned = new THREE.Vector3().crossVectors(desiredThumbUp, targetForearmDir).normalize();
  const shaftY = desiredThumbUp
    .clone()
    .multiplyScalar(0.92)
    .addScaledVector(targetForearmDir, 0.38)
    .normalize();
  const edgeForward = new THREE.Vector3(-0.36, 0.06, -0.93);
  edgeForward.addScaledVector(shaftY, -edgeForward.dot(shaftY)).normalize();
  const gripBasisZ = edgeForward.clone().negate();
  const gripBasisX = new THREE.Vector3().crossVectors(shaftY, gripBasisZ).normalize();
  const gripBaseQuat = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(gripBasisX, shaftY, gripBasisZ)
  );
  const gripBasePos = authoredWpnWrap
    ? vPalmAligned.clone().multiplyScalar(0.012).addScaledVector(targetForearmDir, 0.008)
    : vPalmAligned
        .clone()
        .multiplyScalar(0.046)
        .addScaledVector(targetForearmDir, 0.018)
        .addScaledVector(desiredThumbUp, -0.006);

  const alignHolder = new THREE.Group();
  alignHolder.quaternion.multiplyQuaternions(qTwist, qAlign);
  alignHolder.add(rig.wrapper);

  const gripSocket = new THREE.Group();
  gripSocket.name = `__char_fp_grip_${charId}__`;
  gripSocket.position.copy(gripBasePos);
  gripSocket.quaternion.copy(gripBaseQuat);

  const poseOffsetGroup = new THREE.Group();
  poseOffsetGroup.add(alignHolder, gripSocket);

  const root = new THREE.Group();
  root.name = `__char_fp_arm_${charId}__`;
  root.add(poseOffsetGroup);

  const applyBoneAngle = (key: keyof HumanoidBoneMap, pitch: number, yaw = 0, roll = 0) => {
    const st = restStates.get(key);
    if (!st) return;
    st.bone.quaternion.copy(st.restQuat);
    if (Math.abs(pitch) > 1e-4) {
      st.bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(st.pitchAxisLocal, pitch));
    }
    if (Math.abs(yaw) > 1e-4) {
      st.bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(st.yawAxisLocal, yaw));
    }
    if (Math.abs(roll) > 1e-4) {
      st.bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(st.rollAxisLocal, roll));
    }
  };

  alignHolder.updateWorldMatrix(true, true);
  const invAlignRest = alignHolder.matrixWorld.clone().invert();
  const invAlignRestQuat = alignHolder.getWorldQuaternion(new THREE.Quaternion()).invert();
  const restHandInAlign = new THREE.Vector3();
  const restHandQuatInAlign = new THREE.Quaternion();
  if (bones.handR) {
    bones.handR.getWorldPosition(restHandInAlign);
    restHandInAlign.applyMatrix4(invAlignRest);
    bones.handR.getWorldQuaternion(restHandQuatInAlign);
    restHandQuatInAlign.premultiply(invAlignRestQuat);
  }
  const curHandInAlign = new THREE.Vector3();
  const curHandQuatInAlign = new THREE.Quaternion();
  const deltaHandQuat = new THREE.Quaternion();
  const invAlignCur = new THREE.Matrix4();
  const invAlignCurQuat = new THREE.Quaternion();

  const setPose = (opts: CharacterFpArmPoseOpts) => {
    const curl = THREE.MathUtils.clamp(opts.gripCurl, -0.25, 1.15);
    const fMode: FingerPoseMode = opts.hasItem ? 'grip' : (opts.fingerMode ?? 'auto');
    const reachP = opts.reachPitch ?? 0;
    const reachY = opts.reachYaw ?? 0;
    const elbowF = opts.elbowFlex ?? 0;
    const wristT = opts.wristTwist ?? 0;

    applyBoneAngle('armR', reachP * 0.32, reachY * 0.28, 0);
    applyBoneAngle('foreArmR', elbowF + reachP * 0.45, reachY * 0.35, 0);
    applyBoneAngle('handR', (opts.hasItem ? 0.04 : -0.04) + reachP * 0.22, reachY * 0.25, wristT);

    if (rightCalibratedFingers) {
      applyCalibratedFingerPose(rightCalibratedFingers, curl, fMode);
    } else if (rightFingerChains) {
      applyClosedGripFingerCurl(rightFingerChains, fingerRestQuats, curl);
    }
    rig.syncHandVariantMeshes(curl > 0.55, opts.hasItem, false, false);

    if (opts.hasItem) {
      poseOffsetGroup.position.set(isAutoRig ? 0.022 : 0.012, isAutoRig ? 0.056 : 0.002, isAutoRig ? 0.032 : 0.018);
      poseOffsetGroup.rotation.set(0.02, -0.02, 0.02);
    } else {
      poseOffsetGroup.position.set(-0.068, isAutoRig ? 0.135 : 0.088, -0.042);
      poseOffsetGroup.rotation.set(0.04, 0.06, -0.04);
    }

    // Track `gripSocket` with any live `[C]` / `[G]` bone displacement & rotation so weapons never drift out of the closed fist!
    if (bones.handR && (Math.abs(reachP) > 0.002 || Math.abs(reachY) > 0.002 || Math.abs(elbowF) > 0.002 || Math.abs(wristT) > 0.002)) {
      alignHolder.updateWorldMatrix(true, true);
      invAlignCur.copy(alignHolder.matrixWorld).invert();
      alignHolder.getWorldQuaternion(invAlignCurQuat).invert();
      bones.handR.getWorldPosition(curHandInAlign);
      curHandInAlign.applyMatrix4(invAlignCur);
      bones.handR.getWorldQuaternion(curHandQuatInAlign);
      curHandQuatInAlign.premultiply(invAlignCurQuat);
      deltaHandQuat.copy(curHandQuatInAlign).multiply(restHandQuatInAlign.clone().invert());
      gripSocket.position.copy(gripBasePos).add(curHandInAlign).sub(restHandInAlign);
      gripSocket.quaternion.multiplyQuaternions(deltaHandQuat, gripBaseQuat);
    } else {
      gripSocket.position.copy(gripBasePos);
      gripSocket.quaternion.copy(gripBaseQuat);
    }
  };

  setPose({ hasItem: false, gripCurl: 0.24 });

  return {
    root,
    gripSocket,
    charId,
    setPose,
    dispose: () => rig.dispose()
  };
}
