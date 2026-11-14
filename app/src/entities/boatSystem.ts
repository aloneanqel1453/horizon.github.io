// Rideable 3D Voxel Oak Water Boat System (Horizon 26.3 Parity + #15541 Smooth Hit Wobble)
// Includes GPU Geometry/Material Cleanup & Rider Headspace Collision Under Bridges

import * as THREE from 'three';
import { BLOCK, getBlock, isWaterBlock } from '../world/blocks';
import { ITEM } from '../items/catalog';
import { DimensionId } from '../world/terrainGen';
import { InputState } from '../physics/playerPhysics';
import { WorldManager } from '../world/worldManager';
import { SoundEngine } from '../audio/soundEngine';

export interface BoatEntity {
  id: number;
  dim: DimensionId;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  oarPhase: number;
  wobbleTime: number;
  hits: number;
  group: THREE.Group;
  oarL: THREE.Group;
  oarR: THREE.Group;
}

function disposeBoatGroup(group: THREE.Group) {
  const mats = new Set<THREE.Material>();
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => mats.add(m));
      else mats.add(obj.material);
    }
  });
  mats.forEach((m) => m.dispose());
}

export class BoatSystem {
  private scene: THREE.Scene;
  private boats: BoatEntity[] = [];
  private nextId = 1;
  public mountedBoat: BoatEntity | null = null;
  public onToast?: (text: string, color?: string) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnBoat(x: number, y: number, z: number, dim: DimensionId, yaw = 0): BoatEntity {
    const group = new THREE.Group();
    const oakFloor = new THREE.MeshLambertMaterial({ color: 0x9c7342 });
    const oakRim = new THREE.MeshLambertMaterial({ color: 0xb58852 });
    const darkWood = new THREE.MeshLambertMaterial({ color: 0x6b4b27 });

    const bottom = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.14, 1.62), oakFloor);
    bottom.position.y = 0.08;

    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 1.56), oakRim);
    sideL.position.set(-0.56, 0.26, 0);
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 1.56), oakRim);
    sideR.position.set(0.56, 0.26, 0);

    const prow = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.34, 0.14), darkWood);
    prow.position.set(0, 0.26, -0.78);
    const stern = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.32, 0.14), darkWood);
    stern.position.set(0, 0.25, 0.78);

    const oarL = new THREE.Group();
    oarL.position.set(-0.62, 0.38, -0.08);
    const shaftL = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.07, 0.07), darkWood);
    shaftL.position.set(-0.30, -0.08, 0);
    shaftL.rotation.z = 0.32;
    const paddleL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.18), oakRim);
    paddleL.position.set(-0.62, -0.18, 0);
    oarL.add(shaftL, paddleL);

    const oarR = new THREE.Group();
    oarR.position.set(0.62, 0.38, -0.08);
    const shaftR = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.07, 0.07), darkWood);
    shaftR.position.set(0.30, -0.08, 0);
    shaftR.rotation.z = -0.32;
    const paddleR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.18), oakRim);
    paddleR.position.set(0.62, -0.18, 0);
    oarR.add(shaftR, paddleR);

    group.add(bottom, sideL, sideR, prow, stern, oarL, oarR);
    group.position.set(x, y, z);
    group.rotation.y = yaw;
    this.scene.add(group);

    const boat: BoatEntity = {
      id: this.nextId++,
      dim,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw,
      oarPhase: 0,
      wobbleTime: 0,
      hits: 0,
      group,
      oarL,
      oarR
    };
    this.boats.push(boat);
    return boat;
  }

  public raycastBoat(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    dim: DimensionId
  ): BoatEntity | null {
    let best: BoatEntity | null = null;
    let bestT = maxDist;
    for (const b of this.boats) {
      if (b.dim !== dim || b === this.mountedBoat) continue;
      const t = intersectBox(ox, oy, oz, dx, dy, dz, b.x - 0.7, b.y, b.z - 0.85, b.x + 0.7, b.y + 0.65, b.z + 0.85);
      if (t !== null && t < bestT) {
        bestT = t;
        best = b;
      }
    }
    return best;
  }

  public mountOrDismount(boat: BoatEntity, sound: SoundEngine) {
    this.mountedBoat = this.mountedBoat === boat ? null : boat;
    sound.playPlace('wood');
    if (this.mountedBoat) {
      this.onToast?.('Tekneye bindiniz! Suda yelken açın (İnmek için Shift / EĞİL).', '#7dd3fc');
    }
  }

  public hitBoat(boat: BoatEntity, world: WorldManager, sound: SoundEngine, instantBreak: boolean) {
    boat.wobbleTime = 0.65;
    boat.hits += instantBreak ? 3 : 1;
    sound.playBreak('wood');
    if (boat.hits >= 2) {
      if (this.mountedBoat === boat) this.mountedBoat = null;
      this.scene.remove(boat.group);
      disposeBoatGroup(boat.group);
      const idx = this.boats.indexOf(boat);
      if (idx !== -1) this.boats.splice(idx, 1);
      if (!instantBreak) {
        world.spawnItemDrop(boat.x, boat.y + 0.3, boat.z, { id: ITEM.BOAT_ITEM, count: 1 });
      }
    }
  }

  public update(dt: number, world: WorldManager, activeInput: InputState, playerYaw: number): { x: number; y: number; z: number } | null {
    const dim = world.dimension;
    let riderPos: { x: number; y: number; z: number } | null = null;

    for (let i = this.boats.length - 1; i >= 0; i--) {
      const b = this.boats[i];
      b.group.visible = b.dim === dim;
      if (b.dim !== dim || !world.isChunkLoadedAt(b.x, b.z)) continue;

      if (b.y < -20) {
        if (this.mountedBoat === b) this.mountedBoat = null;
        this.scene.remove(b.group);
        disposeBoatGroup(b.group);
        this.boats.splice(i, 1);
        continue;
      }

      const blockAtHull = world.getBlock(Math.floor(b.x), Math.floor(b.y + 0.15), Math.floor(b.z));
      const blockBelow = world.getBlock(Math.floor(b.x), Math.floor(b.y - 0.15), Math.floor(b.z));
      const onWater = isWaterBlock(blockAtHull) || isWaterBlock(blockBelow);
      const hasRider = this.mountedBoat === b;

      if (hasRider) {
        let dyaw = playerYaw - b.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        b.yaw += dyaw * Math.min(1, dt * 6.5);

        const analogBoat = Math.abs(activeInput.moveX || 0) > 0.01 || Math.abs(activeInput.moveZ || 0) > 0.01;
        const rawFwd = analogBoat
          ? -(activeInput.moveZ || 0)
          : (activeInput.forward ? 1 : 0) - (activeInput.backward ? 1 : 0);
        const fwd = rawFwd >= 0 ? rawFwd : rawFwd * 0.5;
        const steer = analogBoat
          ? -(activeInput.moveX || 0)
          : (activeInput.left ? 1 : 0) - (activeInput.right ? 1 : 0);
        b.yaw += steer * dt * 2.2;

        const maxSpd = onWater ? 8.8 : 2.3;
        const accel = onWater ? 14 : 9;
        b.vx += (-Math.sin(b.yaw) * fwd * maxSpd - b.vx) * Math.min(1, dt * (fwd !== 0 ? accel * 0.25 : 2.4));
        b.vz += (-Math.cos(b.yaw) * fwd * maxSpd - b.vz) * Math.min(1, dt * (fwd !== 0 ? accel * 0.25 : 2.4));

        if (Math.abs(fwd) > 0.05 || Math.abs(steer) > 0.05) {
          b.oarPhase += dt * 8.5;
          b.oarL.rotation.y = Math.sin(b.oarPhase) * 0.55;
          b.oarR.rotation.y = -Math.sin(b.oarPhase) * 0.55;
        } else {
          b.oarL.rotation.y *= 0.85;
          b.oarR.rotation.y *= 0.85;
        }
      } else {
        b.vx *= Math.max(0, 1 - dt * 3.5);
        b.vz *= Math.max(0, 1 - dt * 3.5);
      }

      // Horizontal collision against shore blocks AND low bridges when a player is riding (P1 #11)!
      const canOccupy = (tx: number, tz: number): boolean => {
        const ix = Math.floor(tx);
        const iz = Math.floor(tz);
        if (!world.isChunkLoadedAt(tx, tz)) return false;
        if (getBlock(world.getBlock(ix, Math.floor(b.y + 0.35), iz)).solid) return false;
        if (hasRider) {
          if (getBlock(world.getBlock(ix, Math.floor(b.y + 1.15), iz)).solid) return false;
          if (getBlock(world.getBlock(ix, Math.floor(b.y + 1.85), iz)).solid) return false;
        }
        return true;
      };

      const nx = b.x + b.vx * dt;
      const nz = b.z + b.vz * dt;
      if (canOccupy(nx, b.z)) {
        b.x = nx;
      } else {
        b.vx = 0;
      }
      if (canOccupy(b.x, nz)) {
        b.z = nz;
      } else {
        b.vz = 0;
      }

      if (onWater) {
        const waterY = isWaterBlock(blockAtHull) ? Math.floor(b.y + 0.15) + 0.86 : Math.floor(b.y - 0.15) + 0.86;
        b.y += (waterY - b.y) * Math.min(1, dt * 8);
        b.vy = 0;
      } else {
        b.vy -= 22 * dt;
        const ny = b.y + b.vy * dt;
        if (getBlock(world.getBlock(Math.floor(b.x), Math.floor(ny - 0.03), Math.floor(b.z))).solid) {
          b.y = Math.floor(ny - 0.03) + 1.0;
          b.vy = 0;
        } else {
          b.y = ny;
        }
      }

      let roll = 0;
      if (b.wobbleTime > 0) {
        b.wobbleTime = Math.max(0, b.wobbleTime - dt);
        roll = Math.sin(b.wobbleTime * 22) * (b.wobbleTime / 0.65) * 0.22;
      }

      b.group.position.set(b.x, b.y, b.z);
      b.group.rotation.set(0, b.yaw, roll);

      if (hasRider) {
        riderPos = { x: b.x, y: b.y + 0.28, z: b.z };
      }
    }

    return riderPos;
  }
}

function intersectBox(
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
