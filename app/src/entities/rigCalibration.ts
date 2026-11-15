// Global Humanoid Rig Calibration, Bone Standardization, Finger Grip Curl & Equipment Socket Alignment
// Standardizes Mixamo, Rigify (dot-stripped), VRM/Unity, Unreal, Anime Mobile (Bip001/cha_), and Blockbench/Bedrock rigs.

import * as THREE from 'three';

export interface SocketTransformConfig {
  /** Local translation offset in meters relative to calibrated bone socket */
  translation: [number, number, number];
  /** Local XYZ Euler rotation in degrees */
  rotationDeg: [number, number, number];
  /** Uniform scale multiplier */
  scale: number;
}

export interface IdleCombatStanceAngles {
  /** Shoulder / Upper-arm pitch (X), twist (Y), abduction/drop (Z) in radians */
  right_arm: [number, number, number];
  left_arm: [number, number, number];
  /** Forearm / Elbow flexion in radians */
  right_forearm: [number, number, number];
  left_forearm: [number, number, number];
  /** Upper-leg / Hip stance pitch (X), yaw (Y), splay normalization (Z) in radians */
  right_leg: [number, number, number];
  left_leg: [number, number, number];
  /** Knee / Shin subtle warrior weight flexion in radians */
  right_shin: [number, number, number];
  left_shin: [number, number, number];
}

export interface FingerChainBones {
  thumb: THREE.Bone[];
  index: THREE.Bone[];
  middle: THREE.Bone[];
  ring: THREE.Bone[];
  pinky: THREE.Bone[];
}

export interface GlobalRigCalibrationProfile {
  idleCombatStance: IdleCombatStanceAngles;
  rightHandWeapon: SocketTransformConfig;
  leftHandShield: SocketTransformConfig;
  /** Half-thickness ratio around gripAnchorRatio used to center handle/hilt cross-section at (0,0,0) */
  hiltSliceBandRatio: number;
  /** Maximum natural ankle X spread as fraction of character height before inward thigh adduction */
  maxNaturalLegSpreadRatio: number;
  /** Closed-fist finger flexion angles (proximal, intermediate, distal) in radians when gripping a weapon */
  closedGripCurlRad: {
    thumb: [number, number, number];
    fingers: [number, number, number];
  };
}

export const GLOBAL_RIG_CALIBRATION: GlobalRigCalibrationProfile = {
  idleCombatStance: {
    right_arm: [0.16, -0.06, -0.18],
    left_arm: [0.14, 0.06, 0.18],
    right_forearm: [0.34, 0.0, -0.08],
    left_forearm: [0.28, 0.0, 0.08],
    right_leg: [-0.05, -0.04, 0.03],
    left_leg: [0.05, 0.04, -0.03],
    right_shin: [0.09, 0.0, 0.0],
    left_shin: [0.09, 0.0, 0.0]
  },
  rightHandWeapon: {
    // Hilt sits inside closed palm center (0.38 along wrist->knuckles), blade forward (-Z) & upward (+Y)
    translation: [0.0, 0.015, -0.012],
    rotationDeg: [-72, 0, 0],
    scale: 1.0
  },
  leftHandShield: {
    // Anchored 20% from wrist toward elbow along left forearm, pushed +0.092m outward along dorsal normal
    // so fingers and knuckles stay 100% behind the inner shield strap with zero front-face clipping
    translation: [-0.092, 0.02, 0.035],
    rotationDeg: [0, 86, 6],
    scale: 0.96
  },
  hiltSliceBandRatio: 0.065,
  maxNaturalLegSpreadRatio: 0.27,
  closedGripCurlRad: {
    thumb: [0.48, 0.56, 0.42],
    fingers: [1.18, 1.28, 0.95]
  }
};

/**
 * Standardized cross-pipeline bone naming map (Blockbench / GeckoLib / Mixamo / Rigify / VRM / Unreal / Bip001).
 */
export const STANDARD_BONE_NAMING_GUIDE = {
  root: ['root', 'Armature', 'Hips', 'pelvis', 'Bip001 Pelvis', 'DEF-spine'],
  spine: ['body', 'waist', 'spine', 'Spine1', 'chest', 'UpperChest', 'DEF-spine002', 'Bip001 Spine1'],
  head: ['head', 'Head', 'DEF-spine006', 'Bip001 Head'],
  right_arm: ['right_arm', 'RightArm', 'RightUpperArm', 'mixamorigRightArm', 'upperarm_r', 'DEF-upper_armR', 'Bip001 R UpperArm'],
  right_forearm: ['right_forearm', 'RightForeArm', 'RightLowerArm', 'mixamorigRightForeArm', 'lowerarm_r', 'DEF-forearmR', 'Bip001 R Forearm'],
  right_hand: ['right_hand', 'RightHand', 'mixamorigRightHand', 'hand_r', 'DEF-handR', 'Bip001 R Hand'],
  left_arm: ['left_arm', 'LeftArm', 'LeftUpperArm', 'mixamorigLeftArm', 'upperarm_l', 'DEF-upper_armL', 'Bip001 L UpperArm'],
  left_forearm: ['left_forearm', 'LeftForeArm', 'LeftLowerArm', 'mixamorigLeftForeArm', 'lowerarm_l', 'DEF-forearmL', 'Bip001 L Forearm'],
  left_hand: ['left_hand', 'LeftHand', 'mixamorigLeftHand', 'hand_l', 'DEF-handL', 'Bip001 L Hand'],
  right_leg: ['right_leg', 'RightUpLeg', 'RightUpperLeg', 'mixamorigRightUpLeg', 'thigh_r', 'DEF-thighR', 'Bip001 R Thigh'],
  right_shin: ['right_shin', 'RightLeg', 'RightLowerLeg', 'mixamorigRightLeg', 'calf_r', 'DEF-shinR', 'Bip001 R Calf'],
  right_foot: ['right_foot', 'RightFoot', 'mixamorigRightFoot', 'foot_r', 'DEF-footR', 'Bip001 R Foot'],
  left_leg: ['left_leg', 'LeftUpLeg', 'LeftUpperLeg', 'mixamorigLeftUpLeg', 'thigh_l', 'DEF-thighL', 'Bip001 L Thigh'],
  left_shin: ['left_shin', 'LeftLeg', 'LeftLowerLeg', 'mixamorigLeftLeg', 'calf_l', 'DEF-shinL', 'Bip001 L Calf'],
  left_foot: ['left_foot', 'LeftFoot', 'mixamorigLeftFoot', 'foot_l', 'DEF-footL', 'Bip001 L Foot']
} as const;

