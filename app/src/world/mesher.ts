// Worker-safe Voxel Chunk Mesher with Smooth 4-Corner AO, SkyLight + 3D BFS BlockLight,
// Translucent Pass (Water/Lava/Ice/Slime/Portals), Front-Face Tile Support & Special Block Shapes

import { BLOCK, BLOCKS, BlockDef, TILE, isLavaBlock, isWaterBlock } from './blocks';
import { CHUNK_SIZE, WORLD_HEIGHT } from './terrainGen';

const ATLAS_GRID = 16;
const TILE_UV_TABLE = new Float32Array(256 * 4);
{
  const step = 1 / ATLAS_GRID;
  const pad = 0.0012;
  for (let tile = 0; tile < 256; tile++) {
    const col = tile % ATLAS_GRID;
    const row = Math.floor(tile / ATLAS_GRID);
    const o = tile * 4;
    TILE_UV_TABLE[o] = col * step + pad;
    TILE_UV_TABLE[o + 1] = 1 - (row + 1) * step + pad;
    TILE_UV_TABLE[o + 2] = (col + 1) * step - pad;
    TILE_UV_TABLE[o + 3] = 1 - row * step - pad;
  }
}

export interface SubMeshBuffers {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  lights: Float32Array; // vec2(skyLight 0..1, blockLight 0..1) for dynamic day/night & warm torch glow
  indices: Uint32Array;
}

export interface ChunkMeshPayload {
  opaque: SubMeshBuffers;
  water: SubMeshBuffers;
}

class ScratchMeshBuilder {
  private capVerts: number;
  private capIdx: number;
  pos: Float32Array;
  norm: Float32Array;
  uv: Float32Array;
  col: Float32Array;
  lit: Float32Array;
  idx: Uint32Array;
  vertCount = 0;
  idxCount = 0;

  constructor(initialVerts = 16384, initialIdx = 24576) {
    this.capVerts = initialVerts;
    this.capIdx = initialIdx;
    this.pos = new Float32Array(initialVerts * 3);
    this.norm = new Float32Array(initialVerts * 3);
    this.uv = new Float32Array(initialVerts * 2);
    this.col = new Float32Array(initialVerts * 3);
    this.lit = new Float32Array(initialVerts * 2);
    this.idx = new Uint32Array(initialIdx);
  }

  reset() {
    this.vertCount = 0;
    this.idxCount = 0;
  }

  ensureVerts(addVerts: number) {
    const need = this.vertCount + addVerts;
    if (need <= this.capVerts) return;
    let next = this.capVerts * 2;
    while (next < need) next *= 2;
    const growF32 = (old: Float32Array, stride: number) => {
      const n = new Float32Array(next * stride);
      n.set(old.subarray(0, this.vertCount * stride));
      return n;
    };
    this.pos = growF32(this.pos, 3);
    this.norm = growF32(this.norm, 3);
    this.uv = growF32(this.uv, 2);
    this.col = growF32(this.col, 3);
    this.lit = growF32(this.lit, 2);
    this.capVerts = next;
  }

  ensureIdx(addIdx: number) {
    const need = this.idxCount + addIdx;
    if (need <= this.capIdx) return;
    let next = this.capIdx * 2;
    while (next < need) next *= 2;
    const n = new Uint32Array(next);
    n.set(this.idx.subarray(0, this.idxCount));
    this.idx = n;
    this.capIdx = next;
  }

  pushVert(
    px: number,
    py: number,
    pz: number,
    nx: number,
    ny: number,
    nz: number,
    u: number,
    v: number,
    shade: number,
    sl: number,
    bl: number
  ) {
    const v3 = this.vertCount * 3;
    const v2 = this.vertCount * 2;
    this.pos[v3] = px;
    this.pos[v3 + 1] = py;
    this.pos[v3 + 2] = pz;
    this.norm[v3] = nx;
    this.norm[v3 + 1] = ny;
    this.norm[v3 + 2] = nz;
    this.uv[v2] = u;
    this.uv[v2 + 1] = v;
    this.col[v3] = shade;
    this.col[v3 + 1] = shade;
    this.col[v3 + 2] = shade;
    this.lit[v2] = sl;
    this.lit[v2 + 1] = bl;
    this.vertCount++;
  }

  pushQuadIdx(base: number, flip = false) {
    this.ensureIdx(6);
    const o = this.idxCount;
    if (flip) {
      this.idx[o] = base + 1;
      this.idx[o + 1] = base + 2;
      this.idx[o + 2] = base + 3;
      this.idx[o + 3] = base + 1;
      this.idx[o + 4] = base + 3;
      this.idx[o + 5] = base;
    } else {
      this.idx[o] = base;
      this.idx[o + 1] = base + 1;
      this.idx[o + 2] = base + 2;
      this.idx[o + 3] = base;
      this.idx[o + 4] = base + 2;
      this.idx[o + 5] = base + 3;
    }
    this.idxCount += 6;
  }

  pushDoubleSidedQuadIdx(base: number) {
    this.ensureIdx(12);
    const o = this.idxCount;
    this.idx[o] = base;
    this.idx[o + 1] = base + 1;
    this.idx[o + 2] = base + 2;
    this.idx[o + 3] = base;
    this.idx[o + 4] = base + 2;
    this.idx[o + 5] = base + 3;
    this.idx[o + 6] = base;
    this.idx[o + 7] = base + 2;
    this.idx[o + 8] = base + 1;
    this.idx[o + 9] = base;
    this.idx[o + 10] = base + 3;
    this.idx[o + 11] = base + 2;
    this.idxCount += 12;
  }

  toBuffers(): SubMeshBuffers {
    const vc = this.vertCount;
    const ic = this.idxCount;
    return {
      positions: this.pos.slice(0, vc * 3),
      normals: this.norm.slice(0, vc * 3),
      uvs: this.uv.slice(0, vc * 2),
      colors: this.col.slice(0, vc * 3),
      lights: this.lit.slice(0, vc * 2),
      indices: this.idx.slice(0, ic)
    };
  }
}

const opaqueScratch = new ScratchMeshBuilder(24576, 36864);
const waterScratch = new ScratchMeshBuilder(4096, 6144);

interface FaceSpec {
  dir: [number, number, number];
  shade: number;
  tileSlot: 0 | 1 | 2 | 3;
  corners: Array<{
    p: [number, number, number];
    uvIdx: [0 | 2, 1 | 3];
    ao1: [number, number, number];
    ao2: [number, number, number];
    aoC: [number, number, number];
  }>;
}

