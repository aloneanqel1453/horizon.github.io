import { BLOCK } from './blocks';
import { SeededNoise, WORLD_SEED, hash2D, hash3D } from './noise';

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 128;
export const SEA_LEVEL = 42;
export const SPAWN_Y = 49;

export type DimensionId = 'overworld' | 'nether' | 'end';

export type BiomeKind =
  | 'Köy Meydanı'
  | 'Kiraz Korusu'
  | 'Çayır Vadisi'
  | 'Meşe Ormanı'
  | 'Huş Korusu'
  | 'Savan Düzlüğü'
  | 'Karlı Zirveler'
  | 'Altın Çöl'
  | 'Kızıl Kanyon'
  | 'Nether Çorakları'
  | 'Kızıl Orman'
  | 'Çarpık Orman'
  | 'Ruh Kumu Vadisi'
  | 'End Adası';

const terrainNoise = new SeededNoise(WORLD_SEED);
const tempNoise = new SeededNoise(WORLD_SEED + 1013);
const humidNoise = new SeededNoise(WORLD_SEED + 2027);
const detailNoise = new SeededNoise(WORLD_SEED + 4051);
const netherNoise = new SeededNoise(WORLD_SEED + 5507);

export function sampleColumnInfo(wx: number, wz: number, dimension: DimensionId = 'overworld'): { height: number; biome: BiomeKind } {
  if (dimension === 'nether') {
    const t = tempNoise.fbm2D(wx * 0.008 + 50, wz * 0.008 - 30, 3);
    const h = humidNoise.fbm2D(wx * 0.008 - 20, wz * 0.008 + 70, 3);
    const biome: BiomeKind =
      t > 0.22 ? 'Kızıl Orman' :
      t < -0.22 ? 'Çarpık Orman' :
      h < -0.18 ? 'Ruh Kumu Vadisi' : 'Nether Çorakları';
    const floorH = Math.round(32 + netherNoise.fbm2D(wx * 0.014, wz * 0.014, 3) * 14);
    return { height: Math.max(24, Math.min(62, floorH)), biome };
  }

  if (dimension === 'end') {
    const dist = Math.hypot(wx, wz);
    if (dist > 44) return { height: 0, biome: 'End Adası' };
    const edgeFade = Math.max(0, 1 - Math.pow(dist / 42, 2.4));
    const top = Math.round(46 + edgeFade * 8 + detailNoise.fbm2D(wx * 0.035, wz * 0.035, 2) * 3);
    return { height: top, biome: 'End Adası' };
  }

  const distSpawn = Math.hypot(wx, wz);

  const cont = terrainNoise.fbm2D(wx * 0.0038, wz * 0.0038, 3);
  const ridge = Math.abs(terrainNoise.fbm2D(wx * 0.0075 + 40, wz * 0.0075 - 25, 2));
  const detail = detailNoise.fbm2D(wx * 0.024, wz * 0.024, 2);

  const temp = tempNoise.fbm2D(wx * 0.0030 + 120, wz * 0.0030 - 80, 2);
  const humid = humidNoise.fbm2D(wx * 0.0032 - 60, wz * 0.0032 + 150, 2);

  let rawH = SEA_LEVEL + 6 + cont * 14 + Math.pow(ridge, 1.55) * 20 + detail * 2.5;

  // River valleys kept far outside the wide Emerald Meadow spawn plain
  const riverMask = Math.abs(terrainNoise.noise2D(wx * 0.0052 - 12, wz * 0.0052 + 31));
  if (riverMask < 0.065 && distSpawn > 68) {
    const t = 1 - riverMask / 0.065;
    rawH = rawH * (1 - t * 0.62) + (SEA_LEVEL - 3) * (t * 0.62);
  }

  // Wide, sunlit, ultra-clean Zümrüt Çayır (Emerald Meadow) around spawn (dist < 62)
  if (distSpawn < 62) {
    const b = Math.max(0, Math.min(1, (distSpawn - 24) / 38));
    const smooth = b * b * (3 - 2 * b);
    rawH = (SPAWN_Y - 1) * (1 - smooth) + rawH * smooth;
  }

  const height = Math.max(8, Math.min(WORLD_HEIGHT - 16, Math.round(rawH)));

  let biome: BiomeKind = 'Çayır Vadisi';
  if (distSpawn < 18) {
    biome = 'Köy Meydanı';
  } else if (distSpawn < 54) {
    biome = 'Çayır Vadisi';
  } else if (height > 68 || temp < -0.30) {
    biome = 'Karlı Zirveler';
  } else if (temp > 0.34 && humid < -0.14) {
    biome = 'Kızıl Kanyon';
  } else if (temp > 0.24 && humid < 0.0) {
    biome = 'Altın Çöl';
  } else if (temp > 0.14 && humid < 0.06) {
    biome = 'Savan Düzlüğü';
  } else if (humid > 0.20 && temp > -0.04) {
    biome = 'Kiraz Korusu';
  } else if (humid > 0.06) {
    biome = temp > 0.06 ? 'Huş Korusu' : 'Meşe Ormanı';
  }

  return { height, biome };
}