const FINGER_SLOT_REGEX: Array<[keyof FingerChainBones, RegExp]> = [
  ['thumb', /(?:thumb|pollex|oyayubi|親指|fng_a|finger_[lr]_a|(?:\b|_)finger\s*0(?:[0123_.\-\s]|$)|synth_thumb)/i],
  ['index', /(?:index|forefinger|hitosashi|人差|fng_b|finger_[lr]_b|(?:\b|_)finger\s*1(?:[0123_.\-\s]|$)|synth_index)/i],
  ['middle', /(?:middle|nakayubi|中指|fng_c|finger_[lr]_c|(?:\b|_)finger\s*2(?:[0123_.\-\s]|$)|synth_middle)/i],
  ['ring', /(?:ring|kusuri|薬指|fng_d|finger_[lr]_d|(?:\b|_)finger\s*3(?:[0123_.\-\s]|$)|synth_ring)/i],
  ['pinky', /(?:pinky|little|koyubi|小指|fng_e|finger_[lr]_e|(?:\b|_)finger\s*4(?:[0123_.\-\s]|$)|synth_pinky)/i]
];

export type HumanActionPreset =
  | 'none'
  | 'wave'
  | 'point'
  | 'guard'
  | 'cross_arms'
  | 'power_charge'
  | 'meditate'
  | 'victory'
  | 'roll';

export type SkillCastStyle =
  | 'none'
  | 'naruto_hand_seals'
  | 'naruto_rasengan'
  | 'dbz_kamehameha'
  | 'dbz_masenko'
  | 'dbz_final_flash'
  | 'dbz_finger_beam'
  | 'bleach_getsuga'
  | 'bleach_cero'
  | 'onepiece_haki_slash'
  | 'onepiece_gum_punch'
  | 'onepiece_quake'
  | 'onepiece_room'
  | 'onepiece_kick'
  | 'tensura_devour'
  | 'tensura_nova';

export type FingerPoseMode =
  | 'auto'
  | 'grip'
  | 'open'
  | 'jutsu_tiger'
  | 'jutsu_snake'
  | 'jutsu_ram'
  | 'ki_cup'
  | 'point';

export interface CalibratedBoneCurl {
  bone: THREE.Bone;
  restQuat: THREE.Quaternion;
  localCurlAxis: THREE.Vector3;
  preCurlScale: number;
}

export interface CalibratedHandFingers {
  isRightHand: boolean;
  thumb: CalibratedBoneCurl[];
  index: CalibratedBoneCurl[];
  middle: CalibratedBoneCurl[];
  ring: CalibratedBoneCurl[];
  pinky: CalibratedBoneCurl[];
  /** Unit vector in handBone local space pointing out of the inner palm */
  palmNormalLocal: THREE.Vector3;
  /** Unit vector in handBone local space pointing toward the thumb (radial) side */
  thumbSideLocal: THREE.Vector3;
  /** Unit vector in handBone local space pointing from wrist toward knuckles/fingertips */
  extendDirLocal: THREE.Vector3;
  /** Center of proximal knuckles in handBone local space */
  knuckleCenterLocal: THREE.Vector3;
}

export interface DirectBonePoseState {
  liveArmActive: boolean;
  liveArmLeftActive: boolean;
  manualOverrideActive: boolean;
  reachYawR: number;
  reachPitchR: number;
  elbowBendR: number;
  wristTwistR: number;
  fingerCurlR: number;
  reachYawL: number;
  reachPitchL: number;
  elbowBendL: number;
  wristTwistL: number;
  fingerCurlL: number;
  spineLean: number;
  spineTwist: number;
  headPitchOffset: number;
  headYawOffset: number;
  legRStride: number;
  kneeRBend: number;
  legLStride: number;
  kneeLBend: number;
  emote: HumanActionPreset;
  emoteClock: number;
  dodgeRollTimer: number;
  dodgeRollDirX: number;
  dodgeRollDirZ: number;
  comboStage: 0 | 1 | 2;
  strafeRatio: number;
  verticalVel: number;
  onGround: boolean;
  landingCompress: number;
  skillCastStyle: SkillCastStyle;
  skillCastTimer: number;
  skillCastDuration: number;
}

export function createDefaultBonePoseState(): DirectBonePoseState {
  return {
    liveArmActive: false,
    liveArmLeftActive: false,
    manualOverrideActive: false,
    reachYawR: 0,
    reachPitchR: 0,
    elbowBendR: 0,
    wristTwistR: 0,
    fingerCurlR: -1,
    reachYawL: 0,
    reachPitchL: 0,
    elbowBendL: 0,
    wristTwistL: 0,
    fingerCurlL: -1,
    spineLean: 0,
    spineTwist: 0,
    headPitchOffset: 0,
    headYawOffset: 0,
    legRStride: 0,
    kneeRBend: 0,
    legLStride: 0,
    kneeLBend: 0,
    emote: 'none',
    emoteClock: 0,
    dodgeRollTimer: 0,
    dodgeRollDirX: 0,
    dodgeRollDirZ: -1,
    comboStage: 0,
    strafeRatio: 0,
    verticalVel: 0,
    onGround: true,
    landingCompress: 0,
    skillCastStyle: 'none',
    skillCastTimer: 0,
    skillCastDuration: 0.68
  };
}