// Cardinal directional shading matching Vanilla / Horizon (`top: 1.0, Z: 0.82, X: 0.67, bottom: 0.52`)
const FACES: FaceSpec[] = [
  // +Y (Top)
  {
    dir: [0, 1, 0],
    shade: 1.0,
    tileSlot: 0,
    corners: [
      { p: [0, 1, 1], uvIdx: [0, 1], ao1: [-1, 1, 0], ao2: [0, 1, 1], aoC: [-1, 1, 1] },
      { p: [1, 1, 1], uvIdx: [2, 1], ao1: [1, 1, 0], ao2: [0, 1, 1], aoC: [1, 1, 1] },
      { p: [1, 1, 0], uvIdx: [2, 3], ao1: [1, 1, 0], ao2: [0, 1, -1], aoC: [1, 1, -1] },
      { p: [0, 1, 0], uvIdx: [0, 3], ao1: [-1, 1, 0], ao2: [0, 1, -1], aoC: [-1, 1, -1] }
    ]
  },
  // -Y (Bottom)
  {
    dir: [0, -1, 0],
    shade: 0.52,
    tileSlot: 2,
    corners: [
      { p: [0, 0, 0], uvIdx: [0, 1], ao1: [-1, -1, 0], ao2: [0, -1, -1], aoC: [-1, -1, -1] },
      { p: [1, 0, 0], uvIdx: [2, 1], ao1: [1, -1, 0], ao2: [0, -1, -1], aoC: [1, -1, -1] },
      { p: [1, 0, 1], uvIdx: [2, 3], ao1: [1, -1, 0], ao2: [0, -1, 1], aoC: [1, -1, 1] },
      { p: [0, 0, 1], uvIdx: [0, 3], ao1: [-1, -1, 0], ao2: [0, -1, 1], aoC: [-1, -1, 1] }
    ]
  },
  // +Z (South — Front Face when tileSlot 3 exists!)
  {
    dir: [0, 0, 1],
    shade: 0.82,
    tileSlot: 3,
    corners: [
      { p: [0, 0, 1], uvIdx: [0, 1], ao1: [-1, 0, 1], ao2: [0, -1, 1], aoC: [-1, -1, 1] },
      { p: [1, 0, 1], uvIdx: [2, 1], ao1: [1, 0, 1], ao2: [0, -1, 1], aoC: [1, -1, 1] },
      { p: [1, 1, 1], uvIdx: [2, 3], ao1: [1, 0, 1], ao2: [0, 1, 1], aoC: [1, 1, 1] },
      { p: [0, 1, 1], uvIdx: [0, 3], ao1: [-1, 0, 1], ao2: [0, 1, 1], aoC: [-1, 1, 1] }
    ]
  },
  // -Z (North)
  {
    dir: [0, 0, -1],
    shade: 0.82,
    tileSlot: 1,
    corners: [
      { p: [1, 0, 0], uvIdx: [0, 1], ao1: [1, 0, -1], ao2: [0, -1, -1], aoC: [1, -1, -1] },
      { p: [0, 0, 0], uvIdx: [2, 1], ao1: [-1, 0, -1], ao2: [0, -1, -1], aoC: [-1, -1, -1] },
      { p: [0, 1, 0], uvIdx: [2, 3], ao1: [-1, 0, -1], ao2: [0, 1, -1], aoC: [-1, 1, -1] },
      { p: [1, 1, 0], uvIdx: [0, 3], ao1: [1, 0, -1], ao2: [0, 1, -1], aoC: [1, 1, -1] }
    ]
  },
  // +X (East)
  {
    dir: [1, 0, 0],
    shade: 0.67,
    tileSlot: 1,
    corners: [
      { p: [1, 0, 1], uvIdx: [0, 1], ao1: [1, 0, 1], ao2: [1, -1, 0], aoC: [1, -1, 1] },
      { p: [1, 0, 0], uvIdx: [2, 1], ao1: [1, 0, -1], ao2: [1, -1, 0], aoC: [1, -1, -1] },
      { p: [1, 1, 0], uvIdx: [2, 3], ao1: [1, 0, -1], ao2: [1, 1, 0], aoC: [1, 1, -1] },
      { p: [1, 1, 1], uvIdx: [0, 3], ao1: [1, 0, 1], ao2: [1, 1, 0], aoC: [1, 1, 1] }
    ]
  },
  // -X (West)
  {
    dir: [-1, 0, 0],
    shade: 0.67,
    tileSlot: 1,
    corners: [
      { p: [0, 0, 0], uvIdx: [0, 1], ao1: [-1, 0, -1], ao2: [-1, -1, 0], aoC: [-1, -1, -1] },
      { p: [0, 0, 1], uvIdx: [2, 1], ao1: [-1, 0, 1], ao2: [-1, -1, 0], aoC: [-1, -1, 1] },
      { p: [0, 1, 1], uvIdx: [2, 3], ao1: [-1, 0, 1], ao2: [-1, 1, 0], aoC: [-1, 1, 1] },
      { p: [0, 1, 0], uvIdx: [0, 3], ao1: [-1, 0, -1], ao2: [-1, 1, 0], aoC: [-1, 1, -1] }
    ]
  }
];

const AO_CURVE = [0.40, 0.63, 0.83, 1.0];

export function isOffsetFloraBlock(id: number): boolean {
  return (
    id === BLOCK.TALL_GRASS ||
    id === BLOCK.POPPY ||
    id === BLOCK.DANDELION ||
    id === BLOCK.CORNFLOWER ||
    id === BLOCK.OXEYE_DAISY ||
    id === BLOCK.CHERRY_PETALS
  );
}

// Deterministic Vanilla BlockBehaviour.OffsetType.XZ sub-block offset (±0.165m) so flowers & grass feel organic!
export function getFloraOffset(wx: number, wz: number): [number, number] {
  let h = Math.imul(wx, 3129871) ^ Math.imul(wz, 116129781);
  h = Math.imul(h ^ (h >>> 15), 42317861);
  const ox = (((h >>> 16) & 15) / 15.0 - 0.5) * 0.33;
  const oz = (((h >>> 20) & 15) / 15.0 - 0.5) * 0.33;
  return [ox, oz];
}

function emitBoxFace(
  target: ScratchMeshBuilder,
  tile: number,
  nx: number,
  ny: number,
  nz: number,
  cShade: number,
  uMin: number,
  uMax: number,
  vMin: number,
  vMax: number,
  p0x: number, p0y: number, p0z: number,
  p1x: number, p1y: number, p1z: number,
  p2x: number, p2y: number, p2z: number,
  p3x: number, p3y: number, p3z: number,
  faceSL: number,
  faceBL: number
) {
  const to = (tile & 255) * 4;
  const tu0 = TILE_UV_TABLE[to];
  const tv0 = TILE_UV_TABLE[to + 1];
  const du = TILE_UV_TABLE[to + 2] - tu0;
  const dv = TILE_UV_TABLE[to + 3] - tv0;
  const su0 = tu0 + du * uMin;
  const su1 = tu0 + du * uMax;
  const sv0 = tv0 + dv * vMin;
  const sv1 = tv0 + dv * vMax;

  target.ensureVerts(4);
  const base = target.vertCount;
  target.pushVert(p0x, p0y, p0z, nx, ny, nz, su0, sv0, cShade, faceSL, faceBL);
  target.pushVert(p1x, p1y, p1z, nx, ny, nz, su1, sv0, cShade, faceSL, faceBL);
  target.pushVert(p2x, p2y, p2z, nx, ny, nz, su1, sv1, cShade, faceSL, faceBL);
  target.pushVert(p3x, p3y, p3z, nx, ny, nz, su0, sv1, cShade, faceSL, faceBL);
  target.pushQuadIdx(base, false);
}

