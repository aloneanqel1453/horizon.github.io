// Authentic 64x64 Skin-Proportioned Horizon / Minecraft 26.3 Player Avatars (Steve, Alex, Sunny, Noor, Zuri, Ari, Makena, Kai),
// 3D Extruded Swords/Tools/Blocks in 1st & 3rd Person Hands, Shield Block Pose (#15811), Sneak Crouch & Vanilla Pixel Nametags

import * as THREE from 'three';
import { BLOCK, TILE, getBlock } from '../world/blocks';
import { buildExtrudedAtlasTileMesh, buildExtrudedItemMesh, getTileUV } from '../world/atlas';
import { ITEM, getItemDef } from '../items/catalog';
import {
  SculptedFpArmRig,
  buildSculptedFirstPersonArms,
  tryBuildSmoothWeaponOrTool3D
} from './weapons3d';
import {
  CHAR_GEOS,
  SculptedCharacterRig,
  buildSculptedCharacterProfileRig
} from './characterModels3d';
import {
  CharacterFpArmHandle,
  GlbAnimatedRig,
  buildCharacterFirstPersonArmRig,
  loadGlbTemplate,
  resolveCharacterGlbConfig
} from './glbModelRegistry';
import {
  DirectBonePoseState,
  type FingerPoseMode,
  createDefaultBonePoseState
} from './rigCalibration';

export const SKIN_SWATCHES = [
  '#38bdf8', // Steve (Cyan Tunic & Indigo Jeans)
  '#6b4bff', // Horizon (Violet Explorer Jacket)
  '#4ade80', // Alex (Forest Green Tunic & Auburn Hair)
  '#ef4444', // Noor (Crimson Duster & Dreadlocks)
  '#f59e0b', // Sunny (Green Shirt & Denim Overalls — matches multiplayer.webp!)
  '#ec4899', // Ari (Warm Coral Tunic & Braided Hair)
  '#8b5cf6', // Makena (Royal Sweater & Curls)
  '#e2e8f0'  // Kai (Ivory Tunic & Dark Cloak)
];

export interface CharacterVisualSpec {
  id: string;
  skin: string;
  hair: string;
  eyes: string;
  shirt: string;
  pants: string;
  boots: string;
  horns?: 'none' | 'single' | 'twin' | 'dragon' | 'crown' | 'strawhat' | 'headband' | 'hollowmask' | 'halo';
  hornColor?: number;
  wings?: 'none' | 'demon' | 'dragon' | 'angel' | 'fairy';
  wingColor?: number;
  slimeColor?: number;
}

interface SkinPreset {
  skin: string;
  skinDark: string;
  skinLight: string;
  hair: string;
  hairHi: string;
  eyes: string;
  shirt: string;
  overalls?: string;
  pants: string;
  boots: string;
  prostheticLeftArm?: boolean;
}

const SKIN_PRESETS: Record<string, SkinPreset> = {
  '#38bdf8': { skin: '#c68c68', skinDark: '#ad7351', skinLight: '#d69e7c', hair: '#3b2618', hairHi: '#4e3322', eyes: '#3b4dbf', shirt: '#00a8b5', pants: '#3b388c', boots: '#575757' },
  '#6b4bff': { skin: '#d49a78', skinDark: '#bc8160', skinLight: '#e2ab8b', hair: '#231c2e', hairHi: '#392e4a', eyes: '#6b4bff', shirt: '#5b3ee8', pants: '#27243d', boots: '#3d3752' },
  '#4ade80': { skin: '#ecc2a6', skinDark: '#d6a88b', skinLight: '#f6d3bc', hair: '#b85c28', hairHi: '#cf713a', eyes: '#377d3b', shirt: '#5b8c38', pants: '#69513b', boots: '#473c35' },
  '#ef4444': { skin: '#8d583b', skinDark: '#73442b', skinLight: '#a1694b', hair: '#211814', hairHi: '#362822', eyes: '#3b2418', shirt: '#a82c32', pants: '#33404f', boots: '#29221e' },
  '#f59e0b': { skin: '#b97c52', skinDark: '#9e653f', skinLight: '#cc8f66', hair: '#1d1d21', hairHi: '#2f2f36', eyes: '#232329', shirt: '#5a822a', overalls: '#2d5ca6', pants: '#2d5ca6', boots: '#d6dce5', prostheticLeftArm: true },
  '#ec4899': { skin: '#d1926b', skinDark: '#b87954', skinLight: '#e0a37e', hair: '#8c3b2b', hairHi: '#a64b38', eyes: '#4a5e2a', shirt: '#d45b6a', pants: '#33635c', boots: '#4f3529' },
  '#8b5cf6': { skin: '#6e422a', skinDark: '#57321e', skinLight: '#825238', hair: '#1c1512', hairHi: '#2e231e', eyes: '#2b1d14', shirt: '#7c4dff', pants: '#2c3347', boots: '#e5e7eb' },
  '#e2e8f0': { skin: '#e8be9e', skinDark: '#cfa282', skinLight: '#f5ceb0', hair: '#d9b14e', hairHi: '#ebd66b', eyes: '#3b6ea5', shirt: '#cbd5e1', pants: '#334155', boots: '#1e293b' }
};

function getPreset(hex: string): SkinPreset {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : '#38bdf8';
  return SKIN_PRESETS[clean] || {
    skin: '#c98e6b',
    skinDark: '#b07654',
    skinLight: '#d9a180',
    hair: '#3b2618',
    hairHi: '#4e3322',
    eyes: '#2d4785',
    shirt: clean,
    pants: '#34426e',
    boots: '#3b2f28'
  };
}

function shadeHex(hex: string, factor: number): string {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#38bdf8';
  const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(1, 3), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(3, 5), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(5, 7), 16) * factor)));
  return `rgb(${r},${g},${b})`;
}

function shadeHexToHex(hex: string, factor: number): string {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#c98e6b';
  const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(1, 3), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(3, 5), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(5, 7), 16) * factor)));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function makePixelTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    const dt = new THREE.DataTexture(new Uint8Array(w * h * 4), w, h);
    dt.needsUpdate = true;
    return dt as unknown as THREE.CanvasTexture;
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildAvatarMaterials(accentHex: string, customSpec?: CharacterVisualSpec | null) {
  const p: SkinPreset = customSpec
    ? {
        skin: customSpec.skin,
        skinDark: shadeHexToHex(customSpec.skin, 0.86),
        skinLight: shadeHexToHex(customSpec.skin, 1.08),
        hair: customSpec.hair,
        hairHi: shadeHexToHex(customSpec.hair, 1.18),
        eyes: customSpec.eyes,
        shirt: customSpec.shirt,
        pants: customSpec.pants,
        boots: customSpec.boots
      }
    : getPreset(accentHex);
  const textures: THREE.CanvasTexture[] = [];
  const materials: THREE.MeshLambertMaterial[] = [];

  const reg = (tex: THREE.CanvasTexture, doubleSide = false, alphaCutout = false) => {
    textures.push(tex);
    const m = new THREE.MeshLambertMaterial({
      map: tex,
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      alphaTest: alphaCutout ? 0.45 : 0
    });
    materials.push(m);
    return m;
  };

  const isHerobrine = customSpec?.id === 'mc_herobrine';
  const isTechnoblade = customSpec?.id === 'mc_technoblade';
  const isWardenKnight = customSpec?.id === 'mc_warden_knight';

  // 1. Authentic JAPPA 16x16 Multi-Tone Face (eyebrows, sclera + iris + pupil + catchlight, nose & jawline shading)
  const faceMat = reg(makePixelTex(16, 16, (ctx) => {
    if (isTechnoblade) {
      // Iconic Technoblade Royal Piglin/Pig Crown Face (crisp Mojang 16x16 pixel art!)
      ctx.fillStyle = '#f9a8d4';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(0, 13, 16, 3);
      ctx.fillRect(0, 0, 16, 2);
      // Golden Royal Crown Band + Jewels across forehead
      ctx.fillStyle = '#eab308';
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(1, 1, 14, 1);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(7, 1, 2, 2);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(3, 1, 2, 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(11, 1, 2, 2);
      // Eyes (classic wide-set pig eyes)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 7, 3, 2);
      ctx.fillRect(12, 7, 3, 2);
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(1, 7, 2, 2);
      ctx.fillRect(13, 7, 2, 2);
      // Iconic 3D-shaded Pig Snout + Nostrils + Tusks
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(5, 9, 6, 4);
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(6, 9, 4, 1);
      ctx.fillStyle = '#9d174d';
      ctx.fillRect(6, 10, 1, 2);
      ctx.fillRect(9, 10, 1, 2);
      return;
    }
    if (isWardenKnight) {
      ctx.fillStyle = '#09242e';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#0f3d4c';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(2, 5, 4, 2);
      ctx.fillRect(10, 5, 4, 2);
      ctx.fillStyle = '#cffafe';
      ctx.fillRect(4, 9, 8, 4);
      ctx.fillStyle = '#083344';
      ctx.fillRect(5, 10, 6, 2);
      return;
    }

    ctx.fillStyle = p.skin;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = p.skinDark;
    ctx.fillRect(0, 13, 16, 3);
    ctx.fillRect(0, 4, 1, 10);
    ctx.fillRect(15, 4, 1, 10);
    ctx.fillStyle = p.skinLight;
    ctx.fillRect(4, 5, 8, 4);
    ctx.fillRect(7, 8, 2, 2);
    // Layered hairline & bangs
    ctx.fillStyle = p.hair;
    ctx.fillRect(0, 0, 16, 4);
    ctx.fillRect(0, 4, 2, 3);
    ctx.fillRect(14, 4, 2, 3);
    ctx.fillRect(3, 4, 4, 1);
    ctx.fillRect(10, 4, 3, 1);
    ctx.fillStyle = p.hairHi;
    ctx.fillRect(2, 1, 5, 2);
    ctx.fillRect(10, 1, 4, 2);
    // Expressive eyebrows
    ctx.fillStyle = shadeHex(p.hair, 0.82);
    ctx.fillRect(2, 6, 4, 1);
    ctx.fillRect(10, 6, 4, 1);
    if (isHerobrine) {
      // Iconic Glowing Pure-White Herobrine Eyes + Steve Beard!
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 8, 4, 2);
      ctx.fillRect(10, 8, 4, 2);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(3, 8, 2, 2);
      ctx.fillRect(11, 8, 2, 2);
      ctx.fillStyle = '#4e3322';
      ctx.fillRect(4, 12, 8, 3);
      ctx.fillRect(4, 11, 2, 1);
      ctx.fillRect(10, 11, 2, 1);
    } else {
      // Crisp eyes (sclera + iris + pupil + 1px catchlight)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(2, 8, 4, 2);
      ctx.fillRect(10, 8, 4, 2);
      ctx.fillStyle = p.eyes;
      ctx.fillRect(4, 8, 2, 2);
      ctx.fillRect(10, 8, 2, 2);
      ctx.fillStyle = shadeHex(p.eyes, 0.52);
      ctx.fillRect(4, 9, 1, 1);
      ctx.fillRect(11, 9, 1, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 8, 1, 1);
      ctx.fillRect(10, 8, 1, 1);
      // Subtle cheek & nose/mouth shading
      ctx.fillStyle = p.skinDark;
      ctx.fillRect(6, 10, 4, 1);
      ctx.fillStyle = shadeHex(p.skinDark, 0.76);
      ctx.fillRect(6, 12, 4, 1);
    }
  }));

  // 1b. 3D Outer Hat / Hair Layer (64x64 Minecraft Skin second layer with alpha-cutout bangs & side locks!)
  const hatFrontMat = reg(makePixelTex(16, 16, (ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = p.hair;
    ctx.fillRect(0, 0, 16, 4);
    ctx.fillRect(0, 4, 2, 5);
    ctx.fillRect(14, 4, 2, 5);
    ctx.fillRect(3, 4, 3, 2);
    ctx.fillRect(11, 4, 2, 2);
    ctx.fillStyle = p.hairHi;
    ctx.fillRect(2, 1, 5, 2);
    ctx.fillRect(9, 1, 5, 2);
  }), true, true);

  const hatSideMat = reg(makePixelTex(16, 16, (ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = p.hair;
    ctx.fillRect(0, 0, 16, 6);
    ctx.fillRect(0, 6, 7, 5);
    ctx.fillRect(12, 6, 4, 3);
    ctx.fillStyle = p.hairHi;
    ctx.fillRect(2, 2, 6, 2);
  }), true, true);

  const hatTopBackMat = reg(makePixelTex(16, 16, (ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = p.hair;
    ctx.fillRect(0, 0, 16, 12);
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = p.hairHi;
    ctx.fillRect(3, 2, 4, 3);
    ctx.fillRect(10, 4, 4, 3);
  }), true, true);

  const hatEmptyMat = reg(makePixelTex(4, 4, (ctx) => {
    ctx.clearRect(0, 0, 4, 4);
  }), false, true);

  // 2. Hair Side (shows ear & jawline skin at bottom so head NEVER looks like a black helmet box!)
  const headSideMat = reg(makePixelTex(16, 16, (ctx) => {
    ctx.fillStyle = p.skin;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = p.skinDark;
    ctx.fillRect(6, 9, 4, 4);
    ctx.fillStyle = p.hair;
    ctx.fillRect(0, 0, 16, 7);
    ctx.fillRect(0, 7, 10, 4);
    ctx.fillStyle = p.hairHi;
    ctx.fillRect(3, 2, 5, 3);
  }));

  const hairBackMat = reg(makePixelTex(16, 16, (ctx) => {
    ctx.fillStyle = p.hair;
    ctx.fillRect(0, 0, 16, 14);
    ctx.fillStyle = p.skinDark;
    ctx.fillRect(0, 14, 16, 2);
    for (let y = 0; y < 12; y += 2) {
      for (let x = 0; x < 16; x += 2) {
        if ((x + y * 3) % 6 === 0) {
          ctx.fillStyle = p.hairHi;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }
  }));

  const headBottomMat = reg(makePixelTex(8, 8, (ctx) => {
    ctx.fillStyle = p.skinDark;
    ctx.fillRect(0, 0, 8, 8);
  }));

  // 3. Torso Front (supports Sunny's Overalls or Classic Tunic!)
  const torsoFrontMat = reg(makePixelTex(16, 24, (ctx) => {
    ctx.fillStyle = p.shirt;
    ctx.fillRect(0, 0, 16, 24);
    ctx.fillStyle = shadeHex(p.shirt, 0.86);
    ctx.fillRect(0, 0, 2, 24);
    ctx.fillRect(14, 0, 2, 24);
    ctx.fillStyle = p.skin;
    ctx.fillRect(6, 0, 4, 3);
    if (p.overalls) {
      // Denim overalls straps & bib (Sunny style from multiplayer.webp!)
      ctx.fillStyle = p.overalls;
      ctx.fillRect(2, 0, 3, 24);
      ctx.fillRect(11, 0, 3, 24);
      ctx.fillRect(2, 8, 12, 16);
      ctx.fillStyle = shadeHex(p.overalls, 0.85);
      ctx.fillRect(5, 11, 6, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(3, 7, 2, 2);
      ctx.fillRect(11, 7, 2, 2);
    } else {
      ctx.fillStyle = shadeHex(p.shirt, 1.10);
      ctx.fillRect(3, 3, 3, 15);
      ctx.fillRect(10, 3, 3, 15);
      ctx.fillStyle = '#382516';
      ctx.fillRect(0, 20, 16, 4);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(6, 20, 4, 3);
    }
  }));

  const torsoSideMat = reg(makePixelTex(16, 24, (ctx) => {
    ctx.fillStyle = shadeHex(p.shirt, 0.9);
    ctx.fillRect(0, 0, 16, 24);
    if (p.overalls) {
      ctx.fillStyle = shadeHex(p.overalls, 0.9);
      ctx.fillRect(0, 12, 16, 12);
    } else {
      ctx.fillStyle = '#382516';
      ctx.fillRect(0, 20, 16, 4);
    }
  }));

  // 4. Right & Left Arms
  const makeArmTex = (metallic: boolean) =>
    reg(makePixelTex(16, 24, (ctx) => {
      ctx.fillStyle = p.shirt;
      ctx.fillRect(0, 0, 16, 9);
      ctx.fillStyle = shadeHex(p.shirt, 0.82);
      ctx.fillRect(0, 7, 16, 2);
      if (metallic) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, 9, 16, 15);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 14, 16, 2);
        ctx.fillRect(0, 21, 16, 3);
      } else {
        ctx.fillStyle = p.skin;
        ctx.fillRect(0, 9, 16, 15);
        ctx.fillStyle = p.skinDark;
        ctx.fillRect(0, 9, 3, 15);
        ctx.fillRect(0, 21, 16, 3);
        ctx.fillStyle = p.skinLight;
        ctx.fillRect(5, 10, 6, 10);
      }
    }));

  const armRightMat = makeArmTex(false);
  const armLeftMat = makeArmTex(!!p.prostheticLeftArm);

  const armEndMat = reg(makePixelTex(8, 8, (ctx) => {
    ctx.fillStyle = p.skinDark;
    ctx.fillRect(0, 0, 8, 8);
  }));

  // 5. Trousers + Shoes
  const legMat = reg(makePixelTex(16, 24, (ctx) => {
    ctx.fillStyle = p.pants;
    ctx.fillRect(0, 0, 16, 19);
    ctx.fillStyle = shadeHex(p.pants, 0.82);
    ctx.fillRect(0, 0, 3, 19);
    ctx.fillRect(13, 0, 3, 19);
    ctx.fillStyle = shadeHex(p.pants, 1.1);
    ctx.fillRect(5, 2, 5, 14);
    ctx.fillStyle = p.boots;
    ctx.fillRect(0, 19, 16, 3);
    ctx.fillStyle = '#1f1b18';
    ctx.fillRect(0, 22, 16, 2);
  }));

  // 6. 64x64 Second-Layer 3D Jacket Collar/Belt, Rolled Sleeve Cuffs & Boot Cuffs (alpha-cutout 3D relief!)
  const jacketFrontMat = reg(makePixelTex(16, 24, (ctx) => {
    ctx.clearRect(0, 0, 16, 24);
    // 3D open collar lapels & shoulder trim
    ctx.fillStyle = shadeHex(p.shirt, 1.16);
    ctx.fillRect(2, 0, 3, 7);
    ctx.fillRect(11, 0, 3, 7);
    ctx.fillStyle = shadeHex(p.shirt, 0.78);
    ctx.fillRect(0, 0, 2, 18);
    ctx.fillRect(14, 0, 2, 18);
    // 3D raised leather belt & golden buckle
    ctx.fillStyle = '#2d1d10';
    ctx.fillRect(0, 19, 16, 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(5, 19, 6, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(6, 20, 4, 1);
    ctx.fillStyle = '#422a17';
    ctx.fillRect(7, 20, 2, 2);
  }), true, true);

  const jacketSideBackMat = reg(makePixelTex(16, 24, (ctx) => {
    ctx.clearRect(0, 0, 16, 24);
    ctx.fillStyle = shadeHex(p.shirt, 0.82);
    ctx.fillRect(0, 0, 16, 4);
    ctx.fillStyle = '#2d1d10';
    ctx.fillRect(0, 19, 16, 4);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(6, 20, 4, 2);
  }), true, true);

  const sleeveLayerMat = reg(makePixelTex(16, 24, (ctx) => {
    ctx.clearRect(0, 0, 16, 24);
    // Raised 3D rolled sleeve cuff + wrist bracer
    ctx.fillStyle = shadeHex(p.shirt, 1.14);
    ctx.fillRect(0, 6, 16, 3);
    ctx.fillStyle = '#3b2818';
    ctx.fillRect(0, 16, 16, 3);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(6, 17, 4, 1);
  }), true, true);

  const pantsLayerMat = reg(makePixelTex(16, 24, (ctx) => {
    ctx.clearRect(0, 0, 16, 24);
    // Raised 3D knee guard & boot cuff
    ctx.fillStyle = shadeHex(p.pants, 0.76);
    ctx.fillRect(2, 9, 12, 2);
    ctx.fillStyle = shadeHex(p.boots, 1.16);
    ctx.fillRect(0, 17, 16, 3);
  }), true, true);

  // 7. Royal Jura Tempest Hero Cape (12x18 pixel art with golden crest)
  const capeMat = reg(makePixelTex(12, 18, (ctx) => {
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, 12, 18);
    ctx.fillStyle = '#312e81';
    ctx.fillRect(1, 1, 10, 15);
    // Golden border & Tempest emblem
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 16, 12, 2);
    ctx.fillRect(1, 0, 10, 1);
    ctx.fillRect(4, 5, 4, 5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(5, 6, 2, 3);
  }), true, false);

  return {
    textures,
    materials,
    // BoxGeometry faces: +X (right/east), -X (left/west), +Y (top), -Y (bottom), +Z (back), -Z (front)
    headMats: [headSideMat, headSideMat, hairBackMat, headBottomMat, hairBackMat, faceMat],
    hatMats: [hatSideMat, hatSideMat, hatTopBackMat, hatEmptyMat, hatTopBackMat, hatFrontMat],
    bodyMats: [torsoSideMat, torsoSideMat, torsoSideMat, torsoSideMat, torsoSideMat, torsoFrontMat],
    jacketMats: [jacketSideBackMat, jacketSideBackMat, hatEmptyMat, hatEmptyMat, jacketSideBackMat, jacketFrontMat],
    armRightMats: [armRightMat, armRightMat, torsoSideMat, armEndMat, armRightMat, armRightMat],
    armLeftMats: [armLeftMat, armLeftMat, torsoSideMat, armEndMat, armLeftMat, armLeftMat],
    sleeveMats: [sleeveLayerMat, sleeveLayerMat, hatEmptyMat, hatEmptyMat, sleeveLayerMat, sleeveLayerMat],
    legMats: [legMat, legMat, legMat, armEndMat, legMat, legMat],
    pantsLayerMats: [pantsLayerMat, pantsLayerMat, hatEmptyMat, hatEmptyMat, pantsLayerMat, pantsLayerMat],
    capeMat
  };
}

// Authentic Horizon / Vanilla Minecraft Nametag (matches docs/media/readme/multiplayer.webp!)
function makeNametagSprite(name: string): { sprite: THREE.Sprite; tex: THREE.CanvasTexture } {
  const safeName = String(name || 'Oyuncu').slice(0, 16);

  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 44;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 44);

  ctx.font = '700 20px "Pixelify Sans", "Geist Mono", monospace';
  const textW = Math.min(240, Math.ceil(ctx.measureText(safeName).width) + 18);
  const bx = Math.floor((256 - textW) / 2);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(bx, 6, textW, 30);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#222222';
  ctx.fillText(safeName, bx + 10, 23);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(safeName, bx + 9, 21);

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.95, 0.34, 1);
  sprite.renderOrder = 14;
  return { sprite, tex };
}

function makeUvBoxMesh(
  w: number,
  h: number,
  d: number,
  tiles: [number, number, number, number?],
  atlasTex: THREE.CanvasTexture,
  opaque: boolean,
  depthTest: boolean,
  vScale = 1.0
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
  const faceSlots: Array<0 | 1 | 2 | 3> = [1, 1, 0, 2, 3, 1];
  // Distinct per-axis directional shading (+X, -X, +Y, -Y, +Z, -Z) so held 3D blocks have crisp Minecraft 3-face contrast
  const faceShades = [0.60, 0.72, 1.0, 0.48, 0.88, 0.82];
  const colors: number[] = [];

  for (let f = 0; f < 6; f++) {
    const s = faceSlots[f];
    const tile = s === 3 ? (tiles[3] ?? tiles[1]) : tiles[s];
    const [u0, v0, u1, v1] = getTileUV(tile);
    const useHalfV = vScale < 0.99 && f !== 2 && f !== 3;
    const tv1 = useHalfV ? v0 + (v1 - v0) * vScale : v1;
    const base = f * 4;
    uvAttr.setXY(base + 0, u0, tv1);
    uvAttr.setXY(base + 1, u1, tv1);
    uvAttr.setXY(base + 2, u0, v0);
    uvAttr.setXY(base + 3, u1, v0);
    const sh = faceShades[f];
    for (let v = 0; v < 4; v++) colors.push(sh, sh, sh);
  }
  uvAttr.needsUpdate = true;
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const mat = new THREE.MeshBasicMaterial({
    map: atlasTex,
    vertexColors: true,
    transparent: !opaque || !depthTest,
    alphaTest: !opaque && depthTest ? 0.35 : 0,
    depthTest
  });
  return new THREE.Mesh(geo, mat);
}

function isFlatExtrudedBlock(blockId: number): boolean {
  const b = getBlock(blockId);
  return !!(
    b.cross ||
    b.flatWire ||
    b.shape === 'pane' ||
    blockId === BLOCK.LADDER ||
    blockId === BLOCK.TORCH ||
    blockId === BLOCK.LEVER_OFF ||
    blockId === BLOCK.LEVER_ON
  );
}

