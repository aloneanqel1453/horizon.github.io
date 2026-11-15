// Horizon 26.3 Weather & Atmospheric Particle System
// Includes Arid Desert Exclusion, Roof/Cave Precipitation Occlusion, Snowflakes in Snowy Peaks,
// Lightning Flashes, Falling Pink Cherry Blossom Petals, and Warm Torch/Portal Sparks!

import * as THREE from 'three';
import { BLOCK, getBlock, isLavaBlock } from './blocks';
import { WorldManager } from './worldManager';
import { SoundEngine } from '../audio/soundEngine';

export type WeatherKind = 'clear' | 'rain' | 'snow' | 'thunder';

interface AmbientSpark {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  petal: boolean;
}

const PRECIP_COUNT = 320;

export class WeatherParticleSystem {
  public weather: WeatherKind = 'clear';
  public lightningFlash = 0;

  private scene: THREE.Scene;
  private precipGeo: THREE.BufferGeometry;
  private precipPos: Float32Array;
  private precipMat: THREE.PointsMaterial;
  private precipPoints: THREE.Points;

  private sparks: AmbientSpark[] = [];
  private sparkPool: THREE.Mesh[] = [];
  private petalPool: THREE.Mesh[] = [];
  private sparkGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
  private petalGeo = new THREE.BoxGeometry(0.11, 0.03, 0.11);

  // 64x64 toroidal column roof-height cache so 320 rain/snow particles do zero per-frame 32-voxel scans
  private roofCacheY = new Float32Array(4096);
  private roofCacheWX = new Int32Array(4096).fill(999999);
  private roofCacheWZ = new Int32Array(4096).fill(999999);
  private roofCacheStamp = new Float32Array(4096).fill(-999);
  private roofRefY = -999;
  private weatherClock = 0;
  private biomeClock = 99;
  private cachedBiome = '';

  private cycleTimer = 210;
  private thunderTimer = 9;
  private scanClock = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.precipGeo = new THREE.BufferGeometry();
    this.precipPos = new Float32Array(PRECIP_COUNT * 3);
    for (let i = 0; i < PRECIP_COUNT; i++) {
      this.precipPos[i * 3] = (Math.random() - 0.5) * 36;
      this.precipPos[i * 3 + 1] = Math.random() * 24;
      this.precipPos[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    this.precipGeo.setAttribute('position', new THREE.BufferAttribute(this.precipPos, 3));

    this.precipMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.22,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });

    this.precipPoints = new THREE.Points(this.precipGeo, this.precipMat);
    this.precipPoints.visible = false;
    this.precipPoints.frustumCulled = false;
    this.scene.add(this.precipPoints);
  }

  public setWeather(kind: WeatherKind) {
    this.weather = kind;
    this.cycleTimer = kind === 'clear' ? 240 : 110;
    this.lightningFlash = 0;
  }

  // Cached highest solid roof/ground Y above/near playerY (refreshed lazily every 0.45s per (wx, wz) column!)
  private findPrecipitationFloorY(world: WorldManager, wx: number, wz: number, refY: number): number {
    const ix = Math.floor(wx);
    const iz = Math.floor(wz);
    const slot = ((iz & 63) << 6) | (ix & 63);
    if (
      this.roofCacheWX[slot] === ix &&
      this.roofCacheWZ[slot] === iz &&
      this.weatherClock - this.roofCacheStamp[slot] < 0.45
    ) {
      return this.roofCacheY[slot];
    }

    const maxScan = Math.min(126, Math.floor(refY) + 26);
    const minScan = Math.max(1, Math.floor(refY) - 6);
    let found = refY - 4;
    for (let y = maxScan; y >= minScan; y--) {
      const id = world.getBlock(ix, y, iz);
      if (id !== BLOCK.AIR && (getBlock(id).solid || id === BLOCK.WATER)) {
        found = y + 1.05;
        break;
      }
    }
    this.roofCacheWX[slot] = ix;
    this.roofCacheWZ[slot] = iz;
    this.roofCacheY[slot] = found;
    this.roofCacheStamp[slot] = this.weatherClock;
    return found;
  }

  public update(
    dt: number,
    world: WorldManager,
    sound: SoundEngine,
    playerX: number,
    playerY: number,
    playerZ: number
  ) {
    const dim = world.dimension;
    this.weatherClock += dt;
    if (Math.abs(playerY - this.roofRefY) > 4) {
      this.roofRefY = playerY;
      this.roofCacheStamp.fill(-999);
    }

    // 1. Natural Weather Cycle in Overworld
    if (dim === 'overworld') {
      this.cycleTimer -= dt;
      if (this.cycleTimer <= 0) {
        if (this.weather === 'clear') {
          this.weather = Math.random() < 0.25 ? 'thunder' : 'rain';
          this.cycleTimer = 75 + Math.random() * 45;
        } else {
          this.weather = 'clear';
          this.cycleTimer = 220 + Math.random() * 120;
        }
      }
    }

    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.8);
    }

    this.biomeClock += dt;
    if (dim === 'overworld') {
      if (this.biomeClock >= 0.4) {
        this.biomeClock = 0;
        this.cachedBiome = world.getBiomeAt(playerX, playerZ);
      }
    } else {
      this.cachedBiome = '';
    }
    const playerBiome = this.cachedBiome;
    // Arid Desert biome (`Altın Çöl`) does not receive rain/snow!
    const activePrecip = dim === 'overworld' && this.weather !== 'clear' && playerBiome !== 'Altın Çöl';
    this.precipPoints.visible = activePrecip;

    if (activePrecip) {
      const isSnowing = this.weather === 'snow' || playerBiome === 'Karlı Zirveler';

      this.precipMat.color.setHex(isSnowing ? 0xf8fafc : 0x7dd3fc);
      this.precipMat.size = isSnowing ? 0.24 : 0.19;
      this.precipMat.opacity = isSnowing ? 0.88 : 0.65;

      const fallSpeed = isSnowing ? 3.4 : 19.5;
      for (let i = 0; i < PRECIP_COUNT; i++) {
        const i3 = i * 3;
        let px = this.precipPos[i3];
        let py = this.precipPos[i3 + 1] - fallSpeed * dt;
        let pz = this.precipPos[i3 + 2];

        if (isSnowing) {
          px += Math.sin(py * 1.4 + i) * 0.9 * dt;
          pz += Math.cos(py * 1.2 + i) * 0.9 * dt;
        }

        const roofY = this.findPrecipitationFloorY(world, px, pz, playerY);
        if (
          py <= roofY ||
          py < playerY - 5 ||
          Math.abs(px - playerX) > 19 ||
          Math.abs(pz - playerZ) > 19
        ) {
          px = playerX + (Math.random() - 0.5) * 36;
          pz = playerZ + (Math.random() - 0.5) * 36;
          const newRoofY = this.findPrecipitationFloorY(world, px, pz, playerY);
          py = Math.max(newRoofY + 2, playerY + 12) + Math.random() * 12;
        }

        this.precipPos[i3] = px;
        this.precipPos[i3 + 1] = py;
        this.precipPos[i3 + 2] = pz;
      }
      (this.precipGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      if (this.weather === 'thunder') {
        this.thunderTimer -= dt;
        if (this.thunderTimer <= 0) {
          this.thunderTimer = 7 + Math.random() * 11;
          this.lightningFlash = 1.0;
          sound.playExplosion();
        }
      }
    }

    // 3. Ambient World Particles (Cherry Blossom Petals, Torch Flames, Portal Motes, Nether Ash)
    this.scanClock += dt;
    if (this.scanClock >= 0.16 && this.sparks.length < 72) {
      this.scanClock = 0;

      for (let tries = 0; tries < 5; tries++) {
        const rx = Math.floor(playerX + (Math.random() - 0.5) * 20);
        const ry = Math.floor(playerY + (Math.random() - 0.3) * 10);
        const rz = Math.floor(playerZ + (Math.random() - 0.5) * 20);
        const id = world.getBlock(rx, ry, rz);

        if (id === BLOCK.CHERRY_LEAVES) {
          this.spawnSpark(
            rx + Math.random(),
            ry - 0.1,
            rz + Math.random(),
            (Math.random() - 0.5) * 0.6,
            -0.85,
            (Math.random() - 0.5) * 0.6,
            0xf9a8d4,
            3.4,
            true
          );
        } else if (id === BLOCK.TORCH || id === BLOCK.FURNACE_LIT || id === BLOCK.CAMPFIRE || isLavaBlock(id)) {
          this.spawnSpark(
            rx + 0.5 + (Math.random() - 0.5) * 0.25,
            ry + 0.72,
            rz + 0.5 + (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 0.25,
            0.75 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.25,
            Math.random() < 0.65 ? 0xfbbf24 : 0xf97316,
            1.1,
            false
          );
        } else if (id === BLOCK.NETHER_PORTAL || id === BLOCK.END_PORTAL) {
          this.spawnSpark(
            rx + Math.random(),
            ry + Math.random(),
            rz + Math.random(),
            (Math.random() - 0.5) * 0.7,
            0.55,
            (Math.random() - 0.5) * 0.7,
            id === BLOCK.END_PORTAL ? 0x38bdf8 : 0xd946ef,
            1.5,
            false
          );
        }
      }

      if (dim === 'nether' && this.sparks.length < 60) {
        this.spawnSpark(
          playerX + (Math.random() - 0.5) * 18,
          playerY + (Math.random() - 0.2) * 8,
          playerZ + (Math.random() - 0.5) * 18,
          0.3,
          0.45,
          -0.2,
          0xfb923c,
          2.0,
          false
        );
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        this.releaseSpark(s);
        this.sparks.splice(i, 1);
        continue;
      }
      if (s.petal) {
        s.mesh.position.x += (s.vx + Math.sin(s.life * 3.2) * 0.35) * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += (s.vz + Math.cos(s.life * 2.7) * 0.35) * dt;
        s.mesh.rotation.y += dt * 1.8;
        s.mesh.rotation.z = Math.sin(s.life * 4) * 0.35;
      } else {
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        const scale = Math.max(0.2, 1 - s.life / s.maxLife);
        s.mesh.scale.setScalar(scale);
      }
    }
  }

  private releaseSpark(s: AmbientSpark) {
    this.scene.remove(s.mesh);
    const pool = s.petal ? this.petalPool : this.sparkPool;
    if (pool.length < 72) {
      pool.push(s.mesh);
    } else {
      (s.mesh.material as THREE.Material).dispose();
    }
  }

  public clearSparks() {
    for (const s of this.sparks) {
      this.releaseSpark(s);
    }
    this.sparks = [];
    this.roofCacheStamp.fill(-999);
  }

  private spawnSpark(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    hex: number,
    maxLife: number,
    petal: boolean
  ) {
    const pool = petal ? this.petalPool : this.sparkPool;
    let mesh = pool.pop();
    if (mesh) {
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(hex);
      mesh.scale.setScalar(1);
      mesh.rotation.set(0, 0, 0);
    } else {
      const mat = new THREE.MeshBasicMaterial({ color: hex });
      mesh = new THREE.Mesh(petal ? this.petalGeo : this.sparkGeo, mat);
    }
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.sparks.push({ mesh, vx, vy, vz, life: 0, maxLife, petal });
  }
}