export function resolveSkillCastStyle(
  presetId: string | undefined,
  universe: string | undefined,
  skillId: string | undefined
): { style: SkillCastStyle; duration: number } {
  const id = (presetId || '').toLowerCase();
  const univ = (universe || '').toLowerCase();
  const sk = (skillId || '').toLowerCase();

  if (
    univ === 'naruto' ||
    /naruto|sasuke|itachi|madara|minato|kakashi|obito|pain|jiraiya|gaara|hinata|hashirama|souei|ninja|shinobi/.test(id) ||
    /rasengan|chidori|raikiri|sharingan|amaterasu|susanoo|kamui|shinra|chibaku|mokuton|byakugan|kage_bunshin|katon|jutsu|kunai|chakra/.test(sk)
  ) {
    if (/rasengan|chidori|raikiri|gentle_fist|byakugan|hirashin/.test(sk)) {
      return { style: 'naruto_rasengan', duration: 0.68 };
    }
    return { style: 'naruto_hand_seals', duration: 0.74 };
  }

  if (
    univ === 'dragonball' ||
    /goku|vegeta|gohan|broly|gogeta|beerus|frieza|piccolo|trunks/.test(id) ||
    /kamehameha|galick|final_flash|masenko|makankosappo|hakai|supernova|death_beam|ultra_instinct/.test(sk)
  ) {
    if (/masenko/.test(sk) || (/gohan|trunks/.test(id) && /masenko|buster/.test(sk))) {
      return { style: 'dbz_masenko', duration: 0.72 };
    }
    if (/final_flash|galick|omega|blaster|stardust|broly/.test(sk) || (/vegeta|broly/.test(id) && !/kamehameha/.test(sk))) {
      return { style: 'dbz_final_flash', duration: 0.74 };
    }
    if (/makankosappo|special_beam|death_beam|supernova|hakai|destruction/.test(sk) || /piccolo|frieza|beerus/.test(id)) {
      return { style: 'dbz_finger_beam', duration: 0.68 };
    }
    return { style: 'dbz_kamehameha', duration: 0.76 };
  }

  if (
    univ === 'bleach' ||
    /ichigo|yamamoto|kenpachi|byakuya|aizen|hitsugaya|rukia|urahara|ulquiorra|grimmjow|shunsui|komamura/.test(id) ||
    /getsuga|zanka|senbonzakura|kyoka|hyorinmaru|hakka|cero|lanza|bankai|zangetsu/.test(sk)
  ) {
    if (/cero|lanza|gran_rey|hado|kurohitsugi|senbonzakura/.test(sk) || /ulquiorra|aizen|byakuya/.test(id)) {
      return { style: 'bleach_cero', duration: 0.68 };
    }
    return { style: 'bleach_getsuga', duration: 0.70 };
  }

  if (
    univ === 'onepiece' ||
    /luffy|zoro|mihawk|shanks|kaido|whitebeard|law|sanji|ace|sabo/.test(id) ||
    /gomu|bajrang|santoryu|rengoku|kamusari|yoru|gura|quake|room|shambles|ifrit|diable|hiken/.test(sk)
  ) {
    if (/room|shambles|gamma|kroom/.test(sk) || /law/.test(id)) {
      return { style: 'onepiece_room', duration: 0.70 };
    }
    if (/ifrit|diable|concasser|jambe/.test(sk) || /sanji/.test(id)) {
      return { style: 'onepiece_kick', duration: 0.64 };
    }
    if (/gura|quake|kabuto/.test(sk) || /whitebeard/.test(id)) {
      return { style: 'onepiece_quake', duration: 0.72 };
    }
    if (/gomu|bajrang|red_roc|gatling|hiken|fire_fist|dragon_claw/.test(sk) || /luffy|ace|sabo/.test(id)) {
      return { style: 'onepiece_gum_punch', duration: 0.66 };
    }
    return { style: 'onepiece_haki_slash', duration: 0.68 };
  }

  if (/azathoth|drago_nova|megiddo|astral|star|meteor|chronoa|milim/.test(sk)) {
    return { style: 'tensura_nova', duration: 0.72 };
  }
  if (/slash|sword|katana|scythe|cleave|storm_break/.test(sk)) {
    return { style: 'bleach_getsuga', duration: 0.66 };
  }
  return { style: 'tensura_devour', duration: 0.68 };
}

export function triggerSkillCastPose(
  poseState: DirectBonePoseState | null | undefined,
  presetId?: string,
  universe?: string,
  skillId?: string
): SkillCastStyle {
  if (!poseState) return 'none';
  const { style, duration } = resolveSkillCastStyle(presetId, universe, skillId);
  poseState.skillCastStyle = style;
  poseState.skillCastDuration = duration;
  poseState.skillCastTimer = duration;
  return style;
}

/**
 * Discovers right-hand or left-hand finger bone chains descending from a hand bone so the hand can
 * close into a natural fist around sword hilts / tool shafts or form Shinobi Jutsu hand seals.
 * Handles explicit names, 1-level metacarpal/palm hubs (`GD_fist`, `hand_R_AS01`, `unused gd fist`),
 * `0..4` vs `1..5` numbered chains, and Shift-JIS / unnamed `IDxx` topological skeletons.
 */