export function buildMiniBlockMesh(blockId: number, atlasTex: THREE.CanvasTexture, size = 0.32, depthTest = true): THREE.Object3D {
  const def = getBlock(blockId);

  if (blockId === BLOCK.OAK_DOOR_CLOSED || blockId === BLOCK.OAK_DOOR_OPEN) {
    const g = new THREE.Group();
    const topHalf = makeUvBoxMesh(
      size * 0.72,
      size * 0.56,
      size * 0.16,
      [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_DOOR],
      atlasTex,
      false,
      depthTest
    );
    topHalf.position.y = size * 0.28;
    const botHalf = makeUvBoxMesh(
      size * 0.72,
      size * 0.56,
      size * 0.16,
      [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_DOOR_LOWER],
      atlasTex,
      true,
      depthTest
    );
    botHalf.position.y = -size * 0.28;
    const handle = makeUvBoxMesh(
      size * 0.10,
      size * 0.12,
      size * 0.24,
      [TILE.IRON_BLOCK, TILE.IRON_BLOCK, TILE.IRON_BLOCK],
      atlasTex,
      true,
      depthTest
    );
    handle.position.set(size * 0.22, -size * 0.02, 0);
    g.add(topHalf, botHalf, handle);
    return g;
  }

  if (blockId === BLOCK.BED_BLOCK) {
    const g = new THREE.Group();
    const frame = makeUvBoxMesh(
      size * 0.96,
      size * 0.18,
      size * 0.96,
      [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS],
      atlasTex,
      true,
      depthTest,
      0.25
    );
    frame.position.y = -size * 0.14;
    const mattress = makeUvBoxMesh(
      size * 0.94,
      size * 0.24,
      size * 0.94,
      [TILE.WOOL_RED, TILE.BED_SIDE, TILE.OAK_PLANKS],
      atlasTex,
      true,
      depthTest,
      0.35
    );
    mattress.position.y = size * 0.06;
    const pillow = makeUvBoxMesh(
      size * 0.88,
      size * 0.10,
      size * 0.34,
      [TILE.WOOL_WHITE, TILE.WOOL_WHITE, TILE.WOOL_WHITE],
      atlasTex,
      true,
      depthTest,
      0.25
    );
    pillow.position.set(0, size * 0.21, -size * 0.28);
    g.add(frame, mattress, pillow);
    for (const [lx, lz] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) {
      const leg = makeUvBoxMesh(
        size * 0.16,
        size * 0.18,
        size * 0.16,
        [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS],
        atlasTex,
        true,
        depthTest,
        0.25
      );
      leg.position.set(size * lx, -size * 0.31, size * lz);
      g.add(leg);
    }
    return g;
  }

  if (blockId === BLOCK.CHEST) {
    const g = new THREE.Group();
    const box = makeUvBoxMesh(size * 0.88, size * 0.88, size * 0.88, def.tiles, atlasTex, true, depthTest);
    const latch = makeUvBoxMesh(
      size * 0.14,
      size * 0.22,
      size * 0.08,
      [TILE.GOLD_BLOCK, TILE.GOLD_BLOCK, TILE.GOLD_BLOCK],
      atlasTex,
      true,
      depthTest
    );
    latch.position.set(0, size * 0.06, size * 0.46);
    g.add(box, latch);
    return g;
  }

  if (blockId === BLOCK.BELL_BLOCK) {
    const g = new THREE.Group();
    const pL = makeUvBoxMesh(size * 0.18, size * 0.92, size * 0.22, [TILE.STONE_BRICKS, TILE.STONE_BRICKS, TILE.STONE_BRICKS], atlasTex, true, depthTest);
    pL.position.set(-size * 0.34, -size * 0.04, 0);
    const pR = makeUvBoxMesh(size * 0.18, size * 0.92, size * 0.22, [TILE.STONE_BRICKS, TILE.STONE_BRICKS, TILE.STONE_BRICKS], atlasTex, true, depthTest);
    pR.position.set(size * 0.34, -size * 0.04, 0);
    const bar = makeUvBoxMesh(size * 0.88, size * 0.16, size * 0.20, [TILE.SPRUCE_PLANKS, TILE.SPRUCE_PLANKS, TILE.SPRUCE_PLANKS], atlasTex, true, depthTest);
    bar.position.set(0, size * 0.38, 0);
    const dome = makeUvBoxMesh(size * 0.40, size * 0.40, size * 0.40, [TILE.GOLD_BLOCK, TILE.BELL, TILE.GOLD_BLOCK], atlasTex, true, depthTest);
    dome.position.set(0, size * 0.08, 0);
    const rim = makeUvBoxMesh(size * 0.52, size * 0.12, size * 0.52, [TILE.GOLD_BLOCK, TILE.GOLD_BLOCK, TILE.GOLD_BLOCK], atlasTex, true, depthTest);
    rim.position.set(0, -size * 0.16, 0);
    g.add(pL, pR, bar, dome, rim);
    return g;
  }

  if (isFlatExtrudedBlock(blockId)) {
    const ext = buildExtrudedAtlasTileMesh(def.tiles[0], size * 1.32);
    if (ext) {
      const m = ext.material as THREE.MeshBasicMaterial;
      m.depthTest = depthTest;
      m.transparent = !depthTest;
      return ext;
    }
  }

  if (def.shape === 'trapdoor_closed' || def.shape === 'trapdoor_open') {
    const m = makeUvBoxMesh(size, size * 0.22, size, def.tiles, atlasTex, false, depthTest, 0.22);
    m.position.y = -size * 0.22;
    const g = new THREE.Group();
    g.add(m);
    return g;
  }

  if (def.shape === 'campfire') {
    const g = new THREE.Group();
    const log1 = makeUvBoxMesh(size * 0.92, size * 0.24, size * 0.24, [TILE.CAMPFIRE_LOG, TILE.CAMPFIRE_LOG, TILE.CAMPFIRE_LOG], atlasTex, false, depthTest, 0.3);
    log1.position.set(0, -size * 0.24, -size * 0.24);
    const log2 = makeUvBoxMesh(size * 0.92, size * 0.24, size * 0.24, [TILE.CAMPFIRE_LOG, TILE.CAMPFIRE_LOG, TILE.CAMPFIRE_LOG], atlasTex, false, depthTest, 0.3);
    log2.position.set(0, -size * 0.24, size * 0.24);
    const log3 = makeUvBoxMesh(size * 0.24, size * 0.24, size * 0.92, [TILE.CAMPFIRE_LOG, TILE.CAMPFIRE_LOG, TILE.CAMPFIRE_LOG], atlasTex, false, depthTest, 0.3);
    log3.position.set(-size * 0.24, -size * 0.04, 0);
    const log4 = makeUvBoxMesh(size * 0.24, size * 0.24, size * 0.92, [TILE.CAMPFIRE_LOG, TILE.CAMPFIRE_LOG, TILE.CAMPFIRE_LOG], atlasTex, false, depthTest, 0.3);
    log4.position.set(size * 0.24, -size * 0.04, 0);
    g.add(log1, log2, log3, log4);
    if (blockId === BLOCK.CAMPFIRE) {
      const fire = makeUvBoxMesh(size * 0.42, size * 0.56, size * 0.42, [TILE.CAMPFIRE_FIRE, TILE.CAMPFIRE_FIRE, TILE.CAMPFIRE_FIRE], atlasTex, false, depthTest, 0.6);
      fire.position.y = size * 0.08;
      g.add(fire);
    }
    return g;
  }

  if (def.shape === 'anvil') {
    const g = new THREE.Group();
    const base = makeUvBoxMesh(size * 0.76, size * 0.24, size * 0.76, def.tiles, atlasTex, false, depthTest, 0.25);
    base.position.y = -size * 0.38;
    const stem = makeUvBoxMesh(size * 0.42, size * 0.36, size * 0.52, def.tiles, atlasTex, false, depthTest, 0.4);
    stem.position.y = -size * 0.08;
    const head = makeUvBoxMesh(size * 0.68, size * 0.38, size, def.tiles, atlasTex, false, depthTest, 0.4);
    head.position.y = size * 0.29;
    g.add(base, stem, head);
    return g;
  }

  if (def.shape === 'enchanting_table') {
    const g = new THREE.Group();
    const base = makeUvBoxMesh(size, size * 0.75, size, def.tiles, atlasTex, false, depthTest, 0.75);
    base.position.y = -size * 0.125;
    const book = makeUvBoxMesh(size * 0.44, size * 0.12, size * 0.38, [TILE.ENCHANT_TOP, TILE.ENCHANT_TOP, TILE.ENCHANT_TOP], atlasTex, false, depthTest, 0.2);
    book.position.y = size * 0.32;
    g.add(base, book);
    return g;
  }

  if (def.shape === 'cauldron') {
    const g = new THREE.Group();
    const bot = makeUvBoxMesh(size, size * 0.2, size, def.tiles, atlasTex, false, depthTest, 0.2);
    bot.position.y = -size * 0.4;
    const wL = makeUvBoxMesh(size * 0.14, size * 0.8, size, def.tiles, atlasTex, false, depthTest, 0.8);
    wL.position.set(-size * 0.43, size * 0.1, 0);
    const wR = makeUvBoxMesh(size * 0.14, size * 0.8, size, def.tiles, atlasTex, false, depthTest, 0.8);
    wR.position.set(size * 0.43, size * 0.1, 0);
    const wN = makeUvBoxMesh(size * 0.72, size * 0.8, size * 0.14, def.tiles, atlasTex, false, depthTest, 0.8);
    wN.position.set(0, size * 0.1, -size * 0.43);
    const wS = makeUvBoxMesh(size * 0.72, size * 0.8, size * 0.14, def.tiles, atlasTex, false, depthTest, 0.8);
    wS.position.set(0, size * 0.1, size * 0.43);
    g.add(bot, wL, wR, wN, wS);
    return g;
  }

  if (def.shape === 'slab' || def.shape === 'cake') {
    const w = def.shape === 'cake' ? size * 0.875 : size;
    const m = makeUvBoxMesh(w, size * 0.5, w, def.tiles, atlasTex, false, depthTest, 0.5);
    m.position.y = -size * 0.16;
    const g = new THREE.Group();
    g.add(m);
    return g;
  }

  if (def.shape === 'flower_pot') {
    const g = new THREE.Group();
    const pot = makeUvBoxMesh(size * 0.44, size * 0.42, size * 0.44, def.tiles, atlasTex, true, depthTest, 0.42);
    pot.position.y = -size * 0.22;
    g.add(pot);
    if (blockId === BLOCK.POTTED_CACTUS) {
      const cac = makeUvBoxMesh(size * 0.24, size * 0.52, size * 0.24, [TILE.CACTUS_TOP, TILE.CACTUS_SIDE, TILE.CACTUS_TOP], atlasTex, true, depthTest);
      cac.position.y = size * 0.16;
      g.add(cac);
    } else if (blockId === BLOCK.POTTED_POPPY || blockId === BLOCK.POTTED_DANDELION || blockId === BLOCK.POTTED_CHERRY) {
      const plantTile =
        blockId === BLOCK.POTTED_POPPY
          ? TILE.POPPY
          : blockId === BLOCK.POTTED_DANDELION
            ? TILE.DANDELION
            : TILE.CHERRY_LEAVES;
      const stem = makeUvBoxMesh(size * 0.10, size * 0.28, size * 0.10, [TILE.OAK_LEAVES, TILE.OAK_LEAVES, TILE.OAK_LEAVES], atlasTex, true, depthTest);
      stem.position.y = size * 0.06;
      const bloom = makeUvBoxMesh(size * 0.28, size * 0.24, size * 0.28, [plantTile, plantTile, plantTile], atlasTex, false, depthTest);
      bloom.position.y = size * 0.26;
      g.add(stem, bloom);
    }
    return g;
  }

  if (def.shape && def.shape.startsWith('stairs_')) {
    const g = new THREE.Group();
    const bot = makeUvBoxMesh(size, size * 0.5, size, def.tiles, atlasTex, false, depthTest, 0.5);
    bot.position.y = -size * 0.25;
    const top = makeUvBoxMesh(size, size * 0.5, size * 0.5, def.tiles, atlasTex, false, depthTest, 0.5);
    top.position.set(0, size * 0.25, -size * 0.25);
    g.add(bot, top);
    return g;
  }

  if (def.shape === 'fence') {
    const g = new THREE.Group();
    const pL = makeUvBoxMesh(size * 0.24, size, size * 0.24, def.tiles, atlasTex, false, depthTest);
    pL.position.x = -size * 0.28;
    const pR = makeUvBoxMesh(size * 0.24, size, size * 0.24, def.tiles, atlasTex, false, depthTest);
    pR.position.x = size * 0.28;
    const r1 = makeUvBoxMesh(size * 0.62, size * 0.16, size * 0.14, def.tiles, atlasTex, false, depthTest, 0.3);
    r1.position.y = size * 0.24;
    const r2 = makeUvBoxMesh(size * 0.62, size * 0.16, size * 0.14, def.tiles, atlasTex, false, depthTest, 0.3);
    r2.position.y = -size * 0.12;
    g.add(pL, pR, r1, r2);
    return g;
  }

  if (def.shape === 'lantern') {
    const g = new THREE.Group();
    const body = makeUvBoxMesh(size * 0.54, size * 0.62, size * 0.54, def.tiles, atlasTex, false, depthTest);
    body.position.y = -size * 0.08;
    const cap = makeUvBoxMesh(size * 0.34, size * 0.18, size * 0.34, [TILE.IRON_BLOCK, TILE.IRON_BLOCK, TILE.IRON_BLOCK], atlasTex, false, depthTest);
    cap.position.y = size * 0.32;
    g.add(body, cap);
    return g;
  }

  return makeUvBoxMesh(size, size, size, def.tiles, atlasTex, def.opaque, depthTest);
}

export type HeldPoseKind =
  | 'shield'
  | 'crossbow'
  | 'bow'
  | 'polearm'
  | 'rod'
  | 'grapple'
  | 'spyglass'
  | 'torch'
  | 'totem'
  | 'potion'
  | 'bucket'
  | 'orb'
  | 'weapon'
  | 'flat_item'
  | 'block';

export function getHeldPoseKind(id: number): HeldPoseKind {
  if (id === ITEM.SHIELD) return 'shield';
  if (id === ITEM.CROSSBOW) return 'crossbow';
  if (id === ITEM.BOW) return 'bow';
  if (id === ITEM.GRAPPLING_HOOK) return 'grapple';
  if (id === ITEM.FISHING_ROD) return 'rod';
  if (
    id === ITEM.MACE ||
    id === ITEM.TRIDENT ||
    id === ITEM.IRON_SPEAR ||
    id === ITEM.DIAMOND_SPEAR ||
    id === ITEM.ZANGETSU_BLADE ||
    id === ITEM.ENMA_KATANA ||
    id === ITEM.SHINOBI_KUNAI ||
    id === ITEM.DRAGON_SLAYER ||
    id === ITEM.ASTRAL_STAFF ||
    id === ITEM.DIVINE_SCYTHE
  ) {
    return 'polearm';
  }
  if (id === ITEM.SPYGLASS) return 'spyglass';
  if (id === BLOCK.TORCH || id === BLOCK.LANTERN) {
    return 'torch';
  }
  if (id === ITEM.TOTEM_OF_UNDYING || id === ITEM.ARMOR_STAND || id === ITEM.FIREWORK_ROCKET || id === ITEM.CHAKRA_SCROLL) {
    return 'totem';
  }
  if (
    id === ITEM.POTION_HEALING ||
    id === ITEM.POTION_SWIFTNESS ||
    id === ITEM.POTION_STRENGTH ||
    id === ITEM.POTION_REGEN
  ) {
    return 'potion';
  }
  if (
    id === ITEM.BUCKET_EMPTY ||
    id === ITEM.BUCKET_WATER ||
    id === ITEM.BUCKET_LAVA ||
    id === ITEM.BUCKET_POWDER_SNOW ||
    id === ITEM.BOAT_ITEM ||
    id === ITEM.ELYTRA
  ) {
    return 'bucket';
  }
  if (id === ITEM.ENDER_PEARL || id === ITEM.WIND_CHARGE || id === ITEM.SNOWBALL) {
    return 'orb';
  }
  const def = getItemDef(id);
  if (!def.isBlock || def.sprite) {
    if (
      def.toolClass === 'sword' ||
      def.toolClass === 'pickaxe' ||
      def.toolClass === 'axe' ||
      def.toolClass === 'shovel' ||
      def.toolClass === 'hoe' ||
      def.toolClass === 'shears' ||
      id === ITEM.STICK ||
      id === ITEM.BONE ||
      id === ITEM.WHEAT_ITEM ||
      id === ITEM.ARROW
    ) {
      return 'weapon';
    }
    return 'flat_item';
  }
  if (isFlatExtrudedBlock(id)) return 'flat_item';
  return 'block';
}

// High-contrast per-face vertex shading so 1st-person MeshBasicMaterial viewmodels have unmistakable 3D bevels!
function makeShadedBoxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  const faceShades = [0.62, 0.74, 1.0, 0.50, 0.94, 0.84];
  const colors = new Float32Array(24 * 3);
  for (let f = 0; f < 6; f++) {
    const sh = faceShades[f];
    for (let v = 0; v < 4; v++) {
      const idx = (f * 4 + v) * 3;
      colors[idx] = sh;
      colors[idx + 1] = sh;
      colors[idx + 2] = sh;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function makePartFactory(group: THREE.Group, isFirstPerson: boolean, scale: number) {
  const matCache = new Map<string, THREE.Material>();
  const getMat = (color: number, emissive = 0x000000, opacity = 1.0) => {
    const key = `${color}:${emissive}:${opacity.toFixed(2)}`;
    let m = matCache.get(key);
    if (!m) {
      const isTranslucent = opacity < 0.99;
      m = isFirstPerson
        ? new THREE.MeshBasicMaterial({
            color,
            vertexColors: true,
            depthTest: false,
            transparent: true,
            opacity
          })
        : new THREE.MeshLambertMaterial({
            color,
            emissive,
            transparent: isTranslucent,
            opacity,
            depthWrite: !isTranslucent
          });
      matCache.set(key, m);
    }
    return m;
  };
  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: number,
    rx = 0,
    ry = 0,
    rz = 0,
    emissive = 0x000000,
    opacity = 1.0
  ) => {
    const geo = isFirstPerson
      ? makeShadedBoxGeo(w * scale, h * scale, d * scale)
      : new THREE.BoxGeometry(w * scale, h * scale, d * scale);
    const mesh = new THREE.Mesh(geo, getMat(color, emissive, opacity));
    mesh.position.set(x * scale, y * scale, z * scale);
    if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
    if (isFirstPerson) mesh.renderOrder = opacity < 0.99 ? 62 : 60;
    group.add(mesh);
    return mesh;
  };
  return { addBox, getMat };
}

let cachedShieldFrontTex: THREE.CanvasTexture | null = null;
let cachedShieldBackTex: THREE.CanvasTexture | null = null;

function getShieldFrontTexture(): THREE.CanvasTexture {
  if (!cachedShieldFrontTex) {
    // Authentic Vanilla 12x22 `shield_base_nopattern` pixel art!
    cachedShieldFrontTex = makePixelTex(12, 22, (ctx) => {
      ctx.fillStyle = '#333842';
      ctx.fillRect(0, 0, 12, 22);
      ctx.fillStyle = '#737d8c';
      ctx.fillRect(1, 1, 10, 20);
      const plankCols = ['#8a5d30', '#9c6c39', '#82562b', '#966635'];
      for (let p = 0; p < 4; p++) {
        ctx.fillStyle = plankCols[p];
        ctx.fillRect(2 + p * 2, 2, 2, 18);
        ctx.fillStyle = '#ad7c46';
        ctx.fillRect(2 + p * 2, 3, 1, 16);
      }
      ctx.fillStyle = '#69431f';
      ctx.fillRect(3, 6, 1, 3);
      ctx.fillRect(7, 13, 1, 3);
      ctx.fillStyle = '#aeb8c6';
      ctx.fillRect(1, 9, 10, 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(2, 9, 8, 1);
      const studs: Array<[number, number]> = [[1, 1], [10, 1], [1, 20], [10, 20], [1, 10], [10, 10]];
      ctx.fillStyle = '#f1f5f9';
      for (const [sx, sy] of studs) ctx.fillRect(sx, sy, 1, 1);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(4, 8, 4, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(4, 8, 4, 1);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(5, 9, 2, 2);
    });
  }
  return cachedShieldFrontTex;
}

function getShieldBackTexture(): THREE.CanvasTexture {
  if (!cachedShieldBackTex) {
    cachedShieldBackTex = makePixelTex(12, 22, (ctx) => {
      ctx.fillStyle = '#2d323b';
      ctx.fillRect(0, 0, 12, 22);
      ctx.fillStyle = '#636c7a';
      ctx.fillRect(1, 1, 10, 20);
      ctx.fillStyle = '#6e4924';
      ctx.fillRect(2, 2, 8, 18);
      ctx.fillStyle = '#57381a';
      ctx.fillRect(4, 2, 1, 18);
      ctx.fillRect(7, 2, 1, 18);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(2, 6, 8, 2);
      ctx.fillRect(2, 14, 8, 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(1, 1, 1, 1);
      ctx.fillRect(10, 1, 1, 1);
      ctx.fillRect(1, 20, 1, 1);
      ctx.fillRect(10, 20, 1, 1);
    });
  }
  return cachedShieldBackTex;
}

export function buildShield3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.78 : 1.0;

  const mkFaceMat = (color: number, map?: THREE.CanvasTexture) =>
    isFirstPerson
      ? new THREE.MeshBasicMaterial({
          color,
          map: map || null,
          vertexColors: true,
          depthTest: false,
          transparent: true
        })
      : new THREE.MeshLambertMaterial({ color, map: map || null });

  const frontMat = mkFaceMat(0xffffff, getShieldFrontTexture());
  const backMat = mkFaceMat(0xffffff, getShieldBackTexture());
  const rimEdgeMat = mkFaceMat(0x525b69);

  // Core wooden shield board
  const plateGeo = isFirstPerson
    ? makeShadedBoxGeo(0.48 * s, 0.86 * s, 0.052 * s)
    : new THREE.BoxGeometry(0.48 * s, 0.86 * s, 0.052 * s);
  const plate = new THREE.Mesh(plateGeo, [rimEdgeMat, rimEdgeMat, rimEdgeMat, rimEdgeMat, backMat, frontMat]);
  if (isFirstPerson) plate.renderOrder = 60;
  g.add(plate);

  // Raised 3D forged steel perimeter rim bars, central boss, gold emblem rivet & rear grip!
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  addBox(0.51, 0.055, 0.074, 0, 0.415, 0, 0x64748b);
  addBox(0.51, 0.055, 0.074, 0, -0.415, 0, 0x64748b);
  addBox(0.055, 0.84, 0.072, -0.225, 0, 0, 0x64748b);
  addBox(0.055, 0.84, 0.072, 0.225, 0, 0, 0x64748b);
  // Raised 3D front iron cross-band + central shield boss (-Z front)
  addBox(0.44, 0.07, 0.025, 0, 0.04, -0.036, 0x94a3b8);
  addBox(0.15, 0.15, 0.042, 0, 0.04, -0.045, 0xdbe4f0);
  addBox(0.075, 0.075, 0.028, 0, 0.04, -0.068, 0xfacc15);
  // 4 raised 3D corner rivets
  for (const [cx, cy] of [[-0.19, 0.38], [0.19, 0.38], [-0.19, -0.38], [0.19, -0.38]]) {
    addBox(0.045, 0.045, 0.025, cx, cy, -0.042, 0xe2e8f0);
  }
  // Rear 3D U-shaped arm brace & handle (+Z back)
  addBox(0.08, 0.24, 0.14, 0, 0.02, 0.09, 0x5c3c1e);

  return g;
}

export function buildCrossbow3D(isFirstPerson: boolean, loaded = false): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.90 : 1.0;
  const { addBox } = makePartFactory(g, isFirstPerson, s);

  // Sculpted wooden stock & cheek rest extending forward (-Z)
  addBox(0.082, 0.105, 0.52, 0, 0.03, -0.18, 0x7c5329);
  addBox(0.094, 0.035, 0.32, 0, 0.088, -0.20, 0x5c3c1e);
  addBox(0.072, 0.15, 0.095, 0, -0.055, -0.04, 0x4a3016);
  addBox(0.04, 0.07, 0.06, 0, -0.04, -0.14, 0x94a3b8); // Iron trigger
  // Forged steel prod & swept 3D limbs
  addBox(0.46, 0.06, 0.07, 0, 0.05, -0.39, 0x4a3016);
  addBox(0.14, 0.072, 0.082, 0, 0.052, -0.39, 0x94a3b8);
  addBox(0.18, 0.052, 0.058, -0.26, 0.05, -0.32, 0xcbd5e1, 0, 0.42, 0);
  addBox(0.18, 0.052, 0.058, 0.26, 0.05, -0.32, 0xcbd5e1, 0, -0.42, 0);
  // Front iron foot stirrup
  addBox(0.13, 0.036, 0.10, 0, 0.03, -0.48, 0xcbd5e1);

  if (loaded) {
    addBox(0.32, 0.024, 0.024, -0.14, 0.068, -0.18, 0xe2e8f0, 0, -0.68, 0);
    addBox(0.32, 0.024, 0.024, 0.14, 0.068, -0.18, 0xe2e8f0, 0, 0.68, 0);
    addBox(0.04, 0.04, 0.48, 0, 0.105, -0.27, 0x8c6234);
    addBox(0.078, 0.078, 0.095, 0, 0.105, -0.52, 0xe2e8f0);
    addBox(0.075, 0.052, 0.075, 0, 0.105, -0.05, 0xf8fafc);
  } else {
    addBox(0.54, 0.024, 0.024, 0, 0.062, -0.26, 0xe2e8f0);
  }

  return g;
}

export function buildMace3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.96;
  const { addBox } = makePartFactory(g, isFirstPerson, s);

  // Heavy Breeze-Rod Metallic Shaft (+Y) & Pommel
  addBox(0.105, 0.075, 0.105, 0, -0.13, 0, 0x475569);
  addBox(0.068, 0.48, 0.068, 0, 0.13, 0, 0x64748b);
  addBox(0.082, 0.10, 0.082, 0, 0.02, 0, 0x38bdf8, 0, 0, 0, 0x0c4a6e); // Breeze grip ring
  addBox(0.13, 0.055, 0.13, 0, 0.36, 0, 0x94a3b8); // Collar flange

  // True 3D Heavy Core Cube (0.25 x 0.25 x 0.25) + Glowing Wind Seams + 8 Forged 3D Corner Spikes!
  addBox(0.24, 0.24, 0.24, 0, 0.50, 0, 0x525b69);
  addBox(0.255, 0.055, 0.255, 0, 0.50, 0, 0x38bdf8, 0, 0, 0, 0x0284c7);
  addBox(0.055, 0.255, 0.255, 0, 0.50, 0, 0x94a3b8);
  addBox(0.255, 0.255, 0.055, 0, 0.50, 0, 0x94a3b8);
  for (const sx of [-0.11, 0.11]) {
    for (const sy of [0.40, 0.60]) {
      for (const sz of [-0.11, 0.11]) {
        addBox(0.068, 0.068, 0.068, sx, sy, sz, 0xe2e8f0);
      }
    }
  }
  addBox(0.09, 0.055, 0.09, 0, 0.64, 0, 0xcbd5e1);
  return g;
}

export function buildTrident3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.84 : 0.96;
  const { addBox } = makePartFactory(g, isFirstPerson, s);

  // Prismarine 3D Shaft + Sea-Lantern Core Collar
  addBox(0.082, 0.07, 0.082, 0, -0.18, 0, 0x0f766e);
  addBox(0.058, 0.78, 0.058, 0, 0.22, 0, 0x14b8a6);
  addBox(0.072, 0.12, 0.072, 0, 0.08, 0, 0x0d9488);
  addBox(0.12, 0.08, 0.09, 0, 0.58, 0, 0x99f6e4, 0, 0, 0, 0x0d9488);
  // Swept 3D Crossguard + 3 Crystalline Prongs
  addBox(0.30, 0.055, 0.072, 0, 0.63, 0, 0x2dd4bf);
  addBox(0.052, 0.28, 0.058, 0, 0.78, 0, 0xe0f2fe);
  addBox(0.038, 0.07, 0.042, 0, 0.94, 0, 0xffffff);
  addBox(0.046, 0.22, 0.052, -0.12, 0.74, 0, 0xcffafe, 0, 0, 0.08);
  addBox(0.046, 0.22, 0.052, 0.12, 0.74, 0, 0xcffafe, 0, 0, -0.08);
  return g;
}