export function chunkIndex(lx: number, y: number, lz: number): number {
  return (y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
}

export function generateChunkVoxels(
  cx: number,
  cz: number,
  edits?: Array<[number, number]>,
  dimension: DimensionId = 'overworld'
): Uint8Array {
  const data = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;

  const setSafe = (wx: number, y: number, wz: number, blockId: number, onlyReplaceSoft = false) => {
    const lx = wx - baseX;
    const lz = wz - baseZ;
    if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < 1 || y >= WORLD_HEIGHT - 1) return;
    const idx = chunkIndex(lx, y, lz);
    if (onlyReplaceSoft) {
      const cur = data[idx];
      if (
        cur !== BLOCK.AIR &&
        cur !== BLOCK.TALL_GRASS &&
        cur !== BLOCK.POPPY &&
        cur !== BLOCK.DANDELION &&
        cur !== BLOCK.CORNFLOWER &&
        cur !== BLOCK.OXEYE_DAISY &&
        cur !== BLOCK.CHERRY_PETALS
      ) {
        return;
      }
    }
    data[idx] = blockId;
  };

  if (dimension === 'nether') {
    generateNetherChunk(data, baseX, baseZ, setSafe);
  } else if (dimension === 'end') {
    generateEndChunk(data, baseX, baseZ, setSafe);
  } else {
    generateOverworldChunk(data, baseX, baseZ, setSafe);
  }

  if (edits) {
    for (const [idx, blockId] of edits) {
      if (idx >= 0 && idx < data.length) {
        data[idx] = blockId;
      }
    }
  }

  return data;
}

