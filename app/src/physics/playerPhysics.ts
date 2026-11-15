// Ported Horizon 26.3 Voxel Player Physics:
// Unloaded Chunk Guard (#15727), Shoreline Swim Hop, Crouch Edge-Backoff, Low-Ceiling Force-Crouch,
// Full-Footprint Slime/Bed Bounce & Hay Bale Fall Mitigation (#15742), Shallow-Water Substep Safety,
// Exact Surface Snap, Portal Detection & Amanatides-Woo DDA Raycast

import { BLOCK, BlockDef, getBlock, isLavaBlock, isWaterBlock } from '../world/blocks';
import { getFloraOffset } from '../world/mesher';
import { WorldManager } from '../world/worldManager';

export interface RaycastHit {
  bx: number;
  by: number;
  bz: number;
  nx: number;
  ny: number;
  nz: number;
  blockId: number;
  dist: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sneak: boolean;
  sprint: boolean;
  usingItem?: boolean;
  moveX?: number;
  moveZ?: number;
  moveYaw?: number;
}

type SubAABB = [number, number, number, number, number, number];

const BOX_CUBE: SubAABB[] = [[0, 0, 0, 1, 1, 1]];
const BOX_SLAB: SubAABB[] = [[0, 0, 0, 1, 0.5, 1]];
const BOX_BED: SubAABB[] = [[0, 0, 0, 1, 0.5625, 1]];
const BOX_PATH: SubAABB[] = [[0, 0, 0, 1, 0.9375, 1]];
const BOX_LANTERN: SubAABB[] = [[0.31, 0, 0.31, 0.69, 0.64, 0.69]];
const BOX_DOOR_CLOSED: SubAABB[] = [[0, 0, 0.40625, 1, 1, 0.59375]];
const BOX_DOOR_OPEN: SubAABB[] = [[0, 0, 0, 0.1875, 1, 1]];
const BOX_TRAPDOOR_CLOSED: SubAABB[] = [[0, 0, 0, 1, 0.1875, 1]];
const BOX_TRAPDOOR_OPEN: SubAABB[] = [[0, 0, 0, 1, 1, 0.1875]];
const BOX_CAMPFIRE: SubAABB[] = [[0, 0, 0, 1, 0.4375, 1]];
const BOX_ANVIL: SubAABB[] = [[0.125, 0, 0, 0.875, 1, 1]];
const BOX_ENCHANT: SubAABB[] = [[0, 0, 0, 1, 0.75, 1]];
const BOX_CAKE: SubAABB[] = [[0.0625, 0, 0.0625, 0.9375, 0.5, 0.9375]];
const BOX_FLOWER_POT: SubAABB[] = [[0.3125, 0, 0.3125, 0.6875, 0.375, 0.6875]];
const BOX_CAULDRON: SubAABB[] = [
  [0, 0, 0, 1, 0.1875, 1],
  [0, 0.1875, 0, 0.125, 1, 1],
  [0.875, 0.1875, 0, 1, 1, 1],
  [0.125, 0.1875, 0, 0.875, 1, 0.125],
  [0.125, 0.1875, 0.875, 0.875, 1, 1]
];
const BOX_STAIRS_N: SubAABB[] = [[0, 0, 0, 1, 0.5, 1], [0, 0.5, 0, 1, 1, 0.5]];
const BOX_STAIRS_S: SubAABB[] = [[0, 0, 0, 1, 0.5, 1], [0, 0.5, 0.5, 1, 1, 1]];
const BOX_STAIRS_E: SubAABB[] = [[0, 0, 0, 1, 0.5, 1], [0.5, 0.5, 0, 1, 1, 1]];
const BOX_STAIRS_W: SubAABB[] = [[0, 0, 0, 1, 0.5, 1], [0, 0.5, 0, 0.5, 1, 1]];

function getVoxelCollisionBoxes(
  world: WorldManager,
  bx: number,
  by: number,
  bz: number,
  b: BlockDef,
  canStandOnPowderSnow = false,
  preStepFeetY = -999,
  forRaycast = false
): SubAABB[] {
  if (!b.solid) {
    if (!forRaycast) return [];
    const id = b.id;
    if (
      id === BLOCK.POPPY ||
      id === BLOCK.DANDELION ||
      id === BLOCK.CORNFLOWER ||
      id === BLOCK.OXEYE_DAISY ||
      id === BLOCK.CHERRY_PETALS
    ) {
      const [ox, oz] = getFloraOffset(bx, bz);
      return [[0.31 + ox, 0, 0.31 + oz, 0.69 + ox, 0.72, 0.69 + oz]];
    }
    if (id === BLOCK.TALL_GRASS) {
      const [ox, oz] = getFloraOffset(bx, bz);
      return [[0.14 + ox, 0, 0.14 + oz, 0.86 + ox, 0.84, 0.86 + oz]];
    }
    if (id === BLOCK.TORCH) return [[0.375, 0, 0.375, 0.625, 0.68, 0.625]];
    if (id === BLOCK.LEVER_OFF || id === BLOCK.LEVER_ON) return [[0.31, 0, 0.31, 0.69, 0.52, 0.69]];
    if (b.flatWire) return [[0.06, 0, 0.06, 0.94, 0.08, 0.94]];
    if (b.cross && id !== BLOCK.LADDER) return [[0.12, 0, 0.12, 0.88, 0.88, 0.88]];
    return BOX_CUBE;
  }
  if (b.id === BLOCK.CHEST) return [[0.0625, 0, 0.0625, 0.9375, 0.875, 0.9375]];
  if (b.id === BLOCK.BED_BLOCK) return [[0, 0, 0, 1, 0.5625, 1]];
  if (b.id === BLOCK.BELL_BLOCK) return [[0.125, 0, 0.125, 0.875, 1, 0.875]];
  if (b.shape === 'powder_snow') {
    if (forRaycast) return BOX_CUBE;
    return canStandOnPowderSnow && preStepFeetY >= by + 1 - 1e-4 ? BOX_CUBE : [];
  }
  if (b.shape === 'flower_pot') return BOX_FLOWER_POT;
  if (b.shape === 'cake') return BOX_CAKE;
  if (b.shape === 'slab') return BOX_SLAB;
  if (b.shape === 'stairs_n') return BOX_STAIRS_N;
  if (b.shape === 'stairs_s') return BOX_STAIRS_S;
  if (b.shape === 'stairs_e') return BOX_STAIRS_E;
  if (b.shape === 'stairs_w') return BOX_STAIRS_W;
  if (b.shape === 'lantern') return BOX_LANTERN;
  if (b.shape === 'door_closed') return BOX_DOOR_CLOSED;
  if (b.shape === 'door_open') return BOX_DOOR_OPEN;
  if (b.shape === 'trapdoor_closed') return BOX_TRAPDOOR_CLOSED;
  if (b.shape === 'trapdoor_open') return BOX_TRAPDOOR_OPEN;
  if (b.shape === 'campfire') return BOX_CAMPFIRE;
  if (b.shape === 'anvil') return BOX_ANVIL;
  if (b.shape === 'enchanting_table') return BOX_ENCHANT;
  if (b.shape === 'cauldron') return BOX_CAULDRON;
  if (b.shape === 'pane') {
    const conn = (nid: number) => {
      const nb = getBlock(nid);
      return nb.shape === 'pane' || (nb.solid && nb.opaque);
    };
    const cW = conn(world.getBlock(bx - 1, by, bz));
    const cE = conn(world.getBlock(bx + 1, by, bz));
    const cN = conn(world.getBlock(bx, by, bz - 1));
    const cS = conn(world.getBlock(bx, by, bz + 1));
    const anyConn = cW || cE || cN || cS;
    const boxes: SubAABB[] = [];
    if (cW || cE || !anyConn) {
      boxes.push([cW || !anyConn ? 0 : 0.4375, 0, 0.4375, cE || !anyConn ? 1 : 0.5625, 1, 0.5625]);
    }
    if (cN || cS || !anyConn) {
      boxes.push([0.4375, 0, cN || !anyConn ? 0 : 0.4375, 0.5625, 1, cS || !anyConn ? 1 : 0.5625]);
    }
    return boxes.length > 0 ? boxes : [[0.4375, 0, 0.4375, 0.5625, 1, 0.5625]];
  }
  if (b.shape === 'fence') {
    const conn = (nid: number) => {
      const nb = getBlock(nid);
      return nb.shape === 'fence' || (nb.solid && nb.opaque);
    };
    const x0 = conn(world.getBlock(bx - 1, by, bz)) ? 0 : 0.35;
    const x1 = conn(world.getBlock(bx + 1, by, bz)) ? 1 : 0.65;
    const z0 = conn(world.getBlock(bx, by, bz - 1)) ? 0 : 0.35;
    const z1 = conn(world.getBlock(bx, by, bz + 1)) ? 1 : 0.65;
    return [[x0, 0, z0, x1, 1.5, z1]];
  }
  if (b.id === BLOCK.BED_BLOCK) return BOX_BED;
  if (b.id === BLOCK.DIRT_PATH || b.id === BLOCK.FARMLAND) return BOX_PATH;
  return BOX_CUBE;
}