export function buildSpear3D(isFirstPerson: boolean, isDiamond: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.84 : 0.96;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  const tipMain = isDiamond ? 0x22d3ee : 0xdbe4f0;
  const tipEdge = isDiamond ? 0xa5f3fc : 0xffffff;
  const collar = isDiamond ? 0x0891b2 : 0x64748b;

  addBox(0.078, 0.07, 0.078, 0, -0.18, 0, collar);
  addBox(0.058, 0.78, 0.058, 0, 0.22, 0, 0x7c5329);
  addBox(0.07, 0.14, 0.07, 0, 0.04, 0, 0x4a3016); // Leather grip wrap
  addBox(0.13, 0.055, 0.13, 0, 0.61, 0, collar);
  // 4-sided 3D tapered lance blade
  addBox(0.095, 0.14, 0.095, 0, 0.70, 0, tipMain);
  addBox(0.068, 0.12, 0.068, 0, 0.82, 0, tipEdge);
  addBox(0.042, 0.08, 0.042, 0, 0.91, 0, tipEdge);
  return g;
}

export function buildBow3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.96;
  const { addBox, getMat } = makePartFactory(g, isFirstPerson, s);

  // Curved 3D Oak/Yew Bow Riser & Stepped Limbs in YZ Plane (-Z forward arch, +Z string!)
  addBox(0.062, 0.16, 0.072, 0, 0, -0.02, 0x4a3016); // Leather riser grip
  addBox(0.068, 0.045, 0.082, 0, 0.085, -0.02, 0xcbd5e1); // Iron arrow shelf
  // Upper stepped limb
  addBox(0.054, 0.15, 0.062, 0, 0.14, 0.01, 0x85582b, -0.28, 0, 0);
  addBox(0.048, 0.15, 0.056, 0, 0.26, 0.06, 0x9a6836, -0.52, 0, 0);
  addBox(0.042, 0.11, 0.048, 0, 0.35, 0.13, 0x6e4720, -0.76, 0, 0);
  // Lower stepped limb
  addBox(0.054, 0.15, 0.062, 0, -0.14, 0.01, 0x85582b, 0.28, 0, 0);
  addBox(0.048, 0.15, 0.056, 0, -0.26, 0.06, 0x9a6836, 0.52, 0, 0);
  addBox(0.042, 0.11, 0.048, 0, -0.35, 0.13, 0x6e4720, 0.76, 0, 0);

  // Dynamic upper & lower 3D bowstrings
  const strGeo = isFirstPerson
    ? makeShadedBoxGeo(0.018 * s, 0.39 * s, 0.018 * s)
    : new THREE.BoxGeometry(0.018 * s, 0.39 * s, 0.018 * s);
  const strMat = getMat(0xe2e8f0);
  const upperStr = new THREE.Mesh(strGeo, strMat);
  const lowerStr = new THREE.Mesh(strGeo, strMat);
  upperStr.position.set(0, 0.19 * s, 0.16 * s);
  lowerStr.position.set(0, -0.19 * s, 0.16 * s);
  if (isFirstPerson) {
    upperStr.renderOrder = 61;
    lowerStr.renderOrder = 61;
  }
  g.add(upperStr, lowerStr);

  // Dynamic 3D Feathered Arrow along -Z (revealed during bowPull > 0)
  const arrowGrp = new THREE.Group();
  const arrowParts = makePartFactory(arrowGrp, isFirstPerson, s);
  arrowParts.addBox(0.034, 0.034, 0.52, 0, 0, -0.10, 0x8c6234);
  arrowParts.addBox(0.072, 0.072, 0.09, 0, 0, -0.38, 0xe2e8f0);
  arrowParts.addBox(0.068, 0.068, 0.075, 0, 0, 0.15, 0xf8fafc);
  arrowGrp.position.set(0.025 * s, 0.04 * s, 0.02 * s);
  arrowGrp.visible = false;
  g.add(arrowGrp);

  g.userData.bowArrow = arrowGrp;
  g.userData.bowStrings = { upperStr, lowerStr, scale: s };
  return g;
}

export function buildFishingRod3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.96;
  const { addBox } = makePartFactory(g, isFirstPerson, s);

  // Cork/Leather Grip + Tapered 3D Angled Oak Rod (+Y & -Z)
  addBox(0.068, 0.20, 0.068, 0, -0.02, 0.02, 0x4a3016, -0.58, 0, 0);
  addBox(0.054, 0.24, 0.054, 0, 0.14, -0.09, 0x85582b, -0.62, 0, 0);
  addBox(0.044, 0.24, 0.044, 0, 0.31, -0.22, 0x9a6836, -0.66, 0, 0);
  addBox(0.034, 0.22, 0.034, 0, 0.46, -0.35, 0xb07d46, -0.70, 0, 0);

  // Side-mounted 3D Iron Spinning Reel + Gold Crank Handle!
  addBox(0.075, 0.085, 0.085, 0.042, 0.04, -0.04, 0x94a3b8);
  addBox(0.045, 0.035, 0.075, 0.09, 0.04, -0.04, 0xfacc15);

  // Hanging 3D Line & Red-White Voxel Bobber (hidden automatically while cast into water!)
  const bobberGrp = new THREE.Group();
  const bp = makePartFactory(bobberGrp, isFirstPerson, s);
  bp.addBox(0.014, 0.20, 0.014, 0, 0.44, -0.43, 0xe2e8f0);
  bp.addBox(0.068, 0.045, 0.068, 0, 0.33, -0.43, 0xef4444);
  bp.addBox(0.068, 0.045, 0.068, 0, 0.285, -0.43, 0xf8fafc);
  g.add(bobberGrp);
  g.userData.rodBobber = bobberGrp;

  return g;
}

export function buildGrapplingHook3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.90 : 0.98;
  const { addBox } = makePartFactory(g, isFirstPerson, s);

  // Forged Tempest Winch Pistol & Barrel (-Z)
  addBox(0.074, 0.16, 0.09, 0, -0.06, -0.02, 0x4a3016, 0.22, 0, 0);
  addBox(0.095, 0.10, 0.36, 0, 0.04, -0.17, 0x475569);
  addBox(0.115, 0.085, 0.12, 0, 0.105, -0.13, 0xd97706); // Brass rope winch spool
  addBox(0.048, 0.048, 0.16, 0, 0.10, -0.27, 0x38bdf8, 0, 0, 0, 0x0284c7); // Magicule sight rail
  // 3 Flared 3D Steel Grappling Claws at Muzzle (-Z = -0.37)
  addBox(0.085, 0.085, 0.08, 0, 0.04, -0.37, 0xcbd5e1);
  addBox(0.16, 0.042, 0.07, -0.10, 0.04, -0.39, 0xe2e8f0, 0, 0.48, 0);
  addBox(0.16, 0.042, 0.07, 0.10, 0.04, -0.39, 0xe2e8f0, 0, -0.48, 0);
  addBox(0.042, 0.15, 0.07, 0, 0.13, -0.39, 0xe2e8f0, -0.48, 0, 0);
  return g;
}

export function buildSpyglass3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.90 : 0.96;
  const { addBox } = makePartFactory(g, isFirstPerson, s);

  // Telescoping 3D Copper Barrel + Gold Trim Rings + Square Amethyst Crystal Lens (-Z)
  addBox(0.085, 0.085, 0.18, 0, 0.02, 0.02, 0xb45309);
  addBox(0.105, 0.105, 0.045, 0, 0.02, -0.08, 0xfacc15);
  addBox(0.112, 0.112, 0.22, 0, 0.02, -0.20, 0xd97706);
  addBox(0.128, 0.128, 0.045, 0, 0.02, -0.32, 0xfacc15);
  addBox(0.095, 0.095, 0.025, 0, 0.02, -0.345, 0xc084fc, 0, 0, 0, 0x7e22ce);
  return g;
}

export function buildTorch3D(isFirstPerson: boolean, isLantern: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.94;
  const { addBox } = makePartFactory(g, isFirstPerson, s);

  if (isLantern) {
    addBox(0.22, 0.045, 0.22, 0, -0.06, 0, 0x334155);
    addBox(0.18, 0.22, 0.18, 0, 0.07, 0, 0xfbbf24, 0, 0, 0, 0xd97706);
    addBox(0.22, 0.05, 0.22, 0, 0.20, 0, 0x475569);
    addBox(0.12, 0.06, 0.12, 0, 0.25, 0, 0x64748b);
    addBox(0.04, 0.07, 0.04, 0, 0.31, 0, 0x94a3b8);
    return g;
  }

  // Authentic 2x10x2 Square 3D Oak Torch Stick + Coal Wick + Layered Glowing 3D Flame!
  addBox(0.082, 0.38, 0.082, 0, 0.08, 0, 0x85582b);
  addBox(0.088, 0.06, 0.088, 0, 0.28, 0, 0x27272a);
  addBox(0.105, 0.105, 0.105, 0, 0.35, 0, 0xf97316, 0, 0, 0, 0xea580c);
  addBox(0.068, 0.085, 0.068, 0, 0.41, 0, 0xfef08a, 0, 0, 0, 0xfacc15);
  return g;
}

export function buildPotion3D(isFirstPerson: boolean, itemId: number): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.90 : 0.94;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  let liqMain = 0xef4444;
  let liqGlow = 0xb91c1c;
  if (itemId === ITEM.POTION_SWIFTNESS) {
    liqMain = 0x38bdf8;
    liqGlow = 0x0284c7;
  } else if (itemId === ITEM.POTION_STRENGTH) {
    liqMain = 0xf59e0b;
    liqGlow = 0xb45309;
  } else if (itemId === ITEM.POTION_REGEN) {
    liqMain = 0xec4899;
    liqGlow = 0xbe185d;
  }
  // 3D Crystal Glass Flask Base + Vibrant Glowing Inner Alchemical Liquid + Translucent Shell + Gold Collar + Cork!
  addBox(0.18, 0.035, 0.18, 0, -0.05, 0, 0x94a3b8);
  addBox(0.175, 0.145, 0.175, 0, 0.042, 0, liqMain, 0, 0, 0, liqGlow);
  addBox(0.12, 0.035, 0.12, 0.02, 0.125, -0.02, 0xffffff, 0, 0, 0, liqMain, 0.72); // Shimmering surface bubble
  addBox(0.22, 0.20, 0.22, 0, 0.06, 0, 0xe0f2fe, 0, 0, 0, 0x000000, 0.34); // Translucent 3D crystal glass shell
  addBox(0.095, 0.09, 0.095, 0, 0.20, 0, 0xe0f2fe, 0, 0, 0, 0x000000, 0.48); // Translucent glass neck
  addBox(0.128, 0.035, 0.128, 0, 0.235, 0, 0xfacc15); // Gold alchemical collar
  addBox(0.078, 0.058, 0.078, 0, 0.278, 0, 0x9c6c39); // Cork stopper
  return g;
}

export function buildTotem3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.92;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  // Sculpted 3D Golden Totem Pedestal, Outstretched Wings, Head, Nose & Glowing 3D Emerald Eyes!
  addBox(0.14, 0.16, 0.12, 0, -0.02, 0, 0xd97706);
  addBox(0.18, 0.16, 0.14, 0, 0.12, 0, 0xfacc15);
  addBox(0.42, 0.11, 0.065, 0, 0.14, 0.01, 0xeab308);
  addBox(0.08, 0.08, 0.07, -0.22, 0.19, 0.01, 0xfef08a);
  addBox(0.08, 0.08, 0.07, 0.22, 0.19, 0.01, 0xfef08a);
  addBox(0.20, 0.18, 0.18, 0, 0.28, 0, 0xfacc15);
  addBox(0.22, 0.045, 0.19, 0, 0.36, 0, 0xfef08a);
  addBox(0.048, 0.075, 0.045, 0, 0.26, -0.10, 0xd97706); // 3D villager/totem nose
  addBox(0.052, 0.045, 0.035, -0.055, 0.30, -0.095, 0x22c55e, 0, 0, 0, 0x15803d);
  addBox(0.052, 0.045, 0.035, 0.055, 0.30, -0.095, 0x22c55e, 0, 0, 0, 0x15803d);
  return g;
}

export function buildBucket3D(isFirstPerson: boolean, itemId: number): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.92;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  // Hollow 4-Walled 3D Forged Iron Bucket + Wire Bail Handle + Inner Liquid/Snow Fill!
  addBox(0.22, 0.04, 0.22, 0, -0.05, 0, 0x64748b);
  addBox(0.26, 0.22, 0.04, 0, 0.07, -0.11, 0xcbd5e1);
  addBox(0.26, 0.22, 0.04, 0, 0.07, 0.11, 0xcbd5e1);
  addBox(0.04, 0.22, 0.22, -0.11, 0.07, 0, 0x94a3b8);
  addBox(0.04, 0.22, 0.22, 0.11, 0.07, 0, 0x94a3b8);
  addBox(0.28, 0.028, 0.028, 0, 0.23, 0, 0x475569); // Top bail wire
  if (itemId === ITEM.BUCKET_WATER) {
    addBox(0.19, 0.16, 0.19, 0, 0.08, 0, 0x38bdf8, 0, 0, 0, 0x0369a1);
  } else if (itemId === ITEM.BUCKET_LAVA) {
    addBox(0.19, 0.17, 0.19, 0, 0.085, 0, 0xf97316, 0, 0, 0, 0xea580c);
  } else if (itemId === ITEM.BUCKET_POWDER_SNOW) {
    addBox(0.19, 0.18, 0.19, 0, 0.09, 0, 0xf8fafc);
  }
  return g;
}

export function buildOrbItem3D(isFirstPerson: boolean, itemId: number): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.90 : 0.94;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  if (itemId === ITEM.ENDER_PEARL) {
    addBox(0.19, 0.19, 0.19, 0, 0.08, 0, 0x0f766e, 0, 0, 0, 0x115e59);
    addBox(0.13, 0.23, 0.13, 0, 0.08, 0, 0x14b8a6, 0, 0, 0, 0x0d9488);
    addBox(0.23, 0.13, 0.13, 0, 0.08, 0, 0x14b8a6);
    addBox(0.13, 0.13, 0.23, 0, 0.08, 0, 0x2dd4bf, 0, 0, 0, 0x0d9488);
  } else if (itemId === ITEM.WIND_CHARGE) {
    addBox(0.15, 0.15, 0.15, 0, 0.09, 0, 0xe0f2fe, 0, 0, 0, 0x38bdf8);
    addBox(0.25, 0.055, 0.25, 0, 0.09, 0, 0x7dd3fc, 0.24, 0.4, 0.18);
    addBox(0.23, 0.055, 0.23, 0, 0.10, 0, 0xbae6fd, -0.32, 0.2, -0.24);
  } else {
    // 3D Packed Voxel Snowball
    addBox(0.18, 0.18, 0.18, 0, 0.08, 0, 0xf8fafc);
    addBox(0.13, 0.22, 0.13, 0, 0.08, 0, 0xe2e8f0);
    addBox(0.22, 0.13, 0.13, 0, 0.08, 0, 0xffffff);
    addBox(0.13, 0.13, 0.22, 0, 0.08, 0, 0xe2e8f0);
  }
  return g;
}

export function buildBoatItem3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.92;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  addBox(0.24, 0.045, 0.36, 0, 0.02, -0.02, 0x85582b);
  addBox(0.04, 0.11, 0.36, -0.11, 0.08, -0.02, 0x9c6c39);
  addBox(0.04, 0.11, 0.36, 0.11, 0.08, -0.02, 0x9c6c39);
  addBox(0.20, 0.11, 0.04, 0, 0.08, -0.19, 0x7c5329);
  addBox(0.20, 0.11, 0.04, 0, 0.08, 0.15, 0x7c5329);
  addBox(0.36, 0.028, 0.035, 0, 0.12, -0.02, 0x5c3c1e); // Oars across gunwales
  return g;
}

export function buildFirework3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.94;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  addBox(0.032, 0.14, 0.032, 0.02, -0.05, 0, 0x85582b); // Stick stabilizer
  addBox(0.10, 0.26, 0.10, 0, 0.12, 0, 0xf8fafc);
  addBox(0.106, 0.05, 0.106, 0, 0.06, 0, 0xef4444);
  addBox(0.106, 0.05, 0.106, 0, 0.17, 0, 0xef4444);
  addBox(0.13, 0.065, 0.13, 0, 0.27, 0, 0xdc2626);
  addBox(0.08, 0.065, 0.08, 0, 0.33, 0, 0xb91c1c);
  return g;
}

export function buildElytraItem3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.86 : 0.90;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  addBox(0.16, 0.06, 0.07, 0, 0.22, 0, 0xcbd5e1);
  addBox(0.16, 0.34, 0.045, -0.09, 0.06, 0, 0x6c6a80, 0, 0.12, 0.18);
  addBox(0.16, 0.34, 0.045, 0.09, 0.06, 0, 0x8b89a1, 0, -0.12, -0.18);
  return g;
}

export function buildArmorStandItem3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.86 : 0.90;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  addBox(0.24, 0.04, 0.24, 0, -0.04, 0, 0x9ca3af);
  addBox(0.04, 0.28, 0.04, -0.05, 0.11, 0, 0xb58952);
  addBox(0.04, 0.28, 0.04, 0.05, 0.11, 0, 0xb58952);
  addBox(0.26, 0.045, 0.05, 0, 0.24, 0, 0x8a6436);
  addBox(0.055, 0.10, 0.055, 0, 0.31, 0, 0xb58952);
  return g;
}

export function buildChakraScroll3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.88 : 0.94;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  // Rolled Cream Parchment Cylinder + Crimson Ribbon Seal + Twin Golden End-Rollers!
  addBox(0.32, 0.11, 0.11, 0, 0.14, 0, 0xfef3c7);
  addBox(0.08, 0.125, 0.125, 0, 0.14, 0, 0xdc2626);
  addBox(0.035, 0.14, 0.14, -0.17, 0.14, 0, 0xfacc15);
  addBox(0.035, 0.14, 0.14, 0.17, 0.14, 0, 0xfacc15);
  addBox(0.04, 0.05, 0.05, -0.20, 0.14, 0, 0xb91c1c);
  addBox(0.04, 0.05, 0.05, 0.20, 0.14, 0, 0xb91c1c);
  return g;
}

export function buildKatana3D(isFirstPerson: boolean, isEnma: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.86 : 0.98;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  const tsukaCol = isEnma ? 0x7e22ce : 0x991b1b;
  const wrapCol = isEnma ? 0xfacc15 : 0x1e293b;
  const tsubaCol = isEnma ? 0xfacc15 : 0x0f172a;
  const spineCol = isEnma ? 0x3b0764 : 0x0f172a;
  const edgeCol = isEnma ? 0xf5d0fe : 0xe2e8f0;
  const edgeGlow = isEnma ? 0x9333ea : 0x1e293b;

  // Pommel Kashira + Dangling Chain (for Tensa Zangetsu) + Diamond-Wrapped Tsuka Hilt
  addBox(0.072, 0.045, 0.086, 0, -0.20, 0, 0xfacc15);
  if (!isEnma) {
    addBox(0.028, 0.10, 0.028, 0.02, -0.27, 0.03, 0x94a3b8, 0.25, 0, 0.18);
  }
  addBox(0.058, 0.24, 0.074, 0, -0.06, 0, tsukaCol);
  for (const wy of [-0.14, -0.06, 0.02]) {
    addBox(0.066, 0.028, 0.082, 0, wy, 0, wrapCol);
  }
  // Ornate 3D Tsuba Crossguard + Brass Habaki Collar
  addBox(0.18, 0.028, 0.20, 0, 0.08, 0, tsubaCol);
  addBox(0.062, 0.05, 0.082, 0, 0.12, 0, 0xfacc15);
  // Subtle Curved 3D Katana Spine (+Z back) & Razor-Sharp Glowing Ha Cutting Edge (-Z front)!
  addBox(0.034, 0.42, 0.056, 0, 0.35, 0.012, spineCol);
  addBox(0.022, 0.42, 0.036, 0, 0.35, -0.026, edgeCol, 0, 0, 0, edgeGlow);
  addBox(0.030, 0.36, 0.052, 0, 0.73, -0.008, spineCol, -0.06, 0, 0);
  addBox(0.020, 0.36, 0.034, 0, 0.73, -0.044, edgeCol, -0.06, 0, 0, edgeGlow);
  addBox(0.022, 0.10, 0.040, 0, 0.95, -0.042, 0xffffff, -0.12, 0, 0, edgeGlow);
  return g;
}

export function buildKunai3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.90 : 0.98;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  // Hollow 3D Pommel Ring + Bandage-Wrapped Hiraishin Seal Grip + 3-Pronged Flying Raijin Blade!
  addBox(0.085, 0.024, 0.085, 0, -0.16, 0, 0xcbd5e1);
  addBox(0.052, 0.18, 0.052, 0, -0.05, 0, 0xfef3c7);
  addBox(0.058, 0.035, 0.058, 0, -0.05, 0, 0xdc2626);
  addBox(0.16, 0.032, 0.064, 0, 0.06, 0, 0x475569);
  // Central Diamond-Beveled Dagger Blade + Side Prongs
  addBox(0.065, 0.30, 0.075, 0, 0.22, 0, 0xe2e8f0);
  addBox(0.042, 0.12, 0.048, 0, 0.41, 0, 0xffffff, 0, 0, 0, 0x38bdf8);
  addBox(0.038, 0.16, 0.044, -0.075, 0.15, 0, 0xcbd5e1, 0, 0, 0.16);
  addBox(0.038, 0.16, 0.044, 0.075, 0.15, 0, 0xcbd5e1, 0, 0, -0.16);
  return g;
}

export function buildGreatsword3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.84 : 0.98;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  // Heavy Dragon-Claw Gold Pommel + Leather Two-Handed Hilt + Horned Dragon Crossguard + Glowing Magma Fuller Blade!
  addBox(0.11, 0.075, 0.11, 0, -0.22, 0, 0xfacc15);
  addBox(0.068, 0.26, 0.076, 0, -0.06, 0, 0x78350f);
  addBox(0.34, 0.065, 0.11, 0, 0.10, 0, 0xeab308);
  addBox(0.08, 0.09, 0.09, -0.18, 0.14, 0, 0xdc2626, 0, 0, 0.35);
  addBox(0.08, 0.09, 0.09, 0.18, 0.14, 0, 0xdc2626, 0, 0, -0.35);
  // Massive Wide Steel Blade with Glowing Crimson-Gold Dragon Core Fuller
  addBox(0.052, 0.72, 0.19, 0, 0.49, 0, 0x3f3f46);
  addBox(0.064, 0.58, 0.065, 0, 0.44, 0, 0xf97316, 0, 0, 0, 0xdc2626);
  addBox(0.034, 0.70, 0.22, 0, 0.49, 0, 0xe2e8f0);
  addBox(0.042, 0.14, 0.13, 0, 0.91, 0, 0xf8fafc);
  addBox(0.032, 0.08, 0.07, 0, 1.01, 0, 0xffffff, 0, 0, 0, 0xf97316);
  return g;
}

export function buildAstralStaff3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.84 : 0.96;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  addBox(0.082, 0.08, 0.082, 0, -0.20, 0, 0xfacc15);
  addBox(0.058, 0.82, 0.058, 0, 0.24, 0, 0x4c1d95);
  addBox(0.076, 0.12, 0.076, 0, 0.08, 0, 0xfacc15);
  // Golden Crescent Head + Floating Glowing Cyan Astral Star Core!
  addBox(0.24, 0.052, 0.08, 0, 0.66, 0, 0xfacc15);
  addBox(0.052, 0.20, 0.075, -0.11, 0.76, 0, 0xfacc15);
  addBox(0.052, 0.20, 0.075, 0.11, 0.76, 0, 0xfacc15);
  addBox(0.13, 0.13, 0.13, 0, 0.79, 0, 0x38bdf8, 0.45, 0.6, 0.35, 0x0284c7);
  addBox(0.08, 0.08, 0.08, 0, 0.79, 0, 0xffffff, 0, 0, 0, 0x38bdf8);
  return g;
}

export function buildDivineScythe3D(isFirstPerson: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.82 : 0.96;
  const { addBox } = makePartFactory(g, isFirstPerson, s);
  addBox(0.08, 0.08, 0.08, 0, -0.22, 0, 0xfacc15);
  addBox(0.056, 0.92, 0.056, 0, 0.26, 0, 0x1e293b);
  addBox(0.074, 0.14, 0.074, 0, 0.06, 0, 0xbe185d);
  addBox(0.14, 0.10, 0.12, 0, 0.72, 0, 0xfacc15);
  // Sweeping Dimensional Rosé Crescent Scythe Blade extending forward (-Z)!
  addBox(0.048, 0.09, 0.34, 0, 0.75, -0.16, 0xbe185d, 0.12, 0, 0, 0x831843);
  addBox(0.040, 0.08, 0.28, 0, 0.69, -0.41, 0xf472b6, 0.38, 0, 0, 0xdb2777);
  addBox(0.032, 0.065, 0.18, 0, 0.58, -0.58, 0xfdf2f8, 0.68, 0, 0, 0xf472b6);
  return g;
}