function emitSubBox(
  target: ScratchMeshBuilder,
  lx: number,
  y: number,
  lz: number,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  b: BlockDef,
  sl: number,
  bl: number,
  skipBottom = false,
  fullUV = false,
  sideTileOverride?: number,
  sampleSky?: (nx: number, ny: number, nz: number) => number,
  sampleBlk?: (nx: number, ny: number, nz: number) => number
) {
  const selfGlow = (b.light || 0) >= 12;
  const sideT = sideTileOverride ?? b.tiles[1];
  const frontT = sideTileOverride ?? (b.tiles[3] ?? b.tiles[1]);
  const wx0 = lx + x0, wx1 = lx + x1;
  const wy0 = y + y0, wy1 = y + y1;
  const wz0 = lz + z0, wz1 = lz + z1;

  // +Y
  {
    const fsl = sampleSky ? Math.max(sl, sampleSky(lx, y + 1, lz) / 15) : sl;
    const fbl = sampleBlk ? Math.max(bl, sampleBlk(lx, y + 1, lz) / 15) : bl;
    emitBoxFace(
      target, b.tiles[0], 0, 1, 0, selfGlow ? 1.0 : 0.94,
      fullUV ? 0 : x0, fullUV ? 1 : x1, fullUV ? 0 : 1 - z1, fullUV ? 1 : 1 - z0,
      wx0, wy1, wz1, wx1, wy1, wz1, wx1, wy1, wz0, wx0, wy1, wz0, fsl, fbl
    );
  }
  // -Y
  if (!skipBottom) {
    const fsl = sampleSky ? Math.max(sl, sampleSky(lx, y - 1, lz) / 15) : sl;
    const fbl = sampleBlk ? Math.max(bl, sampleBlk(lx, y - 1, lz) / 15) : bl;
    emitBoxFace(
      target, b.tiles[2], 0, -1, 0, selfGlow ? 1.0 : 0.54 * 0.94,
      fullUV ? 0 : x0, fullUV ? 1 : x1, fullUV ? 0 : z0, fullUV ? 1 : z1,
      wx0, wy0, wz0, wx1, wy0, wz0, wx1, wy0, wz1, wx0, wy0, wz1, fsl, fbl
    );
  }
  // +Z
  {
    const fsl = sampleSky ? Math.max(sl, sampleSky(lx, y, lz + 1) / 15) : sl;
    const fbl = sampleBlk ? Math.max(bl, sampleBlk(lx, y, lz + 1) / 15) : bl;
    emitBoxFace(
      target, frontT, 0, 0, 1, selfGlow ? 1.0 : 0.82 * 0.94,
      fullUV ? 0 : x0, fullUV ? 1 : x1, fullUV ? 0 : y0, fullUV ? 1 : y1,
      wx0, wy0, wz1, wx1, wy0, wz1, wx1, wy1, wz1, wx0, wy1, wz1, fsl, fbl
    );
  }
  // -Z
  {
    const fsl = sampleSky ? Math.max(sl, sampleSky(lx, y, lz - 1) / 15) : sl;
    const fbl = sampleBlk ? Math.max(bl, sampleBlk(lx, y, lz - 1) / 15) : bl;
    emitBoxFace(
      target, sideT, 0, 0, -1, selfGlow ? 1.0 : 0.82 * 0.94,
      fullUV ? 0 : 1 - x1, fullUV ? 1 : 1 - x0, fullUV ? 0 : y0, fullUV ? 1 : y1,
      wx1, wy0, wz0, wx0, wy0, wz0, wx0, wy1, wz0, wx1, wy1, wz0, fsl, fbl
    );
  }
  // +X
  {
    const fsl = sampleSky ? Math.max(sl, sampleSky(lx + 1, y, lz) / 15) : sl;
    const fbl = sampleBlk ? Math.max(bl, sampleBlk(lx + 1, y, lz) / 15) : bl;
    emitBoxFace(
      target, sideT, 1, 0, 0, selfGlow ? 1.0 : 0.68 * 0.94,
      fullUV ? 0 : 1 - z1, fullUV ? 1 : 1 - z0, fullUV ? 0 : y0, fullUV ? 1 : y1,
      wx1, wy0, wz1, wx1, wy0, wz0, wx1, wy1, wz0, wx1, wy1, wz1, fsl, fbl
    );
  }
  // -X
  {
    const fsl = sampleSky ? Math.max(sl, sampleSky(lx - 1, y, lz) / 15) : sl;
    const fbl = sampleBlk ? Math.max(bl, sampleBlk(lx - 1, y, lz) / 15) : bl;
    emitBoxFace(
      target, sideT, -1, 0, 0, selfGlow ? 1.0 : 0.68 * 0.94,
      fullUV ? 0 : z0, fullUV ? 1 : z1, fullUV ? 0 : y0, fullUV ? 1 : y1,
      wx0, wy0, wz0, wx0, wy0, wz1, wx0, wy1, wz1, wx0, wy1, wz0, fsl, fbl
    );
  }
}

function isTranslucentBlock(id: number): boolean {
  return (
    isWaterBlock(id) ||
    id === BLOCK.ICE ||
    id === BLOCK.SLIME_BLOCK ||
    id === BLOCK.NETHER_PORTAL ||
    id === BLOCK.END_PORTAL
  );
}

function sameLiquidFamily(a: number, b: number): boolean {
  return (isWaterBlock(a) && isWaterBlock(b)) || (isLavaBlock(a) && isLavaBlock(b));
}

const LIGHT_PAD = 15;
const PW = CHUNK_SIZE + LIGHT_PAD * 2;
const TOTAL_PAD_VOXELS = PW * WORLD_HEIGHT * PW;
const sharedPad = new Uint8Array(TOTAL_PAD_VOXELS);
const sharedBlockLight = new Uint8Array(TOTAL_PAD_VOXELS);
const sharedSkyLight = new Uint8Array(TOTAL_PAD_VOXELS);
const sharedLayerA = new Int32Array(TOTAL_PAD_VOXELS);
const sharedLayerB = new Int32Array(TOTAL_PAD_VOXELS);
const sharedSeedIdx = new Int32Array(TOTAL_PAD_VOXELS);
const sharedSeedLv = new Uint8Array(TOTAL_PAD_VOXELS);

