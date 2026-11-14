// Authentic Jappa-Shaded 16x16 Voxel Texture Atlas, Crack Decals, GUI Icons & 3D Extruded Item Meshes

import * as THREE from 'three';
import { BLOCK, BLOCKS, TILE } from './blocks';
import { ALL_CREATIVE_ITEMS, ItemDef, getItemDef } from '../items/catalog';

export const ATLAS_GRID = 16; // 16x16 = 256 tile slots
export const TILE_PX = 16;
export const ATLAS_PX = ATLAS_GRID * TILE_PX;

type RGB = [number, number, number];
type RGBA = [number, number, number, number];

class Rng {
  private s: number;
  constructor(seed: number) { this.s = seed | 0; }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function shadeRgb(c: RGB, k: number): RGB {
  return [clampByte(c[0] * k), clampByte(c[1] * k), clampByte(c[2] * k)];
}

export interface BuiltAtlas {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  icons: Map<number, string>;
}

export function buildVoxelAtlas(): BuiltAtlas {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_PX;
  canvas.height = ATLAS_PX;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(ATLAS_PX, ATLAS_PX);
  const data = img.data;

  const setPx = (tile: number, x: number, y: number, c: RGB | RGBA) => {
    const tx = (tile % ATLAS_GRID) * TILE_PX + (x & 15);
    const ty = Math.floor(tile / ATLAS_GRID) * TILE_PX + (y & 15);
    const i = (ty * ATLAS_PX + tx) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = c.length === 4 ? c[3] : 255;
  };

  const getPx = (tile: number, x: number, y: number): RGBA => {
    const tx = (tile % ATLAS_GRID) * TILE_PX + (x & 15);
    const ty = Math.floor(tile / ATLAS_GRID) * TILE_PX + (y & 15);
    const i = (ty * ATLAS_PX + tx) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  const clearTile = (tile: number) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) setPx(tile, x, y, [0, 0, 0, 0]);
  };