export function buildHeldItem3D(
  id: number,
  atlasTex: THREE.CanvasTexture,
  isFirstPerson: boolean,
  loaded = false
): THREE.Object3D | null {
  if (id <= 0) return null;

  // 1. Prefer Smooth Sculpted 3D Forged Weapons, Tools, Curved Shields, Bows & Props!
  const smooth3d = tryBuildSmoothWeaponOrTool3D(id, isFirstPerson, loaded);
  if (smooth3d) {
    return smooth3d;
  }

  const poseKind = getHeldPoseKind(id);
  if (poseKind === 'totem' && id === ITEM.ARMOR_STAND) {
    return buildArmorStandItem3D(isFirstPerson);
  }
  if (poseKind === 'bucket') {
    if (id === ITEM.BOAT_ITEM) return buildBoatItem3D(isFirstPerson);
    if (id === ITEM.ELYTRA) return buildElytraItem3D(isFirstPerson);
  }

  const def = getItemDef(id);
  if (!def.isBlock || def.sprite) {
    const baseScale = poseKind === 'weapon' ? (isFirstPerson ? 0.54 : 0.56) : isFirstPerson ? 0.40 : 0.42;
    const thickness = poseKind === 'weapon' ? 1.35 : 1.24;
    const extruded = buildExtrudedItemMesh(id, baseScale, thickness);
    if (extruded) {
      const pivotGroup = new THREE.Group();
      if (poseKind === 'weapon') {
        extruded.position.set(baseScale * 0.31, baseScale * 0.31, 0);
      } else {
        extruded.position.set(0, baseScale * 0.08, 0);
      }
      pivotGroup.add(extruded);
      return pivotGroup;
    }
  }
  const blockObj = buildMiniBlockMesh(id, atlasTex, isFirstPerson ? 0.29 : 0.27, true);
  return blockObj;
}

export function disposeHeldMeshSafe(obj: THREE.Object3D) {
  obj.userData = { ...obj.userData, disposed: true };
  obj.traverse((ch) => {
    const mesh = ch as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry && !mesh.geometry.userData?.shared) {
      mesh.geometry.dispose();
    }
    const clearMat = (m: THREE.Material) => {
      // Preserve shared cached textures like cachedShieldPlankTex
      m.dispose();
    };
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(clearMat);
    } else if (mesh.material) {
      clearMat(mesh.material);
    }
  });
}

export type ArmorTierId = 'leather' | 'iron' | 'gold' | 'diamond' | 'netherite';

export interface ArmorTierTextures {
  helm: THREE.CanvasTexture;
  chest: THREE.CanvasTexture;
  legs: THREE.CanvasTexture;
  feet: THREE.CanvasTexture;
}

const ARMOR_TIER_PALETTE: Record<ArmorTierId, { base: string; hi: string; dark: string; trim: string; rivet: string }> = {
  leather: { base: '#a66238', hi: '#c98053', dark: '#6e3d1f', trim: '#d6b485', rivet: '#e2c99e' },
  iron: { base: '#cfd7e3', hi: '#f4f8ff', dark: '#7c8798', trim: '#9aa5b5', rivet: '#ffffff' },
  gold: { base: '#eab308', hi: '#fef08a', dark: '#a16207', trim: '#facc15', rivet: '#fffbeb' },
  diamond: { base: '#22d3ee', hi: '#a5f3fc', dark: '#0e7490', trim: '#38bdf8', rivet: '#ecfeff' },
  netherite: { base: '#443c46', hi: '#685d6b', dark: '#241e26', trim: '#ca8a04', rivet: '#a855f7' }
};

const cachedArmorTexByTier = new Map<ArmorTierId, ArmorTierTextures>();

export function getArmorTierId(itemId: number): ArmorTierId | null {
  if (
    itemId === ITEM.LEATHER_HELMET ||
    itemId === ITEM.LEATHER_CHESTPLATE ||
    itemId === ITEM.LEATHER_LEGGINGS ||
    itemId === ITEM.LEATHER_BOOTS
  ) {
    return 'leather';
  }
  if (
    itemId === ITEM.IRON_HELMET ||
    itemId === ITEM.IRON_CHESTPLATE ||
    itemId === ITEM.IRON_LEGGINGS ||
    itemId === ITEM.IRON_BOOTS
  ) {
    return 'iron';
  }
  if (
    itemId === ITEM.GOLD_HELMET ||
    itemId === ITEM.GOLD_CHESTPLATE ||
    itemId === ITEM.GOLD_LEGGINGS ||
    itemId === ITEM.GOLD_BOOTS
  ) {
    return 'gold';
  }
  if (
    itemId === ITEM.DIAMOND_HELMET ||
    itemId === ITEM.DIAMOND_CHESTPLATE ||
    itemId === ITEM.DIAMOND_LEGGINGS ||
    itemId === ITEM.DIAMOND_BOOTS
  ) {
    return 'diamond';
  }
  if (
    itemId === ITEM.NETHERITE_HELMET ||
    itemId === ITEM.NETHERITE_CHESTPLATE ||
    itemId === ITEM.NETHERITE_LEGGINGS ||
    itemId === ITEM.NETHERITE_BOOTS
  ) {
    return 'netherite';
  }
  return null;
}

export function getArmorTierTextures(tier: ArmorTierId): ArmorTierTextures {
  let set = cachedArmorTexByTier.get(tier);
  if (set) return set;
  const p = ARMOR_TIER_PALETTE[tier];

  const helm = makePixelTex(16, 16, (ctx) => {
    ctx.fillStyle = p.base;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = p.dark;
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillStyle = p.hi;
    ctx.fillRect(2, 3, 12, 3);
    ctx.fillStyle = p.trim;
    ctx.fillRect(0, 11, 16, 2);
    ctx.fillStyle = p.rivet;
    ctx.fillRect(2, 11, 2, 2);
    ctx.fillRect(12, 11, 2, 2);
  });

  const chest = makePixelTex(16, 16, (ctx) => {
    ctx.fillStyle = p.base;
    ctx.fillRect(0, 0, 16, 16);
    // Collar & lower plate edge
    ctx.fillStyle = p.dark;
    ctx.fillRect(4, 0, 8, 2);
    ctx.fillRect(0, 13, 16, 3);
    ctx.fillRect(7, 3, 2, 10);
    // Pectoral specular plates
    ctx.fillStyle = p.hi;
    ctx.fillRect(2, 3, 4, 4);
    ctx.fillRect(10, 3, 4, 4);
    // Trim & shoulder rivets
    ctx.fillStyle = p.trim;
    ctx.fillRect(1, 11, 14, 2);
    ctx.fillStyle = p.rivet;
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(13, 2, 1, 1);
    ctx.fillRect(3, 11, 2, 2);
    ctx.fillRect(11, 11, 2, 2);
  });

  const legs = makePixelTex(16, 16, (ctx) => {
    ctx.fillStyle = p.base;
    ctx.fillRect(0, 0, 16, 16);
    // Forged belt & buckle
    ctx.fillStyle = '#3b2818';
    ctx.fillRect(0, 0, 16, 4);
    ctx.fillStyle = p.trim;
    ctx.fillRect(6, 1, 4, 3);
    // Articulated thigh/knee greaves
    ctx.fillStyle = p.hi;
    ctx.fillRect(3, 5, 10, 3);
    ctx.fillStyle = p.dark;
    ctx.fillRect(2, 9, 12, 2);
    ctx.fillRect(0, 14, 16, 2);
  });

  const feet = makePixelTex(16, 16, (ctx) => {
    ctx.fillStyle = p.base;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = p.trim;
    ctx.fillRect(0, 1, 16, 2);
    ctx.fillStyle = p.hi;
    ctx.fillRect(3, 5, 10, 4);
    // Heavy sole tread
    ctx.fillStyle = '#262328';
    ctx.fillRect(0, 12, 16, 4);
    ctx.fillStyle = p.rivet;
    ctx.fillRect(6, 2, 4, 2);
  });

  set = { helm, chest, legs, feet };
  cachedArmorTexByTier.set(tier, set);
  return set;
}

export function applyArmorSlotMaterial(
  mat: THREE.MeshLambertMaterial | THREE.MeshStandardMaterial,
  itemId: number,
  part: keyof ArmorTierTextures,
  enchanted = false
): boolean {
  const tier = getArmorTierId(itemId);
  if (!tier) return false;
  const tex = getArmorTierTextures(tier)[part];
  if (mat.map !== tex) {
    mat.map = tex;
    mat.color.setHex(0xffffff);
    mat.needsUpdate = true;
  }
  if ('metalness' in mat) {
    mat.metalness = tier === 'leather' ? 0.12 : tier === 'diamond' ? 0.55 : 0.74;
    mat.roughness = tier === 'leather' ? 0.68 : tier === 'diamond' ? 0.18 : 0.26;
  }
  mat.userData.baseEmissive = enchanted ? 0x3b176e : 0x111827;
  mat.emissive.setHex(mat.userData.baseEmissive);
  return true;
}

export function orientThirdPersonHeldMesh(
  mesh: THREE.Object3D,
  itemId: number,
  isOffhand = false,
  inGlbPalmSocket = false
) {
  const kind = getHeldPoseKind(itemId);
  const side = isOffhand ? -1 : 1;
  const isSmooth3d = Boolean(mesh.userData?.smooth3d);
  mesh.position.set(0, 0, 0);

  // Anatomical Palm Socket Mode (`glbRig.rightHandSocket` / `leftHandSocket`):
  // Socket axes are ALREADY aligned to the real forearm & palm:
  //   -Z = forearm forward direction, +Y = thumb/palm-up, +X = hand lateral!
  // Weapons have +Y shaft & -Z cutting edge, so only a natural ~16 deg forward wrist tilt is needed!
  if (inGlbPalmSocket) {
    if (kind === 'shield') {
      // Forearm-Parallel Bracer Alignment (`leftHandSocket` / `rightHandSocket`):
      // Socket +Z points down `elbow -> wrist`, `-Z` points UP the forearm (`wrist -> elbow`),
      // `+Y` points FORWARD in front of the character, and `-X` (`outSign = -1`) points OUTWARD-LEFT.
      // Angle shield crest 63° forward + 27° outward (`vFront = (0.46 * outSign, 0.89, 0)`) so the front face
      // guards the torso/forearm naturally with zero exposed inner hand or wrist clipping!
      const outSign = isOffhand ? -1 : 1;
      const vUp = new THREE.Vector3(0, 0.18, -0.9836).normalize();
      const vFront = new THREE.Vector3(0.46 * outSign, 0.89, 0);
      vFront.addScaledVector(vUp, -vFront.dot(vUp)).normalize();
      const vRight = new THREE.Vector3().crossVectors(vUp, vFront).normalize();
      const shieldBasis = new THREE.Matrix4().makeBasis(vRight, vUp, vFront);
      mesh.quaternion.setFromRotationMatrix(shieldBasis);
      mesh.position
        .copy(vFront)
        .multiplyScalar(0.112)
        .addScaledVector(vUp, -0.02);
    } else if (kind === 'crossbow' || kind === 'grapple' || kind === 'spyglass') {
      mesh.position.set(0, 0.01, -0.03);
      mesh.rotation.set(-0.08, 0, 0);
    } else if (kind === 'bow') {
      mesh.position.set(0, 0.0, -0.015);
      mesh.rotation.set(-0.14, 0.06 * side, 0);
    } else if (kind === 'rod') {
      mesh.position.set(0, 0.0, -0.015);
      mesh.rotation.set(-0.26, 0.05 * side, 0);
    } else if (kind === 'polearm' || (isSmooth3d && kind === 'weapon')) {
      // Hilt cross-section is already centered at (0,0,0); keep natural ~10° forward wrist pitch inside closed palm!
      mesh.position.set(0, 0.005, -0.008);
      mesh.rotation.set(-0.18, 0, 0);
    } else if (kind === 'weapon') {
      mesh.position.set(0, 0.005, -0.008);
      mesh.rotation.set(-0.18, -Math.PI * 0.5, 0.76);
    } else if (kind === 'torch' || kind === 'totem' || kind === 'potion' || kind === 'bucket' || kind === 'orb' || isSmooth3d) {
      mesh.position.set(0, 0.0, -0.015);
      mesh.rotation.set(-0.16, 0.10 * side, 0);
    } else if (kind === 'flat_item') {
      mesh.position.set(0, 0.02, -0.03);
      mesh.rotation.set(-0.22, -0.45 * side, 0.08 * side);
    } else {
      const hasPlusZFront =
        itemId === BLOCK.CHEST ||
        itemId === BLOCK.FURNACE ||
        itemId === BLOCK.FURNACE_LIT ||
        itemId === BLOCK.CARVED_PUMPKIN ||
        itemId === BLOCK.JACK_O_LANTERN;
      mesh.position.set(0, 0.02, -0.06);
      mesh.rotation.set(-0.12, (hasPlusZFront ? Math.PI : 0) + 0.45 * side, 0);
    }
    return;
  }

  // Mojang Boxy Arm Pivot Mode (`armRPivot` / `armLPivot` pointing down -Y):
  if (kind === 'shield') {
    if (isOffhand) {
      mesh.position.set(-0.08, 0.08, -0.10);
      mesh.rotation.set(-0.18, -Math.PI + 0.48, 0.06);
    } else {
      mesh.position.set(0.08, 0.08, -0.10);
      mesh.rotation.set(-0.18, Math.PI - 0.48, -0.06);
    }
  } else if (kind === 'crossbow' || kind === 'grapple' || kind === 'spyglass') {
    mesh.position.set(0, 0.02, -0.04);
    mesh.rotation.set(-0.42, -0.10 * side, 0);
  } else if (kind === 'bow') {
    mesh.position.set(0, 0.02, -0.03);
    mesh.rotation.set(-0.42, 0.18 * side, 0.12 * side);
  } else if (kind === 'rod') {
    mesh.position.set(0, 0.02, -0.03);
    mesh.rotation.set(-0.48, 0.18 * side, 0);
  } else if (kind === 'polearm' || (isSmooth3d && kind === 'weapon')) {
    mesh.position.set(0, -0.02, -0.02);
    mesh.rotation.set(-1.12, 0.08 * side, 0.04 * side);
  } else if (kind === 'weapon') {
    mesh.position.set(0, -0.01, -0.02);
    mesh.rotation.set(-0.82, isOffhand ? -1.88 : -1.24, 0.72);
  } else if (kind === 'torch' || kind === 'totem' || kind === 'potion' || kind === 'bucket' || kind === 'orb' || isSmooth3d) {
    mesh.position.set(0, -0.01, -0.03);
    mesh.rotation.set(-0.48, 0.24 * side, 0.04 * side);
  } else if (kind === 'flat_item') {
    mesh.position.set(0, 0.04, -0.04);
    mesh.rotation.set(-0.32, -0.56 * side, 0.14 * side);
  } else {
    const hasPlusZFront =
      itemId === BLOCK.CHEST ||
      itemId === BLOCK.FURNACE ||
      itemId === BLOCK.FURNACE_LIT ||
      itemId === BLOCK.CARVED_PUMPKIN ||
      itemId === BLOCK.JACK_O_LANTERN;
    mesh.position.set(0, 0.02, -0.05);
    mesh.rotation.set(-0.18, (hasPlusZFront ? Math.PI : 0) + 0.62 * side, 0.06 * side);
  }
}

export function getArmorHexColor(itemId: number): number | null {
  if (
    itemId === ITEM.LEATHER_HELMET ||
    itemId === ITEM.LEATHER_CHESTPLATE ||
    itemId === ITEM.LEATHER_LEGGINGS ||
    itemId === ITEM.LEATHER_BOOTS
  ) {
    return 0xa66238;
  }
  if (
    itemId === ITEM.IRON_HELMET ||
    itemId === ITEM.IRON_CHESTPLATE ||
    itemId === ITEM.IRON_LEGGINGS ||
    itemId === ITEM.IRON_BOOTS
  ) {
    return 0xdce3ec;
  }
  if (
    itemId === ITEM.GOLD_HELMET ||
    itemId === ITEM.GOLD_CHESTPLATE ||
    itemId === ITEM.GOLD_LEGGINGS ||
    itemId === ITEM.GOLD_BOOTS
  ) {
    return 0xfacc15;
  }
  if (
    itemId === ITEM.DIAMOND_HELMET ||
    itemId === ITEM.DIAMOND_CHESTPLATE ||
    itemId === ITEM.DIAMOND_LEGGINGS ||
    itemId === ITEM.DIAMOND_BOOTS
  ) {
    return 0x38e8df;
  }
  if (
    itemId === ITEM.NETHERITE_HELMET ||
    itemId === ITEM.NETHERITE_CHESTPLATE ||
    itemId === ITEM.NETHERITE_LEGGINGS ||
    itemId === ITEM.NETHERITE_BOOTS
  ) {
    return 0x48414a;
  }
  return null;
}

let cachedElytraTex: THREE.CanvasTexture | null = null;
function getElytraTexture(): THREE.CanvasTexture {
  if (cachedElytraTex) return cachedElytraTex;
  cachedElytraTex = makePixelTex(12, 20, (ctx) => {
    // Outer phantom chitin border
    ctx.fillStyle = '#3f3d4c';
    ctx.fillRect(1, 0, 10, 18);
    ctx.fillRect(0, 2, 11, 14);
    // Mid slate wing membrane
    ctx.fillStyle = '#6c6a80';
    ctx.fillRect(2, 1, 8, 16);
    ctx.fillStyle = '#8b89a1';
    ctx.fillRect(3, 2, 6, 12);
    // Upper shoulder clasp & inner highlight ribs
    ctx.fillStyle = '#b4b2c8';
    ctx.fillRect(3, 1, 5, 3);
    ctx.fillRect(4, 5, 2, 8);
    ctx.fillStyle = '#525064';
    ctx.fillRect(2, 14, 7, 3);
    ctx.fillRect(6, 7, 2, 7);
  });
  return cachedElytraTex;
}

// Shared Mojang 1.8 Boxy Geometries (8:12:4 proportions, 32px = 1.80m, 0 GC allocation per character swap)
let _mcHeadGeo: THREE.BufferGeometry | null = null;
let _mcHatGeo: THREE.BufferGeometry | null = null;
let _mcSnoutGeo: THREE.BufferGeometry | null = null;
let _mcTorsoGeo: THREE.BufferGeometry | null = null;
let _mcJacketGeo: THREE.BufferGeometry | null = null;
let _mcArmSteveGeo: THREE.BufferGeometry | null = null;
let _mcArmAlexGeo: THREE.BufferGeometry | null = null;
let _mcSleeveSteveGeo: THREE.BufferGeometry | null = null;
let _mcSleeveAlexGeo: THREE.BufferGeometry | null = null;
let _mcLegGeo: THREE.BufferGeometry | null = null;
let _mcPantsGeo: THREE.BufferGeometry | null = null;
let _mcCapeGeo: THREE.BufferGeometry | null = null;
let _mcCrownFBGeo: THREE.BufferGeometry | null = null;
let _mcCrownLRGeo: THREE.BufferGeometry | null = null;
let _mcCrownToothGeo: THREE.BufferGeometry | null = null;
let _mcCrownGemGeo: THREE.BufferGeometry | null = null;

const MC_BOXY_GEOS = {
  head: () => (_mcHeadGeo ??= new THREE.BoxGeometry(0.45, 0.45, 0.45)),
  hat: () => (_mcHatGeo ??= new THREE.BoxGeometry(0.488, 0.488, 0.488)),
  snout: () => (_mcSnoutGeo ??= new THREE.BoxGeometry(0.16, 0.105, 0.048)),
  crownFB: () => (_mcCrownFBGeo ??= new THREE.BoxGeometry(0.512, 0.088, 0.036)),
  crownLR: () => (_mcCrownLRGeo ??= new THREE.BoxGeometry(0.036, 0.088, 0.44)),
  crownTooth: () => (_mcCrownToothGeo ??= new THREE.BoxGeometry(0.075, 0.062, 0.036)),
  crownGem: () => (_mcCrownGemGeo ??= new THREE.BoxGeometry(0.052, 0.052, 0.024)),
  torso: () => (_mcTorsoGeo ??= new THREE.BoxGeometry(0.45, 0.68, 0.225)),
  jacket: () => (_mcJacketGeo ??= new THREE.BoxGeometry(0.478, 0.698, 0.252)),
  armSteve: () => (_mcArmSteveGeo ??= new THREE.BoxGeometry(0.225, 0.68, 0.225).translate(0, -0.26, 0)),
  armAlex: () => (_mcArmAlexGeo ??= new THREE.BoxGeometry(0.172, 0.68, 0.225).translate(0, -0.26, 0)),
  sleeveSteve: () => (_mcSleeveSteveGeo ??= new THREE.BoxGeometry(0.250, 0.698, 0.250).translate(0, -0.26, 0)),
  sleeveAlex: () => (_mcSleeveAlexGeo ??= new THREE.BoxGeometry(0.196, 0.698, 0.250).translate(0, -0.26, 0)),
  leg: () => (_mcLegGeo ??= new THREE.BoxGeometry(0.225, 0.68, 0.225).translate(0, -0.34, 0)),
  pants: () => (_mcPantsGeo ??= new THREE.BoxGeometry(0.248, 0.696, 0.248).translate(0, -0.34, 0)),
  cape: () => (_mcCapeGeo ??= new THREE.BoxGeometry(0.54, 0.86, 0.048).translate(0, -0.43, 0))
};

let cachedGroundShadowTex: THREE.CanvasTexture | null = null;
let sharedShadowPlaneGeo: THREE.PlaneGeometry | null = null;

function getSharedGroundShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (cachedGroundShadowTex) return cachedGroundShadowTex;
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0.0, 'rgba(6, 10, 16, 0.62)');
  grad.addColorStop(0.38, 'rgba(8, 12, 20, 0.42)');
  grad.addColorStop(0.72, 'rgba(10, 15, 24, 0.16)');
  grad.addColorStop(1.0, 'rgba(10, 15, 24, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.shared = true;
  tex.needsUpdate = true;
  cachedGroundShadowTex = tex;
  return tex;
}

function getSharedGroundShadowGeo(): THREE.PlaneGeometry {
  if (!sharedShadowPlaneGeo) {
    sharedShadowPlaneGeo = new THREE.PlaneGeometry(1, 1);
    sharedShadowPlaneGeo.rotateX(-Math.PI / 2);
    sharedShadowPlaneGeo.userData.shared = true;
  }
  return sharedShadowPlaneGeo;
}

export class VoxelCharacter {
  public root = new THREE.Group();
  private groundShadowGroup = new THREE.Group();
  private coreShadowMesh!: THREE.Mesh;
  private coreShadowMat!: THREE.MeshBasicMaterial;
  private footShadowL!: THREE.Mesh;
  private footShadowR!: THREE.Mesh;
  private footShadowMat!: THREE.MeshBasicMaterial;
  private groundAirGap = 0;
  private groundLightFactor = 1.0;
  private headPivot = new THREE.Group();
  private headMesh: THREE.Mesh;
  private headDecorHolder = new THREE.Group();
  private hairHolder = new THREE.Group();
  private bodyGroup = new THREE.Group();
  private torsoMesh: THREE.Mesh;
  private torsoDetailHolder = new THREE.Group();
  private armLMesh: THREE.Mesh;
  private armRMesh: THREE.Mesh;
  private armLDetailHolder = new THREE.Group();
  private armRDetailHolder = new THREE.Group();
  private legLMesh: THREE.Mesh;
  private legRMesh: THREE.Mesh;
  private legLDetailHolder = new THREE.Group();
  private legRDetailHolder = new THREE.Group();
  private capePivot = new THREE.Group();
  private capeMesh: THREE.Mesh;
  private armLPivot = new THREE.Group();
  private armRPivot = new THREE.Group();
  private legLPivot = new THREE.Group();
  private legRPivot = new THREE.Group();
  private heldMount = new THREE.Group();
  private heldMesh: THREE.Object3D | null = null;
  private offhandMount = new THREE.Group();
  private offhandMesh: THREE.Object3D | null = null;
  private hasOffhandShield = false;
  private nametagSprite: THREE.Sprite | null = null;
  private currentHeldId = -1;
  private currentHeldLoaded = false;
  private currentOffhandId = -1;
  private currentOffhandLoaded = false;
  private currentArmorKey = '0,0,0,0';
  private currentVisualId = '__uninit__';
  private idleClock = Math.random() * 10;
  private defaultShowCape = false;
  public poseMode: 'none' | 'bow' | 'crossbow' | 'trident' | 'spear' | 'spyglass' | 'eat' = 'none';
  public eatingOffhand = false;

  private headArmorGroup = new THREE.Group();
  private chestArmorMesh: THREE.Mesh;
  private armLArmorMesh: THREE.Mesh;
  private armRArmorMesh: THREE.Mesh;
  private beltArmorMesh: THREE.Mesh;
  private legLArmorMesh: THREE.Mesh;
  private legRArmorMesh: THREE.Mesh;
  private bootLArmorMesh: THREE.Mesh;
  private bootRArmorMesh: THREE.Mesh;

  private headArmorMat: THREE.MeshStandardMaterial;
  private chestArmorMat: THREE.MeshStandardMaterial;
  private legsArmorMat: THREE.MeshStandardMaterial;
  private feetArmorMat: THREE.MeshStandardMaterial;

  // Multiverse Character Smooth 3D Accessories
  private hornMat: THREE.MeshStandardMaterial;
  private wingMat: THREE.MeshStandardMaterial;
  private elytraMat: THREE.MeshStandardMaterial;
  private hornSingleMesh: THREE.Mesh;
  private hornLeftMesh: THREE.Mesh;
  private hornRightMesh: THREE.Mesh;
  private crownGroup = new THREE.Group();
  private strawHatGroup = new THREE.Group();
  private headbandGroup = new THREE.Group();
  private hollowMaskGroup = new THREE.Group();
  private haloGroup = new THREE.Group();
  private wingLPivot = new THREE.Group();
  private wingRPivot = new THREE.Group();
  private elytraLPivot = new THREE.Group();
  private elytraRPivot = new THREE.Group();

  private skinTexs: THREE.Texture[] = [];
  private skinMats: Array<THREE.MeshStandardMaterial | THREE.MeshLambertMaterial> = [];
  private ownedGeos: THREE.BufferGeometry[] = [];
  private ownedMats: THREE.Material[] = [];
  private spriteMat: THREE.SpriteMaterial | null = null;
  private ownedTexs: THREE.Texture[] = [];

  private slimeGroup = new THREE.Group();
  private slimeOuter!: THREE.Mesh;
  private slimeCore!: THREE.Mesh;
  private slimeOuterMat!: THREE.MeshStandardMaterial;
  private slimeCoreMat!: THREE.MeshStandardMaterial;
  public slimeForm = false;

