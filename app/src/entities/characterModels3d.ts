// Realistic Heroic 1:7 Anatomical & PBR-Textured 3D Anime / RPG Character Rig Engine
// Replaces primitive cylinders/spheres/cones with:
//  - Multi-slice organic lofted human anatomy (pectorals, lats V-taper, sloping trapezius, deltoids, biceps, forearms, 5-finger hands)
//  - Heroic 1:7 proportions (refined sculpted anime skull, cheekbones, nasal bridge, jaw, 512x512 subsurface-shaded face art)
//  - Thick curved 4-ridge 3D anime hair blade locks with root-to-tip vertex shading (zero straight cones, zero face occlusion!)
//  - Outfit-specific 3D folded garments (billowing martial-arts Dōgi pants, samurai Hakama, Tensa Zangetsu split longcoat, plate armor)
//  - Woven twill cloth diffuse + bump maps, forged steel maps, leather maps, and Fresnel rim + AO shader lighting

import * as THREE from 'three';
import type { CharacterVisualSpec } from './avatars';
import {
  buildCurvedHairBladeGeo,
  buildLoftedOrganicGeo,
  buildSplitCoatSkirtGeo,
  cachedOrganicGeo,
  enhanceRealisticMaterial,
  getFabricBumpMap,
  getFabricWeaveMap,
  getForgedSteelBumpMap,
  getForgedSteelMap,
  getLeatherWrapBumpMap,
  getSkinToneShadingMap
} from './pbrMaterials3d';

const cyl = (rt: number, rb: number, h: number, seg = 18) =>
  cachedOrganicGeo(`char_cyl_${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));

const sph = (r: number, ws = 20, hs = 16) =>
  cachedOrganicGeo(`char_sph_${r}_${ws}_${hs}`, () => new THREE.SphereGeometry(r, ws, hs));

const cone = (r: number, h: number, seg = 14) =>
  cachedOrganicGeo(`char_cone_${r}_${h}_${seg}`, () => new THREE.ConeGeometry(r, h, seg));

const cap = (r: number, len: number, cs = 8, rs = 14) =>
  cachedOrganicGeo(`char_cap_${r}_${len}_${cs}_${rs}`, () => new THREE.CapsuleGeometry(r, len, cs, rs));

const tor = (r: number, tube: number, rs = 10, ts = 24, arc = Math.PI * 2) =>
  cachedOrganicGeo(`char_tor_${r}_${tube}_${rs}_${ts}_${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc));

// ============================================================================
// 1. HEROIC 1:7 SCULPTED ANATOMICAL ANIME/RPG HEAD (r ~ 0.11m, Never a Toy!)
// ============================================================================
function getAnatomicalAnimeHeadGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('anatomical_anime_head_v5', () => {
    const base = new THREE.SphereGeometry(0.118, 36, 28);
    const nonIdx = base.toNonIndexed();
    base.dispose();

    const pos = nonIdx.attributes.position as THREE.BufferAttribute;
    const uv = nonIdx.attributes.uv as THREE.BufferAttribute;
    const vCount = pos.count;

    for (let i = 0; i < vCount; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const ny = y / 0.118; // [-1, +1]
      // Slightly narrower human skull width vs vertical height (classic 1:1.22 facial ratio)
      x *= 0.88;
      y *= 1.08;
      z *= 0.95;

      if (ny < 0.05) {
        // Mandible jaw angle + tapered anime chin projecting gently forward (-Z)
        const jawT = Math.min(1, (0.05 - ny) / 1.05);
        const jawNarrow = 1.0 - Math.pow(jawT, 1.18) * 0.44;
        x *= jawNarrow;
        z *= 1.0 - jawT * 0.18;
        if (z < 0) {
          const chinCenter = Math.max(0, 1 - Math.abs(x) / 0.065);
          z -= jawT * 0.014 * chinCenter;
        }
      } else {
        // Fuller upper cranium
        const cr = 1.0 + Math.sin(ny * Math.PI) * 0.05;
        x *= cr;
        z *= cr;
      }

      // Sculpted cheekbones, recessed orbital eye plane, brow ridge & 3D nasal bridge on front (-Z)!
      if (z < -0.03) {
        // Gently flatten front facial mask for natural human eye/cheek alignment
        z = -0.03 + (z + 0.03) * 0.82;
        // Subtle brow ridge around ny in [0.18, 0.36]
        const browBand = Math.exp(-Math.pow((ny - 0.27) / 0.11, 2)) * Math.max(0, 1 - Math.abs(x) / 0.085);
        z -= browBand * 0.006;
        // 3D sculpted nose bridge + nose tip along x ~ 0, ny in [-0.28, +0.16]
        const noseX = Math.exp(-Math.pow(x / 0.016, 2));
        const noseY = ny > -0.32 && ny < 0.18 ? Math.sin(((ny + 0.32) / 0.50) * Math.PI) : 0;
        z -= noseX * noseY * 0.017;
        // Zygomatic cheekbone lift
        const cheek = Math.exp(-Math.pow((Math.abs(x) - 0.058) / 0.028, 2)) * Math.exp(-Math.pow((ny + 0.06) / 0.18, 2));
        z -= cheek * 0.006;
      }

      pos.setXYZ(i, x, y, z);
    }

    const skinPositions: number[] = [];
    const skinUVs: number[] = [];
    const facePositions: number[] = [];
    const faceUVs: number[] = [];

    const triCount = vCount / 3;
    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3;
      const cx = (pos.getX(i0) + pos.getX(i0 + 1) + pos.getX(i0 + 2)) / 3;
      const cy = (pos.getY(i0) + pos.getY(i0 + 1) + pos.getY(i0 + 2)) / 3;
      const cz = (pos.getZ(i0) + pos.getZ(i0 + 1) + pos.getZ(i0 + 2)) / 3;

      const isFrontFace = cz < -0.042 && Math.abs(cx) < 0.088 && cy > -0.118 && cy < 0.095;
      if (isFrontFace) {
        for (let k = 0; k < 3; k++) {
          const vx = pos.getX(i0 + k);
          const vy = pos.getY(i0 + k);
          const vz = pos.getZ(i0 + k);
          facePositions.push(vx, vy, vz);
          const u = THREE.MathUtils.clamp(0.5 - vx / 0.182, 0.02, 0.98);
          const v = THREE.MathUtils.clamp(0.52 + vy / 0.220, 0.02, 0.98);
          faceUVs.push(u, v);
        }
      } else {
        for (let k = 0; k < 3; k++) {
          skinPositions.push(pos.getX(i0 + k), pos.getY(i0 + k), pos.getZ(i0 + k));
          skinUVs.push(uv.getX(i0 + k), uv.getY(i0 + k));
        }
      }
    }
    nonIdx.dispose();

    const out = new THREE.BufferGeometry();
    const allPos = new Float32Array(skinPositions.length + facePositions.length);
    allPos.set(skinPositions, 0);
    allPos.set(facePositions, skinPositions.length);

    const allUv = new Float32Array(skinUVs.length + faceUVs.length);
    allUv.set(skinUVs, 0);
    allUv.set(faceUVs, skinUVs.length);

    out.setAttribute('position', new THREE.BufferAttribute(allPos, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(allUv, 2));
    out.clearGroups();
    const skinVerts = skinPositions.length / 3;
    const faceVerts = facePositions.length / 3;
    out.addGroup(0, skinVerts, 0);
    out.addGroup(skinVerts, faceVerts, 1);
    out.computeVertexNormals();
    return out;
  });
}

/**
 * Cranial Hair Cap that wraps ONLY the back skull, sides behind temples, and top crown —
 * mathematically tucked deep inside on the entire front facial plane so hair NEVER covers eyes!
 */
function getCranialHairCapGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('cranial_hair_cap_v5', () => {
    const g = new THREE.SphereGeometry(0.118, 28, 22);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) * 0.92;
      let y = pos.getY(i) * 1.10;
      let z = pos.getZ(i) * 0.99;

      // Tuck entire front face window (z < 0.005 and y < 0.078) deep inside the skull!
      if (z < 0.005 && y < 0.078) {
        const fz = Math.min(1, (0.005 - z) / 0.055);
        const fy = Math.min(1, (0.078 - y) / 0.045);
        const fx = Math.min(1, Math.max(0, (0.096 - Math.abs(x)) / 0.032));
        const tuck = fz * fy * fx;
        const s = 1.0 - tuck * 0.55;
        x *= s;
        y *= s;
        z *= s;
      } else if (y < -0.055) {
        // Taper nape cleanly into neck
        const nt = Math.min(1, (-0.055 - y) / 0.075);
        x *= 1 - nt * 0.34;
        z *= 1 - nt * 0.25;
      }
      pos.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  });
}

// ============================================================================
// 2. SEAMLESS MULTI-SLICE ANATOMICAL TORSO, ARMS, LEGS & BOOTS
// ============================================================================
function getAnatomicalTorsoGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('anatomical_torso_v5', () =>
    buildLoftedOrganicGeo(
      [
        { y: -0.16, rx: 0.148, rz: 0.102, shade: 0.80 },
        { y: -0.10, rx: 0.160, rz: 0.112, shade: 0.86 }, // Pelvis / hips
        { y: -0.02, rx: 0.142, rz: 0.098, pleatCount: 6, pleatAmp: 0.003, shade: 0.90 }, // Narrow waist
        { y: 0.06, rx: 0.148, rz: 0.104, pecFront: 0.006, pleatCount: 6, pleatAmp: 0.004, shade: 0.94 }, // Lower abs / ribs
        { y: 0.15, rx: 0.172, rz: 0.116, pecFront: 0.016, shade: 0.98 }, // Latissimus V-taper
        { y: 0.24, rx: 0.198, rz: 0.126, pecFront: 0.024, shade: 1.03 }, // Full pectoral chest!
        { y: 0.32, rx: 0.214, rz: 0.122, pecFront: 0.018, shade: 1.05 }, // Broad heroic shoulders
        { y: 0.38, rx: 0.176, rz: 0.102, shade: 1.02 }, // Sloping trapezius
        { y: 0.42, rx: 0.102, rz: 0.076, shade: 0.98 }, // Collarbone / neck base
        { y: 0.45, rx: 0.062, rz: 0.058, shade: 0.95 }
      ],
      30,
      true,
      true
    )
  );
}

function getAnatomicalBareArmGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('anatomical_bare_arm_v5', () =>
    buildLoftedOrganicGeo(
      [
        { y: -0.51, rx: 0.036, rz: 0.030, shade: 0.92 }, // Oval wrist
        { y: -0.43, rx: 0.045, rz: 0.041, shade: 0.96 }, // Lower forearm
        { y: -0.34, rx: 0.056, rz: 0.052, pecFront: 0.005, shade: 1.01 }, // Brachioradialis forearm muscle
        { y: -0.26, rx: 0.047, rz: 0.046, shade: 0.93 }, // Elbow crease
        { y: -0.17, rx: 0.062, rz: 0.064, pecFront: 0.010, shade: 1.03 }, // Bicep & tricep swell!
        { y: -0.07, rx: 0.070, rz: 0.068, pecFront: 0.008, shade: 1.05 }, // Lateral deltoid muscle
        { y: 0.01, rx: 0.062, rz: 0.058, shade: 1.02 }, // Shoulder socket blend
        { y: 0.05, rx: 0.032, rz: 0.030, shade: 0.96 }
      ],
      22,
      true,
      true
    )
  );
}