export function discoverHandFingerChains(handBone: THREE.Bone | undefined): FingerChainBones | null {
  if (!handBone) return null;
  const chains: FingerChainBones = {
    thumb: [],
    index: [],
    middle: [],
    ring: [],
    pinky: []
  };
  let namedSlots = 0;
  handBone.traverse((node) => {
    if (node === handBone || !(node as THREE.Bone).isBone) return;
    const bone = node as THREE.Bone;
    const name = bone.name || '';
    if (/end(?:_|\d|$)|_end|tip$|nub$|weapon|sword|handle|kanabo|hyotan|hand_(?:open|hold|close)/i.test(name)) return;
    for (const [slot, re] of FINGER_SLOT_REGEX) {
      if (re.test(name)) {
        if (chains[slot].length === 0) namedSlots++;
        chains[slot].push(bone);
        break;
      }
    }
  });

  const depthOf = (b: THREE.Bone): number => {
    let d = 0;
    let cur: THREE.Object3D | null = b;
    while (cur && cur !== handBone) {
      d++;
      cur = cur.parent;
    }
    return d;
  };

  const totalNamedBones =
    chains.thumb.length + chains.index.length + chains.middle.length + chains.ring.length + chains.pinky.length;
  if (namedSlots >= 2 || (namedSlots === 1 && totalNamedBones >= 2)) {
    (Object.keys(chains) as Array<keyof FingerChainBones>).forEach((k) => {
      chains[k].sort((a, b) => depthOf(a) - depthOf(b));
      if (chains[k].length > 3) chains[k].length = 3;
    });
    return chains;
  }

  // Topological + Spatial 5-Finger Chain Detector (handles 0..4, 1..5, metacarpal palm hubs & Shift-JIS rigs):
  const isNonFingerBone = (nm: string) =>
    /end(?:_|\d|$)|_end|tip$|nub$|weapon|sword|handle|kanabo|hyotan|sup|(?:^|[_.\-\s])(?:adj|twist|null)(?:[_.\-\s\d]|$)|^gp_|_ik|_fk|tweak|meta_0/i.test(
      nm
    );

  const collectLinearChain = (root: THREE.Bone): THREE.Bone[] => {
    const out: THREE.Bone[] = [];
    let cur: THREE.Bone | undefined = root;
    while (cur && out.length < 4) {
      if (isNonFingerBone(cur.name || '')) break;
      out.push(cur);
      const kids = cur.children.filter((c) => (c as THREE.Bone).isBone && !isNonFingerBone(c.name || '')) as THREE.Bone[];
      if (kids.length !== 1) break;
      cur = kids[0];
    }
    if (out.length === 4 && out[3].children.filter((c) => (c as THREE.Bone).isBone).length === 0) {
      out.pop();
    }
    return out;
  };

  const directBoneKids = handBone.children.filter(
    (c) => (c as THREE.Bone).isBone && !isNonFingerBone(c.name || '')
  ) as THREE.Bone[];

  // Expand 1-level metacarpal/palm hubs (`GD_fist_R`, `unused gd fist r`, `hand_R_AS00/01`) into their finger roots
  const candidateRoots: THREE.Bone[] = [];
  for (const kid of directBoneKids) {
    const subKids = kid.children.filter(
      (c) => (c as THREE.Bone).isBone && !isNonFingerBone(c.name || '')
    ) as THREE.Bone[];
    if (subKids.length >= 2 && subKids.length <= 5) {
      candidateRoots.push(...subKids);
    } else if (subKids.length === 1 && /fist|metacarp|palm|_as0\d/i.test(kid.name || '')) {
      candidateRoots.push(subKids[0]);
    } else {
      candidateRoots.push(kid);
    }
  }

  const rawChains = candidateRoots.map(collectLinearChain).filter((ch) => ch.length >= 2);
  if (rawChains.length < 4) return null;

  handBone.updateWorldMatrix(true, true);
  const wWrist = new THREE.Vector3();
  handBone.getWorldPosition(wWrist);

  const scored = rawChains.map((ch) => {
    const wBase = new THREE.Vector3();
    ch[0].getWorldPosition(wBase);
    return { ch, wBase, wristDist: wBase.distanceTo(wWrist) };
  });

  // Thumb originates closest to the wrist crease; remaining 4 fingers line up along the knuckle arch
  scored.sort((a, b) => a.wristDist - b.wristDist);
  const thumbEntry = scored[0];
  const rest = scored.slice(1, 5);
  rest.sort((a, b) => a.wBase.distanceTo(thumbEntry.wBase) - b.wBase.distanceTo(thumbEntry.wBase));

  return {
    thumb: thumbEntry.ch.slice(0, 3),
    index: rest[0]?.ch.slice(0, 3) || [],
    middle: rest[1]?.ch.slice(0, 3) || [],
    ring: rest[2]?.ch.slice(0, 3) || [],
    pinky: rest[3]?.ch.slice(0, 3) || []
  };
}

/**
 * Calibrates exact anatomical wrapper-space curl axes for all 5 fingers of a hand regardless of
 * Blender/FBX/MMD/DBFZ local bone roll, and records true palmar normal & knuckle geometry on `handBone`.
 */