// ============================================================================
// OVERWORLD: Ultra-Clean Emerald Meadow, Tempest Homestead, Ores & Biomes
// ============================================================================
function generateOverworldChunk(
  data: Uint8Array,
  baseX: number,
  baseZ: number,
  setSafe: (wx: number, y: number, wz: number, blockId: number, onlyReplaceSoft?: boolean) => void
) {
  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    const wz = baseZ + lz;
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx;
      const { height, biome } = sampleColumnInfo(wx, wz, 'overworld');
      const distSpawn = Math.hypot(wx, wz);
      const topY = Math.max(height, SEA_LEVEL);

      data[chunkIndex(lx, 0, lz)] = BLOCK.BEDROCK;

      for (let y = 1; y <= topY; y++) {
        const idx = chunkIndex(lx, y, lz);
        if (y <= height) {
          if (y === height) {
            if (height <= SEA_LEVEL + 1 && biome !== 'Köy Meydanı') {
              data[idx] = biome === 'Karlı Zirveler' ? BLOCK.GRAVEL : biome === 'Kızıl Kanyon' ? BLOCK.RED_SAND : BLOCK.SAND;
            } else if (biome === 'Altın Çöl') {
              data[idx] = BLOCK.SAND;
            } else if (biome === 'Kızıl Kanyon') {
              data[idx] = height > SEA_LEVEL + 8 ? BLOCK.TERRACOTTA : BLOCK.RED_SAND;
            } else if (biome === 'Karlı Zirveler' || height > 73) {
              data[idx] = height > 79 ? BLOCK.SNOW_BLOCK : BLOCK.SNOW_GRASS;
            } else {
              data[idx] = BLOCK.GRASS;
            }
          } else if (y >= height - 3) {
            if (biome === 'Kızıl Kanyon') data[idx] = BLOCK.TERRACOTTA;
            else if (biome === 'Altın Çöl' || height <= SEA_LEVEL + 1) data[idx] = BLOCK.SANDSTONE;
            else data[idx] = BLOCK.DIRT;
          } else {
            const oreRoll = hash3D(wx, y, wz);
            const inDeepslate = y < 15;
            if (y < 18 && oreRoll < 0.0085) data[idx] = inDeepslate ? BLOCK.DEEPSLATE_DIAMOND_ORE : BLOCK.DIAMOND_ORE;
            else if (y < 30 && oreRoll < 0.011) data[idx] = BLOCK.EMERALD_ORE;
            else if (y < 24 && oreRoll < 0.015) data[idx] = BLOCK.REDSTONE_ORE;
            else if (y < 36 && oreRoll < 0.021) data[idx] = BLOCK.GOLD_ORE;
            else if (y < 56 && oreRoll < 0.038) data[idx] = BLOCK.IRON_ORE;
            else if (oreRoll < 0.052) data[idx] = BLOCK.COAL_ORE;
            else data[idx] = inDeepslate ? BLOCK.DEEPSLATE : BLOCK.STONE;
          }
        } else {
          data[idx] = y === SEA_LEVEL && biome === 'Karlı Zirveler' ? BLOCK.ICE : BLOCK.WATER;
        }
      }

      // Light, low-overdraw surface wildflowers outside Spawn Homestead
      if (height > SEA_LEVEL + 1 && distSpawn > 20) {
        const fRoll = hash2D(wx + 91, wz - 47);
        const topIdx = chunkIndex(lx, height + 1, lz);
        if (biome === 'Kiraz Korusu') {
          if (fRoll < 0.04) data[topIdx] = BLOCK.CHERRY_PETALS;
          else if (fRoll < 0.07) data[topIdx] = BLOCK.TALL_GRASS;
        } else if (biome === 'Çayır Vadisi' || biome === 'Meşe Ormanı' || biome === 'Huş Korusu') {
          if (fRoll > 0.998) data[topIdx] = BLOCK.PUMPKIN;
          else if (biome === 'Meşe Ormanı' && fRoll > 0.992) data[topIdx] = BLOCK.SWEET_BERRY_BUSH;
          else if (fRoll < 0.010) data[topIdx] = BLOCK.CORNFLOWER;
          else if (fRoll < 0.020) data[topIdx] = BLOCK.OXEYE_DAISY;
          else if (fRoll < 0.030) data[topIdx] = BLOCK.POPPY;
          else if (fRoll < 0.040) data[topIdx] = BLOCK.DANDELION;
          else if (fRoll < 0.075) data[topIdx] = BLOCK.TALL_GRASS;
        } else if (biome === 'Karlı Zirveler' && height < 79) {
          if (fRoll < 0.018) data[topIdx] = BLOCK.SWEET_BERRY_BUSH;
        } else if (biome === 'Savan Düzlüğü') {
          if (fRoll < 0.08) data[topIdx] = BLOCK.TALL_GRASS;
        }
      }
    }
  }

  // 2. Clean 8x8-Spaced Low-Overdraw Trees (kept clear of Tempest Meadow center)
  for (let wz = baseZ - 3; wz < baseZ + CHUNK_SIZE + 3; wz++) {
    for (let wx = baseX - 3; wx < baseX + CHUNK_SIZE + 3; wx++) {
      if ((wx & 7) !== 0 || (wz & 7) !== 0) continue;
      if (Math.hypot(wx, wz) < 28) continue;

      const jitterX = wx + Math.floor(hash2D(wx, wz, 11) * 3);
      const jitterZ = wz + Math.floor(hash2D(wx, wz, 22) * 3);
      if (Math.hypot(jitterX, jitterZ) < 28) continue;

      const { height, biome } = sampleColumnInfo(jitterX, jitterZ, 'overworld');
      if (height <= SEA_LEVEL + 2 || height > 74) continue;

      const treeChance = hash2D(jitterX, jitterZ, 999);

      if (biome === 'Altın Çöl' || biome === 'Kızıl Kanyon') {
        if (treeChance < 0.08) {
          const ch = 2 + Math.floor(hash2D(jitterX, jitterZ, 55) * 2);
          for (let dy = 1; dy <= ch; dy++) setSafe(jitterX, height + dy, jitterZ, BLOCK.CACTUS);
        }
        continue;
      }

      const density =
        biome === 'Meşe Ormanı' ? 0.24 :
        biome === 'Huş Korusu' ? 0.22 :
        biome === 'Kiraz Korusu' ? 0.20 :
        biome === 'Karlı Zirveler' ? 0.18 :
        biome === 'Savan Düzlüğü' ? 0.10 : 0.05;

      if (treeChance >= density) continue;

      const trunkH = 4 + Math.floor(hash2D(jitterX, jitterZ, 777) * 2);

      if (biome === 'Savan Düzlüğü') {
        const leanX = hash2D(jitterX, jitterZ, 33) > 0.5 ? 1 : -1;
        let tx = jitterX;
        for (let dy = 1; dy <= trunkH; dy++) {
          if (dy >= trunkH - 1) tx = jitterX + leanX;
          setSafe(tx, height + dy, jitterZ, BLOCK.ACACIA_LOG);
        }
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx * dx + dz * dz <= 5) setSafe(tx + dx, height + trunkH, jitterZ + dz, BLOCK.ACACIA_LEAVES, true);
            if (dx * dx + dz * dz <= 2) setSafe(tx + dx, height + trunkH + 1, jitterZ + dz, BLOCK.ACACIA_LEAVES, true);
          }
        }
      } else if (biome === 'Karlı Zirveler') {
        for (let dy = 1; dy <= trunkH + 1; dy++) setSafe(jitterX, height + dy, jitterZ, BLOCK.SPRUCE_LOG);
        for (let layer = 0; layer < 3; layer++) {
          const r = layer === 2 ? 1 : 2 - (layer % 2);
          const ly = height + trunkH - 1 + layer;
          for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.abs(dx) + Math.abs(dz) <= r + 1) {
                setSafe(jitterX + dx, ly, jitterZ + dz, BLOCK.SPRUCE_LEAVES, true);
              }
            }
          }
        }
      } else {
        const logBlock = biome === 'Kiraz Korusu' ? BLOCK.CHERRY_LOG : biome === 'Huş Korusu' ? BLOCK.BIRCH_LOG : BLOCK.OAK_LOG;
        const leafBlock = biome === 'Kiraz Korusu' ? BLOCK.CHERRY_LEAVES : biome === 'Huş Korusu' ? BLOCK.BIRCH_LEAVES : BLOCK.OAK_LEAVES;
        for (let dy = 1; dy <= trunkH; dy++) setSafe(jitterX, height + dy, jitterZ, logBlock);
        for (let dy = trunkH - 1; dy <= trunkH + 1; dy++) {
          const rad = dy === trunkH + 1 ? 1 : 2;
          for (let dz = -rad; dz <= rad; dz++) {
            for (let dx = -rad; dx <= rad; dx++) {
              if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
              setSafe(jitterX + dx, height + dy, jitterZ + dz, leafBlock, true);
            }
          }
        }
      }
    }
  }

  // 3. Feather-Light Zümrüt Çayır (Tempest) Spawn Homestead (-22..18, SPAWN_Y-1, -21..12)
  const floorY = SPAWN_Y - 1;
  if (baseX <= 18 && baseX + CHUNK_SIZE >= -23 && baseZ <= 12 && baseZ + CHUNK_SIZE >= -22) {
    stampSpawnHomestead(floorY, setSafe);
  }
}

