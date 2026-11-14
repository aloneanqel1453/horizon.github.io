import * as THREE from 'three';
import { BLOCK, TILE, getBlock, isLavaBlock, isValidBlockId, isWaterBlock } from './blocks';
import { buildExtrudedItemMesh, getTileUV } from './atlas';
import { ChunkMeshPayload, SubMeshBuffers, buildChunkMesh, getFloraOffset } from './mesher';
import { CHUNK_SIZE, DimensionId, WORLD_HEIGHT, chunkIndex, generateChunkVoxels, sampleColumnInfo } from './terrainGen';
import { ITEM, ItemStack, getItemDef, resolveBlockDrop } from '../items/catalog';
import { buildMiniBlockMesh } from '../entities/avatars';
import { hash2D } from './noise';

export interface BlockEdit {
  wx: number;
  y: number;
  wz: number;
  blockId: number;
  dim?: DimensionId;
}

interface LoadedChunk {
  cx: number;
  cz: number;
  voxels: Uint8Array;
  opaqueMesh: THREE.Mesh | null;
  waterMesh: THREE.Mesh | null;
  needsSeamFix?: boolean;
}

interface DebrisParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

interface PrimedTnt {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  timer: number;
  isLocal: boolean;
}

interface FallingSandEntity {
  mesh: THREE.Object3D;
  blockId: number;
  wx: number;
  wz: number;
  y: number;
  startY: number;
  vy: number;
}

interface DroppedItemEntity {
  mesh: THREE.Object3D;
  stack: ItemStack;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  pickupDelay: number;
}

interface XpOrbEntity {
  mesh: THREE.Mesh;
  value: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
}

interface RemoteCrackEntry {
  mesh: THREE.Mesh;
  bx: number;
  by: number;
  bz: number;
  stage: number;
  ttl: number;
}

const STORAGE_KEY = 'horizon_web_world_edits_v7_emerald';

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (!child.geometry.userData?.shared) {
        child.geometry.dispose();
      }
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => {
          if (!m.userData?.shared) m.dispose();
        });
      } else if (child.material && !child.material.userData?.shared) {
        child.material.dispose();
      }
    }
  });
}

export function isValidEdit(e: unknown): e is BlockEdit {
  if (!e || typeof e !== 'object') return false;
  const o = e as BlockEdit;
  return (
    Number.isInteger(o.wx) &&
    Number.isInteger(o.y) &&
    Number.isInteger(o.wz) &&
    Math.abs(o.wx) <= 500000 &&
    Math.abs(o.wz) <= 500000 &&
    o.y >= 1 &&
    o.y < WORLD_HEIGHT - 1 &&
    isValidBlockId(o.blockId)
  );
}

export class WorldManager {
  private scene: THREE.Scene;
  private atlasTex: THREE.CanvasTexture;
  private opaqueMat: THREE.MeshBasicMaterial;
  private waterMat: THREE.MeshBasicMaterial;
  private voxelUniforms = {
    uSunLevel: { value: 1.0 },
    uSkyTint: { value: new THREE.Color(1, 1, 1) },
    uTime: { value: 0.0 },
    uSunDir: { value: new THREE.Vector3(0.45, 0.82, 0.35) }
  };
  public dimension: DimensionId = 'overworld';

  private chunks = new Map<string, LoadedChunk>();
  private chunksByInt = new Map<number, LoadedChunk>();
  private lastCx = 999999;
  private lastCz = 999999;
  private lastChunk: LoadedChunk | undefined = undefined;
  private pending = new Set<string>();
  private dirtyNeighbors = new Set<string>();
  private remeshPending = new Set<string>();
  private pendingMeshUploads = new Map<string, { ch: LoadedChunk; mesh: ChunkMeshPayload }>();
  private cachedRadialRd = -1;
  private radialOffsets: Array<[number, number]> = [];
  private editsByDim: Record<DimensionId, Map<string, BlockEdit>> = {
    overworld: new Map(),
    nether: new Map(),
    end: new Map()
  };

  private worker: Worker;
  private reqCounter = 0;
  private dimEpoch = 0;
  private chunkEditSeq = new Map<string, number>();
  private pendingReactionEdits: BlockEdit[] = [];
  private reactionFlushScheduled = false;

  private debris: DebrisParticle[] = [];
  private debrisPool: THREE.Mesh[] = [];
  private sharedRebuildGrid: Array<Uint8Array | null> = new Array(9);
  private primedTnts: PrimedTnt[] = [];
  private fallingBlocks: FallingSandEntity[] = [];
  private droppedItems: DroppedItemEntity[] = [];
  private xpOrbs: XpOrbEntity[] = [];