  // --- 1. Lush Vanilla Grass, Dirt, Dirt Path & Farmland ---
  const GRASS_BASE: RGB[] = [
    [98, 168, 56],
    [108, 179, 63],
    [89, 156, 49],
    [116, 188, 70],
    [94, 162, 52],
    [124, 196, 77]
  ];
  const DIRT_BASE: RGB[] = [
    [134, 96, 67],
    [121, 85, 58],
    [146, 106, 75],
    [112, 78, 53],
    [139, 100, 70]
  ];
  {
    const rng = new Rng(101);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        // JAPPA grass_block_top: subtle 2px vertical blade tufts & rich organic tonal variation
        const bladeHi = ((x * 7 + y * 3) % 13 === 0) || ((x * 3 + y * 11) % 17 === 0 && y > 0);
        const bladeLo = ((x * 5 + y * 9) % 15 === 0);
        const tuft: RGB = bladeHi
          ? [130, 202, 82]
          : bladeLo
            ? [82, 146, 45]
            : rng.pick(GRASS_BASE);
        setPx(TILE.GRASS_TOP, x, y, tuft);
        const isRoot = rng.next() < 0.05;
        const isPebble = !isRoot && rng.next() < 0.06;
        const soilPx: RGB = isPebble
          ? [154, 144, 134]
          : isRoot
            ? [98, 68, 45]
            : rng.pick(DIRT_BASE);
        setPx(TILE.DIRT, x, y, soilPx);
        setPx(TILE.GRASS_SIDE, x, y, soilPx);
      }
    }
    // Authentic JAPPA grass_block_side overhang + cast shadow pixel on dirt right underneath!
    const fringeDrops = [3, 4, 2, 3, 5, 3, 2, 4, 3, 2, 4, 5, 3, 2, 4, 3];
    for (let x = 0; x < 16; x++) {
      const drop = fringeDrops[x];
      for (let y = 0; y < drop; y++) {
        const c: RGB =
          y === 0
            ? [118, 190, 72]
            : y === drop - 1
              ? [78, 140, 43]
              : rng.pick(GRASS_BASE);
        setPx(TILE.GRASS_SIDE, x, y, c);
      }
      if (drop < 16) {
        const under = getPx(TILE.DIRT, x, drop);
        setPx(TILE.GRASS_SIDE, x, drop, shadeRgb([under[0], under[1], under[2]], 0.72));
      }
    }
    // Dirt Path (golden trampled village road)
    const PATH_PAL: RGB[] = [[166, 132, 74], [154, 120, 66], [178, 144, 84], [142, 110, 58]];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        setPx(TILE.DIRT_PATH_TOP, x, y, rng.pick(PATH_PAL));
        setPx(TILE.DIRT_PATH_SIDE, x, y, y < 2 ? rng.pick(PATH_PAL) : getPx(TILE.DIRT, x, y));
      }
    }
    // Hydrated Farmland furrows
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const furrow = x % 4 === 1 || x % 4 === 2;
        setPx(TILE.FARMLAND_TOP, x, y, furrow ? [68, 42, 24] : [94, 61, 37]);
      }
    }
  }

  // --- 2. Sedimentary Stone, Cellular Cobblestone, Mossy & Stone Bricks ---
  {
    const rng = new Rng(202);
    for (let y = 0; y < 16; y++) {
      const band = y % 4 === 0 ? -6 : y % 4 === 2 ? 5 : 0;
      for (let x = 0; x < 16; x++) {
        const streak = ((x + y * 3) % 7 === 0) ? -8 : ((x * 2 + y) % 9 === 0) ? 7 : 0;
        const v = clampByte(126 + band + streak + (rng.next() - 0.5) * 8);
        setPx(TILE.STONE, x, y, [v, v, clampByte(v + 2)]);
      }
    }

    // Tileable Voronoi Cobblestone (looks like real rounded stones with mortar & top highlights!)
    const pts: Array<[number, number, number]> = [
      [3, 3, 1.0], [10, 2, 0.94], [14, 6, 1.04],
      [2, 9, 0.92], [8, 8, 1.05], [13, 12, 0.96],
      [4, 14, 1.02], [9, 14, 0.90]
    ];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        let d1 = 999, d2 = 999, tone = 1.0, cy = 0;
        for (const [px, py, ptTone] of pts) {
          for (let oy = -16; oy <= 16; oy += 16) {
            for (let ox = -16; ox <= 16; ox += 16) {
              const dx = x - (px + ox);
              const dy = y - (py + oy);
              const d = Math.hypot(dx, dy);
              if (d < d1) { d2 = d1; d1 = d; tone = ptTone; cy = dy; }
              else if (d < d2) { d2 = d; }
            }
          }
        }
        const edge = d2 - d1;
        let base = edge < 0.85 ? 74 : cy < -0.5 ? 148 : cy > 1.0 ? 106 : 126;
        base = clampByte(base * tone);
        setPx(TILE.COBBLESTONE, x, y, [base, base, clampByte(base + 3)]);
        // Mossy variant
        const moss = edge < 1.1 && ((x * 3 + y * 5) % 4 !== 0);
        setPx(TILE.MOSSY_COBBLESTONE, x, y, moss ? [86, 134, 58] : [base, base, clampByte(base + 3)]);
      }
    }

    // Stone Bricks & Mossy Stone Bricks
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const row = Math.floor(y / 8);
        const seamH = y === 7 || y === 15;
        const seamV = row === 0 ? x === 7 : x === 15;
        const hi = (y === 0 || y === 8) || (row === 0 ? x === 8 : x === 0);
        const v = seamH || seamV ? 76 : hi ? 152 : 126 + Math.round((rng.next() - 0.5) * 10);
        setPx(TILE.STONE_BRICKS, x, y, [v, v, clampByte(v + 3)]);
        const isMoss = (seamH || seamV) && rng.next() > 0.35 || rng.next() < 0.14;
        setPx(TILE.MOSSY_STONE_BRICKS, x, y, isMoss ? [88, 138, 60] : [v, v, clampByte(v + 3)]);
      }
    }

    // Bedrock & Gravel
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const bv = [30, 52, 74, 40][(x * 3 + y * 7 + Math.floor(rng.next() * 3)) % 4];
        setPx(TILE.BEDROCK, x, y, [bv, bv, bv + 3]);
        const gv = 114 + Math.round((rng.next() - 0.5) * 34);
        setPx(TILE.GRAVEL, x, y, [gv + 4, gv, gv - 2]);
      }
    }
  }

  // --- 3. Seamless Horizontal Wooden Planks, Logs & Leaves (NO Crate Borders!) ---
  const paintPlanks = (tile: number, base: RGB, seed: number) => {
    const rng = new Rng(seed);
    const joints = [7, 14, 3, 11]; // One subtle staggered vertical joint per plank!
    for (let y = 0; y < 16; y++) {
      const plankIdx = Math.floor(y / 4);
      const localY = y % 4;
      const plankVariation = [1.0, 0.95, 1.03, 0.97][plankIdx];
      for (let x = 0; x < 16; x++) {
        let k = plankVariation + (rng.next() - 0.5) * 0.05;
        if (localY === 0) k += 0.06;        // Top highlight bevel
        else if (localY === 3) k -= 0.14;   // Bottom plank groove
        if (x === joints[plankIdx] && localY !== 3) k -= 0.12; // Staggered vertical joint
        // Subtle horizontal wood grain
        if ((x + plankIdx * 5) % 6 === 0 && localY === 1) k -= 0.04;
        setPx(tile, x, y, shadeRgb(base, k));
      }
    }
  };

  paintPlanks(TILE.OAK_PLANKS, [172, 138, 84], 301);
  paintPlanks(TILE.BIRCH_PLANKS, [208, 192, 136], 302);
  paintPlanks(TILE.SPRUCE_PLANKS, [118, 86, 50], 303);
  paintPlanks(TILE.CHERRY_PLANKS, [226, 172, 180], 304);
  paintPlanks(TILE.ACACIA_PLANKS, [178, 98, 54], 305);

  const paintLog = (sideTile: number, topTile: number, bark: RGB, heart: RGB, seed: number) => {
    const rng = new Rng(seed);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const ridge = Math.sin(x * 1.4) * 0.1 + (rng.next() - 0.5) * 0.08;
        setPx(sideTile, x, y, shadeRgb(bark, 1.0 + ridge));
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        if (d > 6) setPx(topTile, x, y, bark);
        else setPx(topTile, x, y, shadeRgb(heart, Math.round(d) % 2 === 0 ? 0.9 : 1.04));
      }
    }
  };

  paintLog(TILE.OAK_LOG_SIDE, TILE.OAK_LOG_TOP, [102, 80, 46], [176, 142, 88], 310);
  paintLog(TILE.CHERRY_LOG_SIDE, TILE.CHERRY_LOG_TOP, [56, 31, 42], [228, 178, 188], 311);
  paintLog(TILE.SPRUCE_LOG_SIDE, TILE.OAK_LOG_TOP, [58, 38, 22], [156, 122, 74], 312);
  paintLog(TILE.ACACIA_LOG_SIDE, TILE.OAK_LOG_TOP, [104, 98, 90], [176, 96, 52], 313);
  // Birch speckled white bark
  {
    const rng = new Rng(314);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const darkPatch = (y % 5 === 2 && (x === 3 || x === 4 || x === 11)) || (y === 9 && x === 8);
        setPx(TILE.BIRCH_LOG_SIDE, x, y, darkPatch ? [58, 56, 52] : shadeRgb([228, 225, 216], 0.96 + rng.next() * 0.07));
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        setPx(TILE.BIRCH_LOG_TOP, x, y, d > 6 ? [220, 216, 208] : shadeRgb([206, 190, 140], Math.round(d) % 2 === 0 ? 0.92 : 1.03));
      }
    }
  }

  const paintLeaves = (tile: number, base: RGB, hi: RGB, lo: RGB, seed: number) => {
    const rng = new Rng(seed);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const r = rng.next();
        if (r < 0.12 && x > 0 && x < 15 && y > 0 && y < 15) setPx(tile, x, y, [0, 0, 0, 0]);
        else if (r < 0.38) setPx(tile, x, y, hi);
        else if (r < 0.75) setPx(tile, x, y, base);
        else setPx(tile, x, y, lo);
      }
    }
  };

  paintLeaves(TILE.OAK_LEAVES, [64, 140, 44], [84, 166, 58], [44, 108, 30], 320);
  paintLeaves(TILE.CHERRY_LEAVES, [244, 166, 196], [255, 206, 224], [218, 126, 162], 321);
  paintLeaves(TILE.BIRCH_LEAVES, [104, 156, 68], [124, 178, 84], [80, 128, 50], 322);
  paintLeaves(TILE.SPRUCE_LEAVES, [48, 94, 58], [64, 114, 72], [34, 72, 44], 323);
  paintLeaves(TILE.ACACIA_LEAVES, [118, 152, 46], [140, 174, 58], [92, 124, 34], 324);

  // --- 4. Sand, Red Sand, Sandstone, Terracotta, Snow, Ice, Water, Lava, Glass ---
  {
    const rng = new Rng(401);
    for (let y = 0; y < 16; y++) {
      const wave = Math.sin((y + (y % 2)) * 0.8) * 0.04;
      for (let x = 0; x < 16; x++) {
        const k = 1 + wave + (rng.next() - 0.5) * 0.05;
        setPx(TILE.SAND, x, y, shadeRgb([222, 210, 162], k));
        setPx(TILE.RED_SAND, x, y, shadeRgb([192, 104, 42], k));
        setPx(TILE.TERRACOTTA, x, y, shadeRgb([154, 94, 68], k));
        setPx(TILE.SNOW, x, y, shadeRgb([244, 250, 255], 0.98 + rng.next() * 0.03));
        setPx(TILE.SANDSTONE_TOP, x, y, shadeRgb([224, 212, 164], 0.97 + rng.next() * 0.05));
        setPx(TILE.SANDSTONE_SIDE, x, y, y < 3 ? [232, 222, 178] : y === 3 || y === 11 ? [190, 174, 124] : shadeRgb([216, 202, 152], k));
        setPx(TILE.SNOW_SIDE, x, y, y < 4 + (x % 2) ? [244, 250, 255] : getPx(TILE.DIRT, x, y));

        // Crisp translucent Water
        const wcrest = ((x + y * 2) % 7 === 0) ? 24 : 0;
        setPx(TILE.WATER, x, y, [38 + wcrest, 118 + wcrest, 228 + Math.min(26, wcrest), 196]);

        // Glowing Magma Lava
        const lheat = Math.sin(x * 0.6 + y * 0.5) * 0.5 + 0.5;
        setPx(TILE.LAVA, x, y, lheat > 0.65 ? [255, 218, 68, 250] : lheat > 0.3 ? [246, 118, 24, 250] : [204, 58, 12, 250]);

        // Framed Glass & Ice
        const border = x === 0 || x === 15 || y === 0 || y === 15;
        const glint = (x + y === 5 && x > 1) || (x + y === 23 && x < 14);
        setPx(TILE.GLASS, x, y, border ? [210, 238, 248, 245] : glint ? [240, 252, 255, 210] : [180, 225, 245, 22]);
        setPx(TILE.ICE, x, y, (x - y === 3 || x + y === 14) ? [196, 230, 255, 218] : [142, 192, 248, 205]);
      }
    }
  }

  // --- 5. Ores & Mineral Blocks ---
  const paintOre = (tile: number, hi: RGB, mid: RGB, dark: RGB) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) setPx(tile, x, y, getPx(TILE.STONE, x, y));
    const veins: Array<[number, number, number]> = [
      [3, 3, 0], [4, 3, 1], [3, 4, 2], [10, 3, 0], [11, 4, 1], [10, 4, 2],
      [5, 8, 0], [6, 8, 1], [5, 9, 1], [6, 9, 2], [11, 11, 0], [12, 11, 1], [11, 12, 2]
    ];
    for (const [vx, vy, kind] of veins) {
      setPx(tile, vx, vy, kind === 0 ? hi : kind === 1 ? mid : dark);
    }
  };
  paintOre(TILE.COAL_ORE, [58, 58, 64], [32, 32, 36], [16, 16, 20]);
  paintOre(TILE.IRON_ORE, [238, 204, 178], [210, 168, 138], [166, 124, 96]);
  paintOre(TILE.GOLD_ORE, [255, 246, 132], [244, 198, 44], [192, 138, 18]);
  paintOre(TILE.DIAMOND_ORE, [172, 255, 250], [58, 224, 214], [24, 158, 162]);
  paintOre(TILE.EMERALD_ORE, [152, 255, 176], [36, 208, 92], [16, 138, 52]);
  paintOre(TILE.REDSTONE_ORE, [255, 118, 118], [218, 32, 32], [142, 14, 14]);

  const paintMineralBlock = (tile: number, base: RGB) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const bevel = (x === 0 || y === 0) ? 1.16 : (x === 15 || y === 15) ? 0.82 : 1.0 + ((x + y) % 5 === 0 ? 0.06 : 0);
        setPx(tile, x, y, shadeRgb(base, bevel));
      }
    }
  };
  paintMineralBlock(TILE.IRON_BLOCK, [220, 225, 232]);
  paintMineralBlock(TILE.GOLD_BLOCK, [246, 204, 52]);
  paintMineralBlock(TILE.DIAMOND_BLOCK, [76, 234, 224]);
  paintMineralBlock(TILE.COPPER_BLOCK, [198, 108, 72]);

  // --- 6. Bricks, Wool, Hay, Slime, Interactive Workstations ---
  for (let y = 0; y < 16; y++) {
    const mortarH = y % 4 === 3;
    const shift = Math.floor(y / 4) % 2 === 0 ? 7 : 15;
    for (let x = 0; x < 16; x++) {
      setPx(TILE.BRICKS, x, y, (mortarH || x === shift) ? [196, 188, 178] : ((x + y) % 3 === 0 ? [168, 82, 66] : [152, 70, 56]));
      setPx(TILE.WOOL_WHITE, x, y, shadeRgb([242, 244, 248], 0.96 + ((x * 3 + y * 5) % 4) * 0.02));
      setPx(TILE.WOOL_RED, x, y, shadeRgb([186, 42, 38], 0.95 + ((x * 3 + y * 5) % 4) * 0.025));
      // Hay Bale
      const band = y === 4 || y === 11;
      setPx(TILE.HAY_SIDE, x, y, band ? [184, 52, 42] : (x % 2 === 0 ? [216, 184, 62] : [196, 164, 48]));
      setPx(TILE.HAY_TOP, x, y, (x + y) % 2 === 0 ? [214, 182, 60] : [194, 162, 46]);
      // Slime Block (translucent inner core + outer gel)
      const inner = x >= 3 && x <= 12 && y >= 3 && y <= 12;
      setPx(TILE.SLIME, x, y, inner ? [112, 206, 78, 235] : [138, 232, 98, 175]);
    }
  }

  // Crafting Table, Bookshelf, Chest, Furnace, TNT, Lamps, Door, Bed, Bell
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      // Crafting Table
      const border = x < 2 || x > 13 || y < 2 || y > 13;
      const grid = x === 5 || x === 10 || y === 5 || y === 10;
      setPx(TILE.CRAFT_TOP, x, y, border ? [116, 84, 46] : grid ? [88, 60, 32] : [172, 130, 78]);
      setPx(TILE.CRAFT_SIDE, x, y, y < 3 ? [112, 78, 42] : (x >= 4 && x <= 6 && y >= 5 && y <= 11) ? [156, 162, 172] : getPx(TILE.OAK_PLANKS, x, y));

      // Chest
      const cRim = x === 0 || x === 15 || y === 0 || y === 15;
      const cSeam = y === 5;
      const cLatch = x >= 7 && x <= 8 && y >= 4 && y <= 7;
      setPx(TILE.CHEST_TOP, x, y, cRim ? [66, 44, 22] : [168, 120, 56]);
      setPx(TILE.CHEST_SIDE, x, y, cRim || cSeam ? [58, 38, 18] : [164, 116, 52]);
      setPx(TILE.CHEST_FRONT, x, y, cLatch ? [238, 206, 74] : cRim || cSeam ? [58, 38, 18] : [164, 116, 52]);

      // Furnace
      const fBase = getPx(TILE.COBBLESTONE, x, y);
      setPx(TILE.FURNACE_TOP, x, y, (x === 0 || x === 15 || y === 0 || y === 15) ? [82, 82, 86] : [126, 126, 130]);
      setPx(TILE.FURNACE_SIDE, x, y, fBase);
      const holeTop = x >= 4 && x <= 11 && y >= 3 && y <= 6;
      const holeBot = x >= 4 && x <= 11 && y >= 9 && y <= 13;
      setPx(TILE.FURNACE_FRONT_OFF, x, y, (holeTop || holeBot) ? [34, 34, 38] : fBase);
      setPx(TILE.FURNACE_FRONT_ON, x, y, holeBot ? (y > 10 ? [255, 214, 68] : [248, 112, 24]) : holeTop ? [44, 38, 38] : fBase);

      // TNT
      const band = y >= 5 && y <= 10;
      const txt = band && y >= 6 && y <= 9 && (x % 4 === 1 || (y === 6 && x % 4 !== 3));
      setPx(TILE.TNT_SIDE, x, y, txt ? [28, 28, 28] : band ? [242, 242, 242] : (x % 2 === 0 ? [212, 48, 38] : [188, 38, 30]));
      setPx(TILE.TNT_TOP, x, y, (x >= 6 && x <= 9 && y >= 6 && y <= 9) ? [42, 42, 42] : [204, 46, 38]);
      setPx(TILE.TNT_BOTTOM, x, y, [176, 42, 34]);

      // Glowstone, Sea Lantern, Redstone Lamps, Purpur
      setPx(TILE.GLOWSTONE, x, y, ((x * 3 + y * 5) % 4 === 0) ? [255, 246, 178] : [224, 172, 72]);
      setPx(TILE.SEA_LANTERN, x, y, border ? [112, 168, 164] : (x > 4 && x < 11 && y > 4 && y < 11) ? [236, 255, 252] : [182, 236, 230]);
      setPx(TILE.LAMP_OFF, x, y, border ? [62, 40, 26] : [116, 78, 48]);
      setPx(TILE.LAMP_ON, x, y, border ? [96, 62, 36] : [255, 232, 148]);
      setPx(TILE.HORIZON_PURPUR, x, y, (x % 8 === 0 || y % 8 === 0) ? [126, 92, 148] : [168, 126, 186]);

      // Oak Door (upper window panes + lower wood panels)
      const doorFrame = x < 2 || x > 13 || y < 2 || y > 13 || y === 7 || y === 8;
      const doorWin = y >= 2 && y <= 6 && (x === 5 || x === 6 || x === 9 || x === 10);
      setPx(TILE.OAK_DOOR, x, y, doorWin ? [0, 0, 0, 0] : doorFrame ? [138, 104, 58] : [172, 136, 82]);

      // Bed & Bell & Cactus
      setPx(TILE.BED_TOP, x, y, x < 5 ? [244, 244, 248] : [196, 44, 38]);
      const bedLeg = y >= 12 && (x <= 2 || x >= 13);
      const bedWood = y >= 9 && y <= 11;
      setPx(
        TILE.BED_SIDE,
        x,
        y,
        y >= 12 ? (bedLeg ? [138, 102, 56] : [0, 0, 0, 0]) : bedWood ? [168, 132, 78] : x < 5 ? [240, 240, 245] : [196, 44, 38]
      );
      setPx(TILE.BELL, x, y, (x >= 3 && x <= 12 && y >= 2 && y <= 13) ? [246, 206, 62] : [0, 0, 0, 0]);
      setPx(TILE.CACTUS_SIDE, x, y, (x % 4 === 0 && y % 5 === 2) ? [232, 228, 190] : x % 4 === 0 ? [46, 116, 44] : [64, 144, 58]);
      setPx(TILE.CACTUS_TOP, x, y, border ? [46, 116, 44] : [78, 160, 68]);
    }
  }

  // Bookshelf books
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) setPx(TILE.BOOKSHELF_SIDE, x, y, getPx(TILE.OAK_PLANKS, x, y));
  const bookCols: RGB[] = [[186, 52, 52], [54, 112, 186], [58, 152, 76], [198, 158, 52], [134, 72, 178]];
  for (const ry of [3, 10]) {
    for (let x = 1; x < 15; x++) {
      const bc = bookCols[Math.floor(x / 3) % bookCols.length];
      for (let dy = 0; dy < 4; dy++) setPx(TILE.BOOKSHELF_SIDE, x, ry + dy, x % 3 === 0 ? [48, 36, 26] : bc);
    }
  }

  // --- 7. Nether & The End Blocks ---
  {
    const rng = new Rng(707);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const k = 0.9 + rng.next() * 0.2;
        setPx(TILE.OBSIDIAN, x, y, rng.next() < 0.12 ? [58, 36, 92] : shadeRgb([22, 16, 34], k));
        setPx(TILE.NETHER_PORTAL, x, y, [156 + Math.round(Math.sin(x + y) * 35), 48, 248, 205]);
        setPx(TILE.NETHERRACK, x, y, shadeRgb([112, 44, 44], k));
        setPx(TILE.SOUL_SAND, x, y, shadeRgb([84, 64, 52], k));
        setPx(TILE.CRIMSON_NYLIUM_TOP, x, y, shadeRgb([148, 32, 48], k));
        setPx(TILE.CRIMSON_NYLIUM_SIDE, x, y, y < 3 ? [148, 32, 48] : shadeRgb([112, 44, 44], k));
        setPx(TILE.CRIMSON_STEM, x, y, (y + x) % 5 === 0 ? [186, 52, 86] : [96, 28, 52]);
        setPx(TILE.NETHER_WART, x, y, shadeRgb([124, 22, 26], k));
        setPx(TILE.WARPED_NYLIUM_TOP, x, y, shadeRgb([26, 138, 128], k));
        setPx(TILE.WARPED_NYLIUM_SIDE, x, y, y < 3 ? [26, 138, 128] : shadeRgb([112, 44, 44], k));
        setPx(TILE.WARPED_STEM, x, y, (y + x) % 5 === 0 ? [42, 186, 168] : [48, 34, 68]);
        setPx(TILE.WARPED_WART, x, y, shadeRgb([22, 126, 122], k));
        setPx(TILE.NETHER_BRICKS, x, y, (y % 4 === 3 || x === (Math.floor(y / 4) % 2 === 0 ? 7 : 15)) ? [34, 18, 22] : [56, 28, 34]);
        setPx(TILE.QUARTZ_ORE, x, y, ((x * 3 + y * 5) % 11 < 2) ? [242, 236, 228] : shadeRgb([112, 44, 44], k));
        setPx(TILE.END_STONE, x, y, shadeRgb([222, 226, 168], k));
        setPx(TILE.END_PORTAL, x, y, rng.next() < 0.14 ? [118, 242, 218] : [10, 14, 24]);
        setPx(TILE.END_CRYSTAL, x, y, (x > 3 && x < 12 && y > 3 && y < 12) ? [248, 118, 242, 235] : [186, 228, 255, 140]);
        setPx(TILE.DRAGON_EGG, x, y, rng.next() < 0.12 ? [168, 72, 238] : [20, 16, 28]);
      }
    }
  }

  // --- 8. Flora, Crops, Torch, Ladder, Lever ---
  for (const t of [TILE.TALL_GRASS, TILE.POPPY, TILE.DANDELION, TILE.CHERRY_PETALS, TILE.WHEAT_CROP, TILE.CORNFLOWER, TILE.OXEYE_DAISY, TILE.TORCH, TILE.LADDER, TILE.LEVER_OFF, TILE.LEVER_ON]) {
    clearTile(t);
  }
  {
    const rng = new Rng(808);
    // Authentic Multi-Tone JAPPA Short/Tall Grass (shaded dark roots -> lush mid -> sunlit tips!)
    const grassCols = [1, 2, 4, 5, 7, 8, 10, 11, 13, 14];
    for (const bx of grassCols) {
      const h = 7 + ((bx * 5 + 3) % 7);
      const topY = 16 - h;
      for (let y = 15; y >= topY; y--) {
        const lean = y < topY + 2 ? (bx % 2 === 0 ? 1 : -1) : 0;
        const px = Math.max(0, Math.min(15, bx + lean));
        const rel = (15 - y) / Math.max(1, h - 1);
        const col: RGB =
          rel < 0.22
            ? [62, 118, 38]
            : rel > 0.78
              ? [132, 204, 82]
              : rng.pick(GRASS_BASE);
        setPx(TILE.TALL_GRASS, px, y, col);
      }
    }
    // Wheat Golden Crop (multi-stage golden ears + shaded stalks)
    for (const bx of [1, 3, 6, 8, 10, 12, 14]) {
      const topY = 3 + (bx % 2);
      for (let y = 15; y >= topY; y--) {
        const ear: RGB =
          y <= topY + 1
            ? [250, 224, 102]
            : y < 9
              ? [226, 184, 54]
              : y < 13
                ? [178, 152, 46]
                : [128, 118, 42];
        setPx(TILE.WHEAT_CROP, bx, y, ear);
      }
    }

    // Authentic JAPPA Botanical Flowers (shaded 2-tone stem + basal leaves + multi-tone sculpted petals!)
    const paintStemAndLeaves = (tile: number) => {
      for (let y = 9; y < 16; y++) {
        const sx = y >= 13 ? 8 : 7;
        setPx(tile, sx, y, y >= 14 ? [46, 106, 32] : [64, 142, 44]);
        if (y === 11 || y === 12) setPx(tile, sx + 1, y, [84, 166, 58]);
      }
      // Basal leaves left & right
      setPx(tile, 6, 13, [76, 158, 52]);
      setPx(tile, 5, 12, [96, 178, 64]);
      setPx(tile, 9, 14, [58, 132, 40]);
      setPx(tile, 10, 13, [82, 164, 56]);
      // Calyx sepal cup under blossom
      setPx(tile, 6, 9, [54, 124, 38]);
      setPx(tile, 7, 9, [68, 148, 48]);
      setPx(tile, 8, 9, [54, 124, 38]);
    };

    const stampSprite16 = (tile: number, startY: number, startX: number, rows: string[], pal: Record<string, RGB>) => {
      for (let ry = 0; ry < rows.length; ry++) {
        const row = rows[ry];
        for (let rx = 0; rx < row.length; rx++) {
          const ch = row[rx];
          if (ch !== '.' && pal[ch]) setPx(tile, startX + rx, startY + ry, pal[ch]);
        }
      }
    };

    // 1. Dandelion (lush JAPPA golden-yellow layered puff blossom)
    paintStemAndLeaves(TILE.DANDELION);
    stampSprite16(
      TILE.DANDELION,
      3,
      4,
      [
        '..LHL..',
        '.LHcHL.',
        'LHcccHL',
        'LMcccML',
        '.DMMMD.',
        '..DDD..'
      ],
      { L: [255, 242, 96], H: [252, 218, 44], c: [242, 178, 20], M: [232, 186, 28], D: [196, 142, 18] }
    );

    // 2. Poppy (cupped crimson petals + dark velvety stamen heart)
    paintStemAndLeaves(TILE.POPPY);
    stampSprite16(
      TILE.POPPY,
      3,
      4,
      [
        '.LL.LL.',
        'LHMHMHL',
        'LMcKcML',
        'DMKKKMD',
        '.DMMMD.',
        '..DDD..'
      ],
      { L: [252, 84, 72], H: [238, 48, 40], M: [206, 28, 26], D: [148, 16, 18], K: [36, 22, 24], c: [76, 148, 52] }
    );

    // 3. Cornflower (5-petal royal-blue star blossom)
    paintStemAndLeaves(TILE.CORNFLOWER);
    stampSprite16(
      TILE.CORNFLOWER,
      3,
      4,
      [
        '.L...L.',
        'LHM.MHL',
        '.MKcKM.',
        'LHMkMHL',
        '.D.M.D.',
        '..DDD..'
      ],
      { L: [132, 174, 255], H: [82, 126, 246], M: [52, 92, 218], D: [34, 62, 168], K: [24, 38, 116], k: [38, 66, 176], c: [224, 238, 255] }
    );

    // 4. Oxeye Daisy (crisp white radiating petals + raised golden button center)
    paintStemAndLeaves(TILE.OXEYE_DAISY);
    stampSprite16(
      TILE.OXEYE_DAISY,
      3,
      4,
      [
        '..WLW..',
        '.WWWWW.',
        'WWGGGWW',
        'WSGcGSW',
        '.SWWWS.',
        '..SSS..'
      ],
      { L: [255, 255, 255], W: [244, 247, 252], S: [204, 214, 228], G: [250, 210, 52], c: [218, 158, 22] }
    );

    // 5. Cherry Petals / Blossom
    paintStemAndLeaves(TILE.CHERRY_PETALS);
    stampSprite16(
      TILE.CHERRY_PETALS,
      3,
      4,
      [
        '.LL.LL.',
        'LHHMHHl',
        'LHcccHL',
        '.HMMMH.',
        '..DDD..'
      ],
      { L: [255, 220, 236], l: [255, 210, 230], H: [252, 174, 206], M: [236, 132, 174], D: [198, 92, 136], c: [216, 76, 124] }
    );

    // Torch (3-tone oak stick + glowing ember collar + layered flame core)
    for (let y = 6; y < 16; y++) {
      setPx(TILE.TORCH, 7, y, y % 3 === 0 ? [152, 114, 64] : [138, 100, 54]);
      setPx(TILE.TORCH, 8, y, y % 3 === 1 ? [98, 68, 34] : [112, 80, 42]);
    }
    setPx(TILE.TORCH, 7, 6, [68, 48, 34]); setPx(TILE.TORCH, 8, 6, [52, 36, 26]);
    setPx(TILE.TORCH, 7, 5, [255, 152, 28]); setPx(TILE.TORCH, 8, 5, [242, 124, 20]);
    setPx(TILE.TORCH, 7, 4, [255, 236, 112]); setPx(TILE.TORCH, 8, 4, [255, 208, 68]);
    setPx(TILE.TORCH, 7, 3, [255, 254, 224]); setPx(TILE.TORCH, 8, 3, [255, 242, 168]);

    // Ladder
    for (let y = 0; y < 16; y++) {
      setPx(TILE.LADDER, 2, y, [158, 122, 68]); setPx(TILE.LADDER, 3, y, [132, 98, 52]);
      setPx(TILE.LADDER, 12, y, [158, 122, 68]); setPx(TILE.LADDER, 13, y, [132, 98, 52]);
      if (y % 4 === 2) {
        for (let x = 2; x <= 13; x++) setPx(TILE.LADDER, x, y, [172, 136, 78]);
      }
    }

    // Lever
    for (let y = 11; y < 16; y++) for (let x = 5; x <= 10; x++) setPx(TILE.LEVER_OFF, x, y, [112, 112, 118]);
    for (let y = 11; y < 16; y++) for (let x = 5; x <= 10; x++) setPx(TILE.LEVER_ON, x, y, [112, 112, 118]);
    for (let i = 0; i < 6; i++) {
      setPx(TILE.LEVER_OFF, 7 - Math.floor(i / 2), 11 - i, [142, 104, 58]);
      setPx(TILE.LEVER_ON, 8 + Math.floor(i / 2), 11 - i, [238, 64, 54]);
    }

    // Redstone Dust Wire (Off & Glowing On)
    clearTile(TILE.REDSTONE_DUST_OFF);
    clearTile(TILE.REDSTONE_DUST_ON);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const cross = (x >= 6 && x <= 9) || (y >= 6 && y <= 9);
        const core = x >= 5 && x <= 10 && y >= 5 && y <= 10;
        if (cross || core) {
          setPx(TILE.REDSTONE_DUST_OFF, x, y, core ? [145, 18, 18] : [108, 12, 12]);
          setPx(TILE.REDSTONE_DUST_ON, x, y, core ? [255, 86, 48] : [235, 30, 24]);
        }
      }
    }

    // Piston Top & Side
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const border = x === 0 || x === 15 || y === 0 || y === 15;
        const rivet = (x === 2 || x === 13) && (y === 2 || y === 13);
        setPx(TILE.PISTON_TOP, x, y, rivet ? [188, 194, 204] : border ? [124, 92, 54] : getPx(TILE.OAK_PLANKS, x, y));
        if (y < 4) {
          setPx(TILE.PISTON_SIDE, x, y, y === 3 ? [108, 78, 44] : getPx(TILE.OAK_PLANKS, x, y));
        } else {
          const rod = x >= 6 && x <= 9 && y < 10;
          setPx(TILE.PISTON_SIDE, x, y, rod ? [184, 190, 200] : getPx(TILE.COBBLESTONE, x, y));
        }
      }
    }

    // Wave 4 Tiles: Copper Oxidation Stages (#15835), Lantern, Magma, Composter (#15843) & Deepslate
    const rngW4 = new Rng(26034);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const border = x === 0 || x === 15 || y === 0 || y === 15;
        const seam = x === 8 || y === 8;
        const n = (rngW4.next() - 0.5) * 18;

        // Exposed Copper (warm copper + early green patina flecks)
        const pat1 = rngW4.next() < 0.24;
        setPx(
          TILE.EXPOSED_COPPER,
          x,
          y,
          pat1
            ? [clampByte(106 + n), clampByte(150 + n), clampByte(122 + n)]
            : border || seam
              ? [clampByte(142 + n), clampByte(92 + n), clampByte(72 + n)]
              : [clampByte(168 + n), clampByte(116 + n), clampByte(92 + n)]
        );

        // Weathered Copper (teal-green dominant with warm bronze patches)
        const pat2 = rngW4.next() < 0.65;
        setPx(
          TILE.WEATHERED_COPPER,
          x,
          y,
          pat2
            ? [clampByte(96 + n), clampByte(158 + n), clampByte(128 + n)]
            : [clampByte(142 + n), clampByte(106 + n), clampByte(84 + n)]
        );

        // Oxidized Copper (iconic verdigris turquoise Jappa copper)
        setPx(
          TILE.OXIDIZED_COPPER,
          x,
          y,
          border || seam
            ? [clampByte(64 + n), clampByte(132 + n), clampByte(112 + n)]
            : [clampByte(82 + n), clampByte(164 + n), clampByte(138 + n)]
        );

        // Lantern (iron frame + warm glowing flame glass)
        const ironFrame = x <= 2 || x >= 13 || y <= 2 || y >= 13 || x === 7 || x === 8;
        setPx(
          TILE.LANTERN,
          x,
          y,
          ironFrame
            ? [clampByte(56 + n * 0.5), clampByte(60 + n * 0.5), clampByte(68 + n * 0.5)]
            : [clampByte(255), clampByte(218 + n), clampByte(112 + n)]
        );

        // Magma Block (dark basalt crust + glowing molten orange cracks)
        const crack = Math.sin(x * 0.85 + y * 0.55) + Math.cos(x * 0.45 - y * 0.9) > 0.72;
        setPx(
          TILE.MAGMA,
          x,
          y,
          crack
            ? [clampByte(248), clampByte(132 + n), clampByte(28)]
            : [clampByte(56 + n * 0.6), clampByte(32 + n * 0.4), clampByte(34 + n * 0.4)]
        );

        // Composter Side & Top (spruce slats + rich compost humus)
        const slatGap = y % 4 === 0 && x >= 2 && x <= 13;
        setPx(
          TILE.COMPOSTER_SIDE,
          x,
          y,
          slatGap ? [54, 36, 20] : [clampByte(122 + n), clampByte(84 + n), clampByte(46 + n)]
        );
        const rim = x <= 1 || x >= 14 || y <= 1 || y >= 14;
        setPx(
          TILE.COMPOSTER_TOP,
          x,
          y,
          rim
            ? [clampByte(126 + n), clampByte(88 + n), clampByte(48 + n)]
            : [clampByte(68 + n * 0.5), clampByte(92 + n * 0.5), clampByte(38 + n * 0.5)]
        );

        // Deepslate & Deepslate Diamond Ore
        const slate = 52 + ((x * 3 + y * 5) % 9) + n * 0.7;
        const dsCol: [number, number, number] = [clampByte(slate), clampByte(slate + 2), clampByte(slate + 8)];
        setPx(TILE.DEEPSLATE, x, y, dsCol);
        const diamondSpeck =
          ((x >= 3 && x <= 5 && y >= 4 && y <= 6) ||
            (x >= 10 && x <= 12 && y >= 9 && y <= 11) ||
            (x >= 5 && x <= 7 && y >= 11 && y <= 12)) &&
          (x + y) % 2 === 0;
        setPx(TILE.DEEPSLATE_DIAMOND, x, y, diamondSpeck ? [92, 238, 245] : dsCol);

        // Wave 5 Tiles: Oak Door Lower Half, Ancient Debris & Netherite Block
        const lowDoorFrame = x < 2 || x > 13 || y > 13 || y === 0 || x === 7 || x === 8;
        const doorKnob = (x === 12 || x === 13) && (y === 1 || y === 2);
        setPx(
          TILE.OAK_DOOR_LOWER,
          x,
          y,
          doorKnob
            ? [218, 184, 72]
            : lowDoorFrame
              ? [138, 104, 58]
              : [clampByte(168 + n * 0.4), clampByte(132 + n * 0.4), clampByte(78 + n * 0.4)]
        );

        // Ancient Debris Top (spiral cinnamon-bronze rings) & Side (layered armor plates)
        const spiral = Math.round(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5))) % 2 === 0;
        setPx(
          TILE.ANCIENT_DEBRIS_TOP,
          x,
          y,
          spiral
            ? [clampByte(126 + n * 0.6), clampByte(88 + n * 0.5), clampByte(74 + n * 0.5)]
            : [clampByte(76 + n * 0.5), clampByte(52 + n * 0.4), clampByte(46 + n * 0.4)]
        );
        const plateBand = y % 4 === 0 || ((x + Math.floor(y / 4) * 3) % 7 === 0);
        setPx(
          TILE.ANCIENT_DEBRIS_SIDE,
          x,
          y,
          plateBand
            ? [clampByte(64 + n * 0.5), clampByte(44 + n * 0.4), clampByte(39 + n * 0.4)]
            : [clampByte(118 + n * 0.6), clampByte(82 + n * 0.5), clampByte(68 + n * 0.5)]
        );

        // Netherite Block (forged dark plum-charcoal steel with bevels)
        setPx(
          TILE.NETHERITE_BLOCK,
          x,
          y,
          border
            ? [44, 39, 46]
            : seam
              ? [56, 50, 59]
              : [clampByte(72 + n * 0.5), clampByte(65 + n * 0.5), clampByte(76 + n * 0.5)]
        );

        // Wave 6: Sponge & Wet Sponge (porous golden / dark-olive sponge pores)
        const spongePore = ((x * 5 + y * 9) % 11 === 0) || ((x + 2) % 4 === 0 && (y + 1) % 4 === 0);
        setPx(
          TILE.SPONGE,
          x,
          y,
          spongePore
            ? [154, 146, 52]
            : [clampByte(216 + n * 0.6), clampByte(206 + n * 0.6), clampByte(82 + n * 0.5)]
        );
        setPx(
          TILE.WET_SPONGE,
          x,
          y,
          spongePore
            ? [96, 108, 42]
            : [clampByte(158 + n * 0.5), clampByte(168 + n * 0.5), clampByte(68 + n * 0.4)]
        );

        // Pumpkin Top (radial ribs + woody stem center) & Side (vertical orange ribs)
        const stemCenter = x >= 6 && x <= 9 && y >= 6 && y <= 9;
        const topRib = x === 7 || x === 8 || y === 7 || y === 8 || Math.abs(x - y) <= 0;
        setPx(
          TILE.PUMPKIN_TOP,
          x,
          y,
          stemCenter
            ? [116, 102, 54]
            : topRib
              ? [clampByte(192 + n * 0.5), clampByte(108 + n * 0.4), clampByte(24 + n * 0.3)]
              : [clampByte(224 + n * 0.6), clampByte(136 + n * 0.5), clampByte(32 + n * 0.4)]
        );
        const sideRib = x % 4 === 0;
        const pumpBase: [number, number, number] = sideRib
          ? [clampByte(184 + n * 0.5), clampByte(98 + n * 0.4), clampByte(20 + n * 0.3)]
          : [clampByte(226 + n * 0.6), clampByte(138 + n * 0.5), clampByte(30 + n * 0.4)];
        setPx(TILE.PUMPKIN_SIDE, x, y, pumpBase);

        // Carved Pumpkin & Glowing Jack o'Lantern face
        const leftEye = x >= 3 && x <= 5 && y >= 4 && y <= 6 && !(x === 3 && y === 4);
        const rightEye = x >= 10 && x <= 12 && y >= 4 && y <= 6 && !(x === 12 && y === 4);
        const mouthBand =
          y >= 9 &&
          y <= 12 &&
          x >= 3 &&
          x <= 12 &&
          !((y === 9 && (x === 5 || x === 8 || x === 10)) || (y === 12 && (x === 4 || x === 7 || x === 11)));
        const carvedHole = leftEye || rightEye || mouthBand;
        setPx(TILE.CARVED_PUMPKIN_FRONT, x, y, carvedHole ? [44, 22, 10] : pumpBase);
        setPx(
          TILE.JACK_O_LANTERN_FRONT,
          x,
          y,
          carvedHole ? (y === 10 || y === 5 ? [255, 246, 168] : [255, 198, 56]) : pumpBase
        );

        // Oak Trapdoor (wooden frame with 4 square ventilation cutouts + iron hinge)
        const trapCutout =
          (x >= 3 && x <= 6 && y >= 3 && y <= 6) ||
          (x >= 9 && x <= 12 && y >= 3 && y <= 6) ||
          (x >= 3 && x <= 6 && y >= 9 && y <= 12) ||
          (x >= 9 && x <= 12 && y >= 9 && y <= 12);
        const trapHinge = (x === 1 || x === 14) && (y === 4 || y === 11);
        setPx(
          TILE.OAK_TRAPDOOR,
          x,
          y,
          trapCutout
            ? [0, 0, 0, 0]
            : trapHinge
              ? [96, 102, 112, 255]
              : border
                ? [128, 96, 52, 255]
                : [clampByte(172 + n * 0.5), clampByte(136 + n * 0.4), clampByte(80 + n * 0.4), 255]
        );

        // Iron Bars (crisp dark-steel vertical bars + horizontal crossbars, transparent gaps)
        const barVert = x === 3 || x === 4 || x === 7 || x === 8 || x === 11 || x === 12;
        const barHoriz = y === 0 || y === 7 || y === 8 || y === 15;
        setPx(
          TILE.IRON_BARS,
          x,
          y,
          barVert || barHoriz
            ? [
                clampByte((x % 2 === 0 ? 156 : 122) + n * 0.4),
                clampByte((x % 2 === 0 ? 160 : 126) + n * 0.4),
                clampByte((x % 2 === 0 ? 168 : 132) + n * 0.4),
                255
              ]
            : [0, 0, 0, 0]
        );

        // Wave 7 Tiles: Barrel, Campfire, Anvil, Enchanting Table, Sweet Berry Bush & Amethyst
        const rCenter = Math.hypot(x - 7.5, y - 7.5);
        const barrelRim = rCenter >= 6.4 && rCenter <= 7.8;
        const barrelHole = x >= 4 && x <= 5 && y >= 5 && y <= 6;
        setPx(
          TILE.BARREL_TOP,
          x,
          y,
          barrelHole
            ? [32, 22, 14]
            : barrelRim
              ? [68, 72, 80]
              : [clampByte(126 + (y % 4 === 0 ? -18 : 8) + n * 0.4), clampByte(90 + (y % 4 === 0 ? -14 : 6) + n * 0.3), clampByte(50 + n * 0.3)]
        );
        const barrelHoop = y === 2 || y === 3 || y === 12 || y === 13;
        const barrelStave = x % 4 === 0;
        setPx(
          TILE.BARREL_SIDE,
          x,
          y,
          barrelHoop
            ? [clampByte(66 + n * 0.4), clampByte(70 + n * 0.4), clampByte(78 + n * 0.4)]
            : barrelStave
              ? [96, 68, 36]
              : [clampByte(132 + n * 0.5), clampByte(95 + n * 0.4), clampByte(52 + n * 0.3)]
        );

        // Campfire charred log, glowing ember/flame core & ash bed
        setPx(
          TILE.CAMPFIRE_LOG,
          x,
          y,
          y % 4 === 0
            ? [48, 34, 24]
            : [clampByte(88 + n * 0.6), clampByte(62 + n * 0.4), clampByte(38 + n * 0.3)]
        );
        const fireCore = rCenter < 3.6;
        const fireMid = rCenter < 6.2;
        setPx(
          TILE.CAMPFIRE_FIRE,
          x,
          y,
          fireCore
            ? [255, clampByte(238 + n * 0.3), clampByte(132 + n * 0.5)]
            : fireMid
              ? [255, clampByte(142 + n * 0.8), clampByte(28 + n * 0.4)]
              : [clampByte(120 + n * 0.7), clampByte(46 + n * 0.4), 24]
        );
        setPx(
          TILE.CAMPFIRE_ASH,
          x,
          y,
          (x + y) % 5 === 0
            ? [96, 94, 98]
            : [clampByte(54 + n * 0.4), clampByte(50 + n * 0.4), clampByte(52 + n * 0.4)]
        );

        // Anvil forged dark iron top
        const anvilBevel = x <= 2 || x >= 13 || y === 0 || y === 15;
        setPx(
          TILE.ANVIL_TOP,
          x,
          y,
          anvilBevel
            ? [clampByte(92 + n * 0.4), clampByte(96 + n * 0.4), clampByte(104 + n * 0.4)]
            : [clampByte(62 + n * 0.4), clampByte(65 + n * 0.4), clampByte(72 + n * 0.4)]
        );

        // Enchanting Table top (crimson cloth + gold border + cyan diamond corners + open grimoire)
        const enchCorner = (x <= 3 || x >= 12) && (y <= 3 || y >= 12);
        const enchBook = x >= 5 && x <= 10 && y >= 5 && y <= 10;
        const enchCloth = Math.abs(x - 7.5) + Math.abs(y - 7.5) <= 9.5;
        setPx(
          TILE.ENCHANT_TOP,
          x,
          y,
          enchBook
            ? (x === 7 || x === 8 ? [124, 78, 36] : [238, 226, 194])
            : enchCorner
              ? ((x === 1 || x === 14) && (y === 1 || y === 14) ? [64, 232, 220] : [36, 26, 52])
              : enchCloth
                ? (Math.abs(x - 7.5) + Math.abs(y - 7.5) > 8.2 ? [234, 184, 44] : [clampByte(168 + n * 0.5), 28, 42])
                : [clampByte(30 + n * 0.4), clampByte(22 + n * 0.3), clampByte(46 + n * 0.5)]
        );
        const enchRedTrim = y <= 3 && (y <= 1 || (x >= 3 && x <= 12 && y <= 5));
        const enchGoldEdge = (y === 2 && (x < 3 || x > 12)) || (y === 4 && x >= 3 && x <= 12);
        const enchGem = y >= 6 && y <= 9 && (x === 7 || x === 8);
        setPx(
          TILE.ENCHANT_SIDE,
          x,
          y,
          enchGoldEdge
            ? [236, 190, 52]
            : enchRedTrim
              ? [clampByte(172 + n * 0.4), 28, 42]
              : enchGem
                ? [58, 228, 218]
                : [clampByte(28 + n * 0.4), clampByte(20 + n * 0.4), clampByte(44 + n * 0.5)]
        );

        // Sweet Berry Bush (lush spruce bush with bright red berries, alpha-cutout)
        const bushDist = Math.hypot(x - 7.5, y - 8.8);
        const inBush = y >= 2 && bushDist < 7.2 + ((x * 7 + y * 3) % 3) * 0.45;
        const isBerry =
          inBush &&
          ((x === 4 && y === 6) || (x === 5 && y === 7) || (x === 10 && y === 5) ||
            (x === 11 && y === 6) || (x === 7 && y === 10) || (x === 8 && y === 11) || (x === 11 && y === 11));
        setPx(
          TILE.SWEET_BERRY_BUSH,
          x,
          y,
          !inBush
            ? [0, 0, 0, 0]
            : isBerry
              ? [226, 36, 52, 255]
              : [clampByte(32 + n * 0.5), clampByte(82 + n * 0.6), clampByte(40 + n * 0.4), 255]
        );

        // Amethyst Block & Glowing Crystal Cluster
        const facet = ((x + y) % 6 === 0) || ((x - y + 16) % 7 === 0);
        setPx(
          TILE.AMETHYST_BLOCK,
          x,
          y,
          facet
            ? [clampByte(208 + n * 0.5), clampByte(156 + n * 0.5), 252]
            : [clampByte(136 + n * 0.7), clampByte(82 + n * 0.6), clampByte(198 + n * 0.6)]
        );
        const shard1 = x >= 6 && x <= 9 && y >= 2 && y <= 15 && !(y <= 3 && (x === 6 || x === 9));
        const shard2 = x >= 3 && x <= 5 && y >= 6 && y <= 15 && !(y === 6 && x === 3);
        const shard3 = x >= 10 && x <= 12 && y >= 5 && y <= 15 && !(y === 5 && x === 12);
        const inCluster = shard1 || shard2 || shard3;
        setPx(
          TILE.AMETHYST_CLUSTER,
          x,
          y,
          !inCluster
            ? [0, 0, 0, 0]
            : (x === 7 || x === 4 || x === 11) && y < 12
              ? [238, 198, 255, 255]
              : [clampByte(164 + n * 0.5), clampByte(98 + n * 0.5), 232, 255]
        );

        // Wave 8: Cauldron cast-iron walls/rim & Jukebox mahogany speaker grille + disc slot
        const caulRimBand = y <= 1 || y === 13;
        const caulFootGap = y >= 14 && x >= 4 && x <= 11;
        setPx(
          TILE.CAULDRON_SIDE,
          x,
          y,
          caulFootGap
            ? [24, 26, 30]
            : caulRimBand
              ? [clampByte(82 + n * 0.4), clampByte(86 + n * 0.4), clampByte(94 + n * 0.4)]
              : [clampByte(56 + n * 0.5), clampByte(60 + n * 0.5), clampByte(68 + n * 0.5)]
        );
        const caulInner = x >= 2 && x <= 13 && y >= 2 && y <= 13;
        setPx(
          TILE.CAULDRON_TOP,
          x,
          y,
          caulInner
            ? [clampByte(38 + n * 0.3), clampByte(41 + n * 0.3), clampByte(48 + n * 0.3)]
            : [clampByte(86 + n * 0.4), clampByte(90 + n * 0.4), clampByte(98 + n * 0.4)]
        );
        const jukeBorder = x === 0 || x === 15 || y === 0 || y === 15;
        const jukeSlot = y >= 7 && y <= 8 && x >= 4 && x <= 11;
        const jukeDiamond = !jukeSlot && (Math.abs(x - 7.5) + Math.abs(y - 7.5) < 5.4) && ((x + y) % 2 === 0);
        setPx(
          TILE.JUKEBOX_TOP,
          x,
          y,
          jukeBorder
            ? [68, 40, 24]
            : jukeSlot
              ? [18, 16, 20]
              : jukeDiamond
                ? [clampByte(142 + n * 0.4), clampByte(88 + n * 0.4), clampByte(54 + n * 0.3)]
                : [clampByte(112 + n * 0.5), clampByte(66 + n * 0.4), clampByte(40 + n * 0.3)]
        );
        const jukeGrille = x >= 2 && x <= 13 && y >= 2 && y <= 13 && ((x + y) % 3 === 0 || (x - y + 16) % 3 === 0);
        setPx(
          TILE.JUKEBOX_SIDE,
          x,
          y,
          jukeBorder
            ? [66, 38, 22]
            : jukeGrille
              ? [clampByte(82 + n * 0.3), clampByte(48 + n * 0.3), clampByte(30 + n * 0.3)]
              : [clampByte(122 + n * 0.5), clampByte(72 + n * 0.4), clampByte(44 + n * 0.3)]
        );

        // Wave 9: Crying Obsidian, Respawn Anchor, Powder Snow, Note Block & Cake
        const cryVein = ((x * 5 + y * 3) % 11 === 0) || ((x === 4 || x === 11) && y >= 3 && y <= 12 && y % 3 !== 0);
        const cryGlow = cryVein && ((x + y) % 2 === 0);
        setPx(
          TILE.CRYING_OBSIDIAN,
          x,
          y,
          cryGlow
            ? [216, 108, 255]
            : cryVein
              ? [132, 42, 204]
              : [clampByte(22 + n * 0.4), clampByte(16 + n * 0.3), clampByte(38 + n * 0.5)]
        );

        const ancSwirl = rCenter < 5.4;
        const ancCore = rCenter < 2.6;
        setPx(
          TILE.RESPAWN_ANCHOR_TOP,
          x,
          y,
          ancCore
            ? [226, 148, 255]
            : ancSwirl
              ? ((x + y) % 2 === 0 ? [146, 52, 228] : [78, 24, 142])
              : [clampByte(24 + n * 0.4), clampByte(18 + n * 0.3), clampByte(40 + n * 0.4)]
        );

        const ancArch = x >= 3 && x <= 12 && y >= 4 && y <= 13;
        const ancDial = x >= 5 && x <= 10 && y >= 6 && y <= 11;
        setPx(
          TILE.RESPAWN_ANCHOR_SIDE_OFF,
          x,
          y,
          ancDial
            ? [14, 12, 22]
            : ancArch
              ? [54, 42, 74]
              : [clampByte(24 + n * 0.4), clampByte(18 + n * 0.3), clampByte(40 + n * 0.4)]
        );
        setPx(
          TILE.RESPAWN_ANCHOR_SIDE_ON,
          x,
          y,
          ancDial
            ? (y % 2 === 0 ? [255, 226, 104] : [234, 158, 34])
            : ancArch
              ? [98, 66, 138]
              : [clampByte(26 + n * 0.4), clampByte(18 + n * 0.3), clampByte(44 + n * 0.4)]
        );

        const powFleck = (x * 7 + y * 13) % 7 === 0;
        const powAir = (x * 3 + y * 5) % 9 === 0;
        setPx(
          TILE.POWDER_SNOW,
          x,
          y,
          powFleck
            ? [255, 255, 255]
            : powAir
              ? [206, 228, 246]
              : [clampByte(236 + n * 0.4), clampByte(245 + n * 0.3), 254]
        );

        const noteBorder = x === 0 || x === 15 || y === 0 || y === 15;
        const noteStud = (x <= 1 || x >= 14) && (y <= 1 || y >= 14);
        const noteMesh = (x + y) % 2 === 0 && x >= 2 && x <= 13 && y >= 2 && y <= 13;
        setPx(
          TILE.NOTE_BLOCK,
          x,
          y,
          noteStud
            ? [196, 152, 68]
            : noteBorder
              ? [58, 36, 20]
              : noteMesh
                ? [clampByte(92 + n * 0.3), clampByte(58 + n * 0.3), clampByte(34 + n * 0.3)]
                : [clampByte(126 + n * 0.4), clampByte(82 + n * 0.4), clampByte(48 + n * 0.3)]
        );

        const cakeEdge = x === 0 || x === 15 || y === 0 || y === 15;
        const cakeBerry =
          (x >= 4 && x <= 5 && y >= 4 && y <= 5) ||
          (x >= 10 && x <= 11 && y >= 4 && y <= 5) ||
          (x >= 7 && x <= 8 && y >= 7 && y <= 8) ||
          (x >= 4 && x <= 5 && y >= 10 && y <= 11) ||
          (x >= 10 && x <= 11 && y >= 10 && y <= 11);
        setPx(
          TILE.CAKE_TOP,
          x,
          y,
          cakeBerry
            ? [220, 32, 46]
            : cakeEdge
              ? [226, 218, 208]
              : [clampByte(248 + n * 0.2), clampByte(244 + n * 0.2), clampByte(238 + n * 0.2)]
        );
        const cakeIcing = y <= 5 || (y === 6 && x % 4 <= 1);
        setPx(
          TILE.CAKE_SIDE,
          x,
          y,
          cakeIcing
            ? [clampByte(246 + n * 0.2), clampByte(242 + n * 0.2), 236]
            : y >= 14
              ? [154, 96, 42]
              : [clampByte(206 + n * 0.4), clampByte(138 + n * 0.4), clampByte(66 + n * 0.3)]
        );
      }
    }

    // --- Wave 10: Dripstone, Pointed Dripstone, Copper Bulb, Target Block & Flower Pot ---
    clearTile(TILE.POINTED_DRIPSTONE);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = (rng.next() - 0.5) * 18;
        // Dripstone Block (warm mineral travertine bands)
        const band = Math.sin((y + x * 0.25) * 0.85) * 9;
        setPx(TILE.DRIPSTONE_BLOCK, x, y, [
          clampByte(138 + band + n * 0.5),
          clampByte(112 + band * 0.8 + n * 0.45),
          clampByte(96 + band * 0.7 + n * 0.4)
        ]);

        // Pointed Dripstone (alpha-cutout upward stalagmite cone; flipped in mesher when hanging from ceiling)
        const halfW = Math.max(1.1, ((y + 2) / 17) * 5.6);
        if (Math.abs(x - 7.5) <= halfW && y >= 1) {
          const edge = Math.abs(x - 7.5) >= halfW - 1.05 ? -16 : 6;
          setPx(TILE.POINTED_DRIPSTONE, x, y, [
            clampByte(146 + edge + n * 0.5),
            clampByte(118 + edge + n * 0.45),
            clampByte(101 + edge + n * 0.4),
            255
          ]);
        }

        // Copper Bulb (OFF & ON)
        const frame = x <= 1 || x >= 14 || y <= 1 || y >= 14 || ((x <= 3 || x >= 12) && (y <= 3 || y >= 12));
        const crossBrace = (x === 7 || x === 8) && (y <= 3 || y >= 12);
        if (frame || crossBrace) {
          setPx(TILE.COPPER_BULB_OFF, x, y, [
            clampByte(168 + n * 0.45),
            clampByte(96 + n * 0.35),
            clampByte(66 + n * 0.3)
          ]);
          setPx(TILE.COPPER_BULB_ON, x, y, [
            clampByte(192 + n * 0.4),
            clampByte(114 + n * 0.35),
            clampByte(74 + n * 0.3)
          ]);
        } else {
          const dist = Math.hypot(x - 7.5, y - 7.5);
          setPx(TILE.COPPER_BULB_OFF, x, y, [
            clampByte(74 - dist * 3 + n * 0.3),
            clampByte(48 - dist * 2 + n * 0.25),
            clampByte(38 - dist * 1.5 + n * 0.2)
          ]);
          const glow = Math.max(0, 1 - dist / 6.8);
          setPx(TILE.COPPER_BULB_ON, x, y, [
            clampByte(218 + glow * 37),
            clampByte(158 + glow * 86),
            clampByte(76 + glow * 136)
          ]);
        }

        // Target Block (concentric red/white archery bullseye on straw-tinted backing)
        const cheb = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        const isRing = cheb < 1.2 || (cheb >= 3.1 && cheb < 4.4) || (cheb >= 6.1 && cheb < 7.3);
        const targetCol: [number, number, number] = isRing
          ? [clampByte(206 + n * 0.35), clampByte(48 + n * 0.25), clampByte(46 + n * 0.25)]
          : [clampByte(242 + n * 0.25), clampByte(234 + n * 0.25), clampByte(218 + n * 0.25)];
        setPx(TILE.TARGET_BLOCK_SIDE, x, y, targetCol);
        setPx(TILE.TARGET_BLOCK_TOP, x, y, targetCol);

        // Flower Pot (fired terracotta rim + shaded clay vessel)
        const potRim = y <= 3 ? 14 : y >= 13 ? -14 : 0;
        setPx(TILE.FLOWER_POT, x, y, [
          clampByte(158 + potRim + n * 0.45),
          clampByte(86 + potRim * 0.6 + n * 0.35),
          clampByte(62 + potRim * 0.5 + n * 0.3)
        ]);
      }
    }
  }

  // --- 9. 10 Block Crack Stages (TILE.CRACK_0 + 0..9) ---
  for (let stage = 0; stage < 10; stage++) {
    const t = TILE.CRACK_0 + stage;
    clearTile(t);
    const branches = 2 + stage * 2;
    const rng = new Rng(950 + stage);
    for (let b = 0; b < branches; b++) {
      let cx = 8, cy = 8;
      const steps = 2 + stage;
      const ang = (b / branches) * Math.PI * 2 + rng.next() * 0.5;
      for (let s = 0; s < steps; s++) {
        cx += Math.cos(ang + (rng.next() - 0.5) * 0.9) * 1.1;
        cy += Math.sin(ang + (rng.next() - 0.5) * 0.9) * 1.1;
        const ix = Math.max(0, Math.min(15, Math.round(cx)));
        const iy = Math.max(0, Math.min(15, Math.round(cy)));
        setPx(t, ix, iy, [18, 18, 22, 195]);
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  cachedAtlasPixels = new Uint8ClampedArray(img.data);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  // --- 10. Render Crisp 48x48 Icons for ALL Blocks & Items ---
  const icons = new Map<number, string>();
  const ic = document.createElement('canvas');
  ic.width = 48;
  ic.height = 48;
  const ictx = ic.getContext('2d')!;

  // First: Block icons
  for (const b of BLOCKS) {
    if (!b || b.id === 0) continue;
    ictx.clearRect(0, 0, 48, 48);

    if (b.cross || b.flatWire) {
      const tmp = document.createElement('canvas');
      tmp.width = 16; tmp.height = 16;
      const sx = (b.tiles[0] % ATLAS_GRID) * TILE_PX;
      const sy = Math.floor(b.tiles[0] / ATLAS_GRID) * TILE_PX;
      tmp.getContext('2d')!.drawImage(canvas, sx, sy, 16, 16, 0, 0, 16, 16);
      ictx.imageSmoothingEnabled = false;
      ictx.drawImage(tmp, 6, 6, 36, 36);
      icons.set(b.id, ic.toDataURL());
      continue;
    }

    if (b.shape === 'door_closed') {
      const tmp = document.createElement('canvas');
      tmp.width = 16; tmp.height = 32;
      const tctx = tmp.getContext('2d')!;
      const ux = (TILE.OAK_DOOR % ATLAS_GRID) * TILE_PX, uy = Math.floor(TILE.OAK_DOOR / ATLAS_GRID) * TILE_PX;
      const lx = (TILE.OAK_DOOR_LOWER % ATLAS_GRID) * TILE_PX, ly = Math.floor(TILE.OAK_DOOR_LOWER / ATLAS_GRID) * TILE_PX;
      tctx.drawImage(canvas, ux, uy, 16, 16, 0, 0, 16, 16);
      tctx.drawImage(canvas, lx, ly, 16, 16, 0, 16, 16, 16);
      ictx.imageSmoothingEnabled = false;
      ictx.drawImage(tmp, 13, 3, 22, 42);
      icons.set(b.id, ic.toDataURL());
      continue;
    }

    if (b.shape === 'lantern') {
      const tmp = document.createElement('canvas');
      tmp.width = 16; tmp.height = 16;
      const sx = (TILE.LANTERN % ATLAS_GRID) * TILE_PX, sy = Math.floor(TILE.LANTERN / ATLAS_GRID) * TILE_PX;
      tmp.getContext('2d')!.drawImage(canvas, sx, sy, 16, 16, 0, 0, 16, 16);
      ictx.imageSmoothingEnabled = false;
      ictx.fillStyle = '#3a3e46';
      ictx.fillRect(22, 4, 4, 6);
      ictx.fillRect(17, 10, 14, 4);
      ictx.drawImage(tmp, 12, 14, 24, 28);
      icons.set(b.id, ic.toDataURL());
      continue;
    }

    if (b.shape === 'fence') {
      const tmp = document.createElement('canvas');
      tmp.width = 16; tmp.height = 16;
      const sx = (b.tiles[1] % ATLAS_GRID) * TILE_PX, sy = Math.floor(b.tiles[1] / ATLAS_GRID) * TILE_PX;
      tmp.getContext('2d')!.drawImage(canvas, sx, sy, 16, 16, 0, 0, 16, 16);
      ictx.imageSmoothingEnabled = false;
      ictx.drawImage(tmp, 4, 4, 4, 16, 8, 6, 9, 36);
      ictx.drawImage(tmp, 10, 4, 4, 16, 31, 6, 9, 36);
      ictx.drawImage(tmp, 0, 2, 16, 3, 6, 13, 36, 6);
      ictx.drawImage(tmp, 0, 9, 16, 3, 6, 26, 36, 6);
      icons.set(b.id, ic.toDataURL());
      continue;
    }

    if (b.shape === 'pane' || b.shape === 'trapdoor_closed') {
      const tmp = document.createElement('canvas');
      tmp.width = 16; tmp.height = 16;
      const sx = (b.tiles[0] % ATLAS_GRID) * TILE_PX, sy = Math.floor(b.tiles[0] / ATLAS_GRID) * TILE_PX;
      tmp.getContext('2d')!.drawImage(canvas, sx, sy, 16, 16, 0, 0, 16, 16);
      ictx.imageSmoothingEnabled = false;
      ictx.drawImage(tmp, 6, 6, 36, 36);
      icons.set(b.id, ic.toDataURL());
      continue;
    }

    if (b.shape === 'campfire') {
      ictx.fillStyle = '#5c3c22';
      ictx.fillRect(6, 33, 36, 6);
      ictx.fillStyle = '#78502e';
      ictx.fillRect(10, 28, 28, 6);
      if (b.id === BLOCK.CAMPFIRE) {
        ictx.fillStyle = '#ea580c';
        ictx.fillRect(15, 14, 18, 16);
        ictx.fillStyle = '#facc15';
        ictx.fillRect(19, 10, 10, 16);
        ictx.fillStyle = '#fef9c3';
        ictx.fillRect(22, 16, 4, 9);
      } else {
        ictx.fillStyle = '#52525b';
        ictx.fillRect(16, 25, 16, 5);
      }
      icons.set(b.id, ic.toDataURL());
      continue;
    }

    if (b.shape === 'anvil') {
      ictx.fillStyle = '#3f434c';
      ictx.fillRect(8, 10, 32, 11);
      ictx.fillStyle = '#575c68';
      ictx.fillRect(10, 10, 28, 4);
      ictx.fillStyle = '#32363e';
      ictx.fillRect(17, 21, 14, 11);
      ictx.fillStyle = '#474c56';
      ictx.fillRect(10, 32, 28, 8);
      icons.set(b.id, ic.toDataURL());
      continue;
    }

    if (b.shape === 'cauldron') {
      ictx.fillStyle = '#525864';
      ictx.fillRect(8, 11, 32, 5);
      ictx.fillStyle = '#3b404a';
      ictx.fillRect(10, 16, 28, 21);
      ictx.fillStyle = '#252930';
      ictx.fillRect(14, 12, 20, 4);
      ictx.fillRect(11, 37, 6, 4);
      ictx.fillRect(31, 37, 6, 4);
      icons.set(b.id, ic.toDataURL());
      continue;
    }

    if (b.shape === 'flower_pot') {
      ictx.fillStyle = '#b45d42';
      ictx.fillRect(14, 21, 20, 5);
      ictx.fillStyle = '#964933';
      ictx.fillRect(16, 26, 16, 15);
      ictx.fillStyle = '#543824';
      ictx.fillRect(17, 22, 14, 3);
      icons.set(b.id, ic.toDataURL());
      continue;
    }

    const imgOut = ictx.createImageData(48, 48);
    const out = imgOut.data;
    const S = 48;
    const p = (x: number, y: number): [number, number] => [(x * S) / 128, (y * S) / 128];
    const isSlab = b.shape === 'slab' || b.shape === 'cake';
    const isEnchant = b.shape === 'enchanting_table';
    const isStairs = !!b.shape && b.shape.startsWith('stairs_');
    const yShift = isSlab ? 28 : isEnchant ? 14 : 0;
    const top = p(64, 6 + yShift), right = p(119, 35 + yShift), botMid = p(64, 64 + yShift), left = p(9, 35 + yShift);
    const botDown = p(64, isSlab ? 93 + yShift : 122), leftDown = p(9, isSlab ? 64 + yShift : 93);
    const frontTile = b.tiles[3] ?? b.tiles[1];

    const faces = [
      { origin: top, uEnd: right, vEnd: left, tile: b.tiles[0], shade: 1.0, stairCut: isStairs ? 'top' : '' },
      { origin: left, uEnd: botMid, vEnd: leftDown, tile: b.tiles[1], shade: 0.82, stairCut: isStairs ? 'side' : '' },
      { origin: botMid, uEnd: right, vEnd: botDown, tile: frontTile, shade: 0.65, stairCut: isStairs ? 'front' : '' }
    ];

    for (const f of faces) {
      const ux = f.uEnd[0] - f.origin[0], uy = f.uEnd[1] - f.origin[1];
      const vx = f.vEnd[0] - f.origin[0], vy = f.vEnd[1] - f.origin[1];
      const det = ux * vy - uy * vx;
      for (let py = 0; py < S; py++) {
        for (let px = 0; px < S; px++) {
          const dx = px + 0.5 - f.origin[0], dy = py + 0.5 - f.origin[1];
          const u = (dx * vy - dy * vx) / det;
          const v = (ux * dy - uy * dx) / det;
          if (u >= 0 && u < 1 && v >= 0 && v < 1) {
            if (f.stairCut === 'side' && u > 0.5 && v < 0.5) continue;
            if (f.stairCut === 'front' && v < 0.5) {
              // Draw recessed upper riser + lower tread top!
              const c = getPx(b.tiles[0], Math.floor(u * 16), Math.floor(v * 16));
              if (c[3] > 12) {
                const oi = (py * S + px) * 4;
                out[oi] = clampByte(c[0] * 0.92);
                out[oi + 1] = clampByte(c[1] * 0.92);
                out[oi + 2] = clampByte(c[2] * 0.92);
                out[oi + 3] = Math.max(215, c[3]);
              }
              continue;
            }
            if (f.stairCut === 'top' && v > 0.5) {
              const oi = (py * S + px) * 4;
              const c = getPx(f.tile, Math.floor(u * 16), Math.floor(v * 16));
              if (c[3] > 12) {
                out[oi] = clampByte(c[0] * 0.72);
                out[oi + 1] = clampByte(c[1] * 0.72);
                out[oi + 2] = clampByte(c[2] * 0.72);
                out[oi + 3] = Math.max(215, c[3]);
              }
              continue;
            }
            const c = getPx(f.tile, Math.floor(u * 16), Math.floor(v * 16));
            if (c[3] > 12) {
              const oi = (py * S + px) * 4;
              out[oi] = clampByte(c[0] * f.shade);
              out[oi + 1] = clampByte(c[1] * f.shade);
              out[oi + 2] = clampByte(c[2] * f.shade);
              out[oi + 3] = Math.max(215, c[3]);
            }
          }
        }
      }
    }
    ictx.putImageData(imgOut, 0, 0);
    icons.set(b.id, ic.toDataURL());
  }

  // Second: Non-Block Pixel Sprite Items (Swords, Pickaxes, Axes, Foods, Ingots, Bow, etc.)
  for (const item of ALL_CREATIVE_ITEMS) {
    if (item.isBlock || !item.sprite) continue;
    ictx.clearRect(0, 0, 48, 48);
    const tmp = renderSpriteCanvas(item.sprite);
    ictx.imageSmoothingEnabled = false;
    ictx.drawImage(tmp, 3, 3, 42, 42);
    icons.set(item.id, ic.toDataURL());
  }

  return { texture, canvas, icons };
}

export function renderSpriteCanvas(sprite: NonNullable<ItemDef['sprite']>): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < 16; y++) {
    const row = sprite.rows[y] || '';
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      const hex = sprite.palette[ch];
      if (!hex) continue;
      ctx.fillStyle = hex;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

// Extrudes a 16x16 pixel item (Sword, Pickaxe, Torch, Steak, Bow) into an authentic 3D Voxelized Item Mesh!
let cachedAtlasPixels: Uint8ClampedArray | null = null;
const extrudedCache = new Map<string, THREE.BufferGeometry>();

export function buildExtrudedAtlasTileMesh(tileIdx: number, scale = 0.42): THREE.Mesh | null {
  if (!cachedAtlasPixels) return null;
  const cacheKey = `tile:${tileIdx}:${scale.toFixed(3)}`;
  let geo = extrudedCache.get(cacheKey);
  if (!geo) {
    const pos: number[] = [];
    const norm: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    let vc = 0;

    const tx = (tileIdx % ATLAS_GRID) * TILE_PX;
    const ty = Math.floor(tileIdx / ATLAS_GRID) * TILE_PX;
    const atlasW = ATLAS_GRID * TILE_PX;

    const pxAt = (x: number, y: number): [number, number, number] | null => {
      if (x < 0 || x >= 16 || y < 0 || y >= 16 || !cachedAtlasPixels) return null;
      const bi = ((ty + y) * atlasW + (tx + x)) * 4;
      if (cachedAtlasPixels[bi + 3] < 32) return null;
      return [
        cachedAtlasPixels[bi] / 255,
        cachedAtlasPixels[bi + 1] / 255,
        cachedAtlasPixels[bi + 2] / 255
      ];
    };

    const pushQuad = (
      p0: [number, number, number],
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      n: [number, number, number],
      c: [number, number, number],
      shade: number
    ) => {
      const b = vc;
      for (const p of [p0, p1, p2, p3]) {
        pos.push(p[0], p[1], p[2]);
        norm.push(n[0], n[1], n[2]);
        col.push(c[0] * shade, c[1] * shade, c[2] * shade);
      }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      vc += 4;
    };

    const step = scale / 16;
    const halfZ = step * 0.50;

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const c = pxAt(x, y);
        if (!c) continue;
        const x0 = (x - 8) * step;
        const x1 = (x - 7) * step;
        const y0 = (7 - y) * step;
        const y1 = (8 - y) * step;

        pushQuad([x0, y0, halfZ], [x1, y0, halfZ], [x1, y1, halfZ], [x0, y1, halfZ], [0, 0, 1], c, 1.0);
        pushQuad([x1, y0, -halfZ], [x0, y0, -halfZ], [x0, y1, -halfZ], [x1, y1, -halfZ], [0, 0, -1], c, 0.96);
        if (!pxAt(x - 1, y)) pushQuad([x0, y0, -halfZ], [x0, y0, halfZ], [x0, y1, halfZ], [x0, y1, -halfZ], [-1, 0, 0], c, 0.84);
        if (!pxAt(x + 1, y)) pushQuad([x1, y0, halfZ], [x1, y0, -halfZ], [x1, y1, -halfZ], [x1, y1, halfZ], [1, 0, 0], c, 0.82);
        if (!pxAt(x, y - 1)) pushQuad([x0, y1, halfZ], [x1, y1, halfZ], [x1, y1, -halfZ], [x0, y1, -halfZ], [0, 1, 0], c, 0.94);
        if (!pxAt(x, y + 1)) pushQuad([x0, y0, -halfZ], [x1, y0, -halfZ], [x1, y0, halfZ], [x0, y0, halfZ], [0, -1, 0], c, 0.72);
      }
    }

    if (vc === 0) return null;
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.userData.shared = true;
    extrudedCache.set(cacheKey, geo);
  }

  const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
  return new THREE.Mesh(geo, mat);
}

