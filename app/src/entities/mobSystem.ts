// Complete Horizon 26.3 Mob Ecosystem, AI, Combat, Pets, Rideable Mounts, Bartering & Ender Dragon Boss
// Covers Overworld (Village, Passive, Tameable, Mounts, Hostiles), Nether (Piglin, Blaze, Ghast) & End (Enderman, Ender Dragon)

import * as THREE from 'three';
import { BLOCK, BlockDef, getBlock, isLavaBlock, isWaterBlock } from '../world/blocks';
import { ITEM, ItemStack } from '../items/catalog';
import { DimensionId, sampleColumnInfo } from '../world/terrainGen';
import { WorldManager } from '../world/worldManager';
import { ActiveProjectile, ProjectileManager } from './projectiles';
import { SoundEngine } from '../audio/soundEngine';
import { buildCrossbow3D, buildHeldItem3D, orientThirdPersonHeldMesh } from './avatars';

const END_CRYSTAL_COORDS: Array<[number, number, number]> = Array.from({ length: 10 }, (_, i) => {
  const ang = (i / 10) * Math.PI * 2;
  const px = Math.round(Math.cos(ang) * 25);
  const pz = Math.round(Math.sin(ang) * 25);
  const cy = 64 + (i % 4) * 4 + 2;
  return [px, cy, pz];
});

const sharedMobBoxGeos = new Map<string, THREE.BoxGeometry>();
function getSharedMobBoxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  let geo = sharedMobBoxGeos.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    geo.userData.shared = true;
    sharedMobBoxGeos.set(key, geo);
  }
  return geo;
}

const sharedMobTextures = new Map<string, THREE.CanvasTexture>();
function getSharedMobTex(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  let tex = sharedMobTextures.get(key);
  if (tex) return tex;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.shared = true;
  tex.needsUpdate = true;
  sharedMobTextures.set(key, tex);
  return tex;
}

function getSharedMobGrainTex(): THREE.CanvasTexture | null {
  return getSharedMobTex('grain8', 8, 8, (ctx) => {
    const shades = ['#f8f9fb', '#ffffff', '#eceef3', '#f3f5f8'];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const idx = ((x * 5 + y * 11 + ((x ^ y) * 3)) & 3);
        ctx.fillStyle = shades[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

function disposeMobGroup(group: THREE.Group) {
  const mats = new Set<THREE.Material>();
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry && !obj.geometry.userData?.shared) {
        obj.geometry.dispose();
      }
      if (Array.isArray(obj.material)) obj.material.forEach((m) => mats.add(m));
      else if (obj.material) mats.add(obj.material);
    } else if (obj instanceof THREE.Sprite && obj.material) {
      if (obj.material.map) obj.material.map.dispose();
      mats.add(obj.material);
    }
  });
  mats.forEach((m) => m.dispose());
}

function makeAllyNametagSprite(text: string): THREE.Sprite | null {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 56;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = 'rgba(10, 16, 32, 0.82)';
  ctx.beginPath();
  ctx.roundRect(12, 8, 232, 40, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.88)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = 'bold 21px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fde047';
  ctx.fillText(`★ ${text.slice(0, 18)}`, 128, 29);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(1.65, 0.36, 1);
  sp.renderOrder = 40;
  return sp;
}

function hasSolidRoofAbove(world: WorldManager, x: number, y: number, z: number): boolean {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const startY = Math.floor(y + 1.8);
  const maxY = Math.min(126, startY + 22);
  for (let cy = startY; cy <= maxY; cy++) {
    const id = world.getBlock(ix, cy, iz);
    if (id !== BLOCK.AIR && (getBlock(id).solid || isWaterBlock(id))) return true;
  }
  return false;
}

function getSupportTopOffset(b: BlockDef): number {
  if (b.shape === 'slab') return 0.5;
  if (b.shape === 'trapdoor_closed') return 0.1875;
  if (b.shape === 'campfire') return 0.4375;
  if (b.shape === 'enchanting_table') return 0.75;
  if (b.id === BLOCK.BED_BLOCK) return 0.5625;
  if (b.id === BLOCK.DIRT_PATH || b.id === BLOCK.FARMLAND) return 0.9375;
  return 1.0;
}

export type MobSpecies =
  | 'villager'
  | 'wandering_trader'
  | 'iron_golem'
  | 'copper_golem'
  | 'snow_golem'
  | 'allay'
  | 'happy_ghast'
  | 'nautilus'
  | 'cat'
  | 'frog'
  | 'goat'
  | 'axolotl'
  | 'sheep'
  | 'cow'
  | 'pig'
  | 'chicken'
  | 'horse'
  | 'camel'
  | 'strider'
  | 'wolf'
  | 'fox'
  | 'bee'
  | 'polar_bear'
  | 'zombie'
  | 'husk'
  | 'skeleton'
  | 'wither_skeleton'
  | 'pillager'
  | 'witch'
  | 'breeze'
  | 'creaking'
  | 'warden'
  | 'wither'
  | 'creeper'
  | 'spider'
  | 'enderman'
  | 'shulker'
  | 'slime'
  | 'sulfur_cube'
  | 'piglin'
  | 'zombified_piglin'
  | 'blaze'
  | 'ghast';

export interface MobEntity {
  id: number;
  species: MobSpecies;
  name: string;
  dim: DimensionId;
  hostile: boolean;
  neutral?: boolean;
  rideable?: boolean;
  flyingMob?: boolean;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  attackDmg: number;
  speed: number;

  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  targetYaw: number;

  group: THREE.Group;
  limbs: THREE.Object3D[];
  tintMats: THREE.MeshLambertMaterial[];
  baseColors: number[];
  extraPart?: THREE.Object3D; // Sheep wool coat or Wolf collar!

  aiTimer: number;
  attackCooldown: number;
  hurtTimer: number;
  deathTimer: number; // >0 when dying (#15517 clean tip-over & despawn)
  dead: boolean;
  walking: boolean;
  phase: number;

  // Special states
  sheared?: boolean;
  tamed?: boolean;
  ally?: boolean;
  sitting?: boolean;
  shulkerOpen?: boolean;
  provoked?: boolean;
  fuseTimer?: number; // Creeper swell
  slimeSize?: number;
  hurtImmunity?: number;
  hazardTick?: number;
  frozenTimer?: number;
  poisonTimer?: number;
  poisonTick?: number;
  allyTagSprite?: THREE.Sprite | null;
  spawnSnapPending?: boolean;
  attackTarget?: MobEntity | null;
}

interface EnderDragonBoss {
  active: boolean;
  defeated: boolean;
  hp: number;
  maxHp: number;
  aliveCrystals: number;
  x: number;
  y: number;
  z: number;
  angle: number;
  swoopTimer: number;
  perching: boolean;
  hurtTimer: number;
  group: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
  mats: THREE.MeshLambertMaterial[];
  baseCols: number[];
}

export const ALL_MOB_SPECIES: Array<{ species: MobSpecies; name: string; dim: DimensionId }> = [
  { species: 'villager', name: 'Köylü', dim: 'overworld' },
  { species: 'wandering_trader', name: 'Gezgin Tüccar (NPC)', dim: 'overworld' },
  { species: 'iron_golem', name: 'Demir Golem', dim: 'overworld' },
  { species: 'copper_golem', name: 'Bakır Golem (26.3)', dim: 'overworld' },
  { species: 'snow_golem', name: 'Kar Golemi', dim: 'overworld' },
  { species: 'allay', name: 'Allay (Peri Dost)', dim: 'overworld' },
  { species: 'happy_ghast', name: 'Mutlu Ghast (26.3 Uçan Binek)', dim: 'overworld' },
  { species: 'nautilus', name: 'Nautilus (26.3 Su Bineği)', dim: 'overworld' },
  { species: 'cat', name: 'Kedi', dim: 'overworld' },
  { species: 'frog', name: 'Kurbağa', dim: 'overworld' },
  { species: 'goat', name: 'Dağ Keçisi', dim: 'overworld' },
  { species: 'axolotl', name: 'Aksolotl', dim: 'overworld' },
  { species: 'sheep', name: 'Koyun', dim: 'overworld' },
  { species: 'cow', name: 'İnek', dim: 'overworld' },
  { species: 'pig', name: 'Domuz', dim: 'overworld' },
  { species: 'chicken', name: 'Tavuk', dim: 'overworld' },
  { species: 'horse', name: 'At (Binilebilir)', dim: 'overworld' },
  { species: 'camel', name: 'Deve (Binilebilir)', dim: 'overworld' },
  { species: 'wolf', name: 'Kurt (Evcilleştirilebilir)', dim: 'overworld' },
  { species: 'fox', name: 'Tilki', dim: 'overworld' },
  { species: 'bee', name: 'Arı', dim: 'overworld' },
  { species: 'polar_bear', name: 'Kutup Ayısı', dim: 'overworld' },
  { species: 'zombie', name: 'Zombi', dim: 'overworld' },
  { species: 'husk', name: 'Çöl Zombisi (Husk)', dim: 'overworld' },
  { species: 'skeleton', name: 'İskelet Okçu', dim: 'overworld' },
  { species: 'pillager', name: 'Yağmacı (Arbaletçi)', dim: 'overworld' },
  { species: 'witch', name: 'Cadı', dim: 'overworld' },
  { species: 'breeze', name: 'Breeze (26.3 Rüzgar Muhafızı)', dim: 'overworld' },
  { species: 'creaking', name: 'Creaking (26.3 Heykel Canavar)', dim: 'overworld' },
  { species: 'warden', name: 'Warden (Antik Derinlik Boss)', dim: 'overworld' },
  { species: 'wither', name: 'Wither Boss', dim: 'overworld' },
  { species: 'creeper', name: 'Creeper', dim: 'overworld' },
  { species: 'spider', name: 'Örümcek', dim: 'overworld' },
  { species: 'enderman', name: 'Enderman', dim: 'overworld' },
  { species: 'slime', name: 'Balçık (Slime)', dim: 'overworld' },
  { species: 'piglin', name: 'Piglin', dim: 'nether' },
  { species: 'zombified_piglin', name: 'Zombileşmiş Piglin', dim: 'nether' },
  { species: 'wither_skeleton', name: 'Wither İskeleti', dim: 'nether' },
  { species: 'strider', name: 'Lav Gezgini (Binilebilir)', dim: 'nether' },
  { species: 'sulfur_cube', name: 'Kükürt Küpü (26.3)', dim: 'nether' },
  { species: 'blaze', name: 'Blaze', dim: 'nether' },
  { species: 'ghast', name: 'Ghast', dim: 'nether' },
  { species: 'shulker', name: 'Shulker', dim: 'end' }
];

export class MobSystem {
  private scene: THREE.Scene;
  private atlasTex: THREE.CanvasTexture | null;
  private mobs: MobEntity[] = [];
  private nextId = 1;
  private spawnClock = 0;

  public mountedMob: MobEntity | null = null;
  public dragon: EnderDragonBoss;
  public timeStopTimer = 0;

  public onPlayerDamage?: (amount: number, source: string, knockX: number, knockZ: number) => void;
  public onPlayerHeal?: (amount: number) => void;
  public onOpenVillagerTrade?: (villager: MobEntity) => void;
  public onToast?: (text: string, color?: string) => void;
  public onWorldBlockChange?: (wx: number, y: number, wz: number, blockId: number) => void;
  public onMobKilled?: (mob: MobEntity) => void;
  public onDragonDefeated?: () => void;

  public getMobsInDimension(dim: DimensionId): MobEntity[] {
    return this.mobs.filter((m) => m.dim === dim && !m.dead && m.deathTimer <= 0);
  }

  public countAllies(): number {
    let n = 0;
    for (let i = 0; i < this.mobs.length; i++) {
      const m = this.mobs[i];
      if (!m.dead && m.deathTimer <= 0 && (m.ally || m.tamed)) n++;
    }
    return n;
  }

  public recruitAsTempestAlly(mob: MobEntity, customName: string, boostStats = true) {
    mob.name = customName;
    mob.ally = true;
    mob.tamed = true;
    mob.sitting = false;
    mob.hostile = false;
    mob.neutral = false;
    mob.provoked = false;
    mob.fuseTimer = 0;
    mob.frozenTimer = 0;
    mob.poisonTimer = 0;
    mob.attackTarget = null;

    if (boostStats) {
      mob.maxHp = Math.max(48, Math.round(mob.maxHp * 2.5));
      mob.hp = mob.maxHp;
      mob.attackDmg = Math.max(9, Math.round((mob.attackDmg || 5) * 1.85));
      mob.speed = Math.max(3.6, mob.speed * 1.25);
    } else {
      mob.hp = mob.maxHp;
    }

    if (mob.extraPart && (mob.species === 'wolf' || mob.species === 'cat')) {
      mob.extraPart.visible = true;
    }
    if (mob.species === 'wolf') {
      mob.group.scale.setScalar(1.32); // Star Wolf (Ranga) direwolf stature!
    } else if (mob.species === 'creeper') {
      mob.group.scale.setScalar(1.0);
    }

    if (mob.allyTagSprite) {
      mob.group.remove(mob.allyTagSprite);
      if (mob.allyTagSprite.material.map) mob.allyTagSprite.material.map.dispose();
      mob.allyTagSprite.material.dispose();
      mob.allyTagSprite = null;
    }
    const badge = makeAllyNametagSprite(customName);
    if (badge) {
      badge.position.set(0, mob.height + 0.44, 0);
      mob.group.add(badge);
      mob.allyTagSprite = badge;
    }
  }

  public summonTempestCompanion(
    species: MobSpecies,
    customName: string,
    x: number,
    y: number,
    z: number,
    dim: DimensionId
  ): MobEntity {
    const mob = this.spawnMob(species, x, y, z, dim, 2);
    this.recruitAsTempestAlly(mob, customName, true);
    return mob;
  }

  public healAlliesAround(cx: number, cz: number, radius: number, dim: DimensionId): number {
    let healed = 0;
    for (let i = 0; i < this.mobs.length; i++) {
      const m = this.mobs[i];
      if (m.dim !== dim || m.dead || m.deathTimer > 0) continue;
      if (!m.ally && !m.tamed) continue;
      if (Math.hypot(m.x - cx, m.z - cz) <= radius) {
        m.hp = m.maxHp;
        m.frozenTimer = 0;
        m.poisonTimer = 0;
        healed++;
      }
    }
    return healed;
  }

  public damageEnemyMob(
    target: MobEntity | 'dragon',
    damage: number,
    knockDx: number,
    knockDz: number,
    world: WorldManager,
    sound: SoundEngine
  ): boolean {
    if (target !== 'dragon') {
      if (target.ally || target.tamed || target.dead || target.deathTimer > 0) return false;
      target.hurtImmunity = 0; // Ultimate skills bypass brief melee i-frames!
    }
    this.strikeTarget(target, damage, knockDx, knockDz, true, world, sound, true);
    return true;
  }

  public getActiveBossBar(dim: DimensionId, px: number, pz: number): { title: string; hp: number; maxHp: number } | null {
    if (dim === 'end' && this.dragon.active && !this.dragon.defeated) {
      return {
        title: `Ender Ejderhası (${Math.ceil(this.dragon.hp)}/${this.dragon.maxHp}) · ${this.dragon.aliveCrystals} Kristal`,
        hp: this.dragon.hp,
        maxHp: this.dragon.maxHp
      };
    }
    for (let i = 0; i < this.mobs.length; i++) {
      const m = this.mobs[i];
      if (m.dim !== dim || m.dead || m.deathTimer > 0 || m.ally || m.tamed) continue;
      if (m.species === 'wither' && Math.hypot(m.x - px, m.z - pz) < 52) {
        return {
          title: `Wither Boss (${Math.ceil(m.hp)}/${m.maxHp})`,
          hp: m.hp,
          maxHp: m.maxHp
        };
      }
      if (m.species === 'warden' && Math.hypot(m.x - px, m.z - pz) < 38) {
        return {
          title: `Warden — Antik Derinlik Muhafızı (${Math.ceil(m.hp)}/${m.maxHp})`,
          hp: m.hp,
          maxHp: m.maxHp
        };
      }
    }
    return null;
  }

  constructor(scene: THREE.Scene, atlasTex?: THREE.CanvasTexture) {
    this.scene = scene;
    this.atlasTex = atlasTex || null;
    this.dragon = this.buildEnderDragon();
    this.scene.add(this.dragon.group);
    this.spawnInitialPopulation();
  }

  private spawnInitialPopulation() {
    // Feather-Light Zümrüt Çayır (Tempest) Living Habitat: 11 Essential Entities for Ultra-Low Draw Calls
    this.spawnMob('villager', -2.5, 49, -2.5, 'overworld');
    this.spawnMob('wandering_trader', 3.5, 49, -6.5, 'overworld');
    this.spawnMob('iron_golem', 3.5, 49, 3.5, 'overworld');

    // Loyal Pets near Spawn Square (ready to tame & name e.g. Ranga!)
    this.spawnMob('wolf', 2.5, 49, 5.2, 'overworld');
    this.spawnMob('cat', -6.5, 49, -1.5, 'overworld');

    // Fenced Paddock Mounts (6..11, -8..-3) & Sky Companion
    this.spawnMob('horse', 8.0, 49, -6.0, 'overworld');
    this.spawnMob('camel', 9.5, 49, -5.0, 'overworld');
    this.spawnMob('happy_ghast', 11.5, 52.5, -10.5, 'overworld');

    // Light Meadow Livestock & West Hunt Ring Starter Monsters (-18, -14)
    const starterRing: Array<[MobSpecies, number, number]> = [
      ['sheep', 12.5, 6.5],
      ['cow', -9.5, 7.5],
      ['slime', -17.5, -13.5],
      ['husk', -19.5, -15.5],
      ['pillager', -21.5, -12.5]
    ];
    for (const [sp, mx, mz] of starterRing) {
      const mob = this.spawnMob(sp, mx, 50, mz, 'overworld');
      mob.spawnSnapPending = true;
    }
  }