export class PlayerController {
  public x = 0.5;
  public y = 49.05;
  public z = 7.5;
  public vx = 0;
  public vy = 0;
  public vz = 0;
  public yaw = 0;    // 0 looks North (-Z) directly toward Village Well & Cottages
  public pitch = -0.04;

  public readonly halfWidth = 0.3;
  public readonly standHeight = 1.8;
  public readonly crouchHeight = 1.5;
  public readonly slimeHeight = 1.12;
  public slimeMode = false;
  public rpgSpeedMult = 1.0;
  public swimSpeedMult = 1.0;
  public jumpBonus = 0.0;
  public waterWalkEnabled = false;
  public isSwimming = false;
  private swimWaveClock = 0;

  public onGround = false;
  public isCrouching = false;
  public inWater = false;
  public inLava = false;
  public inPowderSnow = false;
  public wearingLeatherBoots = false;
  public freezeProgress = 0; // 0..7s (`powder_snow_collision.rs`)
  public headUnderwater = false;
  public onLadder = false;
  public flying = false;
  public stepAccumulator = 0;
  private fallPeakY = 49.05;
  private windGraceFloorY: number | null = null;
  private portalDwell = 0;
  private freezeDamageTick = 0;

  public onStep?: (material: string) => void;
  public onLand?: (fallDistance: number, landedBlock: BlockDef) => void;
  public onPortalTrigger?: (portalKind: 'nether' | 'end') => void;
  public onContactHazard?: (damage: number, source: string) => void;

  private hazardTick = 0;

  public currentHeight(sneak = this.isCrouching): number {
    if (this.slimeMode && !this.flying) return this.slimeHeight;
    return (sneak || this.isCrouching) && !this.flying ? this.crouchHeight : this.standHeight;
  }

  public eyeHeight(sneak = this.isCrouching): number {
    if (this.slimeMode && !this.flying) return sneak || this.isCrouching ? 0.82 : 0.98;
    return (sneak || this.isCrouching) && !this.flying ? 1.32 : 1.62;
  }

  public currentFallDistance(): number {
    return Math.max(0, this.fallPeakY - this.y);
  }

  public resetFallDistance(): void {
    this.fallPeakY = this.y;
    this.windGraceFloorY = null;
  }

  public setWindBurstGrace(floorY: number): void {
    this.windGraceFloorY = floorY;
    this.fallPeakY = Math.max(this.fallPeakY, floorY);
  }

  public overlapsPlayer(bx: number, by: number, bz: number, sneak = false, world?: WorldManager, blockId?: number): boolean {
    const h = this.currentHeight(sneak);
    const minX = this.x - this.halfWidth + 0.02;
    const maxX = this.x + this.halfWidth - 0.02;
    const minY = this.y + 0.01;
    const maxY = this.y + h - 0.02;
    const minZ = this.z - this.halfWidth + 0.02;
    const maxZ = this.z + this.halfWidth - 0.02;
    if (world && blockId !== undefined) {
      const b = getBlock(blockId);
      if (!b.solid) return false;
      const boxes = getVoxelCollisionBoxes(world, bx, by, bz, b, this.wearingLeatherBoots && !sneak, this.y);
      for (const sub of boxes) {
        if (
          maxX > bx + sub[0] &&
          minX < bx + sub[3] &&
          maxY > by + sub[1] &&
          minY < by + sub[4] &&
          maxZ > bz + sub[2] &&
          minZ < bz + sub[5]
        ) {
          return true;
        }
      }
      return false;
    }
    return maxX > bx && minX < bx + 1 && maxY > by && minY < by + 1 && maxZ > bz && minZ < bz + 1;
  }