function stampSpawnHomestead(
  floorY: number,
  setSafe: (wx: number, y: number, wz: number, blockId: number, onlyReplaceSoft?: boolean) => void
) {
  // 1. Clean Open Emerald Lawn & Crossroads (-14..15, -13..10)
  for (let wz = -13; wz <= 10; wz++) {
    for (let wx = -14; wx <= 15; wx++) {
      if (Math.hypot(wx, wz) > 16.5) continue;
      for (let y = floorY + 1; y <= floorY + 8; y++) setSafe(wx, y, wz, BLOCK.AIR);
      const onPath =
        (Math.abs(wz) <= 1 && wx >= -11 && wx <= 13) ||
        (Math.abs(wx) <= 1 && wz >= -13 && wz <= 8) ||
        (Math.abs(wx) <= 2 && Math.abs(wz) <= 2);
      setSafe(wx, floorY, wz, onPath ? BLOCK.DIRT_PATH : BLOCK.GRASS);
    }
  }

  // 2. Simple Cobblestone Well & Bell at (0, floorY, 0)
  for (let wz = -1; wz <= 1; wz++) {
    for (let wx = -1; wx <= 1; wx++) {
      if (wx === 0 && wz === 0) {
        setSafe(0, floorY - 1, 0, BLOCK.STONE_BRICKS);
        setSafe(0, floorY, 0, BLOCK.WATER);
        setSafe(0, floorY + 3, 0, BLOCK.BELL_BLOCK);
      } else {
        setSafe(wx, floorY + 1, wz, BLOCK.COBBLESTONE);
        if (Math.abs(wx) === 1 && Math.abs(wz) === 1) {
          setSafe(wx, floorY + 2, wz, BLOCK.OAK_FENCE);
          setSafe(wx, floorY + 3, wz, BLOCK.OAK_FENCE);
        }
      }
      setSafe(wx, floorY + 4, wz, BLOCK.OAK_SLAB);
    }
  }

  // 3. Single Cozy Rimuru Homestead House (wx = -10..-4, wz = -8..-3, door at (-7, -3))
  for (let wz = -8; wz <= -3; wz++) {
    for (let wx = -10; wx <= -4; wx++) {
      setSafe(wx, floorY, wz, BLOCK.OAK_PLANKS);
      const isEdgeX = wx === -10 || wx === -4;
      const isEdgeZ = wz === -8 || wz === -3;
      if (isEdgeX || isEdgeZ) {
        const isCorner = isEdgeX && isEdgeZ;
        for (let dy = 1; dy <= 3; dy++) {
          if (wx === -7 && wz === -3 && dy <= 2) {
            setSafe(wx, floorY + dy, wz, BLOCK.OAK_DOOR_CLOSED);
          } else if (isCorner) {
            setSafe(wx, floorY + dy, wz, BLOCK.OAK_LOG);
          } else if (dy === 1) {
            setSafe(wx, floorY + dy, wz, BLOCK.COBBLESTONE);
          } else if (dy === 2 && ((wx === -7 && wz === -8) || wz === -5)) {
            setSafe(wx, floorY + dy, wz, BLOCK.GLASS);
          } else {
            setSafe(wx, floorY + dy, wz, BLOCK.BIRCH_PLANKS);
          }
        }
      }
      setSafe(wx, floorY + 4, wz, BLOCK.SPRUCE_PLANKS);
    }
  }
  for (let wz = -9; wz <= -2; wz++) {
    for (let wx = -11; wx <= -3; wx++) {
      const border = wx === -11 || wx === -3 || wz === -9 || wz === -2;
      if (border) setSafe(wx, floorY + 4, wz, BLOCK.SPRUCE_SLAB);
      else setSafe(wx, floorY + 5, wz, BLOCK.SPRUCE_SLAB);
    }
  }
  setSafe(-7, floorY, -2, BLOCK.DIRT_PATH);
  setSafe(-7, floorY + 3, -2, BLOCK.LANTERN);
  // Complete Crafting / Enchanting / Bed / Chest Interior inside Rimuru House
  setSafe(-9, floorY + 1, -7, BLOCK.BED_BLOCK);
  setSafe(-8, floorY + 1, -7, BLOCK.CRAFTING_TABLE);
  setSafe(-7, floorY + 1, -7, BLOCK.FURNACE_LIT);
  setSafe(-6, floorY + 1, -7, BLOCK.CHEST);
  setSafe(-5, floorY + 1, -7, BLOCK.ANVIL);
  setSafe(-9, floorY + 1, -5, BLOCK.BOOKSHELF);
  setSafe(-9, floorY + 2, -5, BLOCK.BOOKSHELF);
  setSafe(-8, floorY + 1, -5, BLOCK.ENCHANTING_TABLE);
  setSafe(-5, floorY + 1, -4, BLOCK.JUKEBOX);
  setSafe(-9, floorY + 1, -4, BLOCK.CAULDRON_WATER);

  // 4. Compact Fenced Mount Paddock (wx = 6..11, wz = -8..-3) & Mini Wheat Garden (wx = 6..10, wz = 4..8)
  for (let wz = -8; wz <= -3; wz++) {
    for (let wx = 6; wx <= 11; wx++) {
      if ((wx === 6 || wx === 11 || wz === -8 || wz === -3) && !(wx === 6 && wz === -5)) {
        setSafe(wx, floorY + 1, wz, BLOCK.OAK_FENCE);
      }
    }
  }
  setSafe(10, floorY + 1, -7, BLOCK.HAY_BALE);
  setSafe(10, floorY + 1, -6, BLOCK.CAULDRON_WATER);

  for (let wz = 4; wz <= 8; wz++) {
    for (let wx = 6; wx <= 10; wx++) {
      const border = wx === 6 || wx === 10 || wz === 4 || wz === 8;
      if (border) setSafe(wx, floorY, wz, BLOCK.OAK_LOG);
      else if (wz === 6) setSafe(wx, floorY, wz, BLOCK.WATER);
      else {
        setSafe(wx, floorY, wz, BLOCK.FARMLAND);
        setSafe(wx, floorY + 1, wz, BLOCK.WHEAT_CROP);
      }
    }
  }
  setSafe(11, floorY + 1, 5, BLOCK.COMPOSTER);
  setSafe(-3, floorY + 1, 5, BLOCK.CAMPFIRE);
  setSafe(-3, floorY + 1, 6, BLOCK.BARREL);

  // 5. East Gate: Clean Nether Portal Frame (wx = 14, wz = -1..2)
  for (let pz = -1; pz <= 2; pz++) {
    for (let py = 1; py <= 5; py++) {
      const isFrame = pz === -1 || pz === 2 || py === 1 || py === 5;
      setSafe(14, floorY + py, pz, isFrame ? BLOCK.OBSIDIAN : BLOCK.NETHER_PORTAL);
    }
  }

  // 6. North Veldora Crystal Alcove (wx = -3..3, wz = -19..-14, Chest at (0, floorY + 1, -16))
  for (let wz = -19; wz <= -14; wz++) {
    for (let wx = -3; wx <= 3; wx++) {
      for (let y = floorY + 1; y <= floorY + 5; y++) setSafe(wx, y, wz, BLOCK.AIR);
      setSafe(wx, floorY, wz, wz <= -15 ? BLOCK.MOSSY_STONE_BRICKS : BLOCK.DIRT_PATH);
      const isBackOrSide = wz === -19 || (wz <= -15 && Math.abs(wx) === 3);
      if (isBackOrSide) {
        for (let dy = 1; dy <= 3; dy++) {
          let bId: number = BLOCK.DEEPSLATE;
          if (dy === 2 && wx === -2 && wz === -19) bId = BLOCK.DIAMOND_ORE;
          else if (dy === 2 && wx === 2 && wz === -19) bId = BLOCK.EMERALD_ORE;
          else if (dy === 1 && Math.abs(wx) === 3 && wz === -17) bId = BLOCK.GOLD_ORE;
          else if (dy === 1 && Math.abs(wx) === 3 && wz === -16) bId = BLOCK.IRON_ORE;
          else if (dy === 3 && (wx + wz) % 2 === 0) bId = BLOCK.AMETHYST_BLOCK;
          setSafe(wx, floorY + dy, wz, bId);
        }
      }
      if (wz <= -16 && Math.abs(wx) <= 3) {
        setSafe(wx, floorY + 4, wz, BLOCK.MOSSY_STONE_BRICKS);
      }
    }
  }
  setSafe(0, floorY, -17, BLOCK.SEA_LANTERN);
  setSafe(-1, floorY + 1, -18, BLOCK.AMETHYST_CLUSTER);
  setSafe(1, floorY + 1, -18, BLOCK.AMETHYST_CLUSTER);
  setSafe(0, floorY + 1, -16, BLOCK.CHEST);

  // 7. Compact West Monster Hunt Ring & Tempest Arena Trial Altar (-18, floorY, -11)
  for (let wz = -17; wz <= -10; wz++) {
    for (let wx = -21; wx <= -15; wx++) {
      for (let y = floorY + 1; y <= floorY + 5; y++) setSafe(wx, y, wz, BLOCK.AIR);
      setSafe(wx, floorY, wz, Math.abs(wx + 18) <= 2 && Math.abs(wz + 14) <= 2 ? BLOCK.DIRT_PATH : BLOCK.GRASS);
    }
  }
  for (let az = -12; az <= -10; az++) {
    for (let ax = -19; ax <= -17; ax++) {
      setSafe(ax, floorY, az, ax === -18 && az === -11 ? BLOCK.SEA_LANTERN : BLOCK.STONE_BRICKS);
    }
  }
  setSafe(-18, floorY + 1, -11, BLOCK.GOLD_BLOCK);
  setSafe(-18, floorY + 2, -11, BLOCK.BELL_BLOCK);
  setSafe(-19, floorY + 1, -14, BLOCK.CAMPFIRE);
  setSafe(-18, floorY + 1, -14, BLOCK.CHEST);
  setSafe(-17, floorY + 1, -15, BLOCK.HAY_BALE);
  setSafe(-17, floorY + 2, -15, BLOCK.TARGET_BLOCK);
}