function getFoldedClothSleeveGeo(wideKimono = false): THREE.BufferGeometry {
  const key = wideKimono ? 'cloth_sleeve_kimono_v5' : 'cloth_sleeve_tailored_v5';
  return cachedOrganicGeo(key, () =>
    buildLoftedOrganicGeo(
      wideKimono
        ? [
            { y: -0.46, rx: 0.078, rz: 0.095, cz: 0.018, pleatCount: 6, pleatAmp: 0.006, shade: 0.92 },
            { y: -0.34, rx: 0.074, rz: 0.084, cz: 0.010, pleatCount: 6, pleatAmp: 0.005, shade: 0.96 },
            { y: -0.22, rx: 0.068, rz: 0.072, pleatCount: 5, pleatAmp: 0.004, shade: 0.98 },
            { y: -0.08, rx: 0.076, rz: 0.074, shade: 1.03 },
            { y: 0.03, rx: 0.058, rz: 0.056, shade: 1.00 }
          ]
        : [
            { y: -0.47, rx: 0.050, rz: 0.048, pleatCount: 5, pleatAmp: 0.003, shade: 0.92 },
            { y: -0.35, rx: 0.058, rz: 0.056, pleatCount: 6, pleatAmp: 0.004, shade: 0.97 },
            { y: -0.25, rx: 0.055, rz: 0.055, pleatCount: 6, pleatAmp: 0.005, shade: 0.94 }, // Elbow cloth folds
            { y: -0.13, rx: 0.068, rz: 0.066, pleatCount: 5, pleatAmp: 0.003, shade: 1.02 },
            { y: -0.03, rx: 0.074, rz: 0.070, shade: 1.04 },
            { y: 0.04, rx: 0.048, rz: 0.046, shade: 0.98 }
          ],
      22,
      true,
      true
    )
  );
}

function getAnatomicalLegGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('anatomical_leg_v5', () =>
    buildLoftedOrganicGeo(
      [
        { y: -0.70, rx: 0.050, rz: 0.052, shade: 0.88 }, // Ankle
        { y: -0.52, rx: 0.072, rz: 0.076, cz: 0.008, pleatCount: 5, pleatAmp: 0.003, shade: 0.96 }, // Calf swell
        { y: -0.38, rx: 0.066, rz: 0.068, pleatCount: 6, pleatAmp: 0.004, shade: 0.93 }, // Knee joint
        { y: -0.20, rx: 0.086, rz: 0.090, pecFront: 0.008, pleatCount: 5, pleatAmp: 0.003, shade: 1.01 }, // Thigh quad
        { y: -0.04, rx: 0.096, rz: 0.098, shade: 0.98 }, // Upper thigh
        { y: 0.04, rx: 0.076, rz: 0.078, shade: 0.90 }
      ],
      22,
      true,
      true
    )
  );
}

function getBaggyMartialGiLegGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('baggy_martial_gi_leg_v5', () =>
    buildLoftedOrganicGeo(
      [
        { y: -0.63, rx: 0.056, rz: 0.058, shade: 0.85 }, // Tightly tucked into boot cuff!
        { y: -0.55, rx: 0.118, rz: 0.122, pleatCount: 7, pleatAmp: 0.011, shade: 0.94 }, // Billowing lower gi puff!
        { y: -0.40, rx: 0.126, rz: 0.130, pleatCount: 7, pleatAmp: 0.012, shade: 0.98 }, // Loose pleated knee
        { y: -0.20, rx: 0.120, rz: 0.124, pleatCount: 6, pleatAmp: 0.010, shade: 1.02 }, // Baggy martial thigh
        { y: -0.03, rx: 0.104, rz: 0.108, pleatCount: 6, pleatAmp: 0.006, shade: 0.96 },
        { y: 0.04, rx: 0.082, rz: 0.084, shade: 0.90 }
      ],
      26,
      true,
      true
    )
  );
}

function getWideHakamaLegGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('wide_samurai_hakama_leg_v5', () =>
    buildLoftedOrganicGeo(
      [
        { y: -0.69, rx: 0.128, rz: 0.136, pleatCount: 6, pleatAmp: 0.012, shade: 0.90 }, // Wide pleated hakama cuff!
        { y: -0.48, rx: 0.122, rz: 0.128, pleatCount: 6, pleatAmp: 0.011, shade: 0.96 },
        { y: -0.24, rx: 0.114, rz: 0.118, pleatCount: 6, pleatAmp: 0.009, shade: 1.00 },
        { y: -0.04, rx: 0.098, rz: 0.104, pleatCount: 5, pleatAmp: 0.006, shade: 0.96 },
        { y: 0.04, rx: 0.078, rz: 0.082, shade: 0.90 }
      ],
      26,
      true,
      true
    )
  );
}

function getSculptedBootGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('sculpted_combat_boot_v5', () =>
    buildLoftedOrganicGeo(
      [
        { y: -0.88, rx: 0.066, rz: 0.118, cz: -0.036, shade: 0.76 }, // Flat grounded sole tread!
        { y: -0.84, rx: 0.068, rz: 0.120, cz: -0.038, pecFront: 0.010, shade: 0.92 }, // Contoured toe box & heel
        { y: -0.78, rx: 0.060, rz: 0.088, cz: -0.016, shade: 0.98 }, // Instep arch
        { y: -0.71, rx: 0.056, rz: 0.062, cz: 0.0, shade: 0.95 }, // Ankle crease
        { y: -0.61, rx: 0.065, rz: 0.068, cz: 0.0, shade: 1.02 } // Upper boot collar
      ],
      22,
      true,
      true
    )
  );
}

function getSquishySlimeGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('squishy_slime_v5', () => {
    const g = new THREE.SphereGeometry(0.38, 32, 24);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      if (y < 0) {
        const t = Math.min(1, -y / 0.38);
        y *= 0.56;
        const spread = 1 + t * 0.16;
        x *= spread;
        z *= spread;
      } else {
        const t = y / 0.38;
        const taper = 1 - t * 0.14;
        x *= taper;
        z *= taper;
        y *= 0.90;
      }
      pos.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  });
}

function getSculptedWingGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('sculpted_wing_blade_v5', () => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.04);
    sh.quadraticCurveTo(-0.32, 0.30, -0.78, 0.22);
    sh.quadraticCurveTo(-0.62, 0.02, -0.66, -0.14);
    sh.quadraticCurveTo(-0.46, -0.05, -0.44, -0.26);
    sh.quadraticCurveTo(-0.24, -0.12, 0, -0.18);
    sh.closePath();
    const eg = new THREE.ExtrudeGeometry(sh, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 16
    });
    eg.translate(0, 0, -0.007);
    eg.computeVertexNormals();
    return eg;
  });
}

function getCurvedHornGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('curved_oni_horn_v5', () => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.018, 0.08, -0.035),
      new THREE.Vector3(0.008, 0.17, -0.075),
      new THREE.Vector3(0, 0.25, -0.04)
    ]);
    const g = new THREE.TubeGeometry(curve, 16, 0.022, 10, false);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const t = THREE.MathUtils.clamp(y / 0.25, 0, 1);
      const centerZ = -0.06 * Math.sin(t * Math.PI * 0.8);
      const s = Math.max(0.06, 1 - t * 0.92);
      pos.setXYZ(i, x * s, y, centerZ + (z - centerZ) * s);
    }
    g.computeVertexNormals();
    return g;
  });
}

type HairArchetype =
  | 'naruto_spiky'
  | 'saiyan_goku'
  | 'saiyan_flame'
  | 'uchiha_swept'
  | 'kakashi_tilted'
  | 'luffy_tousled'
  | 'rimuru_long'
  | 'twintails'
  | 'cropped_hero'
  | 'bald_dome';

type EyeArchetype =
  | 'anime_standard'
  | 'naruto_sage'
  | 'sharingan'
  | 'rinnegan'
  | 'dual_sasuke'
  | 'dbz_fierce'
  | 'luffy_nika'
  | 'hollow_fierce';

type OutfitArchetype =
  | 'naruto_jacket'
  | 'akatsuki_cloak'
  | 'hokage_coat'
  | 'shinobi_vest'
  | 'dbz_gi'
  | 'saiyan_armor'
  | 'fusion_vest'
  | 'shihakusho'
  | 'captain_haori'
  | 'arrancar_coat'
  | 'luffy_vest'
  | 'zoro_coat'
  | 'admiral_cape'
  | 'demon_lord_coat'
  | 'knight_plate'
  | 'explorer_tunic';

interface ResolvedCharProfile {
  id: string;
  skin: string;
  hair: string;
  eyes: string;
  shirt: string;
  secondary: string;
  pants: string;
  boots: string;
  hairStyle: HairArchetype;
  eyeStyle: EyeArchetype;
  outfitStyle: OutfitArchetype;
  whiskers?: boolean;
  underEyeScar?: boolean;
  leftEyeVerticalScar?: boolean;
  tripleEyeScar?: boolean;
  faceMask?: boolean;
  sageMarks?: boolean;
  hollowCheekMarks?: boolean;
  tearMarks?: boolean;
  beardWhite?: boolean;
  mustacheCrescent?: boolean;
  catEars?: boolean;
  namekAntennae?: boolean;
  friezaDome?: boolean;
  gear5Cloud?: boolean;
  hipScabbards?: boolean;
  sandGourd?: boolean;
  furScarf?: boolean;
  lawHat?: boolean;
}

function shadeColorHex(hex: string, factor: number): string {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#f3cfb6';
  const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(1, 3), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(3, 5), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(5, 7), 16) * factor)));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_SKIN_SWATCHES: Record<string, Partial<ResolvedCharProfile>> = {
  '#38bdf8': { skin: '#d69e7c', hair: '#3b2618', eyes: '#2563eb', shirt: '#0369a1', secondary: '#0f172a', pants: '#1e3a8a', boots: '#27272a', hairStyle: 'cropped_hero' },
  '#6b4bff': { skin: '#e2ab8b', hair: '#1e1b4b', eyes: '#7c3aed', shirt: '#4f46e5', secondary: '#facc15', pants: '#1e1b4b', boots: '#18181b', hairStyle: 'uchiha_swept' },
  '#4ade80': { skin: '#f3cfb6', hair: '#9a3412', eyes: '#16a34a', shirt: '#15803d', secondary: '#d97706', pants: '#451a03', boots: '#292524', hairStyle: 'rimuru_long' },
  '#ef4444': { skin: '#9a6548', hair: '#1c1917', eyes: '#dc2626', shirt: '#991b1b', secondary: '#18181b', pants: '#1e293b', boots: '#09090b', hairStyle: 'kakashi_tilted' },
  '#f59e0b': { skin: '#c98e6b', hair: '#18181b', eyes: '#d97706', shirt: '#166534', secondary: '#1d4ed8', pants: '#1e40af', boots: '#334155', hairStyle: 'cropped_hero' },
  '#ec4899': { skin: '#e5b293', hair: '#9d174d', eyes: '#ec4899', shirt: '#be185d', secondary: '#fdf2f8', pants: '#1e293b', boots: '#3b0764', hairStyle: 'twintails' },
  '#8b5cf6': { skin: '#7c4d34', hair: '#1e1b4b', eyes: '#a855f7', shirt: '#5b21b6', secondary: '#facc15', pants: '#1e293b', boots: '#1f2937', hairStyle: 'cropped_hero' },
  '#e2e8f0': { skin: '#f5ceb0', hair: '#ca8a04', eyes: '#0284c7', shirt: '#cbd5e1', secondary: '#334155', pants: '#1e293b', boots: '#0f172a', hairStyle: 'naruto_spiky' }
};