  private chipMat: THREE.MeshBasicMaterial;
  private tntGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96);
  private xpGeo = new THREE.SphereGeometry(0.13, 6, 6);
  private xpMat = new THREE.MeshBasicMaterial({ color: 0xa6ff3b });

  // 3D Block Crack Overlay Box (Local + Remote Pool)
  private crackMesh: THREE.Mesh;
  private crackStage = -1;
  private remoteCracks = new Map<string, RemoteCrackEntry>();

  // 3D Drifting Voxel Clouds (Overworld y = 108)
  private cloudGroup = new THREE.Group();
  private cloudDrift = 0;
  private randomTickClock = 0;
  private fluidClock = 0;
  private fluidQueue = new Map<string, { wx: number; y: number; wz: number; due: number }>();

  public renderDistance = 4;
  public onExplosion?: (x: number, y: number, z: number) => void;
  public onLocalBatchEdits?: (edits: BlockEdit[]) => void;
  public onRemoteLiveEdit?: (wx: number, y: number, wz: number, prevId: number, nextId: number) => void;
  public onBlockRemovedAt?: (wx: number, y: number, wz: number, prevId: number, isLocalOrigin: boolean) => void;
  public onPickupItem?: (stack: ItemStack) => boolean;
  public onPickupXp?: (amount: number) => void;
  public onAnvilLand?: (x: number, y: number, z: number, fallDist: number) => void;

  constructor(scene: THREE.Scene, atlasTexture: THREE.CanvasTexture) {
    this.scene = scene;
    this.atlasTex = atlasTexture;
    this.tntGeo.userData.shared = true;
    this.xpGeo.userData.shared = true;
    this.xpMat.userData.shared = true;

    this.chipMat = new THREE.MeshBasicMaterial({
      map: atlasTexture,
      transparent: true,
      alphaTest: 0.25
    });
    this.chipMat.userData.shared = true;

    const attachHorizonVoxelShader = (mat: THREE.MeshBasicMaterial, cacheKey: string, isWaterPass = false) => {
      mat.customProgramCacheKey = () => cacheKey;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uSunLevel = this.voxelUniforms.uSunLevel;
        shader.uniforms.uSkyTint = this.voxelUniforms.uSkyTint;
        shader.uniforms.uTime = this.voxelUniforms.uTime;
        shader.uniforms.uSunDir = this.voxelUniforms.uSunDir;
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            '#include <common>\nattribute vec2 aLight;\nuniform float uTime;\nuniform vec3 uSunDir;\nvarying vec2 vVoxelLight;\nvarying float vSunDot;'
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
vVoxelLight = aLight;
vec3 vCleanNorm = normal;
vec3 vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
if (normal.y > 1.5) {
  vCleanNorm = vec3(0.0, 1.0, 0.0);
  transformed.x += sin(uTime * 2.1 + vWorldPos.x * 0.9 + vWorldPos.z * 0.7) * 0.038;
  transformed.z += cos(uTime * 1.8 + vWorldPos.z * 0.85 + vWorldPos.x * 0.6) * 0.028;
}
${isWaterPass ? 'if (normal.y > 0.5 && normal.y < 1.5) { transformed.y += sin(uTime * 2.3 + vWorldPos.x * 1.1 + vWorldPos.z * 0.9) * 0.016; }' : ''}
vSunDot = max(0.0, dot(normalize(vCleanNorm), uSunDir));`
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            '#include <common>\nuniform float uSunLevel;\nuniform vec3 uSkyTint;\nvarying vec2 vVoxelLight;\nvarying float vSunDot;'
          )
          .replace(
            '#include <color_fragment>',
            '#include <color_fragment>\nfloat dirWarmth = 0.94 + vSunDot * 0.14 * uSunLevel * vVoxelLight.x;\nvec3 voxSky = uSkyTint * (0.15 + vVoxelLight.x * 0.85 * uSunLevel) * dirWarmth;\nvec3 voxBlock = vec3(1.25, 1.05, 0.80) * pow(max(0.0, vVoxelLight.y), 0.84);\ndiffuseColor.rgb *= max(voxSky, voxBlock);'
          );
      };
    };

    this.opaqueMat = new THREE.MeshBasicMaterial({
      map: atlasTexture,
      vertexColors: true,
      alphaTest: 0.35,
      fog: true
    });
    attachHorizonVoxelShader(this.opaqueMat, 'horizon_voxel_opaque_v2', false);

    this.waterMat = new THREE.MeshBasicMaterial({
      map: atlasTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true
    });
    attachHorizonVoxelShader(this.waterMat, 'horizon_voxel_water_v2', true);

    // Build 3D Block Crack Decal Cube
    const crackGeo = new THREE.BoxGeometry(1.008, 1.008, 1.008);
    const crackMat = new THREE.MeshBasicMaterial({
      map: atlasTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2
    });
    this.crackMesh = new THREE.Mesh(crackGeo, crackMat);
    this.crackMesh.visible = false;
    this.crackMesh.renderOrder = 3;
    this.scene.add(this.crackMesh);

    // Build 3D Drifting Voxel Clouds
    this.buildVoxelClouds();
    this.scene.add(this.cloudGroup);

    this.worker = new Worker(new URL('./chunkWorker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (ev) => this.handleWorkerMessage(ev.data);

    this.loadLocalEdits();
  }

  private buildVoxelClouds() {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xf4f8ff,
      fog: true
    });
    const positions: number[] = [];
    const indices: number[] = [];
    let vc = 0;

    for (let gz = -10; gz <= 10; gz++) {
      for (let gx = -10; gx <= 10; gx++) {
        const n = hash2D(gx * 3, gz * 3, 771) * 0.6 + hash2D(Math.floor(gx / 2), Math.floor(gz / 2), 772) * 0.4;
        if (n < 0.72) continue;
        const x0 = gx * 14;
        const x1 = x0 + 14;
        const z0 = gz * 14;
        const z1 = z0 + 14;
        const y0 = 108;
        const y1 = 111;

        const boxFaces: Array<[[number, number, number], [number, number, number], [number, number, number], [number, number, number]]> = [
          [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
          [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
          [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
          [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]],
          [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]
        ];
        for (const q of boxFaces) {
          const b = vc;
          for (const p of q) positions.push(p[0], p[1], p[2]);
          indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
          vc += 4;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    const mesh = new THREE.Mesh(geo, cloudMat);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.cloudGroup.add(mesh);
  }

  public getBlockVisualBounds(bx: number, by: number, bz: number): { cx: number; cy: number; cz: number; sx: number; sy: number; sz: number } {
    const id = this.getBlock(bx, by, bz);
    const b = getBlock(id);
    if (b.shape === 'slab') return { cx: bx + 0.5, cy: by + 0.25, cz: bz + 0.5, sx: 1, sy: 0.5, sz: 1 };
    if (b.shape === 'lantern') return { cx: bx + 0.5, cy: by + 0.32, cz: bz + 0.5, sx: 0.4, sy: 0.64, sz: 0.4 };
    if (b.shape === 'door_closed') return { cx: bx + 0.5, cy: by + 0.5, cz: bz + 0.5, sx: 1, sy: 1, sz: 0.20 };
    if (b.shape === 'door_open') return { cx: bx + 0.095, cy: by + 0.5, cz: bz + 0.5, sx: 0.20, sy: 1, sz: 1 };
    if (b.shape === 'trapdoor_closed') return { cx: bx + 0.5, cy: by + 0.095, cz: bz + 0.5, sx: 1, sy: 0.20, sz: 1 };
    if (b.shape === 'trapdoor_open') return { cx: bx + 0.5, cy: by + 0.5, cz: bz + 0.095, sx: 1, sy: 1, sz: 0.20 };
    if (b.shape === 'campfire') return { cx: bx + 0.5, cy: by + 0.22, cz: bz + 0.5, sx: 1, sy: 0.44, sz: 1 };
    if (b.shape === 'anvil') return { cx: bx + 0.5, cy: by + 0.5, cz: bz + 0.5, sx: 0.76, sy: 1, sz: 1 };
    if (b.shape === 'enchanting_table') return { cx: bx + 0.5, cy: by + 0.375, cz: bz + 0.5, sx: 1, sy: 0.75, sz: 1 };
    if (b.shape === 'cauldron') return { cx: bx + 0.5, cy: by + 0.5, cz: bz + 0.5, sx: 1, sy: 1, sz: 1 };
    if (b.shape === 'cake') return { cx: bx + 0.5, cy: by + 0.25, cz: bz + 0.5, sx: 0.875, sy: 0.5, sz: 0.875 };
    if (b.shape === 'flower_pot') return { cx: bx + 0.5, cy: by + 0.1875, cz: bz + 0.5, sx: 0.375, sy: 0.375, sz: 0.375 };
    if (b.shape === 'pane') {
      const conn = (nid: number) => {
        const nb = getBlock(nid);
        return nb.shape === 'pane' || (nb.solid && nb.opaque);
      };
      const cW = conn(this.getBlock(bx - 1, by, bz));
      const cE = conn(this.getBlock(bx + 1, by, bz));
      const cN = conn(this.getBlock(bx, by, bz - 1));
      const cS = conn(this.getBlock(bx, by, bz + 1));
      const any = cW || cE || cN || cS;
      const x0 = cW || !any ? 0 : 0.4375;
      const x1 = cE || !any ? 1 : 0.5625;
      const z0 = cN || !any ? 0 : 0.4375;
      const z1 = cS || !any ? 1 : 0.5625;
      return { cx: bx + (x0 + x1) * 0.5, cy: by + 0.5, cz: bz + (z0 + z1) * 0.5, sx: x1 - x0, sy: 1, sz: z1 - z0 };
    }
    if (b.shape === 'fence') {
      const conn = (nid: number) => {
        const nb = getBlock(nid);
        return nb.shape === 'fence' || (nb.solid && nb.opaque);
      };
      const x0 = conn(this.getBlock(bx - 1, by, bz)) ? 0 : 0.35;
      const x1 = conn(this.getBlock(bx + 1, by, bz)) ? 1 : 0.65;
      const z0 = conn(this.getBlock(bx, by, bz - 1)) ? 0 : 0.35;
      const z1 = conn(this.getBlock(bx, by, bz + 1)) ? 1 : 0.65;
      return { cx: bx + (x0 + x1) * 0.5, cy: by + 0.5, cz: bz + (z0 + z1) * 0.5, sx: x1 - x0, sy: 1, sz: z1 - z0 };
    }
    if (id === BLOCK.CHEST) return { cx: bx + 0.5, cy: by + 0.4375, cz: bz + 0.5, sx: 0.875, sy: 0.875, sz: 0.875 };
    if (id === BLOCK.TORCH) return { cx: bx + 0.5, cy: by + 0.34, cz: bz + 0.5, sx: 0.25, sy: 0.68, sz: 0.25 };
    if (id === BLOCK.LEVER_OFF || id === BLOCK.LEVER_ON) {
      return { cx: bx + 0.5, cy: by + 0.26, cz: bz + 0.5, sx: 0.38, sy: 0.52, sz: 0.38 };
    }
    if (b.flatWire) return { cx: bx + 0.5, cy: by + 0.04, cz: bz + 0.5, sx: 0.88, sy: 0.08, sz: 0.88 };
    if (
      id === BLOCK.POPPY ||
      id === BLOCK.DANDELION ||
      id === BLOCK.CORNFLOWER ||
      id === BLOCK.OXEYE_DAISY ||
      id === BLOCK.CHERRY_PETALS
    ) {
      const [ox, oz] = getFloraOffset(bx, bz);
      return { cx: bx + 0.5 + ox, cy: by + 0.36, cz: bz + 0.5 + oz, sx: 0.38, sy: 0.72, sz: 0.38 };
    }
    if (id === BLOCK.TALL_GRASS) {
      const [ox, oz] = getFloraOffset(bx, bz);
      return { cx: bx + 0.5 + ox, cy: by + 0.42, cz: bz + 0.5 + oz, sx: 0.72, sy: 0.84, sz: 0.72 };
    }
    if (b.cross && id !== BLOCK.LADDER) {
      return { cx: bx + 0.5, cy: by + 0.44, cz: bz + 0.5, sx: 0.76, sy: 0.88, sz: 0.76 };
    }
    if (id === BLOCK.BED_BLOCK) return { cx: bx + 0.5, cy: by + 0.28125, cz: bz + 0.5, sx: 1, sy: 0.5625, sz: 1 };
    if (id === BLOCK.DIRT_PATH || id === BLOCK.FARMLAND) return { cx: bx + 0.5, cy: by + 0.46875, cz: bz + 0.5, sx: 1, sy: 0.9375, sz: 1 };
    return { cx: bx + 0.5, cy: by + 0.5, cz: bz + 0.5, sx: 1, sy: 1, sz: 1 };
  }

  public updateBreakCrack(bx: number, by: number, bz: number, progress: number) {
    if (progress <= 0 || progress >= 1) {
      this.crackMesh.visible = false;
      this.crackStage = -1;
      return;
    }
    const stage = Math.min(9, Math.floor(progress * 10));
    const vb = this.getBlockVisualBounds(bx, by, bz);
    this.crackMesh.visible = true;
    this.crackMesh.position.set(vb.cx, vb.cy, vb.cz);
    this.crackMesh.scale.set(vb.sx, vb.sy, vb.sz);

    if (stage !== this.crackStage) {
      this.crackStage = stage;
      this.applyCrackStageUV(this.crackMesh.geometry, stage);
    }
  }

  private applyCrackStageUV(geo: THREE.BufferGeometry, stage: number) {
    const [u0, v0, u1, v1] = getTileUV(TILE.CRACK_0 + Math.max(0, Math.min(9, stage)));
    const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
    for (let f = 0; f < 6; f++) {
      const base = f * 4;
      uvAttr.setXY(base + 0, u0, v1);
      uvAttr.setXY(base + 1, u1, v1);
      uvAttr.setXY(base + 2, u0, v0);
      uvAttr.setXY(base + 3, u1, v0);
    }
    uvAttr.needsUpdate = true;
  }

  public updateRemoteBreakCrack(peerId: string, bx: number, by: number, bz: number, stage: number) {
    if (stage < 0 || stage > 9) {
      this.clearRemoteCrackByPeer(peerId);
      return;
    }
    let entry = this.remoteCracks.get(peerId);
    if (!entry) {
      const crackGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
      const crackMat = new THREE.MeshBasicMaterial({
        map: this.atlasTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2
      });
      const mesh = new THREE.Mesh(crackGeo, crackMat);
      mesh.renderOrder = 3;
      this.scene.add(mesh);
      entry = { mesh, bx, by, bz, stage: -1, ttl: 1.2 };
      this.remoteCracks.set(peerId, entry);
    }
    const vb = this.getBlockVisualBounds(bx, by, bz);
    entry.bx = bx;
    entry.by = by;
    entry.bz = bz;
    entry.ttl = 1.2;
    entry.mesh.visible = true;
    entry.mesh.position.set(vb.cx, vb.cy, vb.cz);
    entry.mesh.scale.set(vb.sx, vb.sy, vb.sz);
    if (entry.stage !== stage) {
      entry.stage = stage;
      this.applyCrackStageUV(entry.mesh.geometry, stage);
    }
  }

  public clearRemoteCrackByPeer(peerId: string) {
    const entry = this.remoteCracks.get(peerId);
    if (entry) {
      this.scene.remove(entry.mesh);
      disposeObject3D(entry.mesh);
      this.remoteCracks.delete(peerId);
    }
  }

  public clearRemoteCracksAt(bx: number, by: number, bz: number) {
    for (const [peerId, entry] of this.remoteCracks.entries()) {
      if (entry.bx === bx && entry.by === by && entry.bz === bz) {
        this.clearRemoteCrackByPeer(peerId);
      }
    }
  }

  private bumpChunkEditSeq(dim: DimensionId, cx: number, cz: number) {
    const sk = `${dim}:${cx},${cz}`;
    this.chunkEditSeq.set(sk, (this.chunkEditSeq.get(sk) || 0) + 1);
  }

  private getChunkEditSeq(dim: DimensionId, cx: number, cz: number): number {
    return this.chunkEditSeq.get(`${dim}:${cx},${cz}`) || 0;
  }

  private enqueueReactionEdit(edit: BlockEdit) {
    this.pendingReactionEdits.push(edit);
    if (!this.reactionFlushScheduled) {
      this.reactionFlushScheduled = true;
      queueMicrotask(() => {
        this.reactionFlushScheduled = false;
        if (this.pendingReactionEdits.length > 0) {
          const batch = this.pendingReactionEdits.splice(0, this.pendingReactionEdits.length);
          this.onLocalBatchEdits?.(batch);
        }
      });
    }
  }

  private key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  private intKey(cx: number, cz: number): number {
    return ((cx & 0xffff) << 16) | (cz & 0xffff);
  }

  private setChunk(k: string, ch: LoadedChunk) {
    this.chunks.set(k, ch);
    this.chunksByInt.set(this.intKey(ch.cx, ch.cz), ch);
    this.lastCx = ch.cx;
    this.lastCz = ch.cz;
    this.lastChunk = ch;
  }

  private deleteChunkEntry(k: string, ch: LoadedChunk) {
    this.chunks.delete(k);
    this.chunksByInt.delete(this.intKey(ch.cx, ch.cz));
    if (this.lastChunk === ch) {
      this.lastChunk = undefined;
      this.lastCx = 999999;
    }
  }

  private clearAllChunkMaps() {
    this.chunks.clear();
    this.chunksByInt.clear();
    this.lastChunk = undefined;
    this.lastCx = 999999;
  }

  private getChunkFast(cx: number, cz: number): LoadedChunk | undefined {
    if (cx === this.lastCx && cz === this.lastCz && this.lastChunk) return this.lastChunk;
    const ch = this.chunksByInt.get(((cx & 0xffff) << 16) | (cz & 0xffff));
    if (ch && ch.cx === cx && ch.cz === cz) {
      this.lastCx = cx;
      this.lastCz = cz;
      this.lastChunk = ch;
      return ch;
    }
    return undefined;
  }

  private activeEdits(): Map<string, BlockEdit> {
    return this.editsByDim[this.dimension];
  }

  private loadLocalEdits() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr: unknown[] = JSON.parse(raw);
      if (!Array.isArray(arr)) return;

      const byDim: Record<DimensionId, BlockEdit[]> = { overworld: [], nether: [], end: [] };
      for (const item of arr) {
        if (!isValidEdit(item)) continue;
        const dim: DimensionId = item.dim === 'nether' || item.dim === 'end' ? item.dim : 'overworld';
        const clean: BlockEdit = { wx: item.wx, y: item.y, wz: item.wz, blockId: item.blockId, dim };
        this.editsByDim[dim].set(`${clean.wx},${clean.y},${clean.wz}`, clean);
        byDim[dim].push(clean);
      }
      for (const dim of ['overworld', 'nether', 'end'] as DimensionId[]) {
        if (byDim[dim].length > 0) {
          this.worker.postMessage({ type: 'syncEdits', dimension: dim, edits: byDim[dim] });
        }
      }
    } catch {
      // Ignore storage parse error
    }
  }

  private saveTimer = 0;
  private scheduleSaveEdits() {
    if (this.saveTimer) return;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = 0;
      try {
        const all: BlockEdit[] = [
          ...this.editsByDim.overworld.values(),
          ...this.editsByDim.nether.values(),
          ...this.editsByDim.end.values()
        ].slice(-5000);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch {
        // Ignore quota limits
      }
    }, 800);
  }

  public getAllEdits(): BlockEdit[] {
    return [
      ...this.editsByDim.overworld.values(),
      ...this.editsByDim.nether.values(),
      ...this.editsByDim.end.values()
    ];
  }

  public setDimension(dim: DimensionId, centerX: number, centerZ: number) {
    if (this.dimension === dim) {
      this.ensureAreaSyncAround(centerX, centerZ);
      return;
    }
    this.dimEpoch++;
    // Settle & clear transient entities BEFORE unloading current dimension chunks!
    this.clearTransientEntities();
    for (const ch of this.chunks.values()) this.disposeChunkMeshes(ch);
    this.clearAllChunkMaps();
    this.pending.clear();
    this.dirtyNeighbors.clear();
    this.remeshPending.clear();
    this.pendingMeshUploads.clear();
    this.fluidQueue.clear();

    this.dimension = dim;
    this.cloudGroup.visible = dim === 'overworld';
    this.ensureAreaSyncAround(centerX, centerZ);
  }

  private clearTransientEntities() {
    for (const p of this.debris) {
      this.releaseChipMesh(p.mesh);
    }
    this.debris = [];
    for (const t of this.primedTnts) { this.scene.remove(t.mesh); disposeObject3D(t.mesh); }
    this.primedTnts = [];
    const fallingList = this.fallingBlocks.splice(0);
    if (fallingList.length > 0) {
      const settledEdits: BlockEdit[] = [];
      for (const f of fallingList) {
        let ry = Math.max(1, Math.min(WORLD_HEIGHT - 2, Math.floor(f.y)));
        while (ry > 1 && !getBlock(this.getBlock(f.wx, ry - 1, f.wz)).solid) {
          ry--;
        }
        if (getBlock(this.getBlock(f.wx, ry - 1, f.wz)).solid && !getBlock(this.getBlock(f.wx, ry, f.wz)).solid && f.blockId !== BLOCK.POINTED_DRIPSTONE) {
          const edit: BlockEdit = { wx: f.wx, y: ry, wz: f.wz, blockId: f.blockId, dim: this.dimension };
          this.activeEdits().set(`${f.wx},${ry},${f.wz}`, edit);
          const cx = Math.floor(f.wx / CHUNK_SIZE);
          const cz = Math.floor(f.wz / CHUNK_SIZE);
          this.bumpChunkEditSeq(this.dimension, cx, cz);
          const ch = this.chunks.get(this.key(cx, cz));
          if (ch) {
            const lx = ((f.wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            const lz = ((f.wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            ch.voxels[chunkIndex(lx, ry, lz)] = f.blockId;
          }
          settledEdits.push(edit);
        }
        this.scene.remove(f.mesh);
        disposeObject3D(f.mesh);
      }
      if (settledEdits.length > 0) {
        this.worker.postMessage({ type: 'syncEdits', dimension: this.dimension, edits: settledEdits });
        this.scheduleSaveEdits();
        this.onLocalBatchEdits?.(settledEdits);
      }
    }
    for (const d of this.droppedItems) { this.scene.remove(d.mesh); disposeObject3D(d.mesh); }
    this.droppedItems = [];
    for (const x of this.xpOrbs) { this.scene.remove(x.mesh); disposeObject3D(x.mesh); }
    this.xpOrbs = [];
    for (const peerId of Array.from(this.remoteCracks.keys())) {
      this.clearRemoteCrackByPeer(peerId);
    }
  }

  public isChunkLoadedAt(wx: number, wz: number): boolean {
    const cx = Math.floor(wx) >> 4;
    const cz = Math.floor(wz) >> 4;
    return this.getChunkFast(cx, cz) !== undefined;
  }

  public ensureSpawnAreaSync() {
    this.ensureAreaSyncAround(0, 6);
  }

  public ensureAreaSyncAround(wx: number, wz: number) {
    const ccx = Math.floor(wx / CHUNK_SIZE);
    const ccz = Math.floor(wz / CHUNK_SIZE);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = ccx + dx;
        const cz = ccz + dz;
        const k = this.key(cx, cz);
        if (!this.chunks.has(k)) {
          const chunkEdits = this.collectChunkEdits(cx, cz);
          const voxels = generateChunkVoxels(cx, cz, chunkEdits, this.dimension);
          const isOuter = dx !== 0 || dz !== 0;
          this.setChunk(k, { cx, cz, voxels, opaqueMesh: null, waterMesh: null, needsSeamFix: isOuter });
        }
      }
    }
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        this.rebuildChunkImmediate(ccx + dx, ccz + dz);
      }
    }
  }

  private collectChunkEdits(cx: number, cz: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    const minX = cx * CHUNK_SIZE, maxX = minX + CHUNK_SIZE;
    const minZ = cz * CHUNK_SIZE, maxZ = minZ + CHUNK_SIZE;
    for (const e of this.activeEdits().values()) {
      if (e.wx >= minX && e.wx < maxX && e.wz >= minZ && e.wz < maxZ && e.y >= 0 && e.y < WORLD_HEIGHT) {
        out.push([chunkIndex(e.wx - minX, e.y, e.wz - minZ), e.blockId]);
      }
    }
    return out;
  }

  public getBlock(wx: number, y: number, wz: number): number {
    if (y < 0) return this.dimension === 'end' ? BLOCK.AIR : BLOCK.BEDROCK;
    const iy = Math.floor(y);
    if (iy >= WORLD_HEIGHT) return BLOCK.AIR;
    const ix = Math.floor(wx);
    const iz = Math.floor(wz);
    const ch = this.getChunkFast(ix >> 4, iz >> 4);
    if (ch) {
      return ch.voxels[(iy << 8) | ((iz & 15) << 4) | (ix & 15)];
    }
    const edits = this.activeEdits();
    if (edits.size > 0) {
      const edit = edits.get(`${ix},${iy},${iz}`);
      if (edit) return edit.blockId;
    }
    return BLOCK.AIR;
  }

  public setBlock(wx: number, y: number, wz: number, blockId: number, spawnDebris = false): boolean {
    if (!Number.isInteger(wx) || !Number.isInteger(y) || !Number.isInteger(wz)) return false;
    if (y < 1 || y >= WORLD_HEIGHT - 1 || !isValidBlockId(blockId)) return false;
    const prev = this.getBlock(wx, y, wz);
    if (prev === BLOCK.BEDROCK || prev === blockId) return false;

    if (spawnDebris && prev !== BLOCK.AIR && !isWaterBlock(prev) && !isLavaBlock(prev)) {
      this.spawnBlockDebris(wx, y, wz, prev);
    }

    const edit: BlockEdit = { wx, y, wz, blockId, dim: this.dimension };
    this.activeEdits().set(`${wx},${y},${wz}`, edit);
    this.worker.postMessage({ type: 'syncEdits', dimension: this.dimension, edits: [edit] });
    this.scheduleSaveEdits();

    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const prevDef = getBlock(prev);
    const nextDef = getBlock(blockId);
    const lightChanged = (prevDef.light || 0) > 0 || (nextDef.light || 0) > 0 || prevDef.opaque !== nextDef.opaque;
    const seamPad = lightChanged ? 14 : 3;
    const nearXNeg = lx <= seamPad;
    const nearXPos = lx >= CHUNK_SIZE - 1 - seamPad;
    const nearZNeg = lz <= seamPad;
    const nearZPos = lz >= CHUNK_SIZE - 1 - seamPad;
    this.bumpChunkEditSeq(this.dimension, cx, cz);
    if (nearXNeg) this.bumpChunkEditSeq(this.dimension, cx - 1, cz);
    if (nearXPos) this.bumpChunkEditSeq(this.dimension, cx + 1, cz);
    if (nearZNeg) this.bumpChunkEditSeq(this.dimension, cx, cz - 1);
    if (nearZPos) this.bumpChunkEditSeq(this.dimension, cx, cz + 1);
    if (nearXNeg && nearZNeg) this.bumpChunkEditSeq(this.dimension, cx - 1, cz - 1);
    if (nearXPos && nearZNeg) this.bumpChunkEditSeq(this.dimension, cx + 1, cz - 1);
    if (nearXNeg && nearZPos) this.bumpChunkEditSeq(this.dimension, cx - 1, cz + 1);
    if (nearXPos && nearZPos) this.bumpChunkEditSeq(this.dimension, cx + 1, cz + 1);

    const ch = this.getChunkFast(cx, cz);
    if (ch) {
      ch.voxels[chunkIndex(lx, y, lz)] = blockId;
      this.rebuildChunkImmediate(cx, cz);
      // Only direct border voxels (0 or 15) affect neighbor face culling/AO immediately; interior light bleed remeshes on worker!
      const immXNeg = lx === 0;
      const immXPos = lx === CHUNK_SIZE - 1;
      const immZNeg = lz === 0;
      const immZPos = lz === CHUNK_SIZE - 1;
      const syncOrQueue = (ncx: number, ncz: number, immediate: boolean) => {
        if (immediate) this.rebuildChunkImmediate(ncx, ncz);
        else this.dirtyNeighbors.add(this.key(ncx, ncz));
      };
      if (nearXNeg) syncOrQueue(cx - 1, cz, immXNeg);
      if (nearXPos) syncOrQueue(cx + 1, cz, immXPos);
      if (nearZNeg) syncOrQueue(cx, cz - 1, immZNeg);
      if (nearZPos) syncOrQueue(cx, cz + 1, immZPos);
      if (nearXNeg && nearZNeg) syncOrQueue(cx - 1, cz - 1, immXNeg && immZNeg);
      if (nearXPos && nearZNeg) syncOrQueue(cx + 1, cz - 1, immXPos && immZNeg);
      if (nearXNeg && nearZPos) syncOrQueue(cx - 1, cz + 1, immXNeg && immZPos);
      if (nearXPos && nearZPos) syncOrQueue(cx + 1, cz + 1, immXPos && immZPos);
    }

    if (blockId === BLOCK.AIR && prev !== BLOCK.AIR) {
      this.onBlockRemovedAt?.(wx, y, wz, prev, true);
    }

    // Trigger local voxel physics (Gravity Sand/Gravel, Unsupported Flora/Torch/Door & Water+Lava Obsidian)
    this.checkNeighborPhysics(wx, y, wz);
    return true;
  }

  private checkNeighborPhysics(wx: number, y: number, wz: number) {
    const cur = this.getBlock(wx, y, wz);

    // 0. If block became non-solid, pop unsupported flora / torches / crops / redstone dust / 2-high doors directly above!
    if (!getBlock(cur).solid && y + 1 < WORLD_HEIGHT - 1) {
      const aboveId = this.getBlock(wx, y + 1, wz);
      const aboveDef = getBlock(aboveId);
      if (aboveId === BLOCK.OAK_DOOR_CLOSED || aboveId === BLOCK.OAK_DOOR_OPEN) {
        this.setBlock(wx, y + 1, wz, BLOCK.AIR, true);
        this.enqueueReactionEdit({ wx, y: y + 1, wz, blockId: BLOCK.AIR, dim: this.dimension });
        const topHalf = this.getBlock(wx, y + 2, wz);
        if (topHalf === BLOCK.OAK_DOOR_CLOSED || topHalf === BLOCK.OAK_DOOR_OPEN) {
          this.setBlock(wx, y + 2, wz, BLOCK.AIR, true);
          this.enqueueReactionEdit({ wx, y: y + 2, wz, blockId: BLOCK.AIR, dim: this.dimension });
        }
        this.spawnItemDrop(wx + 0.5, y + 1.35, wz + 0.5, { id: BLOCK.OAK_DOOR_CLOSED, count: 1 }, 0.25);
      } else {
        const isCeilingStalactite =
          aboveId === BLOCK.POINTED_DRIPSTONE &&
          y + 2 < WORLD_HEIGHT - 1 &&
          getBlock(this.getBlock(wx, y + 2, wz)).solid;
        const needsFloorSupport =
          !isCeilingStalactite &&
          (aboveDef.cross ||
            aboveId === BLOCK.TORCH ||
            aboveId === BLOCK.REDSTONE_DUST_OFF ||
            aboveId === BLOCK.REDSTONE_DUST_ON ||
            aboveId === BLOCK.WHEAT_CROP ||
            aboveId === BLOCK.CAKE ||
            aboveDef.shape === 'flower_pot');
        if (aboveId !== BLOCK.AIR && needsFloorSupport) {
          this.setBlock(wx, y + 1, wz, BLOCK.AIR, true);
          this.enqueueReactionEdit({ wx, y: y + 1, wz, blockId: BLOCK.AIR, dim: this.dimension });
          const poppedDrop = resolveBlockDrop(aboveId, 0);
          if (poppedDrop) {
            this.spawnItemDrop(wx + 0.5, y + 1.25, wz + 0.5, poppedDrop, 0.25);
          }
        }
      }
    }

    // 0b. `speleothem.rs`: If ceiling block became non-solid, drop unsupported hanging Pointed Dripstone stalactite below!
    if (!getBlock(cur).solid && y - 1 >= 1) {
      if (
        this.getBlock(wx, y - 1, wz) === BLOCK.POINTED_DRIPSTONE &&
        !getBlock(this.getBlock(wx, y - 2, wz)).solid
      ) {
        this.spawnFallingBlock(wx, y - 1, wz, BLOCK.POINTED_DRIPSTONE);
      }
    }

    // 1. Sponge Absorption (6-step / 65-block BFS) & Nether Wet Sponge Drying!
    if (cur === BLOCK.WET_SPONGE && this.dimension === 'nether') {
      this.setBlock(wx, y, wz, BLOCK.SPONGE, false);
      this.enqueueReactionEdit({ wx, y, wz, blockId: BLOCK.SPONGE, dim: this.dimension });
      return;
    }
    if (cur === BLOCK.SPONGE) {
      this.tryAbsorbWaterWithSponge(wx, y, wz);
    } else if (isWaterBlock(cur)) {
      const sDirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      for (const [dx, dy, dz] of sDirs) {
        if (this.getBlock(wx + dx, y + dy, wz + dz) === BLOCK.SPONGE) {
          this.tryAbsorbWaterWithSponge(wx + dx, y + dy, wz + dz);
          break;
        }
      }
    }

    // 1b. Check Water + Lava reactions (Obsidian, Cobblestone & Stone Generators!) across ALL 6 neighbors
    const freshCur = this.getBlock(wx, y, wz);
    if (isWaterBlock(freshCur) || isLavaBlock(freshCur)) {
      const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      for (const [dx, dy, dz] of dirs) {
        const nid = this.getBlock(wx + dx, y + dy, wz + dz);
        if (isWaterBlock(freshCur) && isLavaBlock(nid)) {
          const outBlock = nid === BLOCK.LAVA ? BLOCK.OBSIDIAN : BLOCK.COBBLESTONE;
          this.setBlock(wx + dx, y + dy, wz + dz, outBlock, true);
          this.enqueueReactionEdit({ wx: wx + dx, y: y + dy, wz: wz + dz, blockId: outBlock, dim: this.dimension });
        } else if (isLavaBlock(freshCur) && isWaterBlock(nid)) {
          if (dy === -1) {
            // Lava flowing straight down onto Water -> Stone Generator!
            this.setBlock(wx, y - 1, wz, BLOCK.STONE, true);
            this.enqueueReactionEdit({ wx, y: y - 1, wz, blockId: BLOCK.STONE, dim: this.dimension });
          } else {
            const outBlock = freshCur === BLOCK.LAVA ? BLOCK.OBSIDIAN : BLOCK.COBBLESTONE;
            this.setBlock(wx, y, wz, outBlock, true);
            this.enqueueReactionEdit({ wx, y, wz, blockId: outBlock, dim: this.dimension });
            break;
          }
        }
      }
    }

    // 1c. Schedule bounded dynamic fluid flow for edited voxel + 6 neighbors
    this.scheduleFluidNeighborhood(wx, y, wz);

    // 2. Check Gravity blocks (Sand, Red Sand, Gravel) at (wx, y..y+4, wz)
    for (let cy = y; cy <= Math.min(WORLD_HEIGHT - 3, y + 4); cy++) {
      const bid = this.getBlock(wx, cy, wz);
      const def = getBlock(bid);
      if (def.gravity) {
        const below = getBlock(this.getBlock(wx, cy - 1, wz));
        if (!below.solid) {
          this.spawnFallingBlock(wx, cy, wz, bid);
        }
      }
    }
  }

  private spawnFallingBlock(wx: number, y: number, wz: number, blockId: number) {
    this.setBlock(wx, y, wz, BLOCK.AIR, false);
    this.enqueueReactionEdit({ wx, y, wz, blockId: BLOCK.AIR, dim: this.dimension });

    const def = getBlock(blockId);
    let mesh: THREE.Object3D;
    if (def.shape === 'anvil' || blockId === BLOCK.POINTED_DRIPSTONE) {
      mesh = buildMiniBlockMesh(blockId, this.atlasTex, 0.96, true);
    } else {
      const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
      const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
      const [u0, v0, u1, v1] = getTileUV(def.tiles[1]);
      for (let f = 0; f < 6; f++) {
        const b = f * 4;
        uvAttr.setXY(b + 0, u0, v1);
        uvAttr.setXY(b + 1, u1, v1);
        uvAttr.setXY(b + 2, u0, v0);
        uvAttr.setXY(b + 3, u1, v0);
      }
      const mat = new THREE.MeshLambertMaterial({ map: this.atlasTex });
      mesh = new THREE.Mesh(geo, mat);
    }
    mesh.position.set(wx + 0.5, y + 0.5, wz + 0.5);
    this.scene.add(mesh);
    this.fallingBlocks.push({ mesh, blockId, wx, wz, y, startY: y, vy: 0 });
  }

  public tryIgnitePortalAt(wx: number, y: number, wz: number): boolean {
    // Check if (wx, y, wz) is air adjacent to an Obsidian frame along X or Z
    for (const axis of ['x', 'z'] as const) {
      const portalCells: Array<[number, number, number]> = [];
      let valid = true;
      // Search bottom-left corner of interior air box (2x3)
      let minA = 0, maxA = 0, minY = y, maxY = y;
      while (minY > 2 && this.getBlock(wx, minY - 1, wz) === BLOCK.AIR) minY--;
      while (maxY < WORLD_HEIGHT - 4 && this.getBlock(wx, maxY + 1, wz) === BLOCK.AIR && maxY - minY < 4) maxY++;
      if (maxY - minY + 1 < 3) continue;

      const getAt = (a: number, py: number) => axis === 'x' ? this.getBlock(wx + a, py, wz) : this.getBlock(wx, py, wz + a);
      while (minA > -3 && getAt(minA - 1, minY) === BLOCK.AIR) minA--;
      while (maxA < 3 && getAt(maxA + 1, minY) === BLOCK.AIR) maxA++;
      const width = maxA - minA + 1;
      if (width < 2 || width > 3) continue;

      // Verify Obsidian frame around [minA..maxA, minY..maxY]
      for (let a = minA; a <= maxA; a++) {
        if (getAt(a, minY - 1) !== BLOCK.OBSIDIAN || getAt(a, maxY + 1) !== BLOCK.OBSIDIAN) valid = false;
      }
      for (let py = minY; py <= maxY; py++) {
        if (getAt(minA - 1, py) !== BLOCK.OBSIDIAN || getAt(maxA + 1, py) !== BLOCK.OBSIDIAN) valid = false;
        for (let a = minA; a <= maxA; a++) {
          if (getAt(a, py) !== BLOCK.AIR) valid = false;
          portalCells.push(axis === 'x' ? [wx + a, py, wz] : [wx, py, wz + a]);
        }
      }

      if (valid && portalCells.length >= 6) {
        const edits: BlockEdit[] = [];
        for (const [px, py, pz] of portalCells) {
          this.setBlock(px, py, pz, BLOCK.NETHER_PORTAL, false);
          edits.push({ wx: px, y: py, wz: pz, blockId: BLOCK.NETHER_PORTAL, dim: this.dimension });
        }
        this.onLocalBatchEdits?.(edits);
        return true;
      }
    }
    return false;
  }

  public applyRemoteEditsBatch(batch: unknown[], isLiveAction = false, isLocalOrigin = false) {
    if (!Array.isArray(batch) || !batch.length) return;
    const dirtyChunks = new Set<string>();
    const byDim: Record<DimensionId, BlockEdit[]> = { overworld: [], nether: [], end: [] };
    let liveEffectsBudget = 12;

    for (const raw of batch) {
      if (!isValidEdit(raw)) continue;
      const dim: DimensionId = raw.dim === 'nether' || raw.dim === 'end' ? raw.dim : 'overworld';
      const e: BlockEdit = { wx: raw.wx, y: raw.y, wz: raw.wz, blockId: raw.blockId, dim };
      const keyPos = `${e.wx},${e.y},${e.wz}`;
      const existing = this.editsByDim[dim].get(keyPos);
      if (existing && existing.blockId === e.blockId) continue;

      const prevId = dim === this.dimension ? this.getBlock(e.wx, e.y, e.wz) : BLOCK.AIR;

      this.editsByDim[dim].set(keyPos, e);
      byDim[dim].push(e);

      const cx = Math.floor(e.wx / CHUNK_SIZE);
      const cz = Math.floor(e.wz / CHUNK_SIZE);
      const lx = ((e.wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const lz = ((e.wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const prevDef = getBlock(prevId);
      const nextDef = getBlock(e.blockId);
      const lightChanged = (prevDef.light || 0) > 0 || (nextDef.light || 0) > 0 || prevDef.opaque !== nextDef.opaque;
      const seamPad = lightChanged ? 14 : 3;
      const nearXNeg = lx <= seamPad;
      const nearXPos = lx >= CHUNK_SIZE - 1 - seamPad;
      const nearZNeg = lz <= seamPad;
      const nearZPos = lz >= CHUNK_SIZE - 1 - seamPad;
      this.bumpChunkEditSeq(dim, cx, cz);
      if (nearXNeg) this.bumpChunkEditSeq(dim, cx - 1, cz);
      if (nearXPos) this.bumpChunkEditSeq(dim, cx + 1, cz);
      if (nearZNeg) this.bumpChunkEditSeq(dim, cx, cz - 1);
      if (nearZPos) this.bumpChunkEditSeq(dim, cx, cz + 1);
      if (nearXNeg && nearZNeg) this.bumpChunkEditSeq(dim, cx - 1, cz - 1);
      if (nearXPos && nearZNeg) this.bumpChunkEditSeq(dim, cx + 1, cz - 1);
      if (nearXNeg && nearZPos) this.bumpChunkEditSeq(dim, cx - 1, cz + 1);
      if (nearXPos && nearZPos) this.bumpChunkEditSeq(dim, cx + 1, cz + 1);

      if (dim === this.dimension) {
        this.clearRemoteCracksAt(e.wx, e.y, e.wz);
        const ck = this.key(cx, cz);
        const ch = this.chunks.get(ck);
        if (ch) {
          ch.voxels[chunkIndex(lx, e.y, lz)] = e.blockId;
        }
        dirtyChunks.add(ck);
        const immXNeg = lx === 0;
        const immXPos = lx === CHUNK_SIZE - 1;
        const immZNeg = lz === 0;
        const immZPos = lz === CHUNK_SIZE - 1;
        const markNeighbor = (ncx: number, ncz: number, imm: boolean) => {
          const nk = this.key(ncx, ncz);
          if (imm) dirtyChunks.add(nk);
          else this.dirtyNeighbors.add(nk);
        };
        if (nearXNeg) markNeighbor(cx - 1, cz, immXNeg);
        if (nearXPos) markNeighbor(cx + 1, cz, immXPos);
        if (nearZNeg) markNeighbor(cx, cz - 1, immZNeg);
        if (nearZPos) markNeighbor(cx, cz + 1, immZPos);
        if (nearXNeg && nearZNeg) markNeighbor(cx - 1, cz - 1, immXNeg && immZNeg);
        if (nearXPos && nearZNeg) markNeighbor(cx + 1, cz - 1, immXPos && immZNeg);
        if (nearXNeg && nearZPos) markNeighbor(cx - 1, cz + 1, immXNeg && immZPos);
        if (nearXPos && nearZPos) markNeighbor(cx + 1, cz + 1, immXPos && immZPos);

        if (e.blockId === BLOCK.AIR && prevId !== BLOCK.AIR) {
          this.onBlockRemovedAt?.(e.wx, e.y, e.wz, prevId, isLocalOrigin);
        }

        if (isLiveAction && prevId !== e.blockId && liveEffectsBudget > 0) {
          liveEffectsBudget--;
          if (e.blockId === BLOCK.AIR && prevId !== BLOCK.AIR && !getBlock(prevId).liquid) {
            this.spawnBlockDebris(e.wx, e.y, e.wz, prevId);
          }
          this.onRemoteLiveEdit?.(e.wx, e.y, e.wz, prevId, e.blockId);
        }
      }
    }

    let any = false;
    for (const dim of ['overworld', 'nether', 'end'] as DimensionId[]) {
      if (byDim[dim].length > 0) {
        any = true;
        this.worker.postMessage({ type: 'syncEdits', dimension: dim, edits: byDim[dim] });
      }
    }
    if (any) {
      this.scheduleSaveEdits();
      for (const ck of dirtyChunks) {
        const [cx, cz] = ck.split(',').map(Number);
        if (this.chunks.has(ck)) this.rebuildChunkImmediate(cx, cz);
      }
    }
  }

  public igniteTnt(wx: number, y: number, wz: number, isLocal = true, fuse = 2.6) {
    this.setBlock(wx, y, wz, BLOCK.AIR, false);
    if (isLocal) {
      this.onLocalBatchEdits?.([{ wx, y, wz, blockId: BLOCK.AIR, dim: this.dimension }]);
    }
    const mat = new THREE.MeshLambertMaterial({ color: 0xff5544, emissive: 0x551100 });
    const mesh = new THREE.Mesh(this.tntGeo, mat);
    mesh.position.set(wx + 0.5, y + 0.5, wz + 0.5);
    this.scene.add(mesh);
    this.primedTnts.push({
      mesh,
      x: wx + 0.5,
      y: y + 0.5,
      z: wz + 0.5,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 4.2,
      vz: (Math.random() - 0.5) * 1.4,
      timer: fuse,
      isLocal
    });
  }

  private detonateTnt(tnt: PrimedTnt) {
    const cx = Math.floor(tnt.x);
    const cy = Math.floor(tnt.y);
    const cz = Math.floor(tnt.z);
    const radius = 3;
    const batch: BlockEdit[] = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy + dz * dz <= radius * radius + 1) {
            const bx = cx + dx, by = cy + dy, bz = cz + dz;
            if (by <= 1 || by >= WORLD_HEIGHT - 1) continue;
            const cur = this.getBlock(bx, by, bz);
            const curDef = getBlock(cur);
            const blastProof =
              cur === BLOCK.AIR ||
              !Number.isFinite(curDef.hardness) ||
              cur === BLOCK.OBSIDIAN ||
              cur === BLOCK.CRYING_OBSIDIAN ||
              (cur >= BLOCK.RESPAWN_ANCHOR_0 && cur <= BLOCK.RESPAWN_ANCHOR_4) ||
              cur === BLOCK.ANCIENT_DEBRIS ||
              cur === BLOCK.NETHERITE_BLOCK ||
              cur === BLOCK.ENCHANTING_TABLE ||
              cur === BLOCK.NETHER_PORTAL ||
              cur === BLOCK.END_PORTAL;
            if (cur === BLOCK.TNT && tnt.isLocal) {
              // Authoritative chain ignition!
              this.igniteTnt(bx, by, bz, true, 0.55 + Math.random() * 0.45);
            } else if (!blastProof) {
              if (Math.random() < 0.22) this.spawnBlockDebris(bx, by, bz, cur);
              if (tnt.isLocal) {
                batch.push({ wx: bx, y: by, wz: bz, blockId: BLOCK.AIR, dim: this.dimension });
                if (cur === BLOCK.OAK_DOOR_CLOSED || cur === BLOCK.OAK_DOOR_OPEN) {
                  for (const dyDoor of [-1, 1]) {
                    const adj = this.getBlock(bx, by + dyDoor, bz);
                    if (adj === BLOCK.OAK_DOOR_CLOSED || adj === BLOCK.OAK_DOOR_OPEN) {
                      batch.push({ wx: bx, y: by + dyDoor, wz: bz, blockId: BLOCK.AIR, dim: this.dimension });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (tnt.isLocal && batch.length > 0) {
      this.applyRemoteEditsBatch(batch, false, true);
      this.onLocalBatchEdits?.(batch);
    }
    this.onExplosion?.(tnt.x, tnt.y, tnt.z);
  }

  public spawnItemDrop(x: number, y: number, z: number, stack: ItemStack, pickupDelay = 0.35) {
    const def = getItemDef(stack.id);
    let mesh: THREE.Object3D | null = null;

    if (!def.isBlock || def.sprite) {
      mesh = buildExtrudedItemMesh(stack.id, 0.36);
    }
    if (!mesh) {
      mesh = buildMiniBlockMesh(stack.id, this.atlasTex, 0.28, true);
    }

    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.droppedItems.push({
      mesh,
      stack: { ...stack },
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 3.2 + Math.random() * 1.4,
      vz: (Math.random() - 0.5) * 2.4,
      age: 0,
      pickupDelay
    });
  }

  public spawnXpOrbs(x: number, y: number, z: number, totalXp: number) {
    const count = Math.min(5, Math.max(1, Math.ceil(totalXp / 3)));
    const each = Math.max(1, Math.round(totalXp / count));
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.xpGeo, this.xpMat);
      m.position.set(x, y, z);
      this.scene.add(m);
      this.xpOrbs.push({
        mesh: m,
        value: each,
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 3.0,
        vy: 3.5 + Math.random() * 1.8,
        vz: (Math.random() - 0.5) * 3.0,
        age: 0
      });
    }
  }

  public vacuumDropsToward(px: number, py: number, pz: number, radius: number): number {
    let pulled = 0;
    const r2 = radius * radius;
    for (let i = 0; i < this.droppedItems.length; i++) {
      const it = this.droppedItems[i];
      const dx = px - it.x;
      const dy = py + 0.5 - it.y;
      const dz = pz - it.z;
      if (dx * dx + dy * dy + dz * dz <= r2) {
        it.pickupDelay = 0;
        it.x = px;
        it.y = py + 0.45;
        it.z = pz;
        it.mesh.position.set(it.x, it.y, it.z);
        pulled++;
      }
    }
    for (let i = 0; i < this.xpOrbs.length; i++) {
      const orb = this.xpOrbs[i];
      const dx = px - orb.x;
      const dy = py + 0.5 - orb.y;
      const dz = pz - orb.z;
      if (dx * dx + dy * dy + dz * dz <= r2) {
        orb.x = px;
        orb.y = py + 0.45;
        orb.z = pz;
        orb.mesh.position.set(orb.x, orb.y, orb.z);
        pulled++;
      }
    }
    return pulled;
  }

  private createTexturedChipMesh(blockId: number, size: number): THREE.Mesh {
    const def = getBlock(blockId);
    const tile = def.tiles[1] ?? def.tiles[0];
    const [u0, v0, u1, v1] = getTileUV(tile);
    const du = u1 - u0;
    const dv = v1 - v0;
    const ox = Math.floor(Math.random() * 12) / 16;
    const oy = Math.floor(Math.random() * 12) / 16;
    const su0 = u0 + du * ox;
    const su1 = u0 + du * (ox + 4 / 16);
    const sv0 = v0 + dv * oy;
    const sv1 = v0 + dv * (oy + 4 / 16);

    let mesh = this.debrisPool.pop();
    if (!mesh) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      mesh = new THREE.Mesh(geo, this.chipMat);
    }
    mesh.scale.setScalar(size);
    mesh.rotation.set(0, 0, 0);
    const uvAttr = mesh.geometry.attributes.uv as THREE.BufferAttribute;
    for (let f = 0; f < 6; f++) {
      const base = f * 4;
      uvAttr.setXY(base + 0, su0, sv1);
      uvAttr.setXY(base + 1, su1, sv1);
      uvAttr.setXY(base + 2, su0, sv0);
      uvAttr.setXY(base + 3, su1, sv0);
    }
    uvAttr.needsUpdate = true;
    return mesh;
  }

  private releaseChipMesh(mesh: THREE.Mesh) {
    this.scene.remove(mesh);
    if (this.debrisPool.length < 72) {
      this.debrisPool.push(mesh);
    } else {
      disposeObject3D(mesh);
    }
  }

  public spawnMiningChips(
    wx: number,
    y: number,
    wz: number,
    nx: number,
    ny: number,
    nz: number,
    blockId: number,
    count = 3
  ) {
    if (blockId <= 0 || this.debris.length > 180) return;
    for (let i = 0; i < count; i++) {
      const m = this.createTexturedChipMesh(blockId, 0.11);
      const jx = nx !== 0 ? nx * 0.54 : (Math.random() - 0.5) * 0.7;
      const jy = ny !== 0 ? ny * 0.54 : (Math.random() - 0.5) * 0.7;
      const jz = nz !== 0 ? nz * 0.54 : (Math.random() - 0.5) * 0.7;
      m.position.set(wx + 0.5 + jx, y + 0.5 + jy, wz + 0.5 + jz);
      this.scene.add(m);
      this.debris.push({
        mesh: m,
        vx: nx * 1.9 + (Math.random() - 0.5) * 2.2,
        vy: Math.max(0.8, ny * 2.1 + 1.4 + Math.random() * 1.6),
        vz: nz * 1.9 + (Math.random() - 0.5) * 2.2,
        life: 0.28 + Math.random() * 0.22
      });
    }
  }

  public spawnBlockDebris(wx: number, y: number, wz: number, blockId: number) {
    if (blockId <= 0 || this.debris.length > 180) return;
    for (let i = 0; i < 10; i++) {
      const m = this.createTexturedChipMesh(blockId, 0.15);
      m.position.set(
        wx + 0.18 + Math.random() * 0.64,
        y + 0.18 + Math.random() * 0.64,
        wz + 0.18 + Math.random() * 0.64
      );
      this.scene.add(m);
      this.debris.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 4.2,
        vy: 1.8 + Math.random() * 3.2,
        vz: (Math.random() - 0.5) * 4.2,
        life: 0.42 + Math.random() * 0.35
      });
    }
  }

  public update(dt: number, playerX: number, playerY: number, playerZ: number, isRaining = false) {
    this.voxelUniforms.uTime.value = (this.voxelUniforms.uTime.value + dt) % 6283.185;
    // 0. Drift Overworld 3D Voxel Clouds, Run Random World Ticks & Expire Remote Mining Cracks
    if (this.dimension === 'overworld') {
      this.cloudDrift = (this.cloudDrift + dt * 1.4) % 24;
      const snapX = Math.floor(playerX / 24) * 24;
      const snapZ = Math.floor(playerZ / 24) * 24;
      this.cloudGroup.position.set(snapX + this.cloudDrift, 0, snapZ);

      this.randomTickClock += dt;
      if (this.randomTickClock >= 1.1) {
        this.randomTickClock = 0;
        this.runRandomWorldTicks(playerX, playerY, playerZ, isRaining);
      }
    }
    for (const [peerId, entry] of this.remoteCracks.entries()) {
      entry.ttl -= dt;
      if (entry.ttl <= 0) {
        this.clearRemoteCrackByPeer(peerId);
      }
    }

    // 1. Stream chunks radially around player (using precomputed sorted radial offsets — zero per-frame sort!)
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);
    const rd = this.renderDistance;
    if (rd !== this.cachedRadialRd) {
      this.cachedRadialRd = rd;
      const tmp: Array<[number, number, number]> = [];
      for (let dz = -rd; dz <= rd; dz++) {
        for (let dx = -rd; dx <= rd; dx++) {
          const d2 = dx * dx + dz * dz;
          if (d2 <= rd * rd + 1) tmp.push([dx, dz, d2]);
        }
      }
      tmp.sort((a, b) => a[2] - b[2]);
      this.radialOffsets = tmp.map(([dx, dz]) => [dx, dz]);
    }

    let queuedThisFrame = 0;
    for (let i = 0; i < this.radialOffsets.length; i++) {
      const off = this.radialOffsets[i];
      const cx = pcx + off[0];
      const cz = pcz + off[1];
      const k = this.key(cx, cz);
      if (!this.chunks.has(k) && !this.pending.has(k)) {
        this.pending.add(k);
        this.worker.postMessage({
          type: 'buildChunk',
          dimension: this.dimension,
          dimEpoch: this.dimEpoch,
          editSeq: this.getChunkEditSeq(this.dimension, cx, cz),
          cx,
          cz,
          reqId: ++this.reqCounter
        });
        if (++queuedThisFrame >= 3) break;
      }
    }

    // Dispatch dirty neighbor seam/light rebuilds asynchronously to the Web Worker (0.0ms main-thread stall!)
    let queuedSeam = 0;
    for (const nk of this.dirtyNeighbors) {
      this.dirtyNeighbors.delete(nk);
      const nch = this.chunks.get(nk);
      if (nch && !this.remeshPending.has(nk) && !this.pending.has(nk)) {
        this.remeshPending.add(nk);
        this.worker.postMessage({
          type: 'remeshChunk',
          dimension: this.dimension,
          dimEpoch: this.dimEpoch,
          editSeq: this.getChunkEditSeq(this.dimension, nch.cx, nch.cz),
          cx: nch.cx,
          cz: nch.cz
        });
        if (++queuedSeam >= 4) break;
      }
    }

    // Unload far chunks
    const unloadDist2 = (rd + 2) * (rd + 2);
    for (const [k, ch] of this.chunks.entries()) {
      const dx = ch.cx - pcx;
      const dz = ch.cz - pcz;
      if (dx * dx + dz * dz > unloadDist2) {
        this.disposeChunkMeshes(ch);
        this.deleteChunkEntry(k, ch);
        this.remeshPending.delete(k);
        this.pendingMeshUploads.delete(k);
      }
    }

    // Drain up to 2 worker-built chunk meshes per frame so GPU uploads never cause a frame spike!
    if (this.pendingMeshUploads.size > 0) {
      let uploaded = 0;
      for (const [uk, item] of this.pendingMeshUploads.entries()) {
        this.pendingMeshUploads.delete(uk);
        if (this.chunks.get(uk) === item.ch) {
          this.applyMeshPayload(item.ch, item.mesh);
        }
        if (++uploaded >= 2) break;
      }
    }

    // 2. Update scheduled Fluid Flow & Lava/Water Generators
    this.stepFluidSimulation(dt);

    // 2b. Update debris particles
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const p = this.debris[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.releaseChipMesh(p.mesh);
        this.debris.splice(i, 1);
        continue;
      }
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += 5 * dt;
      p.mesh.rotation.y += 4 * dt;
    }

    // 3. Update Gravity Falling Sand/Gravel (sorted bottom-up + swept so stacks never overlap or tunnel!)
    if (this.fallingBlocks.length > 1) {
      this.fallingBlocks.sort((a, b) => a.y - b.y);
    }
    for (let i = 0; i < this.fallingBlocks.length; i++) {
      const f = this.fallingBlocks[i];
      f.vy = Math.max(-28, f.vy - 22 * dt);
      const steps = Math.max(1, Math.ceil(Math.abs(f.vy * dt) / 0.45));
      const stepDy = (f.vy * dt) / steps;
      let landed = false;
      for (let s = 0; s < steps; s++) {
        const nextY = f.y + stepDy;
        if (nextY < -16) {
          this.scene.remove(f.mesh);
          disposeObject3D(f.mesh);
          this.fallingBlocks.splice(i, 1);
          i--;
          landed = true;
          break;
        }
        const targetY = Math.floor(nextY);
        const below = getBlock(this.getBlock(f.wx, targetY, f.wz));
        if (below.solid) {
          let restY = Math.max(1, targetY + 1);
          while (restY < WORLD_HEIGHT - 2 && getBlock(this.getBlock(f.wx, restY, f.wz)).solid) {
            restY++;
          }
          const displaced = this.getBlock(f.wx, restY, f.wz);
          if (displaced !== BLOCK.AIR && !getBlock(displaced).liquid) {
            const dDrop = resolveBlockDrop(displaced, 0);
            if (dDrop) this.spawnItemDrop(f.wx + 0.5, restY + 0.3, f.wz + 0.5, dDrop);
          }
          this.scene.remove(f.mesh);
          disposeObject3D(f.mesh);
          this.fallingBlocks.splice(i, 1);
          i--;
          if (f.blockId === BLOCK.POINTED_DRIPSTONE) {
            this.spawnBlockDebris(f.wx, restY, f.wz, BLOCK.POINTED_DRIPSTONE);
            this.spawnItemDrop(f.wx + 0.5, restY + 0.3, f.wz + 0.5, { id: BLOCK.POINTED_DRIPSTONE, count: 1 }, 0.25);
            this.onAnvilLand?.(f.wx, restY, f.wz, Math.max(0, f.startY - restY));
          } else {
            this.setBlock(f.wx, restY, f.wz, f.blockId, false);
            this.onLocalBatchEdits?.([{ wx: f.wx, y: restY, wz: f.wz, blockId: f.blockId, dim: this.dimension }]);
            if (f.blockId === BLOCK.ANVIL) {
              this.onAnvilLand?.(f.wx, restY, f.wz, Math.max(0, f.startY - restY));
            }
          }
          landed = true;
          break;
        }
        f.y = nextY;
      }
      if (!landed) {
        f.mesh.position.set(f.wx + 0.5, f.y + 0.5, f.wz + 0.5);
      }
    }

    // 4. Update Primed TNTs (with X/Z velocity, ceiling check & Slime bounce!)
    for (let i = this.primedTnts.length - 1; i >= 0; i--) {
      const t = this.primedTnts[i];
      t.timer -= dt;
      t.vy -= 16 * dt;

      const nx = t.x + t.vx * dt;
      if (!getBlock(this.getBlock(Math.floor(nx), Math.floor(t.y), Math.floor(t.z))).solid) {
        t.x = nx;
      } else {
        t.vx *= -0.4;
      }
      const nz = t.z + t.vz * dt;
      if (!getBlock(this.getBlock(Math.floor(t.x), Math.floor(t.y), Math.floor(nz))).solid) {
        t.z = nz;
      } else {
        t.vz *= -0.4;
      }

      const nextY = t.y + t.vy * dt;
      if (t.vy > 0 && getBlock(this.getBlock(Math.floor(t.x), Math.floor(nextY + 0.48), Math.floor(t.z))).solid) {
        t.vy = 0;
      } else {
        const floorBlock = getBlock(this.getBlock(Math.floor(t.x), Math.floor(nextY - 0.5), Math.floor(t.z)));
        if (floorBlock.solid && t.vy <= 0) {
          if (floorBlock.bounce && Math.abs(t.vy) > 1.5) {
            t.vy = Math.abs(t.vy) * floorBlock.bounce;
          } else {
            t.vy = 0;
            t.vx *= 0.82;
            t.vz *= 0.82;
          }
        } else {
          t.y = nextY;
        }
      }

      t.mesh.position.set(t.x, t.y, t.z);
      const flash = Math.floor(t.timer * 10) % 2 === 0;
      const mat = t.mesh.material as THREE.MeshLambertMaterial;
      mat.color.setHex(flash ? 0xffffff : 0xff3b30);
      t.mesh.scale.setScalar(1 + Math.max(0, (0.5 - t.timer) * 0.35));

      if (t.timer <= 0) {
        this.scene.remove(t.mesh);
        disposeObject3D(t.mesh);
        this.primedTnts.splice(i, 1);
        this.detonateTnt(t);
      }
    }

    // 5. Update 3D Dropped Items, Nearby Stack Merging, Lava Burn & Magnetic Player Pickup
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const d = this.droppedItems[i];
      d.age += dt;
      if (d.age > 120) {
        this.scene.remove(d.mesh);
        disposeObject3D(d.mesh);
        this.droppedItems.splice(i, 1);
        continue;
      }

      const cellId = this.getBlock(Math.floor(d.x), Math.floor(d.y), Math.floor(d.z));
      if (isLavaBlock(cellId) || cellId === BLOCK.CAULDRON_LAVA) {
        const def = getItemDef(d.stack.id);
        const fireproof =
          def.tier === 5 ||
          def.key.includes('netherite') ||
          d.stack.id === BLOCK.ANCIENT_DEBRIS ||
          d.stack.id === BLOCK.NETHERITE_BLOCK;
        if (fireproof) {
          d.vy = Math.min(2.2, d.vy + 24 * dt);
          d.vx *= 0.88;
          d.vz *= 0.88;
        } else {
          this.scene.remove(d.mesh);
          disposeObject3D(d.mesh);
          this.droppedItems.splice(i, 1);
          continue;
        }
      } else if (isWaterBlock(cellId)) {
        d.vy = Math.min(1.6, d.vy + 21 * dt);
        d.vx *= 0.9;
        d.vz *= 0.9;
      } else {
        d.vy -= 18 * dt;
      }

      const ny = d.y + d.vy * dt;
      if (getBlock(this.getBlock(Math.floor(d.x), Math.floor(ny - 0.16), Math.floor(d.z))).solid) {
        d.vy = Math.abs(d.vy) > 2.2 ? Math.abs(d.vy) * 0.3 : 0;
        d.vx *= 0.8;
        d.vz *= 0.8;
      } else {
        d.y = ny;
      }
      const nx = d.x + d.vx * dt;
      if (!getBlock(this.getBlock(Math.floor(nx), Math.floor(d.y), Math.floor(d.z))).solid) {
        d.x = nx;
      } else {
        d.vx *= -0.35;
      }
      const nz = d.z + d.vz * dt;
      if (!getBlock(this.getBlock(Math.floor(d.x), Math.floor(d.y), Math.floor(nz))).solid) {
        d.z = nz;
      } else {
        d.vz *= -0.35;
      }

      // Vanilla ground stack clumping: merge compatible nearby drops within 1.15m
      if (d.age > 0.35 && !d.stack.damage && !d.stack.ench && !d.stack.loaded) {
        const maxSt = getItemDef(d.stack.id).maxStack;
        if (maxSt > 1 && d.stack.count < maxSt) {
          let mergedIntoOther = false;
          for (let j = i - 1; j >= 0; j--) {
            const other = this.droppedItems[j];
            if (
              other.stack.id === d.stack.id &&
              !other.stack.damage &&
              !other.stack.ench &&
              !other.stack.loaded &&
              other.stack.count < maxSt
            ) {
              const mdx = other.x - d.x;
              const mdy = other.y - d.y;
              const mdz = other.z - d.z;
              if (mdx * mdx + mdy * mdy + mdz * mdz < 1.32) {
                const take = Math.min(maxSt - other.stack.count, d.stack.count);
                other.stack.count += take;
                d.stack.count -= take;
                if (d.stack.count <= 0) {
                  this.scene.remove(d.mesh);
                  disposeObject3D(d.mesh);
                  this.droppedItems.splice(i, 1);
                  mergedIntoOther = true;
                  break;
                }
              }
            }
          }
          if (mergedIntoOther) continue;
        }
      }

      // Magnetic pull toward player feet/waist
      const dx = playerX - d.x;
      const dy = (playerY + 0.8) - d.y;
      const dz = playerZ - d.z;
      const dist = Math.hypot(dx, dy, dz);
      if (d.age >= d.pickupDelay && dist < 2.2) {
        const pull = (2.2 - dist) * 7.5 * dt;
        d.x += (dx / Math.max(0.1, dist)) * pull;
        d.y += (dy / Math.max(0.1, dist)) * pull;
        d.z += (dz / Math.max(0.1, dist)) * pull;
        if (dist < 0.85 && (!this.onPickupItem || this.onPickupItem(d.stack))) {
          this.scene.remove(d.mesh);
          disposeObject3D(d.mesh);
          this.droppedItems.splice(i, 1);
          continue;
        }
      }

      d.mesh.position.set(d.x, d.y + Math.sin(d.age * 3.2) * 0.07 + 0.08, d.z);
      d.mesh.rotation.y += 1.9 * dt;
    }

    // 6. Update Green XP Orbs
    for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
      const orb = this.xpOrbs[i];
      orb.age += dt;
      if (orb.age > 60) {
        this.scene.remove(orb.mesh);
        disposeObject3D(orb.mesh);
        this.xpOrbs.splice(i, 1);
        continue;
      }
      orb.vy -= 14 * dt;
      const ny = orb.y + orb.vy * dt;
      if (getBlock(this.getBlock(Math.floor(orb.x), Math.floor(ny - 0.12), Math.floor(orb.z))).solid) {
        orb.vy = 0;
        orb.vx *= 0.82;
        orb.vz *= 0.82;
      } else {
        orb.y = ny;
      }
      const onx = orb.x + orb.vx * dt;
      if (!getBlock(this.getBlock(Math.floor(onx), Math.floor(orb.y), Math.floor(orb.z))).solid) {
        orb.x = onx;
      } else {
        orb.vx *= -0.35;
      }
      const onz = orb.z + orb.vz * dt;
      if (!getBlock(this.getBlock(Math.floor(orb.x), Math.floor(orb.y), Math.floor(onz))).solid) {
        orb.z = onz;
      } else {
        orb.vz *= -0.35;
      }

      const dx = playerX - orb.x;
      const dy = (playerY + 0.9) - orb.y;
      const dz = playerZ - orb.z;
      const dist = Math.hypot(dx, dy, dz);
      if (orb.age > 0.25 && dist < 3.4) {
        orb.x += (dx / Math.max(0.1, dist)) * 8.5 * dt;
        orb.y += (dy / Math.max(0.1, dist)) * 8.5 * dt;
        orb.z += (dz / Math.max(0.1, dist)) * 8.5 * dt;
        if (dist < 0.85) {
          this.onPickupXp?.(orb.value);
          this.scene.remove(orb.mesh);
          disposeObject3D(orb.mesh);
          this.xpOrbs.splice(i, 1);
          continue;
        }
      }
      orb.mesh.position.set(orb.x, orb.y + Math.sin(orb.age * 5) * 0.05 + 0.08, orb.z);
      const pulse = 0.85 + Math.sin(orb.age * 9) * 0.2;
      orb.mesh.scale.setScalar(pulse);
    }
  }

  private runRandomWorldTicks(playerX: number, playerY: number, playerZ: number, isRaining = false) {
    const baseX = Math.floor(playerX);
    const baseY = Math.floor(playerY);
    const baseZ = Math.floor(playerZ);
    const batch: BlockEdit[] = [];

    const isLog = (id: number) =>
      id === BLOCK.OAK_LOG ||
      id === BLOCK.BIRCH_LOG ||
      id === BLOCK.SPRUCE_LOG ||
      id === BLOCK.CHERRY_LOG ||
      id === BLOCK.ACACIA_LOG;

    const isLeaf = (id: number) =>
      id === BLOCK.OAK_LEAVES ||
      id === BLOCK.BIRCH_LEAVES ||
      id === BLOCK.SPRUCE_LEAVES ||
      id === BLOCK.CHERRY_LEAVES ||
      id === BLOCK.ACACIA_LEAVES;

    for (let t = 0; t < 14; t++) {
      const wx = baseX + Math.floor((Math.random() - 0.5) * 40);
      const wz = baseZ + Math.floor((Math.random() - 0.5) * 40);
      const y = Math.max(2, Math.min(WORLD_HEIGHT - 3, baseY + Math.floor((Math.random() - 0.4) * 20)));
      if (!this.isChunkLoadedAt(wx, wz)) continue;

      const id = this.getBlock(wx, y, wz);
      if (id === BLOCK.AIR) continue;

      // 1. Dirt -> Grass spread in light, Grass -> Dirt under opaque cover
      if (id === BLOCK.DIRT && !getBlock(this.getBlock(wx, y + 1, wz)).opaque && this.getBlock(wx, y + 1, wz) !== BLOCK.WATER) {
        let nearGrass = false;
        for (let dy = -1; dy <= 1 && !nearGrass; dy++) {
          for (let dz = -1; dz <= 1 && !nearGrass; dz++) {
            for (let dx = -1; dx <= 1 && !nearGrass; dx++) {
              if (this.getBlock(wx + dx, y + dy, wz + dz) === BLOCK.GRASS) nearGrass = true;
            }
          }
        }
        if (nearGrass && this.setBlock(wx, y, wz, BLOCK.GRASS, false)) {
          batch.push({ wx, y, wz, blockId: BLOCK.GRASS, dim: this.dimension });
        }
      } else if (id === BLOCK.GRASS && getBlock(this.getBlock(wx, y + 1, wz)).opaque) {
        if (this.setBlock(wx, y, wz, BLOCK.DIRT, false)) {
          batch.push({ wx, y, wz, blockId: BLOCK.DIRT, dim: this.dimension });
        }
      } else if (isLeaf(id) && !this.hasPlayerPlacedBlockAt(this.dimension, wx, y, wz)) {
        // 2. Orphan Tree Leaf Decay when trunk logs within 4 blocks are chopped down!
        let foundTrunk = false;
        for (let dy = -4; dy <= 4 && !foundTrunk; dy++) {
          for (let dz = -4; dz <= 4 && !foundTrunk; dz++) {
            for (let dx = -4; dx <= 4 && !foundTrunk; dx++) {
              if (isLog(this.getBlock(wx + dx, y + dy, wz + dz))) foundTrunk = true;
            }
          }
        }
        if (!foundTrunk && this.setBlock(wx, y, wz, BLOCK.AIR, true)) {
          batch.push({ wx, y, wz, blockId: BLOCK.AIR, dim: this.dimension });
          if (id === BLOCK.OAK_LEAVES && Math.random() < 0.08) {
            this.spawnItemDrop(wx + 0.5, y + 0.3, wz + 0.5, { id: ITEM.APPLE, count: 1 });
          }
        }
      } else if (
        (id === BLOCK.COPPER_BLOCK || id === BLOCK.EXPOSED_COPPER || id === BLOCK.WEATHERED_COPPER) &&
        this.hasPlayerPlacedBlockAt(this.dimension, wx, y, wz) &&
        Math.random() < 0.08
      ) {
        // 3. Natural Copper Oxidation (#15835)
        const nextStage =
          id === BLOCK.COPPER_BLOCK
            ? BLOCK.EXPOSED_COPPER
            : id === BLOCK.EXPOSED_COPPER
              ? BLOCK.WEATHERED_COPPER
              : BLOCK.OXIDIZED_COPPER;
        if (this.setBlock(wx, y, wz, nextStage, false)) {
          batch.push({ wx, y, wz, blockId: nextStage, dim: this.dimension });
        }
      } else if (id === BLOCK.CAULDRON_EMPTY && isRaining && this.dimension === 'overworld' && Math.random() < 0.18) {
        // 4. Rain naturally fills open-sky Empty Cauldrons in rainy Overworld biomes (`cauldrons.rs`)!
        const colBiome = sampleColumnInfo(wx, wz, 'overworld').biome;
        const canRainHere =
          colBiome !== 'Altın Çöl' &&
          colBiome !== 'Kızıl Kanyon' &&
          colBiome !== 'Savan Düzlüğü' &&
          colBiome !== 'Karlı Zirveler';
        if (canRainHere) {
          let skyOpen = true;
          for (let cy = y + 1; cy < WORLD_HEIGHT - 1; cy++) {
            if (getBlock(this.getBlock(wx, cy, wz)).solid) {
              skyOpen = false;
              break;
            }
          }
          if (skyOpen && this.setBlock(wx, y, wz, BLOCK.CAULDRON_WATER, false)) {
            batch.push({ wx, y, wz, blockId: BLOCK.CAULDRON_WATER, dim: this.dimension });
          }
        }
      } else if (
        id === BLOCK.POINTED_DRIPSTONE &&
        getBlock(this.getBlock(wx, y + 1, wz)).solid &&
        Math.random() < 0.25
      ) {
        // 5. `speleothem.rs`: Stalactite under Water/Lava-covered solid ceiling drips into Empty Cauldron below!
        const aboveFluid = this.getBlock(wx, y + 2, wz);
        if (isWaterBlock(aboveFluid) || isLavaBlock(aboveFluid)) {
          for (let cy = y - 1; cy >= Math.max(1, y - 9); cy--) {
            const bid = this.getBlock(wx, cy, wz);
            if (bid === BLOCK.AIR) continue;
            if (bid === BLOCK.CAULDRON_EMPTY) {
              const targetCauldron = isWaterBlock(aboveFluid) ? BLOCK.CAULDRON_WATER : BLOCK.CAULDRON_LAVA;
              if (this.setBlock(wx, cy, wz, targetCauldron, false)) {
                batch.push({ wx, y: cy, wz, blockId: targetCauldron, dim: this.dimension });
              }
            }
            break;
          }
        }
      }
    }

    if (batch.length > 0) {
      this.onLocalBatchEdits?.(batch);
    }
  }

  private tryAbsorbWaterWithSponge(sx: number, sy: number, sz: number): boolean {
    const visited = new Set<string>([`${sx},${sy},${sz}`]);
    const queue: Array<[number, number, number, number]> = [[sx, sy, sz, 0]];
    const removed: Array<[number, number, number]> = [];
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    let head = 0;

    while (head < queue.length && removed.length < 65) {
      const [x, y, z, depth] = queue[head++];
      if (depth >= 6) continue;
      for (const [dx, dy, dz] of dirs) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (ny < 1 || ny >= WORLD_HEIGHT - 1) continue;
        const k = `${nx},${ny},${nz}`;
        if (visited.has(k)) continue;
        visited.add(k);
        const nid = this.getBlock(nx, ny, nz);
        if (isWaterBlock(nid)) {
          removed.push([nx, ny, nz]);
          queue.push([nx, ny, nz, depth + 1]);
          if (removed.length >= 65) break;
        }
      }
    }

    if (removed.length === 0) return false;
    this.setBlock(sx, sy, sz, BLOCK.WET_SPONGE, false);
    this.enqueueReactionEdit({ wx: sx, y: sy, wz: sz, blockId: BLOCK.WET_SPONGE, dim: this.dimension });
    for (const [rx, ry, rz] of removed) {
      if (this.setBlock(rx, ry, rz, BLOCK.AIR, false)) {
        this.enqueueReactionEdit({ wx: rx, y: ry, wz: rz, blockId: BLOCK.AIR, dim: this.dimension });
      }
    }
    return true;
  }

  private scheduleFluidTick(wx: number, y: number, wz: number, delaySec = 0.24) {
    if (y < 1 || y >= WORLD_HEIGHT - 1 || this.fluidQueue.size > 2048) return;
    const k = `${wx},${y},${wz}`;
    const due = this.fluidClock + delaySec;
    const existing = this.fluidQueue.get(k);
    if (!existing || due < existing.due) {
      this.fluidQueue.set(k, { wx, y, wz, due });
    }
  }

  private scheduleFluidNeighborhood(wx: number, y: number, wz: number) {
    const coords: Array<[number, number, number]> = [
      [wx, y, wz],
      [wx + 1, y, wz],
      [wx - 1, y, wz],
      [wx, y + 1, wz],
      [wx, y - 1, wz],
      [wx, y, wz + 1],
      [wx, y, wz - 1]
    ];
    for (const [cx, cy, cz] of coords) {
      if (cy < 1 || cy >= WORLD_HEIGHT - 1) continue;
      const id = this.getBlock(cx, cy, cz);
      if (isLavaBlock(id)) {
        this.scheduleFluidTick(cx, cy, cz, 0.58);
      } else if (isWaterBlock(id) || id === BLOCK.AIR) {
        this.scheduleFluidTick(cx, cy, cz, 0.22);
      }
    }
  }

  private stepFluidSimulation(dt: number) {
    if (this.fluidQueue.size === 0) return;
    this.fluidClock += dt;
    const ready: Array<{ wx: number; y: number; wz: number }> = [];
    for (const [k, item] of this.fluidQueue.entries()) {
      if (item.due <= this.fluidClock) {
        this.fluidQueue.delete(k);
        ready.push(item);
        if (ready.length >= 24) break;
      }
    }

    const cardinals: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (const { wx, y, wz } of ready) {
      if (!this.isChunkLoadedAt(wx, wz)) continue;
      const cur = this.getBlock(wx, y, wz);

      // 1. Authentic 2x2 Infinite Water Source Formation (Overworld / End)
      if ((cur === BLOCK.AIR || cur === BLOCK.FLOWING_WATER) && this.dimension !== 'nether') {
        const belowId = this.getBlock(wx, y - 1, wz);
        if (getBlock(belowId).solid || isWaterBlock(belowId)) {
          let adjSources = 0;
          for (const [dx, dz] of cardinals) {
            if (this.getBlock(wx + dx, y, wz + dz) === BLOCK.WATER) adjSources++;
          }
          if (adjSources >= 2) {
            if (this.setBlock(wx, y, wz, BLOCK.WATER, false)) {
              this.enqueueReactionEdit({ wx, y, wz, blockId: BLOCK.WATER, dim: this.dimension });
            }
            continue;
          }
        }
      }

      // 2. Orphan Flowing Water Drainage
      if (cur === BLOCK.FLOWING_WATER) {
        const aboveWater = isWaterBlock(this.getBlock(wx, y + 1, wz));
        let horizSupported = false;
        if (!aboveWater) {
          for (const [dx, dz] of cardinals) {
            const nid = this.getBlock(wx + dx, y, wz + dz);
            const nBelow = this.getBlock(wx + dx, y - 1, wz + dz);
            if (nid === BLOCK.WATER && (getBlock(nBelow).solid || isWaterBlock(nBelow))) {
              horizSupported = true;
              break;
            }
            if (nid === BLOCK.FLOWING_WATER && isWaterBlock(this.getBlock(wx + dx, y + 1, wz + dz)) && getBlock(nBelow).solid) {
              horizSupported = true;
              break;
            }
          }
        }
        if (!aboveWater && !horizSupported) {
          if (this.setBlock(wx, y, wz, BLOCK.AIR, false)) {
            this.enqueueReactionEdit({ wx, y, wz, blockId: BLOCK.AIR, dim: this.dimension });
          }
          continue;
        }
      }

      // 3. Orphan Flowing Lava Drainage
      if (cur === BLOCK.FLOWING_LAVA) {
        const aboveLava = isLavaBlock(this.getBlock(wx, y + 1, wz));
        let horizSupported = false;
        if (!aboveLava) {
          for (const [dx, dz] of cardinals) {
            const nid = this.getBlock(wx + dx, y, wz + dz);
            const nBelow = this.getBlock(wx + dx, y - 1, wz + dz);
            if (nid === BLOCK.LAVA && (getBlock(nBelow).solid || isLavaBlock(nBelow))) {
              horizSupported = true;
              break;
            }
            if (nid === BLOCK.FLOWING_LAVA && isLavaBlock(this.getBlock(wx + dx, y + 1, wz + dz)) && getBlock(nBelow).solid) {
              horizSupported = true;
              break;
            }
          }
        }
        if (!aboveLava && !horizSupported) {
          if (this.setBlock(wx, y, wz, BLOCK.AIR, false)) {
            this.enqueueReactionEdit({ wx, y, wz, blockId: BLOCK.AIR, dim: this.dimension });
          }
          continue;
        }
      }

      // 4. Water Downward + 1-Step Horizontal Spread
      if (isWaterBlock(cur) && this.dimension !== 'nether') {
        const belowId = this.getBlock(wx, y - 1, wz);
        const belowDef = getBlock(belowId);
        if (y > 1) {
          if (isLavaBlock(belowId)) {
            const out = belowId === BLOCK.LAVA ? BLOCK.OBSIDIAN : BLOCK.COBBLESTONE;
            if (this.setBlock(wx, y - 1, wz, out, true)) {
              this.enqueueReactionEdit({ wx, y: y - 1, wz, blockId: out, dim: this.dimension });
            }
          } else if (belowId === BLOCK.CAMPFIRE) {
            if (this.setBlock(wx, y - 1, wz, BLOCK.CAMPFIRE_UNLIT, false)) {
              this.enqueueReactionEdit({ wx, y: y - 1, wz, blockId: BLOCK.CAMPFIRE_UNLIT, dim: this.dimension });
            }
          } else if (belowId === BLOCK.AIR || (belowDef.replaceable && !belowDef.liquid)) {
            if (this.setBlock(wx, y - 1, wz, BLOCK.FLOWING_WATER, false)) {
              this.enqueueReactionEdit({ wx, y: y - 1, wz, blockId: BLOCK.FLOWING_WATER, dim: this.dimension });
            }
          }
        }
        const canSpreadHoriz =
          (cur === BLOCK.WATER && (belowDef.solid || isWaterBlock(belowId))) ||
          (cur === BLOCK.FLOWING_WATER && isWaterBlock(this.getBlock(wx, y + 1, wz)) && belowDef.solid);
        if (canSpreadHoriz) {
          for (const [dx, dz] of cardinals) {
            const nx = wx + dx, nz = wz + dz;
            const nid = this.getBlock(nx, y, nz);
            if (isLavaBlock(nid)) {
              const out = nid === BLOCK.LAVA ? BLOCK.OBSIDIAN : BLOCK.COBBLESTONE;
              if (this.setBlock(nx, y, nz, out, true)) {
                this.enqueueReactionEdit({ wx: nx, y, wz: nz, blockId: out, dim: this.dimension });
              }
            } else if (nid === BLOCK.CAMPFIRE) {
              if (this.setBlock(nx, y, nz, BLOCK.CAMPFIRE_UNLIT, false)) {
                this.enqueueReactionEdit({ wx: nx, y, wz: nz, blockId: BLOCK.CAMPFIRE_UNLIT, dim: this.dimension });
              }
            } else if (nid === BLOCK.AIR) {
              if (this.setBlock(nx, y, nz, BLOCK.FLOWING_WATER, false)) {
                this.enqueueReactionEdit({ wx: nx, y, wz: nz, blockId: BLOCK.FLOWING_WATER, dim: this.dimension });
              }
            }
          }
        }
      }

      // 5. Lava Downward + 1-Step Horizontal Spread (+ Stone & Cobblestone Generators!)
      if (isLavaBlock(cur)) {
        const belowId = this.getBlock(wx, y - 1, wz);
        const belowDef = getBlock(belowId);
        if (y > 1) {
          if (isWaterBlock(belowId)) {
            if (this.setBlock(wx, y - 1, wz, BLOCK.STONE, true)) {
              this.enqueueReactionEdit({ wx, y: y - 1, wz, blockId: BLOCK.STONE, dim: this.dimension });
            }
          } else if (belowId === BLOCK.AIR || (belowDef.replaceable && !belowDef.liquid)) {
            if (this.setBlock(wx, y - 1, wz, BLOCK.FLOWING_LAVA, false)) {
              this.enqueueReactionEdit({ wx, y: y - 1, wz, blockId: BLOCK.FLOWING_LAVA, dim: this.dimension });
            }
          }
        }
        const canSpreadHoriz =
          (cur === BLOCK.LAVA && (belowDef.solid || isLavaBlock(belowId))) ||
          (cur === BLOCK.FLOWING_LAVA && isLavaBlock(this.getBlock(wx, y + 1, wz)) && belowDef.solid);
        if (canSpreadHoriz) {
          for (const [dx, dz] of cardinals) {
            const nx = wx + dx, nz = wz + dz;
            const nid = this.getBlock(nx, y, nz);
            if (isWaterBlock(nid)) {
              if (this.setBlock(nx, y, nz, BLOCK.COBBLESTONE, true)) {
                this.enqueueReactionEdit({ wx: nx, y, wz: nz, blockId: BLOCK.COBBLESTONE, dim: this.dimension });
              }
            } else if (nid === BLOCK.AIR) {
              if (this.setBlock(nx, y, nz, BLOCK.FLOWING_LAVA, false)) {
                this.enqueueReactionEdit({ wx: nx, y, wz: nz, blockId: BLOCK.FLOWING_LAVA, dim: this.dimension });
              }
            }
          }
        }
      }
    }
  }

  private rebuildChunkImmediate(cx: number, cz: number) {
    const ch = this.getChunkFast(cx, cz);
    if (!ch) return;
    this.pendingMeshUploads.delete(this.key(cx, cz));
    const grid = this.sharedRebuildGrid;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        grid[(dz + 1) * 3 + (dx + 1)] = this.getChunkFast(cx + dx, cz + dz)?.voxels ?? null;
      }
    }
    const bottomId = this.dimension === 'end' ? BLOCK.AIR : BLOCK.BEDROCK;
    const payload = buildChunkMesh(
      cx,
      cz,
      (wx, y, wz) => this.getBlock(wx, y, wz),
      grid,
      bottomId
    );
    this.applyMeshPayload(ch, payload);
  }

  private handleWorkerMessage(msg: {
    type: string;
    dimension: DimensionId;
    dimEpoch?: number;
    editSeq?: number;
    cx: number;
    cz: number;
    voxels?: Uint8Array;
    mesh: ChunkMeshPayload;
  }) {
    if (msg.dimension !== this.dimension) return;
    if (msg.dimEpoch !== undefined && msg.dimEpoch !== this.dimEpoch) return;

    const k = this.key(msg.cx, msg.cz);

    if (msg.type === 'chunkMeshReady') {
      this.remeshPending.delete(k);
      const ch = this.chunks.get(k);
      if (!ch) return;
      const curSeq = this.getChunkEditSeq(this.dimension, msg.cx, msg.cz);
      if (msg.editSeq !== undefined && msg.editSeq !== curSeq) {
        this.dirtyNeighbors.add(k);
      } else {
        this.pendingMeshUploads.set(k, { ch, mesh: msg.mesh });
      }
      return;
    }

    if (msg.type !== 'chunkReady' || !msg.voxels) return;
    this.pending.delete(k);

    let ch = this.chunks.get(k);
    if (!ch) {
      ch = { cx: msg.cx, cz: msg.cz, voxels: msg.voxels, opaqueMesh: null, waterMesh: null, needsSeamFix: false };
      this.setChunk(k, ch);
    } else {
      ch.voxels = msg.voxels;
      ch.needsSeamFix = false;
      this.setChunk(k, ch);
    }

    // Protect against stale worker completion racing with mid-flight local/remote edits!
    const curSeq = this.getChunkEditSeq(this.dimension, msg.cx, msg.cz);
    if (msg.editSeq !== undefined && msg.editSeq !== curSeq) {
      const freshEdits = this.collectChunkEdits(msg.cx, msg.cz);
      for (const [idx, bid] of freshEdits) {
        ch.voxels[idx] = bid;
      }
      this.rebuildChunkImmediate(msg.cx, msg.cz);
    } else {
      this.pendingMeshUploads.set(k, { ch, mesh: msg.mesh });
    }

    // Only remesh neighbors that were synchronously pre-built without full 3x3 context (`needsSeamFix`)!
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        const nch = this.getChunkFast(msg.cx + dx, msg.cz + dz);
        if (nch && nch.needsSeamFix) {
          nch.needsSeamFix = false;
          this.dirtyNeighbors.add(this.key(nch.cx, nch.cz));
        }
      }
    }
  }

  public setDaylight(sunLevel: number, tintR = 1, tintG = 1, tintB = 1, sunDx = 0.45, sunDy = 0.82, sunDz = 0.35) {
    this.voxelUniforms.uSunLevel.value = sunLevel;
    this.voxelUniforms.uSkyTint.value.setRGB(tintR, tintG, tintB);
    this.voxelUniforms.uSunDir.value.set(sunDx, sunDy, sunDz).normalize();
  }

  public hasPlayerPlacedBlockAt(dim: DimensionId, wx: number, y: number, wz: number): boolean {
    return this.editsByDim[dim].has(`${wx},${y},${wz}`);
  }

  private buildThreeMesh(buf: SubMeshBuffers, mat: THREE.Material, cx: number, cz: number, renderOrder: number): THREE.Mesh | null {
    if (buf.positions.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(buf.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(buf.normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(buf.uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(buf.colors, 3));
    geo.setAttribute('aLight', new THREE.BufferAttribute(buf.lights, 2));
    geo.setIndex(new THREE.BufferAttribute(buf.indices, 1));
    geo.computeBoundingSphere();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.renderOrder = renderOrder;
    this.scene.add(mesh);
    return mesh;
  }

  private applyMeshPayload(ch: LoadedChunk, payload: ChunkMeshPayload) {
    this.disposeChunkMeshes(ch);
    ch.opaqueMesh = this.buildThreeMesh(payload.opaque, this.opaqueMat, ch.cx, ch.cz, 0);
    ch.waterMesh = this.buildThreeMesh(payload.water, this.waterMat, ch.cx, ch.cz, 1);
  }

  private disposeChunkMeshes(ch: LoadedChunk) {
    if (ch.opaqueMesh) {
      this.scene.remove(ch.opaqueMesh);
      ch.opaqueMesh.geometry.dispose();
      ch.opaqueMesh = null;
    }
    if (ch.waterMesh) {
      this.scene.remove(ch.waterMesh);
      ch.waterMesh.geometry.dispose();
      ch.waterMesh = null;
    }
  }

  public getBiomeAt(wx: number, wz: number): string {
    return sampleColumnInfo(Math.floor(wx), Math.floor(wz), this.dimension).biome;
  }

  public getSafeSurfaceY(wx: number, wz: number): number {
    const ix = Math.floor(wx);
    const iz = Math.floor(wz);
    if (!this.isChunkLoadedAt(ix, iz)) {
      this.ensureAreaSyncAround(ix, iz);
    }
    if (this.dimension === 'nether') {
      for (let y = 55; y > 26; y--) {
        const b = getBlock(this.getBlock(ix, y, iz));
        const up1 = getBlock(this.getBlock(ix, y + 1, iz));
        const up2 = getBlock(this.getBlock(ix, y + 2, iz));
        if (b.solid && !up1.solid && !up2.solid) return y + 1.05;
      }
      return 46.05;
    }
    let fallbackLeafY = -1;
    for (let y = WORLD_HEIGHT - 3; y > 1; y--) {
      const bid = this.getBlock(ix, y, iz);
      const b = getBlock(bid);
      if (b.solid || b.liquid) {
        const up1 = getBlock(this.getBlock(ix, y + 1, iz));
        const up2 = getBlock(this.getBlock(ix, y + 2, iz));
        if (!up1.solid && !up2.solid) {
          const isLeaf =
            bid === BLOCK.OAK_LEAVES ||
            bid === BLOCK.BIRCH_LEAVES ||
            bid === BLOCK.SPRUCE_LEAVES ||
            bid === BLOCK.CHERRY_LEAVES ||
            bid === BLOCK.ACACIA_LEAVES;
          if (isLeaf) {
            if (fallbackLeafY < 0) fallbackLeafY = y + 1.05;
            continue;
          }
          return y + 1.05;
        }
      }
    }
    if (fallbackLeafY > 0) return fallbackLeafY;
    return sampleColumnInfo(ix, iz, this.dimension).height + 1.05;
  }

  public loadedChunkCount(): number {
    return this.chunks.size;
  }
}