  public collidesAt(
    world: WorldManager,
    px: number,
    py: number,
    pz: number,
    height = this.standHeight,
    preStepFeetY = py
  ): boolean {
    const pMinX = px - this.halfWidth;
    const pMaxX = px + this.halfWidth - 1e-5;
    const pMinY = py;
    const pMaxY = py + height - 1e-5;
    const pMinZ = pz - this.halfWidth;
    const pMaxZ = pz + this.halfWidth - 1e-5;

    const minX = Math.floor(pMinX);
    const maxX = Math.floor(pMaxX);
    // Scan 1 voxel lower so 1.5m-tall Fence collision boxes at y-1 are respected!
    const minY = Math.floor(pMinY - 0.55);
    const maxY = Math.floor(pMaxY);
    const minZ = Math.floor(pMinZ);
    const maxZ = Math.floor(pMaxZ);

    const canStandPowder = this.wearingLeatherBoots && !this.isCrouching;
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const b = getBlock(world.getBlock(x, y, z));
          if (!b.solid) continue;
          const boxes = getVoxelCollisionBoxes(world, x, y, z, b, canStandPowder, preStepFeetY);
          for (const sub of boxes) {
            if (
              pMaxX > x + sub[0] &&
              pMinX < x + sub[3] &&
              pMaxY > y + sub[1] &&
              pMinY < y + sub[4] &&
              pMaxZ > z + sub[2] &&
              pMinZ < z + sub[5]
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  private findFloorSnapY(world: WorldManager, px: number, targetY: number, pz: number, prevY: number): number | null {
    const pMinX = px - this.halfWidth;
    const pMaxX = px + this.halfWidth - 1e-5;
    const pMinZ = pz - this.halfWidth;
    const pMaxZ = pz + this.halfWidth - 1e-5;
    const minX = Math.floor(pMinX);
    const maxX = Math.floor(pMaxX);
    const minZ = Math.floor(pMinZ);
    const maxZ = Math.floor(pMaxZ);
    const minY = Math.floor(targetY - 0.6);
    const maxY = Math.floor(prevY + 0.05);

    const canStandPowder = this.wearingLeatherBoots && !this.isCrouching;
    let bestTop: number | null = null;
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const b = getBlock(world.getBlock(x, y, z));
          if (!b.solid) continue;
          for (const sub of getVoxelCollisionBoxes(world, x, y, z, b, canStandPowder, prevY)) {
            if (pMaxX > x + sub[0] && pMinX < x + sub[3] && pMaxZ > z + sub[2] && pMinZ < z + sub[5]) {
              const topY = y + sub[4];
              if (topY >= targetY - 0.02 && topY <= prevY + 0.08) {
                if (bestTop === null || topY > bestTop) bestTop = topY;
              }
            }
          }
        }
      }
    }
    return bestTop !== null ? bestTop + 0.0001 : null;
  }

