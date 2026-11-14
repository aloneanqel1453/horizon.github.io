// Interactive 3D Armor Stand Entity System (Horizon 26.3 `armor_stands.rs` Parity)
// Placeable anywhere, displays 4 armor slots (Helmet, Chestplate, Leggings, Boots) + Held Weapon/Block,
// wobbles on hit, drops items on break, persists locally, and syncs live across Horizon Global #1!

import * as THREE from 'three';
import { BLOCK } from '../world/blocks';
import { ITEM, ItemStack, getItemDef } from '../items/catalog';
import { DimensionId } from '../world/terrainGen';
import { WorldManager } from '../world/worldManager';
import { SoundEngine } from '../audio/soundEngine';
import {
  applyArmorSlotMaterial,
  buildHeldItem3D,
  disposeHeldMeshSafe,
  orientThirdPersonHeldMesh
} from './avatars';

const STAND_STORAGE_KEY = 'horizon_armor_stands_v1';

export interface ArmorStandEntity {
  id: string;
  dim: DimensionId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  armor: [number, number, number, number]; // [head, chest, legs, feet]
  armorMeta: [ItemStack | null, ItemStack | null, ItemStack | null, ItemStack | null];
  held: number;
  heldMeta: ItemStack | null;
  hits: number;
  hitDecay: number;
  wobble: number;
  group: THREE.Group;
  postGroup: THREE.Group;
  headArmorGroup: THREE.Group;
  chestArmorGroup: THREE.Group;
  legsArmorGroup: THREE.Group;
  feetArmorGroup: THREE.Group;
  headMat: THREE.MeshLambertMaterial;
  chestMat: THREE.MeshLambertMaterial;
  legsMat: THREE.MeshLambertMaterial;
  feetMat: THREE.MeshLambertMaterial;
  heldMount: THREE.Group;
  heldMesh: THREE.Object3D | null;
  shownHeldId: number;
}

interface SerializedStand {
  id: string;
  dim: DimensionId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  armor: [number, number, number, number];
  armorMeta?: [ItemStack | null, ItemStack | null, ItemStack | null, ItemStack | null];
  held: number;
  heldMeta?: ItemStack | null;
}

export class ArmorStandSystem {
  private scene: THREE.Scene;
  private atlasTex: THREE.CanvasTexture;
  private stands: ArmorStandEntity[] = [];

  // Shared geometries for zero-overhead Armor Stand instances
  private slabGeo = new THREE.BoxGeometry(0.76, 0.08, 0.76);
  private legPostGeo = new THREE.BoxGeometry(0.11, 0.68, 0.11);
  private waistBarGeo = new THREE.BoxGeometry(0.46, 0.09, 0.12);
  private ribPostGeo = new THREE.BoxGeometry(0.10, 0.56, 0.10);
  private shoulderBarGeo = new THREE.BoxGeometry(0.76, 0.11, 0.14);
  private armPegGeo = new THREE.BoxGeometry(0.11, 0.58, 0.11);
  private headPegGeo = new THREE.BoxGeometry(0.14, 0.34, 0.14);

  private helmTopGeo = new THREE.BoxGeometry(0.50, 0.13, 0.50);
  private helmBackGeo = new THREE.BoxGeometry(0.50, 0.34, 0.10);
  private helmSideGeo = new THREE.BoxGeometry(0.08, 0.32, 0.48);
  private helmNoseGeo = new THREE.BoxGeometry(0.09, 0.11, 0.06);
  private cuirassGeo = new THREE.BoxGeometry(0.50, 0.64, 0.28);
  private pauldronGeo = new THREE.BoxGeometry(0.22, 0.42, 0.24);
  private beltGeo = new THREE.BoxGeometry(0.46, 0.16, 0.25);
  private greaveGeo = new THREE.BoxGeometry(0.20, 0.48, 0.22);
  private bootGeo = new THREE.BoxGeometry(0.23, 0.24, 0.25);

