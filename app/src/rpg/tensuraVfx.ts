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
  private sphereGeo = new THREE.SphereGeometry(1, 14, 12);
  private cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
  private coneGeo = new THREE.ConeGeometry(1, 1, 14, 1, true);
  private ringGeo = new THREE.RingGeometry(0.76, 1.0, 22);
  private torusGeo = new THREE.TorusGeometry(1, 0.075, 8, 22);
  private arcGeo = new THREE.TorusGeometry(1, 0.085, 8, 18, Math.PI * 0.88);
  private octaGeo = new THREE.OctahedronGeometry(1, 0);
  private boxGeo = new THREE.BoxGeometry(1, 1, 1);

  // Persistent Player Auras (Uriel Absolute Guard & Yog-Sothoth Time Stop)
  private urielGroup = new THREE.Group();
  private urielShell: THREE.Mesh;
  private urielRing: THREE.Mesh;
  private timeStopRing: THREE.Mesh;

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
  }

  private pushEffect(
    group: THREE.Group,
    mats: THREE.MeshBasicMaterial[],
    duration: number,
    onTick?: (progress: number, dt: number) => void
  ) {
    if (this.effects.length >= 36) {
      this.removeAt(0);
    }
    this.scene.add(group);
    this.effects.push({ group, mats, age: 0, duration, onTick });
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

    grp.add(beamOuter, beamCore, muzzle1, muzzle2, blast);
    this.pushEffect(grp, [coreMat, outerMat, circleMat], 0.62, (p, dt) => {
      muzzle1.rotation.z += dt * 12;
      muzzle2.rotation.z -= dt * 16;
      const w = Math.max(0.08, 1 - p * 0.88);
      beamCore.scale.set(radius * 0.52 * w, length, radius * 0.52 * w);
      beamOuter.scale.set(radius * (1 + p * 0.35) * w, length, radius * (1 + p * 0.35) * w);
      blast.scale.setScalar(radius * (2.6 + p * 3.5));
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
      const m = new THREE.Mesh(this.boxGeo, dMat);
      m.scale.setScalar(0.09);
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

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    urielActive: boolean,
    timeStopActive: boolean,
    showAmbientMotes = true
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