  private findStepUpY(world: WorldManager, nx: number, curY: number, nz: number, height: number): number | null {
    const pMinX = nx - this.halfWidth;
    const pMaxX = nx + this.halfWidth - 1e-5;
    const pMinZ = nz - this.halfWidth;
    const pMaxZ = nz + this.halfWidth - 1e-5;
    const minX = Math.floor(pMinX);
    const maxX = Math.floor(pMaxX);
    const minZ = Math.floor(pMinZ);
    const maxZ = Math.floor(pMaxZ);
    const minY = Math.floor(curY - 0.1);
    const maxY = Math.floor(curY + 0.6);

    const canStandPowder = this.wearingLeatherBoots && !this.isCrouching;
    let stepTop: number | null = null;
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const b = getBlock(world.getBlock(x, y, z));
          if (!b.solid) continue;
          for (const sub of getVoxelCollisionBoxes(world, x, y, z, b, canStandPowder, curY)) {
            if (pMaxX > x + sub[0] && pMinX < x + sub[3] && pMaxZ > z + sub[2] && pMinZ < z + sub[5]) {
              const topY = y + sub[4];
              const diff = topY - curY;
              if (diff > 0.001 && diff <= 0.57) {
                if (stepTop === null || topY > stepTop) stepTop = topY;
              }
            }
          }
        }
      }
    }
    if (stepTop === null) return null;
    const candidateY = stepTop + 0.0002;
    if (this.collidesAt(world, this.x, candidateY, this.z, height, candidateY)) return null;
    if (this.collidesAt(world, nx, candidateY, nz, height, candidateY)) return null;
    return candidateY;
  }

  // Full-footprint supporting block query (#15742): prioritizes Slime/Bed bounce, Hay Bale cushioning & Stalagmite spikes!
  private sampleFootprintBlock(world: WorldManager, px: number, py: number, pz: number): BlockDef {
    const cx = Math.floor(px);
    const cz = Math.floor(pz);
    const footY = Math.floor(py - 0.12);
    if (
      world.getBlock(cx, Math.floor(py + 0.08), cz) === BLOCK.POINTED_DRIPSTONE &&
      getBlock(world.getBlock(cx, footY, cz)).solid
    ) {
      return getBlock(BLOCK.POINTED_DRIPSTONE);
    }
    const minX = Math.floor(px - this.halfWidth);
    const maxX = Math.floor(px + this.halfWidth - 1e-5);
    const minZ = Math.floor(pz - this.halfWidth);
    const maxZ = Math.floor(pz + this.halfWidth - 1e-5);

    let best: BlockDef | null = null;
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const b = getBlock(world.getBlock(x, footY, z));
        if (!b.solid) continue;
        if (!best) {
          best = b;
        } else if ((b.bounce || 0) > (best.bounce || 0)) {
          best = b;
        } else if ((b.fallDamageMult ?? 1) < (best.fallDamageMult ?? 1)) {
          best = b;
        } else if (b.id === BLOCK.ICE || b.id === BLOCK.SOUL_SAND) {
          best = b;
        }
      }
    }
    return best || getBlock(world.getBlock(cx, footY, cz));
  }

  // Thin foot-support query so sneak edge-backoff works on full cubes, Slabs & Stairs alike!
  private hasFootSupport(world: WorldManager, px: number, py: number, pz: number): boolean {
    return this.collidesAt(world, px, py - 0.08, pz, 0.06, py);
  }

  private touchesLiquidInFootprint(world: WorldManager, px: number, py: number, pz: number, liquidId: number): boolean {
    const minX = Math.floor(px - this.halfWidth + 0.04);
    const maxX = Math.floor(px + this.halfWidth - 0.04);
    const minZ = Math.floor(pz - this.halfWidth + 0.04);
    const maxZ = Math.floor(pz + this.halfWidth - 0.04);
    const y0 = Math.floor(py + 0.08);
    const y1 = Math.floor(py + 0.9);
    const matchLiquid = (id: number) =>
      liquidId === BLOCK.WATER ? isWaterBlock(id) : liquidId === BLOCK.LAVA ? isLavaBlock(id) : id === liquidId;
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (matchLiquid(world.getBlock(x, y0, z)) || matchLiquid(world.getBlock(x, y1, z))) return true;
      }
    }
    return false;
  }

  private sampleWaterSurfaceY(world: WorldManager, px: number, py: number, pz: number): number | null {
    const minX = Math.floor(px - this.halfWidth + 0.04);
    const maxX = Math.floor(px + this.halfWidth - 0.04);
    const minZ = Math.floor(pz - this.halfWidth + 0.04);
    const maxZ = Math.floor(pz + this.halfWidth - 0.04);
    const yMin = Math.max(1, Math.floor(py - 0.25));
    const yMax = Math.min(126, Math.floor(py + 24));
    let highestWaterY: number | null = null;
    for (let y = yMin; y <= yMax; y++) {
      let hasW = false;
      for (let z = minZ; z <= maxZ && !hasW; z++) {
        for (let x = minX; x <= maxX; x++) {
          if (isWaterBlock(world.getBlock(x, y, z))) {
            hasW = true;
            break;
          }
        }
      }
      if (hasW) {
        highestWaterY = y + 0.90;
      } else if (highestWaterY !== null) {
        break;
      }
    }
    return highestWaterY;
  }

  private isLeafOrCanopyBlock(id: number): boolean {
    return (
      id === BLOCK.OAK_LEAVES ||
      id === BLOCK.BIRCH_LEAVES ||
      id === BLOCK.SPRUCE_LEAVES ||
      id === BLOCK.CHERRY_LEAVES ||
      id === BLOCK.ACACIA_LEAVES
    );
  }

  private isSafeFloorBlock(id: number): boolean {
    if (id <= 0) return false;
    if (isLavaBlock(id) || id === BLOCK.CACTUS || id === BLOCK.MAGMA_BLOCK || id === BLOCK.CAMPFIRE || id === BLOCK.SWEET_BERRY_BUSH) {
      return false;
    }
    if (isWaterBlock(id)) return true;
    const b = getBlock(id);
    return b.solid && !this.isLeafOrCanopyBlock(id);
  }

  /**
   * Ironclad Anti-Stuck Teleport Solver:
   * Ensures target chunks are synchronously generated, resolves fractional centering,
   * and guarantees full 3D player AABB clearance + safe non-hazard footing.
   */
  public teleportSafelyTo(
    world: WorldManager,
    rawX: number,
    rawY: number | null | undefined,
    rawZ: number
  ): { x: number; y: number; z: number } {
    const baseX = Math.abs(rawX - Math.round(rawX)) < 0.04 ? Math.floor(rawX) + 0.5 : rawX;
    const baseZ = Math.abs(rawZ - Math.round(rawZ)) < 0.04 ? Math.floor(rawZ) + 0.5 : rawZ;
    world.ensureAreaSyncAround(baseX, baseZ);

    const h = this.standHeight;
    const radialOffsets: Array<[number, number]> = [
      [0, 0],
      [0.55, 0], [-0.55, 0], [0, 0.55], [0, -0.55],
      [1.0, 0], [-1.0, 0], [0, 1.0], [0, -1.0],
      [0.9, 0.9], [-0.9, 0.9], [0.9, -0.9], [-0.9, -0.9],
      [1.8, 0], [-1.8, 0], [0, 1.8], [0, -1.8],
      [1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6],
      [2.8, 0], [-2.8, 0], [0, 2.8], [0, -2.8],
      [3.8, 0], [-3.8, 0], [0, 3.8], [0, -3.8]
    ];

    // 1. If a specific Y was requested (indoor dungeon, platform, Ender Pearl, etc.), search near rawY first
    if (typeof rawY === 'number' && Number.isFinite(rawY)) {
      const yOffsets = [0, 0.1, 0.55, 1.05, -0.5, -1.0, 1.6, 2.1, -1.8, 3.0, 4.0];
      for (const [ox, oz] of radialOffsets) {
        const cx = baseX + ox;
        const cz = baseZ + oz;
        if (!world.isChunkLoadedAt(cx, cz)) world.ensureAreaSyncAround(cx, cz);
        for (const oy of yOffsets) {
          const cy = Math.max(2, Math.min(122, rawY + oy));
          if (!this.collidesAt(world, cx, cy, cz, h, cy)) {
            const belowId = world.getBlock(Math.floor(cx), Math.floor(cy - 0.15), Math.floor(cz));
            const atFeetId = world.getBlock(Math.floor(cx), Math.floor(cy + 0.1), Math.floor(cz));
            if (this.isSafeFloorBlock(belowId) || isWaterBlock(atFeetId) || this.hasFootSupport(world, cx, cy, cz)) {
              const snapped = this.findFloorSnapY(world, cx, cy - 0.12, cz, cy + 0.25);
              const finalY = snapped !== null && !this.collidesAt(world, cx, snapped, cz, h, snapped) ? snapped : cy;
              this.x = cx;
              this.y = finalY;
              this.z = cz;
              this.vx = 0;
              this.vy = 0;
              this.vz = 0;
              this.inWater = isWaterBlock(atFeetId) || isWaterBlock(belowId);
              this.resetFallDistance();
              return { x: cx, y: finalY, z: cz };
            }
          }
        }
      }
    }

    // 2. Outdoor / Surface Safe Solver (skips tree canopies, roofs with no headroom, lava & cacti!)
    for (const [ox, oz] of radialOffsets) {
      const cx = Math.floor(baseX + ox) + 0.5;
      const cz = Math.floor(baseZ + oz) + 0.5;
      if (!world.isChunkLoadedAt(cx, cz)) world.ensureAreaSyncAround(cx, cz);
      const scanTop = world.dimension === 'nether' ? 58 : 118;
      for (let y = scanTop; y >= 4; y--) {
        const floorId = world.getBlock(Math.floor(cx), y, Math.floor(cz));
        if (floorId === BLOCK.AIR || this.isLeafOrCanopyBlock(floorId)) continue;
        if (isLavaBlock(floorId) || floorId === BLOCK.CACTUS || floorId === BLOCK.MAGMA_BLOCK) break;
        if (isWaterBlock(floorId)) {
          const waterStandY = y + 0.35;
          if (!this.collidesAt(world, cx, waterStandY, cz, h, waterStandY)) {
            this.x = cx;
            this.y = waterStandY;
            this.z = cz;
            this.vx = 0;
            this.vy = 0;
            this.vz = 0;
            this.inWater = true;
            this.resetFallDistance();
            return { x: cx, y: waterStandY, z: cz };
          }
          break;
        }
        const b = getBlock(floorId);
        if (!b.solid) continue;
        const standY = y + 1.02;
        if (!this.collidesAt(world, cx, standY, cz, h, standY)) {
          this.x = cx;
          this.y = standY;
          this.z = cz;
          this.vx = 0;
          this.vy = 0;
          this.vz = 0;
          this.onGround = true;
          this.resetFallDistance();
          return { x: cx, y: standY, z: cz };
        }
      }
    }

    // 3. Ultimate fallback: guaranteed open sky column above surface
    const fallbackY = Math.max(50, world.getSafeSurfaceY(baseX, baseZ) + 0.1);
    this.x = baseX;
    this.y = fallbackY;
    this.z = baseZ;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.resetFallDistance();
    return { x: baseX, y: fallbackY, z: baseZ };
  }

  /**
   * Continuous Depenetration Safety Net:
   * Immediately frees the player if a chunk load, structure stamp, block placement, or mount dismount ever overlaps their AABB.
   */
  public depenetrateIfStuck(world: WorldManager, height: number): void {
    if (!this.collidesAt(world, this.x, this.y, this.z, height, this.y)) return;

    // Small local nudges first (e.g. grazed edge of door/pillar/fence)
    const nudges = [0.12, 0.26, 0.45, 0.72, 1.05];
    const dirs: Array<[number, number, number]> = [
      [0, 1, 0],
      [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
      [0.7, 0.5, 0], [-0.7, 0.5, 0], [0, 0.5, 0.7], [0, 0.5, -0.7],
      [0.7, 0, 0.7], [-0.7, 0, 0.7], [0.7, 0, -0.7], [-0.7, 0, -0.7]
    ];
    for (const r of nudges) {
      for (const [dx, dy, dz] of dirs) {
        const nx = this.x + dx * r;
        const ny = this.y + dy * r;
        const nz = this.z + dz * r;
        if (ny > 1 && !this.collidesAt(world, nx, ny, nz, height, ny)) {
          this.x = nx;
          this.y = ny;
          this.z = nz;
          if (dy > 0) this.vy = Math.max(0, this.vy);
          return;
        }
      }
    }

    // Vertical upward elevator escape if buried deeper inside terrain/building
    for (let up = 1; up <= 18; up++) {
      const ny = this.y + up;
      if (ny < 124 && !this.collidesAt(world, this.x, ny, this.z, height, ny)) {
        this.y = ny + 0.05;
        this.vy = 0;
        this.resetFallDistance();
        return;
      }
    }
  }

  public update(dt: number, input: InputState, world: WorldManager) {
    const clampedDt = Math.min(0.05, dt);

    // #15727 & #15726 Fix: Never simulate gravity if player's chunk isn't loaded yet
    if (!world.isChunkLoadedAt(this.x, this.z)) {
      this.vy = 0;
      this.fallPeakY = this.y;
      return;
    }

    // P1 #12 Fix: Low-ceiling force-crouch! Stay crouched if standing up (1.8m) would clip into a 1.5..1.8m ceiling
    if (this.flying) {
      this.isCrouching = false;
    } else if (input.sneak) {
      this.isCrouching = true;
    } else if (this.isCrouching) {
      if (!this.collidesAt(world, this.x, this.y, this.z, this.standHeight)) {
        this.isCrouching = false;
      }
    }

    const activeHeight = this.slimeMode && !this.flying ? this.slimeHeight : this.isCrouching ? this.crouchHeight : this.standHeight;
    this.depenetrateIfStuck(world, activeHeight);

    const bx = Math.floor(this.x);
    const bz = Math.floor(this.z);
    const feetId = world.getBlock(bx, Math.floor(this.y + 0.25), bz);
    const waistId = world.getBlock(bx, Math.floor(this.y + 0.9), bz);
    const eyeSampleY = this.y + this.eyeHeight() - 0.05;
    const eyeCellY = Math.floor(eyeSampleY);
    const eyeId = world.getBlock(bx, eyeCellY, bz);

    this.inWater = this.touchesLiquidInFootprint(world, this.x, this.y, this.z, BLOCK.WATER);
    this.inLava = this.touchesLiquidInFootprint(world, this.x, this.y, this.z, BLOCK.LAVA);
    this.inPowderSnow = this.touchesLiquidInFootprint(world, this.x, this.y, this.z, BLOCK.POWDER_SNOW);
    this.headUnderwater =
      isWaterBlock(eyeId) &&
      (isWaterBlock(world.getBlock(bx, eyeCellY + 1, bz)) || eyeSampleY < eyeCellY + 0.88);
    this.onLadder = getBlock(feetId).climbable === true || getBlock(waistId).climbable === true;

    // Naruto Chakra Water-Walking: walk & sprint cleanly on water surface unless holding Sneak to dive
    let chakraStandingOnWater = false;
    let chakraWaterTopY = 0;
    if (this.waterWalkEnabled && !this.flying && !input.sneak && !isWaterBlock(waistId) && !isWaterBlock(eyeId)) {
      if (this.inWater || this.touchesLiquidInFootprint(world, this.x, this.y - 0.16, this.z, BLOCK.WATER)) {
        const surf = this.sampleWaterSurfaceY(world, this.x, this.y - 0.2, this.z);
        if (surf !== null) {
          const topY = Math.ceil(surf);
          if (this.y >= topY - 0.42 && !this.collidesAt(world, this.x, topY, this.z, activeHeight, topY)) {
            this.y = Math.max(this.y, topY);
            if (this.vy < 0) this.vy = 0;
            this.onGround = true;
            this.inWater = false;
            this.isSwimming = false;
            this.fallPeakY = this.y;
            chakraStandingOnWater = true;
            chakraWaterTopY = topY;
          }
        }
      }
    }

    if (this.inPowderSnow && !this.flying) {
      this.fallPeakY = this.y;
      this.windGraceFloorY = null;
      if (this.inLava) {
        this.freezeProgress = 0;
      } else {
        this.freezeProgress = Math.min(7, this.freezeProgress + clampedDt);
        if (this.freezeProgress >= 7 && !this.wearingLeatherBoots) {
          this.freezeDamageTick -= clampedDt;
          if (this.freezeDamageTick <= 0) {
            this.freezeDamageTick = 1.5;
            this.onContactHazard?.(1, 'Donma (Toz Kar)');
          }
        }
      }
    } else {
      this.freezeProgress = Math.max(0, this.freezeProgress - clampedDt * 2.5);
      this.freezeDamageTick = 0;
    }

    // Check Portal Travel (`NETHER_PORTAL` / `END_PORTAL`)
    const feetDef = getBlock(feetId);
    const waistDef = getBlock(waistId);
    const portalKind = feetDef.portal || waistDef.portal;
    if (portalKind) {
      this.portalDwell += clampedDt;
      if (this.portalDwell >= 1.15) {
        this.portalDwell = -2.0;
        this.onPortalTrigger?.(portalKind);
        return;
      }
    } else if (this.portalDwell > 0) {
      this.portalDwell = Math.max(0, this.portalDwell - clampedDt * 2);
    } else if (this.portalDwell < 0) {
      this.portalDwell = Math.min(0, this.portalDwell + clampedDt);
    }

    // Contact Hazards (Lava, Magma Block, Lit Campfire, Sweet Berry Bush & Cactus)
    const inBerryBush = world.getBlock(bx, Math.floor(this.y + 0.2), bz) === BLOCK.SWEET_BERRY_BUSH;
    this.hazardTick = Math.max(0, this.hazardTick - clampedDt);
    if (this.hazardTick <= 0 && !this.flying) {
      const footHazId = this.onGround ? this.sampleFootprintBlock(world, this.x, this.y, this.z).id : 0;
      if (this.inLava || feetId === BLOCK.CAULDRON_LAVA) {
        this.hazardTick = 0.5;
        this.onContactHazard?.(4, 'Lav');
      } else if (!this.isCrouching && footHazId === BLOCK.MAGMA_BLOCK) {
        this.hazardTick = 0.5;
        this.onContactHazard?.(1, 'Magma Bloğu');
      } else if (!this.isCrouching && footHazId === BLOCK.CAMPFIRE) {
        this.hazardTick = 0.5;
        this.onContactHazard?.(1, 'Kamp Ateşi');
      } else if (inBerryBush && Math.hypot(this.vx, this.vz) > 0.25) {
        this.hazardTick = 0.5;
        this.onContactHazard?.(1, 'Orman Meyvesi Çalısı');
      } else {
        const touchCactus =
          world.getBlock(Math.floor(this.x + 0.34), Math.floor(this.y + 0.5), bz) === BLOCK.CACTUS ||
          world.getBlock(Math.floor(this.x - 0.34), Math.floor(this.y + 0.5), bz) === BLOCK.CACTUS ||
          world.getBlock(bx, Math.floor(this.y + 0.5), Math.floor(this.z + 0.34)) === BLOCK.CACTUS ||
          world.getBlock(bx, Math.floor(this.y + 0.5), Math.floor(this.z - 0.34)) === BLOCK.CACTUS;
        if (touchCactus) {
          this.hazardTick = 0.5;
          this.onContactHazard?.(1, 'Kaktüs');
        }
      }
    }

    // Input wish vector (supports camera-relative moveYaw for Front Orbit / F5 views)
    const moveYaw = input.moveYaw !== undefined ? input.moveYaw : this.yaw;
    const sinY = Math.sin(moveYaw);
    const cosY = Math.cos(moveYaw);
    const fwdX = -sinY;
    const fwdZ = -cosY;
    const rightX = cosY;
    const rightZ = -sinY;

    let moveF = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    let moveS = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if ((input.moveZ !== undefined || input.moveX !== undefined) && (Math.abs(input.moveZ || 0) > 0.04 || Math.abs(input.moveX || 0) > 0.04)) {
      moveF = -(input.moveZ || 0);
      moveS = input.moveX || 0;
    }
    const len = Math.hypot(moveF, moveS);
    if (len > 1) {
      moveF /= len;
      moveS /= len;
    }

    const wishX = fwdX * moveF + rightX * moveS;
    const wishZ = fwdZ * moveF + rightZ * moveS;

    if (this.flying) {
      this.isSwimming = false;
      const flySpeed = input.sprint ? 16.5 : 9.5;
      const lerpK = Math.min(1, clampedDt * 12);
      this.vx += (wishX * flySpeed - this.vx) * lerpK;
      this.vz += (wishZ * flySpeed - this.vz) * lerpK;
      this.vy += (((input.jump ? 1 : 0) - (input.sneak ? 1 : 0)) * flySpeed * 0.82 - this.vy) * lerpK;

      this.moveWithCollisions(world, this.vx * clampedDt, this.vy * clampedDt, this.vz * clampedDt, false, this.standHeight);
      this.fallPeakY = this.y;
      this.windGraceFloorY = null;
      return;
    }

    if (this.inWater || this.inLava) {
      this.fallPeakY = this.y;
      this.windGraceFloorY = null;
      this.swimWaveClock += clampedDt * 2.35;

      const canSwimSprint = input.sprint && !input.usingItem && len > 0.14;
      const swimSpeed = (this.inLava ? 2.2 : canSwimSprint ? 5.65 : 4.15) * (input.usingItem ? 0.55 : 1.0) * this.rpgSpeedMult * this.swimSpeedMult;
      const hAccel = Math.min(1, clampedDt * (canSwimSprint ? 8.5 : 6.8));
      this.vx += (wishX * swimSpeed - this.vx) * hAccel;
      this.vz += (wishZ * swimSpeed - this.vz) * hAccel;

      if (this.inLava && !this.inWater) {
        this.isSwimming = false;
        this.vy -= 2.4 * clampedDt;
        if (input.jump) this.vy = 3.5;
        else if (input.sneak) this.vy = -2.6;
        this.vy = Math.max(-3.2, Math.min(4.2, this.vy));
      } else {
        // Realistic Archimedes Buoyancy + Update Aquatic 3D Freestyle Swimming:
        // Never sink passively to the seabed! Float comfortably with head above water unless diving (Shift) or pitching down while sprint-swimming.
        const surfY = this.sampleWaterSurfaceY(world, this.x, this.y, this.z);
        const floatSubmerge = this.slimeMode ? 0.36 : 0.92;
        const waveBob = Math.sin(this.swimWaveClock) * 0.04;
        const eqFloatY = surfY !== null ? surfY - floatSubmerge + waveBob : this.y;
        const depthBelowEq = eqFloatY - this.y;

        this.isSwimming = len > 0.14 && (canSwimSprint || this.headUnderwater || moveF > 0.15);

        // Cushion high-velocity splash entry rapidly
        if (this.vy < -2.6 && !input.sneak) {
          this.vy *= Math.max(0.28, 1 - clampedDt * 9.5);
        }

        let targetVy: number;
        if (input.sneak) {
          // Intentional dive toward seabed / underwater caves
          targetVy = -3.65;
        } else if (input.jump) {
          // Active upward kick / surface tread
          if (depthBelowEq > 0.22) {
            targetVy = 4.45;
          } else {
            targetVy = Math.max(0.35, Math.min(2.6, (eqFloatY + 0.26 - this.y) * 5.2));
          }
        } else if (canSwimSprint && moveF > 0.2 && this.pitch < -0.24) {
          // 3D pitch-guided freestyle dive when looking downward while sprint-swimming
          targetVy = Math.sin(this.pitch) * swimSpeed * 0.88;
        } else if (canSwimSprint && moveF > 0.2 && this.pitch > 0.24 && depthBelowEq > 0.18) {
          // 3D pitch-guided upward swim toward surface
          targetVy = Math.min(4.6, Math.sin(this.pitch) * swimSpeed * 0.95 + 1.4);
        } else {
          // Natural Archimedes surface buoyancy: rise smoothly to surface & tread water gently!
          if (depthBelowEq > 0.16) {
            targetVy = Math.min(3.35, 1.05 + depthBelowEq * 2.85);
          } else if (depthBelowEq < -0.06) {
            targetVy = Math.max(-2.4, depthBelowEq * 4.6);
          } else {
            targetVy = depthBelowEq * 5.2;
          }
        }

        const vLerp = Math.min(1, clampedDt * (input.sneak || input.jump ? 9.5 : 7.2));
        this.vy += (targetVy - this.vy) * vLerp;
        this.vy = Math.max(-4.5, Math.min(5.4, this.vy));
      }

      const hitWall = this.moveWithCollisions(world, this.vx * clampedDt, this.vy * clampedDt, this.vz * clampedDt, false, activeHeight);
      this.headUnderwater = isWaterBlock(world.getBlock(Math.floor(this.x), Math.floor(this.y + this.eyeHeight() - 0.05), Math.floor(this.z)));
      if (hitWall && (input.jump || len > 0.2) && !this.headUnderwater) {
        if (!this.collidesAt(world, this.x + wishX * 0.38, this.y + 1.08, this.z + wishZ * 0.38, activeHeight)) {
          this.vy = 7.15;
        }
      }
      return;
    }

    this.isSwimming = false;

    if (this.onLadder) {
      this.fallPeakY = this.y;
      this.windGraceFloorY = null;
      this.vx += (wishX * 3.1 - this.vx) * Math.min(1, clampedDt * 14);
      this.vz += (wishZ * 3.1 - this.vz) * Math.min(1, clampedDt * 14);
      if (input.jump || len > 0.2) this.vy = 4.2;
      else if (input.sneak) this.vy = 0;
      else this.vy = -2.6;
      this.moveWithCollisions(world, this.vx * clampedDt, this.vy * clampedDt, this.vz * clampedDt, false, activeHeight);
      return;
    }

    const underBlock = this.sampleFootprintBlock(world, this.x, this.y, this.z);
    const isIce = underBlock.id === BLOCK.ICE && this.onGround;
    const isSoulSand = underBlock.id === BLOCK.SOUL_SAND && this.onGround;
    const isSlime = underBlock.id === BLOCK.SLIME_BLOCK && this.onGround && !this.isCrouching;

    let maxSpeed = 4.35 * this.rpgSpeedMult;
    if (this.isCrouching) maxSpeed = 1.95 * this.rpgSpeedMult;
    else if (input.sprint && !input.usingItem && moveF > 0) maxSpeed = 5.75 * this.rpgSpeedMult;
    if (input.usingItem) maxSpeed *= 0.28;
    if (isSoulSand) maxSpeed *= 0.55;
    if (isSlime) maxSpeed *= 0.72;
    if (inBerryBush) maxSpeed *= 0.58;
    if (this.inPowderSnow) maxSpeed *= 0.42;

    const accel = this.onGround ? (isIce ? 2.6 : 18.0) : 5.5;
    this.vx += (wishX * maxSpeed - this.vx) * Math.min(1, clampedDt * accel);
    this.vz += (wishZ * maxSpeed - this.vz) * Math.min(1, clampedDt * accel);

    if (this.onGround) {
      this.fallPeakY = this.y;
    } else if (this.y > this.fallPeakY) {
      this.fallPeakY = this.y;
    }

    this.vy -= 27.5 * clampedDt;
    if (this.inPowderSnow) {
      if (input.jump && !this.isCrouching) {
        this.vy = this.wearingLeatherBoots ? 2.8 : 2.15;
      } else if (this.vy < -1.55) {
        this.vy = -1.55;
      }
    }
    if (this.vy < -45) this.vy = -45;

    if (input.jump && this.onGround) {
      this.vy = 8.75 + this.jumpBonus;
      if (input.sprint && !input.usingItem && moveF > 0 && !this.isCrouching) {
        this.vx += fwdX * 1.15;
        this.vz += fwdZ * 1.15;
      }
      this.onGround = false;
      this.fallPeakY = this.y;
    }

    const prevX = this.x;
    const prevZ = this.z;
    const preLandingVy = this.vy;

    this.moveWithCollisions(
      world,
      this.vx * clampedDt,
      this.vy * clampedDt,
      this.vz * clampedDt,
      this.isCrouching && this.onGround,
      activeHeight,
      this.isCrouching,
      preLandingVy
    );

    if (chakraStandingOnWater && !input.sneak && this.y < chakraWaterTopY && this.y >= chakraWaterTopY - 0.55) {
      if (!this.collidesAt(world, this.x, chakraWaterTopY, this.z, activeHeight, chakraWaterTopY)) {
        this.y = chakraWaterTopY;
        if (this.vy < 0) this.vy = 0;
        this.onGround = true;
        this.inWater = false;
        this.fallPeakY = this.y;
      }
    }

    if (this.collidesAt(world, this.x, this.y, this.z, activeHeight)) {
      if (!this.collidesAt(world, this.x, this.y + 0.08, this.z, activeHeight)) {
        this.y += 0.08;
      } else {
        this.depenetrateIfStuck(world, activeHeight);
      }
    }

    if (this.y < -16) {
      if (this.flying) {
        this.teleportSafelyTo(world, 0.5, undefined, 7.5);
      } else {
        this.onContactHazard?.(999, 'Boşluk');
      }
    }

    if (this.onGround && !this.isCrouching) {
      const moved = Math.hypot(this.x - prevX, this.z - prevZ);
      this.stepAccumulator += moved;
      if (this.stepAccumulator > 1.85) {
        this.stepAccumulator = 0;
        this.onStep?.(underBlock.material || 'grass');
      }
    }
  }

  private moveWithCollisions(
    world: WorldManager,
    dx: number,
    dy: number,
    dz: number,
    edgeBackoff: boolean,
    height: number,
    sneaking = false,
    preLandingVy = 0
  ): boolean {
    if (edgeBackoff) {
      const eps = 0.05;
      while (dx !== 0 && !this.hasFootSupport(world, this.x + dx, this.y, this.z)) {
        if (Math.abs(dx) <= eps) { dx = 0; this.vx = 0; }
        else dx += dx > 0 ? -eps : eps;
      }
      while (dz !== 0 && !this.hasFootSupport(world, this.x, this.y, this.z + dz)) {
        if (Math.abs(dz) <= eps) { dz = 0; this.vz = 0; }
        else dz += dz > 0 ? -eps : eps;
      }
      while (dx !== 0 && dz !== 0 && !this.hasFootSupport(world, this.x + dx, this.y, this.z + dz)) {
        if (Math.abs(dx) <= eps) { dx = 0; this.vx = 0; } else dx += dx > 0 ? -eps : eps;
        if (Math.abs(dz) <= eps) { dz = 0; this.vz = 0; } else dz += dz > 0 ? -eps : eps;
      }
    }

    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.22));
    let sx = dx / steps;
    let sy = dy / steps;
    let sz = dz / steps;

    const wasOnGround = this.onGround;
    this.onGround = false;
    let hitHorizontal = false;

    for (let s = 0; s < steps; s++) {
      if (sy !== 0) {
        // P0 #5 Fix: Detect shallow water entry mid-substep BEFORE floor collision cancels velocity!
        if (sy < 0 && this.touchesLiquidInFootprint(world, this.x, this.y + sy * 0.5, this.z, BLOCK.WATER)) {
          this.fallPeakY = this.y;
          this.inWater = true;
        }

        if (!this.collidesAt(world, this.x, this.y + sy, this.z, height, this.y)) {
          this.y += sy;
          if (sy < 0 && this.touchesLiquidInFootprint(world, this.x, this.y, this.z, BLOCK.WATER)) {
            this.fallPeakY = this.y;
            this.inWater = true;
          }
        } else {
          if (sy < 0) {
            // P0 #4 + Wave 4 Fix: Snap cleanly to exact top surface of supporting cube / Slab / Stair / Bed / Dirt Path!
            const snappedY = this.findFloorSnapY(world, this.x, this.y + sy, this.z, this.y);
            if (snappedY !== null && !this.collidesAt(world, this.x, snappedY, this.z, height, snappedY)) {
              this.y = snappedY;
            }
            if (this.touchesLiquidInFootprint(world, this.x, this.y, this.z, BLOCK.WATER)) {
              this.fallPeakY = this.y;
              this.inWater = true;
            }

            const landedBlock = this.sampleFootprintBlock(world, this.x, this.y, this.z);
            const effectivePeakY =
              this.windGraceFloorY !== null ? Math.min(this.fallPeakY, this.windGraceFloorY) : this.fallPeakY;
            const fallDist = Math.max(0, effectivePeakY - this.y);
            this.fallPeakY = this.y;
            this.windGraceFloorY = null;

            // #15742 Block.fallOn: Slime Block & Bed bounce when not sneaking
            if (!sneaking && landedBlock.bounce && preLandingVy < -3.2) {
              this.vy = Math.min(18, Math.abs(preLandingVy) * landedBlock.bounce);
              this.onGround = false;
              sy = 0;
              this.onLand?.(0, landedBlock);
            } else {
              this.onGround = true;
              this.vy = 0;
              sy = 0;
              if (!wasOnGround && fallDist > 3.2) {
                this.onLand?.(fallDist, landedBlock);
              }
            }
          } else {
            this.vy = 0;
            sy = 0;
          }
        }
      }
      if (sx !== 0) {
        if (!this.collidesAt(world, this.x + sx, this.y, this.z, height, this.y)) {
          this.x += sx;
        } else {
          const stepY = (this.onGround || wasOnGround) && !this.flying
            ? this.findStepUpY(world, this.x + sx, this.y, this.z, height)
            : null;
          if (stepY !== null) {
            this.y = stepY;
            this.x += sx;
            this.onGround = true;
          } else {
            this.vx = 0;
            sx = 0;
            hitHorizontal = true;
          }
        }
      }
      if (sz !== 0) {
        if (!this.collidesAt(world, this.x, this.y, this.z + sz, height, this.y)) {
          this.z += sz;
        } else {
          const stepY = (this.onGround || wasOnGround) && !this.flying
            ? this.findStepUpY(world, this.x, this.y, this.z + sz, height)
            : null;
          if (stepY !== null) {
            this.y = stepY;
            this.z += sz;
            this.onGround = true;
          } else {
            this.vz = 0;
            sz = 0;
            hitHorizontal = true;
          }
        }
      }
    }

    return hitHorizontal;
  }
}