// Precomputed flat Uint8Array LUTs eliminate megamorphic BLOCKS[id] lookups in 270k-voxel hot loops
const BLOCK_AO = new Uint8Array(256);
const BLOCK_LIGHT = new Uint8Array(256);
const BLOCK_SKY_DECAY = new Uint8Array(256);
const BLOCK_PASS_LIGHT = new Uint8Array(256);
const BLOCK_OPAQUE_CULL = new Uint8Array(256);
const BLOCK_SOLID_OPAQUE_CULL = new Uint8Array(256);
{
  for (let id = 0; id < 256; id++) {
    const b = BLOCKS[id];
    if (!b) {
      BLOCK_PASS_LIGHT[id] = 1;
      continue;
    }
    const partial = id === BLOCK.BED_BLOCK || id === BLOCK.DIRT_PATH || id === BLOCK.FARMLAND;
    if (b.solid && b.opaque) {
      BLOCK_AO[id] = 1;
      if (!partial) BLOCK_SOLID_OPAQUE_CULL[id] = 1;
    }
    if (b.opaque && !partial) BLOCK_OPAQUE_CULL[id] = 1;
    if (b.light && b.light > 0) BLOCK_LIGHT[id] = b.light;
    if (b.opaque) BLOCK_SKY_DECAY[id] = 15;
    else if (isWaterBlock(id) || id === BLOCK.POWDER_SNOW || b.material === 'grass') BLOCK_SKY_DECAY[id] = 2;
    if (!b.opaque || (b.light && b.light > 0)) BLOCK_PASS_LIGHT[id] = 1;
  }
}

let curBottomId: number = BLOCK.BEDROCK;
let curBottomAO = true;

function samplePad(lx: number, y: number, lz: number): number {
  if (y < 0) return curBottomId;
  if (y >= WORLD_HEIGHT) return BLOCK.AIR;
  return sharedPad[(y * PW + (lz + LIGHT_PAD)) * PW + (lx + LIGHT_PAD)];
}

function sampleBlockLightPad(lx: number, y: number, lz: number): number {
  if (y < 0 || y >= WORLD_HEIGHT) return 0;
  return sharedBlockLight[(y * PW + (lz + LIGHT_PAD)) * PW + (lx + LIGHT_PAD)];
}

function sampleSkyLightPad(lx: number, y: number, lz: number): number {
  if (y < 0) return 0;
  if (y >= WORLD_HEIGHT) return 15;
  return sharedSkyLight[(y * PW + (lz + LIGHT_PAD)) * PW + (lx + LIGHT_PAD)];
}

function occludesAOPad(lx: number, y: number, lz: number): boolean {
  if (y < 0) return curBottomAO;
  if (y >= WORLD_HEIGHT) return false;
  return BLOCK_AO[sharedPad[(y * PW + (lz + LIGHT_PAD)) * PW + (lx + LIGHT_PAD)]] !== 0;
}

function fillPaddedVolume(
  baseX: number,
  baseZ: number,
  getVoxel: (wx: number, y: number, wz: number) => number,
  grid3x3?: ReadonlyArray<Uint8Array | null>
): { seedCount: number; maxCenterY: number } {
  const H = WORLD_HEIGHT;
  const CS = CHUNK_SIZE;
  const pad = sharedPad;
  const blockLight = sharedBlockLight;
  const skyLight = sharedSkyLight;
  blockLight.fill(0);
  let seedCount = 0;
  let maxCenterY = 0;
  const strideY = PW * PW;
  const topYOffset = (H - 1) * strideY;
  const topVOffset = (H - 1) << 8;

  for (let pz = 0; pz < PW; pz++) {
    const oz = pz - LIGHT_PAD;
    const wz = baseZ + oz;
    const gz = oz < 0 ? 0 : oz < 16 ? 1 : 2;
    const clz = oz < 0 ? oz + 16 : oz < 16 ? oz : oz - 16;
    const inCenterZ = oz >= 0 && oz < CS;
    const needSkyZ = oz >= -1 && oz <= CS;

    for (let px = 0; px < PW; px++) {
      const ox = px - LIGHT_PAD;
      const wx = baseX + ox;
      const gx = ox < 0 ? 0 : ox < 16 ? 1 : 2;
      const clx = ox < 0 ? ox + 16 : ox < 16 ? ox : ox - 16;
      const inCenter = inCenterZ && ox >= 0 && ox < CS;
      const needSky = needSkyZ && ox >= -1 && ox <= CS;

      const chunkArr = grid3x3 ? grid3x3[gz * 3 + gx] : null;
      const colBase = (clz << 4) | clx;
      let idx = topYOffset + pz * PW + px;

      if (chunkArr) {
        let vIdx = colBase + topVOffset;
        if (needSky) {
          let sky = 15;
          for (let y = H - 1; y >= 0; y--, idx -= strideY, vIdx -= 256) {
            const id = chunkArr[vIdx];
            pad[idx] = id;
            if (id !== 0) {
              if (inCenter && y > maxCenterY) maxCenterY = y;
              const dec = BLOCK_SKY_DECAY[id];
              if (dec !== 0) sky = sky > dec ? sky - dec : 0;
              const bl = BLOCK_LIGHT[id];
              if (bl !== 0) {
                blockLight[idx] = bl;
                sharedSeedIdx[seedCount] = idx;
                sharedSeedLv[seedCount++] = bl;
              }
            }
            skyLight[idx] = sky;
          }
        } else {
          for (let y = H - 1; y >= 0; y--, idx -= strideY, vIdx -= 256) {
            const id = chunkArr[vIdx];
            pad[idx] = id;
            if (id !== 0) {
              const bl = BLOCK_LIGHT[id];
              if (bl !== 0) {
                blockLight[idx] = bl;
                sharedSeedIdx[seedCount] = idx;
                sharedSeedLv[seedCount++] = bl;
              }
            }
          }
        }
      } else {
        let sky = 15;
        for (let y = H - 1; y >= 0; y--, idx -= strideY) {
          const id = getVoxel(wx, y, wz);
          pad[idx] = id;
          if (id !== 0) {
            if (inCenter && y > maxCenterY) maxCenterY = y;
            if (needSky) {
              const dec = BLOCK_SKY_DECAY[id];
              if (dec !== 0) sky = sky > dec ? sky - dec : 0;
            }
            const bl = BLOCK_LIGHT[id];
            if (bl !== 0) {
              blockLight[idx] = bl;
              sharedSeedIdx[seedCount] = idx;
              sharedSeedLv[seedCount++] = bl;
            }
          }
          if (needSky) skyLight[idx] = sky;
        }
      }
    }
  }
  return { seedCount, maxCenterY };
}