  private glbHolder = new THREE.Group();
  private glbRig: GlbAnimatedRig | null = null;
  private glbLoadToken = 0;
  private currentGlbKey = '';
  private isMinecraftBoxyMode = false;
  private isSlimMinecraftArm = false;
  private smoothCapeGeo!: THREE.BufferGeometry;
  private disposed = false;

  public readonly renderedName: string;
  public readonly renderedColor: string;
  public targetPos = new THREE.Vector3();
  public targetYaw = 0;
  public targetPitch = 0;
  public walkPhase = 0;
  public swingTimer = 0;
  public hurtTimer = 0;
  public sneaking = false;
  public blocking = false;
  public gliding = false;
  public swimming = false;
  public readonly bonePose: DirectBonePoseState = createDefaultBonePoseState();
  private atlasTex: THREE.CanvasTexture;

  constructor(name: string, accentHex: string, atlasTex: THREE.CanvasTexture, showNametag = true) {
    this.renderedName = name;
    this.renderedColor = accentHex;
    this.atlasTex = atlasTex;

    const rig = buildSculptedCharacterProfileRig(accentHex, null);
    this.skinTexs.push(...rig.textures);
    this.skinMats.push(...rig.materials);
    this.defaultShowCape = rig.showCape;

    const mkArmorMat = () => {
      const m = new THREE.MeshStandardMaterial({ color: 0xdce3ec, metalness: 0.65, roughness: 0.28, emissive: 0x111827 });
      m.userData.baseEmissive = 0x111827;
      return m;
    };
    this.headArmorMat = mkArmorMat();
    this.chestArmorMat = mkArmorMat();
    this.legsArmorMat = mkArmorMat();
    this.feetArmorMat = mkArmorMat();

    this.hornMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.55, roughness: 0.26, emissive: 0x3b1c08 });
    this.hornMat.userData.baseEmissive = 0x3b1c08;
    this.wingMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.25,
      roughness: 0.35,
      emissive: 0x141038,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    this.wingMat.userData.baseEmissive = 0x141038;
    this.elytraMat = new THREE.MeshStandardMaterial({
      map: getElytraTexture(),
      roughness: 0.48,
      metalness: 0.20,
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide
    });
    this.elytraMat.userData.baseEmissive = 0x000000;
    this.ownedMats.push(
      this.headArmorMat,
      this.chestArmorMat,
      this.legsArmorMat,
      this.feetArmorMat,
      this.hornMat,
      this.wingMat,
      this.elytraMat
    );

    // 1. Heroic 1:7.0 Anatomical Anime Skull, 3D Nose/Jaw/Cheeks & 512x512 Subsurface Face + Layered Blade Hair
    this.headMesh = new THREE.Mesh(CHAR_GEOS.head(), [rig.skinMat, rig.faceMat]);
    this.headMesh.position.y = 0.14;
    this.headDecorHolder.add(rig.headDecorGroup);
    this.hairHolder.add(rig.hairGroup);
    this.headPivot.position.set(0, 1.48, 0);
    this.headPivot.add(this.headMesh, this.headDecorHolder, this.hairHolder);

    // Curved Sculpted 3D Horns (1:7 cranial proportions)
    this.hornSingleMesh = new THREE.Mesh(CHAR_GEOS.horn(), this.hornMat);
    this.hornSingleMesh.position.set(0, 0.275, -0.095);
    this.hornSingleMesh.scale.setScalar(0.68);
    this.hornSingleMesh.rotation.x = -0.22;
    this.hornSingleMesh.visible = false;

    this.hornLeftMesh = new THREE.Mesh(CHAR_GEOS.horn(), this.hornMat);
    this.hornLeftMesh.position.set(-0.068, 0.268, -0.072);
    this.hornLeftMesh.scale.setScalar(0.66);
    this.hornLeftMesh.rotation.set(-0.18, 0, 0.32);
    this.hornLeftMesh.visible = false;

    this.hornRightMesh = new THREE.Mesh(CHAR_GEOS.horn(), this.hornMat);
    this.hornRightMesh.position.set(0.068, 0.268, -0.072);
    this.hornRightMesh.scale.setScalar(0.66);
    this.hornRightMesh.rotation.set(-0.18, 0, -0.32);
    this.hornRightMesh.visible = false;

    // Smooth 3D Accessories Materials
    const rubyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.35, roughness: 0.16, emissive: 0x7f1d1d });
    rubyMat.userData.baseEmissive = 0x7f1d1d;
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.08, roughness: 0.68, emissive: 0x291d02 });
    strawMat.userData.baseEmissive = 0x291d02;
    const strawBandMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.12, roughness: 0.52, emissive: 0x3b0808 });
    strawBandMat.userData.baseEmissive = 0x3b0808;
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.18, emissive: 0x1e293b });
    plateMat.userData.baseEmissive = 0x1e293b;
    const clothBandMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.12, roughness: 0.62, emissive: 0x090d16 });
    clothBandMat.userData.baseEmissive = 0x090d16;
    const boneMaskMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.10, roughness: 0.34, emissive: 0x1e293b });
    boneMaskMat.userData.baseEmissive = 0x1e293b;
    const haloGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, metalness: 0.30, roughness: 0.20, emissive: 0xeab308 });
    haloGlowMat.userData.baseEmissive = 0xeab308;
    this.ownedMats.push(rubyMat, strawMat, strawBandMat, plateMat, clothBandMat, boneMaskMat, haloGlowMat);

    // Smooth Royal Golden Circlet Crown + 5 Spires + Ruby Gem (1:7 skull fit)
    const crownRing = new THREE.Mesh(CHAR_GEOS.tor(0.106, 0.011, 10, 26), this.hornMat);
    crownRing.position.set(0, 0.255, 0.005);
    crownRing.rotation.x = Math.PI / 2;
    this.crownGroup.add(crownRing);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI;
      const sp = new THREE.Mesh(CHAR_GEOS.cone(0.013, 0.052, 10), this.hornMat);
      sp.position.set(Math.sin(a) * 0.106, 0.288, Math.cos(a) * 0.106 + 0.005);
      this.crownGroup.add(sp);
    }
    const crownGem = new THREE.Mesh(CHAR_GEOS.sph(0.016, 12, 10), rubyMat);
    crownGem.position.set(0, 0.262, -0.108);
    this.crownGroup.add(crownGem);
    this.crownGroup.visible = false;

    // One Piece Sculpted Straw Hat (Wide Curved Brim + Crimson Ribbon + Woven Dome; slung behind neck in Gear 5!)
    const shBrim = new THREE.Mesh(CHAR_GEOS.cyl(0.215, 0.228, 0.014, 28), strawMat);
    shBrim.position.set(0, 0.235, 0.005);
    const shBand = new THREE.Mesh(CHAR_GEOS.cyl(0.120, 0.123, 0.032, 26), strawBandMat);
    shBand.position.set(0, 0.252, 0.005);
    const shDome = new THREE.Mesh(CHAR_GEOS.sph(0.118, 24, 16), strawMat);
    shDome.position.set(0, 0.258, 0.005);
    shDome.scale.set(1.0, 0.72, 1.0);
    this.strawHatGroup.add(shBrim, shBand, shDome);
    this.strawHatGroup.visible = false;

    // Naruto Wraparound Shinobi Forehead Protector + Curved Steel Leaf Plate (sits cleanly on forehead y=0.205 above eyes!)
    const hbBand = new THREE.Mesh(CHAR_GEOS.cyl(0.112, 0.110, 0.034, 28), clothBandMat);
    hbBand.position.set(0, 0.206, 0.004);
    hbBand.scale.set(0.92, 1.0, 1.02);
    const hbPlate = new THREE.Mesh(CHAR_GEOS.cyl(0.115, 0.115, 0.026, 22), plateMat);
    hbPlate.position.set(0, 0.206, -0.008);
    hbPlate.scale.set(0.64, 1.0, 0.99);
    const hbKnot = new THREE.Mesh(CHAR_GEOS.sph(0.019, 10, 8), clothBandMat);
    hbKnot.position.set(0, 0.20, 0.122);
    const hbTail1 = new THREE.Mesh(CHAR_GEOS.cap(0.009, 0.095, 6, 8), clothBandMat);
    hbTail1.position.set(-0.028, 0.145, 0.132);
    hbTail1.rotation.set(0.24, 0, 0.28);
    const hbTail2 = new THREE.Mesh(CHAR_GEOS.cap(0.009, 0.095, 6, 8), clothBandMat);
    hbTail2.position.set(0.028, 0.145, 0.132);
    hbTail2.rotation.set(0.24, 0, -0.28);
    this.headbandGroup.add(hbBand, hbPlate, hbKnot, hbTail1, hbTail2);
    this.headbandGroup.visible = false;

    // Bleach True Bankai (Horn of Salvation) Asymmetrical Bone Temple Visor + Sweeping Crimson-Striped Hollow Horn!
    // Keeps Ichigo's entire face & dual Hollow/Shinigami eyes 100% uncovered and fierce!
    const hmTemple = new THREE.Mesh(CHAR_GEOS.sph(0.050, 16, 12), boneMaskMat);
    hmTemple.position.set(0.052, 0.214, -0.068);
    hmTemple.scale.set(0.95, 0.72, 0.44);
    const hmHorn = new THREE.Mesh(CHAR_GEOS.horn(), boneMaskMat);
    hmHorn.position.set(0.064, 0.238, -0.076);
    hmHorn.scale.set(0.76, 1.32, 0.76);
    hmHorn.rotation.set(-0.30, 0.12, -0.20);
    const hmStripe1 = new THREE.Mesh(CHAR_GEOS.cap(0.0075, 0.12, 6, 8), strawBandMat);
    hmStripe1.position.set(0.070, 0.295, -0.102);
    hmStripe1.rotation.set(-0.30, 0.12, -0.20);
    this.hollowMaskGroup.add(hmTemple, hmHorn, hmStripe1);
    this.hollowMaskGroup.visible = false;

    // Dragon Ball Floating Golden Angel Halo Torus
    const haloRing = new THREE.Mesh(CHAR_GEOS.tor(0.112, 0.011, 12, 28), haloGlowMat);
    haloRing.position.set(0, 0.43, 0.01);
    haloRing.rotation.x = Math.PI / 2;
    this.haloGroup.add(haloRing);
    this.haloGroup.visible = false;

    this.headPivot.add(
      this.hornSingleMesh,
      this.hornLeftMesh,
      this.hornRightMesh,
      this.crownGroup,
      this.strawHatGroup,
      this.headbandGroup,
      this.hollowMaskGroup,
      this.haloGroup
    );

    // Smooth Curved 3D Knight Barbute Helmet Shell (Open Face, 1:7 proportions)
    const helmDome = new THREE.Mesh(CHAR_GEOS.sph(0.132, 22, 16), this.headArmorMat);
    helmDome.position.set(0, 0.165, 0.012);
    helmDome.scale.set(0.96, 1.04, 1.04);
    const helmRim = new THREE.Mesh(CHAR_GEOS.tor(0.120, 0.013, 10, 24, Math.PI * 1.35), this.headArmorMat);
    helmRim.position.set(0, 0.195, 0.005);
    helmRim.rotation.set(Math.PI / 2, 0, -Math.PI * 0.175);
    this.headArmorGroup.add(helmDome, helmRim);
    this.headArmorGroup.visible = false;
    this.headPivot.add(this.headArmorGroup);
    this.root.add(this.headPivot);

    // 2. Heroic 1:7 Lofted Anatomical V-Taper Torso (Pectorals,Ribcage, Waist, Pelvis, Outfit Garments, Cape & Wings)
    this.bodyGroup.position.set(0, 1.00, 0);
    this.torsoMesh = new THREE.Mesh(CHAR_GEOS.torso(), rig.shirtMat);
    this.torsoDetailHolder.add(rig.torsoDetailGroup);
    this.bodyGroup.add(this.torsoMesh, this.torsoDetailHolder);

    // Smooth Curved Flowing Hero Cape
    const capeGeo = new THREE.CylinderGeometry(0.155, 0.25, 0.82, 18, 1, true, -Math.PI * 0.38, Math.PI * 0.76);
    this.smoothCapeGeo = capeGeo;
    this.ownedGeos.push(capeGeo);
    this.capeMesh = new THREE.Mesh(capeGeo, rig.capeMat);
    this.capeMesh.position.set(0, -0.40, -0.05);
    this.capeMesh.scale.set(1.12, 1.0, 0.42);
    this.capePivot.position.set(0, 0.40, 0.11);
    this.capePivot.rotation.x = 0.14;
    this.capePivot.visible = this.defaultShowCape;
    this.capePivot.add(this.capeMesh);
    this.bodyGroup.add(this.capePivot);

    // Smooth Curved Cuirass Chestplate & Tasset Belt Armor
    this.chestArmorMesh = new THREE.Mesh(CHAR_GEOS.cyl(0.192, 0.160, 0.48, 22), this.chestArmorMat);
    this.chestArmorMesh.position.set(0, 0.18, 0);
    this.chestArmorMesh.scale.set(1.06, 1.0, 0.78);
    this.chestArmorMesh.visible = false;
    this.bodyGroup.add(this.chestArmorMesh);

    this.beltArmorMesh = new THREE.Mesh(CHAR_GEOS.cyl(0.164, 0.174, 0.15, 20), this.legsArmorMat);
    this.beltArmorMesh.position.set(0, -0.06, 0);
    this.beltArmorMesh.scale.set(1.06, 1.0, 0.78);
    this.beltArmorMesh.visible = false;
    this.bodyGroup.add(this.beltArmorMesh);

    // Sculpted 3D Demon / Dragon / Angel Wings
    const wingMeshL = new THREE.Mesh(CHAR_GEOS.wing(), this.wingMat);
    wingMeshL.scale.set(-1, 1, 1);
    this.wingLPivot.position.set(-0.07, 0.28, 0.11);
    this.wingLPivot.add(wingMeshL);
    this.wingLPivot.visible = false;

    const wingMeshR = new THREE.Mesh(CHAR_GEOS.wing(), this.wingMat);
    this.wingRPivot.position.set(0.07, 0.28, 0.11);
    this.wingRPivot.add(wingMeshR);
    this.wingRPivot.visible = false;
    this.bodyGroup.add(this.wingLPivot, this.wingRPivot);

    // Sculpted Curved 3D Elytra Glider Wings (mounted on root so Elytra works seamlessly with Sketchfab GLB characters too!)
    const elytraWingL = new THREE.Mesh(CHAR_GEOS.wing(), this.elytraMat);
    elytraWingL.scale.set(-0.62, 0.95, 0.8);
    elytraWingL.rotation.z = 0.65;
    this.elytraLPivot.position.set(-0.05, 1.36, 0.14);
    this.elytraLPivot.add(elytraWingL);
    this.elytraLPivot.visible = false;

    const elytraWingR = new THREE.Mesh(CHAR_GEOS.wing(), this.elytraMat);
    elytraWingR.scale.set(0.62, 0.95, 0.8);
    elytraWingR.rotation.z = -0.65;
    this.elytraRPivot.position.set(0.05, 1.36, 0.14);
    this.elytraRPivot.add(elytraWingR);
    this.elytraRPivot.visible = false;
    this.root.add(this.elytraLPivot, this.elytraRPivot);

    this.root.add(this.bodyGroup);

    // 3. Continuous Lofted Anatomical Arms (Deltoid -> Bicep -> Forearm -> Wrist + Outfit Sleeves + 5-Finger Hands)
    this.armLMesh = new THREE.Mesh(CHAR_GEOS.bareArm(), rig.skinMat);
    this.armLDetailHolder.add(rig.armLDetailGroup);
    this.armLArmorMesh = new THREE.Mesh(CHAR_GEOS.sph(0.092, 16, 12), this.chestArmorMat);
    this.armLArmorMesh.position.set(-0.01, -0.04, 0);
    this.armLArmorMesh.scale.set(1.06, 1.22, 1.02);
    this.armLArmorMesh.visible = false;
    this.armLPivot.position.set(-0.215, 1.35, 0);
    this.offhandMount.position.set(-0.01, -0.53, -0.05);
    this.armLPivot.add(
      this.armLMesh,
      this.armLDetailHolder,
      this.armLArmorMesh,
      this.offhandMount
    );
    this.root.add(this.armLPivot);

    this.armRMesh = new THREE.Mesh(CHAR_GEOS.bareArm(), rig.skinMat);
    this.armRDetailHolder.add(rig.armRDetailGroup);
    this.armRArmorMesh = new THREE.Mesh(CHAR_GEOS.sph(0.092, 16, 12), this.chestArmorMat);
    this.armRArmorMesh.position.set(0.01, -0.04, 0);
    this.armRArmorMesh.scale.set(1.06, 1.22, 1.02);
    this.armRArmorMesh.visible = false;
    this.armRPivot.position.set(0.215, 1.35, 0);
    this.heldMount.position.set(0.01, -0.53, -0.05);
    this.armRPivot.add(
      this.armRMesh,
      this.armRDetailHolder,
      this.armRArmorMesh,
      this.heldMount
    );
    this.root.add(this.armRPivot);

    // 4. Continuous Lofted Anatomical Legs (0.88m Thigh -> Knee -> Calf + Pleated Gi/Hakama Trousers & Grounded Boots)
    this.legLMesh = new THREE.Mesh(CHAR_GEOS.leg(), rig.pantsMat);
    this.legLMesh.visible = !rig.hideBaseLegs;
    this.legLDetailHolder.add(rig.legLDetailGroup);
    this.legLArmorMesh = new THREE.Mesh(CHAR_GEOS.cyl(0.088, 0.076, 0.48, 18), this.legsArmorMat);
    this.legLArmorMesh.position.set(0, -0.28, 0);
    this.legLArmorMesh.visible = false;
    this.bootLArmorMesh = new THREE.Mesh(CHAR_GEOS.cyl(0.078, 0.084, 0.24, 18), this.feetArmorMat);
    this.bootLArmorMesh.position.set(0, -0.74, -0.01);
    this.bootLArmorMesh.visible = false;
    this.legLPivot.position.set(-0.102, 0.88, 0);
    this.legLPivot.add(
      this.legLMesh,
      this.legLDetailHolder,
      this.legLArmorMesh,
      this.bootLArmorMesh
    );
    this.root.add(this.legLPivot);

    this.legRMesh = new THREE.Mesh(CHAR_GEOS.leg(), rig.pantsMat);
    this.legRMesh.visible = !rig.hideBaseLegs;
    this.legRDetailHolder.add(rig.legRDetailGroup);
    this.legRArmorMesh = new THREE.Mesh(CHAR_GEOS.cyl(0.088, 0.076, 0.48, 18), this.legsArmorMat);
    this.legRArmorMesh.position.set(0, -0.28, 0);
    this.legRArmorMesh.visible = false;
    this.bootRArmorMesh = new THREE.Mesh(CHAR_GEOS.cyl(0.078, 0.084, 0.24, 18), this.feetArmorMat);
    this.bootRArmorMesh.position.set(0, -0.74, -0.01);
    this.bootRArmorMesh.visible = false;
    this.legRPivot.position.set(0.102, 0.88, 0);
    this.legRPivot.add(
      this.legRMesh,
      this.legRDetailHolder,
      this.legRArmorMesh,
      this.bootRArmorMesh
    );
    this.root.add(this.legRPivot);

    // 5. Smooth Squishy 3D Translucent Rimuru Slime Form
    this.slimeOuterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.12,
      roughness: 0.14,
      emissive: 0x0c4a6e,
      transparent: true,
      opacity: 0.84
    });
    this.slimeOuterMat.userData.baseEmissive = 0x0c4a6e;
    this.slimeCoreMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      metalness: 0.20,
      roughness: 0.20,
      emissive: 0x38bdf8
    });
    this.slimeCoreMat.userData.baseEmissive = 0x38bdf8;
    const slimeEyeMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      metalness: 0.25,
      roughness: 0.22,
      emissive: 0xfacc15
    });
    slimeEyeMat.userData.baseEmissive = 0xfacc15;
    this.ownedMats.push(this.slimeOuterMat, this.slimeCoreMat, slimeEyeMat);

    this.slimeOuter = new THREE.Mesh(CHAR_GEOS.slime(), this.slimeOuterMat);
    this.slimeOuter.position.set(0, 0.30, 0);
    this.slimeCore = new THREE.Mesh(CHAR_GEOS.sph(0.16, 20, 16), this.slimeCoreMat);
    this.slimeCore.position.set(0, 0.28, 0);
    const eyeL = new THREE.Mesh(CHAR_GEOS.cap(0.018, 0.075, 6, 8), slimeEyeMat);
    eyeL.position.set(-0.12, 0.34, -0.34);
    eyeL.rotation.set(0, 0, Math.PI / 2 - 0.18);
    const eyeR = new THREE.Mesh(CHAR_GEOS.cap(0.018, 0.075, 6, 8), slimeEyeMat);
    eyeR.position.set(0.12, 0.34, -0.34);
    eyeR.rotation.set(0, 0, Math.PI / 2 + 0.18);

    this.slimeGroup.add(this.slimeCore, this.slimeOuter, eyeL, eyeR);
    this.slimeGroup.visible = false;
    this.root.add(this.slimeGroup);

    this.glbHolder.visible = false;
    this.root.add(this.glbHolder);

    // 6. Ground-Clamped Soft Contact Shadow + Dual Foot AO Discs (grounds character onto voxel grass/stone!)
    const shadowTex = getSharedGroundShadowTexture();
    const shadowGeo = getSharedGroundShadowGeo();
    this.coreShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    this.footShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3
    });
    this.ownedMats.push(this.coreShadowMat, this.footShadowMat);

    this.coreShadowMesh = new THREE.Mesh(shadowGeo, this.coreShadowMat);
    this.coreShadowMesh.scale.set(0.94, 1, 0.86);
    this.coreShadowMesh.renderOrder = 1;

    this.footShadowL = new THREE.Mesh(shadowGeo, this.footShadowMat);
    this.footShadowL.scale.set(0.32, 1, 0.36);
    this.footShadowL.position.set(-0.14, 0.002, 0);
    this.footShadowL.renderOrder = 1;

    this.footShadowR = new THREE.Mesh(shadowGeo, this.footShadowMat);
    this.footShadowR.scale.set(0.32, 1, 0.36);
    this.footShadowR.position.set(0.14, 0.002, 0);
    this.footShadowR.renderOrder = 1;

    this.groundShadowGroup.position.set(0, 0.018, 0);
    this.groundShadowGroup.add(this.coreShadowMesh, this.footShadowL, this.footShadowR);
    this.root.add(this.groundShadowGroup);

    if (showNametag) {
      const nt = makeNametagSprite(name);
      nt.sprite.position.set(0, 2.12, 0);
      this.nametagSprite = nt.sprite;
      this.spriteMat = nt.sprite.material;
      this.ownedTexs.push(nt.tex);
      this.root.add(nt.sprite);
    }

    this.currentVisualId = '';
    this.requestCharacterGlb('class_dragon_knight');
  }

  private syncBodyVisibility() {
    const showSlime = this.slimeForm;
    const useGlb = !showSlime && !this.isMinecraftBoxyMode && this.glbRig !== null;
    const showFallback = !showSlime && !useGlb;

    this.slimeGroup.visible = showSlime;
    this.glbHolder.visible = useGlb;

    this.headPivot.visible = showFallback;
    this.bodyGroup.visible = showFallback;
    this.armLPivot.visible = showFallback;
    this.armRPivot.visible = showFallback;
    this.legLPivot.visible = showFallback;
    this.legRPivot.visible = showFallback;

    if (useGlb && this.glbRig) {
      if (this.heldMount.parent !== this.glbRig.rightHandSocket) {
        this.heldMount.position.set(0, 0, 0);
        this.glbRig.rightHandSocket.add(this.heldMount);
        if (this.heldMesh && this.currentHeldId > 0) {
          orientThirdPersonHeldMesh(this.heldMesh, this.currentHeldId, false, true);
        }
      }
      if (this.offhandMount.parent !== this.glbRig.leftHandSocket) {
        this.offhandMount.position.set(0, 0, 0);
        this.glbRig.leftHandSocket.add(this.offhandMount);
        if (this.offhandMesh && this.currentOffhandId > 0) {
          orientThirdPersonHeldMesh(this.offhandMesh, this.currentOffhandId, true, true);
        }
      }
    } else {
      const mx = this.isMinecraftBoxyMode ? 0 : 0.01;
      const my = this.isMinecraftBoxyMode ? -0.52 : -0.53;
      const mz = this.isMinecraftBoxyMode ? -0.06 : -0.05;
      this.heldMount.position.set(mx, my, mz);
      if (this.heldMount.parent !== this.armRPivot) {
        this.armRPivot.add(this.heldMount);
        if (this.heldMesh && this.currentHeldId > 0) {
          orientThirdPersonHeldMesh(this.heldMesh, this.currentHeldId, false, false);
        }
      }
      this.offhandMount.position.set(-mx, my, mz);
      if (this.offhandMount.parent !== this.armLPivot) {
        this.armLPivot.add(this.offhandMount);
        if (this.offhandMesh && this.currentOffhandId > 0) {
          orientThirdPersonHeldMesh(this.offhandMesh, this.currentOffhandId, true, false);
        }
      }
    }

    if (this.nametagSprite) {
      this.nametagSprite.position.y = showSlime ? 1.28 : 2.12;
    }
  }

  private requestCharacterGlb(charId: string) {
    const cfg = resolveCharacterGlbConfig(charId || 'class_dragon_knight');
    if (cfg.isMinecraftRig) {
      this.isMinecraftBoxyMode = true;
      this.currentGlbKey = `__mc__:${charId}`;
      this.glbLoadToken++;
      if (this.glbRig) {
        this.armRPivot.add(this.heldMount);
        this.armLPivot.add(this.offhandMount);
        this.glbHolder.remove(this.glbRig.wrapper);
        this.glbRig.dispose();
        this.glbRig = null;
      }
      this.syncBodyVisibility();
      return;
    }

    this.isMinecraftBoxyMode = false;
    const cfgKey = `${cfg.file}:${cfg.tintHex ?? 'none'}`;
    if (this.currentGlbKey === cfgKey && this.glbRig) {
      this.syncBodyVisibility();
      return;
    }
    this.currentGlbKey = cfgKey;
    const token = ++this.glbLoadToken;

    loadGlbTemplate(cfg.file, cfg.stripPedestal ?? true).then((tpl) => {
      if (this.disposed || token !== this.glbLoadToken || !tpl) return;
      if (this.glbRig) {
        this.armRPivot.add(this.heldMount);
        this.armLPivot.add(this.offhandMount);
        this.glbHolder.remove(this.glbRig.wrapper);
        this.glbRig.dispose();
        this.glbRig = null;
      }
      const nextRig = new GlbAnimatedRig(tpl, cfg);
      this.glbRig = nextRig;
      this.glbHolder.add(nextRig.wrapper);
      nextRig.update(0.016, 0, this.walkPhase, this.idleClock, 0, 0, 0, this.blocking, this.sneaking);
      this.syncBodyVisibility();
    });
  }

  public applyCharacterVisual(spec: CharacterVisualSpec | null) {
    const nextId = spec ? spec.id : '';
    if (this.currentVisualId === nextId) return;
    this.currentVisualId = nextId;

    this.headDecorHolder.clear();
    this.hairHolder.clear();
    this.torsoDetailHolder.clear();
    this.armLDetailHolder.clear();
    this.armRDetailHolder.clear();
    this.legLDetailHolder.clear();
    this.legRDetailHolder.clear();

    for (const m of this.skinMats) m.dispose();
    for (const t of this.skinTexs) t.dispose();
    this.skinMats.length = 0;
    this.skinTexs.length = 0;

    const glbCfg = resolveCharacterGlbConfig(nextId || 'class_dragon_knight');
    const mcMode = Boolean(glbCfg.isMinecraftRig);
    this.isMinecraftBoxyMode = mcMode;
    this.isSlimMinecraftArm = nextId === 'mc_alex' || nextId === 'mc_ari' || nextId === 'mc_sunny';

    if (mcMode) {
      // Authentic Mojang 1.8 Boxy 8:12:4 Pixel-Art Rig + 64x64 3D Hat/Jacket/Sleeve/Pants Overlays!
      const mcMats = buildAvatarMaterials(this.renderedColor, spec);
      this.skinTexs.push(...mcMats.textures);
      this.skinMats.push(...mcMats.materials);

      this.headMesh.geometry = MC_BOXY_GEOS.head();
      this.headMesh.position.y = 0.225;
      this.headMesh.material = mcMats.headMats;

      const hatOverlay = new THREE.Mesh(MC_BOXY_GEOS.hat(), mcMats.hatMats);
      hatOverlay.position.y = 0.225;
      this.headDecorHolder.add(hatOverlay);

      if (nextId === 'mc_technoblade') {
        const snoutMat = new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          roughness: 0.72,
          metalness: 0.04,
          emissive: 0x3b0a1e
        });
        snoutMat.userData.baseEmissive = 0x3b0a1e;
        const goldMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          roughness: 0.28,
          metalness: 0.76,
          emissive: 0x452800
        });
        goldMat.userData.baseEmissive = 0x452800;
        const emeraldMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2, metalness: 0.2, emissive: 0x064e3b });
        emeraldMat.userData.baseEmissive = 0x064e3b;
        const rubyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, metalness: 0.2, emissive: 0x450a0a });
        rubyMat.userData.baseEmissive = 0x450a0a;
        const sapphireMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.2, emissive: 0x082f49 });
        sapphireMat.userData.baseEmissive = 0x082f49;
        this.skinMats.push(snoutMat, goldMat, emeraldMat, rubyMat, sapphireMat);

        const snoutMesh = new THREE.Mesh(MC_BOXY_GEOS.snout(), snoutMat);
        snoutMesh.position.set(0, 0.145, -0.242);
        this.headDecorHolder.add(snoutMesh);

        // Iconic 3D Minecraft Golden Jewel Crown atop Technoblade's head!
        const crownY = 0.422;
        const cFront = new THREE.Mesh(MC_BOXY_GEOS.crownFB(), goldMat);
        cFront.position.set(0, crownY, -0.238);
        const cBack = new THREE.Mesh(MC_BOXY_GEOS.crownFB(), goldMat);
        cBack.position.set(0, crownY, 0.238);
        const cLeft = new THREE.Mesh(MC_BOXY_GEOS.crownLR(), goldMat);
        cLeft.position.set(-0.238, crownY, 0);
        const cRight = new THREE.Mesh(MC_BOXY_GEOS.crownLR(), goldMat);
        cRight.position.set(0.238, crownY, 0);
        this.headDecorHolder.add(cFront, cBack, cLeft, cRight);

        for (const tx of [-0.19, 0, 0.19]) {
          const tf = new THREE.Mesh(MC_BOXY_GEOS.crownTooth(), goldMat);
          tf.position.set(tx, crownY + 0.072, -0.238);
          const tb = new THREE.Mesh(MC_BOXY_GEOS.crownTooth(), goldMat);
          tb.position.set(tx, crownY + 0.072, 0.238);
          this.headDecorHolder.add(tf, tb);
        }
        const gemC = new THREE.Mesh(MC_BOXY_GEOS.crownGem(), emeraldMat);
        gemC.position.set(0, crownY + 0.005, -0.26);
        const gemL = new THREE.Mesh(MC_BOXY_GEOS.crownGem(), sapphireMat);
        gemL.position.set(-0.145, crownY + 0.005, -0.26);
        const gemR = new THREE.Mesh(MC_BOXY_GEOS.crownGem(), rubyMat);
        gemR.position.set(0.145, crownY + 0.005, -0.26);
        this.headDecorHolder.add(gemC, gemL, gemR);
      }

      this.torsoMesh.geometry = MC_BOXY_GEOS.torso();
      this.torsoMesh.material = mcMats.bodyMats;
      const jacketOverlay = new THREE.Mesh(MC_BOXY_GEOS.jacket(), mcMats.jacketMats);
      this.torsoDetailHolder.add(jacketOverlay);

      this.defaultShowCape =
        nextId === 'mc_technoblade' ||
        nextId === 'mc_warden_knight' ||
        nextId === 'mc_herobrine' ||
        nextId === 'mc_netherite_warrior';
      this.capeMesh.geometry = MC_BOXY_GEOS.cape();
      this.capeMesh.position.set(0, 0, -0.02);
      this.capeMesh.scale.set(1, 1, 1);
      this.capeMesh.material = mcMats.capeMat;
      this.capePivot.position.set(0, 0.34, 0.13);
      this.capePivot.visible = !this.elytraLPivot.visible && this.defaultShowCape;

      this.armLMesh.geometry = this.isSlimMinecraftArm ? MC_BOXY_GEOS.armAlex() : MC_BOXY_GEOS.armSteve();
      this.armLMesh.material = mcMats.armLeftMats;
      this.armRMesh.geometry = this.isSlimMinecraftArm ? MC_BOXY_GEOS.armAlex() : MC_BOXY_GEOS.armSteve();
      this.armRMesh.material = mcMats.armRightMats;

      const sleeveGeo = this.isSlimMinecraftArm ? MC_BOXY_GEOS.sleeveAlex() : MC_BOXY_GEOS.sleeveSteve();
      this.armLDetailHolder.add(new THREE.Mesh(sleeveGeo, mcMats.sleeveMats));
      this.armRDetailHolder.add(new THREE.Mesh(sleeveGeo, mcMats.sleeveMats));

      this.legLMesh.geometry = MC_BOXY_GEOS.leg();
      this.legLMesh.material = mcMats.legMats;
      this.legLMesh.visible = true;
      this.legRMesh.geometry = MC_BOXY_GEOS.leg();
      this.legRMesh.material = mcMats.legMats;
      this.legRMesh.visible = true;

      this.legLDetailHolder.add(new THREE.Mesh(MC_BOXY_GEOS.pants(), mcMats.pantsLayerMats));
      this.legRDetailHolder.add(new THREE.Mesh(MC_BOXY_GEOS.pants(), mcMats.pantsLayerMats));
    } else {
      const rig: SculptedCharacterRig = buildSculptedCharacterProfileRig(this.renderedColor, spec);
      this.skinTexs.push(...rig.textures);
      this.skinMats.push(...rig.materials);
      this.defaultShowCape = rig.showCape;

      this.headMesh.geometry = CHAR_GEOS.head();
      this.headMesh.position.y = 0.14;
      this.headMesh.material = [rig.skinMat, rig.faceMat];
      this.headDecorHolder.add(rig.headDecorGroup);
      this.hairHolder.add(rig.hairGroup);
      this.torsoMesh.geometry = CHAR_GEOS.torso();
      this.torsoMesh.material = rig.shirtMat;
      this.torsoDetailHolder.add(rig.torsoDetailGroup);
      this.capeMesh.geometry = this.smoothCapeGeo;
      this.capeMesh.position.set(0, -0.40, -0.05);
      this.capeMesh.scale.set(1.12, 1.0, 0.42);
      this.capeMesh.material = rig.capeMat;
      this.capePivot.position.set(0, 0.40, 0.11);
      this.capePivot.visible = !this.elytraLPivot.visible && this.defaultShowCape;

      this.armLMesh.geometry = CHAR_GEOS.bareArm();
      this.armLMesh.material = rig.skinMat;
      this.armRMesh.geometry = CHAR_GEOS.bareArm();
      this.armRMesh.material = rig.skinMat;
      this.armLDetailHolder.add(rig.armLDetailGroup);
      this.armRDetailHolder.add(rig.armRDetailGroup);

      this.legLMesh.geometry = CHAR_GEOS.leg();
      this.legLMesh.material = rig.pantsMat;
      this.legRMesh.geometry = CHAR_GEOS.leg();
      this.legRMesh.material = rig.pantsMat;
      this.legLMesh.visible = !rig.hideBaseLegs;
      this.legRMesh.visible = !rig.hideBaseLegs;
      this.legLDetailHolder.add(rig.legLDetailGroup);
      this.legRDetailHolder.add(rig.legRDetailGroup);
    }

    const horns = mcMode ? 'none' : spec?.horns || 'none';
    this.hornMat.color.setHex(spec?.hornColor ?? 0xfacc15);
    this.hornSingleMesh.visible = horns === 'single';
    this.hornLeftMesh.visible = horns === 'twin' || horns === 'dragon';
    this.hornRightMesh.visible = horns === 'twin' || horns === 'dragon';
    this.crownGroup.visible = horns === 'crown';
    this.strawHatGroup.visible = horns === 'strawhat';
    if (spec?.id === 'luffy_gear5') {
      // Gear 5 Sun God Nika: Straw Hat slung behind neck on string so glowing white cloud-flame hair shines!
      this.strawHatGroup.position.set(0, -0.22, 0.22);
      this.strawHatGroup.rotation.set(-1.18, 0, 0);
    } else {
      this.strawHatGroup.position.set(0, 0, 0);
      this.strawHatGroup.rotation.set(0, 0, 0);
    }
    this.headbandGroup.visible = horns === 'headband';
    this.hollowMaskGroup.visible = horns === 'hollowmask';
    this.haloGroup.visible = horns === 'halo';

    const wings = spec?.wings || 'none';
    const showWings = wings !== 'none';
    this.wingMat.color.setHex(spec?.wingColor ?? 0x1e1b4b);
    this.wingLPivot.visible = showWings;
    this.wingRPivot.visible = showWings;

    const sCol = spec?.slimeColor ?? 0x38bdf8;
    this.slimeOuterMat.color.setHex(sCol);
    this.slimeCoreMat.emissive.setHex(sCol);

    this.requestCharacterGlb(nextId || 'class_dragon_knight');
    this.syncBodyVisibility();
  }

  public setSlimeForm(active: boolean, _evoStage = 0) {
    this.slimeForm = active;
    this.syncBodyVisibility();
  }

  public setArmor(headId: number, chestId: number, legsId: number, feetId: number, enchMask = 0) {
    const key = `${headId},${chestId},${legsId},${feetId},${enchMask}`;
    if (this.currentArmorKey === key) return;
    this.currentArmorKey = key;

    if (headId === BLOCK.CARVED_PUMPKIN) {
      this.headArmorGroup.visible = true;
      this.headArmorMat.map = null;
      this.headArmorMat.color.setHex(0xd97706);
      this.headArmorMat.metalness = 0.05;
      this.headArmorMat.roughness = 0.75;
      this.headArmorMat.userData.baseEmissive = 0x1c0d02;
      this.headArmorMat.emissive.setHex(0x1c0d02);
      this.headArmorMat.needsUpdate = true;
    } else {
      const hasH = applyArmorSlotMaterial(this.headArmorMat, headId, 'helm', !!(enchMask & 1));
      this.headArmorGroup.visible = hasH;
    }
    this.hairHolder.visible = !this.headArmorGroup.visible;

    const isElytra = chestId === ITEM.ELYTRA;
    this.elytraLPivot.visible = isElytra;
    this.elytraRPivot.visible = isElytra;
    this.capePivot.visible = !isElytra && this.defaultShowCape;
    if (isElytra) {
      this.elytraMat.userData.baseEmissive = enchMask & 2 ? 0x2c1458 : 0x000000;
      this.elytraMat.emissive.setHex(this.elytraMat.userData.baseEmissive);
    }

    const hasC = !isElytra && applyArmorSlotMaterial(this.chestArmorMat, chestId, 'chest', !!(enchMask & 2));
    this.chestArmorMesh.visible = hasC;
    this.armLArmorMesh.visible = hasC;
    this.armRArmorMesh.visible = hasC;

    const hasL = applyArmorSlotMaterial(this.legsArmorMat, legsId, 'legs', !!(enchMask & 4));
    this.beltArmorMesh.visible = hasL;
    this.legLArmorMesh.visible = hasL;
    this.legRArmorMesh.visible = hasL;

    const hasF = applyArmorSlotMaterial(this.feetArmorMat, feetId, 'feet', !!(enchMask & 8));
    this.bootLArmorMesh.visible = hasF;
    this.bootRArmorMesh.visible = hasF;
  }

  public setOffhandShield(hasShield: boolean) {
    this.setOffhandItem(hasShield ? ITEM.SHIELD : 0);
  }

  public setOffhandItem(itemId: number, loaded = false) {
    if (this.currentOffhandId === itemId && this.currentOffhandLoaded === loaded) return;
    this.currentOffhandId = itemId;
    this.currentOffhandLoaded = loaded;
    this.hasOffhandShield = itemId === ITEM.SHIELD;
    if (this.offhandMesh) {
      this.offhandMount.remove(this.offhandMesh);
      disposeHeldMeshSafe(this.offhandMesh);
      this.offhandMesh = null;
    }
    if (itemId > 0) {
      this.offhandMesh = buildHeldItem3D(itemId, this.atlasTex, false, loaded);
      if (this.offhandMesh) {
        const inSocket = !this.slimeForm && !this.isMinecraftBoxyMode && this.glbRig !== null;
        orientThirdPersonHeldMesh(this.offhandMesh, itemId, true, inSocket);
        this.offhandMount.add(this.offhandMesh);
      }
    }
  }

  public setHeldBlock(itemId: number, loaded = false) {
    if (this.currentHeldId === itemId && this.currentHeldLoaded === loaded) return;
    this.currentHeldId = itemId;
    this.currentHeldLoaded = loaded;
    if (this.heldMesh) {
      this.heldMount.remove(this.heldMesh);
      disposeHeldMeshSafe(this.heldMesh);
      this.heldMesh = null;
    }
    if (itemId > 0) {
      this.heldMesh = buildHeldItem3D(itemId, this.atlasTex, false, loaded);
      if (this.heldMesh) {
        const inSocket = !this.slimeForm && !this.isMinecraftBoxyMode && this.glbRig !== null;
        orientThirdPersonHeldMesh(this.heldMesh, itemId, false, inSocket);
        this.heldMount.add(this.heldMesh);
      }
    }
  }

  public triggerSwing() {
    this.swingTimer = 0.26;
  }

  public triggerHurt() {
    this.hurtTimer = 0.32;
  }

  public updateInterpolated(dt: number) {
    const prevX = this.root.position.x;
    const prevZ = this.root.position.z;

    if (this.root.position.distanceToSquared(this.targetPos) > 324) {
      this.root.position.copy(this.targetPos);
    } else {
      const k = Math.min(1, dt * 15);
      this.root.position.lerp(this.targetPos, k);
    }

    let dYaw = this.targetYaw - this.root.rotation.y;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    this.root.rotation.y += dYaw * Math.min(1, dt * 16);

    const speed = Math.hypot(this.root.position.x - prevX, this.root.position.z - prevZ) / Math.max(0.001, dt);
    this.animateLimbs(dt, speed, this.targetPitch, 0);
  }

  public syncDirect(
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    speed: number,
    sneak: boolean,
    dt: number,
    headYawOffset = 0
  ) {
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
    this.sneaking = sneak;
    this.animateLimbs(dt, speed, pitch, headYawOffset);
  }

  public setGroundClearance(airGap: number, dayLightFactor = 1.0) {
    this.groundAirGap = Math.max(0, airGap);
    this.groundLightFactor = THREE.MathUtils.clamp(dayLightFactor, 0.35, 1.0);
  }

  private animateLimbs(dt: number, speed: number, pitch: number, headYawOffset = 0) {
    this.idleClock += dt;
    const clampedPitch = Math.max(-1.1, Math.min(1.1, pitch));
    this.headPivot.rotation.x = clampedPitch;
    this.headPivot.rotation.y = THREE.MathUtils.clamp(headYawOffset, -1.05, 1.05);

    // Update ground-clamped contact shadow & foot AO discs
    if (this.swimming || this.groundAirGap > 6.5) {
      this.groundShadowGroup.visible = false;
    } else {
      this.groundShadowGroup.visible = true;
      this.groundShadowGroup.position.y = 0.018 - this.groundAirGap;
      this.groundShadowGroup.rotation.x = -this.root.rotation.x;
      const shrink = 1 / (1 + this.groundAirGap * 0.24);
      const fade = Math.exp(-this.groundAirGap * 0.42) * this.groundLightFactor;
      const baseRadius = this.slimeForm ? 0.72 : 0.94;
      this.coreShadowMesh.scale.set(baseRadius * shrink, 1, baseRadius * 0.92 * shrink);
      this.coreShadowMat.opacity = 0.56 * fade;
      const showFeetAo = !this.slimeForm && this.groundAirGap < 0.38;
      this.footShadowL.visible = showFeetAo;
      this.footShadowR.visible = showFeetAo;
      if (showFeetAo) {
        const footStride = Math.sin(this.walkPhase) * 0.20 * Math.min(1, speed / 4.2);
        this.footShadowL.position.set(-0.14, 0.002, -footStride);
        this.footShadowR.position.set(0.14, 0.002, footStride);
        this.footShadowMat.opacity = 0.42 * (1 - this.groundAirGap / 0.38) * this.groundLightFactor;
      }
    }

    if (this.hurtTimer > 0) {
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
      if (this.glbRig) {
        this.glbRig.setHurtFlash(this.hurtTimer > 0);
      }
      for (const m of this.skinMats) {
        m.emissive.setHex(this.hurtTimer > 0 ? 0x991111 : m.userData?.baseEmissive ?? 0x000000);
      }
      for (const m of this.ownedMats) {
        if ('emissive' in m) {
          (m as THREE.MeshStandardMaterial).emissive.setHex(
            this.hurtTimer > 0 ? 0x991111 : m.userData?.baseEmissive ?? 0x000000
          );
        }
      }
    }

    if (this.wingLPivot.visible) {
      const flap = 0.32 + Math.sin(performance.now() * 0.0045) * 0.18 + Math.min(0.25, speed * 0.04);
      this.wingLPivot.rotation.y = flap;
      this.wingRPivot.rotation.y = -flap;
    }

    const moving = Math.min(1, speed / 4.2);
    const sprinting = speed > 4.6 ? Math.min(1, (speed - 4.6) / 2.2) : 0;

    if (this.capePivot.visible) {
      const flutter =
        moving > 0.05
          ? Math.sin(this.idleClock * (7 + sprinting * 6)) * (0.04 + moving * 0.05)
          : Math.sin(this.idleClock * 1.8) * 0.015;
      const targetCapeX = 0.12 + moving * 0.54 + sprinting * 0.26 + (this.sneaking ? 0.24 : 0) + flutter;
      this.capePivot.rotation.x += (targetCapeX - this.capePivot.rotation.x) * Math.min(1, dt * 12);
      this.capePivot.rotation.z = Math.sin(this.walkPhase * 0.5) * 0.06 * moving;
    }

    if (this.elytraLPivot.visible) {
      const elytraY = this.sneaking ? 1.22 : 1.36;
      this.elytraLPivot.position.y = elytraY;
      this.elytraRPivot.position.y = elytraY;
      if (this.gliding) {
        const flutter = Math.sin(this.idleClock * 9.0) * 0.04;
        this.elytraLPivot.rotation.set(0.24, 0.22, -0.52 + flutter);
        this.elytraRPivot.rotation.set(0.24, -0.22, 0.52 - flutter);
      } else {
        const capeSway = Math.min(0.42, moving * 0.34) + (this.sneaking ? 0.28 : 0);
        this.elytraLPivot.rotation.set(0.08 + capeSway, 0.12, 0.15);
        this.elytraRPivot.rotation.set(0.08 + capeSway, -0.12, -0.15);
      }
    }

    const isSwimPose = this.swimming && !this.slimeForm && !this.gliding;
    const isRollingBoxy = !this.glbRig && this.bonePose.dodgeRollTimer > 0.001 && !this.slimeForm;
    if (isRollingBoxy) {
      const rollFrac = 1 - Math.min(1, this.bonePose.dodgeRollTimer / 0.48);
      this.root.rotation.x = -rollFrac * Math.PI * 2;
    } else {
      const targetRootPitch = this.gliding && !this.slimeForm ? -1.32 : isSwimPose ? -1.24 : 0;
      this.root.rotation.x += (targetRootPitch - this.root.rotation.x) * Math.min(1, dt * 10);
    }
    if (isSwimPose) {
      this.headPivot.rotation.x = Math.min(1.25, clampedPitch + 0.92);
    }

    if (moving > 0.03) {
      this.walkPhase += dt * (4.8 + moving * 6.8);
    }
    const swingAmp = 0.72 * moving;
    const w = Math.sin(this.walkPhase) * swingAmp;
    const breathZ = Math.cos(this.idleClock * 1.6) * 0.035 + 0.035;
    const breathX = Math.sin(this.idleClock * 1.2) * 0.03;

    if (this.slimeForm) {
      const idleBreath = Math.sin(performance.now() * 0.004) * 0.035;
      const bounce = moving > 0.03 ? Math.abs(Math.sin(this.walkPhase * 0.9)) : 0;
      const squash = this.sneaking ? -0.22 : bounce > 0.02 ? (bounce - 0.35) * 0.28 : idleBreath;
      const sx = 1 - squash * 0.55;
      const sy = Math.max(0.58, 1 + squash);
      this.slimeGroup.scale.set(sx, sy, sx);
      this.slimeGroup.position.y = bounce * 0.16;
      if (this.nametagSprite && this.spriteMat) {
        this.nametagSprite.position.y = (this.sneaking ? 1.12 : 1.28) + bounce * 0.16;
        this.spriteMat.opacity = this.sneaking ? 0.55 : 1.0;
      }
      return;
    }

    if (this.glbRig) {
      this.glbRig.update(
        dt,
        speed,
        this.walkPhase,
        this.idleClock,
        isSwimPose ? Math.min(1.25, clampedPitch + 0.92) : clampedPitch,
        headYawOffset,
        this.swingTimer,
        this.blocking,
        this.sneaking && !isSwimPose,
        this.poseMode,
        this.bonePose
      );
    }

    if (isSwimPose) {
      if (this.swingTimer > 0) {
        this.swingTimer = Math.max(0, this.swingTimer - dt);
      }
      this.bodyGroup.rotation.set(0, 0, 0);
      this.bodyGroup.position.set(0, 0.78, 0);
      this.headPivot.position.set(0, 1.24, 0);
      this.armLPivot.position.set(-0.215, 1.12, 0);
      this.armRPivot.position.set(0.215, 1.12, 0);
      this.legLPivot.position.set(-0.102, 0.64, 0);
      this.legRPivot.position.set(0.102, 0.64, 0);
      const kick = Math.sin(this.walkPhase * 1.35) * 0.46;
      this.legLPivot.rotation.x = kick;
      this.legRPivot.rotation.x = -kick;
      const strokeL = Math.sin(this.walkPhase * 0.95);
      const strokeR = Math.sin(this.walkPhase * 0.95 + Math.PI);
      this.armLPivot.rotation.set(2.25 + strokeL * 0.72, 0.18, -0.22 - Math.max(0, strokeL) * 0.35);
      this.armRPivot.rotation.set(2.25 + strokeR * 0.72, -0.18, 0.22 + Math.max(0, strokeR) * 0.35);
      if (this.nametagSprite && this.spriteMat) {
        this.nametagSprite.position.y = 1.48;
        this.spriteMat.opacity = 1.0;
      }
      return;
    }

    if (this.sneaking) {
      if (this.isMinecraftBoxyMode) {
        const armX = this.isSlimMinecraftArm ? 0.311 : 0.338;
        this.bodyGroup.rotation.x = -0.44;
        this.bodyGroup.position.set(0, 0.90, 0.06);
        this.headPivot.position.set(0, 1.24, -0.08);
        this.armLPivot.position.set(-armX, 1.18, -0.05);
        this.armRPivot.position.set(armX, 1.18, -0.05);
        this.legLPivot.position.set(-0.113, 0.68, 0.16);
        this.legRPivot.position.set(0.113, 0.68, 0.16);
      } else {
        this.bodyGroup.rotation.x = -0.42;
        this.bodyGroup.position.set(0, 0.91, 0.07);
        this.headPivot.position.set(0, 1.33, -0.05);
        this.armLPivot.position.set(-0.215, 1.24, -0.03);
        this.armRPivot.position.set(0.215, 1.24, -0.03);
        this.legLPivot.position.set(-0.102, 0.84, 0.15);
        this.legRPivot.position.set(0.102, 0.84, 0.15);
      }
      if (this.nametagSprite && this.spriteMat) {
        this.nametagSprite.position.y = 1.94;
        this.spriteMat.opacity = 0.52;
      }
    } else {
      if (this.isMinecraftBoxyMode) {
        const armX = this.isSlimMinecraftArm ? 0.311 : 0.338;
        this.bodyGroup.rotation.x = -0.08 * sprinting;
        this.bodyGroup.position.set(0, 1.02, 0);
        this.headPivot.position.set(0, 1.36, -0.03 * sprinting);
        this.armLPivot.position.set(-armX, 1.28, 0);
        this.armRPivot.position.set(armX, 1.28, 0);
        this.legLPivot.position.set(-0.113, 0.68, 0);
        this.legRPivot.position.set(0.113, 0.68, 0);
      } else {
        this.bodyGroup.rotation.x = -0.08 * sprinting;
        this.bodyGroup.position.set(0, 1.00, 0);
        this.headPivot.position.set(0, 1.48, -0.03 * sprinting);
        this.armLPivot.position.set(-0.215, 1.35, 0);
        this.armRPivot.position.set(0.215, 1.35, 0);
        this.legLPivot.position.set(-0.102, 0.88, 0);
        this.legRPivot.position.set(0.102, 0.88, 0);
      }
      if (this.nametagSprite && this.spriteMat) {
        this.nametagSprite.position.y = 2.12;
        this.spriteMat.opacity = 1.0;
      }
    }

    this.legLPivot.rotation.x = w;
    this.legRPivot.rotation.x = -w;

    if (this.poseMode === 'bow' || this.poseMode === 'crossbow') {
      this.armLPivot.rotation.set(1.42 + clampedPitch * 0.65, -0.42, 0.08);
    } else if (this.poseMode === 'eat' && this.eatingOffhand) {
      const chew = Math.abs(Math.sin(this.idleClock * 18)) * 0.22;
      this.armLPivot.rotation.set(1.35 + chew, -0.38, 0.15);
    } else if (this.blocking && this.hasOffhandShield) {
      this.armLPivot.rotation.set(0.92, -0.52, 0.28);
    } else {
      this.armLPivot.rotation.set(
        -w * 0.85 + (this.offhandMesh ? 0.38 : 0) + (this.sneaking ? -0.35 : 0) - breathX,
        this.offhandMesh ? 0.12 : 0,
        -breathZ
      );
    }

    const inSocket = !this.slimeForm && !this.isMinecraftBoxyMode && this.glbRig !== null;
    if (this.poseMode === 'bow' || this.poseMode === 'crossbow' || this.poseMode === 'spyglass') {
      this.heldMount.rotation.x = inSocket ? -0.14 : -0.98;
    } else if (this.poseMode === 'trident') {
      this.heldMount.rotation.x = inSocket ? -1.45 : -3.05;
    } else if (this.poseMode === 'spear') {
      this.heldMount.rotation.x = inSocket ? -0.35 : -0.82;
    } else {
      this.heldMount.rotation.x = 0;
    }

    if (this.heldMesh?.userData?.bowArrow) {
      (this.heldMesh.userData.bowArrow as THREE.Object3D).visible = this.poseMode === 'bow';
    }

    if (this.swingTimer > 0) {
      this.swingTimer = Math.max(0, this.swingTimer - dt);
      const p = 1 - this.swingTimer / 0.26;
      const sCurve = Math.sin(p * Math.PI);
      const stage = this.bonePose.comboStage % 3;
      if (stage === 1) {
        this.bodyGroup.rotation.y = -sCurve * 0.26;
        this.armLPivot.rotation.set(1.58 - p * 1.18, 0.22 + sCurve * 0.38, sCurve * 0.18);
        this.armRPivot.rotation.set(0.32, -0.18, 0.12);
      } else if (stage === 2) {
        this.bodyGroup.rotation.x -= sCurve * 0.24;
        this.bodyGroup.rotation.y = sCurve * 0.14;
        this.armRPivot.rotation.set(2.35 - p * 1.85, -0.12, -sCurve * 0.16);
        this.armLPivot.rotation.set(1.95 - p * 1.45, 0.16, sCurve * 0.14);
      } else {
        this.bodyGroup.rotation.y = sCurve * 0.18;
        this.armRPivot.rotation.x = 1.72 - p * 1.48;
        this.armRPivot.rotation.y = -0.14 - sCurve * 0.32;
        this.armRPivot.rotation.z = -sCurve * 0.20;
      }
    } else {
      this.bodyGroup.rotation.y = 0;
      if (this.poseMode === 'bow') {
        this.armRPivot.rotation.set(1.48 + clampedPitch * 0.65, 0.14, 0);
      } else if (this.poseMode === 'crossbow') {
        this.armRPivot.rotation.set(1.38 + clampedPitch * 0.55, 0.22, 0);
      } else if (this.poseMode === 'trident') {
        this.armRPivot.rotation.set(2.65, 0, -0.14);
      } else if (this.poseMode === 'spear') {
        this.armRPivot.rotation.set(0.52, -0.08, 0);
      } else if (this.poseMode === 'spyglass') {
        this.armRPivot.rotation.set(1.48 + clampedPitch * 0.75, 0.32, 0);
      } else if (this.poseMode === 'eat' && !this.eatingOffhand) {
        const chew = Math.abs(Math.sin(this.idleClock * 18)) * 0.22;
        this.armRPivot.rotation.set(1.35 + chew, 0.38, -0.15);
      } else if (this.blocking && this.currentHeldId === ITEM.SHIELD) {
        this.armRPivot.rotation.set(0.92, 0.52, -0.28);
      } else {
        this.armRPivot.rotation.set(
          w * 0.72 + (this.heldMesh ? 0.42 : 0) + (this.sneaking ? -0.30 : 0) + breathX,
          this.heldMesh ? -0.14 : 0,
          (this.heldMesh ? 0.05 : 0) + breathZ
        );
      }
    }

    // Universe-Specific Skill Cast Choreography, Emotes, [C] Live Arm Reach & [G] Joint Studio Overrides for Minecraft / Sculpted Boxy Rigs
    const bp = this.bonePose;
    if (bp.skillCastTimer > 0 && bp.skillCastStyle !== 'none') {
      const dur = Math.max(0.2, bp.skillCastDuration || 0.75);
      const p = THREE.MathUtils.clamp(1 - bp.skillCastTimer / dur, 0, 1);
      const st = bp.skillCastStyle;
      if (st === 'naruto_hand_seals') {
        if (p < 0.68) {
          const snap = Math.sin(p * Math.PI * 9) * 0.08;
          this.bodyGroup.rotation.x = 0.10;
          this.armRPivot.rotation.set(1.38 + snap, 0.56, -0.22);
          this.armLPivot.rotation.set(1.38 - snap, -0.56, 0.22);
        } else {
          const r = (p - 0.68) / 0.32;
          const thrust = Math.sin(Math.min(1, r * 1.4) * Math.PI * 0.5);
          this.bodyGroup.rotation.x = 0.18 * thrust;
          this.armRPivot.rotation.set(1.58 + clampedPitch * 0.55, 0.08, -0.10);
          this.armLPivot.rotation.set(0.82, -0.34, 0.16);
        }
      } else if (st === 'naruto_rasengan') {
        if (p < 0.42) {
          this.bodyGroup.rotation.y = -0.34;
          this.armRPivot.rotation.set(1.02, -0.26, 0.22);
          this.armLPivot.rotation.set(1.18, -0.48, 0.24);
        } else {
          this.bodyGroup.rotation.x = 0.22;
          this.bodyGroup.rotation.y = 0.28;
          this.armRPivot.rotation.set(1.62 + clampedPitch * 0.55, 0.10, -0.14);
          this.armLPivot.rotation.set(-0.32, 0.18, -0.22);
        }
      } else if (st === 'dbz_kamehameha') {
        if (p < 0.46) {
          const tr = Math.sin(this.idleClock * 42) * 0.025;
          this.bodyGroup.rotation.y = -0.48;
          this.bodyGroup.rotation.x = 0.12;
          this.armRPivot.rotation.set(0.62 + tr, -0.35, 0.28);
          this.armLPivot.rotation.set(0.88 - tr, -0.78, 0.34);
        } else {
          this.bodyGroup.rotation.y = 0;
          this.bodyGroup.rotation.x = 0.18;
          this.armRPivot.rotation.set(1.56 + clampedPitch * 0.55, 0.22, -0.18);
          this.armLPivot.rotation.set(1.56 + clampedPitch * 0.55, -0.22, 0.18);
        }
      } else if (st === 'dbz_masenko') {
        if (p < 0.42) {
          this.armRPivot.rotation.set(2.35, 0.48, -0.25);
          this.armLPivot.rotation.set(2.35, -0.48, 0.25);
        } else {
          this.bodyGroup.rotation.x = 0.18;
          this.armRPivot.rotation.set(1.58 + clampedPitch * 0.55, 0.20, -0.16);
          this.armLPivot.rotation.set(1.58 + clampedPitch * 0.55, -0.20, 0.16);
        }
      } else if (st === 'dbz_final_flash') {
        if (p < 0.48) {
          this.armRPivot.rotation.set(1.48, -0.82, 0.22);
          this.armLPivot.rotation.set(1.48, 0.82, -0.22);
        } else {
          this.bodyGroup.rotation.x = 0.16;
          this.armRPivot.rotation.set(1.56 + clampedPitch * 0.55, 0.18, -0.14);
          this.armLPivot.rotation.set(1.56 + clampedPitch * 0.55, -0.18, 0.14);
        }
      } else if (st === 'dbz_finger_beam') {
        this.bodyGroup.rotation.y = 0.26;
        this.armRPivot.rotation.set(1.56 + clampedPitch * 0.65, 0.06, 0);
        this.armLPivot.rotation.set(0.45, -0.35, 0.18);
      } else if (st === 'bleach_getsuga') {
        if (p < 0.36) {
          this.bodyGroup.rotation.x = -0.14;
          this.armRPivot.rotation.set(2.68, 0.32, -0.18);
          this.armLPivot.rotation.set(2.58, -0.38, 0.18);
        } else {
          const r = Math.min(1, (p - 0.36) / 0.45);
          this.bodyGroup.rotation.x = 0.22 * r;
          this.armRPivot.rotation.set(2.68 - 2.25 * r, 0.32 - 0.20 * r, -0.18);
          this.armLPivot.rotation.set(2.58 - 2.15 * r, -0.38 + 0.20 * r, 0.18);
        }
      } else if (st === 'onepiece_haki_slash') {
        if (p < 0.34) {
          this.bodyGroup.rotation.y = -0.48;
          this.armRPivot.rotation.set(1.25, -0.68, 0.42);
        } else {
          const r = Math.min(1, (p - 0.34) / 0.46);
          this.bodyGroup.rotation.y = -0.48 + 0.98 * r;
          this.armRPivot.rotation.set(1.38, -0.68 + 1.44 * r, 0.42 - 0.84 * r);
        }
      } else if (st === 'onepiece_gum_punch') {
        if (p < 0.35) {
          this.bodyGroup.rotation.y = -0.42;
          this.armRPivot.rotation.set(-0.78, -0.32, 0.22);
        } else {
          this.bodyGroup.rotation.y = 0.38;
          this.bodyGroup.rotation.x = 0.18;
          this.armRPivot.rotation.set(1.62 + clampedPitch * 0.55, 0.12, -0.14);
        }
      } else if (st === 'onepiece_kick') {
        const k = Math.sin(p * Math.PI);
        this.bodyGroup.rotation.x = -0.26 * k;
        this.bodyGroup.rotation.y = 0.42 * k;
        this.legRPivot.rotation.set(1.68 * k, -0.24 * k, 0.28 * k);
      } else if (st === 'tensura_nova' || st === 'onepiece_quake') {
        this.armRPivot.rotation.set(2.74, -0.18, 0.24);
        this.armLPivot.rotation.set(2.74, 0.18, -0.24);
      } else {
        this.armRPivot.rotation.set(1.56 + clampedPitch * 0.55, 0.08, -0.12);
      }
    } else if (bp.emote !== 'none' && moving < 0.15 && this.swingTimer <= 0) {
      if (bp.emote === 'wave') {
        this.armRPivot.rotation.set(2.58, 0, -0.32 + Math.sin(this.idleClock * 9.5) * 0.36);
      } else if (bp.emote === 'point') {
        this.armRPivot.rotation.set(1.55 + clampedPitch * 0.65, 0.05, 0);
      } else if (bp.emote === 'guard') {
        this.armRPivot.rotation.set(1.42, 0.42, -0.18);
        this.armLPivot.rotation.set(1.36, -0.42, 0.18);
      } else if (bp.emote === 'cross_arms') {
        this.armRPivot.rotation.set(1.24, 0.68, -0.24);
        this.armLPivot.rotation.set(1.24, -0.68, 0.24);
      } else if (bp.emote === 'power_charge') {
        const tremor = Math.sin(this.idleClock * 36) * 0.03;
        this.bodyGroup.position.y -= 0.12;
        this.armRPivot.rotation.set(0.96 + tremor, -0.32, 0.42);
        this.armLPivot.rotation.set(0.96 - tremor, 0.32, -0.42);
      } else if (bp.emote === 'meditate') {
        const hover = Math.sin(this.idleClock * 2.4) * 0.05;
        this.bodyGroup.position.y -= 0.28 - hover;
        this.headPivot.position.y -= 0.28 - hover;
        this.armLPivot.position.y -= 0.28 - hover;
        this.armRPivot.position.y -= 0.28 - hover;
        this.legLPivot.position.y -= 0.24 - hover;
        this.legRPivot.position.y -= 0.24 - hover;
        this.legLPivot.rotation.set(1.36, 0.36, -0.42);
        this.legRPivot.rotation.set(1.36, -0.36, 0.42);
        this.armLPivot.rotation.set(0.72, -0.38, 0.18);
        this.armRPivot.rotation.set(0.72, 0.38, -0.18);
      } else if (bp.emote === 'victory') {
        this.armRPivot.rotation.set(2.86, 0, -0.18);
        this.armLPivot.rotation.set(-0.22, 0, -0.24);
      }
    }
    if (bp.liveArmActive) {
      this.armRPivot.rotation.set(
        1.32 + bp.reachPitchR * 0.95 + bp.elbowBendR * 0.35,
        bp.reachYawR * 0.85,
        bp.wristTwistR * 0.45
      );
      if (bp.liveArmLeftActive) {
        this.armLPivot.rotation.set(
          1.32 + bp.reachPitchL * 0.95 + bp.elbowBendL * 0.35,
          bp.reachYawL * 0.85,
          -bp.wristTwistL * 0.45
        );
      }
    }
    if (bp.manualOverrideActive) {
      this.armRPivot.rotation.x += bp.reachPitchR + bp.elbowBendR * 0.55;
      this.armRPivot.rotation.y += bp.reachYawR;
      this.armRPivot.rotation.z += bp.wristTwistR * 0.45;
      this.armLPivot.rotation.x += bp.reachPitchL + bp.elbowBendL * 0.55;
      this.armLPivot.rotation.y += bp.reachYawL;
      this.armLPivot.rotation.z += -bp.wristTwistL * 0.45;
      this.bodyGroup.rotation.x += -bp.spineLean;
      this.bodyGroup.rotation.y += bp.spineTwist;
      this.headPivot.rotation.x += bp.headPitchOffset;
      this.headPivot.rotation.y += bp.headYawOffset;
      this.legRPivot.rotation.x += bp.legRStride - bp.kneeRBend * 0.45;
      this.legLPivot.rotation.x += bp.legLStride - bp.kneeLBend * 0.45;
    }
  }

  public dispose(scene: THREE.Scene) {
    this.disposed = true;
    this.glbLoadToken++;
    scene.remove(this.root);
    if (this.glbRig) {
      this.glbRig.dispose();
      this.glbRig = null;
    }
    if (this.heldMesh) {
      disposeHeldMeshSafe(this.heldMesh);
      this.heldMesh = null;
    }
    if (this.offhandMesh) {
      disposeHeldMeshSafe(this.offhandMesh);
      this.offhandMesh = null;
    }
    if (this.spriteMat) this.spriteMat.dispose();
    for (const g of this.ownedGeos) g.dispose();
    for (const m of this.skinMats) m.dispose();
    for (const t of this.skinTexs) t.dispose();
    for (const m of this.ownedMats) m.dispose();
    for (const t of this.ownedTexs) t.dispose();
  }

  public refreshGpuTextures() {
    for (const t of this.skinTexs) t.needsUpdate = true;
    for (const m of this.skinMats) m.needsUpdate = true;
    for (const t of this.ownedTexs) t.needsUpdate = true;
    for (const m of this.ownedMats) m.needsUpdate = true;
    if (this.spriteMat) this.spriteMat.needsUpdate = true;
  }
}