// ============================================================================
// THE NETHER: Crimson/Warped Forests, Lava Ocean, Glowstone & Fortress
// ============================================================================
function generateNetherChunk(
  data: Uint8Array,
  baseX: number,
  baseZ: number,
  setSafe: (wx: number, y: number, wz: number, blockId: number, onlyReplaceSoft?: boolean) => void
) {
  const LAVA_SEA = 26;
  const CEIL_Y = 94;

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    const wz = baseZ + lz;
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx;
      const { height: floorH, biome } = sampleColumnInfo(wx, wz, 'nether');
      const ceilDrop = Math.round(78 + netherNoise.fbm2D(wx * 0.018 + 99, wz * 0.018 - 44, 2) * 10);

      for (let y = 0; y <= CEIL_Y; y++) {
        const idx = chunkIndex(lx, y, lz);
        if (y === 0 || y === CEIL_Y) {
          data[idx] = BLOCK.BEDROCK;
          continue;
        }
        if (y >= ceilDrop) {
          data[idx] = BLOCK.NETHERRACK;
          continue;
        }
        if (y <= floorH) {
          // Cavern shelves
          const cav = netherNoise.noise3D(wx * 0.045, y * 0.06, wz * 0.045);
          if (y > LAVA_SEA + 2 && y < floorH - 1 && cav > 0.42 && Math.hypot(wx, wz) > 12) {
            data[idx] = BLOCK.AIR;
            continue;
          }
          if (y === floorH && y >= LAVA_SEA) {
            if (floorH <= LAVA_SEA + 1 && hash2D(wx, wz, 616) < 0.26) {
              data[idx] = BLOCK.MAGMA_BLOCK;
            } else {
              data[idx] =
                biome === 'Kızıl Orman' ? BLOCK.CRIMSON_NYLIUM :
                biome === 'Çarpık Orman' ? BLOCK.WARPED_NYLIUM :
                biome === 'Ruh Kumu Vadisi' ? BLOCK.SOUL_SAND : BLOCK.NETHERRACK;
            }
          } else {
            const qRoll = hash3D(wx, y, wz);
            if (y >= 8 && y <= 22 && qRoll > 0.9965) {
              data[idx] = BLOCK.ANCIENT_DEBRIS;
            } else {
              data[idx] = qRoll < 0.03 ? BLOCK.QUARTZ_ORE : qRoll < 0.038 ? BLOCK.GOLD_ORE : BLOCK.NETHERRACK;
            }
          }
        } else if (y <= LAVA_SEA) {
          data[idx] = BLOCK.LAVA;
        }
      }

      // Hanging Glowstone clusters under Nether ceiling
      if (hash2D(wx, wz, 808) < 0.035 && ceilDrop > floorH + 8) {
        setSafe(wx, ceilDrop - 1, wz, BLOCK.GLOWSTONE);
        if (hash2D(wx, wz, 809) < 0.5) setSafe(wx, ceilDrop - 2, wz, BLOCK.GLOWSTONE);
      }
    }
  }

  // Huge Crimson & Warped Fungi
  for (let wz = baseZ - 3; wz < baseZ + CHUNK_SIZE + 3; wz++) {
    for (let wx = baseX - 3; wx < baseX + CHUNK_SIZE + 3; wx++) {
      if ((wx & 3) !== 0 || (wz & 3) !== 0 || Math.hypot(wx, wz) < 10) continue;
      const { height: floorH, biome } = sampleColumnInfo(wx, wz, 'nether');
      if (floorH <= LAVA_SEA + 1 || hash2D(wx, wz, 515) > 0.24) continue;
      if (biome !== 'Kızıl Orman' && biome !== 'Çarpık Orman') continue;

      const stem = biome === 'Kızıl Orman' ? BLOCK.CRIMSON_STEM : BLOCK.WARPED_STEM;
      const cap = biome === 'Kızıl Orman' ? BLOCK.NETHER_WART_BLOCK : BLOCK.WARPED_WART_BLOCK;
      const h = 5 + Math.floor(hash2D(wx, wz, 516) * 3);
      for (let dy = 1; dy <= h; dy++) setSafe(wx, floorH + dy, wz, stem);
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          setSafe(wx + dx, floorH + h + 1, wz + dz, cap, true);
          if (Math.abs(dx) === 2 || Math.abs(dz) === 2) setSafe(wx + dx, floorH + h, wz + dz, cap, true);
        }
      }
      setSafe(wx + 1, floorH + h - 1, wz, BLOCK.GLOWSTONE, true);
    }
  }

  // Nether Fortress Bridge along Z = 24..30
  if (baseZ <= 32 && baseZ + CHUNK_SIZE >= 22) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx;
      for (let wz = 24; wz <= 28; wz++) {
        setSafe(wx, 44, wz, BLOCK.NETHER_BRICKS);
        const railBlock = (wx & 3) === 2 ? BLOCK.IRON_BARS : BLOCK.NETHER_BRICKS;
        setSafe(wx, 45, wz, wz === 24 || wz === 28 ? railBlock : BLOCK.AIR);
        for (let cy = 46; cy <= 50; cy++) setSafe(wx, cy, wz, BLOCK.AIR);
      }
      if ((wx & 7) === 0) {
        for (let py = 26; py <= 43; py++) {
          setSafe(wx, py, 24, BLOCK.NETHER_BRICKS);
          setSafe(wx, py, 28, BLOCK.NETHER_BRICKS);
        }
      }
    }
  }

  // Safe Return Portal Platform at Nether (0, 46, 0)
  if (baseX <= 8 && baseX + CHUNK_SIZE >= -8 && baseZ <= 8 && baseZ + CHUNK_SIZE >= -8) {
    for (let wz = -4; wz <= 4; wz++) {
      for (let wx = -4; wx <= 4; wx++) {
        setSafe(wx, 45, wz, BLOCK.NETHER_BRICKS);
        for (let y = 46; y <= 53; y++) setSafe(wx, y, wz, BLOCK.AIR);
      }
    }
    for (let pz = -1; pz <= 2; pz++) {
      for (let py = 46; py <= 50; py++) {
        const frame = pz === -1 || pz === 2 || py === 46 || py === 50;
        setSafe(3, py, pz, frame ? BLOCK.OBSIDIAN : BLOCK.NETHER_PORTAL);
      }
    }
  }
}