export function buildExtrudedItemMesh(itemId: number, scale = 0.44, thicknessMult = 1.0): THREE.Mesh | null {
  const def = getItemDef(itemId);
  if (!def.sprite) return null;

  const cacheKey = `${itemId}:${scale.toFixed(3)}:${thicknessMult.toFixed(2)}`;
  let geo = extrudedCache.get(cacheKey);
  if (!geo) {
    const { rows, palette } = def.sprite;
    const pos: number[] = [];
    const norm: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    let vc = 0;

    const pxAt = (x: number, y: number): THREE.Color | null => {
      if (x < 0 || x >= 16 || y < 0 || y >= 16) return null;
      const ch = rows[y]?.[x];
      if (!ch || ch === '.' || !palette[ch]) return null;
      return new THREE.Color(palette[ch]);
    };

    const pushQuad = (
      p0: [number, number, number],
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      n: [number, number, number],
      c: THREE.Color,
      shade: number
    ) => {
      const b = vc;
      for (const p of [p0, p1, p2, p3]) {
        pos.push(p[0], p[1], p[2]);
        norm.push(n[0], n[1], n[2]);
        col.push(c.r * shade, c.g * shade, c.b * shade);
      }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      vc += 4;
    };

    const step = scale / 16;
    const halfZ = step * 0.50 * thicknessMult;

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const c = pxAt(x, y);
        if (!c) continue;
        const x0 = (x - 8) * step;
        const x1 = (x - 7) * step;
        const y0 = (7 - y) * step;
        const y1 = (8 - y) * step;

        // Front (+Z) and Back (-Z)
        pushQuad([x0, y0, halfZ], [x1, y0, halfZ], [x1, y1, halfZ], [x0, y1, halfZ], [0, 0, 1], c, 1.0);
        pushQuad([x1, y0, -halfZ], [x0, y0, -halfZ], [x0, y1, -halfZ], [x1, y1, -halfZ], [0, 0, -1], c, 0.96);

        // Exposed 1.0-px Vanilla bevel edges!
        if (!pxAt(x - 1, y)) pushQuad([x0, y0, -halfZ], [x0, y0, halfZ], [x0, y1, halfZ], [x0, y1, -halfZ], [-1, 0, 0], c, 0.85);
        if (!pxAt(x + 1, y)) pushQuad([x1, y0, halfZ], [x1, y0, -halfZ], [x1, y1, -halfZ], [x1, y1, halfZ], [1, 0, 0], c, 0.82);
        if (!pxAt(x, y - 1)) pushQuad([x0, y1, halfZ], [x1, y1, halfZ], [x1, y1, -halfZ], [x0, y1, -halfZ], [0, 1, 0], c, 0.94);
        if (!pxAt(x, y + 1)) pushQuad([x0, y0, -halfZ], [x1, y0, -halfZ], [x1, y0, halfZ], [x0, y0, halfZ], [0, -1, 0], c, 0.72);
      }
    }

    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.userData.shared = true;
    extrudedCache.set(cacheKey, geo);
  }

  const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
  return new THREE.Mesh(geo, mat);
}

export function getTileUV(tile: number): [number, number, number, number] {
  const col = tile % ATLAS_GRID;
  const row = Math.floor(tile / ATLAS_GRID);
  const step = 1 / ATLAS_GRID;
  const pad = 0.0012;
  const u0 = col * step + pad;
  const u1 = (col + 1) * step - pad;
  const v1 = 1 - row * step - pad;
  const v0 = 1 - (row + 1) * step + pad;
  return [u0, v0, u1, v1];
}
