// Zero-Lag 3D Canonical Tensura Ultimate Skill VFX Renderer
// Uses shared pre-allocated Three.js geometries and auto-disposing materials for 0 GC/GPU stutter.

import * as THREE from 'three';

interface TransientVfx {
  group: THREE.Group;
  mats: THREE.MeshBasicMaterial[];
  age: number;
  duration: number;
  onTick?: (progress: number, dt: number) => void;
}

export class TensuraVfxManager {
  private scene: THREE.Scene;
  private effects: TransientVfx[] = [];

  // Shared static geometries (allocated ONCE, never disposed during gameplay)
  private sphereGeo = new THREE.SphereGeometry(1, 28, 20);
  private cylGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true);
  private coneGeo = new THREE.ConeGeometry(1, 1, 24, 1, true);
  private solidConeGeo = new THREE.ConeGeometry(1, 1, 20, 1, false);
  private ringGeo = new THREE.RingGeometry(0.76, 1.0, 36);
  private torusGeo = new THREE.TorusGeometry(1, 0.075, 14, 32);
  private arcGeo = new THREE.TorusGeometry(1, 0.085, 14, 28, Math.PI * 0.88);
  private octaGeo = new THREE.OctahedronGeometry(1, 0);
  private boxGeo = new THREE.BoxGeometry(1, 1, 1);
  private shurikenBladeGeo: THREE.BufferGeometry = (() => {
    const sh = new THREE.Shape();
    sh.moveTo(0.18, -0.10);
    sh.quadraticCurveTo(0.95, -0.36, 1.85, 0.14);
    sh.quadraticCurveTo(1.05, 0.42, 0.18, 0.14);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
      curveSegments: 14
    });
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  })();

  // Persistent Player Auras (Uriel Absolute Guard, Yog-Sothoth Time Stop & Awakening Overdrive)
  private urielGroup = new THREE.Group();
  private urielShell: THREE.Mesh;
  private urielRing: THREE.Mesh;
  private timeStopRing: THREE.Mesh;
  private awakeningGroup = new THREE.Group();
  private awakeningMats: THREE.MeshBasicMaterial[] = [];
  private activeManifestationKey = '';
  private awakeningAnimClock = 0;
  private awakeningSpinNodes: Array<{ obj: THREE.Object3D; speedY?: number; speedZ?: number; speedX?: number; bobAmp?: number; bobFreq?: number; baseY?: number; swayAmp?: number; swayPhase?: number }> = [];

  // Zero-GC Ambient Meadow Magicule Fireflies (1 Single InstancedMesh = 1 Draw Call!)
  private readonly fireflyCount = 28;
  private fireflyMesh: THREE.InstancedMesh;
  private fireflyMat: THREE.MeshBasicMaterial;
  private fireflySeeds = new Float32Array(28 * 4);
  private fireflyDummy = new THREE.Object3D();
  private ambientClock = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Ambient Magicule / Firefly InstancedMesh (Overworld living atmosphere at 0 GC cost)
    this.fireflyMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    this.fireflyMesh = new THREE.InstancedMesh(this.octaGeo, this.fireflyMat, this.fireflyCount);
    this.fireflyMesh.frustumCulled = false;
    this.fireflyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const cGold = new THREE.Color(0xfde047);
    const cCyan = new THREE.Color(0x38bdf8);
    const cEmerald = new THREE.Color(0x4ade80);
    for (let i = 0; i < this.fireflyCount; i++) {
      this.fireflySeeds[i * 4 + 0] = (Math.random() - 0.5) * 30;
      this.fireflySeeds[i * 4 + 1] = 0.6 + Math.random() * 4.2;
      this.fireflySeeds[i * 4 + 2] = (Math.random() - 0.5) * 30;
      this.fireflySeeds[i * 4 + 3] = Math.random() * Math.PI * 2;
      this.fireflyMesh.setColorAt(i, i % 3 === 0 ? cCyan : i % 5 === 0 ? cEmerald : cGold);
    }
    if (this.fireflyMesh.instanceColor) this.fireflyMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.fireflyMesh);

    // Rotate cylGeo & coneGeo helpers on mesh level as needed
    const urielMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.24,
      wireframe: true,
      depthWrite: false
    });
    const urielSolidMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.urielShell = new THREE.Mesh(this.octaGeo, urielMat);
    this.urielShell.scale.set(1.25, 1.45, 1.25);
    const innerShell = new THREE.Mesh(this.octaGeo, urielSolidMat);
    innerShell.scale.set(1.18, 1.38, 1.18);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.urielRing = new THREE.Mesh(this.ringGeo, ringMat);
    this.urielRing.rotation.x = -Math.PI / 2;
    this.urielRing.position.y = -0.82;
    this.urielRing.scale.setScalar(1.45);

    this.urielGroup.add(innerShell, this.urielShell, this.urielRing);
    this.urielGroup.visible = false;
    this.scene.add(this.urielGroup);

    const tsMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.timeStopRing = new THREE.Mesh(this.ringGeo, tsMat);
    this.timeStopRing.rotation.x = -Math.PI / 2;
    this.timeStopRing.visible = false;
    this.scene.add(this.timeStopRing);

    this.awakeningGroup.visible = false;
    this.scene.add(this.awakeningGroup);
  }

  private pushEffect(
    group: THREE.Group,
    mats: THREE.MeshBasicMaterial[],
    duration: number,
    onTick?: (progress: number, dt: number) => void,
    exactDuration = false
  ) {
    if (this.effects.length >= 64) {
      this.removeAt(0);
    }
    // Authentic anime pacing: sustain ultimate skill VFX (2.1s - 3.6s) while keeping vanilla micro-sparks (<0.42s) crisp
    const scaledDuration = !exactDuration && duration >= 0.45 ? Math.min(3.8, Math.max(2.1, duration * 3.15)) : duration;
    this.scene.add(group);
    this.effects.push({ group, mats, age: 0, duration: scaledDuration, onTick });
  }

  private mkMat(color: number, opacity = 0.85): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  // 1. Oburluk Kralı Beelzebuth: Abyssal Violet-Cyan Devouring Vortex Cone
  public spawnDevourVortex(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number) {
    const grp = new THREE.Group();
    grp.position.set(ox, oy, oz);
    grp.lookAt(ox + dx * 6, oy + dy * 6, oz + dz * 6);

    const coneMat = this.mkMat(0x4c1d95, 0.56);
    const ringMat1 = this.mkMat(0x38bdf8, 0.82);
    const ringMat2 = this.mkMat(0xa855f7, 0.78);

    const cone = new THREE.Mesh(this.coneGeo, coneMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 3.4;
    cone.scale.set(2.3, 6.8, 2.3);

    const r1 = new THREE.Mesh(this.torusGeo, ringMat1);
    r1.position.z = 2.2;
    r1.scale.setScalar(1.05);

    const r2 = new THREE.Mesh(this.torusGeo, ringMat2);
    r2.position.z = 4.8;
    r2.scale.setScalar(1.95);

    grp.add(cone, r1, r2);
    this.pushEffect(grp, [coneMat, ringMat1, ringMat2], 0.55, (p, dt) => {
      cone.rotation.y += dt * 14;
      r1.rotation.z -= dt * 16;
      r2.rotation.z += dt * 12;
      r2.position.z = 5.4 * (1 - p * 0.72);
      r2.scale.setScalar(2.1 * (1 - p * 0.65));
      const fade = 1 - p;
      coneMat.opacity = 0.56 * fade;
      ringMat1.opacity = 0.82 * fade;
      ringMat2.opacity = 0.78 * fade;
    });
  }

  // 2. Hiçlik Tanrısı Azathoth (Turn Null): Collapsing Black-Gold Void Singularity + Implosion
  public spawnTurnNullSingularity(cx: number, cy: number, cz: number, radius = 8.5) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const coreMat = this.mkMat(0x090414, 0.94);
    const haloMat = this.mkMat(0xfacc15, 0.88);
    const waveMat = this.mkMat(0xa855f7, 0.72);

    const core = new THREE.Mesh(this.sphereGeo, coreMat);
    const halo = new THREE.Mesh(this.torusGeo, haloMat);
    halo.rotation.x = Math.PI * 0.35;
    const wave = new THREE.Mesh(this.sphereGeo, waveMat);

    grp.add(wave, core, halo);
    this.pushEffect(grp, [coreMat, haloMat, waveMat], 0.78, (p, dt) => {
      halo.rotation.z += dt * 14;
      halo.rotation.y += dt * 9;
      if (p < 0.45) {
        const k = p / 0.45;
        core.scale.setScalar(0.5 + k * 2.1);
        halo.scale.setScalar(radius * (1 - k * 0.68));
        wave.scale.setScalar(radius * (1 - k * 0.55));
      } else {
        const k = (p - 0.45) / 0.55;
        core.scale.setScalar(Math.max(0.1, 2.6 * (1 - k)));
        halo.scale.setScalar(1.8 + k * radius * 1.15);
        wave.scale.setScalar(1.2 + k * radius);
        coreMat.opacity = 0.94 * (1 - k);
        haloMat.opacity = 0.88 * (1 - k);
        waveMat.opacity = 0.65 * (1 - k);
      }
    });
  }

  // 3. Fırtına Kralı Veldora: Jagged 3D Sky-to-Ground Black-Gold Lightning Bolts
  public spawnTempestLightning(strikes: Array<[number, number, number]>) {
    const grp = new THREE.Group();
    const coreMat = this.mkMat(0xfef08a, 0.95);
    const darkMat = this.mkMat(0x312e81, 0.82);
    const ringMat = this.mkMat(0xfacc15, 0.82);
    const rings: THREE.Mesh[] = [];

    for (const [sx, sy, sz] of strikes) {
      let lx = sx;
      let lz = sz;
      const segs = 6;
      const topH = 15;
      for (let s = 0; s < segs; s++) {
        const y0 = sy + (s / segs) * topH;
        const y1 = sy + ((s + 1) / segs) * topH;
        const nx = s === segs - 1 ? sx : sx + (Math.random() - 0.5) * 1.4;
        const nz = s === segs - 1 ? sz : sz + (Math.random() - 0.5) * 1.4;
        const mx = (lx + nx) * 0.5;
        const my = (y0 + y1) * 0.5;
        const mz = (lz + nz) * 0.5;
        const len = Math.hypot(nx - lx, y1 - y0, nz - lz);

        const bolt = new THREE.Mesh(this.boxGeo, coreMat);
        bolt.position.set(mx, my, mz);
        bolt.lookAt(nx, y1, nz);
        bolt.scale.set(0.14, 0.14, len + 0.12);

        const sheath = new THREE.Mesh(this.boxGeo, darkMat);
        sheath.position.set(mx, my, mz);
        sheath.lookAt(nx, y1, nz);
        sheath.scale.set(0.32, 0.32, len + 0.16);

        grp.add(sheath, bolt);
        lx = nx;
        lz = nz;
      }

      const ring = new THREE.Mesh(this.ringGeo, ringMat);
      ring.position.set(sx, sy + 0.08, sz);
      ring.rotation.x = -Math.PI / 2;
      grp.add(ring);
      rings.push(ring);
    }

    this.pushEffect(grp, [coreMat, darkMat, ringMat], 0.52, (p) => {
      const s = 0.8 + p * 3.8;
      for (let i = 0; i < rings.length; i++) rings[i].scale.setScalar(s);
      const fade = 1 - p;
      coreMat.opacity = 0.95 * fade;
      darkMat.opacity = 0.82 * fade;
      ringMat.opacity = 0.82 * fade;
    });
  }

  // 4. Güneş Tanrısı Amaterasu (Benimaru Hellflare): Crimson-Black Plasma Dome
  public spawnHellflareDome(cx: number, cy: number, cz: number, radius = 6.5) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const outerMat = this.mkMat(0x1a050d, 0.78);
    const innerMat = this.mkMat(0xef4444, 0.72);
    const coreMat = this.mkMat(0xfef08a, 0.90);
    const ringMat = this.mkMat(0xf97316, 0.85);

    const outer = new THREE.Mesh(this.sphereGeo, outerMat);
    const inner = new THREE.Mesh(this.sphereGeo, innerMat);
    const core = new THREE.Mesh(this.sphereGeo, coreMat);
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;

    grp.add(outer, inner, core, ring);
    this.pushEffect(grp, [outerMat, innerMat, coreMat, ringMat], 0.72, (p, dt) => {
      outer.rotation.y += dt * 5;
      const grow = p < 0.3 ? p / 0.3 : 1 + (p - 0.3) * 0.18;
      outer.scale.setScalar(radius * grow);
      inner.scale.setScalar(radius * 0.84 * grow);
      core.scale.setScalar(radius * 0.42 * (1 - p * 0.5));
      ring.scale.setScalar(radius * 1.22 * grow);
      const fade = p < 0.4 ? 1 : 1 - (p - 0.4) / 0.6;
      outerMat.opacity = 0.78 * fade;
      innerMat.opacity = 0.72 * fade;
      coreMat.opacity = 0.90 * fade;
      ringMat.opacity = 0.85 * fade;
    });
  }

  // 5. Piercing 3D Energy / Dimension / Stardust / Railgun Beam (Sephirot, Drago Nova, Abaddon)
  public spawnLaserBeam(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    length: number,
    radius: number,
    coreColor: number,
    outerColor: number
  ) {
    const grp = new THREE.Group();
    grp.position.set(ox, oy, oz);
    grp.lookAt(ox + dx * 10, oy + dy * 10, oz + dz * 10);

    const coreMat = this.mkMat(coreColor, 0.95);
    const outerMat = this.mkMat(outerColor, 0.58);
    const circleMat = this.mkMat(coreColor, 0.88);

    const beamCore = new THREE.Mesh(this.cylGeo, coreMat);
    beamCore.rotation.x = Math.PI / 2;
    beamCore.position.z = length * 0.5;
    beamCore.scale.set(radius * 0.52, length, radius * 0.52);

    const beamOuter = new THREE.Mesh(this.cylGeo, outerMat);
    beamOuter.rotation.x = Math.PI / 2;
    beamOuter.position.z = length * 0.5;
    beamOuter.scale.set(radius, length, radius);

    const muzzle1 = new THREE.Mesh(this.ringGeo, circleMat);
    muzzle1.position.z = 0.5;
    muzzle1.scale.setScalar(radius * 2.6);

    const muzzle2 = new THREE.Mesh(this.torusGeo, outerMat);
    muzzle2.position.z = 1.1;
    muzzle2.scale.setScalar(radius * 1.8);

    const blast = new THREE.Mesh(this.sphereGeo, outerMat);
    blast.position.z = length;
    blast.scale.setScalar(radius * 3.2);

    const spiralRings: THREE.Mesh[] = [];
    for (let s = 0; s < 3; s++) {
      const sr = new THREE.Mesh(this.torusGeo, circleMat);
      sr.position.z = 2.0 + s * (length * 0.28);
      sr.scale.setScalar(radius * 1.45);
      grp.add(sr);
      spiralRings.push(sr);
    }

    grp.add(beamOuter, beamCore, muzzle1, muzzle2, blast);
    this.pushEffect(grp, [coreMat, outerMat, circleMat], 0.62, (p, dt) => {
      muzzle1.rotation.z += dt * 12;
      muzzle2.rotation.z -= dt * 16;
      const w = Math.max(0.08, 1 - p * 0.88);
      beamCore.scale.set(radius * 0.52 * w, length, radius * 0.52 * w);
      beamOuter.scale.set(radius * (1 + p * 0.35) * w, length, radius * (1 + p * 0.35) * w);
      blast.scale.setScalar(radius * (2.6 + p * 3.5));
      for (let s = 0; s < spiralRings.length; s++) {
        const sr = spiralRings[s];
        sr.position.z = ((s * 0.33 + p * 1.35) % 1) * length;
        sr.rotation.z += dt * 18;
        sr.scale.setScalar(radius * (1.35 + s * 0.18) * w);
      }
      const fade = 1 - p;
      coreMat.opacity = 0.95 * fade;
      outerMat.opacity = 0.58 * fade;
      circleMat.opacity = 0.88 * fade;
    });
  }

  // 6. Colossal 3D Crescent Odachi / Shadow / Reality Slashes (Susanoo, Mephisto, Tsukuyomi)
  public spawnCrescentSlash(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    scale: number,
    coreColor: number,
    edgeColor: number,
    crossSlash = false
  ) {
    const grp = new THREE.Group();
    grp.position.set(ox, oy, oz);
    grp.lookAt(ox + dx * 8, oy + dy * 8, oz + dz * 8);

    const coreMat = this.mkMat(coreColor, 0.92);
    const edgeMat = this.mkMat(edgeColor, 0.68);

    const arc1 = new THREE.Mesh(this.arcGeo, coreMat);
    arc1.rotation.set(Math.PI * 0.5, 0, -0.25);
    arc1.scale.setScalar(scale);

    const edge1 = new THREE.Mesh(this.arcGeo, edgeMat);
    edge1.rotation.set(Math.PI * 0.5, 0, -0.25);
    edge1.scale.setScalar(scale * 1.14);

    grp.add(edge1, arc1);

    if (crossSlash) {
      const arc2 = new THREE.Mesh(this.arcGeo, coreMat);
      arc2.rotation.set(Math.PI * 0.18, 0.35, 0.68);
      arc2.scale.setScalar(scale * 0.92);
      grp.add(arc2);
    }

    this.pushEffect(grp, [coreMat, edgeMat], 0.46, (p) => {
      grp.position.set(ox + dx * p * 7.5, oy + dy * p * 7.5, oz + dz * p * 7.5);
      const fade = 1 - p;
      coreMat.opacity = 0.92 * fade;
      edgeMat.opacity = 0.68 * fade;
    });
  }

  // 7. Towering Sky Pillar (Guy Crimson's Lucifer Prominence)
  public spawnSkyPillar(cx: number, cy: number, cz: number, radius: number, height: number, coreColor: number, outerColor: number) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const coreMat = this.mkMat(coreColor, 0.90);
    const outerMat = this.mkMat(outerColor, 0.62);
    const ringMat = this.mkMat(coreColor, 0.84);

    const pCore = new THREE.Mesh(this.cylGeo, coreMat);
    pCore.position.y = height * 0.5;
    pCore.scale.set(radius * 0.6, height, radius * 0.6);

    const pOuter = new THREE.Mesh(this.cylGeo, outerMat);
    pOuter.position.y = height * 0.5;
    pOuter.scale.set(radius, height, radius);

    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;

    grp.add(pOuter, pCore, ring);
    this.pushEffect(grp, [coreMat, outerMat, ringMat], 0.80, (p, dt) => {
      pOuter.rotation.y += dt * 8;
      const expand = 0.5 + p * 0.85;
      pCore.scale.set(radius * 0.6 * (1 - p * 0.5), height, radius * 0.6 * (1 - p * 0.5));
      pOuter.scale.set(radius * expand, height, radius * expand);
      ring.scale.setScalar(radius * (1.2 + p * 2.4));
      const fade = 1 - p;
      coreMat.opacity = 0.90 * fade;
      outerMat.opacity = 0.62 * fade;
      ringMat.opacity = 0.84 * fade;
    });
  }

  // 8. Expanding Domain Nova Sphere & Glyph Rings (Yog-Sothoth Time Stop, Belial White World, Samael Death Rose)
  public spawnNovaSphere(cx: number, cy: number, cz: number, radius: number, sphereColor: number, ringColor: number) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const spMat = this.mkMat(sphereColor, 0.42);
    const rMat = this.mkMat(ringColor, 0.86);

    const sp = new THREE.Mesh(this.sphereGeo, spMat);
    const r1 = new THREE.Mesh(this.torusGeo, rMat);
    r1.rotation.x = Math.PI / 2;
    const r2 = new THREE.Mesh(this.torusGeo, rMat);
    r2.rotation.y = Math.PI / 3;

    grp.add(sp, r1, r2);
    this.pushEffect(grp, [spMat, rMat], 0.72, (p, dt) => {
      const s = 0.6 + p * radius;
      sp.scale.setScalar(s);
      r1.scale.setScalar(s * 1.08);
      r2.scale.setScalar(s * 0.92);
      r1.rotation.z += dt * 10;
      r2.rotation.x += dt * 10;
      const fade = 1 - p;
      spMat.opacity = 0.42 * fade;
      rMat.opacity = 0.86 * fade;
    });
  }

  // 9. Velzard's Cthulhu Absolute Zero: Erupting 3D Diamond Ice Crystal Spires
  public spawnFrostSpires(cx: number, cy: number, cz: number, radius = 8.5) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const iceMat = this.mkMat(0x67e8f9, 0.82);
    const rimMat = this.mkMat(0xe0f2fe, 0.88);
    const spires: THREE.Mesh[] = [];

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const dist = radius * (0.45 + (i % 2) * 0.35);
      const sp = new THREE.Mesh(this.octaGeo, iceMat);
      sp.position.set(Math.cos(ang) * dist, 1.4, Math.sin(ang) * dist);
      sp.rotation.set((Math.random() - 0.5) * 0.35, ang, (Math.random() - 0.5) * 0.35);
      sp.scale.set(0.65, 2.8, 0.65);
      grp.add(sp);
      spires.push(sp);
    }

    const floorRing = new THREE.Mesh(this.ringGeo, rimMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.1;
    grp.add(floorRing);

    this.pushEffect(grp, [iceMat, rimMat], 0.95, (p) => {
      const rise = Math.min(1, p * 4.5);
      for (let i = 0; i < spires.length; i++) {
        spires[i].scale.set(0.65, 2.9 * rise, 0.65);
        spires[i].position.y = 1.35 * rise;
      }
      floorRing.scale.setScalar(1 + p * radius * 1.1);
      const fade = p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
      iceMat.opacity = 0.82 * fade;
      rimMat.opacity = 0.88 * fade;
    });
  }

  // 10. Vanilla Critical Hit Golden Starburst Sparks
  public spawnCritSparks(cx: number, cy: number, cz: number) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);
    const goldMat = this.mkMat(0xfef08a, 0.95);
    const amberMat = this.mkMat(0xf59e0b, 0.88);
    const sparks: Array<{ m: THREE.Mesh; vx: number; vy: number; vz: number }> = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const m = new THREE.Mesh(this.octaGeo, i % 2 === 0 ? goldMat : amberMat);
      m.scale.setScalar(0.11);
      grp.add(m);
      sparks.push({
        m,
        vx: Math.cos(a) * (2.4 + (i % 3) * 0.65),
        vy: 1.6 + (i % 3) * 0.9,
        vz: Math.sin(a) * (2.4 + (i % 3) * 0.65)
      });
    }
    this.pushEffect(grp, [goldMat, amberMat], 0.36, (p, dt) => {
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.vy -= 12 * dt;
        s.m.position.x += s.vx * dt;
        s.m.position.y += s.vy * dt;
        s.m.position.z += s.vz * dt;
        s.m.rotation.x += 9 * dt;
        s.m.rotation.y += 9 * dt;
        s.m.scale.setScalar(0.12 * (1 - p * 0.7));
      }
      goldMat.opacity = 0.95 * (1 - p);
      amberMat.opacity = 0.88 * (1 - p);
    });
  }

  // 11. Vanilla Charged Sword Sweep Attack Crescent Arc
  public spawnSwordSweep(ox: number, oy: number, oz: number, yaw: number) {
    const grp = new THREE.Group();
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    grp.position.set(ox + fwdX * 1.15, oy, oz + fwdZ * 1.15);
    grp.rotation.y = yaw;

    const coreMat = this.mkMat(0xf8fafc, 0.90);
    const rimMat = this.mkMat(0x7dd3fc, 0.64);
    const arc = new THREE.Mesh(this.arcGeo, coreMat);
    arc.rotation.set(Math.PI * 0.5, 0, Math.PI * 0.56);
    arc.scale.set(1.25, 1.25, 0.55);
    const rim = new THREE.Mesh(this.arcGeo, rimMat);
    rim.rotation.set(Math.PI * 0.5, 0, Math.PI * 0.56);
    rim.scale.set(1.38, 1.38, 0.75);
    grp.add(rim, arc);

    this.pushEffect(grp, [coreMat, rimMat], 0.24, (p) => {
      const grow = 0.86 + p * 0.42;
      arc.scale.set(1.25 * grow, 1.25 * grow, 0.55);
      rim.scale.set(1.38 * grow, 1.38 * grow, 0.75);
      coreMat.opacity = 0.90 * (1 - p);
      rimMat.opacity = 0.64 * (1 - p);
    });
  }

  // 12. Shield Deflection Shock Ring & Sparks
  public spawnShieldDeflect(cx: number, cy: number, cz: number, yaw: number) {
    const grp = new THREE.Group();
    grp.position.set(cx - Math.sin(yaw) * 0.75, cy, cz - Math.cos(yaw) * 0.75);
    grp.rotation.y = yaw;

    const ringMat = this.mkMat(0xfef08a, 0.88);
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.scale.setScalar(0.32);
    grp.add(ring);

    this.pushEffect(grp, [ringMat], 0.24, (p) => {
      ring.scale.setScalar(0.32 + p * 1.05);
      ringMat.opacity = 0.88 * (1 - p);
    });
  }

  // 13. Crisp Water Entry / Splash Expanding Ripple
  public spawnWaterSplash(cx: number, cy: number, cz: number) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy + 0.06, cz);
    const rMat = this.mkMat(0xe0f2fe, 0.82);
    const dMat = this.mkMat(0x38bdf8, 0.78);
    const ring = new THREE.Mesh(this.ringGeo, rMat);
    ring.rotation.x = -Math.PI / 2;
    grp.add(ring);

    const drops: Array<{ m: THREE.Mesh; vx: number; vy: number; vz: number }> = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const m = new THREE.Mesh(this.sphereGeo, dMat);
      m.scale.setScalar(0.075);
      grp.add(m);
      drops.push({ m, vx: Math.cos(a) * 1.8, vy: 2.6 + (i % 2) * 0.8, vz: Math.sin(a) * 1.8 });
    }

    this.pushEffect(grp, [rMat, dMat], 0.42, (p, dt) => {
      ring.scale.setScalar(0.45 + p * 1.85);
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.vy -= 14 * dt;
        d.m.position.x += d.vx * dt;
        d.m.position.y += d.vy * dt;
        d.m.position.z += d.vz * dt;
      }
      rMat.opacity = 0.82 * (1 - p);
      dMat.opacity = 0.78 * (1 - p);
    });
  }

  // 14. Naruto Rasenshuriken: Glowing White-Cyan Chakra Core + 4 Sculpted Curved 3D Wind-Shuriken Blades + Vortex Dome
  public spawnRasenshuriken(cx: number, cy: number, cz: number, radius = 8.0) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy + 1.1, cz);

    const innerWhiteMat = this.mkMat(0xffffff, 0.96);
    const coreMat = this.mkMat(0x38bdf8, 0.92);
    const bladeMat = this.mkMat(0xe0f2fe, 0.94);
    const domeMat = this.mkMat(0x7dd3fc, 0.38);

    const innerCore = new THREE.Mesh(this.sphereGeo, innerWhiteMat);
    innerCore.scale.setScalar(0.58);
    const core = new THREE.Mesh(this.sphereGeo, coreMat);
    core.scale.setScalar(1.02);
    const dome = new THREE.Mesh(this.sphereGeo, domeMat);
    const windRing = new THREE.Mesh(this.torusGeo, bladeMat);
    windRing.rotation.x = Math.PI * 0.5;
    windRing.scale.setScalar(2.4);

    const rotor = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(this.shurikenBladeGeo, bladeMat);
      blade.rotation.y = (i * Math.PI) / 2;
      blade.scale.setScalar(1.55);
      rotor.add(blade);
    }
    rotor.add(windRing);
    grp.add(dome, core, innerCore, rotor);

    this.pushEffect(grp, [innerWhiteMat, coreMat, bladeMat, domeMat], 0.84, (p, dt) => {
      rotor.rotation.y += dt * 30;
      rotor.scale.setScalar(1 + p * 1.5);
      dome.scale.setScalar(0.8 + p * radius);
      core.scale.setScalar(1.02 + p * 1.65);
      innerCore.scale.setScalar(0.58 + p * 0.95);
      const fade = p < 0.45 ? 1 : 1 - (p - 0.45) / 0.55;
      innerWhiteMat.opacity = 0.96 * fade;
      coreMat.opacity = 0.92 * fade;
      bladeMat.opacity = 0.94 * fade;
      domeMat.opacity = 0.38 * fade;
    });
  }

  // 15. Bleach Aizen Hado #90 Kurohitsugi: Gravity Black-Violet Coffin Cube + Piercing Spears
  public spawnKurohitsugiBox(cx: number, cy: number, cz: number, size = 7.2) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy + size * 0.42, cz);

    const boxMat = this.mkMat(0x1e1b4b, 0.76);
    const frameMat = this.mkMat(0xa855f7, 0.90);
    const spearMat = this.mkMat(0x090414, 0.94);

    const cube = new THREE.Mesh(this.boxGeo, boxMat);
    const ring = new THREE.Mesh(this.ringGeo, frameMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -size * 0.4;
    grp.add(cube, ring);

    const spears: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(this.solidConeGeo, spearMat);
      const ang = (i / 6) * Math.PI * 2;
      sp.position.set(Math.cos(ang) * size * 0.35, 0, Math.sin(ang) * size * 0.35);
      sp.rotation.set(0.55, ang, 0.45);
      sp.scale.set(0.22, size * 1.45, 0.22);
      grp.add(sp);
      spears.push(sp);
    }

    this.pushEffect(grp, [boxMat, frameMat, spearMat], 0.85, (p) => {
      const grow = Math.min(1, p * 3.8);
      cube.scale.set(size * 0.72 * grow, size * 0.88 * grow, size * 0.72 * grow);
      ring.scale.setScalar(size * 0.85 * grow);
      for (let i = 0; i < spears.length; i++) {
        spears[i].visible = p > 0.22;
      }
      const fade = p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
      boxMat.opacity = 0.76 * fade;
      frameMat.opacity = 0.90 * fade;
      spearMat.opacity = 0.94 * fade;
    });
  }

  // 16. Bleach Byakuya Senbonzakura Kageyoshi: Swirling 3D Sakura Blade Petal Tempest
  public spawnSenbonzakuraStorm(cx: number, cy: number, cz: number, radius = 8.5) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy + 0.2, cz);

    const pinkMat = this.mkMat(0xf472b6, 0.92);
    const paleMat = this.mkMat(0xfbcfe8, 0.88);
    const petals: Array<{ m: THREE.Mesh; a: number; r: number; h: number }> = [];

    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(this.octaGeo, i % 2 === 0 ? pinkMat : paleMat);
      m.scale.set(0.18, 0.75, 0.08);
      grp.add(m);
      petals.push({
        m,
        a: (i / 16) * Math.PI * 2,
        r: 1.5 + (i % 4) * (radius * 0.22),
        h: 0.5 + (i % 5) * 0.75
      });
    }
    const baseRing = new THREE.Mesh(this.torusGeo, pinkMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.25;
    grp.add(baseRing);

    this.pushEffect(grp, [pinkMat, paleMat], 0.88, (p, dt) => {
      baseRing.scale.setScalar(1.2 + p * radius * 0.95);
      baseRing.rotation.z += dt * 12;
      for (let i = 0; i < petals.length; i++) {
        const pt = petals[i];
        pt.a += dt * (9 + (i % 3) * 2.5);
        const curR = pt.r * (0.55 + p * 0.75);
        pt.m.position.set(Math.cos(pt.a) * curR, pt.h + Math.sin(pt.a * 2) * 0.45, Math.sin(pt.a) * curR);
        pt.m.rotation.set(0.6, -pt.a, 0.4);
      }
      const fade = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5;
      pinkMat.opacity = 0.92 * fade;
      paleMat.opacity = 0.88 * fade;
    });
  }

  // 17. Dragon Ball Genki Dama (Universal Spirit Bomb): Descending Sky-Blue Star Sphere
  public spawnSpiritBomb(cx: number, cy: number, cz: number, radius = 9.5) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const outerMat = this.mkMat(0x38bdf8, 0.72);
    const coreMat = this.mkMat(0xf8fafc, 0.95);
    const ringMat = this.mkMat(0xbae6fd, 0.88);

    const orbOuter = new THREE.Mesh(this.sphereGeo, outerMat);
    const orbCore = new THREE.Mesh(this.sphereGeo, coreMat);
    const waveRing = new THREE.Mesh(this.ringGeo, ringMat);
    waveRing.rotation.x = -Math.PI / 2;
    waveRing.position.y = 0.15;
    grp.add(orbOuter, orbCore, waveRing);

    this.pushEffect(grp, [outerMat, coreMat, ringMat], 0.92, (p) => {
      if (p < 0.42) {
        const k = p / 0.42;
        const yOff = (1 - k) * 9.5 + 1.5;
        orbOuter.position.y = yOff;
        orbCore.position.y = yOff;
        orbOuter.scale.setScalar(3.4 + k * 1.2);
        orbCore.scale.setScalar(2.4 + k * 0.9);
        waveRing.scale.setScalar(1.2 + k * 2.5);
      } else {
        const k = (p - 0.42) / 0.58;
        orbOuter.position.y = 1.2;
        orbCore.position.y = 1.2;
        orbOuter.scale.setScalar(4.6 + k * radius * 0.85);
        orbCore.scale.setScalar(Math.max(0.2, 3.3 * (1 - k * 0.7)));
        waveRing.scale.setScalar(3.7 + k * radius * 1.25);
        const fade = 1 - k;
        outerMat.opacity = 0.72 * fade;
        coreMat.opacity = 0.95 * fade;
        ringMat.opacity = 0.88 * fade;
      }
    });
  }

  // 18. One Piece Gear 5 Bajrang Gun / Conqueror's Haki Impact: Crimson-Black Haki Lightning + Shock Dome
  public spawnBajrangImpact(cx: number, cy: number, cz: number, radius = 9.0) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const fistMat = this.mkMat(0x18181b, 0.92);
    const hakiMat = this.mkMat(0xef4444, 0.94);
    const whiteMat = this.mkMat(0xf8fafc, 0.65);

    const fist = new THREE.Mesh(this.sphereGeo, fistMat);
    const shock = new THREE.Mesh(this.sphereGeo, whiteMat);
    const ring = new THREE.Mesh(this.ringGeo, hakiMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.14;
    grp.add(shock, fist, ring);

    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const bolt = new THREE.Mesh(this.solidConeGeo, hakiMat);
      bolt.position.set(Math.cos(ang) * 2.6, 2.2, Math.sin(ang) * 2.6);
      bolt.rotation.set(0.5, ang, 0.35);
      bolt.scale.set(0.24, 4.8, 0.24);
      grp.add(bolt);
    }

    this.pushEffect(grp, [fistMat, hakiMat, whiteMat], 0.78, (p) => {
      const dropY = p < 0.32 ? (1 - p / 0.32) * 8.0 + 1.6 : 1.4;
      fist.position.y = dropY;
      fist.scale.setScalar(p < 0.32 ? 2.8 : 2.8 * (1 - (p - 0.32)));
      shock.scale.setScalar(1.2 + p * radius);
      ring.scale.setScalar(1.5 + p * radius * 1.25);
      const fade = p < 0.35 ? 1 : 1 - (p - 0.35) / 0.65;
      fistMat.opacity = 0.92 * fade;
      hakiMat.opacity = 0.94 * fade;
      whiteMat.opacity = 0.65 * fade;
    });
  }

  // 19. One Piece Trafalgar Law Ope Ope ROOM: Surgical Azure Hemisphere + Spatial Cross-Slash
  public spawnOpeRoomDome(cx: number, cy: number, cz: number, radius = 9.0) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const roomMat = this.mkMat(0x38bdf8, 0.28);
    const scanMat = this.mkMat(0xe0f2fe, 0.90);

    const dome = new THREE.Mesh(this.sphereGeo, roomMat);
    const eqRing = new THREE.Mesh(this.torusGeo, scanMat);
    eqRing.rotation.x = Math.PI / 2;
    eqRing.position.y = 0.15;
    const slash1 = new THREE.Mesh(this.arcGeo, scanMat);
    slash1.position.y = 1.2;
    slash1.scale.setScalar(3.4);
    grp.add(dome, eqRing, slash1);

    this.pushEffect(grp, [roomMat, scanMat], 0.76, (p, dt) => {
      const s = p < 0.28 ? (p / 0.28) * radius : radius;
      dome.scale.setScalar(s);
      eqRing.scale.setScalar(s);
      slash1.rotation.z += dt * 16;
      const fade = p < 0.48 ? 1 : 1 - (p - 0.48) / 0.52;
      roomMat.opacity = 0.28 * fade;
      scanMat.opacity = 0.90 * fade;
    });
  }

  // 20. Madara Tengai Shinsei / Astral Meteor Storm: Twin Colossal Falling Meteors + Seismic Shock Rings
  public spawnTwinMeteors(cx: number, cy: number, cz: number, radius = 10.5, coreColor = 0xd97706, outerColor = 0xef4444) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const rockMat = this.mkMat(0x27272a, 0.96);
    const lavaMat = this.mkMat(coreColor, 0.88);
    const shockMat = this.mkMat(outerColor, 0.82);

    const m1 = new THREE.Mesh(this.octaGeo, rockMat);
    const m1Glow = new THREE.Mesh(this.sphereGeo, lavaMat);
    const m2 = new THREE.Mesh(this.octaGeo, rockMat);
    const m2Glow = new THREE.Mesh(this.sphereGeo, lavaMat);
    const ring = new THREE.Mesh(this.ringGeo, shockMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.16;
    const dome = new THREE.Mesh(this.sphereGeo, shockMat);

    grp.add(m1Glow, m1, m2Glow, m2, ring, dome);

    this.pushEffect(grp, [rockMat, lavaMat, shockMat], 0.98, (p, dt) => {
      m1.rotation.x += dt * 3.5;
      m1.rotation.y += dt * 4.2;
      m2.rotation.z -= dt * 3.8;
      if (p < 0.46) {
        const k = p / 0.46;
        const y1 = (1 - k) * 16.0 + 1.8;
        const y2 = (1 - k) * 22.0 + 4.5;
        m1.position.set((1 - k) * -3.5, y1, (1 - k) * -2.0);
        m1Glow.position.copy(m1.position);
        m1.scale.setScalar(2.6 + k * 0.8);
        m1Glow.scale.setScalar(3.1 + k * 0.9);
        m2.position.set((1 - k) * 3.8, y2, (1 - k) * 2.2);
        m2Glow.position.copy(m2.position);
        m2.scale.setScalar(2.2 + k * 0.6);
        m2Glow.scale.setScalar(2.7 + k * 0.7);
        ring.scale.setScalar(1.5 + k * 3.0);
        dome.scale.setScalar(0.1);
      } else {
        const k = (p - 0.46) / 0.54;
        m1.position.set(0, 1.4, 0);
        m1Glow.position.set(0, 1.4, 0);
        m2.position.set(1.2, Math.max(1.2, (1 - Math.min(1, k * 1.6)) * 4.5 + 1.2), 0.8);
        m2Glow.position.copy(m2.position);
        const shrink = Math.max(0.15, 1 - k * 0.85);
        m1.scale.setScalar(3.4 * shrink);
        m1Glow.scale.setScalar(4.0 * shrink);
        m2.scale.setScalar(2.8 * shrink);
        m2Glow.scale.setScalar(3.3 * shrink);
        ring.scale.setScalar(4.5 + k * radius * 1.25);
        dome.scale.setScalar(1.8 + k * radius * 0.88);
        const fade = 1 - k;
        rockMat.opacity = 0.96 * fade;
        lavaMat.opacity = 0.88 * fade;
        shockMat.opacity = 0.78 * fade;
      }
    });
  }

  // 21. Itachi Tsukuyomi: Crimson Blood Moon + Orbiting Phantom Crow Blades
  public spawnTsukuyomiCrows(cx: number, cy: number, cz: number, radius = 9.0) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const moonMat = this.mkMat(0xdc2626, 0.90);
    const darkMat = this.mkMat(0x09090b, 0.94);
    const ringMat = this.mkMat(0xef4444, 0.78);

    const moon = new THREE.Mesh(this.sphereGeo, moonMat);
    moon.position.y = 6.2;
    moon.scale.setScalar(2.2);
    const floorRing = new THREE.Mesh(this.ringGeo, ringMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.14;
    grp.add(moon, floorRing);

    const crows: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const crow = new THREE.Mesh(this.shurikenBladeGeo, darkMat);
      crow.scale.set(0.55, 0.55, 0.55);
      grp.add(crow);
      crows.push(crow);
    }

    this.pushEffect(grp, [moonMat, darkMat, ringMat], 0.82, (p, dt) => {
      moon.rotation.y += dt * 2.5;
      floorRing.scale.setScalar(1.6 + p * radius);
      for (let i = 0; i < crows.length; i++) {
        const ang = (i / crows.length) * Math.PI * 2 + p * 11.5;
        const r = (1.8 + (i % 3) * 1.6) * (0.5 + p * 0.7);
        crows[i].position.set(Math.cos(ang) * r, 0.8 + (i % 4) * 0.95, Math.sin(ang) * r);
        crows[i].rotation.set(0.35, -ang, p * 8);
      }
      const fade = p < 0.45 ? 1 : 1 - (p - 0.45) / 0.55;
      moonMat.opacity = 0.90 * fade;
      darkMat.opacity = 0.94 * fade;
      ringMat.opacity = 0.78 * fade;
    });
  }

  // 22. Gaara Sabaku Sotaiso: Desert Grand Mausoleum Golden Sand Pyramid Seal
  public spawnSandPyramid(cx: number, cy: number, cz: number, size = 8.0) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const sandMat = this.mkMat(0xd97706, 0.82);
    const goldMat = this.mkMat(0xfde047, 0.86);

    const pyramid = new THREE.Mesh(this.octaGeo, sandMat);
    const swirl1 = new THREE.Mesh(this.torusGeo, goldMat);
    swirl1.rotation.x = Math.PI / 2;
    const swirl2 = new THREE.Mesh(this.ringGeo, goldMat);
    swirl2.rotation.x = -Math.PI / 2;
    swirl2.position.y = 0.14;
    grp.add(pyramid, swirl1, swirl2);

    this.pushEffect(grp, [sandMat, goldMat], 0.84, (p, dt) => {
      const grow = p < 0.35 ? p / 0.35 : 1.0;
      pyramid.position.y = grow * 2.4;
      pyramid.scale.set(size * 0.52 * grow, size * 0.68 * grow, size * 0.52 * grow);
      pyramid.rotation.y += dt * 1.8;
      swirl1.position.y = 1.2 + p * 3.0;
      swirl1.scale.setScalar(2.2 + p * size * 0.65);
      swirl1.rotation.z += dt * 10;
      swirl2.scale.setScalar(1.8 + p * size);
      const fade = p < 0.48 ? 1 : 1 - (p - 0.48) / 0.52;
      sandMat.opacity = 0.82 * fade;
      goldMat.opacity = 0.86 * fade;
    });
  }

  // 23. Hashirama Shinsu Senju: Mokuton Sacred Wood Dragon Spires + Emerald Sage Ring
  public spawnWoodBuddhaSpires(cx: number, cy: number, cz: number, radius = 9.5) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const woodMat = this.mkMat(0x92400e, 0.92);
    const leafMat = this.mkMat(0x16a34a, 0.86);
    const haloMat = this.mkMat(0xfacc15, 0.88);

    const halo = new THREE.Mesh(this.torusGeo, haloMat);
    halo.position.set(0, 4.6, -1.2);
    halo.scale.setScalar(3.4);
    const groundRing = new THREE.Mesh(this.ringGeo, leafMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.15;
    grp.add(halo, groundRing);

    const spires: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const dist = 2.4 + (i % 2) * 2.8;
      const sp = new THREE.Mesh(this.solidConeGeo, i % 3 === 0 ? leafMat : woodMat);
      sp.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
      sp.rotation.z = (Math.cos(ang)) * -0.18;
      sp.rotation.x = (Math.sin(ang)) * 0.18;
      grp.add(sp);
      spires.push(sp);
    }

    this.pushEffect(grp, [woodMat, leafMat, haloMat], 0.85, (p, dt) => {
      const rise = p < 0.32 ? p / 0.32 : 1.0;
      halo.rotation.z += dt * 3.6;
      groundRing.scale.setScalar(1.8 + p * radius);
      for (let i = 0; i < spires.length; i++) {
        const h = (5.2 + (i % 3) * 1.8) * rise;
        spires[i].scale.set(0.65, h, 0.65);
        spires[i].position.y = h * 0.5;
      }
      const fade = p < 0.48 ? 1 : 1 - (p - 0.48) / 0.52;
      woodMat.opacity = 0.92 * fade;
      leafMat.opacity = 0.86 * fade;
      haloMat.opacity = 0.88 * fade;
    });
  }

  // 24. Minecraft Warden Sonic Boom / Piccolo Makankosappo: Concentric Shockwave Rings + Piercing Core
  public spawnSonicBoomRings(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    length = 24.0,
    coreColor = 0x22d3ee,
    rimColor = 0x0f766e
  ) {
    const grp = new THREE.Group();
    grp.position.set(ox, oy, oz);
    grp.lookAt(ox + dx * 10, oy + dy * 10, oz + dz * 10);

    const coreMat = this.mkMat(coreColor, 0.94);
    const rimMat = this.mkMat(rimColor, 0.82);

    const beam = new THREE.Mesh(this.cylGeo, coreMat);
    beam.rotation.x = Math.PI / 2;
    beam.position.z = length * 0.5;
    beam.scale.set(0.28, length, 0.28);
    grp.add(beam);

    const rings: THREE.Mesh[] = [];
    const ringCount = 9;
    for (let i = 0; i < ringCount; i++) {
      const r = new THREE.Mesh(this.torusGeo, i % 2 === 0 ? coreMat : rimMat);
      r.position.z = 1.6 + (i / ringCount) * (length - 2.0);
      grp.add(r);
      rings.push(r);
    }

    this.pushEffect(grp, [coreMat, rimMat], 0.58, (p, dt) => {
      for (let i = 0; i < rings.length; i++) {
        const s = 0.55 + (i / ringCount) * 1.15 + p * 0.85;
        rings[i].scale.setScalar(s);
        rings[i].rotation.z += dt * (i % 2 === 0 ? 14 : -14);
      }
      const fade = p < 0.35 ? 1 : 1 - (p - 0.35) / 0.65;
      coreMat.opacity = 0.94 * fade;
      rimMat.opacity = 0.82 * fade;
    });
  }

  // 25. Grimmjow Desgarron: 5 Colossal Cyan Panther King Claw Slash Waves
  public spawnPantherClaws(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, colorHex = 0x38bdf8) {
    const grp = new THREE.Group();
    grp.position.set(ox, oy, oz);
    grp.lookAt(ox + dx * 10, oy + dy * 10, oz + dz * 10);

    const clawMat = this.mkMat(colorHex, 0.95);
    const glowMat = this.mkMat(0xe0f2fe, 0.82);
    const claws: THREE.Mesh[] = [];

    for (let i = -2; i <= 2; i++) {
      const arc = new THREE.Mesh(this.arcGeo, Math.abs(i) % 2 === 0 ? clawMat : glowMat);
      arc.position.set(i * 0.58, 0, 2.2);
      arc.rotation.y = Math.PI / 2;
      arc.rotation.x = i * 0.08;
      arc.scale.set(2.4, 2.8, 1.5);
      grp.add(arc);
      claws.push(arc);
    }

    this.pushEffect(grp, [clawMat, glowMat], 0.54, (p) => {
      const zTravel = 2.2 + p * 20.0;
      for (let i = 0; i < claws.length; i++) {
        claws[i].position.z = zTravel;
        claws[i].scale.setScalar(2.4 + p * 1.6);
      }
      const fade = 1 - p * 0.85;
      clawMat.opacity = 0.95 * fade;
      glowMat.opacity = 0.82 * fade;
    });
  }

  // 26. Minecraft Steve / Technoblade: Falling 3D Dark-Iron Voxel Anvils + Redstone Shockwave
  public spawnVoxelAnvilBarrage(cx: number, cy: number, cz: number, radius = 8.5) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const ironMat = this.mkMat(0x3f3f46, 0.96);
    const redstoneMat = this.mkMat(0xef4444, 0.88);
    const diamondMat = this.mkMat(0x38bdf8, 0.86);

    const anvils: THREE.Group[] = [];
    for (let i = 0; i < 6; i++) {
      const ag = new THREE.Group();
      const base = new THREE.Mesh(this.boxGeo, ironMat);
      base.scale.set(0.95, 0.32, 0.68);
      const neck = new THREE.Mesh(this.boxGeo, ironMat);
      neck.position.y = 0.34;
      neck.scale.set(0.55, 0.38, 0.44);
      const top = new THREE.Mesh(this.boxGeo, ironMat);
      top.position.y = 0.72;
      top.scale.set(1.18, 0.42, 0.76);
      ag.add(base, neck, top);
      const ang = (i / 6) * Math.PI * 2;
      const r = i === 0 ? 0 : 2.8 + (i % 2) * 1.8;
      ag.position.set(Math.cos(ang) * r, 10 + i * 1.6, Math.sin(ang) * r);
      grp.add(ag);
      anvils.push(ag);
    }

    const shock = new THREE.Mesh(this.ringGeo, redstoneMat);
    shock.rotation.x = -Math.PI / 2;
    shock.position.y = 0.14;
    const spark = new THREE.Mesh(this.ringGeo, diamondMat);
    spark.rotation.x = -Math.PI / 2;
    spark.position.y = 0.22;
    grp.add(shock, spark);

    this.pushEffect(grp, [ironMat, redstoneMat, diamondMat], 0.82, (p) => {
      for (let i = 0; i < anvils.length; i++) {
        const dropK = Math.min(1, p * (2.5 - i * 0.14));
        anvils[i].position.y = (1 - dropK) * (9.5 + i * 1.4) + 0.18;
      }
      shock.scale.setScalar(1.2 + p * radius * 1.18);
      spark.scale.setScalar(0.8 + p * radius * 0.85);
      const fade = p < 0.48 ? 1 : 1 - (p - 0.48) / 0.52;
      ironMat.opacity = 0.96 * fade;
      redstoneMat.opacity = 0.88 * fade;
      diamondMat.opacity = 0.86 * fade;
    });
  }

  // 27. Gogeta Stardust Breaker / Soul Punisher: Prismatic Rainbow Sphere + 12 Crystal Star Rays
  public spawnPrismaticStarburst(cx: number, cy: number, cz: number, radius = 10.0) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const coreMat = this.mkMat(0xfef08a, 0.96);
    const cyanMat = this.mkMat(0x38bdf8, 0.86);
    const pinkMat = this.mkMat(0xf43f5e, 0.86);
    const vioMat = this.mkMat(0xa855f7, 0.82);

    const core = new THREE.Mesh(this.sphereGeo, coreMat);
    core.position.y = 1.6;
    const shell = new THREE.Mesh(this.sphereGeo, vioMat);
    shell.position.y = 1.6;
    const ringA = new THREE.Mesh(this.torusGeo, cyanMat);
    ringA.position.y = 1.6;
    ringA.rotation.x = Math.PI * 0.35;
    const ringB = new THREE.Mesh(this.torusGeo, pinkMat);
    ringB.position.y = 1.6;
    ringB.rotation.y = Math.PI * 0.35;
    grp.add(shell, core, ringA, ringB);

    const rays: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const m = i % 3 === 0 ? cyanMat : i % 3 === 1 ? pinkMat : coreMat;
      const ray = new THREE.Mesh(this.octaGeo, m);
      grp.add(ray);
      rays.push(ray);
    }

    this.pushEffect(grp, [coreMat, cyanMat, pinkMat, vioMat], 0.78, (p, dt) => {
      core.scale.setScalar(1.2 + p * radius * 0.45);
      shell.scale.setScalar(1.6 + p * radius * 0.85);
      ringA.scale.setScalar(1.8 + p * radius * 0.95);
      ringB.scale.setScalar(1.8 + p * radius * 0.95);
      ringA.rotation.z += dt * 14;
      ringB.rotation.x -= dt * 14;
      for (let i = 0; i < rays.length; i++) {
        const ang = (i / 12) * Math.PI * 2 + p * 6;
        const r = p * radius * 0.92;
        rays[i].position.set(Math.cos(ang) * r, 1.6 + Math.sin(i * 1.7) * p * 2.5, Math.sin(ang) * r);
        rays[i].scale.setScalar(0.55 * (1 - p * 0.5));
      }
      const fade = p < 0.36 ? 1 : 1 - (p - 0.36) / 0.64;
      coreMat.opacity = 0.96 * fade;
      cyanMat.opacity = 0.86 * fade;
      pinkMat.opacity = 0.86 * fade;
      vioMat.opacity = 0.72 * fade;
    });
  }

  // 28. Zoro Dragon Damnation / Hitsugaya Blizzard / Sabo Flame Dragon: Spiraling Elemental Vortex Tornado
  public spawnTornadoVortex(
    cx: number,
    cy: number,
    cz: number,
    radius = 6.5,
    height = 11.0,
    coreColor = 0x10b981,
    outerColor = 0xf43f5e
  ) {
    const grp = new THREE.Group();
    grp.position.set(cx, cy, cz);

    const innerMat = this.mkMat(coreColor, 0.78);
    const outerMat = this.mkMat(outerColor, 0.84);

    const funnel = new THREE.Mesh(this.coneGeo, innerMat);
    funnel.rotation.x = Math.PI;
    funnel.position.y = height * 0.5;
    funnel.scale.set(radius * 0.72, height, radius * 0.72);
    grp.add(funnel);

    const coils: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(this.torusGeo, i % 2 === 0 ? outerMat : innerMat);
      c.rotation.x = Math.PI / 2;
      c.position.y = 0.8 + (i / 5) * (height - 1.4);
      grp.add(c);
      coils.push(c);
    }

    this.pushEffect(grp, [innerMat, outerMat], 0.78, (p, dt) => {
      funnel.rotation.y += dt * 18;
      for (let i = 0; i < coils.length; i++) {
        const w = (1.4 + (i / 5) * (radius * 0.75)) * (0.65 + p * 0.55);
        coils[i].scale.setScalar(w);
        coils[i].rotation.z += dt * (i % 2 === 0 ? 16 : -16);
      }
      const fade = p < 0.42 ? 1 : 1 - (p - 0.42) / 0.58;
      innerMat.opacity = 0.78 * fade;
      outerMat.opacity = 0.84 * fade;
    });
  }

  // 29. Authentic Anime Skill Wind-Up Aura (Hand Seals / Zanpakutō Release Chant / Ki Charge)
  public spawnSkillWindupVfx(
    px: number,
    py: number,
    pz: number,
    yaw: number,
    universe: string,
    accentHex = 0x38bdf8,
    duration = 0.72
  ) {
    const grp = new THREE.Group();
    grp.position.set(px, py, pz);
    grp.rotation.y = yaw;

    const mainMat = this.mkMat(accentHex, 0.88);
    const whiteMat = this.mkMat(0xffffff, 0.78);
    const mats = [mainMat, whiteMat];

    const groundRing = new THREE.Mesh(this.ringGeo, mainMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.08;
    grp.add(groundRing);

    const innerRing = new THREE.Mesh(this.torusGeo, whiteMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.14;
    grp.add(innerRing);

    const chestSeal = new THREE.Mesh(this.ringGeo, whiteMat);
    const pillar = new THREE.Mesh(this.cylGeo, mainMat);
    const motes: THREE.Mesh[] = [];

    if (universe === 'Naruto') {
      // Shinobi Hand-Seal Chakra Focus Ring in front of chest + swirling blue/accent chakra motes
      chestSeal.position.set(0, 1.25, -0.58);
      chestSeal.scale.setScalar(0.55);
      grp.add(chestSeal);
      for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(this.octaGeo, i % 2 === 0 ? mainMat : whiteMat);
        m.scale.setScalar(0.11);
        grp.add(m);
        motes.push(m);
      }
    } else if (universe === 'Bleach') {
      // Reiatsu Spiritual Pressure Column + Zanpakutō Release Gleam
      pillar.position.y = 2.4;
      pillar.scale.set(0.85, 4.8, 0.85);
      grp.add(pillar);
      chestSeal.position.set(0.32, 1.18, -0.52);
      chestSeal.scale.setScalar(0.45);
      grp.add(chestSeal);
      for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(this.boxGeo, i % 2 === 0 ? mainMat : whiteMat);
        m.scale.set(0.06, 0.75, 0.06);
        grp.add(m);
        motes.push(m);
      }
    } else {
      // Dragon Ball Ki / One Piece Haki / Tensura Magicule Charge
      pillar.position.y = 1.9;
      pillar.scale.set(1.05, 3.8, 1.05);
      grp.add(pillar);
      for (let i = 0; i < 8; i++) {
        const m = new THREE.Mesh(this.octaGeo, i % 2 === 0 ? mainMat : whiteMat);
        m.scale.setScalar(0.13);
        grp.add(m);
        motes.push(m);
      }
    }

    this.pushEffect(
      grp,
      mats,
      Math.max(0.35, duration),
      (p, dt) => {
        const grow = 0.65 + p * 1.85;
        groundRing.scale.setScalar(grow * 1.45);
        groundRing.rotation.z += dt * 7.5;
        innerRing.scale.setScalar(grow * 0.95);
        innerRing.rotation.z -= dt * 9.0;
        if (chestSeal.parent) {
          chestSeal.rotation.z += dt * 11.0;
          chestSeal.scale.setScalar(0.42 + Math.sin(p * Math.PI) * 0.35);
        }
        if (pillar.parent) {
          pillar.rotation.y += dt * 8.0;
          pillar.scale.set(0.55 + p * 0.75, 3.2 + p * 3.4, 0.55 + p * 0.75);
        }
        for (let i = 0; i < motes.length; i++) {
          const a = (i / Math.max(1, motes.length)) * Math.PI * 2 + p * 8.5;
          const r = 0.85 + (1 - p) * 0.75;
          motes[i].position.set(Math.cos(a) * r, 0.35 + p * 2.2 + (i % 3) * 0.25, Math.sin(a) * r);
          motes[i].rotation.y += dt * 10;
        }
        const env = p < 0.78 ? 0.88 : 0.88 * (1 - (p - 0.78) / 0.22);
        mainMat.opacity = env * 0.76;
        whiteMat.opacity = env * 0.85;
      },
      true
    );
  }

  private clearAwakeningManifestation() {
    while (this.awakeningGroup.children.length > 0) {
      this.awakeningGroup.remove(this.awakeningGroup.children[0]);
    }
    for (let i = 0; i < this.awakeningMats.length; i++) {
      this.awakeningMats[i].dispose();
    }
    this.awakeningMats.length = 0;
    this.awakeningSpinNodes.length = 0;
  }

  private mkAwkMat(color: number, opacity = 0.78, wireframe = false): THREE.MeshBasicMaterial {
    const m = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      wireframe,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.awakeningMats.push(m);
    return m;
  }

  public getActiveAwakeningStats(): { visible: boolean; key: string; meshCount: number } {
    let meshCount = 0;
    this.awakeningGroup.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshCount++;
    });
    return {
      visible: this.awakeningGroup.visible,
      key: this.activeManifestationKey,
      meshCount
    };
  }

  private rebuildAwakeningManifestation(charId: string, universe: string, accentHex: number) {
    const key = `${charId}|${universe}|${accentHex.toString(16)}`;
    if (this.activeManifestationKey === key && this.awakeningGroup.children.length > 0) return;
    this.clearAwakeningManifestation();
    this.activeManifestationKey = key;

    const addGroundSeal = (rOuter: number, cOuter: number, cInner: number) => {
      const mOut = this.mkAwkMat(cOuter, 0.72);
      const mIn = this.mkAwkMat(cInner, 0.56);
      const r1 = new THREE.Mesh(this.ringGeo, mOut);
      r1.rotation.x = -Math.PI / 2;
      r1.position.y = 0.07;
      r1.scale.setScalar(rOuter);
      const r2 = new THREE.Mesh(this.torusGeo, mIn);
      r2.rotation.x = Math.PI / 2;
      r2.position.y = 0.12;
      r2.scale.setScalar(rOuter * 0.66);
      this.awakeningGroup.add(r1, r2);
      this.awakeningSpinNodes.push({ obj: r1, speedZ: 1.4 }, { obj: r2, speedZ: -2.1 });
    };

    // =========================================================================
    // 1. BLEACH BANKAI, RESURRECCIÓN & VOLLSTÄNDIG 3D WORLD MANIFESTATIONS
    // =========================================================================
    if (charId === 'kisuke_urahara') {
      // KANNONBIRAKI BENIHIME ARATAME — Giant Crimson-Ivory Puppet Goddess & Surgical Seam Domain!
      addGroundSeal(5.2, 0xdc2626, 0xfca5a5);
      const crimsonMat = this.mkAwkMat(0xbe123c, 0.86);
      const darkRedMat = this.mkAwkMat(0x4c0519, 0.88);
      const ivoryMat = this.mkAwkMat(0xfef2f2, 0.92);
      const goldSeamMat = this.mkAwkMat(0xfde047, 0.88);

      const goddess = new THREE.Group();
      goddess.position.set(0, 0, -4.1);

      // Draped crimson kimono robe & obi sash (framed head-to-toe in 1st & 3rd person!)
      const robe = new THREE.Mesh(this.solidConeGeo, darkRedMat);
      robe.position.y = 1.55;
      robe.scale.set(1.25, 3.1, 0.95);
      const chest = new THREE.Mesh(this.cylGeo, crimsonMat);
      chest.position.y = 2.45;
      chest.scale.set(0.76, 1.15, 0.62);
      const collar = new THREE.Mesh(this.torusGeo, goldSeamMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 2.98;
      collar.scale.setScalar(0.55);

      // Sculpted ivory face, dark crimson ceremonial hair loops & crown
      const head = new THREE.Mesh(this.sphereGeo, ivoryMat);
      head.position.y = 3.42;
      head.scale.set(0.46, 0.56, 0.44);
      const crown = new THREE.Mesh(this.octaGeo, crimsonMat);
      crown.position.set(0, 4.02, 0);
      crown.scale.set(0.52, 0.42, 0.30);
      for (const side of [-1, 1]) {
        const braidLoop = new THREE.Mesh(this.torusGeo, darkRedMat);
        braidLoop.position.set(side * 0.60, 3.36, 0.05);
        braidLoop.scale.set(0.34, 0.56, 0.24);
        const eye = new THREE.Mesh(this.boxGeo, crimsonMat);
        eye.position.set(side * 0.16, 3.45, 0.40);
        eye.scale.set(0.13, 0.04, 0.06);
        goddess.add(braidLoop, eye);
      }

      // Giant articulated puppet hands hovering on left & right to restructure reality
      for (const side of [-1, 1]) {
        const armGrp = new THREE.Group();
        armGrp.position.set(side * 1.95, 2.05, 1.15);
        const sleeve = new THREE.Mesh(this.solidConeGeo, crimsonMat);
        sleeve.rotation.z = side * 0.55;
        sleeve.scale.set(0.42, 1.1, 0.42);
        const palm = new THREE.Mesh(this.boxGeo, ivoryMat);
        palm.position.set(side * 0.22, -0.52, 0.22);
        palm.scale.set(0.44, 0.48, 0.15);
        for (let f = 0; f < 4; f++) {
          const finger = new THREE.Mesh(this.boxGeo, ivoryMat);
          finger.position.set(side * 0.22 + (f - 1.5) * 0.10, -0.86, 0.26);
          finger.scale.set(0.07, 0.32, 0.07);
          armGrp.add(finger);
        }
        armGrp.add(sleeve, palm);
        goddess.add(armGrp);
        this.awakeningSpinNodes.push({ obj: armGrp, bobAmp: 0.18, bobFreq: 2.1, baseY: 2.05, swayAmp: 0.14, swayPhase: side });
      }

      // Crimson surgical restructuring seam-lines & cross-stitches flanking the Puppet Goddess
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        const seamGrp = new THREE.Group();
        seamGrp.position.set(side * 2.55, 1.65, -3.2);
        seamGrp.rotation.z = side * 0.32;
        const mainThread = new THREE.Mesh(this.boxGeo, crimsonMat);
        mainThread.scale.set(0.05, 2.8, 0.05);
        seamGrp.add(mainThread);
        for (let s = -2; s <= 2; s++) {
          const crossStitch = new THREE.Mesh(this.boxGeo, goldSeamMat);
          crossStitch.position.y = s * 0.52;
          crossStitch.rotation.z = 0.35;
          crossStitch.scale.set(0.42, 0.045, 0.045);
          seamGrp.add(crossStitch);
        }
        this.awakeningGroup.add(seamGrp);
      }

      goddess.add(robe, chest, collar, head, crown);
      this.awakeningGroup.add(goddess);
      this.awakeningSpinNodes.push({ obj: goddess, bobAmp: 0.12, bobFreq: 1.6, baseY: 0 });
      return;
    }

    if (charId === 'byakuya_kuchiki') {
      // SENBONZAKURA KAGEYOSHI — Two Flanking Rows of 10 Giant Katana Pillars Stretching Ahead + Sakura Vortex!
      addGroundSeal(5.8, 0xf472b6, 0xfbcfe8);
      const bladeMat = this.mkAwkMat(0xfdf2f8, 0.90);
      const pinkGlowMat = this.mkAwkMat(0xec4899, 0.82);
      const rippleMat = this.mkAwkMat(0xf9a8d4, 0.72);

      for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          const zPos = -1.2 - i * 1.85;
          const xPos = side * 2.35;
          const monolith = new THREE.Group();
          monolith.position.set(xPos, 0, zPos);

          const blade = new THREE.Mesh(this.boxGeo, bladeMat);
          blade.position.y = 1.95;
          blade.scale.set(0.14, 3.9, 0.55);
          const spineGlow = new THREE.Mesh(this.boxGeo, pinkGlowMat);
          spineGlow.position.set(0, 1.95, 0.29);
          spineGlow.scale.set(0.06, 3.85, 0.10);
          const ripple = new THREE.Mesh(this.ringGeo, rippleMat);
          ripple.rotation.x = -Math.PI / 2;
          ripple.position.y = 0.08;
          ripple.scale.setScalar(0.88);

          monolith.add(blade, spineGlow, ripple);
          this.awakeningGroup.add(monolith);
          this.awakeningSpinNodes.push({ obj: monolith, bobAmp: 0.10, bobFreq: 2.0, baseY: 0, swayPhase: i * 0.7 + side });
        }
      }

      const petalCloud = new THREE.Group();
      petalCloud.position.z = -2.5;
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const r = 1.4 + (i % 5) * 0.72;
        const pMesh = new THREE.Mesh(this.octaGeo, i % 3 === 0 ? bladeMat : pinkGlowMat);
        pMesh.position.set(Math.cos(a) * r, 0.5 + (i % 7) * 0.48, Math.sin(a) * r);
        pMesh.scale.set(0.16, 0.05, 0.10);
        petalCloud.add(pMesh);
      }
      this.awakeningGroup.add(petalCloud);
      this.awakeningSpinNodes.push({ obj: petalCloud, speedY: 3.4 });
      return;
    }

    if (charId === 'yamamoto_bankai') {
      // ZANKA NO TACHI — Compressed Solar Flame Cloak, Scorched Crater & 8 Charred Skeleton Warriors!
      addGroundSeal(5.8, 0xea580c, 0xfef08a);
      const solarMat = this.mkAwkMat(0xfef08a, 0.88);
      const magmaMat = this.mkAwkMat(0xdc2626, 0.80);
      const ashMat = this.mkAwkMat(0x1c1917, 0.92);

      const sunRing = new THREE.Mesh(this.torusGeo, magmaMat);
      sunRing.rotation.x = Math.PI / 2;
      sunRing.position.y = 1.05;
      sunRing.scale.setScalar(1.05);
      const solarHalo = new THREE.Mesh(this.arcGeo, solarMat);
      solarHalo.position.set(0, 1.35, -0.35);
      solarHalo.scale.setScalar(1.45);
      this.awakeningGroup.add(sunRing, solarHalo);
      this.awakeningSpinNodes.push({ obj: sunRing, speedZ: 3.6 }, { obj: solarHalo, speedZ: -4.2 });

      const legion = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI * 0.12 - (i / 7) * Math.PI * 0.76; // Forward semicircle in front of Yamamoto!
        const r = 4.2 + (i % 2) * 0.85;
        const skelSpire = new THREE.Group();
        skelSpire.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        skelSpire.lookAt(0, 1.2, 0);
        const charredBody = new THREE.Mesh(this.solidConeGeo, ashMat);
        charredBody.position.y = 1.1;
        charredBody.scale.set(0.38, 2.2, 0.38);
        const skull = new THREE.Mesh(this.sphereGeo, ashMat);
        skull.position.y = 2.28;
        skull.scale.setScalar(0.24);
        const fireSword = new THREE.Mesh(this.boxGeo, solarMat);
        fireSword.position.set(0.26, 1.65, 0.18);
        fireSword.rotation.z = -0.32;
        fireSword.scale.set(0.08, 1.75, 0.16);
        skelSpire.add(charredBody, skull, fireSword);
        legion.add(skelSpire);
      }
      this.awakeningGroup.add(legion);
      this.awakeningSpinNodes.push({ obj: legion, bobAmp: 0.09, bobFreq: 1.8, baseY: 0 });
      return;
    }

    if (charId === 'rukia_bankai') {
      // HAKKA NO TOGAME — Pure White Absolute-Zero Ice Crater, 10 Crystal Ice Spires & White Crown Halo!
      addGroundSeal(6.0, 0xe0f2fe, 0xffffff);
      const pureWhite = this.mkAwkMat(0xffffff, 0.90);
      const iceCyan = this.mkAwkMat(0x7dd3fc, 0.78);

      const crownHalo = new THREE.Mesh(this.torusGeo, pureWhite);
      crownHalo.rotation.x = Math.PI / 2;
      crownHalo.position.y = 2.25;
      crownHalo.scale.setScalar(0.58);
      this.awakeningGroup.add(crownHalo);
      this.awakeningSpinNodes.push({ obj: crownHalo, speedZ: 2.2, bobAmp: 0.08, bobFreq: 2.0, baseY: 2.25 });

      const spires = new THREE.Group();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        if (Math.sin(a) > 0.68) continue; // Keep rear camera lane clear!
        const r = 4.6;
        const spire = new THREE.Mesh(this.solidConeGeo, i % 2 === 0 ? pureWhite : iceCyan);
        spire.position.set(Math.cos(a) * r, 1.85, Math.sin(a) * r);
        spire.rotation.z = -Math.cos(a) * 0.16;
        spire.rotation.x = Math.sin(a) * 0.16;
        spire.scale.set(0.48, 3.7, 0.48);
        spires.add(spire);
      }
      // Extra twin tall absolute-zero ice obelisks framing forward view
      for (const side of [-1, 1]) {
        const frontSpire = new THREE.Mesh(this.octaGeo, pureWhite);
        frontSpire.position.set(side * 2.6, 1.9, -4.2);
        frontSpire.scale.set(0.55, 2.2, 0.55);
        spires.add(frontSpire);
      }
      this.awakeningGroup.add(spires);
      return;
    }

    if (charId === 'hitsugaya_toshiro') {
      // DAIGUREN HYŌRINMARU — Crystalline Ice Dragon Wings, Sweeping Ice Tail & 3 Floating 4-Petal Ice Lotuses!
      addGroundSeal(5.6, 0x38bdf8, 0xe0f2fe);
      const iceMat = this.mkAwkMat(0x38bdf8, 0.78);
      const frostWhite = this.mkAwkMat(0xe0f2fe, 0.86);
      const petalViolet = this.mkAwkMat(0xa855f7, 0.85);

      for (const side of [-1, 1]) {
        const wing = new THREE.Group();
        wing.position.set(side * 0.45, 1.35, 0.32);
        for (let b = 0; b < 4; b++) {
          const feather = new THREE.Mesh(this.solidConeGeo, b % 2 === 0 ? iceMat : frostWhite);
          feather.position.set(side * (0.65 + b * 0.45), 0.35 - b * 0.18, 0.15 + b * 0.08);
          feather.rotation.z = -side * (0.95 + b * 0.18);
          feather.scale.set(0.22, 1.65 - b * 0.18, 0.12);
          wing.add(feather);
        }
        this.awakeningGroup.add(wing);
        this.awakeningSpinNodes.push({ obj: wing, swayAmp: 0.12, swayPhase: side });
      }

      // 3 Iconic Four-Petal Ice Flowers floating behind shoulders
      for (let f = 0; f < 3; f++) {
        const flower = new THREE.Group();
        flower.position.set((f - 1) * 0.95, 2.55 + (f === 1 ? 0.28 : 0), 0.55);
        for (let p = 0; p < 4; p++) {
          const petal = new THREE.Mesh(this.octaGeo, petalViolet);
          const pa = (p / 4) * Math.PI * 2 + Math.PI / 4;
          petal.position.set(Math.cos(pa) * 0.24, Math.sin(pa) * 0.24, 0);
          petal.scale.set(0.16, 0.16, 0.06);
          flower.add(petal);
        }
        this.awakeningGroup.add(flower);
        this.awakeningSpinNodes.push({ obj: flower, speedZ: 1.8, bobAmp: 0.1, bobFreq: 2.2, baseY: flower.position.y });
      }
      return;
    }

    if (charId === 'shunsui_kyoraku') {
      // KATEN KYŌKOTSU: KARAMATSU SHINJŪ — Dark Abyssal Water Stage, 6 Black Pines & Scarlet Thread!
      addGroundSeal(6.8, 0xbe123c, 0x0f172a);
      const abyssMat = this.mkAwkMat(0x090d16, 0.86);
      const crimsonThreadMat = this.mkAwkMat(0xf43f5e, 0.88);
      const pineNeedleMat = this.mkAwkMat(0x881337, 0.78);

      const pool = new THREE.Mesh(this.cylGeo, abyssMat);
      pool.position.y = 0.12;
      pool.scale.set(6.5, 0.22, 6.5);
      this.awakeningGroup.add(pool);

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const r = 4.8;
        const pine = new THREE.Group();
        pine.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        const trunk = new THREE.Mesh(this.solidConeGeo, abyssMat);
        trunk.position.y = 2.0;
        trunk.scale.set(0.28, 4.0, 0.28);
        const bough = new THREE.Mesh(this.coneGeo, pineNeedleMat);
        bough.position.y = 3.2;
        bough.scale.set(1.35, 1.5, 1.35);
        pine.add(trunk, bough);
        this.awakeningGroup.add(pine);
      }

      for (let i = 0; i < 3; i++) {
        const thread = new THREE.Mesh(this.arcGeo, crimsonThreadMat);
        thread.position.y = 1.35 + i * 0.55;
        thread.rotation.x = Math.PI * (0.44 - i * 0.12);
        thread.scale.setScalar(3.2 + i * 0.8);
        this.awakeningGroup.add(thread);
        this.awakeningSpinNodes.push({ obj: thread, speedY: (i % 2 === 0 ? 1 : -1) * 2.6 });
      }
      return;
    }

    if (charId === 'komamura_bankai') {
      // KOKUJŌ TENGEN MYŌ'Ō: DANGAI JŌE — Towering Crimson-Obsidian Armored Samurai Titan!
      addGroundSeal(6.2, 0xdc2626, 0xfbbf24);
      const obsidianMat = this.mkAwkMat(0x18181b, 0.88);
      const crimsonArmorMat = this.mkAwkMat(0xdc2626, 0.86);
      const fireEyeMat = this.mkAwkMat(0xfef08a, 0.98);
      const bladeSilver = this.mkAwkMat(0xe2e8f0, 0.92);

      const titan = new THREE.Group();
      titan.position.set(0, 0, -4.1);

      const torso = new THREE.Mesh(this.boxGeo, obsidianMat);
      torso.position.y = 2.15;
      torso.scale.set(2.15, 2.35, 1.2);
      const chestPlate = new THREE.Mesh(this.boxGeo, crimsonArmorMat);
      chestPlate.position.set(0, 2.25, 0.66);
      chestPlate.scale.set(1.9, 1.7, 0.18);
      const chestPlateFront = new THREE.Mesh(this.boxGeo, crimsonArmorMat);
      chestPlateFront.position.set(0, 2.25, -0.66);
      chestPlateFront.scale.set(1.9, 1.7, 0.18);

      const helm = new THREE.Mesh(this.boxGeo, obsidianMat);
      helm.position.y = 3.65;
      helm.scale.set(1.0, 0.95, 0.95);
      for (const side of [-1, 1]) {
        const pauldron = new THREE.Mesh(this.boxGeo, crimsonArmorMat);
        pauldron.position.set(side * 1.65, 3.05, 0);
        pauldron.rotation.z = -side * 0.28;
        pauldron.scale.set(1.1, 0.72, 1.35);
        const horn = new THREE.Mesh(this.solidConeGeo, fireEyeMat);
        horn.position.set(side * 0.48, 4.3, 0);
        horn.rotation.z = -side * 0.35;
        horn.scale.set(0.15, 0.82, 0.15);
        for (const zFace of [-0.5, 0.5]) {
          const eye = new THREE.Mesh(this.boxGeo, fireEyeMat);
          eye.position.set(side * 0.24, 3.68, zFace);
          eye.scale.set(0.22, 0.08, 0.08);
          titan.add(eye);
        }
        titan.add(pauldron, horn);
      }

      const giantOdachi = new THREE.Mesh(this.boxGeo, bladeSilver);
      giantOdachi.position.set(2.1, 2.55, 0.35);
      giantOdachi.rotation.z = -0.36;
      giantOdachi.scale.set(0.2, 4.3, 0.52);

      titan.add(torso, chestPlate, chestPlateFront, helm, giantOdachi);
      this.awakeningGroup.add(titan);
      this.awakeningSpinNodes.push({ obj: titan, bobAmp: 0.12, bobFreq: 1.5, baseY: 0 });
      return;
    }

    if (charId === 'yhwach_almighty' || charId === 'uryu_ishida' || charId === 'jugram_haschwalth') {
      // QUINCY VOLLSTÄNDIG & THE ALMIGHTY — 5-Pointed Reishi Star-Cross, Heiligenschein Halo & Auswählen Pillars!
      const primary = charId === 'jugram_haschwalth' ? 0xfacc15 : 0x38bdf8;
      const secondary = charId === 'yhwach_almighty' ? 0x0f172a : 0xe0f2fe;
      addGroundSeal(6.4, primary, 0xffffff);
      const reishiMat = this.mkAwkMat(primary, 0.82);
      const brightMat = this.mkAwkMat(0xffffff, 0.88);
      const shadowMat = this.mkAwkMat(secondary, 0.72);

      // 5-Pointed Quincy Zeichen Star on ground + 5 Auswählen Light Pillars
      const starGrp = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.32;
        const ray = new THREE.Mesh(this.boxGeo, brightMat);
        ray.position.set(Math.cos(a) * 2.8, 0.09, Math.sin(a) * 2.8);
        ray.rotation.y = -a;
        ray.scale.set(5.6, 0.05, 0.22);
        const pillar = new THREE.Mesh(this.cylGeo, i % 2 === 0 ? reishiMat : shadowMat);
        pillar.position.set(Math.cos(a) * 5.2, 2.6, Math.sin(a) * 5.2);
        pillar.scale.set(0.36, 5.2, 0.36);
        starGrp.add(ray, pillar);
      }
      this.awakeningGroup.add(starGrp);
      this.awakeningSpinNodes.push({ obj: starGrp, speedY: 0.55 });

      // Heiligenschein Reishi Halo + Vollständig Wings
      const halo = new THREE.Mesh(this.octaGeo, brightMat);
      halo.position.set(0, 2.45, 0);
      halo.scale.set(0.62, 0.18, 0.62);
      this.awakeningGroup.add(halo);
      this.awakeningSpinNodes.push({ obj: halo, speedY: 2.5 });

      for (const side of [-1, 1]) {
        const wing = new THREE.Group();
        wing.position.set(side * 0.4, 1.45, 0.22);
        for (let b = 0; b < 4; b++) {
          const plume = new THREE.Mesh(this.boxGeo, b % 2 === 0 ? reishiMat : brightMat);
          plume.position.set(side * (0.75 + b * 0.42), 0.45 - b * 0.22, 0.1);
          plume.rotation.z = -side * (0.35 + b * 0.15);
          plume.scale.set(0.85, 0.16, 0.08);
          wing.add(plume);
        }
        this.awakeningGroup.add(wing);
      }
      return;
    }

    if (charId === 'aizen_hogyoku' || charId === 'ulquiorra_cifer') {
      // HŌGYOKU TRANSCENDENCE / SEGUNDA ETAPA — 6 Transcendent Wings + Orbiting Fragor / Lanza Rings!
      const mainHex = charId === 'aizen_hogyoku' ? 0xa855f7 : 0x10b981;
      const wingHex = charId === 'aizen_hogyoku' ? 0xf5f3ff : 0x090d16;
      addGroundSeal(6.0, mainHex, wingHex);
      const wingMat = this.mkAwkMat(wingHex, 0.85);
      const energyMat = this.mkAwkMat(mainHex, 0.82);

      for (const side of [-1, 1]) {
        for (let tier = 0; tier < 3; tier++) {
          const wing = new THREE.Mesh(this.solidConeGeo, tier === 1 ? energyMat : wingMat);
          wing.position.set(side * (1.15 + tier * 0.35), 1.85 - tier * 0.38, 0.25);
          wing.rotation.z = -side * (1.05 + tier * 0.22);
          wing.scale.set(0.35, 2.2 - tier * 0.25, 0.12);
          this.awakeningGroup.add(wing);
        }
      }
      const orbit = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const orb = new THREE.Mesh(this.torusGeo, energyMat);
        orb.position.set(Math.cos(a) * 4.2, 2.1 + (i % 2) * 0.65, Math.sin(a) * 4.2);
        orb.lookAt(0, 1.5, 0);
        orb.scale.setScalar(0.55);
        orbit.add(orb);
      }
      this.awakeningGroup.add(orbit);
      this.awakeningSpinNodes.push({ obj: orbit, speedY: 1.8 });
      return;
    }

    if (universe === 'Bleach') {
      // Remaining Bleach Captains & Espada (Ichigo True Tensa Zangetsu, Kenpachi Oni, Unohana Blood Sea, Mayuri, Ichibe, Yoruichi, etc.)
      const secHex =
        charId === 'ichigo_bankai' || charId === 'ichibe_hyosube'
          ? 0x090d16
          : charId === 'unohana_retsu' || charId === 'kenpachi_zaraki' || charId === 'renji_abarai'
            ? 0x881337
            : 0xfef08a;
      addGroundSeal(6.2, accentHex, secHex);
      const mainMat = this.mkAwkMat(accentHex, 0.84);
      const darkMat = this.mkAwkMat(secHex, 0.82);

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.52;
        const rx = Math.cos(a) * 3.8;
        const rz = Math.sin(a) * 3.8;
        if (rz > 2.2 && Math.abs(rx) < 1.8) continue;
        const monolith = new THREE.Mesh(this.boxGeo, i % 2 === 0 ? darkMat : mainMat);
        monolith.position.set(rx, 1.85, rz);
        monolith.lookAt(0, 1.85, 0);
        monolith.scale.set(0.24, 3.7, 0.52);
        this.awakeningGroup.add(monolith);
      }

      const ringCluster = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const slash = new THREE.Mesh(this.arcGeo, i % 2 === 0 ? mainMat : darkMat);
        slash.position.set(Math.cos(a) * 3.2, 1.05 + (i % 3) * 0.8, Math.sin(a) * 3.2);
        slash.rotation.set(Math.PI * 0.35, a, i * 0.5);
        slash.scale.setScalar(1.65);
        ringCluster.add(slash);
      }
      this.awakeningGroup.add(ringCluster);
      this.awakeningSpinNodes.push({ obj: ringCluster, speedY: 2.6 });
      return;
    }

    // =========================================================================
    // 2. NARUTO SIX PATHS, SUSANOO, BARYON KURAMA & EIGHT GATES MANIFESTATIONS
    // =========================================================================
    if (
      charId === 'madara_six_paths' ||
      charId === 'sasuke_rinnegan' ||
      charId === 'itachi_uchiha' ||
      charId === 'kakashi_dms' ||
      charId === 'shisui_uchiha'
    ) {
      // COMPLETE 3D ARMORED SUSANOO — Ribcage, Horned Tengu Head, Shoulders & Chakra Blade!
      const susanooHex =
        charId === 'madara_six_paths'
          ? 0x2563eb
          : charId === 'sasuke_rinnegan'
            ? 0x7c3aed
            : charId === 'itachi_uchiha'
              ? 0xea580c
              : charId === 'kakashi_dms'
                ? 0x38bdf8
                : 0x10b981;
      addGroundSeal(6.0, susanooHex, 0xffffff);
      const auraMat = this.mkAwkMat(susanooHex, 0.58);
      const brightMat = this.mkAwkMat(susanooHex, 0.88);
      const eyeMat = this.mkAwkMat(0xfef08a, 0.98);

      const susanoo = new THREE.Group();
      // 4 Pairs of Glowing Chakra Ribs surrounding the Uchiha user
      for (let r = 0; r < 4; r++) {
        const rib = new THREE.Mesh(this.torusGeo, brightMat);
        rib.rotation.x = Math.PI / 2;
        rib.position.y = 0.55 + r * 0.38;
        rib.scale.set(1.05 + r * 0.06, 0.88 + r * 0.05, 0.65);
        susanoo.add(rib);
      }

      // Towering Spectral Tengu Warrior Upper Torso & Horned Helmet framed cleanly at z = -3.1
      const avatar = new THREE.Group();
      avatar.position.set(0, 0, -3.1);

      const torso = new THREE.Mesh(this.coneGeo, auraMat);
      torso.rotation.x = Math.PI;
      torso.position.set(0, 2.25, 0);
      torso.scale.set(1.75, 2.2, 1.2);

      const head = new THREE.Mesh(this.octaGeo, auraMat);
      head.position.set(0, 3.65, 0);
      head.scale.set(0.85, 0.95, 0.85);

      for (const side of [-1, 1]) {
        for (const zFace of [-0.58, 0.58]) {
          const eye = new THREE.Mesh(this.boxGeo, eyeMat);
          eye.position.set(side * 0.25, 3.7, zFace);
          eye.scale.set(0.22, 0.08, 0.08);
          avatar.add(eye);
        }
        const horn = new THREE.Mesh(this.solidConeGeo, brightMat);
        horn.position.set(side * 0.52, 4.3, 0);
        horn.rotation.z = -side * 0.42;
        horn.scale.set(0.16, 0.82, 0.16);
        const shoulder = new THREE.Mesh(this.octaGeo, brightMat);
        shoulder.position.set(side * 1.85, 2.95, 0);
        shoulder.scale.set(0.68, 0.45, 0.72);
        avatar.add(horn, shoulder);
      }

      // Giant Dual Susanoo Chakra Swords flanking the Tengu Warrior
      for (const side of [-1, 1]) {
        const sword = new THREE.Mesh(this.boxGeo, brightMat);
        sword.position.set(side * 2.15, 2.45, 0.2);
        sword.rotation.set(0.18, 0, -side * 0.28);
        sword.scale.set(0.18, 4.1, 0.45);
        avatar.add(sword);
      }
      avatar.add(torso, head);
      susanoo.add(avatar);

      if (charId === 'madara_six_paths') {
        const orbMat = this.mkAwkMat(0x090414, 0.95);
        const rimMat = this.mkAwkMat(0xfacc15, 0.88);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 1.35 - Math.PI * 0.175;
          const orb = new THREE.Mesh(this.sphereGeo, orbMat);
          orb.position.set(Math.cos(a) * 1.25, 1.35 + Math.sin(a) * 1.05, 0.32);
          orb.scale.setScalar(0.15);
          const rim = new THREE.Mesh(this.ringGeo, rimMat);
          rim.position.copy(orb.position);
          rim.scale.setScalar(0.21);
          susanoo.add(orb, rim);
        }
      }

      this.awakeningGroup.add(susanoo);
      this.awakeningSpinNodes.push({ obj: susanoo, bobAmp: 0.11, bobFreq: 1.8, baseY: 0 });
      return;
    }

    if (charId === 'naruto_baryon' || charId === 'minato_namikaze' || charId === 'killer_bee_hachibi') {
      // NINE-TAILS BARYON / KURAMA / HACHIBI — 9 (or 8) Huge Articulated Swaying Chakra Tails + Kurama Ears!
      const tailCount = charId === 'killer_bee_hachibi' ? 8 : 9;
      const tailHex = charId === 'naruto_baryon' ? 0xf97316 : charId === 'minato_namikaze' ? 0xfacc15 : 0xe11d48;
      const tipHex = charId === 'naruto_baryon' ? 0xdc2626 : 0xfef08a;
      addGroundSeal(5.8, tailHex, tipHex);
      const tailMat = this.mkAwkMat(tailHex, 0.84);
      const tipMat = this.mkAwkMat(tipHex, 0.92);

      // Blazing Kurama Fox-Chakra Ears above user's head
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(this.solidConeGeo, tailMat);
        ear.position.set(side * 0.28, 2.05, 0);
        ear.rotation.z = -side * 0.32;
        ear.scale.set(0.14, 0.48, 0.12);
        this.awakeningGroup.add(ear);
      }

      for (let t = 0; t < tailCount; t++) {
        const frac = (t / (tailCount - 1)) * 2 - 1; // -1 .. +1 wide Kurama peacock fan
        const tailPivot = new THREE.Group();
        tailPivot.position.set(frac * 0.22, 0.92, 0.26);
        tailPivot.rotation.z = -frac * 1.15;
        tailPivot.rotation.x = 0.18 + (1 - Math.abs(frac)) * 0.12;

        const baseSeg = new THREE.Mesh(this.solidConeGeo, tailMat);
        baseSeg.position.y = 1.25;
        baseSeg.scale.set(0.28, 2.5, 0.22);
        const tipSeg = new THREE.Mesh(this.octaGeo, tipMat);
        tipSeg.position.y = 2.58;
        tipSeg.scale.set(0.22, 0.68, 0.18);

        tailPivot.add(baseSeg, tipSeg);
        this.awakeningGroup.add(tailPivot);
        this.awakeningSpinNodes.push({ obj: tailPivot, swayAmp: 0.16, swayPhase: t * 0.72 });
      }
      return;
    }

    if (charId === 'obito_jinchuriki' || charId === 'hagoromo_sage' || charId === 'kaguya_otsutsuki') {
      // SIX PATHS SAGE / KAGUYA — 9 Pitch-Black Gudōdama Halo + Rinne-Sharingan Dimensional Portal!
      addGroundSeal(6.0, accentHex, 0xfef08a);
      const gudoMat = this.mkAwkMat(0x090414, 0.95);
      const rimMat = this.mkAwkMat(0xfacc15, 0.84);
      const riftMat = this.mkAwkMat(accentHex, 0.76);

      const haloGrp = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const orb = new THREE.Mesh(this.sphereGeo, gudoMat);
        orb.position.set(Math.cos(a) * 1.35, 1.55 + Math.sin(a) * 1.05, 0.35);
        orb.scale.setScalar(0.18);
        const rim = new THREE.Mesh(this.ringGeo, rimMat);
        rim.position.copy(orb.position);
        rim.scale.setScalar(0.26);
        haloGrp.add(orb, rim);
      }
      const rift = new THREE.Mesh(this.torusGeo, riftMat);
      rift.position.set(0, 2.35, -3.2);
      rift.scale.setScalar(2.0);
      this.awakeningGroup.add(haloGrp, rift);
      this.awakeningSpinNodes.push({ obj: haloGrp, speedZ: 0.85 }, { obj: rift, speedZ: -1.8 });
      return;
    }

    if (charId === 'might_guy_8gates' || charId === 'rock_lee') {
      // EIGHT INNER GATES — Roaring Crimson 'Night Guy' Steam Dragon Coiling Ahead (Camera-Safe)!
      const gateHex = charId === 'might_guy_8gates' ? 0xe11d48 : 0x22c55e;
      const coreHex = charId === 'might_guy_8gates' ? 0xfbbf24 : 0x38bdf8;
      addGroundSeal(6.0, gateHex, coreHex);
      const steamMat = this.mkAwkMat(gateHex, 0.86);
      const spineMat = this.mkAwkMat(coreHex, 0.90);
      const eyeMat = this.mkAwkMat(0xfef08a, 0.98);

      // Crimson Blood-Steam Rising Flames flanking Guy's body
      for (let f = 0; f < 6; f++) {
        const a = (f / 6) * Math.PI * 2;
        const wisp = new THREE.Mesh(this.solidConeGeo, f % 2 === 0 ? steamMat : spineMat);
        wisp.position.set(Math.cos(a) * 0.85, 0.75 + (f % 2) * 0.35, Math.sin(a) * 0.85);
        wisp.scale.set(0.18, 1.35, 0.18);
        this.awakeningGroup.add(wisp);
      }

      // Coiled Crimson 'Night Guy' Dragon centered at z = -2.8 (stays >4.8m clear of +3.8m 3rd-person camera!)
      const dragon = new THREE.Group();
      dragon.position.set(0, 0, -2.8);
      for (let s = 0; s < 12; s++) {
        const t = s / 11;
        const a = t * Math.PI * 2.5;
        const r = 1.15 + (1 - t) * 0.55;
        const seg = new THREE.Mesh(this.octaGeo, steamMat);
        seg.position.set(Math.cos(a) * r, 0.55 + t * 2.85, Math.sin(a) * r);
        seg.rotation.set(t * 0.8, -a, 0.35);
        seg.scale.set(0.28 + t * 0.16, 0.42 + t * 0.18, 0.28 + t * 0.16);
        const fin = new THREE.Mesh(this.solidConeGeo, spineMat);
        fin.position.set(Math.cos(a) * r, 0.82 + t * 2.85, Math.sin(a) * r);
        fin.scale.set(0.1, 0.35, 0.1);
        dragon.add(seg, fin);
      }
      const dragonHead = new THREE.Mesh(this.octaGeo, steamMat);
      dragonHead.position.set(0, 3.65, 0);
      dragonHead.scale.set(0.78, 0.66, 1.05);
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(this.solidConeGeo, spineMat);
        horn.position.set(side * 0.38, 4.15, 0);
        horn.rotation.z = -side * 0.38;
        horn.scale.set(0.12, 0.65, 0.12);
        for (const zFace of [-0.62, 0.62]) {
          const eye = new THREE.Mesh(this.sphereGeo, eyeMat);
          eye.position.set(side * 0.28, 3.74, zFace);
          eye.scale.setScalar(0.11);
          dragon.add(eye);
        }
        dragon.add(horn);
      }
      dragon.add(dragonHead);
      this.awakeningGroup.add(dragon);
      this.awakeningSpinNodes.push({ obj: dragon, speedY: 2.2 });
      return;
    }

    if (charId === 'hashirama_senju') {
      // SAGE ART: THOUSAND-ARMED KAN'ON HALO — 16 Radiating Golden Wood Spires!
      addGroundSeal(6.4, 0x16a34a, 0xfacc15);
      const woodGold = this.mkAwkMat(0xd97706, 0.86);
      const jadeMat = this.mkAwkMat(0x22c55e, 0.80);
      const halo = new THREE.Group();
      halo.position.set(0, 2.2, -2.6);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 1.3 - Math.PI * 0.15;
        const arm = new THREE.Mesh(this.boxGeo, i % 2 === 0 ? woodGold : jadeMat);
        arm.position.set(Math.cos(a) * 2.5, Math.sin(a) * 2.1, 0);
        arm.rotation.z = a - Math.PI / 2;
        arm.scale.set(0.2, 1.65, 0.2);
        halo.add(arm);
      }
      this.awakeningGroup.add(halo);
      this.awakeningSpinNodes.push({ obj: halo, bobAmp: 0.12, bobFreq: 1.7, baseY: 2.2 });
      return;
    }

    // Remaining Naruto, Dragon Ball, One Piece, Tensura & RPG Awakenings: Orbiting Elemental Crystal Shards (Camera-Safe!)
    addGroundSeal(5.6, accentHex, 0xfef08a);
    const pillarMat = this.mkAwkMat(accentHex, 0.72);
    const runeMat = this.mkAwkMat(0xffffff, 0.88);

    const shards = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const crystal = new THREE.Mesh(this.octaGeo, i % 2 === 0 ? runeMat : pillarMat);
      crystal.position.set(Math.cos(a) * 3.2, 0.95 + (i % 4) * 0.68, Math.sin(a) * 3.2);
      crystal.scale.set(0.24, 0.58, 0.24);
      shards.add(crystal);
    }
    this.awakeningGroup.add(shards);
    this.awakeningSpinNodes.push({ obj: shards, speedY: 2.4 });
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    urielActive: boolean,
    timeStopActive: boolean,
    showAmbientMotes = true,
    awakeningActive = false,
    awakeningColor = 0xfacc15,
    charId = 'rimuru_chaos',
    universe = 'Tensura',
    playerYaw = 0
  ) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const ef = this.effects[i];
      ef.age += dt;
      if (ef.age >= ef.duration) {
        this.removeAt(i);
        continue;
      }
      ef.onTick?.(ef.age / ef.duration, dt);
    }

    this.fireflyMesh.visible = showAmbientMotes;
    if (showAmbientMotes) {
      this.ambientClock += dt;
      const t = this.ambientClock;
      const baseSnapX = Math.round(playerX / 8) * 8;
      const baseSnapZ = Math.round(playerZ / 8) * 8;
      for (let i = 0; i < this.fireflyCount; i++) {
        const b = i * 4;
        const ox = this.fireflySeeds[b];
        const oy = this.fireflySeeds[b + 1];
        const oz = this.fireflySeeds[b + 2];
        const ph = this.fireflySeeds[b + 3];
        const fx = baseSnapX + ox + Math.sin(t * 0.75 + ph) * 1.8;
        const fy = playerY + oy + Math.sin(t * 1.35 + ph * 1.7) * 0.55;
        const fz = baseSnapZ + oz + Math.cos(t * 0.68 + ph) * 1.8;
        const pulse = 0.045 + Math.max(0, Math.sin(t * 2.6 + ph * 2.3)) * 0.045;
        this.fireflyDummy.position.set(fx, fy, fz);
        this.fireflyDummy.rotation.set(t + ph, t * 0.7, 0);
        this.fireflyDummy.scale.setScalar(pulse);
        this.fireflyDummy.updateMatrix();
        this.fireflyMesh.setMatrixAt(i, this.fireflyDummy.matrix);
      }
      this.fireflyMesh.instanceMatrix.needsUpdate = true;
    }

    this.urielGroup.visible = urielActive;
    if (urielActive) {
      this.urielGroup.position.set(playerX, playerY + 0.92, playerZ);
      this.urielShell.rotation.y += dt * 2.4;
      this.urielRing.rotation.z -= dt * 3.2;
    }

    this.timeStopRing.visible = timeStopActive;
    if (timeStopActive) {
      this.timeStopRing.position.set(playerX, playerY + 0.08, playerZ);
      this.timeStopRing.scale.setScalar(2.4 + Math.sin(performance.now() * 0.006) * 0.2);
      this.timeStopRing.rotation.z += dt * 4.0;
    }

    this.awakeningGroup.visible = awakeningActive;
    if (awakeningActive) {
      this.rebuildAwakeningManifestation(charId, universe, awakeningColor);
      this.awakeningAnimClock += dt;
      const t = this.awakeningAnimClock;
      this.awakeningGroup.position.set(playerX, playerY, playerZ);
      this.awakeningGroup.rotation.y = playerYaw;
      for (let i = 0; i < this.awakeningSpinNodes.length; i++) {
        const n = this.awakeningSpinNodes[i];
        if (n.speedY) n.obj.rotation.y += dt * n.speedY;
        if (n.speedZ) n.obj.rotation.z += dt * n.speedZ;
        if (n.speedX) n.obj.rotation.x += dt * n.speedX;
        if (n.bobAmp !== undefined && n.baseY !== undefined) {
          n.obj.position.y = n.baseY + Math.sin(t * (n.bobFreq || 2.0) + (n.swayPhase || 0)) * n.bobAmp;
        }
        if (n.swayAmp !== undefined) {
          n.obj.rotation.y = Math.sin(t * 2.6 + (n.swayPhase || 0)) * n.swayAmp;
        }
      }
    }
  }

  private removeAt(idx: number) {
    const ef = this.effects[idx];
    this.scene.remove(ef.group);
    for (let i = 0; i < ef.mats.length; i++) {
      ef.mats[i].dispose();
    }
    this.effects.splice(idx, 1);
  }
}