// ============================================================================
// THE END: Central Island, 10 Obsidian Crystal Pillars & Exit Fountain
// ============================================================================
function generateEndChunk(
  data: Uint8Array,
  baseX: number,
  baseZ: number,
  setSafe: (wx: number, y: number, wz: number, blockId: number) => void
) {
  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    const wz = baseZ + lz;
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx;
      const dist = Math.hypot(wx, wz);
      if (dist > 42) continue;

      const { height: topY } = sampleColumnInfo(wx, wz, 'end');
      const botY = Math.round(30 + Math.pow(dist / 42, 1.7) * 16);
      for (let y = Math.max(12, botY); y <= topY; y++) {
        data[chunkIndex(lx, y, lz)] = BLOCK.END_STONE;
      }
    }
  }

  // 10 Tall Obsidian Pillars in a 26-block circle topped with End Crystals
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const px = Math.round(Math.cos(ang) * 25);
    const pz = Math.round(Math.sin(ang) * 25);
    if (px + 3 < baseX || px - 3 > baseX + CHUNK_SIZE || pz + 3 < baseZ || pz - 3 > baseZ + CHUNK_SIZE) continue;
    const pillarTop = 64 + (i % 4) * 4;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let y = 45; y <= pillarTop; y++) {
          setSafe(px + dx, y, pz + dz, BLOCK.OBSIDIAN);
        }
      }
    }
    setSafe(px, pillarTop + 1, pz, BLOCK.BEDROCK);
    setSafe(px, pillarTop + 2, pz, BLOCK.END_CRYSTAL_BLOCK);
  }

  // Central Bedrock Fountain Podium (0, 54, 0) + Safe Arrival Obsidian Pad (10, 52, 0)
  if (baseX <= 14 && baseX + CHUNK_SIZE >= -6 && baseZ <= 6 && baseZ + CHUNK_SIZE >= -6) {
    const podiumY = sampleColumnInfo(0, 0, 'end').height;
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dz) <= 3) {
          const rim = Math.abs(dx) === 2 || Math.abs(dz) === 2 || Math.abs(dx) + Math.abs(dz) === 3;
          setSafe(dx, podiumY + 1, dz, rim ? BLOCK.BEDROCK : BLOCK.END_STONE);
        }
      }
    }
    for (let py = 1; py <= 4; py++) setSafe(0, podiumY + py, 0, BLOCK.BEDROCK);
    setSafe(0, podiumY + 5, 0, BLOCK.TORCH);

    // Obsidian spawn platform at (10, 52, 0)
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = 8; dx <= 12; dx++) {
        setSafe(dx, 52, dz, BLOCK.OBSIDIAN);
        for (let cy = 53; cy <= 57; cy++) setSafe(dx, cy, dz, BLOCK.AIR);
      }
    }
  }
}