  private stoneMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af });
  private woodMat = new THREE.MeshLambertMaterial({ color: 0xb58952 });
  private darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x8a6436 });

  public onSyncEvent?: (ev: Record<string, unknown>) => void;
  public onToast?: (msg: string, color?: string) => void;

  constructor(scene: THREE.Scene, atlasTex: THREE.CanvasTexture) {
    this.scene = scene;
    this.atlasTex = atlasTex;
    for (const g of [
      this.slabGeo,
      this.legPostGeo,
      this.waistBarGeo,
      this.ribPostGeo,
      this.shoulderBarGeo,
      this.armPegGeo,
      this.headPegGeo,
      this.helmTopGeo,
      this.helmBackGeo,
      this.helmSideGeo,
      this.helmNoseGeo,
      this.cuirassGeo,
      this.pauldronGeo,
      this.beltGeo,
      this.greaveGeo,
      this.bootGeo
    ]) {
      g.userData.shared = true;
    }
    this.loadFromStorage();
  }

  public ensureShowcaseStand(world: WorldManager) {
    if (this.stands.some((s) => s.id === 'showcase_spawn')) return;
    // Place 1 ready-to-use Avengers/Horizon Showcase Armor Stand right in the Spawn Plaza if none saved yet
    if (this.stands.length === 0) {
      const sy = world.getSafeSurfaceY(3.5, -5.5);
      this.placeStand(
        'overworld',
        3.5,
        sy,
        -5.5,
        0.4,
        'showcase_spawn',
        [ITEM.DIAMOND_HELMET, ITEM.DIAMOND_CHESTPLATE, ITEM.DIAMOND_LEGGINGS, ITEM.DIAMOND_BOOTS],
        ITEM.DIAMOND_SWORD,
        false
      );
    }
  }

  public placeStand(
    dim: DimensionId,
    x: number,
    y: number,
    z: number,
    yaw: number,
    id = 'st_' + Math.random().toString(36).slice(2, 10),
    armor: [number, number, number, number] = [0, 0, 0, 0],
    held = 0,
    broadcastAndSave = true
  ): ArmorStandEntity {
    const existing = this.stands.find((s) => s.id === id);
    if (existing) {
      existing.dim = dim;
      existing.x = x;
      existing.y = y;
      existing.z = z;
      existing.yaw = yaw;
      existing.armor = [...armor] as [number, number, number, number];
      existing.held = held;
      existing.group.position.set(x, y, z);
      existing.group.rotation.y = yaw;
      this.refreshVisuals(existing);
      return existing;
    }

    const group = new THREE.Group();
    const baseMesh = new THREE.Mesh(this.slabGeo, this.stoneMat);
    baseMesh.position.y = 0.04;
    group.add(baseMesh);

    const postGroup = new THREE.Group();
    postGroup.position.y = 0.08;

    const legL = new THREE.Mesh(this.legPostGeo, this.woodMat);
    legL.position.set(-0.13, 0.34, 0);
    const legR = new THREE.Mesh(this.legPostGeo, this.woodMat);
    legR.position.set(0.13, 0.34, 0);
    const waist = new THREE.Mesh(this.waistBarGeo, this.darkWoodMat);
    waist.position.set(0, 0.68, 0);
    const ribL = new THREE.Mesh(this.ribPostGeo, this.woodMat);
    ribL.position.set(-0.11, 0.98, 0);
    const ribR = new THREE.Mesh(this.ribPostGeo, this.woodMat);
    ribR.position.set(0.11, 0.98, 0);
    const shoulders = new THREE.Mesh(this.shoulderBarGeo, this.darkWoodMat);
    shoulders.position.set(0, 1.28, 0);
    const armL = new THREE.Mesh(this.armPegGeo, this.woodMat);
    armL.position.set(-0.32, 1.02, 0);
    const armR = new THREE.Mesh(this.armPegGeo, this.woodMat);
    armR.position.set(0.32, 1.02, 0);
    const headPeg = new THREE.Mesh(this.headPegGeo, this.woodMat);
    headPeg.position.set(0, 1.50, 0);

    postGroup.add(legL, legR, waist, ribL, ribR, shoulders, armL, armR, headPeg);

    // Open-Visor 3D Helmet + Pixel-Textured Armor Overlay Meshes
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const chestMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const legsMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const feetMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    const headArmorGroup = new THREE.Group();
    const hTop = new THREE.Mesh(this.helmTopGeo, headMat);
    hTop.position.set(0, 1.71, 0);
    const hBack = new THREE.Mesh(this.helmBackGeo, headMat);
    hBack.position.set(0, 1.54, 0.20);
    const hL = new THREE.Mesh(this.helmSideGeo, headMat);
    hL.position.set(-0.21, 1.54, 0.01);
    const hR = new THREE.Mesh(this.helmSideGeo, headMat);
    hR.position.set(0.21, 1.54, 0.01);
    const hNose = new THREE.Mesh(this.helmNoseGeo, headMat);
    hNose.position.set(0, 1.60, -0.23);
    headArmorGroup.add(hTop, hBack, hL, hR, hNose);

    const chestArmorGroup = new THREE.Group();
    const cuirass = new THREE.Mesh(this.cuirassGeo, chestMat);
    cuirass.position.set(0, 1.01, 0);
    const paulL = new THREE.Mesh(this.pauldronGeo, chestMat);
    paulL.position.set(-0.33, 1.12, 0);
    const paulR = new THREE.Mesh(this.pauldronGeo, chestMat);
    paulR.position.set(0.33, 1.12, 0);
    chestArmorGroup.add(cuirass, paulL, paulR);

    const legsArmorGroup = new THREE.Group();
    const belt = new THREE.Mesh(this.beltGeo, legsMat);
    belt.position.set(0, 0.68, 0);
    const greaveL = new THREE.Mesh(this.greaveGeo, legsMat);
    greaveL.position.set(-0.13, 0.42, 0);
    const greaveR = new THREE.Mesh(this.greaveGeo, legsMat);
    greaveR.position.set(0.13, 0.42, 0);
    legsArmorGroup.add(belt, greaveL, greaveR);

    const feetArmorGroup = new THREE.Group();
    const bootL = new THREE.Mesh(this.bootGeo, feetMat);
    bootL.position.set(-0.13, 0.13, 0);
    const bootR = new THREE.Mesh(this.bootGeo, feetMat);
    bootR.position.set(0.13, 0.13, 0);
    feetArmorGroup.add(bootL, bootR);

    const heldMount = new THREE.Group();
    heldMount.position.set(0.34, 0.78, -0.10);
    heldMount.rotation.x = 0.42;

    postGroup.add(headArmorGroup, chestArmorGroup, legsArmorGroup, feetArmorGroup, heldMount);
    group.add(postGroup);
    group.position.set(x, y, z);
    group.rotation.y = yaw;
    this.scene.add(group);

    const stand: ArmorStandEntity = {
      id,
      dim,
      x,
      y,
      z,
      yaw,
      armor: [...armor] as [number, number, number, number],
      armorMeta: [
        armor[0] > 0 ? { id: armor[0], count: 1 } : null,
        armor[1] > 0 ? { id: armor[1], count: 1 } : null,
        armor[2] > 0 ? { id: armor[2], count: 1 } : null,
        armor[3] > 0 ? { id: armor[3], count: 1 } : null
      ],
      held,
      heldMeta: held > 0 ? { id: held, count: 1 } : null,
      hits: 0,
      hitDecay: 0,
      wobble: 0,
      group,
      postGroup,
      headArmorGroup,
      chestArmorGroup,
      legsArmorGroup,
      feetArmorGroup,
      headMat,
      chestMat,
      legsMat,
      feetMat,
      heldMount,
      heldMesh: null,
      shownHeldId: -1
    };

    this.stands.push(stand);
    this.refreshVisuals(stand);

    if (broadcastAndSave) {
      this.saveToStorage();
      this.onSyncEvent?.({
        t: 'stand',
        op: 'set',
        id: stand.id,
        dim: stand.dim,
        x: stand.x,
        y: stand.y,
        z: stand.z,
        yaw: stand.yaw,
        armor: stand.armor,
        held: stand.held
      });
    }
    return stand;
  }

  private refreshVisuals(s: ArmorStandEntity) {
    if (s.armor[0] === BLOCK.CARVED_PUMPKIN) {
      s.headArmorGroup.visible = true;
      s.headMat.map = null;
      s.headMat.color.setHex(0xd97706);
      s.headMat.emissive.setHex(0x000000);
      s.headMat.needsUpdate = true;
    } else {
      s.headArmorGroup.visible = applyArmorSlotMaterial(s.headMat, s.armor[0], 'helm', Boolean(s.armorMeta[0]?.ench));
    }
    s.chestArmorGroup.visible = applyArmorSlotMaterial(s.chestMat, s.armor[1], 'chest', Boolean(s.armorMeta[1]?.ench));
    s.legsArmorGroup.visible = applyArmorSlotMaterial(s.legsMat, s.armor[2], 'legs', Boolean(s.armorMeta[2]?.ench));
    s.feetArmorGroup.visible = applyArmorSlotMaterial(s.feetMat, s.armor[3], 'feet', Boolean(s.armorMeta[3]?.ench));

    if (s.shownHeldId !== s.held) {
      s.shownHeldId = s.held;
      if (s.heldMesh) {
        s.heldMount.remove(s.heldMesh);
        disposeHeldMeshSafe(s.heldMesh);
        s.heldMesh = null;
      }
      if (s.held > 0) {
        const mesh = buildHeldItem3D(s.held, this.atlasTex, false, Boolean(s.heldMeta?.loaded));
        if (mesh) {
          orientThirdPersonHeldMesh(mesh, s.held, false);
          s.heldMesh = mesh;
          s.heldMount.add(mesh);
        }
      }
    }
  }

  public raycastStand(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    dim: DimensionId
  ): ArmorStandEntity | null {
    let best: ArmorStandEntity | null = null;
    let bestT = maxDist;
    for (let i = 0; i < this.stands.length; i++) {
      const s = this.stands[i];
      if (s.dim !== dim) continue;
      const t = intersectStandBox(ox, oy, oz, dx, dy, dz, s.x - 0.38, s.y, s.z - 0.38, s.x + 0.38, s.y + 1.92, s.z + 0.38);
      if (t !== null && t < bestT) {
        bestT = t;
        best = s;
      }
    }
    return best;
  }

  public interactStand(
    stand: ArmorStandEntity,
    heldStack: ItemStack | null,
    isCreative: boolean,
    sound: SoundEngine
  ): { nextHand: ItemStack | null; giveExtra: ItemStack | null; changed: boolean } {
    if (heldStack && heldStack.id === ITEM.ARMOR_STAND) {
      return { nextHand: heldStack, giveExtra: null, changed: false };
    }

    if (heldStack && heldStack.count > 0) {
      const def = getItemDef(heldStack.id);
      const armorSlot = def.armorSlot || (heldStack.id === BLOCK.CARVED_PUMPKIN ? 'head' : undefined);
      if (armorSlot) {
        const idx = armorSlot === 'head' ? 0 : armorSlot === 'chest' ? 1 : armorSlot === 'legs' ? 2 : 3;
        const prevId = stand.armor[idx];
        const prevMeta = stand.armorMeta[idx];
        stand.armor[idx] = heldStack.id;
        stand.armorMeta[idx] = {
          id: heldStack.id,
          count: 1,
          damage: heldStack.damage,
          ench: heldStack.ench,
          loaded: heldStack.loaded
        };
        this.refreshVisuals(stand);
        sound.playPlace('metal');
        this.broadcastStandUpdate(stand);
        const remaining = isCreative ? heldStack : heldStack.count > 1 ? { ...heldStack, count: heldStack.count - 1 } : null;
        const swapped: ItemStack | null = prevId > 0 ? (prevMeta ? { ...prevMeta, id: prevId, count: 1 } : { id: prevId, count: 1 }) : null;
        if (!remaining) return { nextHand: swapped, giveExtra: null, changed: true };
        return { nextHand: remaining, giveExtra: swapped, changed: true };
      }

      // Equip weapon / shield / tool / block in Armor Stand's hand (preserving durability & enchantments!)
      const prevHeld = stand.held;
      const prevHeldMeta = stand.heldMeta;
      stand.held = heldStack.id;
      stand.heldMeta = {
        id: heldStack.id,
        count: 1,
        damage: heldStack.damage,
        ench: heldStack.ench,
        loaded: heldStack.loaded
      };
      stand.shownHeldId = -1;
      this.refreshVisuals(stand);
      sound.playPlace('wood');
      this.broadcastStandUpdate(stand);
      const remaining = isCreative ? heldStack : heldStack.count > 1 ? { ...heldStack, count: heldStack.count - 1 } : null;
      const swapped: ItemStack | null = prevHeld > 0 ? (prevHeldMeta ? { ...prevHeldMeta, id: prevHeld, count: 1 } : { id: prevHeld, count: 1 }) : null;
      if (!remaining) return { nextHand: swapped, giveExtra: null, changed: true };
      return { nextHand: remaining, giveExtra: swapped, changed: true };
    }

    // Empty hand: retrieve held item first, then armor pieces top-to-bottom (preserving exact durability & enchantments!)
    if (stand.held > 0) {
      const taken = stand.held;
      const takenMeta = stand.heldMeta;
      stand.held = 0;
      stand.heldMeta = null;
      this.refreshVisuals(stand);
      sound.playPickup();
      this.broadcastStandUpdate(stand);
      return { nextHand: takenMeta ? { ...takenMeta, id: taken, count: 1 } : { id: taken, count: 1 }, giveExtra: null, changed: true };
    }
    for (let i = 0; i < 4; i++) {
      if (stand.armor[i] > 0) {
        const taken = stand.armor[i];
        const takenMeta = stand.armorMeta[i];
        stand.armor[i] = 0;
        stand.armorMeta[i] = null;
        this.refreshVisuals(stand);
        sound.playPickup();
        this.broadcastStandUpdate(stand);
        return { nextHand: takenMeta ? { ...takenMeta, id: taken, count: 1 } : { id: taken, count: 1 }, giveExtra: null, changed: true };
      }
    }
    return { nextHand: heldStack, giveExtra: null, changed: false };
  }

  public hitStand(stand: ArmorStandEntity, instantBreak: boolean, world: WorldManager, sound: SoundEngine) {
    stand.wobble = 0.65;
    stand.hitDecay = 2.4;
    stand.hits += instantBreak ? 2 : 1;
    sound.playBreak('wood');

    if (stand.hits >= 2) {
      for (let i = 0; i < 4; i++) {
        if (stand.armor[i] > 0) {
          const st = stand.armorMeta[i] ? { ...stand.armorMeta[i]!, id: stand.armor[i], count: 1 } : { id: stand.armor[i], count: 1 };
          world.spawnItemDrop(stand.x, stand.y + 0.8, stand.z, st);
        }
      }
      if (stand.held > 0) {
        const st = stand.heldMeta ? { ...stand.heldMeta, id: stand.held, count: 1 } : { id: stand.held, count: 1 };
        world.spawnItemDrop(stand.x, stand.y + 0.8, stand.z, st);
      }
      if (!instantBreak) {
        world.spawnItemDrop(stand.x, stand.y + 0.4, stand.z, { id: ITEM.ARMOR_STAND, count: 1 });
      }
      this.removeStandById(stand.id, true);
    }
  }

  public removeStandById(id: string, broadcastAndSave: boolean) {
    const idx = this.stands.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const s = this.stands[idx];
    this.scene.remove(s.group);
    if (s.heldMesh) disposeHeldMeshSafe(s.heldMesh);
    s.headMat.dispose();
    s.chestMat.dispose();
    s.legsMat.dispose();
    s.feetMat.dispose();
    this.stands.splice(idx, 1);

    if (broadcastAndSave) {
      this.saveToStorage();
      this.onSyncEvent?.({ t: 'stand', op: 'del', id });
    }
  }

  public update(dt: number, activeDim: DimensionId) {
    for (let i = 0; i < this.stands.length; i++) {
      const s = this.stands[i];
      s.group.visible = s.dim === activeDim;
      if (s.dim !== activeDim) continue;
      if (s.hitDecay > 0) {
        s.hitDecay = Math.max(0, s.hitDecay - dt);
        if (s.hitDecay <= 0) s.hits = 0;
      }
      if (s.wobble > 0) {
        s.wobble = Math.max(0, s.wobble - dt);
        s.postGroup.rotation.z = Math.sin(s.wobble * 28) * s.wobble * 0.22;
      } else {
        s.postGroup.rotation.z = 0;
      }
    }
  }

  public applyRemoteEvent(ev: Record<string, any>) {
    if (ev.t !== 'stand' || typeof ev.id !== 'string') return;
    if (ev.op === 'del') {
      this.removeStandById(ev.id, false);
      this.saveToStorage();
      return;
    }
    if (ev.op === 'set') {
      const dim: DimensionId = ev.dim === 'nether' || ev.dim === 'end' ? ev.dim : 'overworld';
      const armor: [number, number, number, number] = Array.isArray(ev.armor) && ev.armor.length === 4
        ? [Number(ev.armor[0]) || 0, Number(ev.armor[1]) || 0, Number(ev.armor[2]) || 0, Number(ev.armor[3]) || 0]
        : [0, 0, 0, 0];
      this.placeStand(
        dim,
        Number(ev.x) || 0,
        Number(ev.y) || 49,
        Number(ev.z) || 0,
        Number(ev.yaw) || 0,
        ev.id,
        armor,
        Number(ev.held) || 0,
        false
      );
      this.saveToStorage();
    }
  }

  private broadcastStandUpdate(stand: ArmorStandEntity) {
    this.saveToStorage();
    this.onSyncEvent?.({
      t: 'stand',
      op: 'set',
      id: stand.id,
      dim: stand.dim,
      x: stand.x,
      y: stand.y,
      z: stand.z,
      yaw: stand.yaw,
      armor: stand.armor,
      held: stand.held
    });
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const list: SerializedStand[] = this.stands.slice(-48).map((s) => ({
        id: s.id,
        dim: s.dim,
        x: Math.round(s.x * 100) / 100,
        y: Math.round(s.y * 100) / 100,
        z: Math.round(s.z * 100) / 100,
        yaw: Math.round(s.yaw * 100) / 100,
        armor: s.armor,
        armorMeta: s.armorMeta,
        held: s.held,
        heldMeta: s.heldMeta
      }));
      localStorage.setItem(STAND_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignore private-mode storage quota errors
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STAND_STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      for (const item of arr.slice(0, 48)) {
        if (!item || typeof item.id !== 'string') continue;
        const dim: DimensionId = item.dim === 'nether' || item.dim === 'end' ? item.dim : 'overworld';
        const armor: [number, number, number, number] = Array.isArray(item.armor) && item.armor.length === 4
          ? [Number(item.armor[0]) || 0, Number(item.armor[1]) || 0, Number(item.armor[2]) || 0, Number(item.armor[3]) || 0]
          : [0, 0, 0, 0];
        const st = this.placeStand(
          dim,
          Number(item.x) || 0,
          Number(item.y) || 49,
          Number(item.z) || 0,
          Number(item.yaw) || 0,
          item.id,
          armor,
          Number(item.held) || 0,
          false
        );
        if (Array.isArray(item.armorMeta) && item.armorMeta.length === 4) {
          st.armorMeta = [item.armorMeta[0] || null, item.armorMeta[1] || null, item.armorMeta[2] || null, item.armorMeta[3] || null];
        }
        if (item.heldMeta && typeof item.heldMeta === 'object') {
          st.heldMeta = item.heldMeta;
        }
        this.refreshVisuals(st);
      }
    } catch {
      // Ignore corrupt storage
    }
  }
}

function intersectStandBox(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  minX: number, minY: number, minZ: number,
  maxX: number, maxY: number, maxZ: number
): number | null {
  let tmin = 0;
  let tmax = Infinity;

  if (Math.abs(dx) < 1e-7) {
    if (ox < minX || ox > maxX) return null;
  } else {
    let t1 = (minX - ox) / dx;
    let t2 = (maxX - ox) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }

  if (Math.abs(dy) < 1e-7) {
    if (oy < minY || oy > maxY) return null;
  } else {
    let t1 = (minY - oy) / dy;
    let t2 = (maxY - oy) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }

  if (Math.abs(dz) < 1e-7) {
    if (oz < minZ || oz > maxZ) return null;
  } else {
    let t1 = (minZ - oz) / dz;
    let t2 = (maxZ - oz) / dz;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }

  return tmin >= 0 ? tmin : tmax >= 0 ? 0 : null;
}