// Smooth Sculpted 3D First-Person Dual-Hand Viewmodel (Rendered in dedicated fpScene with true hardware depth & PBR lights!)
export class FirstPersonHand {
  public group = new THREE.Group();
  private pivot = new THREE.Group();
  private offhandPivot = new THREE.Group();
  private itemMesh: THREE.Object3D | null = null;
  private itemBaseScale = 1;
  private offhandItemMesh: THREE.Object3D | null = null;
  private fpRig: SculptedFpArmRig;
  private currentId = -1;
  private currentLoaded = false;
  private currentOffhandId = -1;
  private currentOffhandLoaded = false;
  private atlasTex: THREE.CanvasTexture;
  private bobPhase = 0;
  private swing = 0;
  private equipProgress = 1.0;
  private offhandEquipProgress = 1.0;
  private slimeHandMode = false;
  private minecraftHandMode = false;
  private mcHandTexs: THREE.Texture[] = [];
  private mcHandMats: THREE.Material[] = [];
  private lastSkinAccent = '#38bdf8';
  private customSleeveHex = '';
  private customSkinHex = '';
  private charArmHandle: CharacterFpArmHandle | null = null;
  private charArmLoadToken = 0;
  private activeCharId = '';

  public poseState: DirectBonePoseState | null = null;
  public blocking = false;
  public blockingMainhand = false;
  public blockingOffhand = false;
  public eatingMainhand = 0;
  public eatingOffhand = 0;
  public bowPull = 0;
  public crossbowPull = 0;
  public spearCouch = 0;
  public tridentAim = 0;
  public cooldownReady = 1;
  public bobberCast = false;

