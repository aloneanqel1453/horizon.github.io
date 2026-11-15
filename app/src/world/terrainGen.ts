import { BLOCK } from './blocks';
import { SeededNoise, WORLD_SEED, hash2D, hash3D } from './noise';
import { blendLandmarkHeight, isInsideLandmarkClearZone, queryNearbyLandmark, stampLandmarksInChunk } from './worldLandmarks';

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
    if (dist > 44) {
      const lm = queryNearbyLandmark(wx, wz, 'end');
      if (lm && Math.hypot(wx - lm.cx, wz - lm.cz) <= 13.2) {
        return { height: lm.baseY, biome: 'End Adası' };
      }
      return { height: 0, biome: 'End Adası' };
    }
    const edgeFade = Math.max(0, 1 - Math.pow(dist / 42, 2.4));
    const top = Math.round(46 + edgeFade * 8 + detailNoise.fbm2D(wx * 0.035, wz * 0.035, 2) * 3);
    return { height: top, biome: 'End Adası' };
  }

  const distSpawn = Math.hypot(wx, wz);

  const cont = terrainNoise.fbm2D(wx * 0.0032, wz * 0.0032, 3);
  const ridge = Math.abs(terrainNoise.fbm2D(wx * 0.0068 + 40, wz * 0.0068 - 25, 2));
  const detail = detailNoise.fbm2D(wx * 0.024, wz * 0.024, 2);

  const temp = tempNoise.fbm2D(wx * 0.0026 + 120, wz * 0.0026 - 80, 2);
  const humid = humidNoise.fbm2D(wx * 0.0028 - 60, wz * 0.0028 + 150, 2);

  let rawH = SEA_LEVEL + 6 + cont * 15 + Math.pow(ridge, 1.55) * 21 + detail * 2.5;

  // River valleys & crystal lakes kept outside the wide Jura Tempest Capital plain
  const riverMask = Math.abs(terrainNoise.noise2D(wx * 0.0048 - 12, wz * 0.0048 + 31));
  if (riverMask < 0.072 && distSpawn > 84) {
    const t = 1 - riverMask / 0.072;
    rawH = rawH * (1 - t * 0.68) + (SEA_LEVEL - 4) * (t * 0.68);
  }

  // Wide, sunlit, zero-lag Jura Tempest Capital plateau around spawn (dist < 78)
  if (distSpawn < 78) {
    const b = Math.max(0, Math.min(1, (distSpawn - 38) / 40));
    const smooth = b * b * (3 - 2 * b);
    rawH = (SPAWN_Y - 1) * (1 - smooth) + rawH * smooth;
  } else {
    // Smooth O(1) terrain flattening & lagoon carving for all 184 outer World Regions!
    rawH = blendLandmarkHeight(wx, wz, rawH);
  }

  const height = Math.max(8, Math.min(WORLD_HEIGHT - 16, Math.round(rawH)));

  let biome: BiomeKind = 'Çayır Vadisi';
  if (distSpawn < 35) {
    biome = 'Köy Meydanı';
  } else if (distSpawn < 68) {
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

      // Light, low-overdraw surface wildflowers outside Rimuru Capital City
      if (height > SEA_LEVEL + 1 && distSpawn > 36) {
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

  // 2. Clean 8x8-Spaced Low-Overdraw Trees (kept clear of Jura Tempest Capital City)
  for (let wz = baseZ - 3; wz < baseZ + CHUNK_SIZE + 3; wz++) {
    for (let wx = baseX - 3; wx < baseX + CHUNK_SIZE + 3; wx++) {
      if ((wx & 7) !== 0 || (wz & 7) !== 0) continue;
      if (Math.hypot(wx, wz) < 39) continue;

      const jitterX = wx + Math.floor(hash2D(wx, wz, 11) * 3);
      const jitterZ = wz + Math.floor(hash2D(wx, wz, 22) * 3);
      if (Math.hypot(jitterX, jitterZ) < 39) continue;
      if (isInsideLandmarkClearZone(jitterX, jitterZ)) continue;

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

  // 3. Zero-Lag Jura Tempest Capital City ("Rimuru Başkenti") (-30..28, SPAWN_Y-1, -27..33)
  const floorY = SPAWN_Y - 1;
  if (baseX <= 29 && baseX + CHUNK_SIZE >= -31 && baseZ <= 34 && baseZ + CHUNK_SIZE >= -28) {
    stampTempestCapitalCity(floorY, setSafe);
  }

  // 4. Stamp all 184 Outer Overworld Villages, Anime Kingdoms, Dragon Roosts & Swimming Lagoons!
  stampLandmarksInChunk('overworld', baseX, baseZ, setSafe);
}

function stampTempestCapitalCity(
  floorY: number,
  setSafe: (wx: number, y: number, wz: number, blockId: number, onlyReplaceSoft?: boolean) => void
) {
  // 1. Capital City Park Lawns & Grand Stone-Brick Boulevards (-28..25, -25..31)
  for (let wz = -25; wz <= 31; wz++) {
    for (let wx = -28; wx <= 25; wx++) {
      if (Math.hypot(wx, wz) > 36) continue;
      for (let y = floorY + 1; y <= floorY + 16; y++) setSafe(wx, y, wz, BLOCK.AIR);

      const onNS = Math.abs(wx) <= 2 && wz >= -19 && wz <= 19;
      const onEW = Math.abs(wz) <= 2 && wx >= -17 && wx <= 17;
      const inPlaza = Math.abs(wx) <= 5 && Math.abs(wz) <= 5;

      if (onNS || onEW || inPlaza) {
        const isGoldMedallion =
          (wx === 0 && (wz === 6 || wz === 12 || wz === -6 || wz === -12)) ||
          (wz === 0 && (wx === 6 || wx === 12 || wx === -6 || wx === -12));
        const isCurb =
          (!inPlaza && onNS && Math.abs(wx) === 2) ||
          (!inPlaza && onEW && Math.abs(wz) === 2) ||
          (inPlaza && (Math.abs(wx) === 5 || Math.abs(wz) === 5));
        setSafe(wx, floorY, wz, isGoldMedallion ? BLOCK.GOLD_BLOCK : isCurb ? BLOCK.COBBLESTONE : BLOCK.STONE_BRICKS);
      } else {
        setSafe(wx, floorY, wz, BLOCK.GRASS);
      }
    }
  }

  // Ornate Sea-Lantern Streetlamps lining the Grand Boulevards
  const lampCoords: Array<[number, number]> = [
    [-4, 5], [4, 5], [-4, 12], [4, 12], [-4, -5], [4, -5], [-4, -12], [4, -12],
    [-12, -4], [-12, 4], [12, -4], [12, 4]
  ];
  for (const [lx, lz] of lampCoords) {
    setSafe(lx, floorY + 1, lz, BLOCK.STONE_BRICKS);
    setSafe(lx, floorY + 2, lz, BLOCK.OAK_FENCE);
    setSafe(lx, floorY + 3, lz, BLOCK.OAK_FENCE);
    setSafe(lx, floorY + 4, lz, BLOCK.SEA_LANTERN);
    setSafe(lx, floorY + 5, lz, BLOCK.STONE_BRICK_SLAB);
  }

  // 2. Central Jura Tempest Fountain & Waystone Obelisk (-2..2, -2..2)
  for (let wz = -2; wz <= 2; wz++) {
    for (let wx = -2; wx <= 2; wx++) {
      const edge = Math.abs(wx) === 2 || Math.abs(wz) === 2;
      if (wx === 0 && wz === 0) {
        setSafe(0, floorY, 0, BLOCK.HORIZON_PURPUR);
        setSafe(0, floorY + 1, 0, BLOCK.SEA_LANTERN); // Central Plaza Waystone!
        setSafe(0, floorY + 2, 0, BLOCK.GOLD_BLOCK);
        setSafe(0, floorY + 3, 0, BLOCK.BELL_BLOCK);
      } else if (edge) {
        if (Math.abs(wx) === 2 && Math.abs(wz) === 2) {
          setSafe(wx, floorY + 1, wz, BLOCK.STONE_BRICKS);
          setSafe(wx, floorY + 2, wz, BLOCK.POTTED_POPPY);
        } else {
          setSafe(wx, floorY + 1, wz, BLOCK.STONE_BRICK_SLAB);
        }
      } else {
        setSafe(wx, floorY - 1, wz, BLOCK.SEA_LANTERN);
        setSafe(wx, floorY, wz, BLOCK.WATER);
      }
    }
  }

  // 3. Rimuru Royal Mansion & Enchanting Library (wx = -15..-6, wz = -10..-3, door at (-10, -3))
  for (let wz = -10; wz <= -3; wz++) {
    for (let wx = -15; wx <= -6; wx++) {
      setSafe(wx, floorY, wz, BLOCK.OAK_PLANKS);
      const edgeX = wx === -15 || wx === -6;
      const edgeZ = wz === -10 || wz === -3;
      const corner = edgeX && edgeZ;

      // Ground floor walls (dy = 1..3) + 2nd story study walls (dy = 5..7)
      for (let dy = 1; dy <= 7; dy++) {
        if (dy === 4) {
          // 2nd floor ceiling/deck (with stairwell opening at wx=-14, wz=-4)
          if (!(wx === -14 && wz === -4)) {
            setSafe(wx, floorY + 4, wz, BLOCK.SPRUCE_PLANKS);
          }
          continue;
        }
        if (!edgeX && !edgeZ) continue;
        // Front doorway at (-10, -3)
        if (wx === -10 && wz === -3 && dy <= 2) {
          setSafe(wx, floorY + dy, wz, BLOCK.OAK_DOOR_CLOSED);
        } else if (wx === -10 && wz === -3 && dy >= 5 && dy <= 6) {
          // Upper balcony doorway
          setSafe(wx, floorY + dy, wz, BLOCK.AIR);
        } else if (corner || (edgeZ && wx === -11)) {
          setSafe(wx, floorY + dy, wz, BLOCK.OAK_LOG);
        } else if (dy === 1) {
          setSafe(wx, floorY + 1, wz, BLOCK.STONE_BRICKS);
        } else if ((dy === 2 || dy === 6) && ((wz === -3 && (wx === -8 || wx === -13)) || (wz === -10 && (wx === -8 || wx === -12)) || (edgeX && wz === -6))) {
          setSafe(wx, floorY + dy, wz, BLOCK.GLASS_PANE);
        } else {
          setSafe(wx, floorY + dy, wz, BLOCK.BIRCH_PLANKS);
        }
      }
    }
  }
  // Mansion Balcony overlooking Royal Avenue (-12..-8, -2) + Pitched Spruce Roof
  for (let bx = -12; bx <= -8; bx++) {
    setSafe(bx, floorY + 4, -2, BLOCK.SPRUCE_SLAB);
    setSafe(bx, floorY + 5, -2, BLOCK.OAK_FENCE);
  }
  for (let wz = -11; wz <= -2; wz++) {
    for (let wx = -16; wx <= -5; wx++) {
      const rim = wx === -16 || wx === -5 || wz === -11 || wz === -2;
      setSafe(wx, floorY + 8, wz, rim ? BLOCK.SPRUCE_SLAB : BLOCK.SPRUCE_PLANKS);
      if (!rim) setSafe(wx, floorY + 9, wz, BLOCK.SPRUCE_SLAB);
    }
  }
  // Mansion Interior: Bed, Crafting, Lit Furnace, Royal Chest, Anvil, Enchanting Library & Ladder
  for (let ly = 1; ly <= 4; ly++) setSafe(-14, floorY + ly, -4, BLOCK.LADDER);
  setSafe(-14, floorY + 1, -9, BLOCK.BED_BLOCK);
  setSafe(-13, floorY + 1, -9, BLOCK.CRAFTING_TABLE);
  setSafe(-12, floorY + 1, -9, BLOCK.FURNACE_LIT);
  setSafe(-11, floorY + 1, -9, BLOCK.CHEST); // Royal Mansion Chest!
  setSafe(-9, floorY + 1, -9, BLOCK.ANVIL);
  setSafe(-7, floorY + 1, -9, BLOCK.JUKEBOX);
  setSafe(-7, floorY + 1, -5, BLOCK.CAULDRON_WATER);
  for (let bz = -8; bz <= -5; bz++) {
    setSafe(-14, floorY + 1, bz, BLOCK.BOOKSHELF);
    setSafe(-14, floorY + 2, bz, BLOCK.BOOKSHELF);
  }
  setSafe(-13, floorY + 1, -6, BLOCK.ENCHANTING_TABLE);
  setSafe(-10, floorY + 3, -4, BLOCK.LANTERN);
  setSafe(-10, floorY + 7, -6, BLOCK.LANTERN);

  // 4. Kaijin Blacksmith Forge & Armory (wx = 6..14, wz = -10..-3, open front colonnade at wz = -3)
  for (let wz = -10; wz <= -3; wz++) {
    for (let wx = 6; wx <= 14; wx++) {
      setSafe(wx, floorY, wz, BLOCK.STONE_BRICKS);
      const edgeX = wx === 6 || wx === 14;
      const backZ = wz === -10;
      const frontCol = wz === -3 && (wx === 6 || wx === 10 || wx === 14);
      for (let dy = 1; dy <= 3; dy++) {
        if (frontCol || (edgeX && backZ)) {
          setSafe(wx, floorY + dy, wz, BLOCK.DEEPSLATE);
        } else if (backZ || (edgeX && wz <= -6)) {
          setSafe(wx, floorY + dy, wz, dy === 2 && wz === -8 ? BLOCK.IRON_BARS : BLOCK.STONE_BRICKS);
        }
      }
      setSafe(wx, floorY + 4, wz, BLOCK.STONE_BRICK_SLAB);
    }
  }
  // Safe Glowing Lava Crucible behind Iron Bars + Twin Furnaces, Twin Anvils & Forge Chest
  setSafe(12, floorY + 1, -9, BLOCK.LAVA);
  setSafe(13, floorY + 1, -9, BLOCK.LAVA);
  setSafe(11, floorY + 1, -9, BLOCK.STONE_BRICKS);
  setSafe(11, floorY + 2, -9, BLOCK.STONE_BRICKS);
  setSafe(12, floorY + 1, -8, BLOCK.IRON_BARS);
  setSafe(13, floorY + 1, -8, BLOCK.IRON_BARS);
  setSafe(12, floorY + 2, -8, BLOCK.IRON_BARS);
  setSafe(13, floorY + 2, -8, BLOCK.IRON_BARS);
  for (let cy = 4; cy <= 7; cy++) setSafe(13, floorY + cy, -9, BLOCK.BRICKS); // Forge Chimney
  setSafe(9, floorY + 1, -9, BLOCK.FURNACE_LIT);
  setSafe(10, floorY + 1, -9, BLOCK.FURNACE_LIT);
  setSafe(7, floorY + 1, -9, BLOCK.CHEST); // Kaijin Forge Chest!
  setSafe(8, floorY + 1, -6, BLOCK.ANVIL);
  setSafe(9, floorY + 1, -6, BLOCK.ANVIL);
  setSafe(11, floorY + 1, -6, BLOCK.CAULDRON_WATER);
  setSafe(10, floorY + 3, -5, BLOCK.LANTERN);

  // 5. Adventurer's Guild Pavilion (-14..-6, 4..10), Bazaar Stalls (6..14, 4..10) & Royal Stables (15..21, -8..-2)
  for (let wz = 4; wz <= 10; wz++) {
    for (let wx = -14; wx <= -6; wx++) {
      setSafe(wx, floorY, wz, BLOCK.SPRUCE_PLANKS);
      if ((wx === -14 || wx === -6) && (wz === 4 || wz === 10)) {
        for (let dy = 1; dy <= 3; dy++) setSafe(wx, floorY + dy, wz, BLOCK.SPRUCE_LOG);
      }
      setSafe(wx, floorY + 4, wz, BLOCK.SPRUCE_SLAB);
    }
  }
  setSafe(-11, floorY + 1, 9, BLOCK.BOOKSHELF);
  setSafe(-10, floorY + 1, 9, BLOCK.GOLD_BLOCK);
  setSafe(-10, floorY + 2, 9, BLOCK.BELL_BLOCK); // Guild Quest Board Bell!
  setSafe(-9, floorY + 1, 9, BLOCK.BOOKSHELF);
  setSafe(-12, floorY + 1, 7, BLOCK.CRAFTING_TABLE);
  setSafe(-8, floorY + 1, 7, BLOCK.OAK_PLANKS);
  setSafe(-8, floorY + 2, 7, BLOCK.CAKE);
  setSafe(-10, floorY + 1, 5, BLOCK.CAMPFIRE);
  setSafe(-10, floorY + 3, 7, BLOCK.LANTERN);

  // Colorful Striped Market Stalls (6..13, 4..8) + Irrigated Wheat Garden (6..12, 10..14)
  for (let wz = 4; wz <= 8; wz++) {
    for (let wx = 6; wx <= 13; wx++) {
      setSafe(wx, floorY, wz, BLOCK.DIRT_PATH);
      if ((wx === 6 || wx === 9 || wx === 10 || wx === 13) && (wz === 4 || wz === 8)) {
        setSafe(wx, floorY + 1, wz, BLOCK.OAK_FENCE);
        setSafe(wx, floorY + 2, wz, BLOCK.OAK_FENCE);
      }
      const stripe = (wx + wz) % 2 === 0;
      if (wx <= 9) setSafe(wx, floorY + 3, wz, stripe ? BLOCK.WOOL_RED : BLOCK.WOOL_WHITE);
      if (wx >= 10) setSafe(wx, floorY + 3, wz, stripe ? BLOCK.DIAMOND_BLOCK : BLOCK.WOOL_WHITE);
    }
  }
  setSafe(7, floorY + 1, 7, BLOCK.BARREL);
  setSafe(8, floorY + 1, 7, BLOCK.POTTED_CHERRY);
  setSafe(11, floorY + 1, 7, BLOCK.CHEST);
  setSafe(12, floorY + 1, 7, BLOCK.NOTE_BLOCK);

  for (let wz = 10; wz <= 14; wz++) {
    for (let wx = 6; wx <= 12; wx++) {
      const border = wx === 6 || wx === 12 || wz === 10 || wz === 14;
      if (border) setSafe(wx, floorY, wz, BLOCK.OAK_LOG);
      else if (wz === 12) setSafe(wx, floorY, wz, BLOCK.WATER);
      else {
        setSafe(wx, floorY, wz, BLOCK.FARMLAND);
        setSafe(wx, floorY + 1, wz, BLOCK.WHEAT_CROP);
      }
    }
  }
  setSafe(13, floorY + 1, 12, BLOCK.COMPOSTER);

  // Royal Mount Stables (wx = 15..21, wz = -8..-2)
  for (let wz = -8; wz <= -2; wz++) {
    for (let wx = 15; wx <= 21; wx++) {
      setSafe(wx, floorY, wz, BLOCK.GRASS);
      if ((wx === 15 || wx === 21 || wz === -8 || wz === -2) && !(wx === 15 && (wz === -5 || wz === -4))) {
        setSafe(wx, floorY + 1, wz, BLOCK.OAK_FENCE);
      }
      if (wz <= -6) setSafe(wx, floorY + 3, wz, BLOCK.OAK_SLAB);
    }
  }
  setSafe(20, floorY + 1, -7, BLOCK.HAY_BALE);
  setSafe(19, floorY + 1, -7, BLOCK.HAY_BALE);
  setSafe(16, floorY + 1, -7, BLOCK.CAULDRON_WATER);

  // 6. North Tempest Clocktower, Grappling Hook & Elytra Launch Tower (-3..3, -25..-19, height floorY+15)
  for (let wz = -25; wz <= -19; wz++) {
    for (let wx = -3; wx <= 3; wx++) {
      setSafe(wx, floorY, wz, BLOCK.STONE_BRICKS);
      const edgeX = Math.abs(wx) === 3;
      const edgeZ = wz === -25 || wz === -19;
      const corner = edgeX && edgeZ;

      for (let dy = 1; dy <= 12; dy++) {
        if (dy === 6 || dy === 12) {
          // Intermediate & rooftop floors (leave ladder shaft open at (0, -24))
          if (!(wx === 0 && wz === -24)) {
            setSafe(wx, floorY + dy, wz, BLOCK.SPRUCE_PLANKS);
          }
        }
        if (!edgeX && !edgeZ) continue;
        if (wx === 0 && wz === -19 && dy <= 2) {
          setSafe(wx, floorY + dy, wz, BLOCK.AIR); // Open archway entrance
        } else if (corner) {
          setSafe(wx, floorY + dy, wz, BLOCK.DEEPSLATE);
        } else if (dy === 9 && ((wz === -19 && Math.abs(wx) <= 1) || ( wz === -25 && Math.abs(wx) <= 1))) {
          // Glowing Golden Clockface!
          setSafe(wx, floorY + dy, wz, wx === 0 ? BLOCK.SEA_LANTERN : BLOCK.GOLD_BLOCK);
        } else if (dy % 4 === 3 && (wx === 0 || wz === -22)) {
          setSafe(wx, floorY + dy, wz, BLOCK.GLASS_PANE);
        } else {
          setSafe(wx, floorY + dy, wz, BLOCK.STONE_BRICKS);
        }
      }
      // Rooftop battlements at dy = 13
      if (edgeX || edgeZ) {
        setSafe(wx, floorY + 13, wz, corner ? BLOCK.SEA_LANTERN : BLOCK.STONE_BRICK_SLAB);
      }
    }
  }
  // Ladder shaft from ground up to Clocktower Roof + Grappling Ledges + Sky Chest + Elytra Diving Board + Slime Bounce Pad!
  for (let ly = 1; ly <= 12; ly++) setSafe(0, floorY + ly, -24, BLOCK.LADDER);
  for (const [gx, gy, gz] of [[-4, 4, -20], [4, 7, -20], [-4, 10, -22], [4, 11, -22]]) {
    setSafe(gx, floorY + gy, gz, BLOCK.STONE_BRICK_SLAB);
  }
  setSafe(0, floorY + 13, -22, BLOCK.CHEST); // Clocktower Sky Chest!
  setSafe(0, floorY + 12, -21, BLOCK.HORIZON_PURPUR);
  setSafe(0, floorY + 13, -21, BLOCK.SEA_LANTERN); // Clocktower Waystone!
  setSafe(0, floorY + 12, -18, BLOCK.GOLD_BLOCK); // South-facing Elytra Diving Board
  setSafe(0, floorY + 12, -17, BLOCK.SPRUCE_SLAB);
  for (let sx = -1; sx <= 1; sx++) {
    for (let sz = -17; sz <= -15; sz++) {
      setSafe(sx, floorY, sz, BLOCK.SLIME_BLOCK); // Zero-fall-damage Slime Bounce Pad below diving board!
    }
  }

  // 7. South Crystal Harbor Lagoon & Fishing Pier (wx = -8..8, wz = 19..31, 4-block-deep swimming water!)
  for (let wz = 19; wz <= 31; wz++) {
    for (let wx = -8; wx <= 8; wx++) {
      const border = Math.abs(wx) === 8 || wz === 31 || wz === 19;
      if (border) {
        setSafe(wx, floorY, wz, wz === 19 ? BLOCK.STONE_BRICKS : BLOCK.SAND);
      } else {
        setSafe(wx, floorY - 4, wz, (wx + wz) % 4 === 0 ? BLOCK.SEA_LANTERN : BLOCK.SAND);
        for (let wy = floorY - 3; wy <= floorY; wy++) {
          setSafe(wx, wy, wz, BLOCK.WATER);
        }
      }
    }
  }
  // Wooden Harbor Pier extending south over Crystal Lagoon (wx = -2..2, wz = 18..22; leaves wz = 23..30 wide-open sunlit swimming lagoon!)
  for (let wz = 18; wz <= 22; wz++) {
    for (let wx = -2; wx <= 2; wx++) {
      setSafe(wx, floorY + 1, wz, BLOCK.OAK_SLAB);
      if (Math.abs(wx) === 2 && (wz === 19 || wz === 22)) {
        setSafe(wx, floorY + 1, wz, BLOCK.OAK_LOG);
        setSafe(wx, floorY + 2, wz, BLOCK.OAK_FENCE);
        setSafe(wx, floorY + 3, wz, BLOCK.LANTERN);
      }
    }
  }
  setSafe(0, floorY + 1, 18, BLOCK.OAK_SLAB);
  setSafe(2, floorY + 1, 21, BLOCK.BARREL); // Harbor Fishing Tackle Barrel!
  setSafe(-2, floorY, 21, BLOCK.HORIZON_PURPUR);
  setSafe(-2, floorY + 1, 21, BLOCK.SEA_LANTERN); // Harbor Waystone!

  // 8. West Colosseum Arena & Redstone Archery Range (center = (-22, -13), radius = 6)
  for (let wz = -19; wz <= -7; wz++) {
    for (let wx = -28; wx <= -16; wx++) {
      const d = Math.hypot(wx + 22, wz + 13);
      if (d > 6.4) continue;
      setSafe(wx, floorY, wz, d < 2.2 ? BLOCK.STONE_BRICKS : BLOCK.SAND);
      if (d >= 5.3 && !(wx >= -17 && Math.abs(wz + 13) <= 1)) {
        setSafe(wx, floorY + 1, wz, BLOCK.STONE_BRICKS);
        if ((wx + wz) % 2 === 0) setSafe(wx, floorY + 2, wz, BLOCK.STONE_BRICK_SLAB);
      }
    }
  }
  // Exposed Colosseum East Gate Waystone Pedestal (-16, floorY+1, -11) + Center Trial Bell Dais!
  setSafe(-16, floorY, -11, BLOCK.HORIZON_PURPUR);
  setSafe(-16, floorY + 1, -11, BLOCK.SEA_LANTERN); // Exposed Arena Waystone!
  setSafe(-22, floorY, -13, BLOCK.GOLD_BLOCK);
  setSafe(-22, floorY + 1, -13, BLOCK.GOLD_BLOCK);
  setSafe(-22, floorY + 2, -13, BLOCK.BELL_BLOCK); // 5-Wave Colosseum Trial Bell!
  setSafe(-22, floorY + 1, -16, BLOCK.CHEST); // Colosseum Champion Chest!
  // Redstone Archery Target Range on East Rim of Colosseum
  setSafe(-17, floorY + 1, -16, BLOCK.HAY_BALE);
  setSafe(-17, floorY + 2, -16, BLOCK.TARGET_BLOCK);
  setSafe(-17, floorY + 3, -16, BLOCK.REDSTONE_LAMP_OFF);

  // 9. East Cherry-Blossom Shrine & Ornate Nether Portal Gate (wx = 16..24, wz = 5..12)
  for (let wz = 5; wz <= 12; wz++) {
    for (let wx = 16; wx <= 24; wx++) {
      const path = Math.abs(wz - 8) <= 1;
      setSafe(wx, floorY, wz, path ? BLOCK.MOSSY_STONE_BRICKS : BLOCK.GRASS);
      if (!path && (wx + wz) % 3 === 0 && wx <= 21) {
        setSafe(wx, floorY + 1, wz, BLOCK.CHERRY_PETALS);
      }
    }
  }
  // Cherry Torii Gate at wx = 17, wz = 6..10
  for (let ty = 1; ty <= 4; ty++) {
    setSafe(17, floorY + ty, 6, BLOCK.CHERRY_LOG);
    setSafe(17, floorY + ty, 10, BLOCK.CHERRY_LOG);
  }
  for (let tz = 5; tz <= 11; tz++) setSafe(17, floorY + 5, tz, BLOCK.CHERRY_PLANKS);
  setSafe(18, floorY, 6, BLOCK.HORIZON_PURPUR);
  setSafe(18, floorY + 1, 6, BLOCK.SEA_LANTERN); // Shrine Waystone!
  // Lit Obsidian Nether Portal at wx = 23, wz = 7..10
  for (let pz = 7; pz <= 10; pz++) {
    for (let py = 1; py <= 5; py++) {
      const isFrame = pz === 7 || pz === 10 || py === 1 || py === 5;
      setSafe(23, floorY + py, pz, isFrame ? BLOCK.OBSIDIAN : BLOCK.NETHER_PORTAL);
    }
  }

  // 10. Underground Dungeon Beneath Capital: "Ramiris'in Kadim Labirenti" (wx = -12..12, wz = -23..-9, labY = floorY - 13)
  const labY = floorY - 13; // y = 35 (standing height y = 36.05)
  for (let wz = -23; wz <= -9; wz++) {
    for (let wx = -12; wx <= 12; wx++) {
      const wallX = Math.abs(wx) === 12;
      const wallZ = wz === -23 || wz === -9;
      const runicCross = Math.abs(wx) <= 1 || Math.abs(wz + 16) <= 1;
      setSafe(wx, labY, wz, wallX || wallZ ? BLOCK.DEEPSLATE : runicCross ? BLOCK.HORIZON_PURPUR : BLOCK.MOSSY_STONE_BRICKS);
      setSafe(wx, labY + 6, wz, (Math.abs(wx) % 5 === 0 && Math.abs(wz + 16) % 4 === 0) ? BLOCK.SEA_LANTERN : BLOCK.DEEPSLATE);
      for (let dy = 1; dy <= 5; dy++) {
        if (wallX || wallZ) {
          setSafe(wx, labY + dy, wz, dy === 3 && (wx % 4 === 0 || wz % 4 === 0) ? BLOCK.MOSSY_STONE_BRICKS : BLOCK.DEEPSLATE);
        } else {
          setSafe(wx, labY + dy, wz, BLOCK.AIR);
        }
      }
    }
  }
  // 4 Glowing Amethyst & Sea-Lantern Pillars inside Ramiris's Labyrinth
  for (const [px, pz] of [[-5, -19], [5, -19], [-5, -12], [5, -12]]) {
    for (let dy = 1; dy <= 5; dy++) {
      setSafe(px, labY + dy, pz, dy === 3 ? BLOCK.SEA_LANTERN : BLOCK.AMETHYST_BLOCK);
    }
    setSafe(px, labY + 1, pz + (pz < -15 ? 1 : -1), BLOCK.AMETHYST_CLUSTER);
  }
  // Labyrinth Central Boss Pedestal + 3D Bell (0, labY+2, -16) & Twin Vault Chests ((-8, labY+1, -16), (8, labY+1, -16))
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -17; dz <= -15; dz++) {
      setSafe(dx, labY + 1, dz, dx === 0 && dz === -16 ? BLOCK.GOLD_BLOCK : BLOCK.STONE_BRICK_SLAB);
    }
  }
  setSafe(0, labY + 2, -16, BLOCK.BELL_BLOCK); // Ramiris Labyrinth Guardian Bell!
  setSafe(-8, labY + 1, -16, BLOCK.CHEST); // West Labyrinth Vault Chest!
  setSafe(8, labY + 1, -16, BLOCK.CHEST);  // East Labyrinth Vault Chest!
  setSafe(-4, labY, -21, BLOCK.HORIZON_PURPUR);
  setSafe(-4, labY + 1, -21, BLOCK.SEA_LANTERN); // Labyrinth Waystone!

  // Surface-to-Labyrinth Ornate Portal Shaft beside Clocktower (wx = -7..-5, wz = -22..-19)
  for (let sy = 1; sy <= 3; sy++) {
    setSafe(-7, floorY + sy, -21, BLOCK.HORIZON_PURPUR);
    setSafe(-5, floorY + sy, -21, BLOCK.HORIZON_PURPUR);
  }
  setSafe(-7, floorY + 4, -21, BLOCK.SEA_LANTERN);
  setSafe(-6, floorY + 4, -21, BLOCK.HORIZON_PURPUR);
  setSafe(-5, floorY + 4, -21, BLOCK.SEA_LANTERN);
  for (let wy = labY + 1; wy <= floorY + 1; wy++) {
    // Protective shaft walls underground
    if (wy <= floorY) {
      setSafe(-7, wy, -21, BLOCK.DEEPSLATE);
      setSafe(-5, wy, -21, BLOCK.DEEPSLATE);
      setSafe(-6, wy, -22, BLOCK.DEEPSLATE);
      if (wy <= floorY - 2) {
        setSafe(-7, wy, -20, BLOCK.DEEPSLATE);
        setSafe(-5, wy, -20, BLOCK.DEEPSLATE);
      }
    }
    setSafe(-6, wy, -21, BLOCK.LADDER);
    setSafe(-6, wy, -20, BLOCK.AIR);
  }
  setSafe(-6, labY, -20, BLOCK.SLIME_BLOCK); // Zero-fall-damage Slime Cushion at bottom of drop shaft!
  setSafe(-6, labY, -21, BLOCK.HORIZON_PURPUR);
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

  stampLandmarksInChunk('nether', baseX, baseZ, setSafe);
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

  stampLandmarksInChunk('end', baseX, baseZ, setSafe);
}
