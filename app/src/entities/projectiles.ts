// 3D Projectiles: Bow Arrows, Thrown Ender Pearls & Deflectable Ghast Fireballs (#15763)

import * as THREE from 'three';
import { BLOCK, getBlock } from '../world/blocks';
import { ItemStack } from '../items/catalog';
import { WorldManager } from '../world/worldManager';

export interface ActiveProjectile {
  kind: 'arrow' | 'pearl' | 'fireball' | 'snowball' | 'trident' | 'wind_charge';
  fromPlayer: boolean;
  friendlyToPlayer?: boolean;
  returning?: boolean;
  returnStack?: ItemStack | null;
  mesh: THREE.Object3D;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  stuckTimer: number;
  stuck: boolean;
  age: number;
}

export class ProjectileManager {
  private list: ActiveProjectile[] = [];
  private scene: THREE.Scene;
  public timeStopActive = false;
  private arrowShaftGeo = new THREE.BoxGeometry(0.06, 0.06, 0.56);
  private arrowTipGeo = new THREE.BoxGeometry(0.11, 0.11, 0.12);
  private arrowFletchGeo = new THREE.BoxGeometry(0.12, 0.09, 0.08);
  private tridentShaftGeo = new THREE.BoxGeometry(0.065, 0.065, 0.92);
  private tridentBarGeo = new THREE.BoxGeometry(0.32, 0.065, 0.08);
  private tridentProngGeo = new THREE.BoxGeometry(0.055, 0.055, 0.28);
  private pearlGeo = new THREE.SphereGeometry(0.16, 8, 8);
  private windGeo = new THREE.SphereGeometry(0.22, 10, 10);
  private fireballGeo = new THREE.BoxGeometry(0.34, 0.34, 0.34);