  constructor(atlasTex: THREE.CanvasTexture, skinAccent: string) {
    this.atlasTex = atlasTex;
    this.lastSkinAccent = skinAccent;
    const p = getPreset(skinAccent);
    this.fpRig = buildSculptedFirstPersonArms(p.skin, p.shirt);
    this.fpRig.gripArmGroup.position.set(0, 0, 0);
    this.fpRig.gripArmGroup.rotation.set(0, 0, 0);
    this.fpRig.gripArmGroup.visible = false;

    this.pivot.position.set(0.37, -0.25, -0.58);
    this.pivot.add(this.fpRig.bareArmGroup, this.fpRig.gripArmGroup);

    this.offhandPivot.position.set(-0.38, -0.27, -0.60);
    this.offhandPivot.visible = false;

    this.group.add(this.pivot, this.offhandPivot);
  }

  public setLeftHanded(leftHanded: boolean) {
    this.group.scale.x = leftHanded ? -1 : 1;
  }

  private refreshArmColors() {
    const p = getPreset(this.lastSkinAccent);
    const shirtHex = this.slimeHandMode ? '#0284c7' : this.customSleeveHex || p.shirt;
    const skinHex = this.slimeHandMode ? '#38bdf8' : this.customSkinHex || p.skin;
    const skinCol = new THREE.Color(skinHex);
    const sleeveCol = new THREE.Color(shirtHex);
    const skinEm = skinCol.clone().multiplyScalar(this.slimeHandMode ? 0.28 : 0.12);
    const sleeveEm = sleeveCol.clone().multiplyScalar(this.slimeHandMode ? 0.28 : 0.12);

    for (const m of this.fpRig.skinMats) {
      m.color.copy(skinCol);
      m.emissive.copy(skinEm);
      m.transparent = this.slimeHandMode;
      m.opacity = this.slimeHandMode ? 0.85 : 1.0;
    }
    for (const m of this.fpRig.sleeveMats) {
      m.color.copy(sleeveCol);
      m.emissive.copy(sleeveEm);
      m.transparent = this.slimeHandMode;
      m.opacity = this.slimeHandMode ? 0.85 : 1.0;
    }
  }

  public setCharacterSleeve(shirtHex: string, skinHex: string) {
    if (this.customSleeveHex === shirtHex && this.customSkinHex === skinHex) return;
    this.customSleeveHex = shirtHex;
    this.customSkinHex = skinHex;
    this.refreshArmColors();
  }

  public setMinecraftMode(active: boolean, spec?: CharacterVisualSpec | null) {
    this.minecraftHandMode = active;
    this.fpRig.glbBareGroup.visible = !active;
    this.fpRig.glbGripGroup.visible = !active;
    this.fpRig.mcBareMesh.visible = active;
    this.fpRig.mcGripMesh.visible = active;

    for (const m of this.mcHandMats) m.dispose();
    for (const t of this.mcHandTexs) t.dispose();
    this.mcHandMats.length = 0;
    this.mcHandTexs.length = 0;

    if (active) {
      const mcMats = buildAvatarMaterials(this.lastSkinAccent, spec || null);
      this.mcHandTexs.push(...mcMats.textures);
      this.mcHandMats.push(...mcMats.materials);
      for (const m of mcMats.materials) {
        m.depthTest = true;
        m.depthWrite = true;
      }
      this.fpRig.mcBareMesh.material = mcMats.armRightMats;
      this.fpRig.mcGripMesh.material = mcMats.armRightMats;
      if (this.fpRig.mcBareMesh.children[0] instanceof THREE.Mesh) {
        this.fpRig.mcBareMesh.children[0].material = mcMats.sleeveMats;
      }
      if (this.fpRig.mcGripMesh.children[0] instanceof THREE.Mesh) {
        this.fpRig.mcGripMesh.children[0].material = mcMats.sleeveMats;
      }
    }
    this.syncHandVisibility();
    this.mountMainhandItemMesh();
  }

  public setCharacterModel(charId: string, faction: string | undefined, spec: CharacterVisualSpec | null) {
    const cfg = resolveCharacterGlbConfig(charId, faction);
    const isMc = Boolean(cfg.isMinecraftRig);
    this.setMinecraftMode(isMc, spec);

    if (isMc) {
      this.charArmLoadToken++;
      this.activeCharId = charId;
      if (this.charArmHandle) {
        this.pivot.remove(this.charArmHandle.root);
        this.charArmHandle.dispose();
        this.charArmHandle = null;
      }
      this.syncHandVisibility();
      this.mountMainhandItemMesh();
      return;
    }

    if (this.activeCharId === charId && this.charArmHandle) {
      this.syncHandVisibility();
      this.mountMainhandItemMesh();
      return;
    }

    const token = ++this.charArmLoadToken;
    this.activeCharId = charId;
    this.syncHandVisibility();
    this.mountMainhandItemMesh();

    void buildCharacterFirstPersonArmRig(charId, faction).then((handle) => {
      if (token !== this.charArmLoadToken) {
        handle?.dispose();
        return;
      }
      if (this.charArmHandle) {
        if (this.itemMesh && this.itemMesh.parent === this.charArmHandle.gripSocket) {
          this.charArmHandle.gripSocket.remove(this.itemMesh);
        }
        this.pivot.remove(this.charArmHandle.root);
        this.charArmHandle.dispose();
        this.charArmHandle = null;
      }
      if (handle) {
        this.charArmHandle = handle;
        this.pivot.add(handle.root);
      }
      this.syncHandVisibility();
      this.mountMainhandItemMesh();
    });
  }

  private syncHandVisibility() {
    const hasItem = this.currentId > 0 && this.itemMesh !== null;
    if (this.slimeHandMode) {
      if (this.charArmHandle) this.charArmHandle.root.visible = false;
      this.fpRig.bareArmGroup.visible = !hasItem;
      this.fpRig.gripArmGroup.visible = false;
      return;
    }
    if (this.minecraftHandMode) {
      if (this.charArmHandle) this.charArmHandle.root.visible = false;
      this.fpRig.glbBareGroup.visible = false;
      this.fpRig.glbGripGroup.visible = false;
      this.fpRig.mcBareMesh.visible = true;
      this.fpRig.mcGripMesh.visible = true;
      this.fpRig.bareArmGroup.visible = !hasItem;
      this.fpRig.gripArmGroup.visible = false;
      return;
    }
    if (this.charArmHandle) {
      this.fpRig.bareArmGroup.visible = false;
      this.fpRig.gripArmGroup.visible = false;
      const isSpyglassAds = this.currentId === ITEM.SPYGLASS && this.blocking;
      this.charArmHandle.root.visible = !isSpyglassAds;
      this.charArmHandle.setPose({
        hasItem,
        gripCurl: hasItem ? 0.96 : 0.18
      });
      return;
    }
    // While character GLB arm is loading, suppress fake procedural fallback arm so it never flashes!
    if (this.charArmLoadToken > 0) {
      this.fpRig.bareArmGroup.visible = false;
      this.fpRig.gripArmGroup.visible = false;
    } else {
      this.fpRig.bareArmGroup.visible = !hasItem;
      this.fpRig.gripArmGroup.visible = false;
    }
  }

