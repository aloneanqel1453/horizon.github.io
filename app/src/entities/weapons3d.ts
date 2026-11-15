import * as THREE from 'three';
import { ITEM, getItemDef } from '../items/catalog';
import { BLOCK } from '../world/blocks';
import {
  enhanceRealisticMaterial,
  getForgedSteelBumpMap,
  getForgedSteelMap,
  getLeatherWrapBumpMap,
  getSkinToneShadingMap,
  getWoodGrainMap
} from './pbrMaterials3d';
import { mountGlbFpArmIntoGroup, mountGlbWeaponIntoGroup } from './glbModelRegistry';

// ============================================================================
// SMOOTH FORGED 3D WEAPONS, TOOLS, CURVED SHIELDS & SCULPTED HANDS ENGINE
// Replaces blocky voxel-extruded tools/shields with smooth curved 3D geometry
// (ExtrudeGeometry beveled blades, CylinderGeometry shafts, TorusGeometry arcs,
// SphereGeometry gems/flasks, TubeGeometry recurve limbs & PBR sheen).
// ============================================================================

export interface ToolMaterialPalette {
  blade: number;
  edge: number;
  dark: number;
  guard: number;
  pommel: number;
  metalness: number;
  roughness: number;
  emissive?: number;
}

const TIER_PALETTES: Record<string, ToolMaterialPalette> = {
  wood: {
    blade: 0x9a6b3b,
    edge: 0xc18e56,
    dark: 0x5c3a1e,
    guard: 0x6e4726,
    pommel: 0x855831,
    metalness: 0.08,
    roughness: 0.72
  },
  stone: {
    blade: 0x8b939e,
    edge: 0xbac2cf,
    dark: 0x525863,
    guard: 0x646b78,
    pommel: 0x4b5563,
    metalness: 0.18,
    roughness: 0.62
  },
  iron: {
    blade: 0xd8e0ea,
    edge: 0xf8fafc,
    dark: 0x7c8798,
    guard: 0x94a3b8,
    pommel: 0xcbd5e1,
    metalness: 0.68,
    roughness: 0.26
  },
  gold: {
    blade: 0xfacc15,
    edge: 0xfef9c3,
    dark: 0xb45309,
    guard: 0xd97706,
    pommel: 0xfde047,
    metalness: 0.74,
    roughness: 0.22,
    emissive: 0x261702
  },
  diamond: {
    blade: 0x22d3ee,
    edge: 0xcffafe,
    dark: 0x0e7490,
    guard: 0x0284c7,
    pommel: 0x67e8f9,
    metalness: 0.52,
    roughness: 0.16,
    emissive: 0x062c38
  },
  netherite: {
    blade: 0x463d49,
    edge: 0x86788c,
    dark: 0x231d26,
    guard: 0xd97706,
    pommel: 0xa855f7,
    metalness: 0.72,
    roughness: 0.24,
    emissive: 0x1a0b24
  }
};

function getTierKeyForItem(id: number): keyof typeof TIER_PALETTES {
  if (
    id === ITEM.WOOD_SWORD ||
    id === ITEM.WOOD_PICKAXE ||
    id === ITEM.WOOD_AXE ||
    id === ITEM.WOOD_SHOVEL ||
    id === ITEM.WOOD_HOE
  ) {
    return 'wood';
  }
  if (
    id === ITEM.STONE_SWORD ||
    id === ITEM.STONE_PICKAXE ||
    id === ITEM.STONE_AXE ||
    id === ITEM.STONE_SHOVEL ||
    id === ITEM.STONE_HOE
  ) {
    return 'stone';
  }
  if (id === ITEM.GOLD_SWORD || id === ITEM.GOLD_PICKAXE) {
    return 'gold';
  }
  if (
    id === ITEM.DIAMOND_SWORD ||
    id === ITEM.DIAMOND_PICKAXE ||
    id === ITEM.DIAMOND_AXE ||
    id === ITEM.DIAMOND_SHOVEL ||
    id === ITEM.DIAMOND_HOE ||
    id === ITEM.DIAMOND_SPEAR
  ) {
    return 'diamond';
  }
  if (
    id === ITEM.NETHERITE_SWORD ||
    id === ITEM.NETHERITE_PICKAXE ||
    id === ITEM.NETHERITE_AXE ||
    id === ITEM.NETHERITE_SHOVEL ||
    id === ITEM.NETHERITE_HOE
  ) {
    return 'netherite';
  }
  return 'iron';
}

const geoCache = new Map<string, THREE.BufferGeometry>();

function cachedGeo(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = build();
    g.userData.shared = true;
    geoCache.set(key, g);
  }
  return g;
}

function mkStdMat(
  color: number,
  metalness = 0.35,
  roughness = 0.42,
  emissive = 0x000000,
  opacity = 1.0
): THREE.MeshStandardMaterial {
  // Subtle self-luminance floor keeps metallic & organic surfaces vivid even at midnight,
  // paired with forged steel / wood grain / leather bump maps so weapons NEVER look like flat plastic!
  const baseCol = new THREE.Color(color);
  const floorEmissive =
    emissive !== 0
      ? new THREE.Color(emissive)
      : baseCol.clone().multiplyScalar(0.10);

  const hsl = { h: 0, s: 0, l: 0 };
  baseCol.getHSL(hsl);
  const isWoody = opacity >= 0.99 && metalness < 0.20 && roughness >= 0.68 && hsl.h > 0.04 && hsl.h < 0.14 && hsl.s > 0.22;
  const isMetallic = opacity >= 0.99 && metalness >= 0.28;
  const isLeatheryOrCloth = opacity >= 0.99 && !isMetallic && !isWoody && roughness >= 0.50;

  const mat = new THREE.MeshStandardMaterial({
    color,
    map: isMetallic ? getForgedSteelMap() : isWoody ? getWoodGrainMap() : null,
    bumpMap: isMetallic
      ? getForgedSteelBumpMap()
      : isWoody
        ? getForgedSteelBumpMap()
        : isLeatheryOrCloth
          ? getLeatherWrapBumpMap()
          : null,
    bumpScale: isMetallic ? 0.015 : isWoody ? 0.020 : isLeatheryOrCloth ? 0.018 : 0,
    metalness,
    roughness,
    emissive: floorEmissive,
    transparent: opacity < 0.999,
    opacity,
    side: THREE.FrontSide
  });

  if (opacity >= 0.99) {
    enhanceRealisticMaterial(mat, isMetallic ? 0.26 : 0.16, isMetallic ? 0xf8fafc : 0xe2e8f0);
  }
  return mat;
}

function addSharedMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  px = 0,
  py = 0,
  pz = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(px, py, pz);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  if (sx !== 1 || sy !== 1 || sz !== 1) m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