  // Shared static projectile materials for zero GPU/GC allocation per shot!
  private arrowWoodMat = new THREE.MeshLambertMaterial({ color: 0x8c6234 });
  private arrowIronMat = new THREE.MeshLambertMaterial({ color: 0xd0d7e0 });
  private arrowFletchMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
  private tridentShaftMat = new THREE.MeshLambertMaterial({ color: 0x2b7a78 });
  private tridentHeadMat = new THREE.MeshLambertMaterial({ color: 0x7dd3fc });
  private pearlMat = new THREE.MeshBasicMaterial({ color: 0x2de0cc });
  private snowballMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  private windMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.85 });
  private fbEnemyMat = new THREE.MeshBasicMaterial({ color: 0xff7b1c });
  private fbAllyMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  public onPearlLand?: (x: number, y: number, z: number) => void;
  public onHitEntity?: (proj: ActiveProjectile) => boolean;
  public onHitPlayer?: (damage: number, source: string, knockX: number, knockZ: number) => void;
  public onDestroyCrystal?: (bx: number, by: number, bz: number) => void;
  public onTridentReturn?: (returnStack: ItemStack) => void;
  public onWindBurst?: (x: number, y: number, z: number, fromLocal: boolean, fromAlly?: boolean) => void;
  public onHitTargetBlock?: (bx: number, by: number, bz: number, power: number, fromLocal: boolean) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (const m of [
      this.arrowWoodMat,
      this.arrowIronMat,
      this.arrowFletchMat,
      this.tridentShaftMat,
      this.tridentHeadMat,
      this.pearlMat,
      this.snowballMat,
      this.windMat,
      this.fbEnemyMat,
      this.fbAllyMat
    ]) {
      m.userData.shared = true;
    }
  }

  public shootArrow(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    speed = 26,
    fromPlayer = true,
    damage = 6,
    friendlyToPlayer = false
  ) {
    const grp = new THREE.Group();
    const shaft = new THREE.Mesh(this.arrowShaftGeo, this.arrowWoodMat);
    // Object3D.lookAt aligns +Z toward target — place iron tip on +Z and white fletching on -Z!
    const tip = new THREE.Mesh(this.arrowTipGeo, this.arrowIronMat);
    tip.position.z = 0.28;
    const fletch = new THREE.Mesh(this.arrowFletchGeo, this.arrowFletchMat);
    fletch.position.z = -0.26;
    grp.add(shaft, tip, fletch);
    grp.position.set(x, y, z);
    grp.lookAt(x + dx, y + dy, z + dz);
    this.scene.add(grp);

    this.list.push({
      kind: 'arrow',
      fromPlayer,
      friendlyToPlayer,
      mesh: grp,
      x,
      y,
      z,
      vx: dx * speed,
      vy: dy * speed,
      vz: dz * speed,
      damage,
      stuckTimer: 0,
      stuck: false,
      age: 0
    });
  }

  public throwEnderPearl(x: number, y: number, z: number, dx: number, dy: number, dz: number, fromLocal = true) {
    const mesh = new THREE.Mesh(this.pearlGeo, this.pearlMat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.list.push({
      kind: 'pearl',
      fromPlayer: fromLocal,
      mesh,
      x,
      y,
      z,
      vx: dx * 21,
      vy: dy * 21 + 2.2,
      vz: dz * 21,
      damage: 0,
      stuckTimer: 0,
      stuck: false,
      age: 0
    });
  }

  public shootFireball(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    damage = 5,
    friendlyToPlayer = false
  ) {
    const mesh = new THREE.Mesh(this.fireballGeo, friendlyToPlayer ? this.fbAllyMat : this.fbEnemyMat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.list.push({
      kind: 'fireball',
      fromPlayer: false,
      friendlyToPlayer,
      mesh,
      x,
      y,
      z,
      vx: dx * (friendlyToPlayer ? 20 : 15),
      vy: dy * (friendlyToPlayer ? 20 : 15),
      vz: dz * (friendlyToPlayer ? 20 : 15),
      damage,
      stuckTimer: 0,
      stuck: false,
      age: 0
    });
  }

  public shootSnowball(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    fromPlayer = true,
    friendlyToPlayer = true,
    damage = 1
  ) {
    const mesh = new THREE.Mesh(this.pearlGeo, this.snowballMat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.list.push({
      kind: 'snowball',
      fromPlayer,
      friendlyToPlayer,
      mesh,
      x,
      y,
      z,
      vx: dx * 22,
      vy: dy * 22 + 1.8,
      vz: dz * 22,
      damage,
      stuckTimer: 0,
      stuck: false,
      age: 0
    });
  }

  public throwTrident(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    speed = 27,
    fromLocal = true,
    friendlyToPlayer = true,
    damage = 9,
    returnStack: ItemStack | null = null
  ) {
    const grp = new THREE.Group();
    const shaft = new THREE.Mesh(this.tridentShaftGeo, this.tridentShaftMat);
    // Object3D.lookAt aligns +Z toward target — place 3 prongs forward on +Z!
    const bar = new THREE.Mesh(this.tridentBarGeo, this.tridentHeadMat);
    bar.position.z = 0.44;
    const pMid = new THREE.Mesh(this.tridentProngGeo, this.tridentHeadMat);
    pMid.position.z = 0.58;
    const pL = new THREE.Mesh(this.tridentProngGeo, this.tridentHeadMat);
    pL.position.set(-0.12, 0, 0.55);
    const pR = new THREE.Mesh(this.tridentProngGeo, this.tridentHeadMat);
    pR.position.set(0.12, 0, 0.55);
    grp.add(shaft, bar, pMid, pL, pR);
    grp.position.set(x, y, z);
    grp.lookAt(x + dx, y + dy, z + dz);
    this.scene.add(grp);

    this.list.push({
      kind: 'trident',
      fromPlayer: fromLocal,
      friendlyToPlayer,
      returning: false,
      returnStack,
      mesh: grp,
      x,
      y,
      z,
      vx: dx * speed,
      vy: dy * speed,
      vz: dz * speed,
      damage,
      stuckTimer: 0,
      stuck: false,
      age: 0
    });
  }

  public shootWindCharge(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    speed = 25,
    fromLocal = true,
    friendlyToPlayer = true
  ) {
    const mesh = new THREE.Mesh(this.windGeo, this.windMat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.list.push({
      kind: 'wind_charge',
      fromPlayer: fromLocal,
      friendlyToPlayer,
      mesh,
      x,
      y,
      z,
      vx: dx * speed,
      vy: dy * speed,
      vz: dz * speed,
      damage: friendlyToPlayer ? 1 : 2,
      stuckTimer: 0,
      stuck: false,
      age: 0
    });
  }

  // #15763 Parity: Punching / swinging at an incoming Ghast/Blaze fireball reflects it along the player's aim!
  public tryDeflectFireball(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): boolean {
    for (const p of this.list) {
      if (p.kind !== 'fireball' || p.fromPlayer || p.stuck) continue;
      const rx = p.x - ox;
      const ry = p.y - oy;
      const rz = p.z - oz;
      const dist = Math.hypot(rx, ry, rz);
      if (dist > 3.8) continue;
      const dot = (rx * dx + ry * dy + rz * dz) / Math.max(0.01, dist);
      if (dot > 0.65 || dist < 1.5) {
        p.fromPlayer = true;
        p.vx = dx * 24;
        p.vy = dy * 24;
        p.vz = dz * 24;
        p.damage = 16; // Return to Sender bonus damage!
        p.age = 0;
        return true;
      }
    }
    return false;
  }

  public update(dt: number, world: WorldManager, playerX: number, playerY: number, playerZ: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (this.timeStopActive && !p.fromPlayer && !p.friendlyToPlayer) {
        continue;
      }
      p.age += dt;

      // Loyalty safety: if local Trident flies into open sky or End void without hitting solid terrain, recall automatically!
      if (p.kind === 'trident' && p.fromPlayer && !p.returning && !p.stuck && (p.y < -8 || p.age > 3.8)) {
        p.returning = true;
      }

      if (p.age > 25) {
        if (p.kind === 'trident' && p.fromPlayer && p.returnStack) {
          this.onTridentReturn?.(p.returnStack);
          p.returnStack = null;
        }
        this.removeAt(i);
        continue;
      }

      if (p.returning) {
        const tx = playerX - p.x;
        const ty = (playerY + 1.1) - p.y;
        const tz = playerZ - p.z;
        const dist = Math.max(0.01, Math.hypot(tx, ty, tz));
        if (dist < 1.15 || p.age > 9) {
          if (p.returnStack) {
            this.onTridentReturn?.(p.returnStack);
            p.returnStack = null;
          }
          this.removeAt(i);
          continue;
        }
        const rSpd = 28;
        p.vx = (tx / dist) * rSpd;
        p.vy = (ty / dist) * rSpd;
        p.vz = (tz / dist) * rSpd;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.lookAt(playerX, playerY + 1.1, playerZ);
        continue;
      }

      if (p.stuck) {
        p.stuckTimer += dt;
        if (p.kind === 'trident' && p.fromPlayer && p.stuckTimer > 0.28) {
          p.stuck = false;
          p.returning = true;
          continue;
        }
        if (p.stuckTimer > 8) this.removeAt(i);
        continue;
      }

      if (p.kind !== 'fireball' && p.kind !== 'wind_charge') {
        p.vy -= (p.kind === 'pearl' ? 18 : p.kind === 'trident' ? 11 : 14) * dt;
      }

      const steps = 3;
      const sdt = dt / steps;
      let removed = false;

      for (let s = 0; s < steps; s++) {
        const nx = p.x + p.vx * sdt;
        const ny = p.y + p.vy * sdt;
        const nz = p.z + p.vz * sdt;

        // Player arrow or trident can also deflect an incoming enemy fireball midair (#15763)!
        if (p.fromPlayer && (p.kind === 'arrow' || p.kind === 'trident')) {
          for (const fb of this.list) {
            if (fb.kind === 'fireball' && !fb.fromPlayer && !fb.friendlyToPlayer && Math.hypot(nx - fb.x, ny - fb.y, nz - fb.z) < 0.65) {
              const l = Math.hypot(p.vx, p.vy, p.vz) || 1;
              fb.fromPlayer = true;
              fb.vx = (p.vx / l) * 24;
              fb.vy = (p.vy / l) * 24;
              fb.vz = (p.vz / l) * 24;
              fb.damage = 16;
              if (p.kind === 'trident') {
                p.returning = true;
              } else {
                this.removeAt(i);
              }
              removed = true;
              break;
            }
          }
          if (removed) break;
        }

        // Check entity / player hit (local & friendly companion projectiles are authoritative over local mobs!)
        const hitsMobs =
          (p.fromPlayer || p.friendlyToPlayer) &&
          (p.kind === 'arrow' || p.kind === 'fireball' || p.kind === 'snowball' || p.kind === 'trident' || p.kind === 'wind_charge');
        if (hitsMobs && this.onHitEntity?.(p)) {
          if (p.kind === 'wind_charge') {
            this.onWindBurst?.(nx, ny, nz, p.fromPlayer, Boolean(p.friendlyToPlayer && !p.fromPlayer));
            this.removeAt(i);
          } else if (p.kind === 'trident' && p.fromPlayer) {
            p.returning = true;
          } else {
            this.removeAt(i);
          }
          removed = true;
          break;
        } else if (!p.fromPlayer && !p.friendlyToPlayer && p.age > 0.12) {
          const hitPlayer =
            Math.abs(nx - playerX) < 0.45 &&
            ny >= playerY &&
            ny <= playerY + 1.8 &&
            Math.abs(nz - playerZ) < 0.45;
          if (hitPlayer) {
            const hLen = Math.hypot(p.vx, p.vz) || 1;
            if (p.kind === 'wind_charge') {
              this.onWindBurst?.(nx, ny, nz, false);
            }
            this.onHitPlayer?.(
              p.damage,
              p.kind === 'fireball'
                ? 'Ateş Topu'
                : p.kind === 'wind_charge'
                  ? 'Breeze Rüzgar Yükü'
                  : p.kind === 'snowball'
                    ? 'Büyü Mermisi'
                    : 'Ok / Arbalet',
              p.vx / hLen,
              p.vz / hLen
            );
            this.removeAt(i);
            removed = true;
            break;
          }
        }

        const bx = Math.floor(nx);
        const by = Math.floor(ny);
        const bz = Math.floor(nz);
        const block = getBlock(world.getBlock(bx, by, bz));

        // Shooting an End Crystal with any projectile shatters it!
        if (
          block.id === BLOCK.END_CRYSTAL_BLOCK &&
          (p.kind === 'arrow' || p.kind === 'snowball' || p.kind === 'trident' || p.kind === 'wind_charge')
        ) {
          if (p.fromPlayer) this.onDestroyCrystal?.(bx, by, bz);
          if (p.kind === 'trident' && p.fromPlayer) {
            p.returning = true;
          } else {
            if (p.kind === 'wind_charge') this.onWindBurst?.(nx, ny, nz, p.fromPlayer);
            this.removeAt(i);
          }
          removed = true;
          break;
        }

        if (block.solid) {
          if (block.id === BLOCK.TARGET_BLOCK) {
            const fx = Math.abs((nx - (bx + 0.5)) * 2);
            const fy = Math.abs((ny - (by + 0.5)) * 2);
            const fz = Math.abs((nz - (bz + 0.5)) * 2);
            const sorted = [fx, fy, fz].sort((a, b) => a - b);
            const radialOff = Math.hypot(sorted[0], sorted[1]);
            const power = Math.max(1, Math.min(15, Math.round((1 - Math.min(1, radialOff)) * 14) + 1));
            this.onHitTargetBlock?.(bx, by, bz, power, p.fromPlayer);
          }
          if (p.kind === 'pearl') {
            if (p.fromPlayer) {
              let lx = Math.floor(p.x) + 0.5;
              let ly = Math.floor(p.y) + 0.05;
              let lz = Math.floor(p.z) + 0.5;
              if (getBlock(world.getBlock(Math.floor(lx), Math.floor(ly + 1), Math.floor(lz))).solid) {
                ly = Math.max(1.05, ly - 1);
              }
              if (getBlock(world.getBlock(Math.floor(lx), Math.floor(ly), Math.floor(lz))).solid) {
                ly = world.getSafeSurfaceY(p.x, p.z);
              }
              this.onPearlLand?.(lx, ly, lz);
            }
            this.removeAt(i);
          } else if (p.kind === 'wind_charge') {
            this.onWindBurst?.(p.x, p.y, p.z, p.fromPlayer, Boolean(p.friendlyToPlayer && !p.fromPlayer));
            this.removeAt(i);
          } else if (p.kind === 'fireball') {
            world.spawnBlockDebris(bx, by, bz, block.id);
            this.removeAt(i);
          } else if (p.kind === 'snowball') {
            world.spawnBlockDebris(p.x - 0.5, p.y - 0.5, p.z - 0.5, BLOCK.SNOW_BLOCK);
            this.removeAt(i);
          } else {
            p.stuck = true;
          }
          removed = true;
          break;
        }

        p.x = nx;
        p.y = ny;
        p.z = nz;
      }

      if (!removed) {
        p.mesh.position.set(p.x, p.y, p.z);
        if (p.kind === 'arrow' || p.kind === 'trident') {
          p.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
        } else {
          p.mesh.rotation.x += 6 * dt;
          p.mesh.rotation.y += 6 * dt;
        }
      }
    }
  }

  public clear() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.kind === 'trident' && p.fromPlayer && p.returnStack) {
        this.onTridentReturn?.(p.returnStack);
        p.returnStack = null;
      }
      this.removeAt(i);
    }
  }

  private removeAt(idx: number) {
    const p = this.list[idx];
    this.scene.remove(p.mesh);
    p.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => {
            if (!m.userData?.shared) m.dispose();
          });
        } else if (child.material && !child.material.userData?.shared) {
          child.material.dispose();
        }
      }
    });
    this.list.splice(idx, 1);
  }
}