  private orientFirstPersonItem(
    mesh: THREE.Object3D,
    itemId: number,
    isOffhand: boolean,
    inCharGripSocket = false
  ) {
    const kind = getHeldPoseKind(itemId);
    const side = isOffhand ? -1 : 1;
    const isSmooth3d = Boolean(mesh.userData?.smooth3d);

    // Calibrated Anatomical Palmar Fist-Tunnel Socket (`charArmHandle.gripSocket`):
    // `+Y` runs straight through the closed palm (`pinky -> thumb`, angled forward), and `-Z` points along `edgeForward`.
    // Weapons/tools with `(0,0,0)` grip center, `+Y` shaft, and `-Z` cutting edge sit directly inside the wrapped fingers!
    if (inCharGripSocket && !isOffhand) {
      if (kind === 'crossbow' || kind === 'grapple' || kind === 'spyglass') {
        mesh.position.set(0, 0.015, -0.025);
        mesh.rotation.set(-0.28, 0.06, 0);
      } else if (kind === 'bow') {
        mesh.position.set(0, 0.0, -0.01);
        mesh.rotation.set(-0.12, 0.08, 0.06);
      } else if (kind === 'rod') {
        mesh.position.set(0, -0.02, -0.01);
        mesh.rotation.set(-0.18, 0.08, 0.04);
      } else if (kind === 'polearm' || (isSmooth3d && kind === 'weapon')) {
        const isShovel = getItemDef(itemId).toolClass === 'shovel';
        const isLongBlade =
          itemId === ITEM.ZANGETSU_BLADE ||
          itemId === ITEM.ENMA_KATANA ||
          itemId === ITEM.DRAGON_SLAYER ||
          itemId === ITEM.DIVINE_SCYTHE ||
          itemId === ITEM.ASTRAL_STAFF;
        if (isLongBlade) {
          mesh.scale.multiplyScalar(0.84);
          mesh.position.set(0, -0.01, 0);
          mesh.rotation.set(-0.06, 0, 0);
        } else {
          mesh.position.set(0, 0, 0);
          mesh.rotation.set(-0.04, isShovel ? 0.38 : 0, 0);
        }
      } else if (kind === 'weapon') {
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(-0.08, -Math.PI * 0.5, 0.76);
      } else if (kind === 'torch' || kind === 'totem' || kind === 'potion' || kind === 'bucket' || kind === 'orb' || isSmooth3d) {
        mesh.position.set(0, -0.015, -0.01);
        mesh.rotation.set(-0.06, 0.16, 0.04);
      } else if (kind === 'flat_item') {
        mesh.position.set(0, 0.02, -0.02);
        mesh.rotation.set(-0.10, -0.58, 0.12);
      } else {
        mesh.position.set(0, 0.035, -0.035);
        mesh.rotation.set(0.08, 0.65, 0.04);
      }
      return;
    }

    if (kind === 'shield') {
      // Angled 3D Knight Heater Shield: shows curved beveled steel rim, dark oak grain, golden crest boss & azure gem cleanly!
      mesh.position.set(0.02 * side, -0.06, -0.02);
      mesh.rotation.set(0.06, 0.72 * side, -0.05 * side);
    } else if (kind === 'crossbow' || kind === 'grapple') {
      mesh.position.set(-0.04 * side, 0.01, 0.02);
      mesh.rotation.set(0.08, 0.24 * side, -0.04 * side);
    } else if (kind === 'bow') {
      mesh.position.set(-0.03 * side, 0.01, 0.01);
      mesh.rotation.set(-0.10, 0.30 * side, 0.14 * side);
    } else if (kind === 'rod') {
      mesh.position.set(-0.04 * side, -0.04, 0.01);
      mesh.rotation.set(-0.10, 0.32 * side, 0.10 * side);
    } else if (kind === 'polearm' || (isSmooth3d && kind === 'weapon')) {
      const isShovel = getItemDef(itemId).toolClass === 'shovel';
      const isLongBlade =
        itemId === ITEM.ZANGETSU_BLADE ||
        itemId === ITEM.ENMA_KATANA ||
        itemId === ITEM.DRAGON_SLAYER ||
        itemId === ITEM.DIVINE_SCYTHE ||
        itemId === ITEM.ASTRAL_STAFF;
      if (isLongBlade) {
        mesh.scale.multiplyScalar(0.84);
        mesh.position.set(-0.03 * side, -0.02, -0.02);
        mesh.rotation.set(-0.30, 0.42 * side, 0.14 * side);
      } else {
        mesh.position.set(-0.03 * side, 0.00, 0.01);
        mesh.rotation.set(-0.34, (isShovel ? 0.68 : 0.42) * side, 0.12 * side);
      }
    } else if (kind === 'spyglass') {
      mesh.position.set(-0.04 * side, 0.02, 0.02);
      mesh.rotation.set(0.08, 0.26 * side, -0.04 * side);
    } else if (kind === 'weapon') {
      mesh.position.set(-0.04 * side, 0.00, 0.01);
      mesh.rotation.set(-0.46, isOffhand ? -1.78 : -1.36, 0.70);
    } else if (kind === 'torch') {
      mesh.position.set(-0.02 * side, -0.04, 0.0);
      mesh.rotation.set(-0.22, 0.52 * side, 0.08 * side);
    } else if (kind === 'totem' || kind === 'potion' || kind === 'bucket' || kind === 'orb' || isSmooth3d) {
      mesh.position.set(-0.03 * side, -0.02, 0.01);
      mesh.rotation.set(0.14, 0.42 * side, 0.06 * side);
    } else if (kind === 'flat_item') {
      mesh.position.set(-0.02 * side, 0.01, 0.0);
      mesh.rotation.set(0.10, -0.78 * side, 0.20 * side);
    } else {
      mesh.position.set(0, 0.01, 0);
      mesh.rotation.set(0.26, 0.78 * side, 0.04 * side);
    }
  }

  private mountMainhandItemMesh() {
    if (!this.itemMesh || this.currentId <= 0) return;
    this.itemMesh.parent?.remove(this.itemMesh);
    this.itemMesh.scale.setScalar(this.itemBaseScale);
    const kind = getHeldPoseKind(this.currentId);
    const useCharGrip = Boolean(
      this.charArmHandle && !this.minecraftHandMode && !this.slimeHandMode && kind !== 'shield'
    );
    this.orientFirstPersonItem(this.itemMesh, this.currentId, false, useCharGrip);
    if (useCharGrip && this.charArmHandle) {
      this.charArmHandle.gripSocket.add(this.itemMesh);
    } else {
      this.pivot.add(this.itemMesh);
    }
  }

  private orientGripArm(_kind: HeldPoseKind) {
    // Keep held 3D items/weapons/torches completely clean in first-person without overlapping glove/arm geometry!
    this.fpRig.gripArmGroup.visible = false;
  }

  public setBlock(itemId: number, loaded = false) {
    if (this.currentId === itemId && this.currentLoaded === loaded) return;
    const changedItem = this.currentId !== itemId;
    this.currentId = itemId;
    this.currentLoaded = loaded;
    if (changedItem) this.equipProgress = 0.15;

    if (this.itemMesh) {
      this.itemMesh.parent?.remove(this.itemMesh);
      disposeHeldMeshSafe(this.itemMesh);
      this.itemMesh = null;
    }

    if (itemId > 0) {
      this.itemMesh = buildHeldItem3D(itemId, this.atlasTex, true, loaded);
      if (this.itemMesh) {
        this.itemBaseScale = this.itemMesh.scale.x || 1;
        this.mountMainhandItemMesh();
        this.orientGripArm(getHeldPoseKind(itemId));
        this.syncHandVisibility();
        return;
      }
    }
    this.syncHandVisibility();
    this.mountMainhandItemMesh();
  }

  public setOffhand(itemId: number, loaded = false) {
    if (this.currentOffhandId === itemId && this.currentOffhandLoaded === loaded) return;
    const changed = this.currentOffhandId !== itemId;
    this.currentOffhandId = itemId;
    this.currentOffhandLoaded = loaded;
    if (changed) this.offhandEquipProgress = 0.15;

    if (this.offhandItemMesh) {
      this.offhandPivot.remove(this.offhandItemMesh);
      disposeHeldMeshSafe(this.offhandItemMesh);
      this.offhandItemMesh = null;
    }

    if (itemId > 0) {
      this.offhandItemMesh = buildHeldItem3D(itemId, this.atlasTex, true, loaded);
      if (this.offhandItemMesh) {
        this.orientFirstPersonItem(this.offhandItemMesh, itemId, true);
        this.offhandPivot.add(this.offhandItemMesh);
        this.offhandPivot.visible = true;
        return;
      }
    }
    this.offhandPivot.visible = false;
  }

  public setAccent(hex: string) {
    this.lastSkinAccent = hex;
    this.refreshArmColors();
  }

  public setSlimeHand(active: boolean) {
    if (this.slimeHandMode === active) return;
    this.slimeHandMode = active;
    this.refreshArmColors();
    this.syncHandVisibility();
    this.mountMainhandItemMesh();
  }

  public refreshGpuTextures() {
    for (const m of this.fpRig.skinMats) m.needsUpdate = true;
    for (const m of this.fpRig.sleeveMats) m.needsUpdate = true;
    for (const m of this.fpRig.trimMats) m.needsUpdate = true;
    for (const t of this.mcHandTexs) t.needsUpdate = true;
    for (const m of this.mcHandMats) m.needsUpdate = true;
    if (this.minecraftHandMode) void 0;
  }

  public triggerSwing() {
    this.swing = 1.0;
  }

  public update(dt: number, horizontalSpeed: number, visible: boolean) {
    this.group.visible = visible;
    if (!visible) return;

    this.equipProgress = Math.min(1, this.equipProgress + dt * 6.5);
    this.offhandEquipProgress = Math.min(1, this.offhandEquipProgress + dt * 6.5);

    const isMoving = horizontalSpeed > 0.18;
    if (isMoving) {
      this.bobPhase += dt * (5.5 + horizontalSpeed * 0.85);
    }
    const bobAmt = isMoving ? 0.022 : 0;
    const bx = isMoving ? Math.cos(this.bobPhase * 0.5) * bobAmt : 0;
    const by = isMoving ? Math.abs(Math.sin(this.bobPhase)) * bobAmt : 0;

    // Update dynamic 3D Bow string flex + nocked arrow drawback
    const bowMesh =
      this.currentId === ITEM.BOW
        ? this.itemMesh
        : this.currentOffhandId === ITEM.BOW
          ? this.offhandItemMesh
          : null;
    if (bowMesh?.userData?.bowArrow) {
      const arrowGrp = bowMesh.userData.bowArrow as THREE.Group;
      arrowGrp.visible = this.bowPull > 0.02;
      arrowGrp.position.z = (0.02 + this.bowPull * 0.18) * 0.88;
      if (bowMesh.userData.bowStrings) {
        const { upperStr, lowerStr, scale } = bowMesh.userData.bowStrings as {
          upperStr: THREE.Mesh;
          lowerStr: THREE.Mesh;
          scale: number;
        };
        const pullAngle = this.bowPull * 0.36;
        upperStr.rotation.x = pullAngle;
        lowerStr.rotation.x = -pullAngle;
        upperStr.position.z = (0.16 + this.bowPull * 0.07) * scale;
        lowerStr.position.z = (0.16 + this.bowPull * 0.07) * scale;
      }
    }

    const rodMesh =
      this.currentId === ITEM.FISHING_ROD
        ? this.itemMesh
        : this.currentOffhandId === ITEM.FISHING_ROD
          ? this.offhandItemMesh
          : null;
    if (rodMesh?.userData?.rodBobber) {
      (rodMesh.userData.rodBobber as THREE.Object3D).visible = !this.bobberCast;
    }

    // --- 1. Mainhand (Right Hand) Transform ---
    let sx = 0, sy = 0, sz = 0, rx = 0, ry = 0, rz = 0;
    const equipDip = (1 - this.equipProgress) * 0.24 + (1 - Math.min(1, Math.max(0.25, this.cooldownReady))) * 0.14;

    if (this.swing > 0) {
      this.swing = Math.max(0, this.swing - dt * 4.8);
      const p = 1 - this.swing;
      const s1 = Math.sin(p * Math.PI);
      const s2 = Math.sin(Math.sqrt(p) * Math.PI);
      const stage = (this.poseState?.comboStage ?? 0) % 3;
      if (stage === 1) {
        sx = -0.26 + 0.34 * p;
        sy = 0.06 * s1;
        sz = -0.20 * s2;
        rx = -0.82 * s2;
        ry = -0.44 * s2;
        rz = -0.36 * s1;
      } else if (stage === 2) {
        sx = -0.14 * s2;
        sy = 0.22 * Math.cos(p * Math.PI * 0.85) - 0.08 * s2;
        sz = -0.26 * s2;
        rx = -1.32 * s2;
        ry = 0.16 * s2;
        rz = 0.14 * s1;
      } else {
        sx = -0.18 * s2;
        sy = 0.08 * s1;
        sz = -0.22 * s2;
        rx = -1.04 * s2;
        ry = 0.34 * s2;
        rz = 0.32 * s1;
      }
    } else if (this.eatingMainhand > 0) {
      const chew = Math.abs(Math.sin(performance.now() * 0.024)) * 0.045;
      sx = -0.22;
      sy = 0.12 + chew;
      sz = 0.12;
      rx = 0.26;
      ry = 0.32;
      rz = 0.18;
    } else if ((this.blockingMainhand || (this.blocking && this.currentId === ITEM.SHIELD)) && this.currentId === ITEM.SHIELD) {
      sx = -0.20;
      sy = 0.18;
      sz = 0.08;
      rx = 0.04;
      ry = -0.58;
      rz = 0.10;
    } else if (this.bowPull > 0 && this.currentId === ITEM.BOW) {
      const jitter = this.bowPull >= 0.95 ? Math.sin(performance.now() * 0.045) * 0.004 : 0;
      sx = -0.12 * this.bowPull + jitter;
      sy = 0.06 * this.bowPull;
      sz = 0.12 * this.bowPull;
      rx = 0.08 * this.bowPull;
    } else if (this.crossbowPull > 0 && this.currentId === ITEM.CROSSBOW) {
      const jitter = this.crossbowPull >= 0.95 ? Math.sin(performance.now() * 0.045) * 0.004 : 0;
      sx = -0.14 * this.crossbowPull + jitter;
      sy = 0.05 * this.crossbowPull;
      sz = 0.10 * this.crossbowPull;
      rx = -0.10 * this.crossbowPull;
    } else if (this.spearCouch > 0) {
      sx = -0.10 * this.spearCouch;
      sy = -0.04 * this.spearCouch;
      sz = -0.18 * this.spearCouch;
      rx = -0.62 * this.spearCouch;
      ry = 0.12 * this.spearCouch;
    } else if (this.tridentAim > 0 && this.currentId === ITEM.TRIDENT) {
      const jitter = this.tridentAim >= 0.9 ? Math.sin(performance.now() * 0.05) * 0.005 : 0;
      sx = 0.04 * this.tridentAim + jitter;
      sy = 0.22 * this.tridentAim;
      sz = 0.12 * this.tridentAim;
      rx = 0.65 * this.tridentAim;
      rz = -0.22 * this.tridentAim;
    }

    // Apply Universe Skill Cast Choreography, [C] Live Arm Reach, Emotes & [G] Bone Studio Pose directly to 1st-Person Real Character Arm!
    const ps = this.poseState;
    const hasItem = this.currentId > 0 && this.itemMesh !== null;
    let skillFingerMode: FingerPoseMode = 'auto';
    let skillCurlOverride: number | null = null;
    let skillWristTwist = 0;

    if (ps) {
      if (ps.skillCastTimer > 0 && ps.skillCastStyle !== 'none') {
        const dur = Math.max(0.2, ps.skillCastDuration || 0.75);
        const p = THREE.MathUtils.clamp(1 - ps.skillCastTimer / dur, 0, 1);
        const st = ps.skillCastStyle;
        // Cancel generic melee swing override when a dedicated skill cast choreography is playing
        this.swing = 0;
        sx = 0;
        sy = 0;
        sz = 0;
        rx = 0;
        ry = 0;
        rz = 0;

        if (st === 'naruto_hand_seals') {
          if (p < 0.66) {
            const sealIdx = Math.min(2, Math.floor(p / 0.22));
            const localP = (p - sealIdx * 0.22) / 0.22;
            const snap = Math.sin(localP * Math.PI);
            skillFingerMode = sealIdx === 0 ? 'jutsu_tiger' : sealIdx === 1 ? 'jutsu_snake' : 'jutsu_ram';
            skillCurlOverride = 0.85;
            sx = -0.24 - 0.02 * snap;
            sy = 0.13 + 0.035 * snap;
            sz = 0.05 - 0.02 * snap;
            rx = 0.22 + 0.10 * snap;
            ry = 0.52;
            rz = 0.18 - 0.08 * snap;
            skillWristTwist = 0.25 * (sealIdx % 2 === 0 ? 1 : -1) * snap;
          } else {
            const r = Math.min(1, (p - 0.66) / 0.24);
            skillFingerMode = 'open';
            skillCurlOverride = -0.10;
            sx = -0.24 + 0.10 * r;
            sy = 0.10 - 0.04 * r;
            sz = 0.05 - 0.29 * r;
            rx = 0.22 - 0.58 * r;
            ry = 0.52 - 0.36 * r;
            rz = 0.14 * (1 - r);
          }
        } else if (st === 'naruto_rasengan') {
          if (p < 0.42) {
            const tr = Math.sin(performance.now() * 0.045) * 0.012;
            skillFingerMode = 'ki_cup';
            skillCurlOverride = 0.52;
            sx = -0.06 + tr;
            sy = -0.05;
            sz = 0.08;
            rx = 0.18;
            skillWristTwist = -0.55;
          } else {
            const r = Math.min(1, (p - 0.42) / 0.32);
            skillFingerMode = 'ki_cup';
            skillCurlOverride = 0.42;
            sx = -0.16 * r;
            sy = 0.06 * r;
            sz = -0.28 * r;
            rx = -0.42 * r;
            ry = 0.18 * r;
          }
        } else if (st === 'dbz_kamehameha') {
          if (p < 0.46) {
            const tr = Math.sin(performance.now() * 0.05) * 0.01;
            skillFingerMode = 'ki_cup';
            skillCurlOverride = 0.48;
            sx = 0.08 + tr;
            sy = -0.14;
            sz = 0.14;
            rx = 0.28;
            ry = -0.26;
            skillWristTwist = -0.48;
          } else {
            const r = Math.min(1, (p - 0.46) / 0.26);
            skillFingerMode = 'open';
            skillCurlOverride = -0.12;
            sx = 0.08 - 0.30 * r;
            sy = -0.14 + 0.22 * r;
            sz = 0.14 - 0.38 * r;
            rx = 0.28 - 0.64 * r;
            ry = -0.26 + 0.48 * r;
            skillWristTwist = -0.35 * r;
          }
        } else if (st === 'dbz_masenko' || st === 'dbz_final_flash') {
          if (p < 0.44) {
            skillFingerMode = 'open';
            skillCurlOverride = -0.08;
            sx = st === 'dbz_masenko' ? -0.18 : 0.16;
            sy = st === 'dbz_masenko' ? 0.22 : 0.04;
            sz = 0.08;
            rx = st === 'dbz_masenko' ? 0.44 : 0.12;
            ry = st === 'dbz_masenko' ? 0.38 : -0.45;
          } else {
            const r = Math.min(1, (p - 0.44) / 0.28);
            skillFingerMode = 'open';
            skillCurlOverride = -0.12;
            sx = -0.20 * r;
            sy = 0.08 * r;
            sz = -0.24 * r;
            rx = -0.36 * r;
            ry = 0.24 * r;
          }
        } else if (st === 'dbz_finger_beam') {
          skillFingerMode = 'point';
          skillCurlOverride = 0.85;
          sx = -0.16;
          sy = 0.08;
          sz = -0.22;
          rx = -0.28;
          ry = 0.18;
        } else if (st === 'bleach_getsuga') {
          if (p < 0.36) {
            const c = p / 0.36;
            sx = -0.08 * c;
            sy = 0.24 * c;
            sz = 0.08 * c;
            rx = 0.56 * c;
            rz = -0.18 * c;
          } else {
            const r = Math.min(1, (p - 0.36) / 0.34);
            sx = -0.08 - 0.12 * r;
            sy = 0.24 - 0.42 * r;
            sz = 0.08 - 0.32 * r;
            rx = 0.56 - 1.72 * r;
            ry = 0.22 * r;
          }
        } else if (st === 'onepiece_haki_slash') {
          if (p < 0.34) {
            const c = p / 0.34;
            sx = 0.16 * c;
            sy = 0.04 * c;
            sz = 0.08 * c;
            ry = -0.48 * c;
            rz = 0.36 * c;
          } else {
            const r = Math.min(1, (p - 0.34) / 0.36);
            sx = 0.16 - 0.50 * r;
            sy = 0.04 - 0.06 * r;
            sz = 0.08 - 0.28 * r;
            rx = -0.48 * Math.sin(r * Math.PI);
            ry = -0.48 + 1.12 * r;
            rz = 0.36 - 0.86 * r;
          }
        } else if (st === 'onepiece_gum_punch') {
          skillFingerMode = 'grip';
          skillCurlOverride = 1.05;
          if (p < 0.34) {
            const c = p / 0.34;
            sx = 0.10 * c;
            sy = -0.06 * c;
            sz = 0.18 * c;
            rx = 0.18 * c;
          } else {
            const r = Math.min(1, (p - 0.34) / 0.28);
            sx = 0.10 - 0.28 * r;
            sy = -0.06 + 0.14 * r;
            sz = 0.18 - 0.48 * r;
            rx = 0.18 - 0.64 * r;
            ry = 0.22 * r;
          }
        } else if (st === 'tensura_nova' || st === 'onepiece_quake') {
          skillFingerMode = 'ki_cup';
          skillCurlOverride = 0.38;
          sx = -0.08;
          sy = 0.22;
          sz = -0.08;
          rx = 0.46;
        } else {
          skillFingerMode = 'ki_cup';
          skillCurlOverride = 0.36;
          sx = -0.16;
          sy = 0.08;
          sz = -0.22;
          rx = -0.28;
          ry = 0.16;
        }
      } else if (ps.emote !== 'none' && this.swing <= 0) {
        if (ps.emote === 'wave') {
          sx -= 0.10;
          sy += 0.16;
          sz -= 0.06;
          rz += Math.sin(performance.now() * 0.0095) * 0.34;
        } else if (ps.emote === 'point') {
          sx -= 0.12;
          sy += 0.08;
          sz -= 0.18;
          rx -= 0.24;
        } else if (ps.emote === 'guard') {
          sx -= 0.14;
          sy += 0.12;
          sz += 0.04;
          ry += 0.32;
        } else if (ps.emote === 'victory') {
          sx -= 0.06;
          sy += 0.22;
          rx += 0.35;
        } else if (ps.emote === 'power_charge') {
          const tr = Math.sin(performance.now() * 0.038) * 0.012;
          sx += tr;
          sy -= 0.05;
        }
      }
      if (ps.liveArmActive) {
        sx += -ps.reachYawR * 0.26;
        sy += ps.reachPitchR * 0.22;
        sz += -Math.max(0, 0.35 - ps.elbowBendR) * 0.24 - Math.abs(ps.reachPitchR) * 0.06;
        rx += ps.reachPitchR * 0.42;
        ry += ps.reachYawR * 0.48;
        rz += ps.wristTwistR * 0.52;
      } else if (ps.manualOverrideActive) {
        sx += -ps.reachYawR * 0.18;
        sy += ps.reachPitchR * 0.16;
        rx += ps.reachPitchR * 0.35 + ps.elbowBendR * 0.25;
        ry += ps.reachYawR * 0.35;
        rz += ps.wristTwistR * 0.45;
      }
    }

    if (this.charArmHandle && !this.minecraftHandMode && !this.slimeHandMode) {
      let curl = skillCurlOverride !== null ? skillCurlOverride : hasItem ? 0.98 : this.swing > 0 ? 0.88 : 0.18;
      let reachP = 0;
      let reachY = 0;
      let elbowF = 0;
      let wristT = skillWristTwist;
      if (ps) {
        if (skillCurlOverride === null) {
          if (ps.emote === 'wave') curl = hasItem ? 0.85 : -0.12;
          else if (ps.emote === 'point') curl = hasItem ? 0.90 : 0.55;
          else if (ps.emote === 'guard' || ps.emote === 'victory' || ps.emote === 'power_charge') curl = 0.98;
        }

        if (ps.liveArmActive) {
          const liveCurl = ps.fingerCurlR >= -0.25 ? ps.fingerCurlR : curl;
          curl = hasItem ? Math.max(0.55, liveCurl) : liveCurl;
          reachP = ps.reachPitchR * 0.55;
          reachY = ps.reachYawR * 0.55;
          elbowF = (ps.elbowBendR - 0.25) * 0.45;
          wristT += ps.wristTwistR * 0.65;
        } else if (ps.manualOverrideActive) {
          const manCurl = ps.fingerCurlR >= -0.25 ? ps.fingerCurlR : curl;
          curl = hasItem ? Math.max(0.55, manCurl) : manCurl;
          reachP = ps.reachPitchR * 0.35;
          reachY = ps.reachYawR * 0.35;
          elbowF = ps.elbowBendR * 0.35;
          wristT += ps.wristTwistR * 0.55;
        }
      }
      this.charArmHandle.setPose({
        hasItem,
        gripCurl: curl,
        fingerMode: skillFingerMode,
        reachPitch: reachP,
        reachYaw: reachY,
        elbowFlex: elbowF,
        wristTwist: wristT
      });
    }

    const charLiftY = this.charArmHandle && !this.minecraftHandMode && !this.slimeHandMode ? (hasItem ? 0.065 : 0.035) : 0;
    this.pivot.position.set(0.37 + bx + sx, -0.25 + charLiftY - by + sy - equipDip, -0.58 + sz);
    this.pivot.rotation.set(rx, ry, rz);

    // --- 2. Offhand (Left Hand) Transform ---
    if (this.offhandPivot.visible) {
      let osx = 0, osy = 0, osz = 0, orx = 0, ory = 0, orz = 0;
      const offDip = (1 - this.offhandEquipProgress) * 0.24;

      if (this.eatingOffhand > 0) {
        const chew = Math.abs(Math.sin(performance.now() * 0.024)) * 0.045;
        osx = 0.22;
        osy = 0.12 + chew;
        osz = 0.12;
        orx = 0.26;
        ory = -0.32;
        orz = -0.18;
      } else if (this.blockingOffhand && this.currentOffhandId === ITEM.SHIELD) {
        osx = 0.16;
        osy = 0.13;
        osz = 0.06;
        orx = 0.04;
        ory = 0.44;
        orz = -0.08;
      } else if (this.bowPull > 0 && this.currentOffhandId === ITEM.BOW) {
        const jitter = this.bowPull >= 0.95 ? Math.sin(performance.now() * 0.045) * 0.004 : 0;
        osx = 0.12 * this.bowPull + jitter;
        osy = 0.06 * this.bowPull;
        osz = 0.12 * this.bowPull;
        orx = 0.08 * this.bowPull;
      } else if (this.crossbowPull > 0 && this.currentOffhandId === ITEM.CROSSBOW) {
        osx = 0.14 * this.crossbowPull;
        osy = 0.05 * this.crossbowPull;
        osz = 0.10 * this.crossbowPull;
        orx = -0.10 * this.crossbowPull;
      }

      this.offhandPivot.position.set(-0.38 - bx + osx, -0.27 - by + osy - offDip, -0.60 + osz);
      this.offhandPivot.rotation.set(orx, ory, orz);
    }
  }
}