function resolveCharProfile(accentHex: string, spec?: CharacterVisualSpec | null): ResolvedCharProfile {
  if (!spec) {
    const clean = /^#[0-9a-fA-F]{6}$/.test(accentHex) ? accentHex.toLowerCase() : '#38bdf8';
    const sw = DEFAULT_SKIN_SWATCHES[clean] || {};
    return {
      id: `default_${clean}`,
      skin: sw.skin || '#deb092',
      hair: sw.hair || '#3b2618',
      eyes: sw.eyes || '#2563eb',
      shirt: sw.shirt || clean,
      secondary: sw.secondary || '#1e293b',
      pants: sw.pants || '#1e293b',
      boots: sw.boots || '#1f2937',
      hairStyle: sw.hairStyle || 'cropped_hero',
      eyeStyle: 'anime_standard',
      outfitStyle: 'explorer_tunic'
    };
  }

  const id = spec.id;
  const p: ResolvedCharProfile = {
    id,
    skin: spec.skin || '#f3cfb6',
    hair: spec.hair || '#1e293b',
    eyes: spec.eyes || '#38bdf8',
    shirt: spec.shirt || '#1e293b',
    secondary: '#facc15',
    pants: spec.pants || '#0f172a',
    boots: spec.boots || '#090d16',
    hairStyle: 'cropped_hero',
    eyeStyle: 'anime_standard',
    outfitStyle: 'demon_lord_coat'
  };

  // --- NARUTO UNIVERSE ---
  if (id === 'naruto_baryon') {
    p.hairStyle = 'naruto_spiky';
    p.eyeStyle = 'naruto_sage';
    p.outfitStyle = 'naruto_jacket';
    p.shirt = '#ea580c';
    p.secondary = '#18181b';
    p.pants = '#ea580c';
    p.boots = '#1e293b';
    p.whiskers = true;
    p.sageMarks = true;
  } else if (id === 'minato_namikaze') {
    p.hairStyle = 'naruto_spiky';
    p.outfitStyle = 'hokage_coat';
    p.secondary = '#dc2626';
  } else if (id === 'sasuke_rinnegan') {
    p.hairStyle = 'uchiha_swept';
    p.eyeStyle = 'dual_sasuke';
    p.outfitStyle = 'demon_lord_coat';
    p.secondary = '#7e22ce';
  } else if (id === 'madara_six_paths') {
    p.hairStyle = 'uchiha_swept';
    p.eyeStyle = 'rinnegan';
    p.outfitStyle = 'knight_plate';
    p.secondary = '#991b1b';
  } else if (id === 'itachi_uchiha') {
    p.hairStyle = 'uchiha_swept';
    p.eyeStyle = 'sharingan';
    p.outfitStyle = 'akatsuki_cloak';
    p.secondary = '#dc2626';
  } else if (id === 'pain_nagato') {
    p.hairStyle = 'naruto_spiky';
    p.eyeStyle = 'rinnegan';
    p.outfitStyle = 'akatsuki_cloak';
    p.secondary = '#dc2626';
  } else if (id === 'kakashi_dms') {
    p.hairStyle = 'kakashi_tilted';
    p.eyeStyle = 'sharingan';
    p.outfitStyle = 'shinobi_vest';
    p.secondary = '#1e293b';
    p.faceMask = true;
    p.leftEyeVerticalScar = true;
  } else if (id === 'hashirama_senju') {
    p.hairStyle = 'rimuru_long';
    p.outfitStyle = 'knight_plate';
    p.sageMarks = true;
  } else if (id === 'jiraiya_sage') {
    p.hairStyle = 'saiyan_flame';
    p.eyeStyle = 'naruto_sage';
    p.outfitStyle = 'hokage_coat';
    p.sageMarks = true;
  } else if (id === 'gaara_kazekage') {
    p.hairStyle = 'cropped_hero';
    p.outfitStyle = 'demon_lord_coat';
    p.sandGourd = true;
  }
  // --- DRAGON BALL UNIVERSE ---
  else if (id === 'goku_mui' || id === 'goku_black_rose') {
    p.hairStyle = 'saiyan_goku';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'dbz_gi';
    p.shirt = id === 'goku_mui' ? '#ea580c' : '#18181b';
    p.pants = id === 'goku_mui' ? '#ea580c' : '#18181b';
    p.boots = id === 'goku_mui' ? '#1d4ed8' : '#f8fafc';
    p.secondary = id === 'goku_mui' ? '#1d4ed8' : '#be123c';
  } else if (id === 'vegeta_ultra_ego') {
    p.hairStyle = 'saiyan_flame';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'saiyan_armor';
    p.secondary = '#f8fafc';
  } else if (id === 'gohan_beast') {
    p.hairStyle = 'saiyan_flame';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'dbz_gi';
    p.secondary = '#dc2626';
  } else if (id === 'broly_lssj') {
    p.hairStyle = 'saiyan_flame';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'luffy_vest';
    p.secondary = '#22c55e';
    p.furScarf = true;
  } else if (id === 'gogeta_blue') {
    p.hairStyle = 'saiyan_flame';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'fusion_vest';
    p.secondary = '#0284c7';
  } else if (id === 'beerus_destroyer') {
    p.hairStyle = 'bald_dome';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'fusion_vest';
    p.catEars = true;
    p.secondary = '#facc15';
  } else if (id === 'black_frieza') {
    p.hairStyle = 'bald_dome';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'saiyan_armor';
    p.friezaDome = true;
    p.secondary = '#a855f7';
  } else if (id === 'orange_piccolo') {
    p.hairStyle = 'bald_dome';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'dbz_gi';
    p.namekAntennae = true;
    p.furScarf = true;
    p.secondary = '#1d4ed8';
  } else if (id === 'future_trunks') {
    p.hairStyle = 'uchiha_swept';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'explorer_tunic';
    p.secondary = '#1e293b';
  }
  // --- BLEACH UNIVERSE ---
  else if (id === 'ichigo_bankai') {
    p.hairStyle = 'saiyan_flame';
    p.eyeStyle = 'hollow_fierce';
    p.outfitStyle = 'shihakusho';
    p.shirt = '#0f172a';
    p.pants = '#0f172a';
    p.secondary = '#dc2626';
    p.boots = '#f8fafc';
    p.hollowCheekMarks = true;
  } else if (id === 'byakuya_kuchiki' || id === 'hitsugaya_toshiro' || id === 'rukia_bankai' || id === 'kisuke_urahara') {
    p.hairStyle = id === 'hitsugaya_toshiro' ? 'kakashi_tilted' : 'uchiha_swept';
    p.outfitStyle = 'captain_haori';
    p.secondary = '#09090b';
  } else if (id === 'yamamoto_bankai') {
    p.hairStyle = 'bald_dome';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'captain_haori';
    p.beardWhite = true;
    p.tripleEyeScar = true;
  } else if (id === 'kenpachi_zaraki') {
    p.hairStyle = 'saiyan_flame';
    p.eyeStyle = 'hollow_fierce';
    p.outfitStyle = 'captain_haori';
    p.leftEyeVerticalScar = true;
  } else if (id === 'aizen_hogyoku' || id === 'ulquiorra_cifer' || id === 'grimmjow_pantera') {
    p.hairStyle = id === 'grimmjow_pantera' ? 'kakashi_tilted' : 'uchiha_swept';
    p.eyeStyle = 'hollow_fierce';
    p.outfitStyle = 'arrancar_coat';
    p.secondary = '#09090b';
    if (id === 'ulquiorra_cifer') p.tearMarks = true;
  }
  // --- ONE PIECE UNIVERSE ---
  else if (id === 'luffy_gear5') {
    p.hairStyle = 'luffy_tousled';
    p.eyeStyle = 'luffy_nika';
    p.outfitStyle = 'luffy_vest';
    p.shirt = '#f8fafc';
    p.pants = '#f8fafc';
    p.secondary = '#7e22ce';
    p.boots = '#451a03';
    p.underEyeScar = true;
    p.gear5Cloud = true;
  } else if (id === 'zoro_king_of_hell') {
    p.hairStyle = 'cropped_hero';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'zoro_coat';
    p.shirt = '#14532d';
    p.pants = '#0f172a';
    p.secondary = '#dc2626';
    p.leftEyeVerticalScar = true;
    p.hipScabbards = true;
  } else if (id === 'shanks_yonko') {
    p.hairStyle = 'luffy_tousled';
    p.outfitStyle = 'admiral_cape';
    p.secondary = '#09090b';
    p.tripleEyeScar = true;
  } else if (id === 'whitebeard') {
    p.hairStyle = 'bald_dome';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'admiral_cape';
    p.mustacheCrescent = true;
    p.secondary = '#facc15';
  } else if (id === 'kaido_dragon') {
    p.hairStyle = 'rimuru_long';
    p.eyeStyle = 'dbz_fierce';
    p.outfitStyle = 'luffy_vest';
    p.furScarf = true;
  } else if (id === 'trafalgar_law') {
    p.hairStyle = 'luffy_tousled';
    p.outfitStyle = 'demon_lord_coat';
    p.lawHat = true;
  } else if (id === 'dracule_mihawk' || id === 'sanji_ifrit' || id === 'sabo_flame') {
    p.hairStyle = 'luffy_tousled';
    p.outfitStyle = 'demon_lord_coat';
  } else if (id === 'portgas_d_ace') {
    p.hairStyle = 'luffy_tousled';
    p.outfitStyle = 'luffy_vest';
    p.secondary = '#ef4444';
  }
  // --- TENSURA & RPG CLASSES ---
  else if (id === 'rimuru' || id === 'ciel') {
    p.hairStyle = 'rimuru_long';
    p.outfitStyle = 'demon_lord_coat';
    p.furScarf = id === 'rimuru';
    p.secondary = '#facc15';
  } else if (id === 'milim' || id === 'ultima' || id === 'ramiris') {
    p.hairStyle = 'twintails';
    p.outfitStyle = 'demon_lord_coat';
    p.secondary = '#f472b6';
  } else if (id === 'benimaru' || id === 'veldora' || id === 'gabiru' || id === 'souei' || id === 'ranga') {
    p.hairStyle = 'kakashi_tilted';
    p.outfitStyle = 'demon_lord_coat';
  } else if (
    id === 'class_dragon_knight' ||
    id === 'class_holy_paladin' ||
    id === 'geld' ||
    id === 'albert' ||
    id === 'hinata' ||
    id === 'zegion'
  ) {
    p.hairStyle = id === 'hinata' ? 'cropped_hero' : 'uchiha_swept';
    p.outfitStyle = 'knight_plate';
  } else {
    p.hairStyle = 'rimuru_long';
    p.outfitStyle = 'demon_lord_coat';
  }

  return p;
}