export function calibrateHandFingerChains(
  handBone: THREE.Bone | undefined,
  chains: FingerChainBones | null,
  wrapper: THREE.Object3D,
  isRightHand: boolean
): CalibratedHandFingers | null {
  if (!handBone || !chains) return null;
  wrapper.updateWorldMatrix(true, true);
  const invWrapper = wrapper.matrixWorld.clone().invert();
  const wrapperWorldQuat = wrapper.getWorldQuaternion(new THREE.Quaternion());
  const handWorldQuat = handBone.getWorldQuaternion(new THREE.Quaternion());
  const invHandMat = handBone.matrixWorld.clone().invert();
  const qWrapToHand = handWorldQuat.clone().invert().multiply(wrapperWorldQuat);

  const inWrap = (b: THREE.Object3D): THREE.Vector3 => {
    const v = new THREE.Vector3();
    b.getWorldPosition(v);
    return v.applyMatrix4(invWrapper);
  };

  const pWrist = inWrap(handBone);
  const fingerRoots = [chains.index[0], chains.middle[0], chains.ring[0], chains.pinky[0]].filter(Boolean) as THREE.Bone[];
  const fingerTips = [
    chains.index[chains.index.length - 1],
    chains.middle[chains.middle.length - 1],
    chains.ring[chains.ring.length - 1],
    chains.pinky[chains.pinky.length - 1]
  ].filter(Boolean) as THREE.Bone[];

  const pKnuckle = new THREE.Vector3();
  if (fingerRoots.length > 0) {
    for (const r of fingerRoots) pKnuckle.add(inWrap(r));
    pKnuckle.divideScalar(fingerRoots.length);
  } else {
    pKnuckle.copy(pWrist).add(new THREE.Vector3(0, -0.05, -0.02));
  }

  const pTipAvg = new THREE.Vector3();
  if (fingerTips.length > 0) {
    for (const t of fingerTips) {
      const tp = inWrap(t);
      const leaf = t.children.find((c) => (c as THREE.Bone).isBone);
      if (leaf) tp.lerp(inWrap(leaf), 0.85);
      pTipAvg.add(tp);
    }
    pTipAvg.divideScalar(fingerTips.length);
  } else {
    pTipAvg.copy(pKnuckle).add(new THREE.Vector3(0, -0.07, -0.02));
  }

  const vExtend = pTipAvg.clone().sub(pWrist);
  if (vExtend.lengthSq() < 1e-6) vExtend.set(0, -0.92, -0.38);
  vExtend.normalize();

  let vThumbSide = new THREE.Vector3(0, 0, -1);
  const bThumb = chains.thumb[0];
  const bPinky = chains.pinky[0] || chains.ring[0] || chains.middle[0] || chains.index[0];
  if (bThumb && bPinky && bThumb !== bPinky) {
    const diff = inWrap(bThumb).sub(inWrap(bPinky));
    diff.addScaledVector(vExtend, -diff.dot(vExtend));
    if (diff.lengthSq() > 1e-6) {
      vThumbSide = diff.normalize();
    }
  } else {
    vThumbSide.addScaledVector(vExtend, -vThumbSide.dot(vExtend));
    if (vThumbSide.lengthSq() < 1e-6) vThumbSide.set(isRightHand ? -1 : 1, 0, 0);
    vThumbSide.normalize();
  }

  // Right-handed Three.js wrapper frame (+X = right arm side, +Y = up, -Z = forward):
  // Right hand inner palm normal = thumbSide x extend; Left hand inner palm normal = extend x thumbSide!
  const vPalmWrap = isRightHand
    ? new THREE.Vector3().crossVectors(vThumbSide, vExtend)
    : new THREE.Vector3().crossVectors(vExtend, vThumbSide);
  if (vPalmWrap.lengthSq() < 1e-6) vPalmWrap.set(isRightHand ? -1 : 1, 0, 0);
  vPalmWrap.normalize();

  // Rotation axis in wrapper space that bends `vExtend` directly INTO `vPalmWrap` by +angle
  const fingerCurlAxisWrap = new THREE.Vector3().crossVectors(vExtend, vPalmWrap);
  if (fingerCurlAxisWrap.lengthSq() < 1e-6) fingerCurlAxisWrap.set(0, 0, isRightHand ? -1 : 1);
  fingerCurlAxisWrap.normalize();

  // Thumb wraps across the front of the palm toward the ulnar (pinky) knuckle side
  let thumbCurlAxisWrap = fingerCurlAxisWrap.clone();
  if (chains.thumb.length > 0) {
    const t0 = inWrap(chains.thumb[0]);
    const tLastBone = chains.thumb[chains.thumb.length - 1];
    const t1 = inWrap(tLastBone);
    const vThumbExt = t1.sub(t0);
    if (vThumbExt.lengthSq() > 1e-6) {
      vThumbExt.normalize();
      const vThumbGoal = vPalmWrap.clone().multiplyScalar(0.64).addScaledVector(vThumbSide, -0.76).normalize();
      const tAxis = new THREE.Vector3().crossVectors(vThumbExt, vThumbGoal);
      if (tAxis.lengthSq() > 1e-6) thumbCurlAxisWrap = tAxis.normalize();
    }
  }

  const calibrateChain = (list: THREE.Bone[], axisWrap: THREE.Vector3): CalibratedBoneCurl[] => {
    if (list.length === 0) return [];
    let preCurlScale = 1.0;
    if (list.length >= 2) {
      const p0 = inWrap(list[0]);
      const p1 = inWrap(list[1]);
      const pEnd = inWrap(list[list.length - 1]);
      const seg0 = p1.clone().sub(p0);
      const seg1 = pEnd.clone().sub(p1);
      if (seg0.lengthSq() > 1e-6 && seg1.lengthSq() > 1e-6) {
        const dot = seg0.normalize().dot(seg1.normalize());
        preCurlScale = THREE.MathUtils.clamp((dot + 0.15) / 0.85, 0.25, 1.0);
      }
    }
    return list.map((bone) => {
      const bq = bone.getWorldQuaternion(new THREE.Quaternion());
      const qWrapToBone = bq.invert().multiply(wrapperWorldQuat);
      const localCurlAxis = axisWrap.clone().applyQuaternion(qWrapToBone).normalize();
      return {
        bone,
        restQuat: bone.quaternion.clone(),
        localCurlAxis,
        preCurlScale
      };
    });
  };

  const knuckleWorld = new THREE.Vector3();
  if (fingerRoots.length > 0) {
    for (const r of fingerRoots) {
      const wp = new THREE.Vector3();
      r.getWorldPosition(wp);
      knuckleWorld.add(wp);
    }
    knuckleWorld.divideScalar(fingerRoots.length);
  } else {
    handBone.getWorldPosition(knuckleWorld);
  }
  const knuckleCenterLocal = knuckleWorld.applyMatrix4(invHandMat);

  return {
    isRightHand,
    thumb: calibrateChain(chains.thumb, thumbCurlAxisWrap),
    index: calibrateChain(chains.index, fingerCurlAxisWrap),
    middle: calibrateChain(chains.middle, fingerCurlAxisWrap),
    ring: calibrateChain(chains.ring, fingerCurlAxisWrap),
    pinky: calibrateChain(chains.pinky, fingerCurlAxisWrap),
    palmNormalLocal: vPalmWrap.clone().applyQuaternion(qWrapToHand).normalize(),
    thumbSideLocal: vThumbSide.clone().applyQuaternion(qWrapToHand).normalize(),
    extendDirLocal: vExtend.clone().applyQuaternion(qWrapToHand).normalize(),
    knuckleCenterLocal
  };
}

const _tmpFingerQuat = new THREE.Quaternion();
const _tmpFingerEuler = new THREE.Euler();

/**
 * Applies anatomically calibrated 5-finger curl or universe-specific Jutsu / Ki hand pose.
 */
export function applyCalibratedFingerPose(
  cal: CalibratedHandFingers | null,
  gripStrength: number,
  mode: FingerPoseMode = 'auto'
): void {
  if (!cal) return;
  const baseS = Math.max(-0.25, Math.min(1.15, gripStrength));
  const { thumb: thumbRads, fingers: fingerRads } = GLOBAL_RIG_CALIBRATION.closedGripCurlRad;

  let sThumb = baseS;
  let sIndex = baseS;
  let sMiddle = baseS;
  let sRing = baseS;
  let sPinky = baseS;

  if (mode === 'jutsu_tiger' || mode === 'jutsu_ram') {
    // Classic Naruto Tiger / Ram Seal: index & middle extended upright together, ring & pinky tightly folded, thumb tucked!
    sThumb = 0.68;
    sIndex = 0.04;
    sMiddle = 0.04;
    sRing = 1.05;
    sPinky = 1.08;
  } else if (mode === 'jutsu_snake') {
    // Snake / Boar interlaced clasp
    sThumb = 0.72;
    sIndex = 0.82;
    sMiddle = 0.86;
    sRing = 0.88;
    sPinky = 0.90;
  } else if (mode === 'ki_cup') {
    // Curved Kamehameha / Rasengan / Beelzebuth energy-cupping claw
    sThumb = 0.44;
    sIndex = 0.46;
    sMiddle = 0.50;
    sRing = 0.54;
    sPinky = 0.56;
  } else if (mode === 'point') {
    sThumb = 0.78;
    sIndex = 0.0;
    sMiddle = 0.98;
    sRing = 1.02;
    sPinky = 1.05;
  } else if (mode === 'open') {
    sThumb = -0.06;
    sIndex = -0.06;
    sMiddle = -0.06;
    sRing = -0.06;
    sPinky = -0.06;
  }

  const applyChain = (entries: CalibratedBoneCurl[], rads: [number, number, number], strength: number) => {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (Math.abs(strength) <= 0.001) {
        e.bone.quaternion.copy(e.restQuat);
        continue;
      }
      const scale = strength > 0 ? e.preCurlScale : 1.0;
      const angle = (rads[Math.min(i, 2)] ?? rads[1]) * strength * scale;
      _tmpFingerQuat.setFromAxisAngle(e.localCurlAxis, angle);
      e.bone.quaternion.copy(e.restQuat).multiply(_tmpFingerQuat);
    }
  };

  applyChain(cal.thumb, thumbRads, sThumb);
  applyChain(cal.index, fingerRads, sIndex);
  applyChain(cal.middle, fingerRads, sMiddle);
  applyChain(cal.ring, fingerRads, sRing);
  applyChain(cal.pinky, fingerRads, sPinky);
}