function propagateBlockLight(seedCount: number) {
  if (seedCount <= 0) return;
  const H = WORLD_HEIGHT;
  const pad = sharedPad;
  const blockLight = sharedBlockLight;
  const strideZ = PW;
  const strideY = PW * PW;

  let currQ = sharedLayerA;
  let nextQ = sharedLayerB;
  let currLen = 0;

  for (let lv = 15; lv >= 2; lv--) {
    for (let s = 0; s < seedCount; s++) {
      if (sharedSeedLv[s] === lv) {
        const sIdx = sharedSeedIdx[s];
        if (blockLight[sIdx] === lv) currQ[currLen++] = sIdx;
      }
    }
    if (currLen === 0) continue;

    const nextL = lv - 1;
    let nextLen = 0;

    for (let qi = 0; qi < currLen; qi++) {
      const idx = currQ[qi];
      const y = (idx / strideY) | 0;
      const remY = idx - y * strideY;
      const pz = (remY / PW) | 0;
      const px = remY - pz * PW;

      if (px > 0) {
        const nIdx = idx - 1;
        if (blockLight[nIdx] < nextL && BLOCK_PASS_LIGHT[pad[nIdx]] !== 0) {
          blockLight[nIdx] = nextL;
          nextQ[nextLen++] = nIdx;
        }
      }
      if (px + 1 < PW) {
        const nIdx = idx + 1;
        if (blockLight[nIdx] < nextL && BLOCK_PASS_LIGHT[pad[nIdx]] !== 0) {
          blockLight[nIdx] = nextL;
          nextQ[nextLen++] = nIdx;
        }
      }
      if (y > 0) {
        const nIdx = idx - strideY;
        if (blockLight[nIdx] < nextL && BLOCK_PASS_LIGHT[pad[nIdx]] !== 0) {
          blockLight[nIdx] = nextL;
          nextQ[nextLen++] = nIdx;
        }
      }
      if (y + 1 < H) {
        const nIdx = idx + strideY;
        if (blockLight[nIdx] < nextL && BLOCK_PASS_LIGHT[pad[nIdx]] !== 0) {
          blockLight[nIdx] = nextL;
          nextQ[nextLen++] = nIdx;
        }
      }
      if (pz > 0) {
        const nIdx = idx - strideZ;
        if (blockLight[nIdx] < nextL && BLOCK_PASS_LIGHT[pad[nIdx]] !== 0) {
          blockLight[nIdx] = nextL;
          nextQ[nextLen++] = nIdx;
        }
      }
      if (pz + 1 < PW) {
        const nIdx = idx + strideZ;
        if (blockLight[nIdx] < nextL && BLOCK_PASS_LIGHT[pad[nIdx]] !== 0) {
          blockLight[nIdx] = nextL;
          nextQ[nextLen++] = nIdx;
        }
      }
    }

    const tmp = currQ;
    currQ = nextQ;
    nextQ = tmp;
    currLen = nextLen;
  }
}

function connectFenceId(nid: number): boolean {
  const nb = BLOCKS[nid];
  return !!(nb && (nb.shape === 'fence' || (nb.solid && nb.opaque)));
}

function connectPaneId(nid: number): boolean {
  const nb = BLOCKS[nid];
  return !!(nb && (nb.shape === 'pane' || (nb.solid && nb.opaque)));
}