// Shared primitive geometries (marked shared=true so disposeHeldMeshSafe never destroys cached buffers)
function cylGeo(rt: number, rb: number, h: number, seg = 16): THREE.BufferGeometry {
  return cachedGeo(`cyl:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}
function sphereGeo(r: number, ws = 18, hs = 14): THREE.BufferGeometry {
  return cachedGeo(`sph:${r}:${ws}:${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
}
function coneGeo(r: number, h: number, seg = 16): THREE.BufferGeometry {
  return cachedGeo(`cone:${r}:${h}:${seg}`, () => new THREE.ConeGeometry(r, h, seg));
}
function torusGeo(r: number, tube: number, rs = 10, ts = 24, arc = Math.PI * 2): THREE.BufferGeometry {
  return cachedGeo(`tor:${r}:${tube}:${rs}:${ts}:${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc));
}
function octaGeo(r: number, detail = 0): THREE.BufferGeometry {
  return cachedGeo(`oct:${r}:${detail}`, () => new THREE.OctahedronGeometry(r, detail));
}
function capsuleGeo(r: number, len: number, capSeg = 8, radSeg = 16): THREE.BufferGeometry {
  return cachedGeo(`cap:${r}:${len}:${capSeg}:${radSeg}`, () => new THREE.CapsuleGeometry(r, len, capSeg, radSeg));
}

// ============================================================================
// 1. FORGED SMOOTH 3D SWORDS (Beveled Diamond Cross-Section + Fuller + Quillons)
// ============================================================================
function getSwordBladeGeo(): THREE.BufferGeometry {
  return cachedGeo('sword_blade_v2', () => {
    // Shape in XY where X = thickness/width (-Z..+Z after Y rotation), Y = blade length (+Y)
    const sh = new THREE.Shape();
    sh.moveTo(-0.046, 0);
    sh.lineTo(0.046, 0);
    sh.quadraticCurveTo(0.050, 0.34, 0.032, 0.54);
    sh.lineTo(0, 0.68);
    sh.lineTo(-0.032, 0.54);
    sh.quadraticCurveTo(-0.050, 0.34, -0.046, 0);
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.011,
      bevelSize: 0.012,
      bevelSegments: 3,
      curveSegments: 14
    });
    g.translate(0, 0, -0.004);
    // Rotate +90 deg around Y so blade width spans Z (-Z = front cutting edge, +Z = back edge) and thickness spans X!
    g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  });
}

export function buildSmoothSword3D(itemId: number, isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.96;
  const pal = TIER_PALETTES[getTierKeyForItem(itemId)];

  const leatherMat = mkStdMat(0x4a2c18, 0.10, 0.78);
  const wrapRingMat = mkStdMat(0x78492a, 0.15, 0.65);
  const guardMat = mkStdMat(pal.guard, Math.max(0.45, pal.metalness), pal.roughness, pal.emissive);
  const bladeMat = mkStdMat(pal.edge, pal.metalness, pal.roughness, pal.emissive);
  const fullerMat = mkStdMat(pal.dark, pal.metalness * 0.9, Math.min(0.65, pal.roughness + 0.12));
  const gemMat = mkStdMat(pal.blade, 0.35, 0.18, pal.emissive || pal.blade);

  // Sculpted Grip (centered at y=0 so hand wraps cleanly around it)
  addSharedMesh(g, cylGeo(0.022, 0.025, 0.22, 16), leatherMat, 0, -0.02, 0);
  for (let i = -2; i <= 2; i++) {
    addSharedMesh(g, torusGeo(0.024, 0.0045, 8, 16), wrapRingMat, 0, -0.02 + i * 0.036, 0, Math.PI / 2, 0, 0);
  }
  // Faceted Pommel + Pommel Cap
  addSharedMesh(g, sphereGeo(0.038, 16, 12), guardMat, 0, -0.15, 0, 0, 0, 0, 0.9, 1.05, 0.9);
  addSharedMesh(g, octaGeo(0.022), gemMat, 0, -0.18, 0);

  // Swept Winged Quillon Crossguard (spans Z so cutting edges align with -Z / +Z)
  addSharedMesh(g, cylGeo(0.022, 0.022, 0.25, 14), guardMat, 0, 0.10, 0, Math.PI / 2, 0, 0);
  addSharedMesh(g, sphereGeo(0.028, 12, 10), guardMat, 0, 0.10, -0.13);
  addSharedMesh(g, sphereGeo(0.028, 12, 10), guardMat, 0, 0.10, 0.13);
  addSharedMesh(g, sphereGeo(0.034, 14, 12), guardMat, 0, 0.105, 0, 0, 0, 0, 0.85, 1.0, 1.2);
  addSharedMesh(g, sphereGeo(0.018, 12, 10), gemMat, 0.026, 0.105, 0);
  addSharedMesh(g, sphereGeo(0.018, 12, 10), gemMat, -0.026, 0.105, 0);

  // Forged Double-Edged Beveled Blade + Blood Fuller Groove
  addSharedMesh(g, getSwordBladeGeo(), bladeMat, 0, 0.12, 0);
  addSharedMesh(g, cylGeo(0.008, 0.012, 0.42, 10), fullerMat, 0, 0.35, 0, 0, 0, 0, 1.85, 1, 1.2);

  g.scale.setScalar(s);
  return g;
}

// ============================================================================
// 2. FORGED SMOOTH 3D PICKAXES, AXES, SHOVELS, HOES & SHEARS
// ============================================================================
function getPickaxeHeadGeo(): THREE.BufferGeometry {
  return cachedGeo('pickaxe_arc_v2', () => {
    // Curved forged dual-pointed pickaxe arc in YZ plane (-Z front pick, +Z rear pick)
    const sh = new THREE.Shape();
    sh.moveTo(-0.25, -0.055);
    sh.quadraticCurveTo(-0.12, 0.038, 0, 0.046);
    sh.quadraticCurveTo(0.12, 0.038, 0.25, -0.055);
    sh.quadraticCurveTo(0.11, -0.004, 0, -0.010);
    sh.quadraticCurveTo(-0.11, -0.004, -0.25, -0.055);
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.020,
      bevelEnabled: true,
      bevelThickness: 0.010,
      bevelSize: 0.008,
      bevelSegments: 3,
      curveSegments: 18
    });
    g.translate(0, 0, -0.010);
    g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  });
}

function getBeardedAxeGeo(): THREE.BufferGeometry {
  return cachedGeo('bearded_axe_v2', () => {
    // Sweeping Viking/RPG bearded axe bit facing -Z (positive X before +PI/2 Y rotation -> -Z!)
    const sh = new THREE.Shape();
    sh.moveTo(-0.04, -0.04);
    sh.lineTo(0.10, -0.03);
    sh.quadraticCurveTo(0.19, -0.09, 0.22, -0.15); // Bearded lower hook
    sh.quadraticCurveTo(0.27, -0.01, 0.23, 0.13);  // Curved razor cutting arc
    sh.quadraticCurveTo(0.13, 0.08, -0.04, 0.05);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.010,
      bevelSize: 0.010,
      bevelSegments: 3,
      curveSegments: 16
    });
    g.translate(0, 0, -0.007);
    g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  });
}

function addTurnedWoodShaft(g: THREE.Group, length = 0.68, yCenter = 0.22) {
  const ashWoodMat = mkStdMat(0x8b5a2b, 0.06, 0.72);
  const darkLeatherMat = mkStdMat(0x422614, 0.10, 0.80);
  const brassRingMat = mkStdMat(0xd4a359, 0.62, 0.30);

  addSharedMesh(g, cylGeo(0.022, 0.026, length, 16), ashWoodMat, 0, yCenter, 0);
  // Ergonomic leather grip wrap near y=0
  addSharedMesh(g, cylGeo(0.025, 0.027, 0.20, 16), darkLeatherMat, 0, 0.0, 0);
  addSharedMesh(g, torusGeo(0.026, 0.004, 8, 16), brassRingMat, 0, 0.10, 0, Math.PI / 2, 0, 0);
  addSharedMesh(g, torusGeo(0.028, 0.005, 8, 16), brassRingMat, 0, -0.11, 0, Math.PI / 2, 0, 0);
  addSharedMesh(g, sphereGeo(0.029, 14, 10), ashWoodMat, 0, yCenter - length * 0.5, 0);
}

export function buildSmoothPickaxe3D(itemId: number, isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.86 : 0.95;
  const pal = TIER_PALETTES[getTierKeyForItem(itemId)];

  addTurnedWoodShaft(g, 0.68, 0.21);
  const headMat = mkStdMat(pal.blade, pal.metalness, pal.roughness, pal.emissive);
  const tipMat = mkStdMat(pal.edge, Math.min(0.85, pal.metalness + 0.12), Math.max(0.14, pal.roughness - 0.08), pal.emissive);
  const collarMat = mkStdMat(pal.dark, pal.metalness, pal.roughness);

  // Forged Socket Eye Collar + Finial Cap
  addSharedMesh(g, cylGeo(0.036, 0.032, 0.10, 16), collarMat, 0, 0.51, 0);
  addSharedMesh(g, coneGeo(0.026, 0.055, 14), tipMat, 0, 0.585, 0);
  // Smooth Curved Forged Pickaxe Arc
  addSharedMesh(g, getPickaxeHeadGeo(), headMat, 0, 0.51, 0);
  // Honed Gleaming Tips
  addSharedMesh(g, coneGeo(0.018, 0.065, 12), tipMat, 0, 0.445, -0.255, -1.18, 0, 0);
  addSharedMesh(g, coneGeo(0.018, 0.065, 12), tipMat, 0, 0.445, 0.255, 1.18, 0, 0);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothAxe3D(itemId: number, isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.96;
  const pal = TIER_PALETTES[getTierKeyForItem(itemId)];

  addTurnedWoodShaft(g, 0.66, 0.20);
  const bodyMat = mkStdMat(pal.dark, pal.metalness, pal.roughness);
  const edgeMat = mkStdMat(pal.edge, Math.min(0.85, pal.metalness + 0.14), Math.max(0.14, pal.roughness - 0.08), pal.emissive);

  // Socket Collar + Rear Hammer Poll + Sweeping Curved Bearded Blade
  addSharedMesh(g, cylGeo(0.036, 0.032, 0.13, 16), bodyMat, 0, 0.46, 0);
  addSharedMesh(g, cylGeo(0.024, 0.028, 0.08, 12), bodyMat, 0, 0.47, 0.06, Math.PI / 2, 0, 0);
  addSharedMesh(g, coneGeo(0.026, 0.055, 14), edgeMat, 0, 0.55, 0);
  addSharedMesh(g, getBeardedAxeGeo(), edgeMat, 0, 0.46, 0);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothShovel3D(itemId: number, isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.86 : 0.95;
  const pal = TIER_PALETTES[getTierKeyForItem(itemId)];

  addTurnedWoodShaft(g, 0.64, 0.19);
  const scoopMat = mkStdMat(pal.edge, pal.metalness, pal.roughness, pal.emissive);
  const collarMat = mkStdMat(pal.dark, pal.metalness, pal.roughness);

  addSharedMesh(g, cylGeo(0.028, 0.032, 0.09, 14), collarMat, 0, 0.51, 0);
  // Contoured curved spade dish + pointed tip
  const dishGeo = cachedGeo('shovel_dish_v2', () => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.085, 0);
    sh.lineTo(0.085, 0);
    sh.quadraticCurveTo(0.092, 0.14, 0, 0.24);
    sh.quadraticCurveTo(-0.092, 0.14, -0.085, 0);
    const eg = new THREE.ExtrudeGeometry(sh, {
      depth: 0.010,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
      curveSegments: 14
    });
    eg.translate(0, 0, -0.005);
    eg.computeVertexNormals();
    return eg;
  });
  addSharedMesh(g, dishGeo, scoopMat, 0, 0.53, 0, 0.12, 0, 0);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothHoe3D(itemId: number, isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.86 : 0.95;
  const pal = TIER_PALETTES[getTierKeyForItem(itemId)];

  addTurnedWoodShaft(g, 0.66, 0.20);
  const headMat = mkStdMat(pal.edge, pal.metalness, pal.roughness, pal.emissive);
  const collarMat = mkStdMat(pal.dark, pal.metalness, pal.roughness);

  addSharedMesh(g, cylGeo(0.033, 0.030, 0.09, 14), collarMat, 0, 0.50, 0);
  // Curved forward-angled hoe blade (-Z)
  addSharedMesh(g, cylGeo(0.016, 0.024, 0.21, 14), headMat, 0, 0.49, -0.10, 1.32, 0, 0, 0.72, 1, 1.35);
  addSharedMesh(g, coneGeo(0.020, 0.06, 12), headMat, 0, 0.455, -0.215, -1.75, 0, 0, 0.72, 1, 1.35);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothShears3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.85 : 0.92;
  const steelMat = mkStdMat(0xe2e8f0, 0.74, 0.22);
  const handleMat = mkStdMat(0xb91c1c, 0.20, 0.55);
  const brassMat = mkStdMat(0xfacc15, 0.65, 0.28);

  addSharedMesh(g, torusGeo(0.042, 0.012, 10, 18), handleMat, 0, -0.04, -0.035, 0, Math.PI / 2, 0);
  addSharedMesh(g, torusGeo(0.042, 0.012, 10, 18), handleMat, 0, -0.04, 0.035, 0, Math.PI / 2, 0);
  addSharedMesh(g, cylGeo(0.016, 0.016, 0.028, 12), brassMat, 0, 0.06, 0, 0, 0, Math.PI / 2);
  addSharedMesh(g, coneGeo(0.024, 0.24, 12), steelMat, -0.008, 0.17, -0.025, 0.16, 0, 0, 0.45, 1, 1.1);
  addSharedMesh(g, coneGeo(0.024, 0.24, 12), steelMat, 0.008, 0.17, 0.025, -0.16, 0, 0, 0.45, 1, 1.1);
  g.scale.setScalar(s);
  return g;
}

// ============================================================================
// 3. CURVED MEDIEVAL / KNIGHT HEATER SHIELD (Sleek Curved Crest, Boss & Trim)
// ============================================================================
function getCurvedShieldBodyGeo(): THREE.BufferGeometry {
  return cachedGeo('curved_heater_shield_v2', () => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.23, 0.38);
    sh.quadraticCurveTo(0, 0.43, 0.23, 0.38);
    sh.lineTo(0.22, 0.04);
    sh.quadraticCurveTo(0.19, -0.26, 0, -0.44);
    sh.quadraticCurveTo(-0.19, -0.26, -0.22, 0.04);
    sh.closePath();

    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.009,
      bevelSize: 0.009,
      bevelSegments: 3,
      curveSegments: 18
    });
    // Bend vertices smoothly into a real curved knight shield shell (convex toward -Z!)
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const curveZ = (x * x) * 1.15;
      pos.setZ(i, z - 0.018 + curveZ);
    }
    g.computeVertexNormals();
    return g;
  });
}

function getCurvedShieldRimGeo(): THREE.BufferGeometry {
  return cachedGeo('curved_heater_rim_v2', () => {
    const outer = new THREE.Shape();
    outer.moveTo(-0.252, 0.402);
    outer.quadraticCurveTo(0, 0.455, 0.252, 0.402);
    outer.lineTo(0.242, 0.04);
    outer.quadraticCurveTo(0.21, -0.28, 0, -0.468);
    outer.quadraticCurveTo(-0.21, -0.28, -0.242, 0.04);
    outer.closePath();

    const hole = new THREE.Path();
    hole.moveTo(-0.208, 0.358);
    hole.quadraticCurveTo(0, 0.402, 0.208, 0.358);
    hole.lineTo(0.198, 0.04);
    hole.quadraticCurveTo(0.168, -0.235, 0, -0.405);
    hole.quadraticCurveTo(-0.168, -0.235, -0.198, 0.04);
    hole.closePath();
    outer.holes.push(hole);

    const g = new THREE.ExtrudeGeometry(outer, {
      depth: 0.024,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.007,
      bevelSegments: 2,
      curveSegments: 18
    });
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const curveZ = (x * x) * 1.15;
      pos.setZ(i, z - 0.022 + curveZ);
    }
    g.computeVertexNormals();
    return g;
  });
}

export function buildSmoothShield3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.78 : 0.90;

  const royalWoodMat = mkStdMat(0x1e293b, 0.32, 0.42, 0x090f1d);
  royalWoodMat.map = getWoodGrainMap();
  royalWoodMat.bumpMap = getLeatherWrapBumpMap();
  royalWoodMat.bumpScale = 0.018;
  const steelRimMat = mkStdMat(0xe2e8f0, 0.78, 0.22);
  const goldCrestMat = mkStdMat(0xfacc15, 0.76, 0.22, 0x261a03);
  const azureGemMat = mkStdMat(0x38bdf8, 0.35, 0.16, 0x0c4a6e);
  const leatherMat = mkStdMat(0x5c3419, 0.10, 0.76);

  // Curved Shield Shell + Polished Steel Beveled Rim
  addSharedMesh(g, getCurvedShieldBodyGeo(), royalWoodMat);
  addSharedMesh(g, getCurvedShieldRimGeo(), steelRimMat);

  // Central Raised Golden Crest Boss + Star Diamond Emblem on Front (-Z)
  addSharedMesh(g, sphereGeo(0.072, 18, 14), goldCrestMat, 0, 0.03, -0.022, 0, 0, 0, 1, 1, 0.48);
  addSharedMesh(g, octaGeo(0.040), azureGemMat, 0, 0.03, -0.052, 0, 0, Math.PI / 4, 1, 1.35, 0.55);
  // Decorative Cross Filigree Bars on Front
  addSharedMesh(g, cylGeo(0.011, 0.011, 0.36, 12), goldCrestMat, 0, 0.01, -0.020, 0, 0, 0, 1, 1, 0.5);
  addSharedMesh(g, cylGeo(0.011, 0.011, 0.32, 12), goldCrestMat, 0, 0.03, -0.014, 0, 0, Math.PI / 2, 1, 1, 0.5);

  // Sleek Rear Forearm Leather Straps & Ergonomic Grip (+Z side)
  addSharedMesh(g, torusGeo(0.058, 0.011, 8, 16, Math.PI), leatherMat, -0.05, 0.02, 0.022, 0, 0, -Math.PI / 2);
  addSharedMesh(g, cylGeo(0.014, 0.014, 0.15, 12), leatherMat, 0.05, 0.02, 0.048);

  g.scale.setScalar(s);
  return g;
}

// ============================================================================
// 4. SIGNATURE ANIME & MYTHIC SMOOTH 3D WEAPONS
// ============================================================================
function getZangetsuCleaverGeo(): THREE.BufferGeometry {
  return cachedGeo('zangetsu_cleaver_v2', () => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.025, 0);
    sh.lineTo(0.075, 0);
    sh.quadraticCurveTo(0.115, 0.42, 0.095, 0.72);
    sh.quadraticCurveTo(0.065, 0.90, -0.035, 0.98); // Sweeping forward cleaver point
    sh.lineTo(-0.042, 0);
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.010,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 18
    });
    g.translate(0, 0, -0.005);
    g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  });
}

function getKatanaCurvedBladeGeo(): THREE.BufferGeometry {
  return cachedGeo('katana_curved_v2', () => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.016, 0);
    sh.lineTo(0.022, 0);
    sh.quadraticCurveTo(0.038, 0.42, 0.062, 0.80);
    sh.lineTo(0.036, 0.88);
    sh.quadraticCurveTo(0.006, 0.44, -0.016, 0);
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.006,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
      curveSegments: 20
    });
    g.translate(0, 0, -0.003);
    g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  });
}

export function buildSmoothKatana3D(isFirstPerson: boolean, isEnma: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.86 : 0.98;

  if (!isEnma) {
    // Ichigo's Shikai/Bankai Zangetsu: Giant Curved Obsidian-Black & Gleaming Silver Cleaver + Flowing Cloth!
    const clothMat = mkStdMat(0xf8fafc, 0.05, 0.82);
    const obsidianMat = mkStdMat(0x111827, 0.72, 0.26, 0x090d16);
    const razorSilverMat = mkStdMat(0xf8fafc, 0.84, 0.14, 0x1e293b);

    addSharedMesh(g, cylGeo(0.020, 0.022, 0.28, 16), clothMat, 0, -0.04, 0);
    for (let i = -2; i <= 2; i++) {
      addSharedMesh(g, torusGeo(0.022, 0.0035, 6, 14), clothMat, 0, -0.04 + i * 0.045, 0, Math.PI / 2, 0.18, 0);
    }
    // Streaming cloth ribbon tails from pommel
    addSharedMesh(g, capsuleGeo(0.012, 0.22, 6, 10), clothMat, 0, -0.26, 0.06, 0.48, 0, 0, 0.6, 1, 1.3);
    addSharedMesh(g, capsuleGeo(0.010, 0.16, 6, 10), clothMat, 0.02, -0.34, 0.14, 0.72, 0, 0.1, 0.6, 1, 1.2);
    // Giant Cleaver Blade (Black spine + gleaming silver razor edge along -Z)
    addSharedMesh(g, getZangetsuCleaverGeo(), razorSilverMat, 0, 0.10, -0.012);
    addSharedMesh(g, getZangetsuCleaverGeo(), obsidianMat, 0, 0.10, 0.016, 0, 0, 0, 1.18, 0.98, 0.78);
  } else {
    // Roronoa Zoro's Enma: Lilac & Gold Lacquered Tsuka + Trefoil Gold Tsuba + Curved Hamon Katana Blade!
    const lilacMat = mkStdMat(0x6d28d9, 0.28, 0.42, 0x2e1065);
    const goldMat = mkStdMat(0xfacc15, 0.80, 0.20, 0x291d02);
    const bladeSteel = mkStdMat(0xf1f5f9, 0.86, 0.14);
    const hakiEdge = mkStdMat(0xd8b4fe, 0.55, 0.18, 0x7e22ce);

    addSharedMesh(g, cylGeo(0.019, 0.021, 0.26, 16), lilacMat, 0, -0.03, 0);
    for (let i = -2; i <= 2; i++) {
      addSharedMesh(g, torusGeo(0.021, 0.0038, 6, 14), goldMat, 0, -0.03 + i * 0.044, 0, Math.PI / 2, 0, 0);
    }
    addSharedMesh(g, cylGeo(0.022, 0.020, 0.028, 14), goldMat, 0, -0.17, 0);
    // Trefoil Lobed Golden Tsuba Guard
    addSharedMesh(g, cylGeo(0.056, 0.056, 0.012, 20), goldMat, 0, 0.105, 0);
    addSharedMesh(g, cylGeo(0.022, 0.020, 0.028, 14), goldMat, 0, 0.122, 0); // Habaki collar
    addSharedMesh(g, getKatanaCurvedBladeGeo(), bladeSteel, 0, 0.13, 0);
    addSharedMesh(g, getKatanaCurvedBladeGeo(), hakiEdge, 0, 0.13, -0.006, 0, 0, 0, 0.65, 1.0, 0.55);
  }

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothKunai3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.92 : 1.02;
  // Minato Namikaze's 3-Pronged Flying Thunder God (Hiraishin) Kunai!
  const steelMat = mkStdMat(0xe2e8f0, 0.82, 0.18);
  const darkSteel = mkStdMat(0x475569, 0.72, 0.28);
  const talismanWrap = mkStdMat(0xfef3c7, 0.08, 0.72);
  const crimsonBand = mkStdMat(0xdc2626, 0.15, 0.58);

  // Finger Ring Pommel
  addSharedMesh(g, torusGeo(0.034, 0.0075, 10, 20), steelMat, 0, -0.155, 0, 0, Math.PI / 2, 0);
  // Talisman-Wrapped Cylindrical Handle
  addSharedMesh(g, cylGeo(0.019, 0.020, 0.18, 16), talismanWrap, 0, -0.035, 0);
  addSharedMesh(g, cylGeo(0.021, 0.021, 0.036, 16), crimsonBand, 0, -0.035, 0);
  addSharedMesh(g, cylGeo(0.024, 0.022, 0.025, 14), darkSteel, 0, 0.062, 0);

  // Sleek 4-Facet Diamond Central Kunai Dagger Blade + 2 Curved Side Prongs
  const centerBlade = cachedGeo('kunai_center_v2', () => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.lineTo(0.044, 0.09);
    sh.lineTo(0, 0.36);
    sh.lineTo(-0.044, 0.09);
    sh.closePath();
    const eg = new THREE.ExtrudeGeometry(sh, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.011,
      bevelSize: 0.010,
      bevelSegments: 2
    });
    eg.translate(0, 0, -0.004);
    eg.rotateY(Math.PI / 2);
    eg.computeVertexNormals();
    return eg;
  });
  addSharedMesh(g, centerBlade, steelMat, 0, 0.068, 0);
  addSharedMesh(g, coneGeo(0.016, 0.17, 10), steelMat, 0, 0.145, -0.056, -0.24, 0, 0, 0.65, 1, 1.15);
  addSharedMesh(g, coneGeo(0.016, 0.17, 10), steelMat, 0, 0.145, 0.056, 0.24, 0, 0, 0.65, 1, 1.15);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothGreatsword3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.84 : 0.98;

  const darkIron = mkStdMat(0x27272a, 0.72, 0.34);
  const honedSteel = mkStdMat(0xf1f5f9, 0.86, 0.16);
  const goldGuard = mkStdMat(0xeab308, 0.76, 0.24, 0x261802);
  const magmaCore = mkStdMat(0xf97316, 0.25, 0.20, 0xdc2626);
  const leather = mkStdMat(0x451a03, 0.10, 0.78);

  addSharedMesh(g, sphereGeo(0.044, 16, 12), goldGuard, 0, -0.22, 0);
  addSharedMesh(g, cylGeo(0.026, 0.028, 0.28, 16), leather, 0, -0.06, 0);
  // Horned Dragon Crossguard
  addSharedMesh(g, cylGeo(0.032, 0.032, 0.30, 14), goldGuard, 0, 0.10, 0, Math.PI / 2, 0, 0);
  addSharedMesh(g, coneGeo(0.028, 0.09, 12), magmaCore, 0, 0.13, -0.17, -0.95, 0, 0);
  addSharedMesh(g, coneGeo(0.028, 0.09, 12), magmaCore, 0, 0.13, 0.17, 0.95, 0, 0);

  // Colossal Beveled Dragon-Slayer Slab Blade
  const gsBlade = cachedGeo('dragon_slayer_v2', () => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.088, 0);
    sh.lineTo(0.088, 0);
    sh.lineTo(0.076, 0.74);
    sh.lineTo(0, 0.92);
    sh.lineTo(-0.076, 0.74);
    sh.closePath();
    const eg = new THREE.ExtrudeGeometry(sh, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.016,
      bevelSegments: 2
    });
    eg.translate(0, 0, -0.007);
    eg.rotateY(Math.PI / 2);
    eg.computeVertexNormals();
    return eg;
  });
  addSharedMesh(g, gsBlade, honedSteel, 0, 0.12, 0);
  addSharedMesh(g, cylGeo(0.020, 0.024, 0.66, 12), darkIron, 0, 0.46, 0, 0, 0, 0, 1.15, 1, 2.2);
  addSharedMesh(g, cylGeo(0.014, 0.018, 0.54, 12), magmaCore, 0, 0.44, 0, 0, 0, 0, 1.45, 1, 1.15);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothAstralStaff3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.84 : 0.96;

  const royalWood = mkStdMat(0x312e81, 0.35, 0.38, 0x1e1b4b);
  const goldMat = mkStdMat(0xfacc15, 0.80, 0.20, 0x2a1c02);
  const crystalMat = mkStdMat(0x38bdf8, 0.20, 0.10, 0x0ea5e9);
  const coreWhite = mkStdMat(0xffffff, 0.10, 0.10, 0x7dd3fc);

  addSharedMesh(g, coneGeo(0.028, 0.10, 14), goldMat, 0, -0.24, 0, Math.PI, 0, 0);
  addSharedMesh(g, cylGeo(0.022, 0.026, 0.86, 16), royalWood, 0, 0.22, 0);
  addSharedMesh(g, torusGeo(0.030, 0.006, 8, 16), goldMat, 0, 0.08, 0, Math.PI / 2, 0, 0);
  addSharedMesh(g, torusGeo(0.032, 0.007, 8, 16), goldMat, 0, 0.62, 0, Math.PI / 2, 0, 0);

  // Ornate Golden Crescent Cradle + Levitating Astral Crystal & Orbiting Rings
  addSharedMesh(g, torusGeo(0.115, 0.015, 12, 24, Math.PI * 1.42), goldMat, 0, 0.77, 0, 0, Math.PI / 2, Math.PI * 0.79);
  addSharedMesh(g, octaGeo(0.062, 0), crystalMat, 0, 0.78, 0, 0, 0.4, 0, 0.85, 1.32, 0.85);
  addSharedMesh(g, sphereGeo(0.032, 14, 12), coreWhite, 0, 0.78, 0);
  addSharedMesh(g, torusGeo(0.088, 0.0045, 8, 24), crystalMat, 0, 0.78, 0, 0.65, 0.35, 0);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothDivineScythe3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.82 : 0.96;

  const obsidianShaft = mkStdMat(0x18181b, 0.68, 0.28);
  const goldCollar = mkStdMat(0xfacc15, 0.80, 0.20, 0x261a03);
  const rosePlasma = mkStdMat(0xf472b6, 0.35, 0.14, 0xdb2777);
  const bladeCore = mkStdMat(0x831843, 0.62, 0.22, 0x500724);

  addSharedMesh(g, coneGeo(0.028, 0.09, 14), goldCollar, 0, -0.24, 0, Math.PI, 0, 0);
  addSharedMesh(g, cylGeo(0.022, 0.025, 0.96, 16), obsidianShaft, 0, 0.26, 0);
  addSharedMesh(g, cylGeo(0.036, 0.030, 0.10, 16), goldCollar, 0, 0.72, 0);

  // Sweeping Curved Crescent Reaper Blade extending forward (-Z)
  const scytheGeo = cachedGeo('divine_scythe_v2', () => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.04, -0.02);
    sh.quadraticCurveTo(0.24, 0.06, 0.56, -0.18);
    sh.quadraticCurveTo(0.62, -0.24, 0.52, -0.27);
    sh.quadraticCurveTo(0.24, -0.06, -0.04, -0.09);
    sh.closePath();
    const eg = new THREE.ExtrudeGeometry(sh, {
      depth: 0.010,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 20
    });
    eg.translate(0, 0, -0.005);
    eg.rotateY(Math.PI / 2);
    eg.computeVertexNormals();
    return eg;
  });
  addSharedMesh(g, scytheGeo, rosePlasma, 0, 0.76, 0);
  addSharedMesh(g, scytheGeo, bladeCore, 0, 0.775, 0.01, 0, 0, 0, 1.15, 0.72, 0.92);

  g.scale.setScalar(s);
  return g;
}

// ============================================================================
// 5. SMOOTH 3D SPEAR, TRIDENT, MACE, RECURVE BOW, CROSSBOW, ROD & GADGETS
// ============================================================================
export function buildSmoothSpear3D(isFirstPerson: boolean, isDiamond: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.84 : 0.96;
  const pal = isDiamond ? TIER_PALETTES.diamond : TIER_PALETTES.iron;

  addTurnedWoodShaft(g, 0.92, 0.26);
  const tipMat = mkStdMat(pal.edge, pal.metalness, pal.roughness, pal.emissive);
  const collarMat = mkStdMat(pal.guard, 0.68, 0.25);
  const tasselMat = mkStdMat(0xdc2626, 0.12, 0.68);

  addSharedMesh(g, cylGeo(0.030, 0.026, 0.08, 14), collarMat, 0, 0.72, 0);
  addSharedMesh(g, torusGeo(0.032, 0.008, 8, 16), tasselMat, 0, 0.69, 0, Math.PI / 2, 0, 0);
  addSharedMesh(g, coneGeo(0.044, 0.28, 14), tipMat, 0, 0.88, 0, 0, 0, 0, 0.46, 1, 1.15);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothTrident3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.84 : 0.96;

  const prismMat = mkStdMat(0x14b8a6, 0.48, 0.22, 0x0f766e);
  const silverProng = mkStdMat(0xe0f2fe, 0.78, 0.16, 0x0e7490);
  const goldCollar = mkStdMat(0xfacc15, 0.76, 0.24);

  addSharedMesh(g, cylGeo(0.021, 0.024, 0.84, 16), prismMat, 0, 0.22, 0);
  addSharedMesh(g, torusGeo(0.030, 0.007, 8, 16), goldCollar, 0, 0.62, 0, Math.PI / 2, 0, 0);
  // Curved Crescent Yoke + 3 Gleaming Prongs
  addSharedMesh(g, torusGeo(0.095, 0.015, 10, 20, Math.PI), prismMat, 0, 0.71, 0, 0, Math.PI / 2, Math.PI);
  addSharedMesh(g, coneGeo(0.020, 0.28, 12), silverProng, 0, 0.81, 0);
  addSharedMesh(g, coneGeo(0.016, 0.22, 12), silverProng, 0, 0.79, -0.095);
  addSharedMesh(g, coneGeo(0.016, 0.22, 12), silverProng, 0, 0.79, 0.095);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothMace3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.86 : 0.95;

  const breezeRodMat = mkStdMat(0x38bdf8, 0.55, 0.22, 0x0369a1);
  const heavyIronMat = mkStdMat(0x475569, 0.80, 0.24);
  const flangeMat = mkStdMat(0xe2e8f0, 0.86, 0.18);

  addSharedMesh(g, sphereGeo(0.034, 14, 12), breezeRodMat, 0, -0.15, 0);
  addSharedMesh(g, cylGeo(0.023, 0.025, 0.52, 16), breezeRodMat, 0, 0.13, 0);
  // Heavy Flanged Morningstar Core + 6 Radial Forged Flanges
  addSharedMesh(g, sphereGeo(0.088, 18, 14), heavyIronMat, 0, 0.46, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    addSharedMesh(
      g,
      coneGeo(0.036, 0.10, 8),
      flangeMat,
      Math.cos(a) * 0.085,
      0.46,
      Math.sin(a) * 0.085,
      0,
      -a,
      -Math.PI / 2,
      1,
      1,
      0.55
    );
  }
  addSharedMesh(g, coneGeo(0.028, 0.075, 12), flangeMat, 0, 0.57, 0);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothBow3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.96;

  const yewWood = mkStdMat(0x7c4a24, 0.10, 0.65);
  const goldTip = mkStdMat(0xfacc15, 0.72, 0.25);
  const leatherGrip = mkStdMat(0x3b2110, 0.08, 0.80);
  const stringMat = mkStdMat(0xf1f5f9, 0.05, 0.45, 0x334155);
  const steelTip = mkStdMat(0xe2e8f0, 0.82, 0.18);
  const featherMat = mkStdMat(0xf8fafc, 0.04, 0.70);

  // Smooth Curved Recurve Limbs via TubeGeometry in YZ plane (-Z forward arch, +Z string)
  const limbGeo = cachedGeo('recurve_bow_limb_v2', () => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.34, 0.15),
      new THREE.Vector3(0, -0.22, -0.02),
      new THREE.Vector3(0, 0, -0.08),
      new THREE.Vector3(0, 0.22, -0.02),
      new THREE.Vector3(0, 0.34, 0.15)
    ]);
    return new THREE.TubeGeometry(curve, 26, 0.020, 12, false);
  });
  addSharedMesh(g, limbGeo, yewWood);
  addSharedMesh(g, cylGeo(0.026, 0.026, 0.14, 14), leatherGrip, 0, 0, -0.078);
  addSharedMesh(g, sphereGeo(0.022, 12, 10), goldTip, 0, 0.34, 0.15);
  addSharedMesh(g, sphereGeo(0.022, 12, 10), goldTip, 0, -0.34, 0.15);

  const strGeo = cylGeo(0.0038, 0.0038, 0.35, 8);
  const upperStr = addSharedMesh(g, strGeo, stringMat, 0, 0.17, 0.16 * s);
  const lowerStr = addSharedMesh(g, strGeo, stringMat, 0, -0.17, 0.16 * s);

  // Nocked Smooth 3D Arrow (compatible with fpHand.update & localAvatar bow pose!)
  const arrowGrp = new THREE.Group();
  addSharedMesh(arrowGrp, cylGeo(0.007, 0.007, 0.56, 10), yewWood, 0, 0, -0.10, Math.PI / 2, 0, 0);
  addSharedMesh(arrowGrp, coneGeo(0.018, 0.065, 12), steelTip, 0, 0, -0.40, -Math.PI / 2, 0, 0);
  addSharedMesh(arrowGrp, coneGeo(0.022, 0.07, 6), featherMat, 0, 0.012, 0.15, Math.PI / 2, 0, 0, 0.25, 1, 1);
  addSharedMesh(arrowGrp, coneGeo(0.022, 0.07, 6), featherMat, 0.012, 0, 0.15, Math.PI / 2, 0, Math.PI / 2, 0.25, 1, 1);
  arrowGrp.visible = false;
  arrowGrp.userData.keepWithGlb = true;
  g.add(arrowGrp);

  g.userData.bowArrow = arrowGrp;
  g.userData.bowStrings = { upperStr, lowerStr, scale: s };
  g.scale.setScalar(s);
  return g;
}

export function buildSmoothCrossbow3D(isFirstPerson: boolean, loaded: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.86 : 0.94;

  const walnutMat = mkStdMat(0x6b3e20, 0.08, 0.68);
  const steelMat = mkStdMat(0xcbd5e1, 0.78, 0.22);
  const stringMat = mkStdMat(0xf1f5f9, 0.05, 0.50);

  // Contoured Wooden Stock + Grip + Steel Stirrup
  addSharedMesh(g, capsuleGeo(0.026, 0.44, 6, 12), walnutMat, 0, 0.02, -0.12, Math.PI / 2, 0, 0);
  addSharedMesh(g, cylGeo(0.020, 0.022, 0.15, 12), walnutMat, 0, -0.07, 0.02, 0.32, 0, 0);
  // Curved Steel Prod Bow across X at front (-Z)
  addSharedMesh(g, torusGeo(0.22, 0.015, 10, 22, Math.PI * 0.85), steelMat, 0, 0.04, -0.16, Math.PI / 2, 0, Math.PI * 0.075);
  addSharedMesh(g, torusGeo(0.045, 0.007, 8, 16), steelMat, 0, 0.02, -0.38, Math.PI / 2, 0, 0);
  addSharedMesh(g, cylGeo(0.0035, 0.0035, 0.38, 8), stringMat, 0, 0.045, loaded ? -0.04 : -0.22, 0, 0, Math.PI / 2);

  if (loaded) {
    addSharedMesh(g, cylGeo(0.007, 0.007, 0.36, 10), walnutMat, 0, 0.058, -0.20, Math.PI / 2, 0, 0);
    addSharedMesh(g, coneGeo(0.018, 0.06, 12), steelMat, 0, 0.058, -0.40, -Math.PI / 2, 0, 0);
  }

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothPotion3D(isFirstPerson: boolean, itemId: number): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.95;

  const liquidHex =
    itemId === ITEM.POTION_HEALING
      ? 0xf43f5e
      : itemId === ITEM.POTION_SWIFTNESS
        ? 0x38bdf8
        : itemId === ITEM.POTION_STRENGTH
          ? 0xf97316
          : 0xe879f9;

  const glassMat = mkStdMat(0xe0f2fe, 0.15, 0.08, 0x0c4a6e, 0.52);
  const liquidMat = mkStdMat(liquidHex, 0.15, 0.16, liquidHex, 0.92);
  const corkMat = mkStdMat(0xb47c48, 0.05, 0.82);

  addSharedMesh(g, sphereGeo(0.076, 16, 14), liquidMat, 0, 0.02, 0, 0, 0, 0, 1, 0.88, 1);
  addSharedMesh(g, sphereGeo(0.092, 18, 14), glassMat, 0, 0.03, 0);
  addSharedMesh(g, cylGeo(0.028, 0.032, 0.075, 16), glassMat, 0, 0.135, 0);
  addSharedMesh(g, torusGeo(0.032, 0.007, 8, 16), glassMat, 0, 0.172, 0, Math.PI / 2, 0, 0);
  addSharedMesh(g, cylGeo(0.024, 0.020, 0.038, 14), corkMat, 0, 0.192, 0);

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothTorchOrLantern3D(isFirstPerson: boolean, isLantern: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.95;

  if (isLantern) {
    const ironMat = mkStdMat(0x334155, 0.76, 0.30);
    const flameCore = mkStdMat(0xfef08a, 0.05, 0.10, 0xf59e0b);
    addSharedMesh(g, cylGeo(0.075, 0.082, 0.028, 8), ironMat, 0, -0.05, 0);
    addSharedMesh(g, cylGeo(0.064, 0.064, 0.15, 8), flameCore, 0, 0.04, 0);
    addSharedMesh(g, cylGeo(0.082, 0.055, 0.045, 8), ironMat, 0, 0.135, 0);
    addSharedMesh(g, torusGeo(0.032, 0.006, 8, 16), ironMat, 0, 0.18, 0);
  } else {
    const woodMat = mkStdMat(0x7c4a24, 0.06, 0.76);
    const coalMat = mkStdMat(0x27272a, 0.15, 0.85);
    const flameOuter = mkStdMat(0xf97316, 0.05, 0.12, 0xea580c, 0.90);
    const flameInner = mkStdMat(0xfef9c3, 0.05, 0.10, 0xfacc15);
    addSharedMesh(g, cylGeo(0.024, 0.020, 0.36, 14), woodMat, 0, 0.08, 0);
    addSharedMesh(g, sphereGeo(0.030, 12, 10), coalMat, 0, 0.27, 0);
    addSharedMesh(g, coneGeo(0.038, 0.12, 14), flameOuter, 0, 0.34, 0);
    addSharedMesh(g, coneGeo(0.022, 0.08, 12), flameInner, 0, 0.32, 0);
  }

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothBucket3D(isFirstPerson: boolean, itemId: number): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.86 : 0.94;
  const steelMat = mkStdMat(0xcbd5e1, 0.78, 0.24);
  addSharedMesh(g, cylGeo(0.095, 0.070, 0.20, 18), steelMat, 0, 0.04, 0);
  addSharedMesh(g, torusGeo(0.096, 0.007, 8, 20), steelMat, 0, 0.14, 0, Math.PI / 2, 0, 0);
  addSharedMesh(g, torusGeo(0.090, 0.006, 8, 18, Math.PI), steelMat, 0, 0.14, 0);

  if (itemId !== ITEM.BUCKET_EMPTY) {
    const col =
      itemId === ITEM.BUCKET_WATER
        ? 0x38bdf8
        : itemId === ITEM.BUCKET_LAVA
          ? 0xf97316
          : 0xf8fafc;
    const em = itemId === ITEM.BUCKET_LAVA ? 0xea580c : 0x0369a1;
    addSharedMesh(g, cylGeo(0.086, 0.084, 0.02, 16), mkStdMat(col, 0.15, 0.20, em), 0, 0.125, 0);
  }
  g.scale.setScalar(s);
  return g;
}

export function buildSmoothSpyglass3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.95;
  const brassMat = mkStdMat(0xd97706, 0.78, 0.22);
  const copperMat = mkStdMat(0xb45309, 0.72, 0.28);
  const lensMat = mkStdMat(0x38bdf8, 0.20, 0.08, 0x0284c7);

  addSharedMesh(g, cylGeo(0.024, 0.022, 0.16, 16), copperMat, 0, 0, 0.06, Math.PI / 2, 0, 0);
  addSharedMesh(g, cylGeo(0.032, 0.026, 0.18, 16), brassMat, 0, 0, -0.09, Math.PI / 2, 0, 0);
  addSharedMesh(g, cylGeo(0.030, 0.030, 0.012, 16), lensMat, 0, 0, -0.182, Math.PI / 2, 0, 0);
  g.scale.setScalar(s);
  return g;
}

export function buildSmoothGrapplingHook3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.95;
  const steelMat = mkStdMat(0xe2e8f0, 0.82, 0.20);
  const bodyMat = mkStdMat(0x334155, 0.65, 0.32);
  const ropeMat = mkStdMat(0xd4a359, 0.08, 0.78);

  addSharedMesh(g, cylGeo(0.032, 0.028, 0.24, 16), bodyMat, 0, 0.02, -0.08, Math.PI / 2, 0, 0);
  addSharedMesh(g, cylGeo(0.020, 0.022, 0.13, 12), ropeMat, 0, -0.06, 0.01, 0.25, 0, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    addSharedMesh(
      g,
      torusGeo(0.055, 0.009, 8, 16, Math.PI * 0.85),
      steelMat,
      Math.cos(a) * 0.03,
      0.02 + Math.sin(a) * 0.03,
      -0.23,
      0,
      Math.PI / 2,
      a
    );
  }
  g.scale.setScalar(s);
  return g;
}

export function buildSmoothFishingRod3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.96;
  const bambooMat = mkStdMat(0xa16207, 0.08, 0.65);
  const reelMat = mkStdMat(0x94a3b8, 0.72, 0.26);
  const bobRed = mkStdMat(0xef4444, 0.15, 0.35);
  const bobWhite = mkStdMat(0xf8fafc, 0.10, 0.35);

  addSharedMesh(g, cylGeo(0.007, 0.022, 0.84, 14), bambooMat, 0, 0.28, -0.12, -0.32, 0, 0);
  addSharedMesh(g, cylGeo(0.028, 0.028, 0.026, 14), reelMat, 0.022, 0.04, 0.02, 0, 0, Math.PI / 2);

  const bobber = new THREE.Group();
  bobber.position.set(0, 0.42, -0.28);
  addSharedMesh(bobber, sphereGeo(0.024, 12, 10), bobRed, 0, 0.01, 0);
  addSharedMesh(bobber, sphereGeo(0.022, 12, 10), bobWhite, 0, -0.01, 0);
  g.add(bobber);
  g.userData.rodBobber = bobber;

  g.scale.setScalar(s);
  return g;
}

export function buildSmoothProp3D(itemId: number, isFirstPerson: boolean): THREE.Group | null {
  const s = isFirstPerson ? 0.88 : 0.94;
  const g = new THREE.Group();

  if (itemId === ITEM.APPLE || itemId === ITEM.GOLDEN_APPLE) {
    const isGold = itemId === ITEM.GOLDEN_APPLE;
    const fruitMat = mkStdMat(isGold ? 0xfacc15 : 0xef4444, isGold ? 0.78 : 0.12, isGold ? 0.18 : 0.32, isGold ? 0x3b2602 : 0x000000);
    const leafMat = mkStdMat(0x22c55e, 0.06, 0.60);
    addSharedMesh(g, sphereGeo(0.082, 18, 14), fruitMat, 0, 0.04, 0, 0, 0, 0, 1.04, 0.94, 1.04);
    addSharedMesh(g, cylGeo(0.007, 0.009, 0.045, 8), mkStdMat(0x5c3a1e, 0.05, 0.8), 0, 0.125, 0);
    addSharedMesh(g, sphereGeo(0.026, 10, 8), leafMat, 0.024, 0.128, 0, 0, 0, -0.45, 1.4, 0.35, 0.7);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.CARROT || itemId === ITEM.GOLDEN_CARROT) {
    const isGold = itemId === ITEM.GOLDEN_CARROT;
    const bodyMat = mkStdMat(isGold ? 0xfacc15 : 0xf97316, isGold ? 0.76 : 0.08, isGold ? 0.20 : 0.55);
    const leafMat = mkStdMat(isGold ? 0xfef08a : 0x22c55e, 0.15, 0.50);
    addSharedMesh(g, coneGeo(0.042, 0.22, 14), bodyMat, 0, 0.04, 0, Math.PI, 0, 0);
    addSharedMesh(g, coneGeo(0.036, 0.07, 8), leafMat, 0, 0.17, 0);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.BREAD) {
    addSharedMesh(g, capsuleGeo(0.055, 0.13, 8, 14), mkStdMat(0xd99b43, 0.05, 0.72), 0, 0.04, 0, Math.PI / 2, 0, 0, 1.15, 1, 0.82);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.COOKED_STEAK || itemId === ITEM.RAW_BEEF) {
    const cooked = itemId === ITEM.COOKED_STEAK;
    addSharedMesh(g, cylGeo(0.088, 0.088, 0.036, 16), mkStdMat(cooked ? 0x6b341c : 0xdc2626, 0.08, 0.65), 0, 0.04, 0, 0.25, 0, 0, 1.2, 1, 0.88);
    addSharedMesh(g, cylGeo(0.022, 0.022, 0.040, 12), mkStdMat(0xfef3c7, 0.05, 0.60), 0.02, 0.04, 0, 0.25, 0, 0);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.ENDER_PEARL || itemId === ITEM.WIND_CHARGE || itemId === ITEM.SNOWBALL) {
    const col = itemId === ITEM.ENDER_PEARL ? 0x14b8a6 : itemId === ITEM.WIND_CHARGE ? 0xbae6fd : 0xf8fafc;
    const em = itemId === ITEM.ENDER_PEARL ? 0x0f766e : itemId === ITEM.WIND_CHARGE ? 0x38bdf8 : 0x334155;
    addSharedMesh(g, sphereGeo(0.078, 20, 16), mkStdMat(col, 0.28, 0.12, em), 0, 0.04, 0);
    if (itemId === ITEM.WIND_CHARGE) {
      addSharedMesh(g, torusGeo(0.095, 0.008, 8, 20), mkStdMat(0xe0f2fe, 0.1, 0.2, 0x7dd3fc), 0, 0.04, 0, 0.5, 0.3, 0);
    }
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.DIAMOND || itemId === ITEM.EMERALD || itemId === ITEM.AMETHYST_SHARD) {
    const col = itemId === ITEM.DIAMOND ? 0x22d3ee : itemId === ITEM.EMERALD ? 0x22c55e : 0xa855f7;
    addSharedMesh(g, octaGeo(0.078, 0), mkStdMat(col, 0.45, 0.12, col), 0, 0.05, 0, 0, 0, 0, 0.9, 1.28, 0.72);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.IRON_INGOT || itemId === ITEM.GOLD_INGOT || itemId === ITEM.COPPER_INGOT || itemId === ITEM.NETHERITE_INGOT) {
    const col =
      itemId === ITEM.GOLD_INGOT
        ? 0xfacc15
        : itemId === ITEM.COPPER_INGOT
          ? 0xd97745
          : itemId === ITEM.NETHERITE_INGOT
            ? 0x443c46
            : 0xe2e8f0;
    addSharedMesh(g, cylGeo(0.042, 0.052, 0.18, 6), mkStdMat(col, 0.78, 0.22), 0, 0.04, 0, Math.PI / 2, Math.PI / 6, 0, 1.0, 1.0, 0.65);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.STICK || itemId === ITEM.BONE) {
    const isBone = itemId === ITEM.BONE;
    const m = mkStdMat(isBone ? 0xf1f5f9 : 0x8b5a2b, 0.06, 0.70);
    addSharedMesh(g, cylGeo(0.020, 0.022, 0.44, 14), m, 0, 0.12, 0);
    if (isBone) {
      addSharedMesh(g, sphereGeo(0.028, 10, 8), m, -0.018, 0.34, 0);
      addSharedMesh(g, sphereGeo(0.028, 10, 8), m, 0.018, 0.34, 0);
      addSharedMesh(g, sphereGeo(0.028, 10, 8), m, -0.018, -0.10, 0);
      addSharedMesh(g, sphereGeo(0.028, 10, 8), m, 0.018, -0.10, 0);
    }
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.TOTEM_OF_UNDYING) {
    const goldMat = mkStdMat(0xfacc15, 0.78, 0.22, 0x3b2602);
    const emeraldMat = mkStdMat(0x22c55e, 0.30, 0.15, 0x15803d);
    addSharedMesh(g, capsuleGeo(0.052, 0.16, 8, 14), goldMat, 0, 0.06, 0);
    addSharedMesh(g, sphereGeo(0.058, 16, 12), goldMat, 0, 0.19, 0);
    addSharedMesh(g, sphereGeo(0.014, 10, 8), emeraldMat, -0.022, 0.20, -0.052);
    addSharedMesh(g, sphereGeo(0.014, 10, 8), emeraldMat, 0.022, 0.20, -0.052);
    addSharedMesh(g, coneGeo(0.045, 0.16, 10), goldMat, -0.09, 0.10, 0, 0, 0, 1.15, 0.4, 1, 0.8);
    addSharedMesh(g, coneGeo(0.045, 0.16, 10), goldMat, 0.09, 0.10, 0, 0, 0, -1.15, 0.4, 1, 0.8);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.CHAKRA_SCROLL) {
    const paperMat = mkStdMat(0xfef3c7, 0.05, 0.72);
    const redCap = mkStdMat(0xb91c1c, 0.25, 0.48);
    const goldRing = mkStdMat(0xfacc15, 0.72, 0.24);
    addSharedMesh(g, cylGeo(0.044, 0.044, 0.30, 18), paperMat, 0, 0.08, 0, 0, 0, Math.PI / 6);
    addSharedMesh(g, cylGeo(0.048, 0.048, 0.032, 18), redCap, -0.075, 0.21, 0, 0, 0, Math.PI / 6);
    addSharedMesh(g, cylGeo(0.048, 0.048, 0.032, 18), redCap, 0.075, -0.05, 0, 0, 0, Math.PI / 6);
    addSharedMesh(g, torusGeo(0.046, 0.006, 8, 18), goldRing, 0, 0.08, 0, Math.PI / 2, 0, Math.PI / 6);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.FIREWORK_ROCKET) {
    addSharedMesh(g, cylGeo(0.034, 0.034, 0.22, 16), mkStdMat(0xf8fafc, 0.08, 0.55), 0, 0.08, 0);
    addSharedMesh(g, torusGeo(0.035, 0.007, 8, 16), mkStdMat(0xef4444, 0.15, 0.45), 0, 0.08, 0, Math.PI / 2, 0, 0);
    addSharedMesh(g, coneGeo(0.046, 0.09, 16), mkStdMat(0xdc2626, 0.20, 0.40), 0, 0.23, 0);
    addSharedMesh(g, cylGeo(0.007, 0.007, 0.16, 8), mkStdMat(0x8b5a2b, 0.05, 0.8), 0.02, -0.06, 0);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.ARROW) {
    addSharedMesh(g, cylGeo(0.009, 0.009, 0.44, 12), mkStdMat(0x9a6432, 0.08, 0.68), 0, 0.14, 0);
    addSharedMesh(g, coneGeo(0.024, 0.075, 10), mkStdMat(0xcbd5e1, 0.80, 0.22), 0, 0.38, 0);
    addSharedMesh(g, coneGeo(0.022, 0.065, 8), mkStdMat(0xf8fafc, 0.04, 0.80), 0, -0.06, 0, Math.PI, 0, 0);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.COAL || itemId === ITEM.RAW_IRON || itemId === ITEM.RAW_GOLD || itemId === ITEM.NETHERITE_SCRAP) {
    const col =
      itemId === ITEM.COAL ? 0x1e293b : itemId === ITEM.RAW_GOLD ? 0xfacc15 : itemId === ITEM.NETHERITE_SCRAP ? 0x573b3a : 0xd6b89c;
    addSharedMesh(g, octaGeo(0.076, 1), mkStdMat(col, itemId === ITEM.COAL ? 0.18 : 0.62, 0.44), 0, 0.04, 0, 0.3, 0.4, 0, 1.1, 0.85, 0.95);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.DRAGON_SCALE) {
    addSharedMesh(g, coneGeo(0.082, 0.20, 14), mkStdMat(0x991b1b, 0.55, 0.24, 0x450a0a), 0, 0.08, 0, 0, 0, 0, 1.0, 1.0, 0.28);
    g.scale.setScalar(s);
    return g;
  }
  if (itemId === ITEM.MUSIC_DISC) {
    addSharedMesh(g, cylGeo(0.095, 0.095, 0.012, 24), mkStdMat(0x0f172a, 0.55, 0.20), 0, 0.04, 0, Math.PI / 2, 0, 0);
    addSharedMesh(g, cylGeo(0.032, 0.032, 0.015, 18), mkStdMat(0x22d3ee, 0.35, 0.25, 0x0891b2), 0, 0.04, 0, Math.PI / 2, 0, 0);
    g.scale.setScalar(s);
    return g;
  }
  if (getItemDef(itemId).spawnSpecies) {
    addSharedMesh(g, sphereGeo(0.072, 20, 16), mkStdMat(0xfef3c7, 0.12, 0.32), 0, 0.05, 0, 0, 0, 0, 0.88, 1.22, 0.88);
    addSharedMesh(g, torusGeo(0.060, 0.008, 8, 18), mkStdMat(0x38bdf8, 0.25, 0.25, 0x0284c7), 0, 0.05, 0, Math.PI / 2, 0, 0);
    g.scale.setScalar(s);
    return g;
  }
  return null;
}

export function tryBuildSmoothWeaponOrTool3D(
  id: number,
  isFirstPerson: boolean,
  loaded = false
): THREE.Object3D | null {
  const built = tryBuildSmoothWeaponOrTool3DInner(id, isFirstPerson, loaded);
  if (built) {
    built.userData.smooth3d = true;
  }
  return built;
}

function buildCanonicalAnimeRelic3D(id: number, isFirstPerson: boolean): THREE.Object3D {
  const s = isFirstPerson ? 0.88 : 1.0;

  // 1. Uchiha Gunbai (Madara's iconic crimson-violet gourd war fan with black tomoe & chain)
  if (id === ITEM.UCHIHA_GUNBAI) {
    const g = new THREE.Group();
    const fanMat = mkStdMat(0x991b1b, 0.25, 0.38, 0x450a0a);
    const rimMat = mkStdMat(0x18181b, 0.72, 0.25);
    const shaftMat = mkStdMat(0x312e81, 0.50, 0.35);
    const chainMat = mkStdMat(0xcbd5e1, 0.82, 0.20);
    addSharedMesh(g, cylGeo(0.018, 0.020, 0.56, 12), shaftMat, 0, 0.10, 0);
    addSharedMesh(g, cylGeo(0.19, 0.19, 0.022, 22), fanMat, 0, 0.52, 0, Math.PI / 2, 0, 0, 1.0, 1.0, 1.15);
    addSharedMesh(g, cylGeo(0.15, 0.15, 0.024, 22), fanMat, 0, 0.80, 0, Math.PI / 2, 0, 0, 1.0, 1.0, 1.05);
    addSharedMesh(g, torusGeo(0.19, 0.014, 8, 24), rimMat, 0, 0.52, 0, 0, 0, 0, 1.0, 1.12, 1.0);
    addSharedMesh(g, torusGeo(0.15, 0.013, 8, 24), rimMat, 0, 0.80, 0, 0, 0, 0, 1.0, 1.04, 1.0);
    for (const [tx, ty] of [[-0.07, 0.52], [0.07, 0.52], [0, 0.81]]) {
      addSharedMesh(g, sphereGeo(0.024, 10, 8), rimMat, tx, ty, 0.014);
      addSharedMesh(g, sphereGeo(0.024, 10, 8), rimMat, tx, ty, -0.014);
    }
    addSharedMesh(g, torusGeo(0.032, 0.006, 8, 14), chainMat, 0, -0.20, 0);
    g.scale.setScalar(s);
    return g;
  }

  // 2. Heilig Bogen (Quincy Glowing Reishi Spirit Bow — Yhwach, Uryu, Jugram)
  if (id === ITEM.HEILIG_BOGEN) {
    const g = new THREE.Group();
    const reishiMat = mkStdMat(0x38bdf8, 0.15, 0.08, 0x0284c7, 0.92);
    const coreMat = mkStdMat(0xe0f2fe, 0.10, 0.05, 0x7dd3fc, 0.96);
    const starMat = mkStdMat(0xfacc15, 0.75, 0.18, 0xd97706);
    addSharedMesh(g, torusGeo(0.46, 0.020, 10, 28, Math.PI * 0.92), reishiMat, 0, 0.06, -0.04, 0, Math.PI / 2, -Math.PI * 0.46);
    addSharedMesh(g, torusGeo(0.46, 0.009, 8, 24, Math.PI * 0.92), coreMat, 0, 0.06, -0.04, 0, Math.PI / 2, -Math.PI * 0.46);
    addSharedMesh(g, cylGeo(0.004, 0.004, 0.88, 8), coreMat, 0, 0.06, 0.12);
    addSharedMesh(g, octaGeo(0.052, 0), starMat, 0, 0.06, -0.04);
    g.scale.setScalar(s);
    return g;
  }

  // 3. Lanza del Relampago / Nunoboko / Chakra Rod / Ichimonji / Ashisogi Jizo / Murakumogiri
  if (
    id === ITEM.LANZA_RELAMPAGO ||
    id === ITEM.NUNOBOKO_SWORD ||
    id === ITEM.CHAKRA_ROD ||
    id === ITEM.ICHIMONJI_BRUSH ||
    id === ITEM.ASHISOGI_JIZO ||
    id === ITEM.MURAKUMOGIRI
  ) {
    const g = buildSmoothSpear3D(isFirstPerson, true);
    const cfgMap: Record<number, { hex: number; em: number; len: number }> = {
      [ITEM.LANZA_RELAMPAGO]: { hex: 0x10b981, em: 0x059669, len: 1.48 },
      [ITEM.NUNOBOKO_SWORD]: { hex: 0x18181b, em: 0x9333ea, len: 1.50 },
      [ITEM.CHAKRA_ROD]: { hex: 0x18181b, em: 0x7e22ce, len: 1.06 },
      [ITEM.ICHIMONJI_BRUSH]: { hex: 0xf8fafc, em: 0x18181b, len: 1.42 },
      [ITEM.ASHISOGI_JIZO]: { hex: 0xfacc15, em: 0x9333ea, len: 1.08 },
      [ITEM.MURAKUMOGIRI]: { hex: 0xe2e8f0, em: 0x0284c7, len: 1.58 }
    };
    const c = cfgMap[id];
    const accent = new THREE.Group();
    accent.userData.keepWithGlb = true;
    addSharedMesh(accent, octaGeo(0.046, 1), mkStdMat(c.hex, 0.25, 0.15, c.em, 0.90), 0, isFirstPerson ? 0.68 : 0.86, 0, 0, 0, 0, 0.9, 2.6, 0.9);
    g.add(accent);
    mountGlbWeaponIntoGroup(g, {
      file: id === ITEM.MURAKUMOGIRI ? 'wpn_spear' : id === ITEM.ASHISOGI_JIZO ? 'wpn_trident' : 'wpn_spear',
      targetLength: isFirstPerson ? c.len * 0.80 : c.len,
      gripAnchorY: 0.28,
      tintHex: c.hex,
      tintStrength: 0.56
    });
    return g;
  }

  // 4. Hassaikai Kanabo (Kaido's giant spiked black-iron Haki war club)
  if (id === ITEM.HASSAIKAI_KANABO) {
    const g = new THREE.Group();
    const ironMat = mkStdMat(0x1f2937, 0.82, 0.26, 0x3b0764);
    const goldMat = mkStdMat(0xfacc15, 0.85, 0.18);
    const hakiMat = mkStdMat(0xa855f7, 0.20, 0.12, 0x9333ea);
    addSharedMesh(g, cylGeo(0.022, 0.020, 0.34, 12), mkStdMat(0x581c87, 0.3, 0.6), 0, -0.02, 0);
    addSharedMesh(g, cylGeo(0.088, 0.048, 0.78, 14), ironMat, 0, 0.52, 0);
    addSharedMesh(g, torusGeo(0.052, 0.010, 8, 16), goldMat, 0, 0.15, 0, Math.PI / 2, 0, 0);
    addSharedMesh(g, torusGeo(0.088, 0.011, 8, 16), goldMat, 0, 0.90, 0, Math.PI / 2, 0, 0);
    for (let r = 0; r < 4; r++) {
      const y = 0.28 + r * 0.18;
      const rad = 0.054 + r * 0.010;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + (r % 2) * 0.52;
        addSharedMesh(g, coneGeo(0.020, 0.055, 8), k % 2 === 0 ? goldMat : hakiMat, Math.cos(a) * rad, y, Math.sin(a) * rad, 0, -a, -Math.PI / 2);
      }
    }
    addSharedMesh(g, torusGeo(0.036, 0.007, 8, 14), goldMat, 0, -0.21, 0);
    g.scale.setScalar(s);
    return g;
  }

  // 5. Enma Staff (Hiruzen Sarutobi's black-and-gold Adamantine Nyoi Staff)
  if (id === ITEM.ENMA_STAFF) {
    const g = buildSmoothAstralStaff3D(isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_staff',
      targetLength: isFirstPerson ? 1.04 : 1.38,
      gripAnchorY: 0.38,
      tintHex: 0xfacc15,
      tintStrength: 0.45
    });
    return g;
  }

  // 6. Jashin Triple-Bladed Scythe (Hidan)
  if (id === ITEM.JASHIN_SCYTHE) {
    const g = buildSmoothDivineScythe3D(isFirstPerson);
    const extraBlades = new THREE.Group();
    extraBlades.userData.keepWithGlb = true;
    const redMat = mkStdMat(0xdc2626, 0.72, 0.22, 0x7f1d1d);
    addSharedMesh(extraBlades, torusGeo(0.18, 0.014, 8, 18, Math.PI * 0.65), redMat, 0, isFirstPerson ? 0.62 : 0.78, -0.08, 0, Math.PI / 2, 0.35);
    addSharedMesh(extraBlades, torusGeo(0.15, 0.012, 8, 18, Math.PI * 0.65), redMat, 0, isFirstPerson ? 0.50 : 0.64, -0.07, 0, Math.PI / 2, 0.35);
    g.add(extraBlades);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_scythe',
      targetLength: isFirstPerson ? 1.08 : 1.38,
      gripAnchorY: 0.28,
      rz: Math.PI,
      tintHex: 0xdc2626,
      tintStrength: 0.58
    });
    return g;
  }

  // 7. Hiraishin Three-Pronged Kunai (Minato / Tobirama)
  if (id === ITEM.HIRAISHIN_KUNAI) {
    const g = buildSmoothKunai3D(isFirstPerson);
    const prongs = new THREE.Group();
    prongs.userData.keepWithGlb = true;
    const bladeMat = mkStdMat(0xf8fafc, 0.85, 0.16, 0xfacc15);
    addSharedMesh(prongs, coneGeo(0.014, 0.14, 8), bladeMat, -0.036, 0.18, 0, 0, 0, 0.22);
    addSharedMesh(prongs, coneGeo(0.014, 0.14, 8), bladeMat, 0.036, 0.18, 0, 0, 0, -0.22);
    g.add(prongs);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_kunai',
      targetLength: isFirstPerson ? 0.50 : 0.58,
      gripAnchorY: 0.22,
      rz: Math.PI,
      tintHex: 0xfef08a,
      tintStrength: 0.34
    });
    return g;
  }

  // 8. Colossal Cleavers & Greatswords (Nozarashi, Zabimaru, Tengen Odachi, Samehada, Kokuto Yoru, Sword of Hope, Katen Kyokotsu)
  const cleaverMap: Record<number, { file: 'wpn_zangetsu' | 'wpn_sword'; hex: number; em: number; len: number; strength: number }> = {
    [ITEM.NOZARASHI_CLEAVER]: { file: 'wpn_zangetsu', hex: 0xcbd5e1, em: 0xfacc15, len: 1.48, strength: 0.32 },
    [ITEM.ZABIMARU_BLADE]: { file: 'wpn_zangetsu', hex: 0xef4444, em: 0x991b1b, len: 1.34, strength: 0.48 },
    [ITEM.TENGEN_ODACHI]: { file: 'wpn_sword', hex: 0xdc2626, em: 0x7f1d1d, len: 1.46, strength: 0.42 },
    [ITEM.SAMEHADA_BLADE]: { file: 'wpn_zangetsu', hex: 0x2563eb, em: 0x1d4ed8, len: 1.42, strength: 0.62 },
    [ITEM.KOKUTO_YORU]: { file: 'wpn_sword', hex: 0x18181b, em: 0x16a34a, len: 1.52, strength: 0.68 },
    [ITEM.SWORD_OF_HOPE]: { file: 'wpn_sword', hex: 0x38bdf8, em: 0xfacc15, len: 1.40, strength: 0.55 },
    [ITEM.KATEN_KYOKOTSU]: { file: 'wpn_zangetsu', hex: 0xe11d48, em: 0x881337, len: 1.22, strength: 0.36 }
  };
  if (cleaverMap[id]) {
    const c = cleaverMap[id];
    const g = buildSmoothGreatsword3D(isFirstPerson);
    const aura = new THREE.Group();
    aura.userData.keepWithGlb = true;
    addSharedMesh(aura, torusGeo(0.036, 0.007, 8, 14), mkStdMat(c.hex, 0.5, 0.2, c.em), 0, -0.18, 0);
    g.add(aura);
    mountGlbWeaponIntoGroup(g, {
      file: c.file,
      targetLength: isFirstPerson ? c.len * 0.82 : c.len,
      gripAnchorY: 0.18,
      ...(c.file === 'wpn_zangetsu' ? { rz: Math.PI } : {}),
      tintHex: c.hex,
      tintStrength: c.strength
    });
    return g;
  }

  // 9. Canonical Katanas & Shikomizue (Benihime, Senbonzakura, Ryujin Jakka, Hyorinmaru, Sode no Shirayuki,
  //    Kyoka Suigetsu, Shinso, Minazuki, Sakanade, Kusanagi, Totsuka, Gryphon, Kikoku)
  const katanaMap: Record<number, { hex: number; tassel: number; len: number; strength: number; ringPommel?: boolean; longRibbon?: boolean }> = {
    [ITEM.BENIHIME_BLADE]: { hex: 0xdc2626, tassel: 0xef4444, len: 1.18, strength: 0.42 },
    [ITEM.SENBONZAKURA_KATANA]: { hex: 0xf472b6, tassel: 0xfbcfe8, len: 1.18, strength: 0.36 },
    [ITEM.RYUJIN_JAKKA_BLADE]: { hex: 0xf97316, tassel: 0xea580c, len: 1.22, strength: 0.56 },
    [ITEM.HYORINMARU_KATANA]: { hex: 0x38bdf8, tassel: 0x7dd3fc, len: 1.20, strength: 0.46 },
    [ITEM.SODE_NO_SHIRAYUKI]: { hex: 0xffffff, tassel: 0xf8fafc, len: 1.20, strength: 0.78, longRibbon: true },
    [ITEM.KYOKA_SUIGETSU]: { hex: 0x22c55e, tassel: 0xa855f7, len: 1.18, strength: 0.32 },
    [ITEM.SHINSO_BLADE]: { hex: 0xe2e8f0, tassel: 0x38bdf8, len: 0.96, strength: 0.30 },
    [ITEM.MINAZUKI_BLADE]: { hex: 0x991b1b, tassel: 0xef4444, len: 1.28, strength: 0.58 },
    [ITEM.SAKANADE_KATANA]: { hex: 0xfacc15, tassel: 0xef4444, len: 1.18, strength: 0.44, ringPommel: true },
    [ITEM.KUSANAGI_SASUKE]: { hex: 0x60a5fa, tassel: 0x1e293b, len: 1.16, strength: 0.34 },
    [ITEM.TOTSUKA_BLADE]: { hex: 0xf97316, tassel: 0xfacc15, len: 1.26, strength: 0.64 },
    [ITEM.GRYPHON_SABER]: { hex: 0xef4444, tassel: 0x15803d, len: 1.24, strength: 0.38 },
    [ITEM.KIKOKU_NODACHI]: { hex: 0x38bdf8, tassel: 0xf8fafc, len: 1.42, strength: 0.28 }
  };
  const kc = katanaMap[id] || { hex: 0xe2e8f0, tassel: 0xdc2626, len: 1.18, strength: 0.28 };
  const g = buildSmoothKatana3D(isFirstPerson, true);
  const ornament = new THREE.Group();
  ornament.userData.keepWithGlb = true;
  if (kc.ringPommel) {
    addSharedMesh(ornament, torusGeo(0.068, 0.010, 10, 20), mkStdMat(0xdc2626, 0.72, 0.22, 0x991b1b), 0, -0.22, 0);
  } else if (kc.longRibbon) {
    addSharedMesh(ornament, cylGeo(0.008, 0.014, 0.42, 8), mkStdMat(0xffffff, 0.1, 0.2, 0xe0f2fe), 0, -0.34, 0.04, 0.24, 0, 0);
  } else {
    addSharedMesh(ornament, cylGeo(0.007, 0.012, 0.16, 8), mkStdMat(kc.tassel, 0.15, 0.35, kc.tassel), 0, -0.22, 0.02, 0.22, 0, 0);
  }
  g.add(ornament);
  mountGlbWeaponIntoGroup(g, {
    file: 'wpn_enma',
    targetLength: isFirstPerson ? kc.len * 0.84 : kc.len,
    gripAnchorY: 0.18,
    tintHex: kc.hex,
    tintStrength: kc.strength
  });
  return g;
}

function getGlbTierTint(id: number): { tintHex?: number; tintStrength?: number } {
  const tier = getTierKeyForItem(id);
  if (tier === 'gold') return { tintHex: 0xfacc15, tintStrength: 0.55 };
  if (tier === 'diamond') return { tintHex: 0x22d3ee, tintStrength: 0.58 };
  if (tier === 'netherite') return { tintHex: 0x4c1d95, tintStrength: 0.44 };
  if (tier === 'wood') return { tintHex: 0x9a6b3b, tintStrength: 0.52 };
  if (tier === 'stone') return { tintHex: 0x94a3b8, tintStrength: 0.35 };
  return {};
}

function tryBuildSmoothWeaponOrTool3DInner(
  id: number,
  isFirstPerson: boolean,
  loaded = false
): THREE.Object3D | null {
  if (id === ITEM.SHIELD) {
    const g = buildSmoothShield3D(isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_shield',
      targetLength: isFirstPerson ? 0.62 : 0.68,
      gripAnchorY: 0.48
    });
    return g;
  }
  if (id === ITEM.BOW) {
    const g = buildSmoothBow3D(isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_bow',
      targetLength: isFirstPerson ? 0.78 : 0.92,
      gripAnchorY: 0.48
    });
    return g;
  }
  if (id === ITEM.CROSSBOW) {
    const g = buildSmoothCrossbow3D(isFirstPerson, loaded);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_crossbow',
      targetLength: isFirstPerson ? 0.60 : 0.70,
      gripAnchorY: 0.36,
      rx: -Math.PI / 2,
      ry: Math.PI / 2
    });
    return g;
  }
  if (id === ITEM.FISHING_ROD) return buildSmoothFishingRod3D(isFirstPerson);
  if (id === ITEM.GRAPPLING_HOOK) return buildSmoothGrapplingHook3D(isFirstPerson);
  if (id === ITEM.SPYGLASS) return buildSmoothSpyglass3D(isFirstPerson);
  if (id === BLOCK.TORCH || id === BLOCK.LANTERN) {
    const isLantern = id === BLOCK.LANTERN;
    const g = buildSmoothTorchOrLantern3D(isFirstPerson, isLantern);
    if (isLantern) {
      mountGlbWeaponIntoGroup(g, {
        file: 'wpn_lantern',
        targetLength: isFirstPerson ? 0.36 : 0.42,
        gripAnchorY: 0.55
      });
    } else {
      // Warm emissive brazier flame core inside the real medieval iron torch basket!
      const ember = new THREE.Group();
      ember.userData.keepWithGlb = true;
      const flOuter = mkStdMat(0xf97316, 0.05, 0.12, 0xea580c, 0.88);
      const flInner = mkStdMat(0xfef08a, 0.05, 0.08, 0xfacc15, 0.96);
      addSharedMesh(ember, octaGeo(0.036, 1), flOuter, 0, isFirstPerson ? 0.40 : 0.46, 0, 0, 0, 0, 1.0, 1.55, 1.0);
      addSharedMesh(ember, octaGeo(0.020, 1), flInner, 0, isFirstPerson ? 0.39 : 0.45, 0, 0, 0, 0, 1.0, 1.45, 1.0);
      g.add(ember);
      mountGlbWeaponIntoGroup(g, {
        file: 'wpn_torch',
        targetLength: isFirstPerson ? 0.54 : 0.62,
        gripAnchorY: 0.24
      });
    }
    return g;
  }
  if (
    id === ITEM.POTION_HEALING ||
    id === ITEM.POTION_SWIFTNESS ||
    id === ITEM.POTION_STRENGTH ||
    id === ITEM.POTION_REGEN
  ) {
    return buildSmoothPotion3D(isFirstPerson, id);
  }
  if (
    id === ITEM.BUCKET_EMPTY ||
    id === ITEM.BUCKET_WATER ||
    id === ITEM.BUCKET_LAVA ||
    id === ITEM.BUCKET_POWDER_SNOW
  ) {
    return buildSmoothBucket3D(isFirstPerson, id);
  }
  if (id === ITEM.ZANGETSU_BLADE) {
    const g = buildSmoothKatana3D(isFirstPerson, false);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_zangetsu',
      targetLength: isFirstPerson ? 1.04 : 1.24,
      gripAnchorY: 0.16,
      rz: Math.PI
    });
    return g;
  }
  if (id === ITEM.ENMA_KATANA) {
    const g = buildSmoothKatana3D(isFirstPerson, true);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_enma',
      targetLength: isFirstPerson ? 1.00 : 1.18,
      gripAnchorY: 0.18,
      tintHex: 0xa855f7,
      tintStrength: 0.24
    });
    return g;
  }
  if (id === ITEM.SHINOBI_KUNAI) {
    const g = buildSmoothKunai3D(isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_kunai',
      targetLength: isFirstPerson ? 0.48 : 0.56,
      gripAnchorY: 0.22,
      rz: Math.PI
    });
    return g;
  }
  if (id === ITEM.DRAGON_SLAYER) {
    const g = buildSmoothGreatsword3D(isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_sword',
      targetLength: isFirstPerson ? 1.08 : 1.30,
      gripAnchorY: 0.18,
      tintHex: 0x334155,
      tintStrength: 0.35
    });
    return g;
  }
  if (id === ITEM.ASTRAL_STAFF) {
    const g = buildSmoothAstralStaff3D(isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_staff',
      targetLength: isFirstPerson ? 0.98 : 1.26,
      gripAnchorY: 0.34
    });
    return g;
  }
  if (id === ITEM.DIVINE_SCYTHE) {
    const g = buildSmoothDivineScythe3D(isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_scythe',
      targetLength: isFirstPerson ? 1.06 : 1.34,
      gripAnchorY: 0.28,
      rz: Math.PI,
      tintHex: 0xf43f5e,
      tintStrength: 0.36
    });
    return g;
  }
  if (id >= ITEM.BENIHIME_BLADE && id <= ITEM.SWORD_OF_HOPE) {
    return buildCanonicalAnimeRelic3D(id, isFirstPerson);
  }
  if (id === ITEM.TRIDENT) {
    const g = buildSmoothTrident3D(isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_trident',
      targetLength: isFirstPerson ? 1.02 : 1.28,
      gripAnchorY: 0.32
    });
    return g;
  }
  if (id === ITEM.MACE) {
    const g = buildSmoothMace3D(isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_mace',
      targetLength: isFirstPerson ? 0.72 : 0.84,
      gripAnchorY: 0.22
    });
    return g;
  }
  if (id === ITEM.IRON_SPEAR || id === ITEM.DIAMOND_SPEAR) {
    const isDia = id === ITEM.DIAMOND_SPEAR;
    const g = buildSmoothSpear3D(isFirstPerson, isDia);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_spear',
      targetLength: isFirstPerson ? 1.06 : 1.34,
      gripAnchorY: 0.30,
      ...(isDia ? { tintHex: 0x22d3ee, tintStrength: 0.45 } : {})
    });
    return g;
  }

  const def = getItemDef(id);
  const tierTint = getGlbTierTint(id);
  if (def.toolClass === 'sword') {
    const g = buildSmoothSword3D(id, isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_sword',
      targetLength: isFirstPerson ? 0.86 : 0.96,
      gripAnchorY: 0.18,
      ...tierTint
    });
    return g;
  }
  if (def.toolClass === 'pickaxe') {
    const g = buildSmoothPickaxe3D(id, isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_pickaxe',
      targetLength: isFirstPerson ? 0.72 : 0.82,
      gripAnchorY: 0.26,
      ...tierTint
    });
    return g;
  }
  if (def.toolClass === 'axe') {
    const g = buildSmoothAxe3D(id, isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_axe',
      targetLength: isFirstPerson ? 0.72 : 0.82,
      gripAnchorY: 0.24,
      ...tierTint
    });
    return g;
  }
  if (def.toolClass === 'shovel') {
    const g = buildSmoothShovel3D(id, isFirstPerson);
    mountGlbWeaponIntoGroup(g, {
      file: 'wpn_shovel',
      targetLength: isFirstPerson ? 0.74 : 0.84,
      gripAnchorY: 0.24,
      rz: Math.PI,
      ...tierTint
    });
    return g;
  }
  if (def.toolClass === 'hoe') return buildSmoothHoe3D(id, isFirstPerson);
  if (def.toolClass === 'shears') return buildSmoothShears3D(isFirstPerson);

  return buildSmoothProp3D(id, isFirstPerson);
}

// ============================================================================
// 6. REAL 3D FIRST-PERSON ARM ENGINE (Sketchfab `fp_arm.glb` + Mojang Boxy Arm)
//    Zero Play-Doh spheres! Supports both Anime/RPG 5-fingered gloved FPS arm
//    AND authentic crisp Mojang 4x12x4 boxy Minecraft right arm!
// ============================================================================
export interface SculptedFpArmRig {
  bareArmGroup: THREE.Group;
  gripArmGroup: THREE.Group;
  glbBareGroup: THREE.Group;
  glbGripGroup: THREE.Group;
  mcBareMesh: THREE.Mesh;
  mcGripMesh: THREE.Mesh;
  skinMats: THREE.MeshStandardMaterial[];
  sleeveMats: THREE.MeshStandardMaterial[];
  trimMats: THREE.MeshStandardMaterial[];
}

export function buildSculptedFirstPersonArms(
  skinHex: string,
  sleeveHex: string
): SculptedFpArmRig {
  const skinMats: THREE.MeshStandardMaterial[] = [];
  const sleeveMats: THREE.MeshStandardMaterial[] = [];
  const trimMats: THREE.MeshStandardMaterial[] = [];

  const mkBoxySkin = () => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinHex),
      map: getSkinToneShadingMap(),
      roughness: 0.68,
      metalness: 0.02,
      emissive: new THREE.Color(skinHex).multiplyScalar(0.10),
      depthTest: true,
      depthWrite: true
    });
    skinMats.push(m);
    return m;
  };
  const mkBoxySleeve = () => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(sleeveHex),
      roughness: 0.72,
      metalness: 0.04,
      emissive: new THREE.Color(sleeveHex).multiplyScalar(0.10),
      depthTest: true,
      depthWrite: true
    });
    sleeveMats.push(m);
    return m;
  };

  const boxyArmGeo = cachedGeo('mc_fp_arm_box_4x12x4', () => new THREE.BoxGeometry(0.155, 0.48, 0.155));
  const boxySleeveOverlayGeo = cachedGeo('mc_fp_sleeve_box', () => new THREE.BoxGeometry(0.168, 0.25, 0.168));

  // 1. Bare Empty Right Arm (Dual-Mode: Real `fp_arm.glb` OR Authentic Mojang 4x12x4 Boxy Arm)
  // Note: In boxyArmGeo, local -Y is the skin fist and local +Y is the shirt sleeve shoulder!
  // Euler(1.80, -0.82, -0.67) sends the -Y fist up-left-forward and +Y sleeve down-right-back into camera corner!
  const bareArmGroup = new THREE.Group();

  // Sleek articulated 5-finger anime martial forearm (replaces bulbous white cartoon mitten `fp_arm.glb`!)
  const glbBareGroup = new THREE.Group();
  const buildArticulatedAnimeForearm = (): THREE.Group => {
    const rigGrp = new THREE.Group();
    const skinM = mkBoxySkin();
    const sleeveM = mkBoxySleeve();
    const wrapMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.78,
      metalness: 0.02,
      depthTest: true,
      depthWrite: true
    });
    trimMats.push(wrapMat);

    // Forearm shaft (-Y = toward hand/fist, +Y = toward elbow/shoulder)
    const upperSleeve = new THREE.Mesh(cylGeo(0.058, 0.070, 0.24, 18), sleeveM);
    upperSleeve.position.set(0, 0.11, 0);
    const cuffRing = new THREE.Mesh(cylGeo(0.060, 0.060, 0.036, 18), wrapMat);
    cuffRing.position.set(0, -0.005, 0);
    const forearmSkin = new THREE.Mesh(cylGeo(0.046, 0.055, 0.165, 18), skinM);
    forearmSkin.position.set(0, -0.095, 0);

    // Seamless martial wrist-wrap band + organic rounded palm & knuckles (zero boxy seam!)
    const wristBand = new THREE.Mesh(cylGeo(0.048, 0.048, 0.030, 18), wrapMat);
    wristBand.position.set(0, -0.168, 0);

    const palmMesh = new THREE.Mesh(
      cachedGeo('fp_anime_palm_round_v3', () => new THREE.SphereGeometry(0.050, 18, 14)),
      skinM
    );
    palmMesh.scale.set(0.98, 1.04, 0.68);
    palmMesh.position.set(0, -0.208, -0.002);
    rigGrp.add(upperSleeve, cuffRing, forearmSkin, wristBand, palmMesh);

    const fingerGeo = cachedGeo('fp_anime_finger_cap_v2', () => new THREE.CapsuleGeometry(0.0115, 0.036, 6, 10));
    const fingerOffsets = [-0.033, -0.011, 0.011, 0.033];
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(fingerGeo, skinM);
      f.position.set(fingerOffsets[i], -0.246, -0.014);
      f.rotation.x = 1.28;
      rigGrp.add(f);
    }
    const thumbMesh = new THREE.Mesh(fingerGeo, skinM);
    thumbMesh.position.set(-0.046, -0.214, -0.022);
    thumbMesh.rotation.set(0.58, 0.28, -0.66);
    rigGrp.add(thumbMesh);

    rigGrp.position.set(0.07, -0.05, 0.08);
    rigGrp.rotation.set(1.82, -0.78, -0.62);
    return rigGrp;
  };
  glbBareGroup.add(buildArticulatedAnimeForearm());

  const mcBareMesh = new THREE.Mesh(boxyArmGeo, mkBoxySkin());
  mcBareMesh.position.set(0.08, -0.06, 0.08);
  mcBareMesh.rotation.set(1.80, -0.82, -0.67);
  const mcBareSleeve = new THREE.Mesh(boxySleeveOverlayGeo, mkBoxySleeve());
  mcBareSleeve.position.set(0, 0.115, 0);
  mcBareMesh.add(mcBareSleeve);
  mcBareMesh.visible = false;

  bareArmGroup.add(glbBareGroup, mcBareMesh);

  // 2. Gripping Right Arm (kept compact & clean; hidden when holding 3D weapons/torches so zero glove blobs overlap!)
  const gripArmGroup = new THREE.Group();
  const glbGripGroup = new THREE.Group();

  const mcGripMesh = new THREE.Mesh(boxyArmGeo, mkBoxySkin());
  mcGripMesh.scale.set(0.90, 0.90, 0.90);
  mcGripMesh.position.set(0.06, -0.04, 0.09);
  mcGripMesh.rotation.set(1.80, -0.82, -0.67);
  const mcGripSleeve = new THREE.Mesh(boxySleeveOverlayGeo, mkBoxySleeve());
  mcGripSleeve.position.set(0, 0.115, 0);
  mcGripMesh.add(mcGripSleeve);
  mcGripMesh.visible = false;

  gripArmGroup.add(glbGripGroup, mcGripMesh);

  return {
    bareArmGroup,
    gripArmGroup,
    glbBareGroup,
    glbGripGroup,
    mcBareMesh,
    mcGripMesh,
    skinMats,
    sleeveMats,
    trimMats
  };
}