/**
 * Curls (or spreads when negative) discovered finger chains around a held weapon hilt or fist.
 */
export function applyClosedGripFingerCurl(
  chains: FingerChainBones | null,
  restQuats: Map<THREE.Bone, THREE.Quaternion>,
  gripStrength: number
): void {
  if (!chains) return;
  const s = Math.max(-0.25, Math.min(1.15, gripStrength));
  if (Math.abs(s) <= 0.001) {
    for (const list of [chains.thumb, chains.index, chains.middle, chains.ring, chains.pinky]) {
      for (const b of list) {
        const rq = restQuats.get(b);
        if (rq) b.quaternion.copy(rq);
      }
    }
    return;
  }
  const { thumb, fingers } = GLOBAL_RIG_CALIBRATION.closedGripCurlRad;

  const curlList = (list: THREE.Bone[], rads: [number, number, number], isThumb: boolean) => {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const rq = restQuats.get(b);
      if (!rq) continue;
      const rad = (rads[Math.min(i, 2)] ?? rads[1]) * s;
      let childDirX = 0;
      let childDirY = 1;
      let childDirZ = 0;
      const firstBoneChild = b.children.find((c) => (c as THREE.Bone).isBone);
      if (firstBoneChild) {
        const len = firstBoneChild.position.length();
        if (len > 1e-5) {
          childDirX = Math.abs(firstBoneChild.position.x) / len;
          childDirY = Math.abs(firstBoneChild.position.y) / len;
          childDirZ = Math.abs(firstBoneChild.position.z) / len;
        }
      }
      if (isThumb) {
        _tmpFingerEuler.set(rad * 0.55, rad * 0.35, rad * 0.65);
      } else if (childDirX > childDirY && childDirX > childDirZ) {
        const sign = (firstBoneChild?.position.x ?? 1) >= 0 ? -1 : 1;
        _tmpFingerEuler.set(0, 0, sign * rad);
      } else {
        _tmpFingerEuler.set(rad * 0.82, 0, -rad * 0.24);
      }
      _tmpFingerQuat.setFromEuler(_tmpFingerEuler);
      b.quaternion.copy(rq).multiply(_tmpFingerQuat);
    }
  };

  curlList(chains.thumb, thumb, true);
  curlList(chains.index, fingers, false);
  curlList(chains.middle, fingers, false);
  curlList(chains.ring, fingers, false);
  curlList(chains.pinky, fingers, false);
}

/**
 * Identifies baked handheld weapon bones/meshes inside imported anime/RPG character GLBs so external
 * equipped tools/weapons never double-render on top of a character's built-in blade.
 * Hip/back sheaths and scabbards are intentionally preserved.
 */
export function isBakedHandheldWeaponObject(name: string): boolean {
  if (!name) return false;
  if (/cha_toshiro_g_6_chain|weapon\s*chain0\d|wp\d+_\d+|bone_swordtrail|fork_neutral|pithfork|heartcube_pl_/i.test(name)) {
    return true;
  }
  // Never hide hip/back sheaths, scabbards, hair, body, clothing, or outline meshes
  if (/sheath|scabbard|さや|holster|spine_weapon|sword[\s_]*back|belt|cape|coat|body|face|hair|head|shoe|boot|pants|skirt|hat|outline|chain/i.test(name)) {
    return false;
  }
  return /(?:^|_|\b)(?:weapon_01|weapon_02|bone_weapon|weapon_d|weapon_r|weapon_l|l_weapon|r_weapon|shield_0231|weapon1|rweapon|bocun_weapon|rhand_weapon|rhand_weapon1|helper_r_weapon1|b_equip_weapon|weapon_equip_pl_|weapon_jnt|geo_weapon_pl_|weapon_0[123]_joint|sword_joint|sword[\s_]*grip|gdu[\s_]*(?:sword|blade|handle|katana)|katana[\s_]*bake|blade[\s_]*bake|blade0\d|kanabo_joint|hyotan_01|spear_78|goblin_sword|goblin_shield|paladin_.*_sword|paladin_.*_shield|kanabo_pl_|pipe_weapon_pl_|pipe_weapon_joint|knife_pl_|falce_scythe|yixin_weapon|rweapon_yamamoto|sword[\s_-]*right|sword[\s_-]*left|spear_material|dyn_katana_blade|bip001[\s_]*prop\d)(?:$|_|\d|\.|\b|\s)/i.test(
    name
  );
}

/**
 * Resolves EVERY character preset's exact canonical original weapon item key (or `null` for bare-handed
 * martial/jutsu/ki/resurreccion fighters) so each character holds ONLY their true anime weapon.
 */
