// Web Worker for Multithreaded Horizon Chunk Generation, Multi-Dimension Support, LRU Cache & AO/Light Meshing

import { BLOCK } from './blocks';
import { CHUNK_SIZE, DimensionId, WORLD_HEIGHT, chunkIndex, generateChunkVoxels } from './terrainGen';
import { buildChunkMesh } from './mesher';

const MAX_WORKER_CHUNKS = 512;
const workerChunks = new Map<string, Uint8Array>();
const workerEdits = new Map<string, Map<number, number>>();
const sharedGrid3x3: Array<Uint8Array | null> = new Array(9);

function key(dim: DimensionId, cx: number, cz: number): string {
  return `${dim}:${cx},${cz}`;
}

function ensureChunk(dim: DimensionId, cx: number, cz: number): Uint8Array {
  const k = key(dim, cx, cz);
  let data = workerChunks.get(k);
  if (data) {
    // Refresh LRU order
    workerChunks.delete(k);
    workerChunks.set(k, data);
    return data;
  }

  const editsMap = workerEdits.get(k);
  const editsArr = editsMap ? Array.from(editsMap.entries()) : undefined;
  data = generateChunkVoxels(cx, cz, editsArr, dim);
  workerChunks.set(k, data);

  // Evict oldest cached chunk when exceeding cap
  if (workerChunks.size > MAX_WORKER_CHUNKS) {
    const oldestKey = workerChunks.keys().next().value;
    if (oldestKey !== undefined) workerChunks.delete(oldestKey);
  }
  return data;
}

function fillGrid3x3(dim: DimensionId, centerCx: number, centerCz: number): ReadonlyArray<Uint8Array | null> {
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      sharedGrid3x3[(dz + 1) * 3 + (dx + 1)] = ensureChunk(dim, centerCx + dx, centerCz + dz);
    }
  }
  return sharedGrid3x3;
}

function fallbackVoxelSampler(dim: DimensionId, wx: number, y: number, wz: number): number {
  if (y < 0 || y >= WORLD_HEIGHT) return 0;
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const lx = wx & 15;
  const lz = wz & 15;
  return ensureChunk(dim, cx, cz)[chunkIndex(lx, y, lz)];
}

self.onmessage = (ev: MessageEvent) => {
  const msg = ev.data;

  if (msg.type === 'syncEdits') {
    const dim: DimensionId = msg.dimension || 'overworld';
    for (const e of msg.edits) {
      const cx = Math.floor(e.wx / CHUNK_SIZE);
      const cz = Math.floor(e.wz / CHUNK_SIZE);
      const lx = ((e.wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const lz = ((e.wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const k = key(dim, cx, cz);
      let em = workerEdits.get(k);
      if (!em) {
        em = new Map();
        workerEdits.set(k, em);
      }
      const idx = chunkIndex(lx, e.y, lz);
      em.set(idx, e.blockId);
      const cached = workerChunks.get(k);
      if (cached) cached[idx] = e.blockId;
    }
    return;
  }

  if (msg.type === 'buildChunk') {
    const { cx, cz, reqId, dimEpoch, editSeq } = msg;
    const dim: DimensionId = msg.dimension || 'overworld';
    const voxels = ensureChunk(dim, cx, cz);
    const grid = fillGrid3x3(dim, cx, cz);
    const bottomId = dim === 'end' ? BLOCK.AIR : BLOCK.BEDROCK;
    const mesh = buildChunkMesh(cx, cz, (wx, y, wz) => fallbackVoxelSampler(dim, wx, y, wz), grid, bottomId);
    const voxelCopy = new Uint8Array(voxels);

    const transfer: Transferable[] = [
      voxelCopy.buffer,
      mesh.opaque.positions.buffer,
      mesh.opaque.normals.buffer,
      mesh.opaque.uvs.buffer,
      mesh.opaque.colors.buffer,
      mesh.opaque.lights.buffer,
      mesh.opaque.indices.buffer,
      mesh.water.positions.buffer,
      mesh.water.normals.buffer,
      mesh.water.uvs.buffer,
      mesh.water.colors.buffer,
      mesh.water.lights.buffer,
      mesh.water.indices.buffer
    ];

    (self as unknown as Worker).postMessage(
      {
        type: 'chunkReady',
        dimension: dim,
        dimEpoch,
        editSeq,
        cx,
        cz,
        reqId,
        voxels: voxelCopy,
        mesh
      },
      transfer
    );
    return;
  }

  if (msg.type === 'remeshChunk') {
    const { cx, cz, dimEpoch, editSeq } = msg;
    const dim: DimensionId = msg.dimension || 'overworld';
    const grid = fillGrid3x3(dim, cx, cz);
    const bottomId = dim === 'end' ? BLOCK.AIR : BLOCK.BEDROCK;
    const mesh = buildChunkMesh(cx, cz, (wx, y, wz) => fallbackVoxelSampler(dim, wx, y, wz), grid, bottomId);

    const transfer: Transferable[] = [
      mesh.opaque.positions.buffer,
      mesh.opaque.normals.buffer,
      mesh.opaque.uvs.buffer,
      mesh.opaque.colors.buffer,
      mesh.opaque.lights.buffer,
      mesh.opaque.indices.buffer,
      mesh.water.positions.buffer,
      mesh.water.normals.buffer,
      mesh.water.uvs.buffer,
      mesh.water.colors.buffer,
      mesh.water.lights.buffer,
      mesh.water.indices.buffer
    ];

    (self as unknown as Worker).postMessage(
      {
        type: 'chunkMeshReady',
        dimension: dim,
        dimEpoch,
        editSeq,
        cx,
        cz,
        mesh
      },
      transfer
    );
  }
};