function emitSpecialShape(
  opaque: ScratchMeshBuilder,
  water: ScratchMeshBuilder,
  lx: number,
  y: number,
  lz: number,
  id: number,
  b: BlockDef,
  selfEmit: number
) {
  const sl = Math.max(sampleSkyLightPad(lx, y, lz), sampleSkyLightPad(lx, y + 1, lz)) / 15;
  const bl = Math.max(selfEmit, sampleBlockLightPad(lx, y, lz) / 15, sampleBlockLightPad(lx, y + 1, lz) / 15);
  const belowOpaque = !!(BLOCKS[samplePad(lx, y - 1, lz)]?.opaque);

  if (b.shape === 'slab') {
    emitSubBox(opaque, lx, y, lz, 0, 0, 0, 1, 0.5, 1, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'stairs_n') {
    emitSubBox(opaque, lx, y, lz, 0, 0, 0, 1, 0.5, 1, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0, 0.5, 0, 1, 1.0, 0.5, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'stairs_s') {
    emitSubBox(opaque, lx, y, lz, 0, 0, 0, 1, 0.5, 1, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0, 0.5, 0.5, 1, 1.0, 1.0, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'stairs_e') {
    emitSubBox(opaque, lx, y, lz, 0, 0, 0, 1, 0.5, 1, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.5, 0.5, 0, 1.0, 1.0, 1, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'stairs_w') {
    emitSubBox(opaque, lx, y, lz, 0, 0, 0, 1, 0.5, 1, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0, 0.5, 0, 0.5, 1.0, 1, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'fence') {
    emitSubBox(opaque, lx, y, lz, 0.375, 0, 0.375, 0.625, 1.0, 0.625, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    if (connectFenceId(samplePad(lx - 1, y, lz))) {
      emitSubBox(opaque, lx, y, lz, 0, 0.38, 0.43, 0.375, 0.54, 0.57, b, sl, bl, false, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
      emitSubBox(opaque, lx, y, lz, 0, 0.74, 0.43, 0.375, 0.90, 0.57, b, sl, bl, false, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    }
    if (connectFenceId(samplePad(lx + 1, y, lz))) {
      emitSubBox(opaque, lx, y, lz, 0.625, 0.38, 0.43, 1.0, 0.54, 0.57, b, sl, bl, false, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
      emitSubBox(opaque, lx, y, lz, 0.625, 0.74, 0.43, 1.0, 0.90, 0.57, b, sl, bl, false, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    }
    if (connectFenceId(samplePad(lx, y, lz - 1))) {
      emitSubBox(opaque, lx, y, lz, 0.43, 0.38, 0, 0.57, 0.54, 0.375, b, sl, bl, false, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
      emitSubBox(opaque, lx, y, lz, 0.43, 0.74, 0, 0.57, 0.90, 0.375, b, sl, bl, false, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    }
    if (connectFenceId(samplePad(lx, y, lz + 1))) {
      emitSubBox(opaque, lx, y, lz, 0.43, 0.38, 0.625, 0.57, 0.54, 1.0, b, sl, bl, false, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
      emitSubBox(opaque, lx, y, lz, 0.43, 0.74, 0.625, 0.57, 0.90, 1.0, b, sl, bl, false, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    }
  } else if (b.shape === 'lantern') {
    emitSubBox(opaque, lx, y, lz, 0.31, 0.0, 0.31, 0.69, 0.50, 0.69, b, sl, bl, belowOpaque, true, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.38, 0.50, 0.38, 0.62, 0.64, 0.62, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    const aboveB = BLOCKS[samplePad(lx, y + 1, lz)];
    if (aboveB && aboveB.solid && !belowOpaque) {
      emitSubBox(opaque, lx, y, lz, 0.46, 0.64, 0.46, 0.54, 1.0, 0.54, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    }
  } else if (b.shape === 'door_closed' || b.shape === 'door_open') {
    const belowId = samplePad(lx, y - 1, lz);
    const isUpperHalf = belowId === BLOCK.OAK_DOOR_CLOSED || belowId === BLOCK.OAK_DOOR_OPEN;
    const doorTile = isUpperHalf ? TILE.OAK_DOOR : TILE.OAK_DOOR_LOWER;
    if (b.shape === 'door_closed') {
      emitSubBox(opaque, lx, y, lz, 0, 0, 0.40625, 1, 1, 0.59375, b, sl, bl, belowOpaque || isUpperHalf, true, doorTile, sampleSkyLightPad, sampleBlockLightPad);
    } else {
      emitSubBox(opaque, lx, y, lz, 0, 0, 0, 0.1875, 1, 1, b, sl, bl, belowOpaque || isUpperHalf, true, doorTile, sampleSkyLightPad, sampleBlockLightPad);
    }
  } else if (b.shape === 'trapdoor_closed') {
    emitSubBox(opaque, lx, y, lz, 0, 0, 0, 1, 0.1875, 1, b, sl, bl, belowOpaque, true, undefined, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'trapdoor_open') {
    emitSubBox(opaque, lx, y, lz, 0, 0, 0, 1, 1, 0.1875, b, sl, bl, belowOpaque, true, undefined, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'pane') {
    const cW = connectPaneId(samplePad(lx - 1, y, lz));
    const cE = connectPaneId(samplePad(lx + 1, y, lz));
    const cN = connectPaneId(samplePad(lx, y, lz - 1));
    const cS = connectPaneId(samplePad(lx, y, lz + 1));
    const anyConn = cW || cE || cN || cS;
    emitSubBox(opaque, lx, y, lz, 0.4375, 0, 0.4375, 0.5625, 1, 0.5625, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    if (cW || !anyConn) emitSubBox(opaque, lx, y, lz, 0, 0, 0.4375, 0.4375, 1, 0.5625, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    if (cE || !anyConn) emitSubBox(opaque, lx, y, lz, 0.5625, 0, 0.4375, 1, 1, 0.5625, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    if (cN || !anyConn) emitSubBox(opaque, lx, y, lz, 0.4375, 0, 0, 0.5625, 1, 0.4375, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    if (cS || !anyConn) emitSubBox(opaque, lx, y, lz, 0.4375, 0, 0.5625, 0.5625, 1, 1, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'campfire') {
    emitSubBox(opaque, lx, y, lz, 0.14, 0.0, 0.14, 0.86, 0.125, 0.86, b, sl, bl, belowOpaque, true, TILE.CAMPFIRE_ASH, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.06, 0.0, 0.14, 0.94, 0.24, 0.36, b, sl, bl, belowOpaque, false, TILE.CAMPFIRE_LOG, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.06, 0.0, 0.64, 0.94, 0.24, 0.86, b, sl, bl, belowOpaque, false, TILE.CAMPFIRE_LOG, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.14, 0.20, 0.06, 0.36, 0.44, 0.94, b, sl, bl, true, false, TILE.CAMPFIRE_LOG, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.64, 0.20, 0.06, 0.86, 0.44, 0.94, b, sl, bl, true, false, TILE.CAMPFIRE_LOG, sampleSkyLightPad, sampleBlockLightPad);
    if (id === BLOCK.CAMPFIRE) {
      emitSubBox(opaque, lx, y, lz, 0.33, 0.12, 0.33, 0.67, 0.68, 0.67, b, sl, 1.0, true, true, TILE.CAMPFIRE_FIRE, sampleSkyLightPad, sampleBlockLightPad);
    }
  } else if (b.shape === 'anvil') {
    emitSubBox(opaque, lx, y, lz, 0.125, 0.0, 0.125, 0.875, 0.25, 0.875, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.25, 0.25, 0.1875, 0.75, 0.3125, 0.8125, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.3125, 0.3125, 0.25, 0.6875, 0.625, 0.75, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.1875, 0.625, 0.0, 0.8125, 1.0, 1.0, b, sl, bl, false, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'enchanting_table') {
    emitSubBox(opaque, lx, y, lz, 0, 0, 0, 1, 0.75, 1, b, sl, bl, belowOpaque, true, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.30, 0.75, 0.32, 0.70, 0.85, 0.68, b, sl, bl, true, true, TILE.ENCHANT_TOP, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'cauldron') {
    emitSubBox(opaque, lx, y, lz, 0, 0, 0, 1, 0.1875, 1, b, sl, bl, belowOpaque, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0, 0.1875, 0, 0.125, 1, 1, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.875, 0.1875, 0, 1, 1, 1, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.125, 0.1875, 0, 0.875, 1, 0.125, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.125, 0.1875, 0.875, 0.875, 1, 1, b, sl, bl, true, false, undefined, sampleSkyLightPad, sampleBlockLightPad);
    if (id === BLOCK.CAULDRON_WATER) {
      emitSubBox(water, lx, y, lz, 0.125, 0.1875, 0.125, 0.875, 0.82, 0.875, b, sl, bl, true, false, TILE.WATER, sampleSkyLightPad, sampleBlockLightPad);
    } else if (id === BLOCK.CAULDRON_LAVA) {
      emitSubBox(opaque, lx, y, lz, 0.125, 0.1875, 0.125, 0.875, 0.82, 0.875, b, sl, 1.0, true, true, TILE.LAVA, sampleSkyLightPad, sampleBlockLightPad);
    }
  } else if (b.shape === 'cake') {
    emitSubBox(opaque, lx, y, lz, 0.0625, 0, 0.0625, 0.9375, 0.5, 0.9375, b, sl, bl, belowOpaque, true, undefined, sampleSkyLightPad, sampleBlockLightPad);
  } else if (b.shape === 'flower_pot') {
    emitSubBox(opaque, lx, y, lz, 0.3125, 0, 0.3125, 0.6875, 0.375, 0.6875, b, sl, bl, belowOpaque, false, TILE.FLOWER_POT, sampleSkyLightPad, sampleBlockLightPad);
    emitSubBox(opaque, lx, y, lz, 0.35, 0.30, 0.35, 0.65, 0.36, 0.65, b, sl, bl, true, false, TILE.DIRT, sampleSkyLightPad, sampleBlockLightPad);
    if (id === BLOCK.POTTED_CACTUS) {
      emitSubBox(opaque, lx, y, lz, 0.38, 0.35, 0.38, 0.62, 0.85, 0.62, b, sl, bl, true, true, TILE.CACTUS_SIDE, sampleSkyLightPad, sampleBlockLightPad);
    } else if (id === BLOCK.POTTED_POPPY || id === BLOCK.POTTED_DANDELION || id === BLOCK.POTTED_CHERRY) {
      const flowerTile =
        id === BLOCK.POTTED_POPPY
          ? TILE.POPPY
          : id === BLOCK.POTTED_DANDELION
            ? TILE.DANDELION
            : TILE.CHERRY_PETALS;
      const fto = (flowerTile & 255) * 4;
      const fu0 = TILE_UV_TABLE[fto], fv0 = TILE_UV_TABLE[fto + 1], fu1 = TILE_UV_TABLE[fto + 2], fv1 = TILE_UV_TABLE[fto + 3];
      opaque.ensureVerts(8);
      const fb0 = opaque.vertCount;
      opaque.pushVert(lx + 0.26, y + 0.34, lz + 0.26, 0, 1, 0, fu0, fv0, 0.94, sl, bl);
      opaque.pushVert(lx + 0.74, y + 0.34, lz + 0.74, 0, 1, 0, fu1, fv0, 0.94, sl, bl);
      opaque.pushVert(lx + 0.74, y + 0.86, lz + 0.74, 0, 1, 0, fu1, fv1, 0.94, sl, bl);
      opaque.pushVert(lx + 0.26, y + 0.86, lz + 0.26, 0, 1, 0, fu0, fv1, 0.94, sl, bl);
      opaque.pushDoubleSidedQuadIdx(fb0);

      const fb1 = opaque.vertCount;
      opaque.pushVert(lx + 0.26, y + 0.34, lz + 0.74, 0, 1, 0, fu0, fv0, 0.94, sl, bl);
      opaque.pushVert(lx + 0.74, y + 0.34, lz + 0.26, 0, 1, 0, fu1, fv0, 0.94, sl, bl);
      opaque.pushVert(lx + 0.74, y + 0.86, lz + 0.26, 0, 1, 0, fu1, fv1, 0.94, sl, bl);
      opaque.pushVert(lx + 0.26, y + 0.86, lz + 0.74, 0, 1, 0, fu0, fv1, 0.94, sl, bl);
      opaque.pushDoubleSidedQuadIdx(fb1);
    }
  }
}

export function buildChunkMesh(
  cx: number,
  cz: number,
  getVoxel: (wx: number, y: number, wz: number) => number,
  grid3x3?: ReadonlyArray<Uint8Array | null>,
  bottomId: number = BLOCK.BEDROCK
): ChunkMeshPayload {
  const opaque = opaqueScratch;
  const water = waterScratch;
  opaque.reset();
  water.reset();

  curBottomId = bottomId;
  curBottomAO = BLOCK_AO[bottomId] !== 0;

  const { seedCount, maxCenterY } = fillPaddedVolume(cx * CHUNK_SIZE, cz * CHUNK_SIZE, getVoxel, grid3x3);
  propagateBlockLight(seedCount);

  const pad = sharedPad;
  const strideZ = PW;
  const strideY = PW * PW;
  const meshMaxY = Math.min(WORLD_HEIGHT - 1, maxCenterY);

  for (let y = 0; y <= meshMaxY; y++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const rowBase = (y * PW + (lz + LIGHT_PAD)) * PW + LIGHT_PAD;
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const id = pad[rowBase + lx];
        if (id === BLOCK.AIR) continue;
        const b = BLOCKS[id];
        if (!b) continue;

        // Flat ground Redstone Dust circuit wire
        if (b.flatWire) {
          const to = (b.tiles[0] & 255) * 4;
          const u0 = TILE_UV_TABLE[to], v0 = TILE_UV_TABLE[to + 1], u1 = TILE_UV_TABLE[to + 2], v1 = TILE_UV_TABLE[to + 3];
          const bl = Math.max(b.light || 0, sampleBlockLightPad(lx, y, lz)) / 15;
          const sl = sampleSkyLightPad(lx, y, lz) / 15;
          const wy = y + 0.03;
          opaque.ensureVerts(4);
          const base = opaque.vertCount;
          opaque.pushVert(lx, wy, lz + 1, 0, 1, 0, u0, v0, 1.0, sl, bl);
          opaque.pushVert(lx + 1, wy, lz + 1, 0, 1, 0, u1, v0, 1.0, sl, bl);
          opaque.pushVert(lx + 1, wy, lz, 0, 1, 0, u1, v1, 1.0, sl, bl);
          opaque.pushVert(lx, wy, lz, 0, 1, 0, u0, v1, 1.0, sl, bl);
          opaque.pushQuadIdx(base, false);
          continue;
        }

        // Cross-quad plants, torches, ladders, levers & pointed dripstone
        if (b.cross) {
          const to = (b.tiles[0] & 255) * 4;
          const u0 = TILE_UV_TABLE[to], u1 = TILE_UV_TABLE[to + 2];
          let v0 = TILE_UV_TABLE[to + 1], v1 = TILE_UV_TABLE[to + 3];
          const bl = Math.max(b.light || 0, sampleBlockLightPad(lx, y, lz)) / 15;
          const sl = sampleSkyLightPad(lx, y, lz) / 15;
          const crossShade = b.light && b.light > 0 ? 1.0 : 0.92;

          let isHangingDripstone = false;
          if (id === BLOCK.POINTED_DRIPSTONE && !(BLOCKS[samplePad(lx, y - 1, lz)]?.solid)) {
            let cy = y + 1;
            while (cy < WORLD_HEIGHT - 1 && samplePad(lx, cy, lz) === BLOCK.POINTED_DRIPSTONE && cy <= y + 5) {
              cy++;
            }
            isHangingDripstone = !!(BLOCKS[samplePad(lx, cy, lz)]?.solid);
          }
          if (isHangingDripstone) {
            const tmpV = v0;
            v0 = v1;
            v1 = tmpV;
          }

          const isTorch = id === BLOCK.TORCH || id === BLOCK.LEVER_OFF || id === BLOCK.LEVER_ON;
          const isFlower =
            id === BLOCK.POPPY ||
            id === BLOCK.DANDELION ||
            id === BLOCK.CORNFLOWER ||
            id === BLOCK.OXEYE_DAISY ||
            id === BLOCK.CHERRY_PETALS;
          const minC = isTorch ? 0.34 : isFlower ? 0.20 : 0.14;
          const maxC = isTorch ? 0.66 : isFlower ? 0.80 : 0.86;
          const topH = id === BLOCK.POINTED_DRIPSTONE ? 1.0 : isTorch ? 0.72 : isFlower ? 0.88 : 0.94;

          let fox = 0;
          let foz = 0;
          if (isOffsetFloraBlock(id)) {
            const off = getFloraOffset(cx * CHUNK_SIZE + lx, cz * CHUNK_SIZE + lz);
            fox = off[0];
            foz = off[1];
          }
          // Tag top vertices of swaying flora with ny = 2.0 for zero-CPU GPU wind sway!
          const canSway =
            isFlower ||
            id === BLOCK.TALL_GRASS ||
            id === BLOCK.WHEAT_CROP ||
            id === BLOCK.SWEET_BERRY_BUSH;
          const topNy = canSway ? 2.0 : 1.0;

          opaque.ensureVerts(8);
          const b0 = opaque.vertCount;
          opaque.pushVert(lx + minC + fox, y, lz + minC + foz, 0, 1, 0, u0, v0, crossShade, sl, bl);
          opaque.pushVert(lx + maxC + fox, y, lz + maxC + foz, 0, 1, 0, u1, v0, crossShade, sl, bl);
          opaque.pushVert(lx + maxC + fox, y + topH, lz + maxC + foz, 0, topNy, 0, u1, v1, crossShade, sl, bl);
          opaque.pushVert(lx + minC + fox, y + topH, lz + minC + foz, 0, topNy, 0, u0, v1, crossShade, sl, bl);
          opaque.pushDoubleSidedQuadIdx(b0);

          const b1 = opaque.vertCount;
          opaque.pushVert(lx + minC + fox, y, lz + maxC + foz, 0, 1, 0, u0, v0, crossShade, sl, bl);
          opaque.pushVert(lx + maxC + fox, y, lz + minC + foz, 0, 1, 0, u1, v0, crossShade, sl, bl);
          opaque.pushVert(lx + maxC + fox, y + topH, lz + minC + foz, 0, topNy, 0, u1, v1, crossShade, sl, bl);
          opaque.pushVert(lx + minC + fox, y + topH, lz + maxC + foz, 0, topNy, 0, u0, v1, crossShade, sl, bl);
          opaque.pushDoubleSidedQuadIdx(b1);
          continue;
        }

        if (id === BLOCK.CHEST) {
          const sl = sampleSkyLightPad(lx, y, lz) / 15;
          const bl = sampleBlockLightPad(lx, y, lz) / 15;
          const chestBelowOpaque = !!(BLOCKS[samplePad(lx, y - 1, lz)]?.opaque);
          emitSubBox(
            opaque, lx, y, lz,
            0.0625, 0, 0.0625, 0.9375, 0.875, 0.9375,
            b, sl, bl, chestBelowOpaque, true, undefined, sampleSkyLightPad, sampleBlockLightPad
          );
          const latchDef = BLOCKS[BLOCK.GOLD_BLOCK] || b;
          emitSubBox(
            opaque, lx, y, lz,
            0.4375, 0.44, 0.9375, 0.5625, 0.68, 1.0,
            latchDef, sl, bl, false, false, TILE.GOLD_BLOCK, sampleSkyLightPad, sampleBlockLightPad
          );
          continue;
        }

        const translucent = isTranslucentBlock(id);
        const target = translucent ? water : opaque;
        const selfEmit = b.light ? b.light / 15 : 0;

        if (b.shape && b.shape !== 'cube' && b.shape !== 'powder_snow') {
          emitSpecialShape(opaque, water, lx, y, lz, id, b, selfEmit);
          continue;
        }

        // Custom block top heights (Bed = 0.56, Dirt Path / Farmland = 0.9375, Source Liquid = 0.89, Flowing Liquid = 0.66)
        let customTopOffset = 0;
        if (id === BLOCK.BED_BLOCK) customTopOffset = -0.44;
        else if (id === BLOCK.DIRT_PATH || id === BLOCK.FARMLAND) customTopOffset = -0.0625;
        else if (b.liquid && !sameLiquidFamily(id, samplePad(lx, y + 1, lz))) {
          customTopOffset = id === BLOCK.FLOWING_WATER || id === BLOCK.FLOWING_LAVA ? -0.34 : -0.11;
        }

        const isPartialHeight = id === BLOCK.BED_BLOCK || id === BLOCK.DIRT_PATH || id === BLOCK.FARMLAND;

        // Ultra-fast buried-cube early exit (skips 95%+ of underground stone/dirt voxels in 6 byte reads!)
        if (b.opaque && !isPartialHeight && !b.liquid && !translucent && y > 0 && y + 1 < WORLD_HEIGHT) {
          const cIdx = rowBase + lx;
          if (
            BLOCK_OPAQUE_CULL[pad[cIdx + strideY]] !== 0 &&
            BLOCK_OPAQUE_CULL[pad[cIdx - strideY]] !== 0 &&
            BLOCK_OPAQUE_CULL[pad[cIdx + strideZ]] !== 0 &&
            BLOCK_OPAQUE_CULL[pad[cIdx - strideZ]] !== 0 &&
            BLOCK_OPAQUE_CULL[pad[cIdx + 1]] !== 0 &&
            BLOCK_OPAQUE_CULL[pad[cIdx - 1]] !== 0
          ) {
            continue;
          }
        }

        for (let fi = 0; fi < 6; fi++) {
          const f = FACES[fi];
          const nx = lx + f.dir[0];
          const ny = y + f.dir[1];
          if (ny < 0) continue;
          const nz = lz + f.dir[2];
          const nid = samplePad(nx, ny, nz);
          const nOpaqueCull = BLOCK_OPAQUE_CULL[nid] !== 0;

          if (b.liquid) {
            if (fi === 0 && sameLiquidFamily(id, nid)) continue;
            if (fi === 1 && sameLiquidFamily(id, nid)) continue;
            if (fi >= 2) {
              if (nid === id) continue;
              if ((id === BLOCK.FLOWING_WATER && nid === BLOCK.WATER) || (id === BLOCK.FLOWING_LAVA && nid === BLOCK.LAVA)) continue;
            }
            if (fi !== 0 && BLOCK_SOLID_OPAQUE_CULL[nid] !== 0) continue;
          } else if (isPartialHeight) {
            if (fi === 1 && nOpaqueCull) continue;
            if (fi >= 2 && nOpaqueCull) continue;
          } else if (translucent) {
            if (nid === id) continue;
            if (nOpaqueCull) continue;
          } else if (!b.opaque) {
            if (nid === id && (id === BLOCK.GLASS || id === BLOCK.POWDER_SNOW)) continue;
            if (nOpaqueCull) continue;
          } else {
            if (nOpaqueCull) {
              continue;
            }
          }

          const tileIndex = f.tileSlot === 3 ? (b.tiles[3] ?? b.tiles[1]) : b.tiles[f.tileSlot];
          const to = (tileIndex & 255) * 4;
          target.ensureVerts(4);
          const base = target.vertCount;
          let ao0 = 3, ao1 = 3, ao2 = 3, ao3 = 3;

          const faceBL = Math.max(selfEmit, sampleBlockLightPad(nx, ny, nz) / 15);
          const faceSL = sampleSkyLightPad(nx, ny, nz) / 15;
          const fnx = f.dir[0], fny = f.dir[1], fnz = f.dir[2];

          for (let ci = 0; ci < 4; ci++) {
            const c = f.corners[ci];
            let ao = 3;
            if (!translucent && selfEmit < 0.6) {
              const s1 = occludesAOPad(lx + c.ao1[0], y + c.ao1[1], lz + c.ao1[2]) ? 1 : 0;
              const s2 = occludesAOPad(lx + c.ao2[0], y + c.ao2[1], lz + c.ao2[2]) ? 1 : 0;
              const sc = occludesAOPad(lx + c.aoC[0], y + c.aoC[1], lz + c.aoC[2]) ? 1 : 0;
              ao = s1 && s2 ? 0 : 3 - (s1 + s2 + sc);
            }
            if (ci === 0) ao0 = ao;
            else if (ci === 1) ao1 = ao;
            else if (ci === 2) ao2 = ao;
            else ao3 = ao;

            const px = lx + c.p[0];
            const py = c.p[1] === 1 ? y + 1 + customTopOffset : y + c.p[1];
            const pz = lz + c.p[2];
            const directionalAO = selfEmit >= 0.8 ? 1.0 : f.shade * AO_CURVE[ao];

            target.pushVert(
              px,
              py,
              pz,
              fnx,
              fny,
              fnz,
              TILE_UV_TABLE[to + c.uvIdx[0]],
              TILE_UV_TABLE[to + c.uvIdx[1]],
              directionalAO,
              faceSL,
              faceBL
            );
          }

          target.pushQuadIdx(base, !(ao0 + ao2 > ao1 + ao3));
        }
      }
    }
  }

  return {
    opaque: opaque.toBuffers(),
    water: water.toBuffers()
  };
}