function intersectSubBoxes(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  bx: number, by: number, bz: number,
  boxes: SubAABB[],
  maxDist: number
): { dist: number; nx: number; ny: number; nz: number } | null {
  let bestT = maxDist + 0.001;
  let bestNx = 0, bestNy = 0, bestNz = 0;
  let found = false;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const minX = bx + b[0], maxX = bx + b[3];
    const minY = by + b[1], maxY = by + Math.min(1, b[4]);
    const minZ = bz + b[2], maxZ = bz + b[5];

    let tmin = -Infinity;
    let tmax = Infinity;
    let hitNx = 0, hitNy = 0, hitNz = 0;

    if (Math.abs(dx) < 1e-8) {
      if (ox < minX || ox > maxX) continue;
    } else {
      const inv = 1 / dx;
      let t1 = (minX - ox) * inv;
      let t2 = (maxX - ox) * inv;
      let n = -Math.sign(dx);
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; n = -n; }
      if (t1 > tmin) { tmin = t1; hitNx = n; hitNy = 0; hitNz = 0; }
      if (t2 < tmax) tmax = t2;
    }

    if (Math.abs(dy) < 1e-8) {
      if (oy < minY || oy > maxY) continue;
    } else {
      const inv = 1 / dy;
      let t1 = (minY - oy) * inv;
      let t2 = (maxY - oy) * inv;
      let n = -Math.sign(dy);
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; n = -n; }
      if (t1 > tmin) { tmin = t1; hitNx = 0; hitNy = n; hitNz = 0; }
      if (t2 < tmax) tmax = t2;
    }

    if (Math.abs(dz) < 1e-8) {
      if (oz < minZ || oz > maxZ) continue;
    } else {
      const inv = 1 / dz;
      let t1 = (minZ - oz) * inv;
      let t2 = (maxZ - oz) * inv;
      let n = -Math.sign(dz);
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; n = -n; }
      if (t1 > tmin) { tmin = t1; hitNx = 0; hitNy = 0; hitNz = n; }
      if (t2 < tmax) tmax = t2;
    }

    if (tmax >= Math.max(0, tmin) && tmin < bestT) {
      const tHit = Math.max(0, tmin);
      if (tHit <= maxDist) {
        bestT = tHit;
        bestNx = hitNx; bestNy = hitNy; bestNz = hitNz;
        found = true;
      }
    }
  }

  return found ? { dist: bestT, nx: bestNx, ny: bestNy, nz: bestNz } : null;
}