  private buildEnderDragon(): EnderDragonBoss {
    const group = new THREE.Group();
    group.visible = false;
    const mats: THREE.MeshLambertMaterial[] = [];
    const baseCols: number[] = [];

    const mkMat = (hex: number) => {
      const m = new THREE.MeshLambertMaterial({ color: hex });
      mats.push(m);
      baseCols.push(hex);
      return m;
    };

    const bodyMat = mkMat(0x181622);
    const scaleMat = mkMat(0x3b2c54);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe879f9 });
    const wingMembrane = mkMat(0x282138);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 4.2), bodyMat);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 2.0), bodyMat);
    neck.position.set(0, 0.3, -2.8);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.5), bodyMat);
    head.position.set(0, 0.45, -4.2);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 1.2), scaleMat);
    jaw.position.set(0, -0.05, -4.6);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.22), eyeMat);
    eyeL.position.set(-0.45, 0.62, -4.75);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.45;

    // Dorsal spines & tail
    for (let i = -1; i <= 3; i++) {
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.45), scaleMat);
      spine.position.set(0, 0.85, i * 0.95 - 0.5);
      group.add(spine);
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 3.6), bodyMat);
    tail.position.set(0, 0.0, 3.6);

    const wingL = new THREE.Group();
    wingL.position.set(-0.9, 0.5, -0.4);
    const wBoneL = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 0.32), scaleMat);
    wBoneL.position.set(-2.2, 0, -0.8);
    const wSheetL = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 2.6), wingMembrane);
    wSheetL.position.set(-2.1, -0.04, 0.4);
    wingL.add(wBoneL, wSheetL);

    const wingR = new THREE.Group();
    wingR.position.set(0.9, 0.5, -0.4);
    const wBoneR = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 0.32), scaleMat);
    wBoneR.position.set(2.2, 0, -0.8);
    const wSheetR = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 2.6), wingMembrane);
    wSheetR.position.set(2.1, -0.04, 0.4);
    wingR.add(wBoneR, wSheetR);

    group.add(torso, neck, head, jaw, eyeL, eyeR, tail, wingL, wingR);

    return {
      active: false,
      defeated: false,
      hp: 200,
      maxHp: 200,
      aliveCrystals: 10,
      x: 0,
      y: 72,
      z: -24,
      angle: 0,
      swoopTimer: 9,
      perching: false,
      hurtTimer: 0,
      group,
      wingL,
      wingR,
      mats,
      baseCols
    };
  }

  public spawnMob(species: MobSpecies, x: number, y: number, z: number, dim: DimensionId, slimeSize = 2): MobEntity {
    const group = new THREE.Group();
    const limbs: THREE.Object3D[] = [];
    const tintMats: THREE.MeshLambertMaterial[] = [];
    const baseColors: number[] = [];
    let extraPart: THREE.Object3D | undefined;

    const grainTex = getSharedMobGrainTex();
    const mat = (hex: number, opts?: THREE.MeshLambertMaterialParameters) => {
      const m = new THREE.MeshLambertMaterial({
        color: hex,
        map: opts && 'map' in opts ? opts.map : grainTex,
        ...opts
      });
      tintMats.push(m);
      baseColors.push(hex);
      return m;
    };

    const texMat = (
      key: string,
      w: number,
      h: number,
      draw: (ctx: CanvasRenderingContext2D) => void,
      opts?: THREE.MeshLambertMaterialParameters
    ) => {
      const t = getSharedMobTex(key, w, h, draw);
      return mat(0xffffff, { map: t, ...opts });
    };

    const head6Mats = (sideM: THREE.Material, topM: THREE.Material, frontM: THREE.Material): THREE.Material[] => [
      sideM, sideM, topM, sideM, sideM, frontM
    ];

    const addBox = (
      w: number,
      h: number,
      d: number,
      m: THREE.Material | THREE.Material[],
      px: number,
      py: number,
      pz: number,
      parent: THREE.Object3D = group
    ) => {
      const mesh = new THREE.Mesh(getSharedMobBoxGeo(w, h, d), m);
      mesh.position.set(px, py, pz);
      parent.add(mesh);
      return mesh;
    };

    const addQuadLegs = (legW: number, legH: number, spanX: number, spanZ: number, m: THREE.Material) => {
      const coords = [[-spanX, -spanZ], [spanX, -spanZ], [-spanX, spanZ], [spanX, spanZ]];
      for (const [lx, lz] of coords) {
        const piv = new THREE.Group();
        piv.position.set(lx, legH, lz);
        addBox(legW, legH, legW, m, 0, -legH / 2, 0, piv);
        group.add(piv);
        limbs.push(piv);
      }
    };

    const addBipedLimbs = (
      bodyCol: number,
      headCol: number,
      pantsCol: number,
      raisedArms = false,
      tall = false,
      customHeadMats?: THREE.Material[],
      customBodyMat?: THREE.Material,
      customArmMat?: THREE.Material
    ) => {
      const hScale = tall ? 1.45 : 1.0;
      const bodyM = customBodyMat || mat(bodyCol);
      const headM = mat(headCol);
      const legM = mat(pantsCol);
      const armM = customArmMat || (raisedArms ? headM : bodyM);

      const legH = 0.68 * hScale;
      for (const lx of [-0.12, 0.12]) {
        const lp = new THREE.Group();
        lp.position.set(lx, legH, 0);
        addBox(tall ? 0.14 : 0.22, legH, tall ? 0.14 : 0.22, legM, 0, -legH / 2, 0, lp);
        group.add(lp);
        limbs.push(lp);
      }
      addBox(0.46, 0.68, 0.24, bodyM, 0, legH + 0.34, 0);
      addBox(0.46, 0.46, 0.46, customHeadMats || headM, 0, legH + 0.91, 0);
      if (!customHeadMats) {
        const eyeM = new THREE.MeshBasicMaterial({ color: tall ? 0xd946ef : raisedArms ? 0x111827 : 0xffffff });
        addBox(0.10, 0.07, 0.04, eyeM, -0.11, legH + 0.92, -0.24);
        addBox(0.10, 0.07, 0.04, eyeM, 0.11, legH + 0.92, -0.24);
      }

      let leftArm!: THREE.Group;
      let rightArm!: THREE.Group;
      for (const ax of [-0.34, 0.34]) {
        const ap = new THREE.Group();
        ap.position.set(ax, legH + 0.62, 0);
        if (raisedArms) ap.rotation.x = 1.42;
        addBox(tall ? 0.13 : 0.20, 0.66 * hScale, tall ? 0.13 : 0.20, armM, 0, -0.30 * hScale, 0, ap);
        group.add(ap);
        if (!raisedArms) limbs.push(ap);
        if (ax < 0) leftArm = ap;
        else rightArm = ap;
      }
      return { leftArm, rightArm, hScale };
    };

    const attachMobWeapon = (arm: THREE.Group, itemId: number, yOff = -0.54) => {
      const mount = new THREE.Group();
      mount.position.set(0.02, yOff, -0.09);
      if (itemId === ITEM.CROSSBOW) {
        const cb = buildCrossbow3D(false);
        cb.position.set(-0.14, 0.02, -0.02);
        cb.rotation.set(-1.15, 0, 0);
        mount.add(cb);
      } else {
        const wMesh = buildHeldItem3D(itemId, this.atlasTex as THREE.CanvasTexture, false);
        if (wMesh) {
          orientThirdPersonHeldMesh(wMesh, itemId);
          if (itemId === ITEM.BOW) {
            wMesh.rotation.set(-1.15, -Math.PI * 0.36, 0.06);
          }
          mount.add(wMesh);
        }
      }
      arm.add(mount);
    };

    let name = 'Canlı';
    let hostile = false;
    let neutral = false;
    let rideable = false;
    let flyingMob = false;
    let width = 0.7;
    let height = 1.8;
    let hp = 20;
    let attackDmg = 3;
    let speed = 1.6;

    switch (species) {
      case 'villager': {
        name = 'Köylü (Sağ Tık Takas)';
        hp = 20; speed = 1.25;
        const robe = texMat('villager_robe', 8, 12, (ctx) => {
          ctx.fillStyle = '#7c5236'; ctx.fillRect(0, 0, 8, 12);
          ctx.fillStyle = '#68432b'; ctx.fillRect(1, 0, 1, 12); ctx.fillRect(6, 0, 1, 12);
          ctx.fillStyle = '#926344'; ctx.fillRect(3, 1, 2, 10);
          ctx.fillStyle = '#4a2e1b'; ctx.fillRect(0, 10, 8, 2);
        });
        const skin = mat(0xc68e6b);
        const face = texMat('villager_face', 8, 8, (ctx) => {
          ctx.fillStyle = '#c68e6b'; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = '#b47c59'; ctx.fillRect(0, 0, 8, 1); ctx.fillRect(0, 7, 8, 1);
          // Classic Villager continuous unibrow + white sclera + emerald eyes!
          ctx.fillStyle = '#3f2617'; ctx.fillRect(1, 2, 6, 1);
          ctx.fillStyle = '#f8fafc'; ctx.fillRect(1, 3, 2, 1); ctx.fillRect(5, 3, 2, 1);
          ctx.fillStyle = '#16a34a'; ctx.fillRect(2, 3, 1, 1); ctx.fillRect(5, 3, 1, 1);
          ctx.fillStyle = '#9f6a49'; ctx.fillRect(2, 6, 4, 1);
        });
        const emeraldTrim = mat(0x22c55e);
        addBox(0.48, 1.06, 0.30, robe, 0, 0.72, 0);
        addBox(0.62, 0.24, 0.34, robe, 0, 0.94, -0.10);
        addBox(0.46, 0.54, 0.46, head6Mats(skin, skin, face), 0, 1.52, 0);
        addBox(0.11, 0.20, 0.12, skin, 0, 1.44, -0.27);
        addBox(0.50, 0.10, 0.32, emeraldTrim, 0, 0.85, 0);
        addQuadLegs(0.18, 0.36, 0.12, 0.0, robe);
        break;
      }
      case 'iron_golem': {
        name = 'Demir Golem';
        neutral = true; width = 1.2; height = 2.7; hp = 100; attackDmg = 14; speed = 1.5;
        const iron = texMat('golem_iron', 16, 16, (ctx) => {
          ctx.fillStyle = '#d6d3cd'; ctx.fillRect(0, 0, 16, 16);
          ctx.fillStyle = '#c4bfb6'; ctx.fillRect(0, 7, 16, 2); ctx.fillRect(7, 0, 2, 16);
          ctx.fillStyle = '#e7e5df'; ctx.fillRect(2, 2, 4, 4); ctx.fillRect(10, 10, 4, 4);
          ctx.fillStyle = '#5c7c28'; ctx.fillRect(2, 5, 2, 6); ctx.fillRect(3, 9, 3, 4);
          ctx.fillStyle = '#facc15'; ctx.fillRect(4, 10, 1, 1);
        });
        const face = texMat('golem_face', 8, 8, (ctx) => {
          ctx.fillStyle = '#d6d3cd'; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = '#a8a29e'; ctx.fillRect(0, 2, 8, 1);
          ctx.fillStyle = '#292524'; ctx.fillRect(1, 3, 2, 1); ctx.fillRect(5, 3, 2, 1);
          ctx.fillStyle = '#ef4444'; ctx.fillRect(1, 3, 1, 1); ctx.fillRect(6, 3, 1, 1);
          ctx.fillStyle = '#fde047'; ctx.fillRect(2, 3, 1, 1); ctx.fillRect(5, 3, 1, 1);
          ctx.fillStyle = '#57534e'; ctx.fillRect(2, 6, 4, 1);
        });
        const vine = mat(0x4d7c0f);
        addQuadLegs(0.30, 0.85, 0.24, 0, iron);
        addBox(1.05, 1.05, 0.55, iron, 0, 1.38, 0);
        addBox(0.32, 0.65, 0.57, vine, -0.25, 1.38, 0);
        addBox(0.52, 0.62, 0.48, head6Mats(iron, iron, face), 0, 2.22, -0.08);
        addBox(0.12, 0.24, 0.14, iron, 0, 2.12, -0.35);
        addBox(0.24, 1.35, 0.28, iron, -0.68, 1.25, 0);
        addBox(0.24, 1.35, 0.28, iron, 0.68, 1.25, 0);
        break;
      }
      case 'copper_golem': {
        name = 'Bakır Golem';
        width = 0.65; height = 1.25; hp = 30; speed = 1.4;
        const cop = mat(0xd97745);
        const pat = mat(0x34d399);
        addQuadLegs(0.18, 0.32, 0.13, 0, cop);
        addBox(0.52, 0.44, 0.34, cop, 0, 0.54, 0);
        addBox(0.50, 0.40, 0.42, cop, 0, 0.96, 0);
        addBox(0.10, 0.16, 0.12, cop, 0, 0.92, -0.24);
        // Lightning rod antenna!
        addBox(0.08, 0.26, 0.08, cop, 0, 1.28, 0);
        addBox(0.16, 0.14, 0.16, pat, 0, 1.44, 0);
        break;
      }
      case 'snow_golem': {
        name = 'Kar Golemi';
        width = 0.7; height = 1.85; hp = 12; attackDmg = 1; speed = 1.45;
        const snow = mat(0xf8fafc);
        const twig = mat(0x6b4423);
        const coal = mat(0x1e293b);
        const pump = mat(0xea7a1e);
        addBox(0.62, 0.60, 0.62, snow, 0, 0.30, 0);
        addBox(0.50, 0.52, 0.50, snow, 0, 0.86, 0);
        addBox(0.07, 0.07, 0.05, coal, 0, 0.96, -0.26);
        addBox(0.07, 0.07, 0.05, coal, 0, 0.78, -0.26);
        addBox(0.40, 0.40, 0.40, snow, 0, 1.32, 0);
        addBox(0.07, 0.07, 0.04, coal, -0.09, 1.36, -0.21);
        addBox(0.07, 0.07, 0.04, coal, 0.09, 1.36, -0.21);
        const armL = addBox(0.42, 0.08, 0.08, twig, -0.42, 0.96, 0);
        armL.rotation.z = 0.32;
        const armR = addBox(0.42, 0.08, 0.08, twig, 0.42, 0.96, 0);
        armR.rotation.z = -0.32;
        limbs.push(armL, armR);
        extraPart = addBox(0.50, 0.50, 0.50, pump, 0, 1.38, 0);
        break;
      }
      case 'sheep': {
        name = 'Koyun';
        width = 0.8; height = 1.25; hp = 8; speed = 1.35;
        const skin = mat(0xd8b89e);
        const wool = texMat('sheep_wool', 16, 16, (ctx) => {
          ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, 16, 16);
          for (let y = 0; y < 16; y += 4) {
            for (let x = 0; x < 16; x += 4) {
              ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x, y + 3, 4, 1); ctx.fillRect(x + 3, y, 1, 4);
              ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 1, 2, 2);
            }
          }
        });
        const face = texMat('sheep_face', 8, 8, (ctx) => {
          ctx.fillStyle = '#d8b89e'; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, 8, 2); ctx.fillRect(1, 2, 6, 1);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 3, 1, 1); ctx.fillRect(7, 3, 1, 1);
          ctx.fillStyle = '#1c1917'; ctx.fillRect(1, 3, 1, 1); ctx.fillRect(6, 3, 1, 1);
          ctx.fillStyle = '#f4a2b8'; ctx.fillRect(3, 5, 2, 2);
        });
        addQuadLegs(0.16, 0.42, 0.18, 0.30, skin);
        addBox(0.52, 0.44, 0.84, skin, 0, 0.62, 0);
        extraPart = addBox(0.66, 0.56, 0.94, wool, 0, 0.64, 0);
        addBox(0.40, 0.40, 0.44, head6Mats(wool, wool, face), 0, 0.84, -0.54);
        break;
      }
      case 'cow': {
        name = 'İnek';
        width = 0.85; height = 1.35; hp = 10; speed = 1.35;
        const hide = texMat('cow_hide', 16, 16, (ctx) => {
          ctx.fillStyle = '#4e3528'; ctx.fillRect(0, 0, 16, 16);
          ctx.fillStyle = '#3d281d'; ctx.fillRect(2, 1, 4, 3); ctx.fillRect(11, 9, 4, 4);
          ctx.fillStyle = '#eef2f6'; ctx.fillRect(1, 5, 6, 5); ctx.fillRect(9, 2, 5, 5); ctx.fillRect(6, 11, 5, 4);
          ctx.fillStyle = '#cbd5e1'; ctx.fillRect(2, 9, 4, 1); ctx.fillRect(10, 6, 4, 1);
        });
        const face = texMat('cow_face', 8, 8, (ctx) => {
          ctx.fillStyle = '#4e3528'; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = '#eef2f6'; ctx.fillRect(3, 0, 2, 4);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 3, 1, 1); ctx.fillRect(7, 3, 1, 1);
          ctx.fillStyle = '#18181b'; ctx.fillRect(1, 3, 1, 1); ctx.fillRect(6, 3, 1, 1);
          ctx.fillStyle = '#f4afba'; ctx.fillRect(1, 5, 6, 3);
          ctx.fillStyle = '#4c1d24'; ctx.fillRect(2, 6, 1, 1); ctx.fillRect(5, 6, 1, 1);
        });
        const horn = mat(0xd6d3d1);
        addQuadLegs(0.18, 0.48, 0.20, 0.34, hide);
        addBox(0.66, 0.58, 0.98, hide, 0, 0.74, 0);
        addBox(0.44, 0.44, 0.42, head6Mats(hide, hide, face), 0, 0.94, -0.60);
        addBox(0.08, 0.18, 0.08, horn, -0.24, 1.14, -0.62);
        addBox(0.08, 0.18, 0.08, horn, 0.24, 1.14, -0.62);
        break;
      }
      case 'pig': {
        name = 'Domuz';
        width = 0.75; height = 0.95; hp = 10; speed = 1.45;
        const pink = texMat('pig_skin', 16, 16, (ctx) => {
          ctx.fillStyle = '#f4a2b8'; ctx.fillRect(0, 0, 16, 16);
          ctx.fillStyle = '#ea8ca6'; ctx.fillRect(2, 3, 4, 2); ctx.fillRect(9, 8, 5, 3); ctx.fillRect(3, 12, 4, 2);
          ctx.fillStyle = '#f9b8ca'; ctx.fillRect(1, 1, 5, 2); ctx.fillRect(8, 2, 5, 2);
        });
        const face = texMat('pig_face', 8, 8, (ctx) => {
          ctx.fillStyle = '#f4a2b8'; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 3, 1, 1); ctx.fillRect(7, 3, 1, 1);
          ctx.fillStyle = '#18181b'; ctx.fillRect(1, 3, 1, 1); ctx.fillRect(6, 3, 1, 1);
        });
        const snout = texMat('pig_snout', 4, 3, (ctx) => {
          ctx.fillStyle = '#e8799a'; ctx.fillRect(0, 0, 4, 3);
          ctx.fillStyle = '#831843'; ctx.fillRect(0, 1, 1, 1); ctx.fillRect(3, 1, 1, 1);
        });
        addQuadLegs(0.16, 0.32, 0.18, 0.28, pink);
        addBox(0.58, 0.48, 0.86, pink, 0, 0.52, 0);
        addBox(0.42, 0.42, 0.42, head6Mats(pink, pink, face), 0, 0.64, -0.52);
        addBox(0.22, 0.16, 0.10, snout, 0, 0.56, -0.75);
        break;
      }
      case 'chicken': {
        name = 'Tavuk';
        width = 0.45; height = 0.75; hp = 4; speed = 1.65;
        const white = mat(0xffffff);
        const face = texMat('chicken_face', 8, 8, (ctx) => {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, 6, 8, 2);
          ctx.fillStyle = '#18181b'; ctx.fillRect(1, 2, 1, 1); ctx.fillRect(6, 2, 1, 1);
        });
        const beak = mat(0xf59e0b);
        const wattle = mat(0xef4444);
        addQuadLegs(0.06, 0.22, 0.09, 0.0, beak);
        addBox(0.36, 0.32, 0.46, white, 0, 0.36, 0);
        addBox(0.24, 0.28, 0.24, head6Mats(white, white, face), 0, 0.58, -0.22);
        addBox(0.14, 0.08, 0.14, beak, 0, 0.56, -0.38);
        addBox(0.08, 0.10, 0.08, wattle, 0, 0.48, -0.34);
        break;
      }
      case 'horse':
      case 'camel': {
        const isCamel = species === 'camel';
        name = isCamel ? 'Deve (Sağ Tık Bin)' : 'At (Sağ Tık Bin)';
        rideable = true;
        width = 0.95; height = isCamel ? 2.1 : 1.7; hp = 26; speed = isCamel ? 1.5 : 2.1;
        const horseCoats: Array<[number, number]> = [
          [0x854d27, 0x3b2313], // Chestnut
          [0xe2e8f0, 0x94a3b8], // Dapple White
          [0x451a03, 0x1c1917], // Dark Bay
          [0xc28e46, 0xfef3c7]  // Palomino Gold
        ];
        const pick = horseCoats[this.nextId % horseCoats.length];
        const coat = mat(isCamel ? 0xd99b52 : pick[0]);
        const mane = mat(isCamel ? 0xb87a35 : pick[1]);
        const saddleLeather = mat(0x7c3f1d);
        const ironStirrup = mat(0xcbd5e1);
        const legH = isCamel ? 0.82 : 0.64;
        addQuadLegs(0.18, legH, 0.24, 0.42, coat);
        addBox(0.68, 0.58, 1.24, coat, 0, legH + 0.28, 0);
        if (isCamel) {
          addBox(0.48, 0.32, 0.54, mane, 0, legH + 0.68, 0.04); // hump
          // 3D Desert Saddle Blanket & Twin Riding Frame
          addBox(0.74, 0.28, 0.82, saddleLeather, 0, legH + 0.48, -0.02);
          addBox(0.56, 0.14, 0.10, ironStirrup, 0, legH + 0.68, -0.34);
        } else {
          // 3D Sculpted Leather Saddle, Pommel, Cantle & Iron Stirrups
          addBox(0.74, 0.26, 0.58, saddleLeather, 0, legH + 0.48, -0.04);
          addBox(0.52, 0.10, 0.10, saddleLeather, 0, legH + 0.62, -0.26);
          addBox(0.54, 0.11, 0.11, saddleLeather, 0, legH + 0.62, 0.18);
          addBox(0.05, 0.26, 0.08, saddleLeather, -0.38, legH + 0.26, -0.04);
          addBox(0.05, 0.26, 0.08, saddleLeather, 0.38, legH + 0.26, -0.04);
          addBox(0.07, 0.08, 0.10, ironStirrup, -0.39, legH + 0.11, -0.04);
          addBox(0.07, 0.08, 0.10, ironStirrup, 0.39, legH + 0.11, -0.04);
          addBox(0.14, 0.48, 0.14, mane, 0, legH + 0.26, 0.68); // Flowing tail
        }
        const neck = new THREE.Group();
        neck.position.set(0, legH + 0.44, -0.52);
        neck.rotation.x = 0.48;
        addBox(0.28, 0.68, 0.30, coat, 0, 0.30, 0, neck);
        addBox(0.32, 0.28, 0.52, coat, 0, 0.66, -0.14, neck);
        addBox(0.35, 0.08, 0.28, saddleLeather, 0, 0.64, -0.20, neck); // Bridle noseband
        addBox(0.10, 0.12, 0.08, coat, -0.10, 0.84, -0.02, neck); // Ears
        addBox(0.10, 0.12, 0.08, coat, 0.10, 0.84, -0.02, neck);
        addBox(0.10, 0.62, 0.12, mane, 0, 0.34, 0.16, neck);
        group.add(neck);
        break;
      }
      case 'wolf': {
        name = 'Kurt (Kemikle Evcilleştir)';
        neutral = true; width = 0.65; height = 0.85; hp = 16; attackDmg = 4; speed = 2.1;
        const fur = mat(0xd1d5db);
        const dark = mat(0x9ca3af);
        const face = texMat('wolf_face', 8, 8, (ctx) => {
          ctx.fillStyle = '#d1d5db'; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = '#9ca3af'; ctx.fillRect(0, 0, 8, 2);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(1, 3, 1, 1); ctx.fillRect(6, 3, 1, 1);
          ctx.fillStyle = '#18181b'; ctx.fillRect(2, 3, 1, 1); ctx.fillRect(5, 3, 1, 1);
        });
        const snoutM = texMat('wolf_snout', 4, 4, (ctx) => {
          ctx.fillStyle = '#e5e7eb'; ctx.fillRect(0, 0, 4, 4);
          ctx.fillStyle = '#18181b'; ctx.fillRect(1, 0, 2, 2);
        });
        const collar = new THREE.MeshLambertMaterial({ color: 0xef4444 });
        addQuadLegs(0.13, 0.32, 0.15, 0.28, fur);
        addBox(0.42, 0.38, 0.78, fur, 0, 0.48, 0);
        addBox(0.46, 0.42, 0.34, dark, 0, 0.50, -0.24);
        extraPart = addBox(0.48, 0.44, 0.10, collar, 0, 0.50, -0.36);
        extraPart.visible = false; // Visible once tamed!
        addBox(0.36, 0.34, 0.36, head6Mats(fur, dark, face), 0, 0.56, -0.54);
        addBox(0.18, 0.16, 0.22, snoutM, 0, 0.50, -0.78);
        addBox(0.10, 0.12, 0.06, dark, -0.12, 0.76, -0.50);
        addBox(0.10, 0.12, 0.06, dark, 0.12, 0.76, -0.50);
        break;
      }
      case 'fox': {
        name = 'Tilki';
        width = 0.6; height = 0.75; hp = 10; speed = 2.0;
        const orange = mat(0xea580c);
        const white = mat(0xf8fafc);
        addQuadLegs(0.11, 0.24, 0.13, 0.24, mat(0x27272a));
        addBox(0.38, 0.32, 0.68, orange, 0, 0.38, 0);
        addBox(0.36, 0.30, 0.34, orange, 0, 0.46, -0.44);
        addBox(0.18, 0.12, 0.18, white, 0, 0.40, -0.66);
        addBox(0.24, 0.24, 0.46, orange, 0, 0.38, 0.52);
        addBox(0.22, 0.22, 0.16, white, 0, 0.38, 0.80);
        break;
      }
      case 'bee': {
        name = 'Arı';
        flyingMob = true; width = 0.55; height = 0.55; hp = 10; speed = 2.2;
        const yellow = mat(0xfacc15);
        const stripe = mat(0x292524);
        const wingM = mat(0xe0f2fe, { transparent: true, opacity: 0.75 });
        addBox(0.42, 0.40, 0.54, yellow, 0, 0.3, 0);
        addBox(0.44, 0.42, 0.10, stripe, 0, 0.3, 0.04);
        addBox(0.44, 0.42, 0.10, stripe, 0, 0.3, 0.20);
        const wl = addBox(0.36, 0.04, 0.26, wingM, -0.28, 0.52, -0.04);
        const wr = addBox(0.36, 0.04, 0.26, wingM, 0.28, 0.52, -0.04);
        limbs.push(wl, wr);
        break;
      }
      case 'polar_bear': {
        name = 'Kutup Ayısı';
        neutral = true; width = 1.1; height = 1.4; hp = 30; attackDmg = 6; speed = 1.7;
        const snowFur = mat(0xf1f5f9);
        addQuadLegs(0.24, 0.52, 0.28, 0.42, snowFur);
        addBox(0.86, 0.74, 1.28, snowFur, 0, 0.84, 0);
        addBox(0.52, 0.48, 0.52, snowFur, 0, 0.94, -0.82);
        break;
      }
      case 'zombie':
      case 'husk': {
        const isHusk = species === 'husk';
        name = isHusk ? 'Çöl Zombisi' : 'Zombi';
        hostile = true; hp = 20; attackDmg = 3; speed = 1.85;
        const skinHex = isHusk ? '#9c8658' : '#538243';
        const skinDark = isHusk ? '#7a6740' : '#3d6330';
        const shirtHex = isHusk ? '#b59d6d' : '#00a0a8';
        const shirtDark = isHusk ? '#8c764c' : '#007b82';
        const sideM = texMat(isHusk ? 'husk_side' : 'zombie_side', 8, 8, (ctx) => {
          ctx.fillStyle = skinHex; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = skinDark; ctx.fillRect(0, 0, 8, 2); ctx.fillRect(2, 4, 3, 2);
        });
        const faceM = texMat(isHusk ? 'husk_face' : 'zombie_face', 8, 8, (ctx) => {
          ctx.fillStyle = skinHex; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = skinDark; ctx.fillRect(0, 0, 8, 2); ctx.fillRect(3, 5, 2, 1);
          ctx.fillStyle = '#182414'; ctx.fillRect(1, 3, 2, 1); ctx.fillRect(5, 3, 2, 1);
          ctx.fillStyle = '#263820'; ctx.fillRect(2, 6, 4, 1);
        });
        const bodyM = texMat(isHusk ? 'husk_body' : 'zombie_body', 8, 12, (ctx) => {
          ctx.fillStyle = shirtHex; ctx.fillRect(0, 0, 8, 12);
          ctx.fillStyle = skinDark; ctx.fillRect(3, 0, 2, 2);
          ctx.fillStyle = shirtDark; ctx.fillRect(0, 9, 8, 3); ctx.fillRect(1, 4, 2, 3);
        });
        addBipedLimbs(
          isHusk ? 0xa1885c : 0x0ea5e9,
          isHusk ? 0x8c7853 : 0x538243,
          isHusk ? 0x57534e : 0x3b358f,
          true,
          false,
          head6Mats(sideM, sideM, faceM),
          bodyM,
          sideM
        );
        break;
      }
      case 'skeleton': {
        name = 'İskelet';
        hostile = true; hp = 20; attackDmg = 4; speed = 1.85;
        const boneSide = mat(0xd6d3cd);
        const skullFace = texMat('skel_face', 8, 8, (ctx) => {
          ctx.fillStyle = '#e2dfd9'; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = '#c6c2ba'; ctx.fillRect(0, 0, 8, 1); ctx.fillRect(0, 7, 8, 1);
          ctx.fillStyle = '#292524'; ctx.fillRect(1, 3, 2, 1); ctx.fillRect(5, 3, 2, 1);
          ctx.fillStyle = '#44403c'; ctx.fillRect(3, 4, 2, 1);
          ctx.fillStyle = '#292524'; ctx.fillRect(1, 6, 6, 1);
        });
        const ribsBody = texMat('skel_ribs', 8, 12, (ctx) => {
          ctx.fillStyle = '#292524'; ctx.fillRect(0, 0, 8, 12);
          ctx.fillStyle = '#dfdcd6';
          ctx.fillRect(0, 0, 8, 2); ctx.fillRect(3, 0, 2, 12);
          ctx.fillRect(1, 3, 6, 1); ctx.fillRect(1, 5, 6, 1); ctx.fillRect(1, 7, 6, 1);
          ctx.fillRect(0, 10, 8, 2);
        });
        const { rightArm } = addBipedLimbs(
          0xd6d3cd,
          0xe2dfd9,
          0xd6d3cd,
          true,
          false,
          head6Mats(boneSide, boneSide, skullFace),
          ribsBody,
          boneSide
        );
        attachMobWeapon(rightArm, ITEM.BOW, -0.48);
        break;
      }
      case 'creeper': {
        name = 'Creeper';
        hostile = true; width = 0.65; height = 1.7; hp = 20; attackDmg = 14; speed = 1.8;
        const camo = texMat('creeper_camo', 8, 8, (ctx) => {
          const cols = ['#50b848', '#3da036', '#6fd463', '#2e7d2a', '#8ce67e', '#46ab3e'];
          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
              ctx.fillStyle = cols[(x * 7 + y * 13 + (x ^ y) * 3) % cols.length];
              ctx.fillRect(x, y, 1, 1);
            }
          }
        });
        const face = texMat('creeper_face', 8, 8, (ctx) => {
          const cols = ['#50b848', '#3da036', '#6fd463', '#46ab3e'];
          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
              ctx.fillStyle = cols[(x * 5 + y * 11) % cols.length];
              ctx.fillRect(x, y, 1, 1);
            }
          }
          // Authentic 8x8 Original Minecraft Creeper Face!
          ctx.fillStyle = '#0d1b0d';
          ctx.fillRect(1, 2, 2, 2);
          ctx.fillRect(5, 2, 2, 2);
          ctx.fillRect(3, 4, 2, 3);
          ctx.fillRect(2, 5, 1, 2);
          ctx.fillRect(5, 5, 1, 2);
        });
        addQuadLegs(0.22, 0.38, 0.16, 0.20, camo);
        addBox(0.44, 0.78, 0.26, camo, 0, 0.76, 0);
        addBox(0.46, 0.46, 0.46, head6Mats(camo, camo, face), 0, 1.38, 0);
        break;
      }
      case 'spider': {
        name = 'Örümcek';
        hostile = true; width = 1.2; height = 0.85; hp = 16; attackDmg = 3; speed = 2.4;
        const chitin = mat(0x272429);
        const redEyes = new THREE.MeshBasicMaterial({ color: 0xff1e1e });
        addBox(0.46, 0.38, 0.46, chitin, 0, 0.42, -0.32);
        addBox(0.64, 0.48, 0.74, chitin, 0, 0.46, 0.32);
        addBox(0.32, 0.10, 0.04, redEyes, 0, 0.46, -0.56);
        for (let side of [-1, 1]) {
          for (let li = 0; li < 4; li++) {
            const leg = addBox(0.58, 0.10, 0.10, chitin, side * 0.48, 0.32, -0.24 + li * 0.22);
            leg.rotation.z = side * -0.45;
            limbs.push(leg);
          }
        }
        break;
      }
      case 'enderman': {
        name = 'Enderman';
        neutral = true; width = 0.65; height = 2.85; hp = 40; attackDmg = 7; speed = 2.6;
        const voidSide = mat(0x14121a);
        const endFace = texMat('enderman_face', 8, 8, (ctx) => {
          ctx.fillStyle = '#14121a'; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = '#1f1a29'; ctx.fillRect(1, 1, 6, 2);
          ctx.fillStyle = '#f5d0fe'; ctx.fillRect(0, 4, 3, 1); ctx.fillRect(5, 4, 3, 1);
          ctx.fillStyle = '#c026d3'; ctx.fillRect(1, 4, 1, 1); ctx.fillRect(6, 4, 1, 1);
        });
        addBipedLimbs(0x14121a, 0x181520, 0x14121a, false, true, head6Mats(voidSide, voidSide, endFace));
        break;
      }
      case 'slime': {
        name = 'Balçık';
        hostile = true;
        const s = 0.42 * slimeSize;
        width = s; height = s; hp = slimeSize * slimeSize * 4; attackDmg = slimeSize * 2; speed = 1.6;
        const outer = mat(0x6ad859, { transparent: true, opacity: 0.72 });
        const slimeFront = texMat('slime_front', 8, 8, (ctx) => {
          ctx.fillStyle = '#6ad859'; ctx.fillRect(0, 0, 8, 8);
          ctx.fillStyle = '#255c1d';
          ctx.fillRect(1, 2, 2, 2);
          ctx.fillRect(5, 2, 2, 2);
          ctx.fillRect(4, 5, 1, 1);
        }, { transparent: true, opacity: 0.84 });
        const inner = mat(0x3f9e32);
        addBox(s, s, s, head6Mats(outer, outer, slimeFront), 0, s / 2, 0);
        addBox(s * 0.62, s * 0.62, s * 0.62, inner, 0, s / 2, 0);
        break;
      }
      case 'piglin':
      case 'zombified_piglin': {
        const zom = species === 'zombified_piglin';
        name = zom ? 'Zombileşmiş Piglin' : 'Piglin (Altınla Takas)';
        hostile = !zom; neutral = zom; hp = 18; attackDmg = 5; speed = 1.95;
        const { rightArm } = addBipedLimbs(zom ? 0x65a363 : 0xd99b72, zom ? 0x7cb578 : 0xe3a882, 0x573b26, zom, false);
        attachMobWeapon(rightArm, ITEM.GOLD_SWORD, -0.52);
        break;
      }
      case 'blaze': {
        name = 'Blaze';
        hostile = true; flyingMob = true; width = 0.7; height = 1.7; hp = 20; attackDmg = 5; speed = 1.9;
        const fireGold = mat(0xf59e0b);
        const core = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        addBox(0.46, 0.46, 0.46, fireGold, 0, 1.35, 0);
        addBox(0.28, 0.55, 0.28, core, 0, 0.85, 0);
        const ring = new THREE.Group();
        ring.position.set(0, 0.85, 0);
        for (let r = 0; r < 6; r++) {
          const a = (r / 6) * Math.PI * 2;
          addBox(0.10, 0.56, 0.10, fireGold, Math.cos(a) * 0.45, (r % 2) * 0.18 - 0.1, Math.sin(a) * 0.45, ring);
        }
        group.add(ring);
        limbs.push(ring);
        break;
      }
      case 'ghast': {
        name = 'Ghast';
        hostile = true; flyingMob = true; width = 2.4; height = 2.4; hp = 14; attackDmg = 6; speed = 1.5;
        const ghost = mat(0xf8fafc);
        const tear = mat(0x94a3b8);
        addBox(2.2, 2.2, 2.2, ghost, 0, 1.5, 0);
        addBox(0.45, 0.22, 0.06, tear, -0.55, 1.75, -1.12);
        addBox(0.45, 0.22, 0.06, tear, 0.55, 1.75, -1.12);
        for (let tx = -0.7; tx <= 0.7; tx += 0.46) {
          for (let tz = -0.6; tz <= 0.6; tz += 0.6) {
            const tent = addBox(0.20, 1.1, 0.20, ghost, tx, -0.1, tz);
            limbs.push(tent);
          }
        }
        break;
      }
      case 'wandering_trader': {
        name = 'Gezgin Tüccar (Sağ Tık Takas)';
        hp = 20; speed = 1.25;
        const robe = mat(0x1d4ed8);
        const goldTrim = mat(0xfacc15);
        const crimson = mat(0x991b1b);
        const skin = mat(0xd49e7a);
        addBox(0.50, 1.08, 0.32, robe, 0, 0.72, 0);
        addBox(0.62, 0.24, 0.36, crimson, 0, 0.96, -0.08);
        addBox(0.52, 0.12, 0.34, goldTrim, 0, 0.84, 0);
        addBox(0.46, 0.50, 0.46, skin, 0, 1.50, 0);
        addBox(0.50, 0.30, 0.50, robe, 0, 1.66, 0.02); // Blue hood
        addBox(0.52, 0.08, 0.52, goldTrim, 0, 1.54, 0.02);
        addBox(0.11, 0.20, 0.12, skin, 0, 1.43, -0.27);
        addQuadLegs(0.18, 0.36, 0.12, 0.0, robe);
        break;
      }
      case 'allay': {
        name = 'Allay (Peri Dost)';
        flyingMob = true; width = 0.5; height = 0.75; hp = 20; speed = 2.4;
        const spirit = mat(0x38bdf8);
        const glow = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
        const wingM = mat(0xbae6fd, { transparent: true, opacity: 0.78 });
        addBox(0.34, 0.34, 0.34, spirit, 0, 0.54, 0);
        addBox(0.24, 0.32, 0.20, spirit, 0, 0.24, 0);
        addBox(0.08, 0.08, 0.04, glow, -0.08, 0.54, -0.18);
        addBox(0.08, 0.08, 0.04, glow, 0.08, 0.54, -0.18);
        const wl = addBox(0.38, 0.05, 0.22, wingM, -0.28, 0.36, 0.08);
        const wr = addBox(0.38, 0.05, 0.22, wingM, 0.28, 0.36, 0.08);
        limbs.push(wl, wr);
        break;
      }
      case 'happy_ghast': {
        name = 'Mutlu Ghast (Sağ Tık Uçan Binek!)';
        rideable = true; flyingMob = true; width = 2.2; height = 2.2; hp = 30; speed = 2.4;
        const cloud = mat(0xf8fafc);
        const harness = mat(0x7c2d12);
        const goggle = mat(0x38bdf8);
        const smile = mat(0x334155);
        addBox(2.0, 2.0, 2.0, cloud, 0, 1.4, 0);
        addBox(2.06, 0.22, 2.06, harness, 0, 2.15, 0);
        addBox(1.10, 0.14, 1.10, harness, 0, 2.45, 0); // Saddle pad
        addBox(0.42, 0.26, 0.08, goggle, -0.48, 2.16, -1.04);
        addBox(0.42, 0.26, 0.08, goggle, 0.48, 2.16, -1.04);
        addBox(0.34, 0.14, 0.06, smile, -0.48, 1.66, -1.02);
        addBox(0.34, 0.14, 0.06, smile, 0.48, 1.66, -1.02);
        addBox(0.56, 0.12, 0.06, smile, 0, 1.32, -1.02);
        for (let tx = -0.64; tx <= 0.65; tx += 0.64) {
          for (let tz = -0.55; tz <= 0.56; tz += 0.55) {
            const tent = addBox(0.18, 0.85, 0.18, cloud, tx, 0.05, tz);
            limbs.push(tent);
          }
        }
        break;
      }
      case 'nautilus': {
        name = 'Nautilus (Sağ Tık Su Bineği!)';
        rideable = true; width = 1.05; height = 1.05; hp = 24; speed = 2.2;
        const shell = mat(0xfb923c);
        const cream = mat(0xfef3c7);
        const hood = mat(0xc2410c);
        const tentM = mat(0xfdba74);
        addBox(0.76, 0.86, 0.92, shell, 0, 0.56, 0.08);
        addBox(0.80, 0.26, 0.46, cream, 0, 0.72, 0.18);
        addBox(0.68, 0.22, 0.56, hood, 0, 0.86, -0.22);
        addBox(0.54, 0.42, 0.36, cream, 0, 0.48, -0.46);
        for (let ti = -1; ti <= 1; ti++) {
          const t = addBox(0.12, 0.12, 0.36, tentM, ti * 0.18, 0.36, -0.74);
          limbs.push(t);
        }
        break;
      }
      case 'cat': {
        name = 'Kedi (Evcilleştirilebilir)';
        width = 0.5; height = 0.65; hp = 12; speed = 2.1;
        // #15823 / #15824: 5 Distinct Natural Cat Coat Variants + Tamed Collar!
        const catVariants: Array<[number, number, number]> = [
          [0x1e293b, 0xf8fafc, 0x4ade80], // Tuxedo
          [0xea580c, 0xfef3c7, 0x84cc16], // Ginger Tabby
          [0xf8fafc, 0xd97706, 0x38bdf8], // Calico
          [0xe7e5e4, 0x44403c, 0x60a5fa], // Siamese
          [0xf1f5f9, 0xffffff, 0xfacc15]  // Snow White
        ];
        const cv = catVariants[this.nextId % catVariants.length];
        const fur = mat(cv[0]);
        const socks = mat(cv[1]);
        const eyes = new THREE.MeshBasicMaterial({ color: cv[2] });
        const collarMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });
        addQuadLegs(0.10, 0.22, 0.11, 0.22, socks);
        addBox(0.30, 0.26, 0.62, fur, 0, 0.34, 0);
        extraPart = addBox(0.33, 0.29, 0.08, collarMat, 0, 0.36, -0.26);
        extraPart.visible = false; // Visible once tamed!
        addBox(0.28, 0.26, 0.28, fur, 0, 0.46, -0.38);
        addBox(0.16, 0.10, 0.08, socks, 0, 0.40, -0.53);
        addBox(0.07, 0.06, 0.04, eyes, -0.07, 0.48, -0.53);
        addBox(0.07, 0.06, 0.04, eyes, 0.07, 0.48, -0.53);
        addBox(0.08, 0.10, 0.06, fur, -0.09, 0.62, -0.36);
        addBox(0.08, 0.10, 0.06, fur, 0.09, 0.62, -0.36);
        addBox(0.08, 0.08, 0.44, fur, 0, 0.42, 0.48);
        break;
      }
      case 'frog': {
        name = 'Kurbağa';
        width = 0.55; height = 0.5; hp = 10; speed = 1.65;
        const skin = mat(0xd97706);
        const belly = mat(0xfef08a);
        addBox(0.46, 0.28, 0.48, skin, 0, 0.22, 0);
        addBox(0.40, 0.10, 0.42, belly, 0, 0.12, -0.02);
        addBox(0.12, 0.12, 0.12, skin, -0.14, 0.40, -0.14);
        addBox(0.12, 0.12, 0.12, skin, 0.14, 0.40, -0.14);
        addQuadLegs(0.12, 0.14, 0.22, 0.18, skin);
        break;
      }
      case 'goat': {
        name = 'Dağ Keçisi';
        neutral = true; width = 0.8; height = 1.3; hp = 14; attackDmg = 4; speed = 1.85;
        const coat = mat(0xf1f5f9);
        const horn = mat(0x57534e);
        addQuadLegs(0.16, 0.44, 0.18, 0.30, horn);
        addBox(0.54, 0.54, 0.88, coat, 0, 0.68, 0);
        addBox(0.36, 0.38, 0.46, coat, 0, 0.92, -0.52);
        addBox(0.12, 0.20, 0.08, coat, 0, 0.66, -0.62); // Beard
        addBox(0.08, 0.30, 0.08, horn, -0.11, 1.20, -0.44);
        addBox(0.08, 0.30, 0.08, horn, 0.11, 1.20, -0.44);
        break;
      }
      case 'axolotl': {
        name = 'Aksolotl';
        width = 0.6; height = 0.45; hp = 14; speed = 1.75;
        const pink = mat(0xf9a8d4);
        const gill = mat(0xdb2777);
        addQuadLegs(0.09, 0.14, 0.18, 0.20, pink);
        addBox(0.36, 0.22, 0.64, pink, 0, 0.22, 0);
        addBox(0.40, 0.24, 0.32, pink, 0, 0.24, -0.42);
        addBox(0.12, 0.22, 0.06, gill, -0.26, 0.28, -0.36);
        addBox(0.12, 0.22, 0.06, gill, 0.26, 0.28, -0.36);
        addBox(0.10, 0.20, 0.44, gill, 0, 0.22, 0.50);
        break;
      }
      case 'strider': {
        name = 'Lav Gezgini (Sağ Tık Lavda Bin!)';
        rideable = true; width = 0.9; height = 1.65; hp = 24; speed = 2.05;
        const crimson = mat(0xb91c1c);
        const basalt = mat(0x3f3f46);
        const bristle = mat(0xe2e8f0);
        const saddleM = mat(0x7c3f1d);
        for (const lx of [-0.24, 0.24]) {
          const lp = new THREE.Group();
          lp.position.set(lx, 0.86, 0);
          addBox(0.22, 0.86, 0.22, basalt, 0, -0.43, 0, lp);
          group.add(lp);
          limbs.push(lp);
        }
        addBox(0.84, 0.72, 0.84, crimson, 0, 1.18, 0);
        addBox(0.58, 0.12, 0.56, saddleM, 0, 1.56, 0); // 3D Riding Saddle Pad
        addBox(0.22, 0.08, 0.52, bristle, -0.50, 1.38, 0);
        addBox(0.22, 0.08, 0.52, bristle, 0.50, 1.38, 0);
        break;
      }
      case 'wither_skeleton': {
        name = 'Wither İskeleti';
        hostile = true; width = 0.75; height = 2.35; hp = 26; attackDmg = 6; speed = 2.1;
        const { rightArm, hScale } = addBipedLimbs(0x1f2937, 0x111827, 0x1f2937, false, true);
        attachMobWeapon(rightArm, ITEM.STONE_SWORD, -0.54 * hScale);
        break;
      }
      case 'pillager': {
        name = 'Yağmacı';
        hostile = true; hp = 24; attackDmg = 5; speed = 1.9;
        const { rightArm } = addBipedLimbs(0x3f3f46, 0x94a3b8, 0x18181b, true, false);
        attachMobWeapon(rightArm, ITEM.CROSSBOW, -0.46);
        break;
      }
      case 'witch': {
        name = 'Cadı';
        hostile = true; hp = 26; attackDmg = 5; speed = 1.65;
        const robe = mat(0x4c1d95);
        const hat = mat(0x1e1b4b);
        const greenBand = mat(0x22c55e);
        const skin = mat(0xa3b18a);
        addQuadLegs(0.18, 0.36, 0.12, 0.0, robe);
        addBox(0.48, 1.06, 0.30, robe, 0, 0.72, 0);
        addBox(0.46, 0.48, 0.46, skin, 0, 1.48, 0);
        addBox(0.11, 0.20, 0.12, skin, 0, 1.40, -0.27);
        addBox(0.72, 0.08, 0.72, hat, 0, 1.74, 0);
        addBox(0.44, 0.28, 0.44, hat, 0, 1.90, 0);
        addBox(0.46, 0.08, 0.46, greenBand, 0, 1.80, 0);
        addBox(0.24, 0.26, 0.24, hat, 0, 2.14, 0.04);
        break;
      }
      case 'breeze': {
        name = 'Breeze (Rüzgar Muhafızı)';
        hostile = true; flyingMob = true; width = 0.75; height = 1.75; hp = 30; attackDmg = 4; speed = 2.6;
        const core = mat(0x38bdf8);
        const vortex = mat(0xe0f2fe, { transparent: true, opacity: 0.76 });
        const brow = mat(0x0c4a6e);
        addBox(0.48, 0.48, 0.48, core, 0, 1.34, 0);
        addBox(0.52, 0.12, 0.10, brow, 0, 1.46, -0.22);
        const ring = new THREE.Group();
        ring.position.set(0, 0.76, 0);
        for (let r = 0; r < 4; r++) {
          const a = (r / 4) * Math.PI * 2;
          addBox(0.18, 0.72, 0.18, vortex, Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38, ring);
        }
        group.add(ring);
        limbs.push(ring);
        break;
      }
      case 'creaking': {
        name = 'Creaking (Bakınca Donar!)';
        hostile = true; width = 0.75; height = 2.55; hp = 36; attackDmg = 6; speed = 3.2;
        const bark = mat(0x3f3a34);
        const moss = mat(0x52525b);
        const resin = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        for (const lx of [-0.16, 0.18]) {
          const lp = new THREE.Group();
          lp.position.set(lx, 1.05, 0);
          addBox(0.16, 1.05, 0.16, bark, 0, -0.52, 0, lp);
          group.add(lp);
          limbs.push(lp);
        }
        addBox(0.44, 0.88, 0.26, bark, 0.04, 1.48, 0);
        addBox(0.20, 0.26, 0.28, resin, 0.04, 1.50, 0); // Glowing Creaking Heart core
        addBox(0.42, 0.56, 0.40, moss, -0.06, 2.18, 0);
        addBox(0.09, 0.09, 0.05, resin, -0.16, 2.26, -0.21);
        addBox(0.09, 0.09, 0.05, resin, 0.06, 2.18, -0.21);
        addBox(0.09, 0.09, 0.05, resin, -0.05, 2.34, -0.21);
        for (const ax of [-0.34, 0.38]) {
          const ap = new THREE.Group();
          ap.position.set(ax, 1.84, 0);
          addBox(0.15, 1.02, 0.15, bark, 0, -0.50, 0, ap);
          group.add(ap);
          limbs.push(ap);
        }
        break;
      }
      case 'warden': {
        name = 'Warden (Antik Derinlik Boss)';
        hostile = true; width = 1.35; height = 2.9; hp = 100; attackDmg = 12; speed = 2.05;
        const sculk = mat(0x0f2933);
        const bone = mat(0xd6d3be);
        const soul = new THREE.MeshBasicMaterial({ color: 0x2dd4bf });
        addQuadLegs(0.34, 0.92, 0.28, 0, sculk);
        addBox(1.12, 1.15, 0.62, sculk, 0, 1.48, 0);
        addBox(0.56, 0.62, 0.64, soul, 0, 1.48, 0); // Glowing soul-core chest
        addBox(0.86, 0.72, 0.64, sculk, 0, 2.40, 0);
        addBox(0.32, 0.26, 0.10, soul, -0.56, 2.58, 0); // Acoustic sensor antlers
        addBox(0.32, 0.26, 0.10, soul, 0.56, 2.58, 0);
        for (const ax of [-0.74, 0.74]) {
          const ap = new THREE.Group();
          ap.position.set(ax, 1.96, 0);
          addBox(0.34, 1.42, 0.34, sculk, 0, -0.68, 0, ap);
          addBox(0.36, 0.22, 0.36, bone, 0, -0.35, 0, ap);
          group.add(ap);
          limbs.push(ap);
        }
        break;
      }
      case 'wither': {
        name = 'Wither Boss';
        hostile = true; flyingMob = true; width = 1.6; height = 2.6; hp = 150; attackDmg = 9; speed = 2.15;
        const witherBone = mat(0x18181b);
        const aura = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        addBox(0.24, 1.25, 0.24, witherBone, 0, 1.10, 0); // Spine
        for (let rib = 0; rib < 3; rib++) {
          addBox(0.88, 0.12, 0.36, witherBone, 0, 0.85 + rib * 0.28, 0);
        }
        addBox(1.38, 0.18, 0.24, witherBone, 0, 1.76, 0); // Shoulder bar
        addBox(0.56, 0.56, 0.56, witherBone, 0, 2.14, 0); // Center skull
        addBox(0.42, 0.42, 0.42, witherBone, -0.68, 2.02, 0); // Left skull
        addBox(0.42, 0.42, 0.42, witherBone, 0.68, 2.02, 0); // Right skull
        addBox(0.32, 0.08, 0.05, aura, 0, 2.18, -0.29);
        addBox(0.24, 0.07, 0.05, aura, -0.68, 2.06, -0.22);
        addBox(0.24, 0.07, 0.05, aura, 0.68, 2.06, -0.22);
        break;
      }
      case 'shulker': {
        name = 'Shulker';
        hostile = true; width = 0.98; height = 1.0; hp = 30; attackDmg = 4; speed = 0.0;
        const shell = mat(0x9333ea);
        const core = mat(0xfef08a);
        addBox(0.96, 0.48, 0.96, shell, 0, 0.24, 0);
        const lid = addBox(0.96, 0.52, 0.96, shell, 0, 0.76, 0);
        addBox(0.42, 0.42, 0.42, core, 0, 0.48, 0);
        limbs.push(lid);
        break;
      }
      case 'sulfur_cube': {
        name = 'Kükürt Küpü (26.3)';
        hostile = true;
        const s = 0.46 * slimeSize;
        width = s; height = s; hp = slimeSize * slimeSize * 5; attackDmg = slimeSize * 2 + 1; speed = 1.75;
        const outer = mat(0xf59e0b, { transparent: true, opacity: 0.78 });
        const core = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        addBox(s, s, s, outer, 0, s / 2, 0);
        addBox(s * 0.58, s * 0.58, s * 0.58, core, 0, s / 2, 0);
        break;
      }
    }

    group.position.set(x, y, z);
    this.scene.add(group);

    const mob: MobEntity = {
      id: this.nextId++,
      species,
      name,
      dim,
      hostile,
      neutral,
      rideable,
      flyingMob,
      width,
      height,
      hp,
      maxHp: hp,
      attackDmg,
      speed,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.random() * Math.PI * 2,
      targetYaw: Math.random() * Math.PI * 2,
      group,
      limbs,
      tintMats,
      baseColors,
      extraPart,
      aiTimer: 1 + Math.random() * 2.5,
      attackCooldown: 0,
      hurtTimer: 0,
      deathTimer: 0,
      dead: false,
      walking: false,
      phase: Math.random() * 6,
      slimeSize
    };
    this.mobs.push(mob);
    return mob;
  }

  // Raycast against all living mobs + Ender Dragon within `maxDist`!
  public raycastMob(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number, dim: DimensionId): MobEntity | 'dragon' | null {
    let bestMob: MobEntity | 'dragon' | null = null;
    let bestT = maxDist;

    // Check Ender Dragon in The End
    if (dim === 'end' && this.dragon.active && !this.dragon.defeated) {
      const t = intersectRayAABB(
        ox, oy, oz, dx, dy, dz,
        this.dragon.x - 2.6, this.dragon.y - 1.4, this.dragon.z - 3.6,
        this.dragon.x + 2.6, this.dragon.y + 1.8, this.dragon.z + 3.6
      );
      if (t !== null && t < bestT) {
        bestT = t;
        bestMob = 'dragon';
      }
    }

    for (const m of this.mobs) {
      if (m.dead || m.deathTimer > 0 || m.dim !== dim || m === this.mountedMob) continue;
      const hw = m.width * 0.55;
      const t = intersectRayAABB(
        ox, oy, oz, dx, dy, dz,
        m.x - hw, m.y, m.z - hw,
        m.x + hw, m.y + m.height, m.z + hw
      );
      if (t !== null && t < bestT) {
        bestT = t;
        bestMob = m;
      }
    }
    return bestMob;
  }

  public strikeTarget(
    target: MobEntity | 'dragon',
    damage: number,
    knockDx: number,
    knockDz: number,
    isCrit: boolean,
    world: WorldManager,
    sound: SoundEngine,
    fromPlayer = true
  ) {
    if (target === 'dragon') {
      if (this.dragon.defeated) return;
      this.dragon.hp = Math.max(0, this.dragon.hp - damage);
      this.dragon.hurtTimer = 0.25;
      sound.playHurt();
      if (isCrit) world.spawnBlockDebris(Math.floor(this.dragon.x), Math.floor(this.dragon.y), Math.floor(this.dragon.z), BLOCK.GOLD_BLOCK);
      if (this.dragon.hp <= 0) {
        this.defeatEnderDragon(world, sound);
        this.onDragonDefeated?.();
      }
      return;
    }

    // 100% Friendly-Fire & Provocation Immunity: Named Tempest Allies & Tamed Pets NEVER take player damage or turn hostile!
    if (fromPlayer && (target.ally || target.tamed)) {
      return;
    }

    if (target.dead || target.deathTimer > 0 || (target.hurtImmunity || 0) > 0) return;

    // #15356 Sulfur Cube natural size armor & #14987 Shulker closed-shell +20 armor!
    let effectiveDmg = damage;
    if (target.species === 'sulfur_cube') {
      effectiveDmg = Math.max(1, damage - (target.slimeSize || 1) * 1.5);
    } else if (target.species === 'shulker' && !target.shulkerOpen) {
      effectiveDmg = Math.max(1, damage * 0.35);
    }

    target.hp -= effectiveDmg;
    target.hurtTimer = 0.25;
    target.hurtImmunity = 0.20;
    if (target.species === 'camel' && target.sitting) {
      target.sitting = false; // #14767 Camel stands immediately when hurt!
    }
    if (target.species !== 'shulker') {
      target.vx += knockDx * 5.2;
      target.vy = Math.max(target.vy, 4.2);
      target.vz += knockDz * 5.2;
    }
    if (!target.ally && !target.tamed && target.neutral) {
      target.provoked = true;
    }
    sound.playHurt();

    if (isCrit) {
      world.spawnBlockDebris(Math.floor(target.x), Math.floor(target.y + target.height * 0.6), Math.floor(target.z), BLOCK.GOLD_BLOCK);
    }

    // Command ALL loyal Tempest allies & tamed wolves in the same dimension to focus-fire the player's target!
    if (fromPlayer && !target.ally && !target.tamed) {
      for (const w of this.mobs) {
        if ((w.ally || (w.species === 'wolf' && w.tamed)) && !w.sitting && w !== target && w.dim === target.dim) {
          w.attackTarget = target;
          w.targetYaw = Math.atan2(-(target.x - w.x), -(target.z - w.z));
        }
      }
    }

    // Enderman defensive blink after taking non-lethal melee hit (only for hostile Endermen)
    if (!target.ally && target.hp > 0 && target.species === 'enderman' && Math.random() < 0.42) {
      const tx = target.x + (Math.random() - 0.5) * 10;
      const tz = target.z + (Math.random() - 0.5) * 10;
      if (world.isChunkLoadedAt(tx, tz)) {
        target.x = tx;
        target.z = tz;
        target.y = world.getSafeSurfaceY(tx, tz);
        sound.playPortal();
      }
    }

    if (target.hp <= 0) {
      target.deathTimer = 0.45; // #15517 clean tip-over animation!
      if (this.mountedMob === target) this.mountedMob = null;
      this.dropMobLoot(target, world);
      this.onMobKilled?.(target);
    }
  }

  // Sword Sweep Cleave (#15810 parity): damages nearby hostile/provoked mobs around primary target (spares allies)!
  public sweepStrike(
    primary: MobEntity | 'dragon',
    baseDamage: number,
    lookDx: number,
    lookDz: number,
    world: WorldManager,
    sound: SoundEngine
  ) {
    if (primary === 'dragon') return;
    const sweepDmg = Math.max(1, Math.round(baseDamage * 0.45));
    for (const m of this.mobs) {
      if (m === primary || m.dead || m.deathTimer > 0 || m.dim !== primary.dim) continue;
      if (m.ally || m.tamed) continue;
      if (!m.hostile && !m.provoked) continue;
      const d = Math.hypot(m.x - primary.x, m.z - primary.z);
      if (d <= 2.15 && Math.abs(m.y - primary.y) <= 1.2) {
        this.strikeTarget(m, sweepDmg, lookDx * 0.7, lookDz * 0.7, false, world, sound, true);
      }
    }
  }

  // Horizon 26.3 `mace.rs` Smash Shockwave (`KNOCKBACK_RADIUS = 3.5`): blasts nearby enemies radially (spares allies)!
  public maceSmashWave(
    cx: number,
    cy: number,
    cz: number,
    dim: DimensionId,
    primary: MobEntity | 'dragon',
    world: WorldManager,
    sound: SoundEngine
  ) {
    sound.playExplosion();
    world.spawnBlockDebris(Math.floor(cx), Math.floor(cy), Math.floor(cz), BLOCK.STONE);
    for (const m of this.mobs) {
      if (m === primary || m.dead || m.deathTimer > 0 || m.dim !== dim || m.ally || m.tamed) continue;
      const dx = m.x - cx;
      const dz = m.z - cz;
      const dist = Math.hypot(dx, dz);
      if (dist <= 3.5 && Math.abs(m.y - cy) <= 2.2) {
        const inv = 1 / Math.max(0.25, dist);
        const strength = (3.5 - dist) * 2.4;
        m.vx += dx * inv * strength;
        m.vy = Math.max(m.vy, 5.2);
        m.vz += dz * inv * strength;
      }
    }
  }

  // Horizon 26.3 `falling_damage.rs`: Falling Anvil crushes mobs in landing block!
  public crushEntitiesAt(
    ax: number,
    ay: number,
    az: number,
    dmg: number,
    dim: DimensionId,
    world: WorldManager,
    sound: SoundEngine
  ): number {
    if (dmg <= 0) return 0;
    let hitCount = 0;
    const cx = ax + 0.5;
    const cz = az + 0.5;
    for (const m of this.mobs) {
      if (m.dead || m.deathTimer > 0 || m.dim !== dim) continue;
      if (
        Math.abs(m.x - cx) < 0.75 &&
        Math.abs(m.z - cz) < 0.75 &&
        m.y <= ay + 1.05 &&
        m.y + m.height >= ay - 0.15
      ) {
        this.strikeTarget(m, dmg, 0, 0, true, world, sound);
        hitCount++;
      }
    }
    return hitCount;
  }

  // Horizon 26.3 `wind.rs`: Wind Charge burst launches nearby non-allied mobs skyward & radially!
  public windBurstWave(cx: number, cy: number, cz: number, dim: DimensionId) {
    for (const m of this.mobs) {
      if (m.dead || m.deathTimer > 0 || m.dim !== dim || m.ally || m.tamed) continue;
      const dx = m.x - cx;
      const dz = m.z - cz;
      const dist = Math.hypot(dx, dz);
      if (dist <= 3.8 && Math.abs(m.y + m.height * 0.5 - cy) <= 2.6) {
        const inv = 1 / Math.max(0.3, dist);
        const strength = (3.8 - dist) * 2.6;
        m.vx += dx * inv * strength;
        m.vy = Math.max(m.vy, 7.8);
        m.vz += dz * inv * strength;
      }
    }
  }

  // #15790 / #14114: Blast wave damage from End Crystal / TNT / Skill explosions (spares named Tempest allies)!
  public explosionDamageAt(
    cx: number,
    cy: number,
    cz: number,
    radius: number,
    maxDamage: number,
    dim: DimensionId,
    world: WorldManager,
    sound: SoundEngine
  ) {
    if (dim === 'end' && this.dragon.active && !this.dragon.defeated) {
      const dd = Math.hypot(this.dragon.x - cx, this.dragon.y - cy, this.dragon.z - cz);
      if (dd <= radius + 4.0) {
        const dmg = Math.max(4, Math.round(maxDamage * (1 - dd / (radius + 5.0))));
        this.strikeTarget('dragon', dmg, 0, 0, true, world, sound, true);
      }
    }
    for (const m of this.mobs) {
      if (m.dead || m.deathTimer > 0 || m.dim !== dim || m.ally || m.tamed) continue;
      const dx = m.x - cx;
      const dy = m.y + m.height * 0.5 - cy;
      const dz = m.z - cz;
      const dist = Math.hypot(dx, dy, dz);
      if (dist <= radius) {
        const falloff = 1 - dist / (radius + 0.5);
        const dmg = Math.max(2, Math.round(maxDamage * falloff));
        const hLen = Math.hypot(dx, dz) || 1;
        this.strikeTarget(m, dmg, (dx / hLen) * (1.2 + falloff), (dz / hLen) * (1.2 + falloff), false, world, sound, true);
      }
    }
  }

  // Horizon 26.3 `spear.rs`: Couched Spear kinetic charge automatically impales enemies ahead at high speed!
  public spearChargeStrike(
    px: number,
    eyeY: number,
    pz: number,
    dx: number,
    dy: number,
    dz: number,
    dmg: number,
    dim: DimensionId,
    world: WorldManager,
    sound: SoundEngine
  ): boolean {
    const target = this.raycastMob(px, eyeY, pz, dx, dy, dz, 3.85, dim);
    if (!target) return false;
    if (target !== 'dragon' && (target.ally || target.tamed || target.hurtTimer > 0.05)) return false;
    if (target === 'dragon' && this.dragon.hurtTimer > 0.05) return false;
    const hLen = Math.hypot(dx, dz) || 1;
    this.strikeTarget(target, dmg, (dx / hLen) * 1.4, (dz / hLen) * 1.4, true, world, sound, true);
    return true;
  }

  private defeatEnderDragon(world: WorldManager, sound: SoundEngine) {
    this.dragon.defeated = true;
    this.dragon.active = false;
    this.dragon.group.visible = false;
    sound.playExplosion();
    sound.playXp(true);

    // P1 #13 Fix: Use exact End fountain basin floor height instead of central bedrock pillar top!
    const basinY = sampleColumnInfo(0, 0, 'end').height;
    world.spawnXpOrbs(0.5, basinY + 2.5, 0.5, 120);
    world.spawnItemDrop(0.5, basinY + 2.2, 1.5, { id: ITEM.TOTEM_OF_UNDYING, count: 1 }, 0.4);

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        world.setBlock(dx, basinY + 1, dz, BLOCK.END_PORTAL, false);
        this.onWorldBlockChange?.(dx, basinY + 1, dz, BLOCK.END_PORTAL);
      }
    }
    world.setBlock(0, basinY + 5, 0, BLOCK.DRAGON_EGG, true);
    this.onWorldBlockChange?.(0, basinY + 5, 0, BLOCK.DRAGON_EGG);
    this.onToast?.('ENDER EJDERHASI YENİLDİ! End Geçidi ve Ejderha Yumurtası merkez kürsüde açıldı!', '#d8b4fe');
  }

  private dropMobLoot(m: MobEntity, world: WorldManager) {
    world.spawnXpOrbs(m.x, m.y + 0.4, m.z, m.hostile ? 6 : 3);
    const drop = (id: number, count = 1) => world.spawnItemDrop(m.x, m.y + 0.35, m.z, { id, count });

    switch (m.species) {
      case 'sheep':
        if (!m.sheared) drop(BLOCK.WOOL_WHITE, 1);
        drop(ITEM.RAW_BEEF, 1);
        break;
      case 'cow':
        drop(ITEM.RAW_BEEF, 2);
        drop(ITEM.LEATHER, 1 + Math.floor(Math.random() * 2));
        break;
      case 'pig':
        drop(ITEM.RAW_BEEF, 2);
        break;
      case 'chicken':
        drop(ITEM.ARROW, 2);
        break;
      case 'skeleton':
        drop(ITEM.BONE, 2);
        drop(ITEM.ARROW, 3);
        break;
      case 'creeper':
      case 'ghast':
        drop(ITEM.GUNPOWDER, 2);
        break;
      case 'spider':
        drop(ITEM.STRING, 2);
        break;
      case 'enderman':
        drop(ITEM.ENDER_PEARL, 1);
        break;
      case 'zombie':
      case 'husk':
        if (Math.random() < 0.35) drop(ITEM.IRON_INGOT, 1);
        else drop(ITEM.APPLE, 1);
        break;
      case 'slime': {
        const curSize = m.slimeSize || 1;
        if (curSize > 1) {
          // #15825 / #15472: Split into 2..4 quadrant children with independent yaws
          const nextSize = curSize - 1;
          const off = curSize * 0.22;
          const count = 2 + Math.floor(Math.random() * 3);
          const quads: Array<[number, number]> = [[-off, -off], [off, -off], [-off, off], [off, off]];
          for (let q = 0; q < count; q++) {
            const [qx, qz] = quads[q % 4];
            const child = this.spawnMob('slime', m.x + qx, m.y + 0.15, m.z + qz, m.dim, nextSize);
            child.yaw = Math.random() * Math.PI * 2;
            child.targetYaw = child.yaw;
            if (m.ally) this.recruitAsTempestAlly(child, m.name, false);
          }
        } else {
          drop(BLOCK.SLIME_BLOCK, 1);
        }
        break;
      }
      case 'blaze':
        drop(BLOCK.GLOWSTONE, 2);
        break;
      case 'piglin':
      case 'zombified_piglin':
        drop(ITEM.GOLD_INGOT, 1);
        break;
      case 'iron_golem':
        drop(ITEM.IRON_INGOT, 4);
        break;
      case 'copper_golem':
        drop(ITEM.COPPER_INGOT, 2);
        break;
      case 'snow_golem':
        drop(ITEM.SNOWBALL, 6);
        break;
      case 'wither':
        world.spawnXpOrbs(m.x, m.y + 0.6, m.z, 80);
        drop(ITEM.TOTEM_OF_UNDYING, 1);
        drop(ITEM.NETHERITE_INGOT, 1);
        drop(ITEM.DIAMOND, 3);
        break;
      case 'warden':
        world.spawnXpOrbs(m.x, m.y + 0.6, m.z, 50);
        drop(ITEM.TOTEM_OF_UNDYING, 1);
        drop(ITEM.DIAMOND, 2);
        drop(ITEM.AMETHYST_SHARD, 4);
        break;
      case 'breeze':
        drop(ITEM.WIND_CHARGE, 3);
        break;
      case 'creaking':
        drop(ITEM.AMETHYST_SHARD, 2);
        drop(BLOCK.CHERRY_LOG, 2);
        break;
      case 'wither_skeleton':
        drop(ITEM.COAL, 2);
        drop(ITEM.BONE, 2);
        break;
      case 'pillager':
        drop(ITEM.ARROW, 5);
        drop(ITEM.EMERALD, 1);
        if (Math.random() < 0.22) drop(ITEM.CROSSBOW, 1); // #15490 Pillager crossbow drop
        break;
      case 'witch':
        drop(BLOCK.GLOWSTONE, 2);
        drop(ITEM.SWEET_BERRIES, 2);
        break;
      case 'shulker':
        drop(ITEM.ENDER_PEARL, 2);
        drop(BLOCK.HORIZON_PURPUR, 2);
        break;
      case 'sulfur_cube': {
        const curSize = m.slimeSize || 1;
        if (curSize > 1) {
          const nextSize = curSize - 1;
          const off = curSize * 0.22;
          const count = 2 + Math.floor(Math.random() * 3);
          const quads: Array<[number, number]> = [[-off, -off], [off, -off], [-off, off], [off, off]];
          for (let q = 0; q < count; q++) {
            const [qx, qz] = quads[q % 4];
            const child = this.spawnMob('sulfur_cube', m.x + qx, m.y + 0.15, m.z + qz, m.dim, nextSize);
            child.yaw = Math.random() * Math.PI * 2;
            child.targetYaw = child.yaw;
            if (m.ally) this.recruitAsTempestAlly(child, m.name, false);
          }
        } else {
          drop(ITEM.GUNPOWDER, 2);
          drop(ITEM.GOLD_INGOT, 1);
        }
        break;
      }
      case 'goat':
        drop(ITEM.LEATHER, 1);
        break;
      case 'strider':
        drop(ITEM.STRING, 2);
        break;
      case 'frog':
        drop(BLOCK.SLIME_BLOCK, 1);
        break;
    }
  }

  // Right-Click Interaction with Mobs (Villager/Trader Trade, Wolf/Cat Taming, Sheep Shearing, Mounts, Piglin Barter!)
  public interactWithMob(
    mob: MobEntity,
    heldStack: ItemStack | null,
    consumeHeldOne: () => void,
    world: WorldManager,
    sound: SoundEngine,
    damageTool?: () => void
  ): boolean {
    if (mob.species === 'villager' || mob.species === 'wandering_trader') {
      sound.playClick();
      this.onOpenVillagerTrade?.(mob);
      return true;
    }

    if (mob.species === 'sheep' && heldStack?.id === ITEM.SHEARS && !mob.sheared) {
      mob.sheared = true;
      if (mob.extraPart) mob.extraPart.visible = false;
      world.spawnItemDrop(mob.x, mob.y + 0.6, mob.z, { id: BLOCK.WOOL_WHITE, count: 2 });
      damageTool?.();
      sound.playBreak('wool');
      return true;
    }

    if (mob.species === 'snow_golem' && heldStack?.id === ITEM.SHEARS && !mob.sheared) {
      mob.sheared = true;
      if (mob.extraPart) mob.extraPart.visible = false;
      world.spawnItemDrop(mob.x, mob.y + 1.2, mob.z, { id: BLOCK.CARVED_PUMPKIN, count: 1 });
      damageTool?.();
      sound.playBreak('wood');
      this.onToast?.('Kar Goleminin bal kabağı maskesi kırpıldı!', '#fde047');
      return true;
    }

    if (mob.species === 'iron_golem' && heldStack?.id === ITEM.IRON_INGOT && mob.hp < mob.maxHp) {
      consumeHeldOne();
      mob.hp = Math.min(mob.maxHp, mob.hp + 25);
      sound.playPlace('metal');
      this.onToast?.(`Demir Golem onarıldı (${mob.hp}/${mob.maxHp} Can).`, '#4ade80');
      return true;
    }

    if (mob.species === 'wolf') {
      if (heldStack?.id === ITEM.BONE && !mob.tamed) {
        consumeHeldOne();
        mob.tamed = true;
        mob.sitting = false;
        mob.provoked = false;
        mob.hp = 24;
        mob.maxHp = 24;
        if (mob.extraPart) mob.extraPart.visible = true;
        sound.playXp(true);
        this.onToast?.('Kurt evcilleştirildi! Sağ tık ile Otur/Takip Et emri verebilirsiniz.', '#4ade80');
        return true;
      }
      if (
        mob.tamed &&
        mob.hp < mob.maxHp &&
        (heldStack?.id === ITEM.RAW_BEEF || heldStack?.id === ITEM.COOKED_STEAK)
      ) {
        consumeHeldOne();
        mob.hp = Math.min(mob.maxHp, mob.hp + 8);
        sound.playEat();
        this.onToast?.(`Kurt beslendi (${mob.hp}/${mob.maxHp} Can).`, '#4ade80');
        return true;
      }
      if (mob.tamed) {
        mob.sitting = !mob.sitting;
        if (mob.sitting) mob.attackTarget = null;
        sound.playClick();
        this.onToast?.(mob.sitting ? 'Kurt oturuyor (beklemede).' : 'Kurt ayağa kalktı, sizi takip ediyor!', '#a9a9ff');
        return true;
      }
    }

    if (mob.species === 'cat') {
      const catFood =
        heldStack?.id === ITEM.RAW_BEEF ||
        heldStack?.id === ITEM.COOKED_STEAK ||
        heldStack?.id === ITEM.SWEET_BERRIES;
      if (catFood && !mob.tamed) {
        consumeHeldOne();
        mob.tamed = true;
        mob.sitting = false;
        mob.hp = 16;
        mob.maxHp = 16;
        if (mob.extraPart) mob.extraPart.visible = true;
        sound.playXp(true);
        this.onToast?.('Kedi evcilleştirildi! Sağ tık ile Otur/Takip Et emri verebilirsiniz.', '#4ade80');
        return true;
      }
      if (catFood && mob.tamed && mob.hp < mob.maxHp) {
        consumeHeldOne();
        mob.hp = Math.min(mob.maxHp, mob.hp + 6);
        sound.playEat();
        this.onToast?.(`Kedi beslendi (${mob.hp}/${mob.maxHp} Can).`, '#4ade80');
        return true;
      }
      if (mob.tamed) {
        mob.sitting = !mob.sitting;
        sound.playClick();
        this.onToast?.(mob.sitting ? 'Kedi kıvrılıp oturdu.' : 'Kedi sizi takip ediyor!', '#a9a9ff');
        return true;
      }
    }

    if (mob.species === 'allay') {
      if (heldStack?.id === ITEM.AMETHYST_SHARD && !mob.tamed) {
        consumeHeldOne();
        mob.tamed = true;
        mob.sitting = false;
        sound.playXp(true);
        this.onToast?.('Allay dostunuz oldu! Sizi takip edip yenilenme aurası verecek.', '#38bdf8');
        return true;
      }
      if (mob.tamed) {
        mob.sitting = !mob.sitting;
        sound.playClick();
        this.onToast?.(mob.sitting ? 'Allay bu noktada süzülerek bekleyecek.' : 'Allay yeniden yanınızda uçuyor!', '#38bdf8');
        return true;
      }
    }

    if (mob.species === 'piglin' && heldStack?.id === ITEM.GOLD_INGOT) {
      consumeHeldOne();
      sound.playXp(false);
      const roll = Math.random();
      const reward: ItemStack =
        roll < 0.28 ? { id: ITEM.ENDER_PEARL, count: 2 } :
          roll < 0.55 ? { id: BLOCK.OBSIDIAN, count: 4 } :
            roll < 0.80 ? { id: BLOCK.CRYING_OBSIDIAN, count: 3 } : { id: ITEM.ARROW, count: 12 };
      world.spawnItemDrop(mob.x, mob.y + 0.9, mob.z, reward);
      this.onToast?.('Piglin altın külçesini inceledi ve size takas eşyası attı!', '#facc15');
      return true;
    }

    if (mob.rideable) {
      // #15774: Cannot board Strider while its eyes are submerged in Lava!
      if (
        mob.species === 'strider' &&
        this.mountedMob !== mob &&
        isLavaBlock(world.getBlock(Math.floor(mob.x), Math.floor(mob.y + 1.45), Math.floor(mob.z)))
      ) {
        this.onToast?.('Lav Gezgini lavın altına gömülüyken binilemez!', '#fca5a5');
        return true;
      }
      if (mob.sitting) mob.sitting = false;
      this.mountedMob = this.mountedMob === mob ? null : mob;
      sound.playStep('wood');
      if (this.mountedMob) {
        const label =
          mob.species === 'happy_ghast'
            ? 'Mutlu Ghast\'a bindiniz! Gökyüzünde Zıpla/Eğil ile yükselip alçalın'
            : mob.species === 'nautilus'
              ? 'Nautilus\'a bindiniz! Suda hızla yüzün'
              : mob.species === 'strider'
                ? 'Lav Gezgini\'ne bindiniz! Lavların üzerinde güvenle yürüyün'
                : mob.species === 'camel'
                  ? 'Deveye bindiniz! Boşluk ile ileri atılabilirsiniz'
                  : 'Ata bindiniz! Boşluk ile engellerden zıplayabilirsiniz';
        this.onToast?.(`${label} (İnmek için Shift / EĞİL).`, '#a9a9ff');
      }
      return true;
    }

    if (mob.ally) {
      const allyFood =
        heldStack?.id === ITEM.RAW_BEEF ||
        heldStack?.id === ITEM.COOKED_STEAK ||
        heldStack?.id === ITEM.BREAD ||
        heldStack?.id === ITEM.APPLE ||
        heldStack?.id === ITEM.GOLDEN_APPLE ||
        heldStack?.id === ITEM.SWEET_BERRIES ||
        heldStack?.id === ITEM.BONE;
      if (allyFood && mob.hp < mob.maxHp) {
        consumeHeldOne();
        mob.hp = Math.min(mob.maxHp, mob.hp + 18);
        sound.playEat();
        this.onToast?.(`★ ${mob.name} beslendi (${Math.ceil(mob.hp)}/${mob.maxHp} Can).`, '#4ade80');
        return true;
      }
      mob.sitting = !mob.sitting;
      if (mob.sitting) mob.attackTarget = null;
      sound.playClick();
      this.onToast?.(
        mob.sitting
          ? `★ ${mob.name} bu noktada nöbet tutuyor (${Math.ceil(mob.hp)}/${mob.maxHp} Can).`
          : `★ ${mob.name} emrinizde! Sizi takip ediyor ve düşmanlara saldıracak.`,
        '#fde047'
      );
      return true;
    }

    return false;
  }

  public checkProjectileHit(proj: ActiveProjectile, world: WorldManager, sound: SoundEngine): boolean {
    if (world.dimension === 'end' && this.dragon.active && !this.dragon.defeated) {
      if (
        Math.abs(proj.x - this.dragon.x) < 2.8 &&
        Math.abs(proj.y - this.dragon.y) < 1.8 &&
        Math.abs(proj.z - this.dragon.z) < 3.6
      ) {
        this.strikeTarget('dragon', proj.damage + 2, 0, 0, false, world, sound, proj.fromPlayer);
        return true;
      }
    }

    for (const m of this.mobs) {
      if (m.dead || m.deathTimer > 0 || m.dim !== world.dimension) continue;
      if ((proj.fromPlayer || proj.friendlyToPlayer) && (m.ally || m.tamed)) continue;
      if (proj.friendlyToPlayer && !proj.fromPlayer && !m.hostile && !m.provoked) continue;
      if (m.species === 'enderman' && !m.ally && this.timeStopTimer <= 0 && (m.frozenTimer || 0) <= 0) {
        if (Math.hypot(proj.x - m.x, proj.z - m.z) < 1.1 && proj.y >= m.y && proj.y <= m.y + m.height) {
          // Wild unfrozen Enderman dodges projectiles by teleporting!
          m.x += (Math.random() - 0.5) * 12;
          m.z += (Math.random() - 0.5) * 12;
          m.y = world.getSafeSurfaceY(m.x, m.z);
          sound.playPortal();
          return false;
        }
      }
      const hw = m.width * 0.6;
      if (Math.abs(proj.x - m.x) < hw && proj.y >= m.y && proj.y <= m.y + m.height && Math.abs(proj.z - m.z) < hw) {
        // #14987: Closed Shulker shell deflects arrows!
        if (m.species === 'shulker' && !m.shulkerOpen && proj.kind === 'arrow') {
          sound.playHitBlock('stone');
          return true;
        }
        const len = Math.hypot(proj.vx, proj.vz) || 1;
        const finalDmg = proj.kind === 'snowball' && m.species === 'blaze' ? 6 : proj.damage;
        this.strikeTarget(m, finalDmg, proj.vx / len, proj.vz / len, false, world, sound, proj.fromPlayer);
        return true;
      }
    }
    return false;
  }

  public update(
    dt: number,
    world: WorldManager,
    projectiles: ProjectileManager,
    sound: SoundEngine,
    playerX: number,
    playerY: number,
    playerZ: number,
    timeOfDay: number,
    isCreative: boolean,
    lookDx = 0,
    lookDy = 0,
    lookDz = -1,
    wearingCarvedPumpkin = false,
    isMusicPlaying = false,
    isRaining = false
  ) {
    const dim = world.dimension;
    const isNight = dim === 'overworld' && (timeOfDay > 0.54 && timeOfDay < 0.96);
    if (this.timeStopTimer > 0) {
      this.timeStopTimer = Math.max(0, this.timeStopTimer - dt);
    }
    projectiles.timeStopActive = this.timeStopTimer > 0;

    // 1. Update Ender Dragon Boss in The End! (Frozen in Suspended World during Yog-Sothoth Time Stop!)
    this.dragon.active = dim === 'end' && !this.dragon.defeated;
    this.dragon.group.visible = this.dragon.active;
    if (this.dragon.active && this.timeStopTimer <= 0) {
      this.updateDragon(dt, world, playerX, playerY, playerZ);
    }

    // 2. Dynamic Biome & Dimension Spawner (lightweight cap for zero draw-call lag)
    this.spawnClock += dt;
    if (this.spawnClock >= 4.2) {
      this.spawnClock = 0;
      let activeCount = 0;
      for (let i = 0; i < this.mobs.length; i++) {
        if (this.mobs[i].dim === dim && !this.mobs[i].dead) activeCount++;
      }
      if (activeCount < 15) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 20;
        const sx = playerX + Math.cos(ang) * dist;
        const sz = playerZ + Math.sin(ang) * dist;
        if (world.isChunkLoadedAt(sx, sz)) {
          const sy = world.getSafeSurfaceY(sx, sz);
          const biome = world.getBiomeAt(sx, sz);
          let sp: MobSpecies = 'sheep';

          if (dim === 'nether') {
            const pool: MobSpecies[] = [
              'piglin',
              'zombified_piglin',
              'wither_skeleton',
              'strider',
              'sulfur_cube',
              'blaze',
              'ghast'
            ];
            sp = pool[Math.floor(Math.random() * pool.length)];
          } else if (dim === 'end') {
            sp = Math.random() < 0.72 ? 'enderman' : 'shulker';
          } else if (isNight && Math.hypot(sx, sz) > 19) {
            const hostiles: MobSpecies[] =
              biome === 'Altın Çöl'
                ? ['husk', 'skeleton', 'pillager', 'spider', 'creeper', 'breeze', 'enderman']
                : ['zombie', 'skeleton', 'creeper', 'spider', 'pillager', 'witch', 'breeze', 'creaking', 'slime', 'enderman'];
            sp = hostiles[Math.floor(Math.random() * hostiles.length)];
          } else {
            if (isWaterBlock(world.getBlock(Math.floor(sx), Math.floor(sy - 0.35), Math.floor(sz)))) {
              sp = Math.random() < 0.6 ? 'nautilus' : 'axolotl';
            } else if (biome === 'Altın Çöl') sp = 'camel';
            else if (biome === 'Karlı Zirveler') {
              const r = Math.random();
              sp = r < 0.42 ? 'goat' : r < 0.72 ? 'polar_bear' : 'wolf';
            } else if (biome === 'Kiraz Korusu') {
              const r = Math.random();
              sp = r < 0.35 ? 'allay' : r < 0.68 ? 'bee' : 'fox';
            } else {
              const passives: MobSpecies[] = ['sheep', 'cow', 'pig', 'chicken', 'horse', 'wolf', 'cat', 'frog'];
              sp = passives[Math.floor(Math.random() * passives.length)];
            }
          }

          const flyOffset = sp === 'ghast' || sp === 'blaze' || sp === 'happy_ghast' || sp === 'wither' ? 6 : 0;
          const randCubeSize = sp === 'slime' || sp === 'sulfur_cube' ? 1 + Math.floor(Math.random() * 3) : 2;
          this.spawnMob(sp, sx, sy + flyOffset, sz, dim, randCubeSize);
        }
      }
    }

    // 3. Update Individual Mobs
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      m.group.visible = m.dim === dim;
      if (m.dim !== dim) continue;

      if (m.hurtImmunity && m.hurtImmunity > 0) {
        m.hurtImmunity = Math.max(0, m.hurtImmunity - dt);
      }

      // P1 #14 + P0 #3 Fix: Void safety despawn + full GPU disposal!
      if (m.y < -20) {
        if (this.mountedMob === m) this.mountedMob = null;
        this.scene.remove(m.group);
        disposeMobGroup(m.group);
        this.mobs.splice(i, 1);
        continue;
      }

      // Despawn very distant wild mobs (preserve named Tempest allies, tamed companions, NPCs, showcase mounts & bosses!)
      const distPlayer = Math.hypot(playerX - m.x, playerZ - m.z);
      if (
        distPlayer > 88 &&
        !m.ally &&
        !m.tamed &&
        m.species !== 'villager' &&
        m.species !== 'wandering_trader' &&
        m.species !== 'iron_golem' &&
        m.species !== 'copper_golem' &&
        m.species !== 'snow_golem' &&
        m.species !== 'happy_ghast' &&
        m.species !== 'wither' &&
        m.species !== 'warden'
      ) {
        this.scene.remove(m.group);
        disposeMobGroup(m.group);
        this.mobs.splice(i, 1);
        continue;
      }

      // Death tip-over animation (#15517 fix) + GPU disposal (#P0 #3)
      if (m.deathTimer > 0) {
        m.deathTimer -= dt;
        m.group.rotation.z = Math.min(Math.PI / 2, (1 - m.deathTimer / 0.45) * (Math.PI / 2));
        if (m.deathTimer <= 0) {
          m.dead = true;
          this.scene.remove(m.group);
          disposeMobGroup(m.group);
          this.mobs.splice(i, 1);
        }
        continue;
      }

      // Red hurt flash or Status Tint (Frozen / Samael Corrosion / Time Stop)
      if (m.hurtTimer > 0) {
        m.hurtTimer = Math.max(0, m.hurtTimer - dt);
      }
      const isFriendlyMob = Boolean(m.ally || m.tamed);
      if (!isFriendlyMob && (m.poisonTimer || 0) > 0) {
        m.poisonTimer = Math.max(0, (m.poisonTimer || 0) - dt);
        m.poisonTick = (m.poisonTick || 0) - dt;
        if (m.poisonTick <= 0) {
          m.poisonTick = 0.65;
          m.hurtImmunity = 0;
          this.strikeTarget(m, 6, 0, 0, false, world, sound, false);
          if (m.deathTimer > 0) continue;
        }
      }
      if (!isFriendlyMob && (m.frozenTimer || 0) > 0 && this.timeStopTimer <= 0) {
        m.frozenTimer = Math.max(0, (m.frozenTimer || 0) - dt);
      }

      const activeTint =
        m.hurtTimer > 0
          ? 0xff4444
          : !isFriendlyMob && this.timeStopTimer > 0
            ? 0x7dd3fc
            : !isFriendlyMob && (m.frozenTimer || 0) > 0
              ? 0x67e8f9
              : !isFriendlyMob && (m.poisonTimer || 0) > 0
                ? 0xc084fc
                : -1;
      for (let k = 0; k < m.tintMats.length; k++) {
        m.tintMats[k].color.setHex(activeTint >= 0 ? activeTint : m.baseColors[k]);
      }

      if (!world.isChunkLoadedAt(m.x, m.z)) continue;

      if (m.spawnSnapPending) {
        m.y = world.getSafeSurfaceY(m.x, m.z);
        m.spawnSnapPending = false;
      }

      // Yog-Sothoth Time Stop & Velzard Absolute Zero: Completely freeze all non-allied enemies!
      if (!isFriendlyMob && (this.timeStopTimer > 0 || (m.frozenTimer || 0) > 0)) {
        m.walking = false;
        m.group.position.set(m.x, m.y, m.z);
        m.group.rotation.y = m.yaw;
        continue;
      }

      const footBid = world.getBlock(Math.floor(m.x), Math.floor(m.y + 0.2), Math.floor(m.z));

      // #14004 / #15317: Mobs standing in Lava Cauldron or harmful Lava take fire damage
      const fireImmune =
        m.ally ||
        m.species === 'strider' ||
        m.species === 'sulfur_cube' ||
        m.species === 'blaze' ||
        m.species === 'ghast' ||
        m.species === 'wither_skeleton' ||
        m.species === 'zombified_piglin' ||
        m.species === 'wither';
      if (!fireImmune && (footBid === BLOCK.CAULDRON_LAVA || isLavaBlock(footBid))) {
        m.hazardTick = (m.hazardTick || 0) - dt;
        if (m.hazardTick <= 0) {
          m.hazardTick = 0.65;
          this.strikeTarget(m, 2, 0, 0, false, world, sound, false);
          continue;
        }
      }

      // #15335 / #15660: Happy Ghast & Named Tempest Allies regenerate passively!
      if (m.ally && m.hp < m.maxHp) {
        m.hp = Math.min(m.maxHp, m.hp + 2.0 * dt);
      } else if (m.species === 'happy_ghast' && m.hp < m.maxHp) {
        const regenRate = m.y >= 72 ? 1.5 : 0.3;
        m.hp = Math.min(m.maxHp, m.hp + regenRate * dt);
      }

      // Undead sunlight burn (#15077: Named Tempest Allies, Rain/Thunder, Powder Snow & Water shield Zombies/Skeletons!)
      if (!m.ally && !isNight && !isRaining && dim === 'overworld' && (m.species === 'zombie' || m.species === 'skeleton')) {
        const inCool = isWaterBlock(footBid) || footBid === BLOCK.POWDER_SNOW;
        if (!inCool && !hasSolidRoofAbove(world, m.x, m.y, m.z) && Math.random() < dt * 0.65) {
          this.strikeTarget(m, 2, 0, 0, false, world, sound, false);
          continue;
        }
      }

      // Enderman eye-contact provocation in Survival (NEVER triggers for named Tempest Allies!)
      if (
        !m.ally &&
        !m.tamed &&
        m.species === 'enderman' &&
        !m.provoked &&
        !isCreative &&
        !wearingCarvedPumpkin &&
        distPlayer < 26 &&
        distPlayer > 1.5
      ) {
        const ex = m.x - playerX;
        const ey = (m.y + 2.45) - (playerY + 1.62);
        const ez = m.z - playerZ;
        const el = Math.hypot(ex, ey, ez) || 1;
        const dot = (ex * lookDx + ey * lookDy + ez * lookDz) / el;
        if (dot > 0.988) {
          m.provoked = true;
          sound.playPortal();
        }
      }

      // If mounted by player, player controls movement directly in main.ts!
      if (this.mountedMob === m) {
        m.sitting = false;
        m.group.rotation.x = 0;
        m.group.position.set(m.x, m.y, m.z);
        m.group.rotation.y = m.yaw;
        m.phase += dt * 9;
        for (let k = 0; k < m.limbs.length; k++) {
          m.limbs[k].rotation.x = Math.sin(m.phase + (k % 2) * Math.PI) * 0.55;
        }
        continue;
      }

      // Distant AI & Draw-Call Culling: hide & freeze idle mobs past 54m so off-screen entities cost 0 WebGL draw calls!
      if (distPlayer > 54 && !m.ally && !m.tamed && m.hurtTimer <= 0 && m.species !== 'wither' && m.species !== 'warden') {
        m.group.visible = false;
        continue;
      }

      m.attackCooldown = Math.max(0, m.attackCooldown - dt);
      let creakingFrozen = false;

      // Allay musical aura & #12452 / #14911 Jukebox dance!
      if (m.species === 'allay') {
        if (isMusicPlaying && distPlayer < 24) {
          m.walking = false;
          m.yaw += dt * 8.5;
          m.targetYaw = m.yaw;
        } else if (m.sitting) {
          m.walking = false;
        } else if ((m.ally || m.tamed || distPlayer < 14) && distPlayer > 3.0) {
          m.targetYaw = Math.atan2(-(playerX - m.x), -(playerZ - m.z));
          m.walking = true;
        } else {
          this.wanderTick(m, dt);
        }
        if (distPlayer < 9.5 && m.attackCooldown <= 0) {
          m.attackCooldown = m.ally ? 4.0 : 7.0;
          this.onPlayerHeal?.(m.ally ? 2 : 1);
        }
      } else if (m.species === 'cat' && m.tamed && !m.ally) {
        if (m.sitting) {
          m.walking = false;
        } else if (distPlayer > 18) {
          const safeY = world.getSafeSurfaceY(playerX + 1.4, playerZ - 1.4);
          if (safeY > 2) {
            m.x = playerX + 1.4;
            m.z = playerZ - 1.4;
            m.y = safeY;
          }
        } else if (distPlayer > 3.2) {
          m.targetYaw = Math.atan2(-(playerX - m.x), -(playerZ - m.z));
          m.walking = true;
        } else {
          m.walking = false;
        }
      } else if (m.ally || (m.species === 'wolf' && m.tamed)) {
        // ====================================================================
        // UNIVERSAL LOYAL JURA TEMPEST BODYGUARD AI (NEVER ATTACKS PLAYER!)
        // Protects player, hunts nearby hostile/provoked enemies (melee & ranged),
        // follows smoothly, and teleports beside player if left behind!
        // ====================================================================
        if (
          m.attackTarget &&
          (m.attackTarget.dead ||
            m.attackTarget.deathTimer > 0 ||
            m.attackTarget.dim !== dim ||
            m.attackTarget.ally ||
            m.attackTarget.tamed)
        ) {
          m.attackTarget = null;
        }

        if (!m.attackTarget) {
          let nearEnemy: MobEntity | null = null;
          let bestDist = 22.0;
          for (let j = 0; j < this.mobs.length; j++) {
            const other = this.mobs[j];
            if (
              other !== m &&
              !other.ally &&
              !other.tamed &&
              (other.hostile || other.provoked) &&
              other.dim === dim &&
              !other.dead &&
              other.deathTimer <= 0
            ) {
              const dToPlayer = Math.hypot(other.x - playerX, other.z - playerZ);
              const dToSelf = Math.hypot(other.x - m.x, other.z - m.z);
              const score = Math.min(dToPlayer, dToSelf);
              if (score < bestDist) {
                bestDist = score;
                nearEnemy = other;
              }
            }
          }
          m.attackTarget = nearEnemy;
        }

        const isRangedAlly =
          m.species === 'skeleton' ||
          m.species === 'pillager' ||
          m.species === 'blaze' ||
          m.species === 'ghast' ||
          m.species === 'wither' ||
          m.species === 'breeze' ||
          m.species === 'witch' ||
          m.species === 'shulker' ||
          m.species === 'snow_golem';

        if (m.sitting) {
          m.walking = false;
          // Guard turret mode: ranged allies still snipe enemies while holding position!
          if (isRangedAlly && m.attackTarget) {
            const td = Math.hypot(m.attackTarget.x - m.x, m.attackTarget.z - m.z);
            if (td < 18 && m.attackCooldown <= 0) {
              m.targetYaw = Math.atan2(-(m.attackTarget.x - m.x), -(m.attackTarget.z - m.z));
              m.attackCooldown = 1.35;
              const dx = m.attackTarget.x - m.x;
              const dy = (m.attackTarget.y + m.attackTarget.height * 0.55) - (m.y + 1.25);
              const dz = m.attackTarget.z - m.z;
              const l = Math.hypot(dx, dy, dz) || 1;
              const allyDmg = Math.max(8, m.attackDmg || 8);
              if (m.species === 'blaze' || m.species === 'ghast' || m.species === 'wither') {
                projectiles.shootFireball(m.x, m.y + 1.25, m.z, dx / l, dy / l, dz / l, allyDmg, true);
              } else if (m.species === 'breeze') {
                projectiles.shootWindCharge(m.x, m.y + 1.2, m.z, dx / l, dy / l + 0.03, dz / l, 24, false, true);
              } else {
                projectiles.shootArrow(m.x, m.y + 1.32, m.z, dx / l, dy / l + 0.04, dz / l, 26, false, allyDmg, true);
                sound.playBow();
              }
            }
          }
        } else if (m.attackTarget && distPlayer < 30) {
          const tgt = m.attackTarget;
          const td = Math.hypot(tgt.x - m.x, tgt.z - m.z);
          m.targetYaw = Math.atan2(-(tgt.x - m.x), -(tgt.z - m.z));
          const allyDmg = Math.max(8, m.attackDmg || 8);

          if (isRangedAlly) {
            m.walking = td > 9.0;
            if (td < 18.5 && m.attackCooldown <= 0) {
              m.attackCooldown = 1.35;
              const dx = tgt.x - m.x;
              const dy = (tgt.y + tgt.height * 0.55) - (m.y + 1.25);
              const dz = tgt.z - m.z;
              const l = Math.hypot(dx, dy, dz) || 1;
              if (m.species === 'blaze' || m.species === 'ghast' || m.species === 'wither') {
                projectiles.shootFireball(m.x, m.y + 1.25, m.z, dx / l, dy / l, dz / l, allyDmg, true);
              } else if (m.species === 'breeze') {
                projectiles.shootWindCharge(m.x, m.y + 1.2, m.z, dx / l, dy / l + 0.03, dz / l, 24, false, true);
              } else {
                projectiles.shootArrow(m.x, m.y + 1.32, m.z, dx / l, dy / l + 0.04, dz / l, 26, false, allyDmg, true);
                sound.playBow();
              }
            }
          } else {
            // Allied Enderman shadow-blinks directly onto distant enemies!
            if (m.species === 'enderman' && td > 6.5 && m.attackCooldown <= 0) {
              m.x = tgt.x - Math.sin(m.targetYaw) * 1.1;
              m.z = tgt.z - Math.cos(m.targetYaw) * 1.1;
              m.y = world.getSafeSurfaceY(m.x, m.z);
              sound.playPortal();
            }
            m.walking = td > 1.35;
            if (td < 2.15 && m.attackCooldown <= 0) {
              m.attackCooldown = 0.78;
              const kl = Math.max(0.1, td);
              tgt.hurtImmunity = 0;
              this.strikeTarget(tgt, allyDmg, (tgt.x - m.x) / kl, (tgt.z - m.z) / kl, true, world, sound, false);
              if (m.species === 'iron_golem') tgt.vy = 9.0;
            }
          }
        } else if (distPlayer > 24) {
          const angOff = (m.id % 6) * (Math.PI / 3);
          const tx = playerX + Math.cos(angOff) * 2.2;
          const tz = playerZ + Math.sin(angOff) * 2.2;
          const safeY = world.getSafeSurfaceY(tx, tz);
          if (safeY > 2) {
            m.x = tx;
            m.z = tz;
            m.y = safeY + (m.flyingMob ? 2.2 : 0);
            m.vx = 0;
            m.vz = 0;
          }
        } else if (distPlayer > 3.8) {
          m.targetYaw = Math.atan2(-(playerX - m.x), -(playerZ - m.z));
          m.walking = true;
        } else {
          m.walking = false;
        }
      } else if (m.species === 'iron_golem') {
        // Wild Village Iron Golem hunts nearby hostiles!
        let nearestHostile: MobEntity | null = null;
        let nearD = 16;
        for (let j = 0; j < this.mobs.length; j++) {
          const other = this.mobs[j];
          if (other.hostile && !other.ally && other.dim === dim && other.deathTimer <= 0) {
            const hd = Math.hypot(other.x - m.x, other.z - m.z);
            if (hd < nearD) { nearD = hd; nearestHostile = other; }
          }
        }
        if (nearestHostile) {
          m.targetYaw = Math.atan2(-(nearestHostile.x - m.x), -(nearestHostile.z - m.z));
          m.walking = true;
          if (nearD < 2.2 && m.attackCooldown <= 0) {
            m.attackCooldown = 1.1;
            this.strikeTarget(nearestHostile, 14, 0, 0, true, world, sound, false);
            nearestHostile.vy = 9.5; // Signature Golem skyward toss!
          }
        } else {
          this.wanderTick(m, dt);
        }
      } else if (m.species === 'snow_golem') {
        // Snow Golem (`golems.rs`): Pelts nearby hostile mobs with snowballs!
        let nearestHostile: MobEntity | null = null;
        let nearD = 16;
        for (let j = 0; j < this.mobs.length; j++) {
          const other = this.mobs[j];
          if (other.hostile && !other.ally && other.dim === dim && other.deathTimer <= 0) {
            const hd = Math.hypot(other.x - m.x, other.z - m.z);
            if (hd < nearD) { nearD = hd; nearestHostile = other; }
          }
        }
        if (nearestHostile) {
          m.targetYaw = Math.atan2(-(nearestHostile.x - m.x), -(nearestHostile.z - m.z));
          m.walking = nearD > 9.0;
          if (nearD < 14 && m.attackCooldown <= 0) {
            m.attackCooldown = 1.25;
            const dx = nearestHostile.x - m.x;
            const dy = (nearestHostile.y + nearestHostile.height * 0.6) - (m.y + 1.35);
            const dz = nearestHostile.z - m.z;
            const l = Math.hypot(dx, dy, dz) || 1;
            projectiles.shootSnowball(m.x, m.y + 1.35, m.z, dx / l, dy / l + 0.04, dz / l, false, true, 2);
            sound.playStep('snow');
          }
        } else {
          this.wanderTick(m, dt);
        }
        // #15778: Snow Golem frosts grass blocks beneath it into SNOW_GRASS as it strolls!
        if (m.walking && dim === 'overworld' && Math.random() < dt * 0.45) {
          const gx = Math.floor(m.x), gy = Math.floor(m.y - 0.12), gz = Math.floor(m.z);
          if (world.getBlock(gx, gy, gz) === BLOCK.GRASS) {
            world.setBlock(gx, gy, gz, BLOCK.SNOW_GRASS, false);
            this.onWorldBlockChange?.(gx, gy, gz, BLOCK.SNOW_GRASS);
          }
        }
      } else if (m.species === 'copper_golem') {
        this.wanderTick(m, dt);
        // Copper Golem (`copper_golems.rs`): Whimsically flips nearby trapdoors!
        if (m.attackCooldown <= 0 && Math.random() < dt * 0.25) {
          const gx = Math.floor(m.x), gy = Math.floor(m.y), gz = Math.floor(m.z);
          for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
            const bid = world.getBlock(gx + ox, gy, gz + oz);
            if (bid === BLOCK.OAK_TRAPDOOR_CLOSED || bid === BLOCK.OAK_TRAPDOOR_OPEN) {
              const nextT = bid === BLOCK.OAK_TRAPDOOR_CLOSED ? BLOCK.OAK_TRAPDOOR_OPEN : BLOCK.OAK_TRAPDOOR_CLOSED;
              world.setBlock(gx + ox, gy, gz + oz, nextT, false);
              this.onWorldBlockChange?.(gx + ox, gy, gz + oz, nextT);
              sound.playClick();
              m.attackCooldown = 6.0;
              break;
            }
          }
        }
      } else if (m.species === 'shulker' && !m.ally && !m.tamed) {
        m.walking = false;
        const alert = !isCreative && distPlayer < 18;
        m.shulkerOpen = alert;
        if (m.limbs[0]) {
          const targetLid = alert ? 0.98 : 0.76;
          m.limbs[0].position.y += (targetLid - m.limbs[0].position.y) * Math.min(1, dt * 8);
        }
        if (alert) {
          m.targetYaw = Math.atan2(-(playerX - m.x), -(playerZ - m.z));
          if (m.attackCooldown <= 0) {
            m.attackCooldown = 2.6;
            const dx = playerX - m.x;
            const dy = (playerY + 1.1) - (m.y + 0.75);
            const dz = playerZ - m.z;
            const l = Math.hypot(dx, dy, dz) || 1;
            projectiles.shootSnowball(m.x, m.y + 0.75, m.z, dx / l, dy / l + 0.04, dz / l, false, false, 4);
            sound.playPortal();
          }
        }
      } else if (
        !m.ally &&
        !m.tamed &&
        (m.hostile || m.provoked) &&
        !isCreative &&
        distPlayer < (m.species === 'wither' ? 32 : m.species === 'warden' ? 28 : 22)
      ) {
        // Hostile AI Pursuit, Creeper Fuse, Creaking Gaze-Freeze, Bosses & Ranged Attacks!
        if (m.species === 'creaking') {
          const cx = m.x - playerX;
          const cy = (m.y + 1.55) - (playerY + 1.62);
          const cz = m.z - playerZ;
          const cl = Math.hypot(cx, cy, cz) || 1;
          const gazeDot = (cx * lookDx + cy * lookDy + cz * lookDz) / cl;
          if (gazeDot > 0.58) {
            // 26.3 Creaking freezes completely into an immovable statue while observed!
            m.walking = false;
            creakingFrozen = true;
          } else {
            m.targetYaw = Math.atan2(-(playerX - m.x), -(playerZ - m.z));
            m.walking = distPlayer > 1.3;
            if (distPlayer < 1.75 && Math.abs(playerY - m.y) < 2.0 && m.attackCooldown <= 0) {
              m.attackCooldown = 0.95;
              const kLen = Math.max(0.1, distPlayer);
              this.onPlayerDamage?.(m.attackDmg, m.name, (playerX - m.x) / kLen, (playerZ - m.z) / kLen);
            }
          }
        } else {
          m.targetYaw = Math.atan2(-(playerX - m.x), -(playerZ - m.z));

          if (m.species === 'creeper') {
            if (distPlayer < 3.2) {
              m.walking = false;
              const prevFuse = m.fuseTimer || 0;
              if (prevFuse === 0) sound.playFuse();
              m.fuseTimer = prevFuse + dt;
              const flash = Math.floor(m.fuseTimer * 12) % 2 === 0;
              for (let k = 0; k < m.tintMats.length; k++) {
                m.tintMats[k].color.setHex(flash ? 0xffffff : m.baseColors[k]);
                m.tintMats[k].emissive.setHex(flash ? 0xdbeafe : 0x000000);
              }
              m.group.scale.setScalar(1 + m.fuseTimer * 0.18);
              if (m.fuseTimer >= 1.5) {
                world.igniteTnt(Math.floor(m.x), Math.floor(m.y), Math.floor(m.z), true, 0.05);
                this.scene.remove(m.group);
                disposeMobGroup(m.group);
                this.mobs.splice(i, 1);
                continue;
              }
            } else {
              if ((m.fuseTimer || 0) > 0) {
                for (let k = 0; k < m.tintMats.length; k++) {
                  m.tintMats[k].emissive.setHex(0x000000);
                }
              }
              m.fuseTimer = Math.max(0, (m.fuseTimer || 0) - dt);
              m.group.scale.setScalar(1);
              m.walking = true;
            }
          } else if (m.species === 'skeleton' || m.species === 'pillager') {
            m.walking = distPlayer > 9.5;
            if (distPlayer < 16 && m.attackCooldown <= 0) {
              m.attackCooldown = m.species === 'pillager' ? 2.5 : 2.4;
              const dx = playerX - m.x;
              const dy = (playerY + 1.1) - (m.y + 1.3);
              const dz = playerZ - m.z;
              const l = Math.hypot(dx, dy, dz) || 1;
              projectiles.shootArrow(
                m.x,
                m.y + 1.35,
                m.z,
                dx / l,
                dy / l + 0.05,
                dz / l,
                m.species === 'pillager' ? 24 : 20,
                false,
                m.species === 'pillager' ? 5 : 4
              );
              sound.playBow();
            }
          } else if (m.species === 'witch') {
            m.walking = distPlayer > 8.5;
            if (m.hp < m.maxHp * 0.65 && m.attackCooldown <= 0 && Math.random() < 0.35) {
              m.hp = Math.min(m.maxHp, m.hp + 5);
              m.attackCooldown = 3.0;
              sound.playEat();
            } else if (distPlayer < 14 && m.attackCooldown <= 0) {
              m.attackCooldown = 2.7;
              const dx = playerX - m.x;
              const dy = (playerY + 1.1) - (m.y + 1.35);
              const dz = playerZ - m.z;
              const l = Math.hypot(dx, dy, dz) || 1;
              projectiles.shootSnowball(m.x, m.y + 1.35, m.z, dx / l, dy / l + 0.06, dz / l, false, false, 4);
              sound.playSplash();
            }
          } else if (m.species === 'breeze') {
            m.walking = distPlayer > 7.5;
            if (distPlayer < 18 && m.attackCooldown <= 0) {
              m.attackCooldown = 2.25;
              const dx = playerX - m.x;
              const dy = (playerY + 1.0) - (m.y + 1.2);
              const dz = playerZ - m.z;
              const l = Math.hypot(dx, dy, dz) || 1;
              projectiles.shootWindCharge(m.x, m.y + 1.2, m.z, dx / l, dy / l + 0.03, dz / l, 22, false, false);
              sound.playRiptide();
            }
          } else if (m.species === 'blaze' || m.species === 'ghast' || m.species === 'wither') {
            m.walking = distPlayer > (m.species === 'wither' ? 10 : 12);
            if (distPlayer < (m.species === 'wither' ? 28 : 22) && m.attackCooldown <= 0) {
              m.attackCooldown = m.species === 'wither' ? 2.0 : 2.8;
              const dx = playerX - m.x;
              const dy = (playerY + 1.0) - (m.y + (m.species === 'wither' ? 1.55 : 1.1));
              const dz = playerZ - m.z;
              const l = Math.hypot(dx, dy, dz) || 1;
              projectiles.shootFireball(
                m.x,
                m.y + (m.species === 'wither' ? 1.55 : 1.1),
                m.z,
                dx / l,
                dy / l,
                dz / l,
                m.attackDmg
              );
            }
          } else if (m.species === 'warden') {
            m.walking = distPlayer > 1.85;
            if (distPlayer < 2.2 && Math.abs(playerY - m.y) < 2.4 && m.attackCooldown <= 0) {
              m.attackCooldown = 1.25;
              const kLen = Math.max(0.1, distPlayer);
              this.onPlayerDamage?.(m.attackDmg, m.name, ((playerX - m.x) / kLen) * 1.4, ((playerZ - m.z) / kLen) * 1.4);
            } else if (distPlayer >= 3.2 && distPlayer < 13.5 && m.attackCooldown <= 0) {
              m.attackCooldown = 3.8;
              const kLen = Math.max(0.1, distPlayer);
              sound.playPortal();
              this.onPlayerDamage?.(6, 'Warden Sonik Patlama', ((playerX - m.x) / kLen) * 1.6, ((playerZ - m.z) / kLen) * 1.6);
            }
          } else {
            m.walking = distPlayer > 1.35;
            if (distPlayer < 1.65 && Math.abs(playerY - m.y) < 1.8 && m.attackCooldown <= 0) {
              m.attackCooldown = 1.1;
              const kLen = Math.max(0.1, distPlayer);
              this.onPlayerDamage?.(m.attackDmg, m.name, (playerX - m.x) / kLen, (playerZ - m.z) / kLen);
            }
          }
        }
      } else {
        this.wanderTick(m, dt);
      }

      // Soft Entity-Entity Push Separation (#15852: capped to maxCollisions = 4 per mob per tick)
      let pushCount = 0;
      for (let j = i - 1; j >= 0; j--) {
        const other = this.mobs[j];
        if (other.dim !== dim || other.dead || other.deathTimer > 0) continue;
        const sepX = m.x - other.x;
        const sepZ = m.z - other.z;
        const minR = (m.width + other.width) * 0.46;
        const d2 = sepX * sepX + sepZ * sepZ;
        if (d2 > 0.0001 && d2 < minR * minR && Math.abs(m.y - other.y) < 1.3) {
          const d = Math.sqrt(d2);
          const push = (minR - d) * 2.5 * dt;
          const px = (sepX / d) * push;
          const pz = (sepZ / d) * push;
          if (!creakingFrozen && !m.sitting && m.species !== 'shulker') {
            m.vx += px * 6;
            m.vz += pz * 6;
          }
          if (!other.sitting && other.species !== 'shulker') {
            other.vx -= px * 6;
            other.vz -= pz * 6;
          }
          if (++pushCount >= 4) break;
        }
      }

      // Smooth Yaw Turn (paused when Creaking is frozen in gaze!)
      if (!creakingFrozen) {
        let dyaw = m.targetYaw - m.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        m.yaw += dyaw * Math.min(1, dt * 5);
      }

      // Physics Integration (Horizontal + Hazard/Cliff Avoidance + Step-Up / Spider Wall-Climb + Gravity)
      const moveX = (m.walking && !creakingFrozen ? -Math.sin(m.yaw) * m.speed : 0) + m.vx;
      const moveZ = (m.walking && !creakingFrozen ? -Math.cos(m.yaw) * m.speed : 0) + m.vz;
      m.vx *= Math.max(0, 1 - dt * 8);
      m.vz *= Math.max(0, 1 - dt * 8);

      if ((m.species === 'slime' || m.species === 'sulfur_cube') && m.walking && m.vy === 0) {
        m.vy = 6.2;
      } else if (m.species === 'frog' && m.walking && m.vy === 0) {
        m.vy = 4.6;
      } else if (m.species === 'goat' && m.walking && m.vy === 0 && Math.random() < dt * 0.25) {
        m.vy = 7.4; // Signature Mountain Goat high leap!
      }

      const nx = m.x + moveX * dt;
      const nz = m.z + moveZ * dt;
      const ix = Math.floor(nx);
      const iz = Math.floor(nz);
      const iy = Math.floor(m.y + 0.1);
      const frontId = world.getBlock(ix, iy, iz);
      const frontPassable = frontId === BLOCK.OAK_DOOR_OPEN || frontId === BLOCK.OAK_TRAPDOOR_OPEN;
      const frontSolid = getBlock(frontId).solid && !frontPassable;

      // Cliff (>3m drop) & Lava avoidance when walking voluntarily on ground (Striders love lava!)
      let cliffOrLavaHazard = false;
      if (m.walking && !m.flyingMob && Math.hypot(m.vx, m.vz) < 1.2) {
        const below1 = world.getBlock(ix, iy - 1, iz);
        const lavaHarmful = m.species !== 'strider' && m.species !== 'sulfur_cube' && m.species !== 'wither_skeleton';
        if ((lavaHarmful && (isLavaBlock(below1) || isLavaBlock(frontId))) || frontId === BLOCK.CAMPFIRE) {
          cliffOrLavaHazard = true;
        } else if (!getBlock(below1).solid && !isWaterBlock(below1) && !(m.species === 'strider' && isLavaBlock(below1))) {
          let foundFloor = false;
          for (let drop = 2; drop <= 4; drop++) {
            const bid = world.getBlock(ix, iy - drop, iz);
            if (lavaHarmful && isLavaBlock(bid)) break;
            if (getBlock(bid).solid || isWaterBlock(bid) || (m.species === 'strider' && isLavaBlock(bid))) {
              foundFloor = true;
              break;
            }
          }
          if (!foundFloor) cliffOrLavaHazard = true;
        }
      }

      if (cliffOrLavaHazard) {
        m.walking = false;
        m.targetYaw += Math.PI * 0.75;
      } else if (!frontSolid || m.flyingMob) {
        m.x = nx;
        m.z = nz;
      } else if (m.species === 'spider') {
        m.vy = 4.2; // Spider climbs walls!
      } else {
        const up1 = world.getBlock(ix, iy + 1, iz);
        const up2 = world.getBlock(ix, iy + 2, iz);
        const upPass1 = !getBlock(up1).solid || up1 === BLOCK.OAK_DOOR_OPEN || up1 === BLOCK.OAK_TRAPDOOR_OPEN;
        const upPass2 = !getBlock(up2).solid || up2 === BLOCK.OAK_DOOR_OPEN || up2 === BLOCK.OAK_TRAPDOOR_OPEN;
        if (upPass1 && upPass2 && frontId !== BLOCK.OAK_FENCE) {
          m.x = nx;
          m.z = nz;
          m.y = iy + getSupportTopOffset(getBlock(frontId)) + 0.02;
        } else {
          m.targetYaw += Math.PI * 0.65;
        }
      }

      if (m.flyingMob) {
        const groundY = world.getSafeSurfaceY(m.x, m.z);
        const hoverAlt =
          m.species === 'bee' || m.species === 'allay'
            ? 1.8
            : m.species === 'breeze'
              ? 1.3
              : m.species === 'happy_ghast'
                ? 4.2
                : 5.5;
        const targetFlyY = groundY + hoverAlt + Math.sin(m.phase * 2) * 0.55;
        m.y += (targetFlyY - m.y) * Math.min(1, dt * 2.5);
        m.phase += dt * 8;
        if ((m.species === 'blaze' || m.species === 'breeze') && m.limbs[0]) {
          m.limbs[0].rotation.y += dt * (m.species === 'breeze' ? 7.5 : 3.5);
        } else {
          for (let k = 0; k < m.limbs.length; k++) {
            m.limbs[k].rotation.z = Math.sin(m.phase * 3 + k) * 0.45;
          }
        }
      } else {
        const prevVy = m.vy;
        m.vy -= 24 * dt;
        const nextY = m.y + m.vy * dt;
        const underCellY = Math.floor(nextY - 0.04);
        const underId = world.getBlock(Math.floor(m.x), underCellY, Math.floor(m.z));
        const under = getBlock(underId);
        const supportY = underCellY + getSupportTopOffset(under);
        if (m.species === 'strider' && isLavaBlock(underId) && nextY <= underCellY + 0.96) {
          m.y = underCellY + 0.92;
          m.vy = 0;
        } else if (under.solid && nextY <= supportY + 0.04) {
          m.y = supportY;
          if (under.bounce && prevVy < -4.5) {
            m.vy = -prevVy * under.bounce; // #15742 Slime/Bed mob bounce!
          } else {
            m.vy = 0;
          }
        } else if (under.liquid) {
          m.vy = m.species === 'nautilus' || m.species === 'axolotl' ? 0.6 * Math.sin(m.phase * 2) : 2.2;
          m.y += m.vy * dt;
        } else {
          m.y = nextY;
        }

        if (m.species !== 'shulker') {
          if (m.sitting && (m.species === 'wolf' || m.species === 'cat')) {
            m.group.rotation.x = -0.32;
            for (let k = 0; k < m.limbs.length; k++) {
              m.limbs[k].rotation.x = k >= 2 ? 0.65 : -0.25;
            }
          } else if (m.sitting && m.species === 'camel') {
            m.group.rotation.x = 0;
            for (let k = 0; k < m.limbs.length; k++) {
              m.limbs[k].rotation.x = k < 2 ? 1.35 : -1.35;
            }
          } else if (m.walking && !creakingFrozen) {
            m.group.rotation.x = 0;
            m.phase += dt * 7.5;
            for (let k = 0; k < m.limbs.length; k++) {
              m.limbs[k].rotation.x = Math.sin(m.phase + (k % 2 === 0 ? 0 : Math.PI)) * 0.55;
            }
          } else {
            m.group.rotation.x = 0;
            for (let k = 0; k < m.limbs.length; k++) {
              m.limbs[k].rotation.x *= 0.84;
            }
          }
        }
      }

      // Regrow sheep wool occasionally on grass
      if (m.species === 'sheep' && m.sheared && Math.random() < dt * 0.025) {
        m.sheared = false;
        if (m.extraPart) m.extraPart.visible = true;
      }

      const sitYOff = m.sitting ? (m.species === 'camel' ? -0.48 : m.species === 'wolf' || m.species === 'cat' ? -0.10 : 0) : 0;
      m.group.position.set(m.x, m.y + sitYOff, m.z);
      m.group.rotation.y = m.yaw;
    }
  }

  private wanderTick(m: MobEntity, dt: number) {
    m.aiTimer -= dt;
    if (m.aiTimer <= 0) {
      if (m.species === 'camel') {
        // #14767 / #15060: Camels occasionally sit & rest in the sand, then stand back up!
        if (m.sitting) {
          m.sitting = false;
          m.walking = true;
          m.aiTimer = 3.0 + Math.random() * 4.0;
          return;
        } else if (Math.random() < 0.18) {
          m.sitting = true;
          m.walking = false;
          m.aiTimer = 5.0 + Math.random() * 5.0;
          return;
        }
      }
      m.walking = Math.random() < 0.55;
      m.targetYaw = Math.random() * Math.PI * 2;
      m.aiTimer = 1.5 + Math.random() * 3.5;
    }
  }

  private updateDragon(dt: number, world: WorldManager, playerX: number, playerY: number, playerZ: number) {
    const d = this.dragon;
    if (d.hurtTimer > 0) {
      d.hurtTimer = Math.max(0, d.hurtTimer - dt);
      const flash = d.hurtTimer > 0;
      d.mats.forEach((m, idx) => m.color.setHex(flash ? 0xff4488 : d.baseCols[idx]));
    }

    // P1 #13 Fix: Count actual remaining End Crystals on Obsidian Pillars — Dragon heals ONLY while crystals remain!
    let liveCrystals = 0;
    for (const [cx, cy, cz] of END_CRYSTAL_COORDS) {
      if (!world.isChunkLoadedAt(cx, cz) || world.getBlock(cx, cy, cz) === BLOCK.END_CRYSTAL_BLOCK) {
        liveCrystals++;
      }
    }
    d.aliveCrystals = liveCrystals;

    if (liveCrystals > 0 && d.hp < d.maxHp && Math.random() < dt * 0.8) {
      d.hp = Math.min(d.maxHp, d.hp + 0.35 + liveCrystals * 0.08);
    }

    d.swoopTimer -= dt;
    if (d.swoopTimer <= 0) {
      d.perching = !d.perching;
      d.swoopTimer = d.perching ? 6.5 : 11.0;
    }

    d.angle += dt * 0.52;
    const flap = Math.sin(d.angle * 7.5) * 0.52;
    d.wingL.rotation.z = flap;
    d.wingR.rotation.z = -flap;

    const podiumBaseY = sampleColumnInfo(0, 0, 'end').height;
    const targetX = d.perching ? 0 : Math.cos(d.angle) * 23;
    const targetZ = d.perching ? 0 : Math.sin(d.angle) * 23;
    const targetY = d.perching ? podiumBaseY + 5.4 : 68 + Math.sin(d.angle * 2) * 5;

    const prevX = d.x, prevZ = d.z;
    d.x += (targetX - d.x) * Math.min(1, dt * 2.2);
    d.y += (targetY - d.y) * Math.min(1, dt * 2.2);
    d.z += (targetZ - d.z) * Math.min(1, dt * 2.2);

    const vx = d.x - prevX;
    const vz = d.z - prevZ;
    if (Math.hypot(vx, vz) > 0.002) {
      d.group.rotation.y = Math.atan2(-vx, -vz);
    }
    d.group.position.set(d.x, d.y, d.z);

    // Swoop collision damage if brushing player
    const pd = Math.hypot(playerX - d.x, playerY - d.y, playerZ - d.z);
    if (pd < 3.6 && Math.random() < dt * 2.5) {
      this.onPlayerDamage?.(6, 'Ender Ejderhası', (playerX - d.x) / Math.max(0.5, pd), (playerZ - d.z) / Math.max(0.5, pd));
    }
  }
}

function intersectRayAABB(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  minX: number, minY: number, minZ: number,
  maxX: number, maxY: number, maxZ: number
): number | null {
  let tmin = 0;
  let tmax = Infinity;

  const axes: Array<[number, number, number, number]> = [
    [ox, dx, minX, maxX],
    [oy, dy, minY, maxY],
    [oz, dz, minZ, maxZ]
  ];

  for (const [o, d, mn, mx] of axes) {
    if (Math.abs(d) < 1e-7) {
      if (o < mn || o > mx) return null;
    } else {
      let t1 = (mn - o) / d;
      let t2 = (mx - o) / d;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin >= 0 ? tmin : tmax >= 0 ? 0 : null;
}