// ============================================================================
// 3. 512x512 SUBSURFACE-SHADED SEMI-REALISTIC ANIME FACE TEXTURE
// ============================================================================
function createAnimeFaceTexture(p: ResolvedCharProfile): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    const dt = new THREE.DataTexture(new Uint8Array(64 * 64 * 4), 64, 64);
    dt.needsUpdate = true;
    return dt as unknown as THREE.CanvasTexture;
  }

  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;

  // 1. Subsurface Skin Tone Base + Temple/Jaw Contour Shading (matches skinMat seamlessly!)
  ctx.fillStyle = p.skin;
  ctx.fillRect(0, 0, S, S);

  // Soft jaw/chin ambient shadow & warm cheek subsurface blush
  const jawGrad = ctx.createLinearGradient(0, 0, 0, S);
  jawGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
  jawGrad.addColorStop(0.55, 'rgba(255,255,255,0)');
  jawGrad.addColorStop(1, 'rgba(92, 42, 24, 0.22)');
  ctx.fillStyle = jawGrad;
  ctx.fillRect(0, 0, S, S);

  for (const cheekX of [136, 376]) {
    const cg = ctx.createRadialGradient(cheekX, 294, 6, cheekX, 294, 72);
    cg.addColorStop(0, 'rgba(239, 108, 92, 0.16)');
    cg.addColorStop(1, 'rgba(239, 108, 92, 0)');
    ctx.fillStyle = cg;
    ctx.fillRect(cheekX - 75, 220, 150, 150);
  }

  // Sculpted nasal bridge highlight + subtle orbital eye socket shadow
  const bridge = ctx.createLinearGradient(236, 210, 276, 210);
  bridge.addColorStop(0, 'rgba(90,45,28,0.14)');
  bridge.addColorStop(0.48, 'rgba(255,255,255,0.22)');
  bridge.addColorStop(1, 'rgba(90,45,28,0.10)');
  ctx.fillStyle = bridge;
  ctx.fillRect(236, 215, 40, 102);

  // Special Face Markings (Sage Mode, Hollow Mask Stripes, Tear Marks)
  if (p.sageMarks) {
    ctx.fillStyle = 'rgba(234, 88, 12, 0.85)';
    for (const ex of [164, 348]) {
      ctx.beginPath();
      ctx.ellipse(ex, 238, 56, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.id === 'naruto_baryon') {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(104, 228); ctx.lineTo(54, 182); ctx.lineTo(88, 250); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(408, 228); ctx.lineTo(458, 182); ctx.lineTo(424, 250); ctx.closePath(); ctx.fill();
    }
  }

  if (p.hollowCheekMarks) {
    // Ichigo True Bankai (Horn of Salvation) bold crimson Hollow stripes on left side of face!
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    for (const dx of [-34, 0, 32]) {
      ctx.beginPath();
      ctx.moveTo(336 + dx, 118);
      ctx.quadraticCurveTo(354 + dx, 276, 326 + dx, 412);
      ctx.stroke();
    }
  }

  if (p.tearMarks) {
    ctx.fillStyle = '#15803d';
    ctx.fillRect(154, 266, 16, 150);
    ctx.fillRect(342, 266, 16, 150);
  }

  // 2. High-Detail Multi-Ring Irises, Double Eyelids, Lashes & Determined Brows
  const drawDetailedEye = (cx: number, cy: number, isLeftEye: boolean) => {
    if (p.leftEyeVerticalScar && isLeftEye && p.id === 'zoro_king_of_hell') {
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx + 5, cy - 62);
      ctx.lineTo(cx - 8, cy + 68);
      ctx.stroke();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(cx - 46, cy + 4);
      ctx.quadraticCurveTo(cx, cy + 12, cx + 46, cy);
      ctx.stroke();
      return;
    }

    const dir = isLeftEye ? 1 : -1;
    const eyeW = p.eyeStyle === 'dbz_fierce' ? 48 : 46;
    const eyeH = p.eyeStyle === 'dbz_fierce' ? 27 : 33;

    // Subtle double-eyelid crease line above upper lash
    ctx.strokeStyle = shadeColorHex(p.skin, 0.66);
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(cx - eyeW * 0.82, cy - eyeH - 5);
    ctx.quadraticCurveTo(cx, cy - eyeH - 16, cx + eyeW * 0.82, cy - eyeH - 4);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    if (p.eyeStyle === 'dbz_fierce') {
      ctx.moveTo(cx - eyeW * dir, cy + 5);
      ctx.lineTo(cx - eyeW * 0.35 * dir, cy - eyeH);
      ctx.lineTo(cx + eyeW * dir, cy - eyeH * 0.42);
      ctx.lineTo(cx + eyeW * 0.82 * dir, cy + eyeH * 0.80);
      ctx.lineTo(cx - eyeW * 0.62 * dir, cy + eyeH * 0.84);
      ctx.closePath();
    } else {
      ctx.ellipse(cx, cy, eyeW, eyeH, 0, 0, Math.PI * 2);
    }
    ctx.clip();

    // Sclera with soft upper-lid cast shadow
    const darkSclera = p.eyeStyle === 'hollow_fierce' && isLeftEye;
    ctx.fillStyle = darkSclera ? '#18181b' : '#f8fafc';
    ctx.fillRect(cx - 60, cy - 50, 120, 100);
    if (!darkSclera) {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
      ctx.fillRect(cx - 60, cy - 44, 120, 22);
    }

    const useRinnegan = p.eyeStyle === 'rinnegan' || (p.eyeStyle === 'dual_sasuke' && isLeftEye);
    const useSharingan = p.eyeStyle === 'sharingan' || (p.eyeStyle === 'dual_sasuke' && !isLeftEye);

    if (useRinnegan) {
      ctx.fillStyle = '#c084fc';
      ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3b0764';
      ctx.lineWidth = 4;
      for (const r of [10, 20, 30]) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = '#09090b';
      ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill();
    } else if (useSharingan) {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.arc(cx, cy + 2, 28, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 3.8;
      ctx.beginPath(); ctx.arc(cx, cy + 2, 17, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath(); ctx.arc(cx, cy + 2, 7.5, 0, Math.PI * 2); ctx.fill();
      for (let t = 0; t < 3; t++) {
        const a = (t / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 17, cy + 2 + Math.sin(a) * 17, 4.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const eyeCol = p.eyeStyle === 'hollow_fierce' && isLeftEye ? '#facc15' : p.eyes;
      const irisR = p.eyeStyle === 'dbz_fierce' ? 24 : 28;
      // Outer limbal ring + glowing lower iris gradient + radial iris fibers
      ctx.fillStyle = shadeColorHex(eyeCol, 0.36);
      ctx.beginPath(); ctx.arc(cx, cy + 2, irisR, 0, Math.PI * 2); ctx.fill();

      const ig = ctx.createRadialGradient(cx, cy + 10, 3, cx, cy + 1, irisR * 0.88);
      ig.addColorStop(0, shadeColorHex(eyeCol, 1.45));
      ig.addColorStop(0.55, eyeCol);
      ig.addColorStop(1, shadeColorHex(eyeCol, 0.52));
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.arc(cx, cy + 2, irisR * 0.88, 0, Math.PI * 2); ctx.fill();

      // Radial iris fiber striations
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      for (let f = 0; f < 14; f++) {
        const fa = (f / 14) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(fa) * 8, cy + 2 + Math.sin(fa) * 8);
        ctx.lineTo(cx + Math.cos(fa) * (irisR * 0.82), cy + 2 + Math.sin(fa) * (irisR * 0.82));
        ctx.stroke();
      }

      if (p.eyeStyle === 'naruto_sage') {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(cx - 4.2, cy - 18, 8.4, 40);
        ctx.fillRect(cx - 18, cy - 3, 36, 7);
      } else if (p.eyeStyle === 'luffy_nika') {
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.arc(cx, cy + 2, 15, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#09090b';
        ctx.beginPath(); ctx.arc(cx, cy + 2, 6.8, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#090d16';
        ctx.beginPath(); ctx.ellipse(cx, cy + 2, 9.5, 11.5, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Crisp Dual Specular Catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx - 10, cy - 9, 7.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 10, cy + 10, 3.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Sculpted Upper Eyelash Wing & Lower Lid Rim
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 9.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - eyeW - 4, cy + 4);
    ctx.quadraticCurveTo(cx, cy - eyeH - 10, cx + eyeW + 4, cy + 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.62)';
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(cx - eyeW * 0.68, cy + eyeH - 2);
    ctx.quadraticCurveTo(cx, cy + eyeH + 4, cx + eyeW * 0.68, cy + eyeH - 2);
    ctx.stroke();

    // Bold Expressive Eyebrow
    const browCol = p.hair === '#f8fafc' || p.hair === '#e2e8f0' ? '#475569' : shadeColorHex(p.hair, 0.68);
    ctx.strokeStyle = browCol;
    ctx.lineWidth = p.eyeStyle === 'dbz_fierce' ? 11.5 : 8.8;
    ctx.beginPath();
    if (p.eyeStyle === 'dbz_fierce' || p.eyeStyle === 'naruto_sage' || p.eyeStyle === 'hollow_fierce') {
      ctx.moveTo(cx + dir * 50, cy - eyeH - 28);
      ctx.quadraticCurveTo(cx, cy - eyeH - 20, cx - dir * 42, cy - eyeH - 6);
    } else {
      ctx.moveTo(cx - 45, cy - eyeH - 16);
      ctx.quadraticCurveTo(cx, cy - eyeH - 28, cx + 45, cy - eyeH - 16);
    }
    ctx.stroke();
  };

  drawDetailedEye(164, 240, false);
  drawDetailedEye(348, 240, true);

  // Scars & Whiskers
  if (p.leftEyeVerticalScar && p.id !== 'zoro_king_of_hell') {
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.moveTo(352, 168); ctx.lineTo(344, 312); ctx.stroke();
  }
  if (p.tripleEyeScar) {
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 5.5;
    for (const off of [-14, 0, 14]) {
      ctx.beginPath(); ctx.moveTo(328 + off, 168); ctx.lineTo(364 + off, 306); ctx.stroke();
    }
  }
  if (p.underEyeScar) {
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 6.2;
    ctx.beginPath(); ctx.arc(348, 272, 32, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(336, 294); ctx.lineTo(332, 310);
    ctx.moveTo(360, 294); ctx.lineTo(364, 310);
    ctx.stroke();
  }
  if (p.whiskers) {
    ctx.strokeStyle = '#3b2110';
    ctx.lineWidth = 6.8;
    ctx.lineCap = 'round';
    for (let w = 0; w < 3; w++) {
      const wy = 294 + w * 24;
      ctx.beginPath(); ctx.moveTo(88, wy - 5); ctx.quadraticCurveTo(134, wy, 178, wy + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(424, wy - 5); ctx.quadraticCurveTo(378, wy, 334, wy + 4); ctx.stroke();
    }
  }

  // 3. Nose Nostril Accent & Realistic Lip/Mouth Shading
  if (p.faceMask) {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(36, 274);
    ctx.quadraticCurveTo(256, 250, 476, 274);
    ctx.lineTo(486, 504);
    ctx.lineTo(26, 504);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(58, 278);
    ctx.quadraticCurveTo(256, 256, 454, 278);
    ctx.stroke();
  } else {
    // Crisp nose tip shadow + nostrils
    ctx.fillStyle = shadeColorHex(p.skin, 0.68);
    ctx.beginPath(); ctx.ellipse(246, 314, 5.5, 3.2, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(266, 314, 5.5, 3.2, -0.25, 0, Math.PI * 2); ctx.fill();

    // Subtle lower lip shadow for realistic facial volume
    ctx.fillStyle = shadeColorHex(p.skin, 0.78);
    ctx.beginPath(); ctx.ellipse(256, 384, 24, 6, 0, 0, Math.PI * 2); ctx.fill();

    if (p.eyeStyle === 'luffy_nika' || p.whiskers) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(202, 354);
      ctx.quadraticCurveTo(256, 392, 310, 354);
      ctx.quadraticCurveTo(256, 362, 202, 354);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 5.5;
      ctx.stroke();
    } else if (p.eyeStyle === 'dbz_fierce' || p.eyeStyle === 'hollow_fierce') {
      ctx.strokeStyle = shadeColorHex(p.skin, 0.46);
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(216, 366);
      ctx.quadraticCurveTo(256, 358, 298, 367);
      ctx.stroke();
    } else {
      ctx.strokeStyle = shadeColorHex(p.skin, 0.48);
      ctx.lineWidth = 6.0;
      ctx.beginPath();
      ctx.moveTo(220, 362);
      ctx.quadraticCurveTo(256, 375, 292, 362);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface SculptedCharacterRig {
  textures: THREE.Texture[];
  materials: THREE.MeshStandardMaterial[];
  headDecorGroup: THREE.Group;
  hairGroup: THREE.Group;
  torsoDetailGroup: THREE.Group;
  armLDetailGroup: THREE.Group;
  armRDetailGroup: THREE.Group;
  legLDetailGroup: THREE.Group;
  legRDetailGroup: THREE.Group;
  skinMat: THREE.MeshStandardMaterial;
  faceMat: THREE.MeshStandardMaterial;
  shirtMat: THREE.MeshStandardMaterial;
  secondaryMat: THREE.MeshStandardMaterial;
  pantsMat: THREE.MeshStandardMaterial;
  bootsMat: THREE.MeshStandardMaterial;
  capeMat: THREE.MeshStandardMaterial;
  showCape: boolean;
  hideBaseLegs: boolean;
}

export function buildSculptedCharacterProfileRig(
  accentHex: string,
  spec?: CharacterVisualSpec | null
): SculptedCharacterRig {
  const p = resolveCharProfile(accentHex, spec);
  const textures: THREE.Texture[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];

  const fabricColMap = getFabricWeaveMap();
  const fabricBump = getFabricBumpMap();
  const skinSssMap = getSkinToneShadingMap();
  const steelMap = getForgedSteelMap();
  const steelBump = getForgedSteelBumpMap();
  const leatherBump = getLeatherWrapBumpMap();

  const regMat = (m: THREE.MeshStandardMaterial, rim = 0.22, rimHex = 0xdbeafe) => {
    enhanceRealisticMaterial(m, rim, rimHex);
    materials.push(m);
    return m;
  };

  const mkClothMat = (hex: string | number, vertexColors = true, doubleSide = false) => {
    const col = new THREE.Color(hex);
    const em = col.clone().multiplyScalar(0.11);
    const m = new THREE.MeshStandardMaterial({
      color: col,
      map: fabricColMap,
      bumpMap: fabricBump,
      bumpScale: 0.018,
      roughness: 0.78,
      metalness: 0.04,
      emissive: em,
      vertexColors,
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide
    });
    m.userData.baseEmissive = em.getHex();
    return regMat(m, 0.20, 0xe0f2fe);
  };

  const mkMetalMat = (hex: string | number, roughness = 0.26, metalness = 0.82) => {
    const col = new THREE.Color(hex);
    const em = col.clone().multiplyScalar(0.10);
    const m = new THREE.MeshStandardMaterial({
      color: col,
      map: steelMap,
      bumpMap: steelBump,
      bumpScale: 0.014,
      roughness,
      metalness,
      emissive: em
    });
    m.userData.baseEmissive = em.getHex();
    return regMat(m, 0.28, 0xf8fafc);
  };

  const mkLeatherMat = (hex: string | number, vertexColors = false) => {
    const col = new THREE.Color(hex);
    const em = col.clone().multiplyScalar(0.09);
    const m = new THREE.MeshStandardMaterial({
      color: col,
      bumpMap: leatherBump,
      bumpScale: 0.020,
      roughness: 0.56,
      metalness: 0.12,
      emissive: em,
      vertexColors
    });
    m.userData.baseEmissive = em.getHex();
    return regMat(m, 0.18, 0xe2e8f0);
  };

  const mkHairBladeMat = (hex: string | number, vertexColors = true) => {
    const col = new THREE.Color(hex);
    const em = col.clone().multiplyScalar(0.14);
    const m = new THREE.MeshStandardMaterial({
      color: col,
      bumpMap: steelBump,
      bumpScale: 0.008,
      roughness: 0.38,
      metalness: 0.16,
      emissive: em,
      vertexColors
    });
    m.userData.baseEmissive = em.getHex();
    return regMat(m, 0.30, 0xfef9c3);
  };

  const skinCol = new THREE.Color(p.skin);
  const skinEm = skinCol.clone().multiplyScalar(0.13);
  const skinMat = regMat(
    new THREE.MeshStandardMaterial({
      color: skinCol,
      map: skinSssMap,
      roughness: 0.62,
      metalness: 0.02,
      emissive: skinEm
    }),
    0.18,
    0xffedd5
  );
  skinMat.userData.baseEmissive = skinEm.getHex();

  // Vertex-colored skin variant for lofted bare muscular torso/arms
  const skinLoftMat = regMat(
    new THREE.MeshStandardMaterial({
      color: skinCol,
      map: skinSssMap,
      roughness: 0.62,
      metalness: 0.02,
      emissive: skinEm,
      vertexColors: true
    }),
    0.20,
    0xffedd5
  );
  skinLoftMat.userData.baseEmissive = skinEm.getHex();

  const faceTex = createAnimeFaceTexture(p);
  textures.push(faceTex);
  const faceLift = skinCol.clone().multiplyScalar(0.14);
  const faceMat = regMat(
    new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.58,
      metalness: 0.02,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: faceTex,
      emissiveIntensity: 0.16
    }),
    0.14,
    0xffedd5
  );
  faceMat.userData.baseEmissive = faceLift.getHex();

  const hairMat = mkHairBladeMat(p.hair, true);
  const hairCapMat = mkHairBladeMat(shadeColorHex(p.hair, 0.88), false);
  const hairHiMat = mkHairBladeMat(shadeColorHex(p.hair, 1.16), true);

  const isPlate = p.outfitStyle === 'knight_plate' || p.outfitStyle === 'saiyan_armor';
  const shirtMat = isPlate ? mkMetalMat(p.shirt, 0.28, 0.78) : mkClothMat(p.shirt, true);
  const shirtPlainMat = isPlate ? mkMetalMat(p.shirt, 0.28, 0.78) : mkClothMat(p.shirt, false);
  const secondaryMat = isPlate ? mkMetalMat(p.secondary, 0.30, 0.72) : mkClothMat(p.secondary, false);
  const pantsMat = mkClothMat(p.pants, true);
  const bootsMat = mkLeatherMat(p.boots, true);
  const bootsPlainMat = mkLeatherMat(p.boots, false);
  const goldMat = mkMetalMat(0xfacc15, 0.22, 0.86);
  const steelMat = mkMetalMat(0xe2e8f0, 0.20, 0.88);
  const whiteClothMat = mkClothMat(0xf8fafc, false, true);
  const crimsonClothMat = mkClothMat(0xb91c1c, false, true);

  const capeHex =
    p.outfitStyle === 'hokage_coat' || p.outfitStyle === 'captain_haori' || p.outfitStyle === 'admiral_cape'
      ? '#f8fafc'
      : p.outfitStyle === 'akatsuki_cloak' || p.outfitStyle === 'demon_lord_coat'
        ? '#111827'
        : '#1e1b4b';
  const capeMat = mkClothMat(capeHex, false, true);

  const addM = (
    parent: THREE.Group,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1
  ) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
    if (sx !== 1 || sy !== 1 || sz !== 1) mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  };

  // ==========================================================================
  // 1. SCULPTED HEAD EARS, NECK & ICONIC ANATOMICAL TRAITS (headMesh is at y=0.14)
  // ==========================================================================
  const headDecorGroup = new THREE.Group();
  // Muscular sternocleidomastoid neck connecting skull seamlessly into torso collarbone
  addM(headDecorGroup, cyl(0.048, 0.058, 0.11, 18), skinMat, 0, 0.015, 0.008);

  if (p.catEars) {
    addM(headDecorGroup, cone(0.034, 0.16, 12), skinMat, -0.078, 0.29, 0.01, 0, 0, 0.26, 0.72, 1, 0.55);
    addM(headDecorGroup, cone(0.034, 0.16, 12), skinMat, 0.078, 0.29, 0.01, 0, 0, -0.26, 0.72, 1, 0.55);
    addM(headDecorGroup, tor(0.016, 0.004, 8, 16), goldMat, -0.095, 0.27, 0.0, 0, Math.PI / 2, 0);
  } else if (p.namekAntennae) {
    addM(headDecorGroup, cone(0.024, 0.09, 10), skinMat, -0.108, 0.145, 0.01, 0, 0, 1.15);
    addM(headDecorGroup, cone(0.024, 0.09, 10), skinMat, 0.108, 0.145, 0.01, 0, 0, -1.15);
    addM(headDecorGroup, cyl(0.004, 0.007, 0.085, 8), skinMat, -0.03, 0.235, -0.095, 0.75, 0, 0.25);
    addM(headDecorGroup, cyl(0.004, 0.007, 0.085, 8), skinMat, 0.03, 0.235, -0.095, 0.75, 0, -0.25);
  } else {
    // Refined sculpted human/anime ears with helix tilt
    addM(headDecorGroup, sph(0.022, 12, 10), skinMat, -0.098, 0.138, 0.008, 0, -0.18, 0.12, 0.45, 1.18, 0.78);
    addM(headDecorGroup, sph(0.022, 12, 10), skinMat, 0.098, 0.138, 0.008, 0, 0.18, -0.12, 0.45, 1.18, 0.78);
    if (p.id === 'zoro_king_of_hell') {
      for (let e = 0; e < 3; e++) {
        addM(headDecorGroup, cone(0.006, 0.020, 8), goldMat, -0.105, 0.112 - e * 0.010, 0.006 - e * 0.008, Math.PI, 0, 0);
      }
    }
  }

  if (p.friezaDome) {
    addM(headDecorGroup, sph(0.082, 20, 14), mkMetalMat('#9333ea', 0.12, 0.65), 0, 0.215, -0.005, 0, 0, 0, 0.96, 0.65, 1.04);
  }
  if (p.beardWhite) {
    addM(headDecorGroup, buildCurvedHairBladeGeo(0.28, 0.095, 0.045, 0.03, 0.01), whiteClothMat, 0, 0.04, -0.085, Math.PI - 0.12, 0, 0);
  }
  if (p.mustacheCrescent) {
    addM(headDecorGroup, tor(0.105, 0.015, 10, 22, Math.PI * 0.92), whiteClothMat, 0, 0.15, -0.115, 0, 0, Math.PI * 1.04);
    addM(headDecorGroup, getCranialHairCapGeo(), mkClothMat('#09090b', false), 0, 0.15, 0.012);
  }
  if (p.lawHat) {
    addM(headDecorGroup, cyl(0.118, 0.128, 0.095, 22), whiteClothMat, 0, 0.235, 0);
    addM(headDecorGroup, sph(0.118, 20, 14), whiteClothMat, 0, 0.275, 0, 0, 0, 0, 1, 0.62, 1);
    addM(headDecorGroup, cyl(0.132, 0.132, 0.026, 22), mkClothMat('#18181b', false), 0, 0.195, -0.012);
  }

  // ==========================================================================
  // 2. LAYERED CURVED 4-RIDGE 3D BLADE-LOCK ANIME HAIRSTYLES (ZERO TOY CONES!)
  // ==========================================================================
  const hairGroup = new THREE.Group();
  if (p.hairStyle !== 'bald_dome') {
    // Open-faced cranial hair base (wraps back, crown & sides behind ears; 0% front face coverage!)
    addM(hairGroup, getCranialHairCapGeo(), hairCapMat, 0, 0.150, 0.012);

    const addLock = (
      x: number,
      y: number,
      z: number,
      rx: number,
      ry: number,
      rz: number,
      len: number,
      w: number,
      th: number,
      bendZ: number,
      hi = false
    ) => {
      addM(hairGroup, buildCurvedHairBladeGeo(len, w, th, bendZ), hi ? hairHiMat : hairMat, x, y, z, rx, ry, rz);
    };

    if (p.hairStyle === 'saiyan_goku') {
      // Iconic Asymmetric Son Goku Curved Blade-Lock Silhouette!
      // 4 Sweeping Left Locks (-X) curving gracefully outward & downward
      addLock(-0.06, 0.23, 0.00, 0.05, 0.08, 0.68, 0.22, 0.088, 0.052, 0.035, true);
      addLock(-0.08, 0.19, 0.01, 0.08, 0.12, 1.08, 0.25, 0.094, 0.056, 0.042, false);
      addLock(-0.08, 0.14, 0.02, 0.10, 0.15, 1.44, 0.21, 0.080, 0.048, 0.036, true);
      addLock(-0.07, 0.10, 0.03, 0.14, 0.18, 1.76, 0.16, 0.064, 0.040, 0.028, false);
      // 3 Bold Sweeping Right Locks (+X)
      addLock(0.06, 0.22, 0.00, 0.05, -0.08, -0.74, 0.21, 0.086, 0.052, 0.034, false);
      addLock(0.08, 0.17, 0.01, 0.08, -0.12, -1.18, 0.23, 0.090, 0.054, 0.040, true);
      addLock(0.07, 0.12, 0.03, 0.12, -0.16, -1.58, 0.17, 0.070, 0.044, 0.030, false);
      // Crown & Rear Layered Volume Locks
      addLock(-0.02, 0.25, -0.01, -0.18, 0.0, 0.16, 0.20, 0.086, 0.054, 0.032, true);
      addLock(0.03, 0.24, 0.03, 0.38, 0.0, -0.14, 0.19, 0.082, 0.050, 0.035, false);
      addLock(0.00, 0.19, 0.08, 0.88, 0.0, 0.0, 0.18, 0.084, 0.048, 0.030, true);
      addLock(-0.05, 0.15, 0.08, 1.05, -0.25, 0.35, 0.15, 0.068, 0.040, 0.025, false);
      addLock(0.05, 0.15, 0.08, 1.05, 0.25, -0.35, 0.15, 0.068, 0.040, 0.025, false);
      // Delicate Forehead Bang Strands framing ABOVE eyebrows (eyes at y=0.136 stay 100% clear!)
      addLock(-0.042, 0.235, -0.082, Math.PI - 0.35, 0, 0.22, 0.078, 0.034, 0.020, -0.012, true);
      addLock(0.012, 0.238, -0.085, Math.PI - 0.32, 0, -0.12, 0.082, 0.036, 0.020, -0.012, false);
      addLock(0.056, 0.232, -0.076, Math.PI - 0.36, 0, -0.32, 0.072, 0.030, 0.018, -0.010, true);
    } else if (p.hairStyle === 'saiyan_flame') {
      // Ichigo True Bankai / Vegeta / Gohan Beast / Gogeta: Layered Sweeping Flame-Locks!
      const isIchigo = p.id === 'ichigo_bankai' || p.id === 'kenpachi_zaraki';
      const lenMult = p.id === 'gohan_beast' ? 1.32 : isIchigo ? 0.82 : 1.02;
      const ringCount = 14;
      for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2;
        const r = 0.062;
        const sx = Math.sin(a) * r;
        const sz = Math.cos(a) * r + 0.012;
        const outTilt = isIchigo ? 0.56 : 0.42;
        addLock(
          sx,
          0.22 + (i % 3) * 0.015,
          sz,
          Math.cos(a) * outTilt - 0.08,
          a * 0.15,
          -Math.sin(a) * outTilt,
          0.19 * lenMult,
          0.074,
          0.046,
          0.028,
          i % 2 === 0
        );
      }
      addLock(0, 0.25, 0.0, -0.12, 0, 0.06, 0.21 * lenMult, 0.082, 0.052, 0.025, true);
      addLock(-0.03, 0.24, -0.02, -0.22, 0, 0.24, 0.18 * lenMult, 0.072, 0.044, 0.022, false);
      addLock(0.03, 0.24, -0.02, -0.22, 0, -0.24, 0.18 * lenMult, 0.072, 0.044, 0.022, true);
      if (p.id !== 'vegeta_ultra_ego') {
        // Temple-framing side locks & upper forehead wisps (keeping eyes 100% clear!)
        addLock(-0.082, 0.195, -0.058, Math.PI - 0.18, 0, -0.08, 0.105, 0.038, 0.022, -0.010, true);
        addLock(0.082, 0.195, -0.058, Math.PI - 0.18, 0, 0.08, 0.105, 0.038, 0.022, -0.010, true);
        addLock(-0.032, 0.238, -0.084, Math.PI - 0.34, 0, 0.18, 0.078, 0.034, 0.018, -0.010, true);
        addLock(0.026, 0.238, -0.084, Math.PI - 0.34, 0, -0.16, 0.074, 0.032, 0.018, -0.010, false);
      }
    } else if (p.hairStyle === 'naruto_spiky') {
      // Naruto / Minato: Layered Wind-Swept Golden Blade Crown + Sideburn Locks!
      const crownLocks: Array<[number, number, number, number, number, number]> = [
        [0, 0.24, -0.03, -0.36, 0, 0.15],
        [-0.05, 0.235, -0.025, -0.32, 0.42, 0.15],
        [0.05, 0.235, -0.025, -0.32, -0.42, 0.15],
        [-0.085, 0.21, -0.005, -0.18, 0.82, 0.145],
        [0.085, 0.21, -0.005, -0.18, -0.82, 0.145],
        [0, 0.25, 0.02, 0.16, 0, 0.16],
        [-0.065, 0.235, 0.03, 0.22, 0.56, 0.155],
        [0.065, 0.235, 0.03, 0.22, -0.56, 0.155],
        [-0.095, 0.18, 0.035, 0.20, 1.12, 0.135],
        [0.095, 0.18, 0.035, 0.20, -1.12, 0.135],
        [0, 0.21, 0.085, 0.78, 0, 0.15],
        [-0.06, 0.19, 0.08, 0.74, 0.46, 0.14],
        [0.06, 0.19, 0.08, 0.74, -0.46, 0.14],
        [0, 0.14, 0.10, 1.22, 0, 0.12]
      ];
      crownLocks.forEach(([sx, sy, sz, rx, rz, len], idx) => {
        addLock(sx, sy, sz, rx, 0, rz, len, 0.066, 0.042, 0.022, idx % 2 === 0);
      });
      const sideLen = p.id === 'minato_namikaze' ? 0.22 : 0.105;
      addLock(-0.088, 0.185, -0.058, Math.PI - 0.14, 0, -0.06, sideLen, 0.038, 0.024, -0.012, true);
      addLock(0.088, 0.185, -0.058, Math.PI - 0.14, 0, 0.06, sideLen, 0.038, 0.024, -0.012, true);
    } else if (p.hairStyle === 'uchiha_swept') {
      // Sasuke / Madara / Itachi / Byakuya: Cheek-Framing Parted Locks + Swept Ducktail Blades!
      addLock(-0.082, 0.21, -0.062, Math.PI - 0.16, 0.12, -0.10, 0.165, 0.052, 0.028, -0.016, false);
      addLock(0.082, 0.21, -0.062, Math.PI - 0.16, -0.12, 0.10, 0.165, 0.052, 0.028, -0.016, false);
      addLock(-0.036, 0.238, -0.084, Math.PI - 0.32, 0, 0.24, 0.076, 0.034, 0.018, -0.010, true);
      addLock(0.036, 0.238, -0.084, Math.PI - 0.32, 0, -0.24, 0.076, 0.034, 0.018, -0.010, true);
      for (const [sx, sy, rx, rz] of [
        [0, 0.22, 0.74, 0],
        [-0.065, 0.21, 0.68, 0.54],
        [0.065, 0.21, 0.68, -0.54],
        [-0.085, 0.16, 0.86, 0.88],
        [0.085, 0.16, 0.86, -0.88],
        [0, 0.15, 1.12, 0]
      ]) {
        addLock(sx, sy, 0.082, rx, 0, rz, 0.18, 0.072, 0.044, 0.028, true);
      }
      if (p.id === 'madara_six_paths') {
        addLock(0, 0.16, 0.095, Math.PI + 0.18, 0, 0, 0.42, 0.18, 0.075, 0.04, false);
      }
    } else if (p.hairStyle === 'kakashi_tilted') {
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        addLock(
          -0.075 + t * 0.12,
          0.235 - Math.abs(t - 0.35) * 0.04,
          -0.015 + (i % 3) * 0.035,
          -0.14 + (i % 2) * 0.30,
          0,
          0.62 - t * 0.28,
          0.18,
          0.068,
          0.042,
          0.026,
          i % 2 === 0
        );
      }
      addLock(-0.042, 0.235, -0.082, Math.PI - 0.32, 0, 0.32, 0.082, 0.038, 0.020, -0.010, true);
    } else if (p.hairStyle === 'rimuru_long') {
      for (const bx of [-0.052, -0.018, 0.018, 0.052]) {
        addLock(bx, 0.238, -0.084, Math.PI - 0.32, 0, bx * 1.4, 0.078, 0.036, 0.018, -0.010, true);
      }
      addLock(-0.088, 0.20, -0.052, Math.PI - 0.10, 0, -0.06, 0.24, 0.048, 0.032, -0.015, true);
      addLock(0.088, 0.20, -0.052, Math.PI - 0.10, 0, 0.06, 0.24, 0.048, 0.032, -0.015, true);
      for (const lx of [-0.075, -0.025, 0.025, 0.075]) {
        addLock(lx, 0.18, 0.088, Math.PI + 0.18, 0, lx * -0.4, 0.36, 0.078, 0.042, 0.035, false);
      }
    } else if (p.hairStyle === 'twintails') {
      for (const bx of [-0.048, -0.016, 0.016, 0.048]) {
        addLock(bx, 0.238, -0.084, Math.PI - 0.32, 0, bx * 1.2, 0.074, 0.034, 0.018, -0.010, true);
      }
      for (const side of [-1, 1]) {
        addM(hairGroup, sph(0.028, 12, 10), secondaryMat, side * 0.105, 0.21, 0.02);
        addLock(side * 0.115, 0.21, 0.025, Math.PI + 0.14, 0, side * -0.26, 0.38, 0.076, 0.052, 0.045, true);
      }
    } else if (p.hairStyle === 'luffy_tousled') {
      if (p.id === 'luffy_gear5') {
        // Sun God Nika Swirling Incandescent Flame-Cloud Locks!
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          addLock(
            Math.sin(a) * 0.062,
            0.225 + (i % 2) * 0.018,
            Math.cos(a) * 0.062 + 0.01,
            Math.cos(a) * 0.48 - 0.08,
            0.25,
            -Math.sin(a) * 0.48,
            0.155,
            0.076,
            0.054,
            0.038,
            true
          );
        }
        addLock(0, 0.245, -0.02, -0.25, 0, 0.18, 0.16, 0.080, 0.056, 0.040, true);
      } else {
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2;
          addLock(
            Math.sin(a) * 0.066,
            0.215,
            Math.cos(a) * 0.066 + 0.01,
            Math.cos(a) * 0.62,
            0,
            -Math.sin(a) * 0.62,
            0.125,
            0.058,
            0.036,
            0.024,
            i % 2 === 0
          );
        }
        addLock(-0.032, 0.236, -0.082, Math.PI - 0.34, 0, 0.22, 0.076, 0.036, 0.018, -0.010, true);
        addLock(0.034, 0.236, -0.082, Math.PI - 0.34, 0, -0.18, 0.072, 0.034, 0.018, -0.010, false);
      }
    } else {
      // Cropped Hero (Zoro, Gaara, Default RPG Heroes): Layered Sculpted Short Blade Spikes!
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        addLock(
          Math.sin(a) * 0.058,
          0.225,
          Math.cos(a) * 0.058 + 0.01,
          Math.cos(a) * 0.42,
          0,
          -Math.sin(a) * 0.42,
          0.105,
          0.054,
          0.034,
          0.018,
          i % 2 === 0
        );
      }
      addLock(0, 0.24, 0.0, -0.14, 0, 0, 0.11, 0.058, 0.038, 0.016, true);
      for (const bx of [-0.042, 0, 0.042]) {
        addLock(bx, 0.236, -0.082, Math.PI - 0.36, 0, bx * 1.2, 0.066, 0.032, 0.016, -0.008, true);
      }
    }
  }

  // ==========================================================================
  // 3. TORSO GARMENTS, COLLARS, SPLIT LONGCOATS, KIMONO LAPELS & ICONIC PROPS
  // ==========================================================================
  const torsoDetailGroup = new THREE.Group();

  // Exposed Skin Clavicle / Neckline V
  addM(torsoDetailGroup, cyl(0.068, 0.084, 0.08, 18), skinMat, 0, 0.41, -0.015, 0, 0, 0, 1.0, 1.0, 0.84);

  if (p.outfitStyle === 'dbz_gi') {
    // Son Goku / Gohan / Piccolo Authentic Martial Arts Dōgi:
    // Muscular exposed upper chest + inner V undershirt + crossed thick kimono lapels + knotted Obi sash!
    addM(torsoDetailGroup, cone(0.115, 0.22, 14), secondaryMat, 0, 0.31, -0.058, Math.PI, 0, 0, 0.92, 1.0, 0.68);
    addM(torsoDetailGroup, cone(0.072, 0.14, 12), skinMat, 0, 0.36, -0.068, Math.PI, 0, 0, 0.88, 1.0, 0.62);
    // Raised crossed left/right gi kimono lapels
    addM(torsoDetailGroup, cap(0.022, 0.26, 6, 10), shirtPlainMat, -0.052, 0.25, -0.118, 0.08, 0, -0.38, 1.15, 1, 0.48);
    addM(torsoDetailGroup, cap(0.022, 0.26, 6, 10), shirtPlainMat, 0.052, 0.25, -0.114, 0.08, 0, 0.38, 1.15, 1, 0.48);
    // Thick pleated martial-arts Obi waist sash + knot + twin flowing sash tails!
    addM(torsoDetailGroup, cyl(0.150, 0.154, 0.092, 24), secondaryMat, 0, 0.00, 0, 0, 0, 0, 1.02, 1, 0.74);
    addM(torsoDetailGroup, sph(0.036, 12, 10), secondaryMat, 0.035, -0.005, -0.118, 0, 0, 0, 1.1, 0.9, 0.75);
    addM(torsoDetailGroup, buildCurvedHairBladeGeo(0.22, 0.042, 0.016, 0.02), secondaryMat, 0.018, -0.02, -0.118, Math.PI - 0.08, 0, -0.14);
    addM(torsoDetailGroup, buildCurvedHairBladeGeo(0.20, 0.040, 0.016, 0.02), secondaryMat, 0.058, -0.02, -0.115, Math.PI - 0.10, 0, 0.18);
  } else if (p.outfitStyle === 'shihakusho' || p.outfitStyle === 'captain_haori' || p.outfitStyle === 'arrancar_coat') {
    // Ichigo True Bankai Longcoat / Bleach Captain Shihakusho:
    // Inner white kimono lapels + crimson/black chest guard + flared tattered split Bankai Coat Skirt!
    addM(torsoDetailGroup, cap(0.020, 0.25, 6, 10), whiteClothMat, -0.046, 0.26, -0.116, 0.08, 0, -0.34, 1, 1, 0.45);
    addM(torsoDetailGroup, cap(0.020, 0.25, 6, 10), whiteClothMat, 0.046, 0.26, -0.116, 0.08, 0, 0.34, 1, 1, 0.45);
    if (p.id === 'ichigo_bankai') {
      // Tensa Zangetsu X-Cross Black/Crimson Chest Straps!
      addM(torsoDetailGroup, cap(0.014, 0.28, 6, 8), crimsonClothMat, 0, 0.22, -0.122, 0, 0, 0.58, 1, 1, 0.35);
      addM(torsoDetailGroup, cap(0.014, 0.28, 6, 8), crimsonClothMat, 0, 0.22, -0.122, 0, 0, -0.58, 1, 1, 0.35);
    }
    addM(torsoDetailGroup, cyl(0.148, 0.152, 0.075, 24), whiteClothMat, 0, 0.00, 0, 0, 0, 0, 1.02, 1, 0.74);
    // Flared split longcoat tails draping around hips & thighs!
    const skirtOuter = p.outfitStyle === 'captain_haori' || p.outfitStyle === 'arrancar_coat' ? whiteClothMat : shirtPlainMat;
    addM(torsoDetailGroup, buildSplitCoatSkirtGeo(0.152, 0.112, 0.235, 0.185, 0.44, 0.52), skirtOuter, 0, -0.01, 0);
    if (p.id === 'ichigo_bankai') {
      addM(torsoDetailGroup, buildSplitCoatSkirtGeo(0.148, 0.108, 0.228, 0.178, 0.42, 0.55), crimsonClothMat, 0, -0.015, 0);
    }
  } else if (p.outfitStyle === 'naruto_jacket' || p.outfitStyle === 'shinobi_vest') {
    // High Popped Padded Shinobi Collar + Black Yoke + Metal Zipper + Crimson Uzumaki Crest!
    addM(torsoDetailGroup, tor(0.095, 0.026, 10, 22, Math.PI * 1.45), secondaryMat, 0, 0.41, 0.01, Math.PI / 2, 0, -Math.PI * 0.225);
    addM(torsoDetailGroup, tor(0.089, 0.016, 8, 20, Math.PI * 1.35), whiteClothMat, 0, 0.425, 0.01, Math.PI / 2, 0, -Math.PI * 0.175);
    addM(torsoDetailGroup, cyl(0.205, 0.186, 0.13, 22), secondaryMat, 0, 0.30, 0, 0, 0, 0, 1.02, 1, 0.62);
    addM(torsoDetailGroup, cyl(0.009, 0.009, 0.40, 8), steelMat, 0, 0.18, -0.126);
    addM(torsoDetailGroup, cyl(0.068, 0.068, 0.012, 20), crimsonClothMat, 0, 0.24, 0.122, Math.PI / 2, 0, 0);
    addM(torsoDetailGroup, tor(0.034, 0.008, 8, 18, Math.PI * 1.65), whiteClothMat, 0, 0.24, 0.128, 0, 0, 0.4);
    addM(torsoDetailGroup, cyl(0.148, 0.152, 0.062, 22), secondaryMat, 0, -0.01, 0, 0, 0, 0, 1.02, 1, 0.74);
    if (p.id === 'naruto_baryon') {
      // Baryon Mode Flowing Chakra Cloak Collar & Tails!
      addM(torsoDetailGroup, buildSplitCoatSkirtGeo(0.150, 0.110, 0.245, 0.195, 0.42, 0.62), crimsonClothMat, 0, 0.0, 0);
    }
  } else if (p.outfitStyle === 'akatsuki_cloak' || p.outfitStyle === 'hokage_coat' || p.outfitStyle === 'demon_lord_coat' || p.outfitStyle === 'admiral_cape') {
    // High Dramatic Stand Collar + Full Flared Split Longcoat Skirt!
    const collarM = p.outfitStyle === 'hokage_coat' || p.outfitStyle === 'admiral_cape' ? whiteClothMat : shirtPlainMat;
    addM(torsoDetailGroup, cyl(0.112, 0.098, 0.11, 22), collarM, 0, 0.43, 0.005, 0, 0, 0, 1.02, 1, 0.90);
    addM(torsoDetailGroup, tor(0.110, 0.011, 8, 22), p.outfitStyle === 'akatsuki_cloak' ? crimsonClothMat : goldMat, 0, 0.48, 0.005, Math.PI / 2, 0, 0, 1.02, 0.90, 1);
    addM(torsoDetailGroup, mkLeatherBeltMesh(goldMat), mkLeatherMat('#1f1612'), 0, -0.01, 0);
    addM(torsoDetailGroup, cyl(0.030, 0.030, 0.018, 14), goldMat, 0, -0.01, -0.116, Math.PI / 2, 0, 0);
    const coatM = p.outfitStyle === 'hokage_coat' || p.outfitStyle === 'admiral_cape' ? whiteClothMat : shirtPlainMat;
    addM(torsoDetailGroup, buildSplitCoatSkirtGeo(0.150, 0.110, 0.240, 0.190, 0.44, 0.52), coatM, 0, -0.01, 0);
    if (p.outfitStyle === 'akatsuki_cloak') {
      for (const [cx, cy, cz] of [[-0.065, 0.22, -0.125], [0.055, 0.08, -0.115], [0, 0.22, 0.125]]) {
        addM(torsoDetailGroup, sph(0.034, 12, 10), crimsonClothMat, cx, cy, cz, 0, 0, 0, 1.45, 0.85, 0.22);
      }
    }
  } else if (p.outfitStyle === 'saiyan_armor' || p.outfitStyle === 'knight_plate') {
    // Sculpted V-Keel Steel Cuirass Breastplate, Gorget Collar & Layered Tassets!
    addM(torsoDetailGroup, tor(0.105, 0.020, 8, 22), goldMat, 0, 0.39, 0, Math.PI / 2, 0, 0, 1.08, 0.82, 1);
    addM(torsoDetailGroup, cyl(0.016, 0.008, 0.30, 6), goldMat, 0, 0.22, -0.128, 0, 0, 0, 1.6, 1, 0.6);
    addM(torsoDetailGroup, cyl(0.152, 0.158, 0.068, 22), goldMat, 0, -0.01, 0, 0, 0, 0, 1.04, 1, 0.76);
    addM(torsoDetailGroup, buildSplitCoatSkirtGeo(0.154, 0.112, 0.205, 0.155, 0.26, 0.65), secondaryMat, 0, -0.02, 0);
  } else if (p.outfitStyle === 'luffy_vest' || p.outfitStyle === 'fusion_vest' || p.outfitStyle === 'zoro_coat') {
    // Sculpted Muscular Bare Pectorals & Abs in Front Center + Open Vest/Coat Lapels + Thick Woven Sash!
    addM(torsoDetailGroup, getExposedMuscularChestGeo(), skinLoftMat, 0, 0.21, -0.088);
    if (p.id === 'luffy_gear5') {
      addM(torsoDetailGroup, cap(0.011, 0.11, 6, 8), crimsonClothMat, 0, 0.23, -0.132, 0, 0, 0.72, 1, 1, 0.32);
      addM(torsoDetailGroup, cap(0.011, 0.11, 6, 8), crimsonClothMat, 0, 0.23, -0.132, 0, 0, -0.72, 1, 1, 0.32);
    } else if (p.outfitStyle === 'zoro_coat') {
      addM(torsoDetailGroup, cap(0.008, 0.19, 6, 8), crimsonClothMat, 0, 0.22, -0.130, 0, 0, -0.68, 1, 1, 0.30);
      addM(torsoDetailGroup, buildSplitCoatSkirtGeo(0.150, 0.110, 0.230, 0.180, 0.44, 0.56), shirtPlainMat, 0, -0.01, 0);
    }
    if (p.outfitStyle === 'fusion_vest') {
      addM(torsoDetailGroup, tor(0.135, 0.038, 12, 22, Math.PI * 1.35), goldMat, 0, 0.38, 0.015, Math.PI / 2, 0, -Math.PI * 0.175);
    }
    addM(torsoDetailGroup, cyl(0.152, 0.156, 0.095, 24), secondaryMat, 0, -0.01, 0, 0, 0, 0, 1.03, 1, 0.76);
  } else {
    // Explorer Tunic: Tailored Collar + Leather Belt & Forged Buckle
    addM(torsoDetailGroup, tor(0.095, 0.020, 8, 20, Math.PI * 1.4), secondaryMat, 0, 0.39, 0.01, Math.PI / 2, 0, -Math.PI * 0.2);
    addM(torsoDetailGroup, cyl(0.148, 0.152, 0.065, 22), mkLeatherMat('#291d14'), 0, -0.01, 0, 0, 0, 0, 1.02, 1, 0.74);
    addM(torsoDetailGroup, cyl(0.028, 0.028, 0.018, 12), goldMat, 0, -0.01, -0.116, Math.PI / 2, 0, 0);
  }

  if (p.furScarf) {
    addM(torsoDetailGroup, tor(0.125, 0.038, 12, 24), whiteClothMat, 0, 0.39, 0, Math.PI / 2, 0, 0, 1.08, 0.88, 1);
  }
  if (p.gear5Cloud) {
    const cloudRibbon = cachedOrganicGeo('gear5_hagoromo_cloud_v5', () => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.24, 0.05, -0.10),
        new THREE.Vector3(-0.32, 0.34, 0.06),
        new THREE.Vector3(-0.16, 0.62, 0.16),
        new THREE.Vector3(0, 0.70, 0.18),
        new THREE.Vector3(0.16, 0.62, 0.16),
        new THREE.Vector3(0.32, 0.34, 0.06),
        new THREE.Vector3(0.24, 0.05, -0.10)
      ]);
      return new THREE.TubeGeometry(curve, 34, 0.032, 12, false);
    });
    addM(torsoDetailGroup, cloudRibbon, whiteClothMat);
  }
  if (p.hipScabbards) {
    for (let k = 0; k < 3; k++) {
      const scMat = k === 0 ? whiteClothMat : k === 1 ? mkMetalMat('#6d28d9', 0.30, 0.55) : crimsonClothMat;
      addM(torsoDetailGroup, cyl(0.013, 0.011, 0.66, 12), scMat, 0.18 + k * 0.015, -0.14 - k * 0.022, 0.05, 0.92, 0, -0.14);
      addM(torsoDetailGroup, cyl(0.028, 0.028, 0.009, 12), goldMat, 0.18 + k * 0.015, 0.04 - k * 0.022, -0.17, 0.92, 0, -0.14);
    }
  }
  if (p.sandGourd) {
    const gourdMat = mkLeatherMat('#d6b485');
    addM(torsoDetailGroup, sph(0.155, 18, 14), gourdMat, 0.03, 0.10, 0.22, 0, 0, -0.18, 1, 1.15, 1);
    addM(torsoDetailGroup, sph(0.112, 16, 12), gourdMat, -0.01, 0.33, 0.21, 0, 0, -0.18, 1, 1.1, 1);
    addM(torsoDetailGroup, tor(0.078, 0.015, 8, 18), crimsonClothMat, 0.01, 0.22, 0.21, Math.PI / 2, 0, -0.18);
  }

  // ==========================================================================
  // 4. SEAMLESS ARMS, FOLDED SLEEVES, PAULDRONS & 5-FINGER SCULPTED HANDS
  // ==========================================================================
  const isBareArmed =
    p.outfitStyle === 'dbz_gi' || p.outfitStyle === 'luffy_vest' || p.outfitStyle === 'fusion_vest';
  const isWideKimonoSleeve =
    p.outfitStyle === 'shihakusho' || p.outfitStyle === 'captain_haori' || p.outfitStyle === 'akatsuki_cloak';

  const buildArmDetails = (side: -1 | 1) => {
    const g = new THREE.Group();
    if (isPlate) {
      // Layered Sculpted Knight / Saiyan Shoulder Pauldron + Vambrace Bracer!
      addM(g, sph(0.088, 18, 14), secondaryMat, side * 0.015, -0.02, 0, 0, 0, side * -0.18, 1.16, 0.92, 1.06);
      addM(g, tor(0.084, 0.010, 8, 18), goldMat, side * 0.015, -0.06, 0, Math.PI / 2, side * 0.18, 0);
      addM(g, getFoldedClothSleeveGeo(false), shirtMat);
      addM(g, cyl(0.054, 0.046, 0.16, 16), steelMat, 0, -0.41, 0);
    } else if (isBareArmed) {
      if (p.outfitStyle === 'dbz_gi') {
        // Short martial-arts shoulder sleeve cap (NOT a round ball — contoured fabric cap!)
        addM(g, cyl(0.072, 0.076, 0.11, 18), shirtPlainMat, 0, -0.03, 0, 0, 0, side * -0.12);
      }
      // Martial-arts cloth wristband / Haki bracer
      addM(g, cyl(0.048, 0.044, 0.10, 16), secondaryMat, 0, -0.44, 0);
    } else {
      // Folded cloth sleeve with wrist cuff
      addM(g, getFoldedClothSleeveGeo(isWideKimonoSleeve), shirtMat);
      addM(g, tor(0.052, 0.009, 8, 18), isWideKimonoSleeve ? whiteClothMat : secondaryMat, 0, -0.47, 0, Math.PI / 2, 0, 0);
    }

    // Articulated 5-Finger Sculpted Hand at y = -0.52..-0.60
    addM(g, sph(0.044, 14, 12), skinMat, 0, -0.535, -0.005, 0, 0, 0, 0.88, 1.12, 0.68);
    addM(g, cap(0.012, 0.036, 6, 8), skinMat, -side * 0.036, -0.53, -0.024, 0.38, 0, side * 0.48);
    for (let f = 0; f < 4; f++) {
      const fx = -0.024 + f * 0.016;
      addM(g, cap(0.010, 0.040, 6, 8), skinMat, fx, -0.578, -0.016, 0.42, 0, 0);
    }
    return g;
  };

  const armLDetailGroup = buildArmDetails(-1);
  const armRDetailGroup = buildArmDetails(1);

  // ==========================================================================
  // 5. OUTFIT-SPECIFIC 3D PLEATED GI / HAKAMA / ARMOR LEGS & CONTOURED BOOTS
  // ==========================================================================
  const useBaggyGiLegs = p.outfitStyle === 'dbz_gi' || p.outfitStyle === 'fusion_vest';
  const useWideHakamaLegs =
    p.outfitStyle === 'shihakusho' || p.outfitStyle === 'captain_haori' || p.outfitStyle === 'arrancar_coat';
  const hideBaseLegs = useBaggyGiLegs || useWideHakamaLegs;

  const buildLegDetails = (isRightLeg: boolean) => {
    const g = new THREE.Group();
    if (useBaggyGiLegs) {
      addM(g, getBaggyMartialGiLegGeo(), pantsMat);
    } else if (useWideHakamaLegs) {
      addM(g, getWideHakamaLegGeo(), pantsMat);
    } else if (isRightLeg && p.outfitStyle === 'naruto_jacket') {
      addM(g, cyl(0.088, 0.082, 0.11, 18), whiteClothMat, 0, -0.22, 0);
      addM(g, cyl(0.026, 0.024, 0.11, 10), mkLeatherMat('#18181b'), 0.086, -0.22, 0, 0, 0, 0, 0.75, 1, 1.25);
    } else if (isPlate) {
      // Sculpted steel poleyn knee-guard + greave!
      addM(g, sph(0.074, 14, 12), goldMat, 0, -0.38, -0.035, 0, 0, 0, 0.85, 1.05, 0.72);
      addM(g, cyl(0.074, 0.064, 0.24, 18), steelMat, 0, -0.52, 0);
    }

    // Grounded Contoured 3D Boot (reaches exact y = -0.88 ground plane!)
    addM(g, getSculptedBootGeo(), bootsMat);
    // Boot sole welt trim & Goku/RPG ankle piping
    addM(g, tor(0.064, 0.007, 8, 18), p.outfitStyle === 'dbz_gi' ? goldMat : bootsPlainMat, 0, -0.615, 0, Math.PI / 2, 0, 0);
    if (p.outfitStyle === 'dbz_gi') {
      // Goku's signature red/gold vertical center boot stripe!
      addM(g, cap(0.008, 0.18, 6, 8), crimsonClothMat, 0, -0.73, -0.075, 0.32, 0, 0);
    }
    return g;
  };

  const legLDetailGroup = buildLegDetails(false);
  const legRDetailGroup = buildLegDetails(true);

  const showCape =
    p.outfitStyle === 'hokage_coat' ||
    p.outfitStyle === 'admiral_cape' ||
    p.outfitStyle === 'demon_lord_coat' ||
    p.outfitStyle === 'knight_plate';

  return {
    textures,
    materials,
    headDecorGroup,
    hairGroup,
    torsoDetailGroup,
    armLDetailGroup,
    armRDetailGroup,
    legLDetailGroup,
    legRDetailGroup,
    skinMat: skinLoftMat,
    faceMat,
    shirtMat,
    secondaryMat,
    pantsMat,
    bootsMat,
    capeMat,
    showCape,
    hideBaseLegs
  };
}