// Fast Amanatides-Woo 3D Voxel DDA Raycast with exact sub-voxel AABB hit testing (`solidOnly` ignores flora/torches for F5!)
export function raycastVoxel(
  world: WorldManager,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist = 5.6,
  includeLiquids = false,
  solidOnly = false
): RaycastHit | null {
  let x = Math.floor(ox);
  let y = Math.floor(oy);
  let z = Math.floor(oz);

  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;

  let tMaxX = stepX > 0 ? (x + 1 - ox) * tDeltaX : stepX < 0 ? (ox - x) * tDeltaX : Infinity;
  let tMaxY = stepY > 0 ? (y + 1 - oy) * tDeltaY : stepY < 0 ? (oy - y) * tDeltaY : Infinity;
  let tMaxZ = stepZ > 0 ? (z + 1 - oz) * tDeltaZ : stepZ < 0 ? (oz - z) * tDeltaZ : Infinity;

  let nx = 0, ny = 0, nz = 0;
  let dist = 0;

  const maxSteps = Math.min(600, Math.max(64, Math.ceil(maxDist * 2.2) + 8));
  for (let i = 0; i < maxSteps; i++) {
    const id = world.getBlock(x, y, z);
    if (id !== BLOCK.AIR) {
      const b = getBlock(id);
      const eligible = solidOnly
        ? b.solid
        : (includeLiquids || !b.liquid);
      if (eligible) {
        const isSubShape =
          (b.shape && b.shape !== 'cube') ||
          b.cross ||
          b.flatWire ||
          id === BLOCK.CHEST ||
          id === BLOCK.BED_BLOCK ||
          id === BLOCK.DIRT_PATH ||
          id === BLOCK.FARMLAND;
        if (isSubShape) {
          const boxes = getVoxelCollisionBoxes(world, x, y, z, b, true, 999, true);
          const subHit = intersectSubBoxes(ox, oy, oz, dx, dy, dz, x, y, z, boxes, maxDist);
          if (subHit) {
            return { bx: x, by: y, bz: z, nx: subHit.nx, ny: subHit.ny, nz: subHit.nz, blockId: id, dist: subHit.dist };
          }
        } else {
          return { bx: x, by: y, bz: z, nx, ny, nz, blockId: id, dist };
        }
      }
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX;
        dist = tMaxX;
        tMaxX += tDeltaX;
        nx = -stepX; ny = 0; nz = 0;
      } else {
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        y += stepY;
        dist = tMaxY;
        tMaxY += tDeltaY;
        nx = 0; ny = -stepY; nz = 0;
      } else {
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    }

    if (dist > maxDist) break;
  }

  return null;
}