export function getCharacterSignatureCombatInfo(
  presetId: string | undefined,
  universe: string | undefined,
  epValue = 1_000_000
): { signatureItemKey: string | null; innateAttackDamage: number; styleTitle: string } {
  const id = (presetId || '').toLowerCase();
  const univ = (universe || '').toLowerCase();
  const epTierBonus = Math.min(9, Math.max(2, Math.floor(Math.log10(Math.max(10_000, epValue)) - 3.5) * 2));

  // ---- BLEACH CANONICAL ZANPAKUTO / QUINCY / ARRANCAR ----
  if (id.includes('urahara')) {
    return { signatureItemKey: 'BENIHIME_BLADE', innateAttackDamage: 9.5 + epTierBonus, styleTitle: 'Benihime & Kannonbiraki Aratame' };
  }
  if (id.includes('ichigo')) {
    return { signatureItemKey: 'ZANGETSU_BLADE', innateAttackDamage: 10.5 + epTierBonus, styleTitle: 'Gerçek Tensa Zangetsu & Getsuga' };
  }
  if (id.includes('byakuya')) {
    return { signatureItemKey: 'SENBONZAKURA_KATANA', innateAttackDamage: 9.5 + epTierBonus, styleTitle: 'Senbonzakura Kageyoshi' };
  }
  if (id.includes('yamamoto')) {
    return { signatureItemKey: 'RYUJIN_JAKKA_BLADE', innateAttackDamage: 11.0 + epTierBonus, styleTitle: 'Zanka no Tachi (15 Milyon °C)' };
  }
  if (id.includes('kenpachi')) {
    return { signatureItemKey: 'NOZARASHI_CLEAVER', innateAttackDamage: 11.0 + epTierBonus, styleTitle: 'Nozarashi Bankai Yıkımı' };
  }
  if (id.includes('hitsugaya')) {
    return { signatureItemKey: 'HYORINMARU_KATANA', innateAttackDamage: 9.2 + epTierBonus, styleTitle: 'Daiguren Hyōrinmaru' };
  }
  if (id.includes('rukia')) {
    return { signatureItemKey: 'SODE_NO_SHIRAYUKI', innateAttackDamage: 9.2 + epTierBonus, styleTitle: 'Hakka no Togame (Mutlak Sıfır)' };
  }
  if (id.includes('aizen')) {
    return { signatureItemKey: 'KYOKA_SUIGETSU', innateAttackDamage: 11.0 + epTierBonus, styleTitle: 'Kyōka Suigetsu & Hōgyoku' };
  }
  if (id.includes('shunsui') || id === 'hakurou') {
    return { signatureItemKey: 'KATEN_KYOKOTSU', innateAttackDamage: 10.0 + epTierBonus, styleTitle: 'Katen Kyōkotsu: Karamatsu Shinjū' };
  }
  if (id.includes('gin_ichimaru') || id === 'gin') {
    return { signatureItemKey: 'SHINSO_BLADE', innateAttackDamage: 9.8 + epTierBonus, styleTitle: 'Kamishini no Yari (13 km Hız)' };
  }
  if (id.includes('unohana')) {
    return { signatureItemKey: 'MINAZUKI_BLADE', innateAttackDamage: 10.2 + epTierBonus, styleTitle: 'Minazuki (İlk Kenpachi)' };
  }
  if (id.includes('mayuri')) {
    return { signatureItemKey: 'ASHISOGI_JIZO', innateAttackDamage: 9.0 + epTierBonus, styleTitle: 'Konjiki Ashisogi Jizō' };
  }
  if (id.includes('renji')) {
    return { signatureItemKey: 'ZABIMARU_BLADE', innateAttackDamage: 9.4 + epTierBonus, styleTitle: 'Sōō Zabimaru' };
  }
  if (id.includes('komamura')) {
    return { signatureItemKey: 'TENGEN_ODACHI', innateAttackDamage: 9.8 + epTierBonus, styleTitle: 'Kokujō Tengen Myō\'ō: Dangai Jōe' };
  }
  if (id.includes('shinji')) {
    return { signatureItemKey: 'SAKANADE_KATANA', innateAttackDamage: 9.3 + epTierBonus, styleTitle: 'Sakanade: Sakashima Yokoshima' };
  }
  if (id.includes('ichibe')) {
    return { signatureItemKey: 'ICHIMONJI_BRUSH', innateAttackDamage: 11.2 + epTierBonus, styleTitle: 'Shirafude Ichimonji (İsim Mührü)' };
  }
  if (id.includes('yhwach') || id.includes('uryu') || id.includes('jugram')) {
    return { signatureItemKey: 'HEILIG_BOGEN', innateAttackDamage: 10.6 + epTierBonus, styleTitle: 'Kutsal Quincy Heilig Bogen' };
  }
  if (id.includes('ulquiorra')) {
    return { signatureItemKey: 'LANZA_RELAMPAGO', innateAttackDamage: 9.8 + epTierBonus, styleTitle: 'Segunda Etapa: Lanza del Relámpago' };
  }
  if (id.includes('yoruichi') || id.includes('grimmjow') || id.includes('starrk') || id.includes('barragan')) {
    return { signatureItemKey: null, innateAttackDamage: 10.2 + epTierBonus, styleTitle: 'Saf Shunkō / Resurrección Pençesi' };
  }
  if (univ === 'bleach') {
    return { signatureItemKey: 'ZANGETSU_BLADE', innateAttackDamage: 9.0 + epTierBonus, styleTitle: 'Zanpakutō & Reiatsu Darbesi' };
  }

  // ---- NARUTO CANONICAL SHINOBI WEAPONS vs PURE JUTSU/TAIJUTSU ----
  if (id.includes('sasuke') || id.includes('orochimaru')) {
    return { signatureItemKey: 'KUSANAGI_SASUKE', innateAttackDamage: 10.0 + epTierBonus, styleTitle: 'Kusanagi Kılıcı & Rinnegan' };
  }
  if (id.includes('madara')) {
    return { signatureItemKey: 'UCHIHA_GUNBAI', innateAttackDamage: 10.8 + epTierBonus, styleTitle: 'Uchiha Gunbai & Limbo Susanoo' };
  }
  if (id.includes('obito')) {
    return { signatureItemKey: 'NUNOBOKO_SWORD', innateAttackDamage: 10.4 + epTierBonus, styleTitle: 'Nunoboko Hakikat Kılıcı & Kamui' };
  }
  if (id.includes('itachi')) {
    return { signatureItemKey: 'TOTSUKA_BLADE', innateAttackDamage: 9.8 + epTierBonus, styleTitle: 'Totsuka Mühür Kılıcı & Tsukuyomi' };
  }
  if (id.includes('minato') || id.includes('tobirama')) {
    return { signatureItemKey: 'HIRAISHIN_KUNAI', innateAttackDamage: 9.6 + epTierBonus, styleTitle: 'Hiraishin Uçan Yıldırım Kunai' };
  }
  if (id.includes('kakashi') || id.includes('shisui') || id === 'souei' || id.includes('shadow_assassin')) {
    return { signatureItemKey: 'SHINOBI_KUNAI', innateAttackDamage: 9.5 + epTierBonus, styleTitle: 'Kamui Raikiri & Shinobi Kunai' };
  }
  if (id.includes('kisame') || id.includes('killer_bee')) {
    return { signatureItemKey: 'SAMEHADA_BLADE', innateAttackDamage: 9.8 + epTierBonus, styleTitle: 'Samehada Çakra Biçen Kılıç' };
  }
  if (id.includes('hidan')) {
    return { signatureItemKey: 'JASHIN_SCYTHE', innateAttackDamage: 9.4 + epTierBonus, styleTitle: 'Jashin Üç Bıçaklı Kan Tırpanı' };
  }
  if (id.includes('hiruzen')) {
    return { signatureItemKey: 'ENMA_STAFF', innateAttackDamage: 9.5 + epTierBonus, styleTitle: 'Elmas Sopa Enma & Beş Element' };
  }
  if (id.includes('pain')) {
    return { signatureItemKey: 'CHAKRA_ROD', innateAttackDamage: 9.8 + epTierBonus, styleTitle: 'Rinnegan Kara Çakra Çubuğu' };
  }
  if (
    /naruto|might_guy|rock_lee|hashirama|kaguya|hagoromo|jiraiya|tsunade|gaara|hinata_hyuga|deidara/.test(id) ||
    univ === 'naruto'
  ) {
    return { signatureItemKey: null, innateAttackDamage: 10.2 + epTierBonus, styleTitle: 'Saf Senjutsu, El Mührü & Taijutsu' };
  }

  // ---- DRAGON BALL SUPER ----
  if (id.includes('future_trunks') || id === 'trunks') {
    return { signatureItemKey: 'SWORD_OF_HOPE', innateAttackDamage: 10.2 + epTierBonus, styleTitle: 'Cesur Umut Kılıcı (Spirit Sword)' };
  }
  if (id.includes('goku_black')) {
    return { signatureItemKey: 'DIVINE_SCYTHE', innateAttackDamage: 10.5 + epTierBonus, styleTitle: 'Super Saiyan Rosé Boyut Tırpanı' };
  }
  if (/goku|vegeta|gohan|broly|gogeta|beerus|frieza|piccolo/.test(id) || univ === 'dragonball') {
    return { signatureItemKey: null, innateAttackDamage: 10.8 + epTierBonus, styleTitle: 'Tanrısal Ki Dövüş Sanatı' };
  }

  // ---- ONE PIECE ----
  if (id.includes('zoro')) {
    return { signatureItemKey: 'ENMA_KATANA', innateAttackDamage: 10.4 + epTierBonus, styleTitle: 'Cehennem Kralı Üç Kılıç Stili (Enma)' };
  }
  if (id.includes('mihawk')) {
    return { signatureItemKey: 'KOKUTO_YORU', innateAttackDamage: 10.6 + epTierBonus, styleTitle: 'Kokutō Yoru (Kara Kılıç)' };
  }
  if (id.includes('shanks')) {
    return { signatureItemKey: 'GRYPHON_SABER', innateAttackDamage: 10.8 + epTierBonus, styleTitle: 'Gryphon & Kral Haki İnfazı' };
  }
  if (id.includes('whitebeard')) {
    return { signatureItemKey: 'MURAKUMOGIRI', innateAttackDamage: 10.8 + epTierBonus, styleTitle: 'Murakumogiri & Gura Gura Depremi' };
  }
  if (id.includes('kaido')) {
    return { signatureItemKey: 'HASSAIKAI_KANABO', innateAttackDamage: 11.0 + epTierBonus, styleTitle: 'Hassaikai & Raimei Hakke' };
  }
  if (id.includes('law')) {
    return { signatureItemKey: 'KIKOKU_NODACHI', innateAttackDamage: 9.8 + epTierBonus, styleTitle: 'Kikoku & Ope Ope Room' };
  }
  if (/luffy|sanji|ace|sabo/.test(id) || univ === 'onepiece') {
    return { signatureItemKey: null, innateAttackDamage: 10.4 + epTierBonus, styleTitle: 'Kral Haki & Şeytan Meyvesi Uyanışı' };
  }

  // ---- MYTHIC RPG & TENSURA ----
  if (id.includes('storm_ranger') || id === 'carrera' || id === 'treyni') {
    return { signatureItemKey: 'HEILIG_BOGEN', innateAttackDamage: 8.8 + epTierBonus, styleTitle: 'Fırtına Ruh Yayı' };
  }
  if (/archmage|gadra|myulan|ramiris|shuna/.test(id)) {
    return { signatureItemKey: 'ASTRAL_STAFF', innateAttackDamage: 8.5 + epTierBonus, styleTitle: 'Astral Büyü Asası' };
  }
  if (/reaper|diablo|beretta|ultima|testarossa|luminous/.test(id)) {
    return { signatureItemKey: 'DIVINE_SCYTHE', innateAttackDamage: 9.5 + epTierBonus, styleTitle: 'Hiçlik Tırpanı & Karanlık Öz' };
  }
  if (/shion|benimaru|chloe|hinata/.test(id)) {
    return { signatureItemKey: 'ENMA_KATANA', innateAttackDamage: 9.5 + epTierBonus, styleTitle: 'Tempest Kutsal Odachi Sanatı' };
  }
  if (/rimuru|veldora|milim|guy|veldanava|rudra|michael|leon|feldway|zelanus|paladin|dragon_knight|geld|gazel/.test(id)) {
    return { signatureItemKey: 'DRAGON_SLAYER', innateAttackDamage: 9.8 + epTierBonus, styleTitle: 'Tempest Ejderha Kılıcı' };
  }
  if (univ === 'tensura') {
    return { signatureItemKey: null, innateAttackDamage: 9.2 + epTierBonus, styleTitle: 'Saf Büyü Özü & Canavar Pençesi' };
  }
  return {
    signatureItemKey: null,
    innateAttackDamage: 4.0 + Math.min(4, epTierBonus * 0.5),
    styleTitle: 'Yakın Dövüş'
  };
}