function mkLeatherBeltMesh(buckleMat: THREE.Material): THREE.BufferGeometry {
  void buckleMat;
  return cachedOrganicGeo('char_belt_cyl_v5', () => {
    const g = new THREE.CylinderGeometry(0.150, 0.154, 0.066, 24);
    g.scale(1.02, 1.0, 0.74);
    return g;
  });
}

function getExposedMuscularChestGeo(): THREE.BufferGeometry {
  return cachedOrganicGeo('exposed_muscular_chest_v5', () => {
    const g = new THREE.SphereGeometry(0.095, 20, 16);
    g.scale(1.12, 1.55, 0.52);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const cols: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Central linea alba / sternum groove + pectoral & ab definition!
      const centerGroove = Math.exp(-Math.pow(x / 0.018, 2)) * 0.010;
      const abGroove = y < 0.02 ? Math.abs(Math.sin(y * 42)) * 0.004 : 0;
      if (z < 0) {
        pos.setZ(i, z + centerGroove + abGroove);
      }
      const sh = 0.96 - centerGroove * 8 - abGroove * 10;
      cols.push(sh, sh, sh);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  });
}

export const CHAR_GEOS = {
  head: getAnatomicalAnimeHeadGeo,
  torso: getAnatomicalTorsoGeo,
  bareArm: getAnatomicalBareArmGeo,
  leg: getAnatomicalLegGeo,
  slime: getSquishySlimeGeo,
  wing: getSculptedWingGeo,
  horn: getCurvedHornGeo,
  cyl,
  sph,
  cone,
  cap,
  tor
};
