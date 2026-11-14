// Authentic 64x64 Skin-Proportioned Horizon / Minecraft 26.3 Player Avatars (Steve, Alex, Sunny, Noor, Zuri, Ari, Makena, Kai),
// 3D Extruded Swords/Tools/Blocks in 1st & 3rd Person Hands, Shield Block Pose (#15811), Sneak Crouch & Vanilla Pixel Nametags

import * as THREE from 'three';
import { BLOCK, TILE, getBlock } from '../world/blocks';
import { buildExtrudedAtlasTileMesh, buildExtrudedItemMesh, getTileUV } from '../world/atlas';
import { ITEM, getItemDef } from '../items/catalog';

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
  horns?: 'none' | 'single' | 'twin' | 'dragon' | 'crown';
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

  // 1. Authentic JAPPA 16x16 Multi-Tone Face (eyebrows, sclera + iris + pupil + catchlight, nose & jawline shading)
  const faceMat = reg(makePixelTex(16, 16, (ctx) => {
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

  return {
    textures,
    materials,
    // BoxGeometry faces: +X (right/east), -X (left/west), +Y (top), -Y (bottom), +Z (back), -Z (front)
    headMats: [headSideMat, headSideMat, hairBackMat, headBottomMat, hairBackMat, faceMat],
    hatMats: [hatSideMat, hatSideMat, hatTopBackMat, hatEmptyMat, hatTopBackMat, hatFrontMat],
    bodyMats: [torsoSideMat, torsoSideMat, torsoSideMat, torsoSideMat, torsoSideMat, torsoFrontMat],
    armRightMats: [armRightMat, armRightMat, torsoSideMat, armEndMat, armRightMat, armRightMat],
    armLeftMats: [armLeftMat, armLeftMat, torsoSideMat, armEndMat, armLeftMat, armLeftMat],
    legMats: [legMat, legMat, legMat, armEndMat, legMat, legMat]
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
  const faceShades = [0.72, 0.72, 1.0, 0.55, 0.86, 0.86];
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
    const topHalf = makeUvBoxMesh(size * 0.72, size * 0.72, size * 0.16, [TILE.OAK_DOOR, TILE.OAK_DOOR, TILE.OAK_DOOR], atlasTex, false, depthTest);
    topHalf.position.y = size * 0.36;
    const botHalf = makeUvBoxMesh(size * 0.72, size * 0.72, size * 0.16, [TILE.OAK_DOOR_LOWER, TILE.OAK_DOOR_LOWER, TILE.OAK_DOOR_LOWER], atlasTex, false, depthTest);
    botHalf.position.y = -size * 0.36;
    g.add(topHalf, botHalf);
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
    const m = makeUvBoxMesh(size * 0.42, size * 0.42, size * 0.42, def.tiles, atlasTex, false, depthTest, 0.42);
    m.position.y = -size * 0.22;
    const g = new THREE.Group();
    g.add(m);
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

export type HeldPoseKind = 'shield' | 'crossbow' | 'bow' | 'spyglass' | 'torch' | 'weapon' | 'flat_item' | 'block';

export function getHeldPoseKind(id: number): HeldPoseKind {
  if (id === ITEM.SHIELD) return 'shield';
  if (id === ITEM.CROSSBOW) return 'crossbow';
  if (id === ITEM.BOW) return 'bow';
  if (id === ITEM.SPYGLASS) return 'spyglass';
  if (id === BLOCK.TORCH || id === BLOCK.LANTERN) {
    return 'torch';
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
      id === ITEM.MACE ||
      id === ITEM.IRON_SPEAR ||
      id === ITEM.DIAMOND_SPEAR ||
      id === ITEM.TRIDENT ||
      id === ITEM.FISHING_ROD ||
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

// Directional per-face vertex shading so 1st-person MeshBasicMaterial viewmodels (Shield, Crossbow, Arrow) have crisp 3D bevels!
function makeShadedBoxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  const faceShades = [0.78, 0.75, 1.0, 0.62, 0.90, 0.94];
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

let cachedShieldFrontTex: THREE.CanvasTexture | null = null;
let cachedShieldBackTex: THREE.CanvasTexture | null = null;

function getShieldFrontTexture(): THREE.CanvasTexture {
  if (!cachedShieldFrontTex) {
    // Authentic Vanilla 12x22 `shield_base_nopattern` pixel art!
    cachedShieldFrontTex = makePixelTex(12, 22, (ctx) => {
      // 1. Dark forged steel perimeter rim
      ctx.fillStyle = '#333842';
      ctx.fillRect(0, 0, 12, 22);
      ctx.fillStyle = '#737d8c';
      ctx.fillRect(1, 1, 10, 20);
      // 2. Warm 4-plank spruce/oak board interior (2..9, 2..19)
      const plankCols = ['#8a5d30', '#9c6c39', '#82562b', '#966635'];
      for (let p = 0; p < 4; p++) {
        ctx.fillStyle = plankCols[p];
        ctx.fillRect(2 + p * 2, 2, 2, 18);
        ctx.fillStyle = '#ad7c46';
        ctx.fillRect(2 + p * 2, 3, 1, 16);
      }
      // Subtle wood grain knots
      ctx.fillStyle = '#69431f';
      ctx.fillRect(3, 6, 1, 3);
      ctx.fillRect(7, 13, 1, 3);
      ctx.fillRect(5, 16, 1, 2);
      // 3. Brushed iron horizontal cross-bands & specular corner studs
      ctx.fillStyle = '#aeb8c6';
      ctx.fillRect(1, 9, 10, 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(2, 9, 8, 1);
      // Corner & mid steel studs
      const studs: Array<[number, number]> = [[1, 1], [10, 1], [1, 20], [10, 20], [1, 10], [10, 10]];
      ctx.fillStyle = '#f1f5f9';
      for (const [sx, sy] of studs) ctx.fillRect(sx, sy, 1, 1);
      // Central raised boss with golden rivet
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
      // Iron cross-braces on inside of shield
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
  const handleMat = mkFaceMat(0x5c3c1e);

  // Authentic Vanilla 12x22x1 Shield Plate (+X, -X, +Y, -Y = steel rim, +Z = back planks, -Z = front emblem!)
  const plateGeo = isFirstPerson
    ? makeShadedBoxGeo(0.48 * s, 0.86 * s, 0.048 * s)
    : new THREE.BoxGeometry(0.48 * s, 0.86 * s, 0.048 * s);
  const plateMats = [rimEdgeMat, rimEdgeMat, rimEdgeMat, rimEdgeMat, backMat, frontMat];
  const plate = new THREE.Mesh(plateGeo, plateMats);
  if (isFirstPerson) plate.renderOrder = 60;
  g.add(plate);

  // Authentic 2x6x6 Rear Handle Grip (+Z side)
  const gripGeo = isFirstPerson
    ? makeShadedBoxGeo(0.08 * s, 0.24 * s, 0.14 * s)
    : new THREE.BoxGeometry(0.08 * s, 0.24 * s, 0.14 * s);
  const grip = new THREE.Mesh(gripGeo, handleMat);
  grip.position.set(0, 0.02 * s, 0.085 * s);
  if (isFirstPerson) grip.renderOrder = 60;
  g.add(grip);

  return g;
}

export function buildCrossbow3D(isFirstPerson: boolean, loaded = false): THREE.Group {
  const g = new THREE.Group();
  const s = isFirstPerson ? 0.90 : 1.0;
  const mkMat = (color: number) =>
    isFirstPerson
      ? new THREE.MeshBasicMaterial({ color, vertexColors: true, depthTest: false, transparent: true })
      : new THREE.MeshLambertMaterial({ color });

  const woodMat = mkMat(0x7c5329);
  const darkWoodMat = mkMat(0x4a3016);
  const ironMat = mkMat(0xcbd5e1);
  const stringMat = mkMat(0xe2e8f0);
  const featherMat = mkMat(0xf8fafc);

  const addPart = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, ry = 0) => {
    const geo = isFirstPerson ? makeShadedBoxGeo(w * s, h * s, d * s) : new THREE.BoxGeometry(w * s, h * s, d * s);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x * s, y * s, z * s);
    mesh.rotation.y = ry;
    if (isFirstPerson) mesh.renderOrder = 60;
    g.add(mesh);
  };

  // Stock extending forward (-Z) from grip (0,0,0)
  addPart(0.08, 0.10, 0.50, 0, 0.03, -0.18, woodMat);
  addPart(0.07, 0.14, 0.09, 0, -0.05, -0.04, darkWoodMat);
  // Horizontal bow prod & swept limbs at front
  addPart(0.46, 0.055, 0.065, 0, 0.05, -0.38, darkWoodMat);
  addPart(0.16, 0.05, 0.055, -0.25, 0.05, -0.32, ironMat, 0.42);
  addPart(0.16, 0.05, 0.055, 0.25, 0.05, -0.32, ironMat, -0.42);
  // Front iron stirrup
  addPart(0.12, 0.035, 0.10, 0, 0.03, -0.46, ironMat);

  if (loaded) {
    // Cocked V-shaped bowstring pulled back to latch + loaded iron-tipped bolt on rail!
    addPart(0.32, 0.022, 0.022, -0.14, 0.065, -0.18, stringMat, -0.68);
    addPart(0.32, 0.022, 0.022, 0.14, 0.065, -0.18, stringMat, 0.68);
    addPart(0.038, 0.038, 0.48, 0, 0.095, -0.27, woodMat);
    addPart(0.075, 0.075, 0.09, 0, 0.095, -0.52, ironMat);
    addPart(0.07, 0.05, 0.07, 0, 0.095, -0.05, featherMat);
  } else {
    // Uncocked straight bowstring
    addPart(0.52, 0.022, 0.022, 0, 0.06, -0.26, stringMat);
  }

  return g;
}

export function buildHeldItem3D(
  id: number,
  atlasTex: THREE.CanvasTexture,
  isFirstPerson: boolean,
  loaded = false
): THREE.Object3D | null {
  if (id <= 0) return null;
  const poseKind = getHeldPoseKind(id);

  if (poseKind === 'shield') {
    return buildShield3D(isFirstPerson);
  }
  if (poseKind === 'crossbow') {
    return buildCrossbow3D(isFirstPerson, loaded);
  }

  const def = getItemDef(id);
  if (!def.isBlock || def.sprite) {
    const isLongReach =
      id === ITEM.IRON_SPEAR || id === ITEM.DIAMOND_SPEAR || id === ITEM.TRIDENT || id === ITEM.MACE;
    const baseScale =
      poseKind === 'spyglass'
        ? isFirstPerson ? 0.38 : 0.40
        : isLongReach
          ? isFirstPerson ? 0.62 : 0.66
          : isFirstPerson ? 0.52 : 0.54;
    // Vanilla Minecraft 1-pixel (1/16th block) extrusion thickness — crisp & sleek, never chunky!
    const thickness = 1.0;
    const extruded = buildExtrudedItemMesh(id, baseScale, thickness);
    if (extruded) {
      if (isFirstPerson) {
        const m = extruded.material as THREE.MeshBasicMaterial;
        m.depthTest = false;
        m.transparent = true;
        extruded.renderOrder = 60;
      }
      const pivotGroup = new THREE.Group();
      if (poseKind === 'weapon' || poseKind === 'spyglass') {
        // Anchor bottom-left hilt/handle (px 2, 13.5) right at (0,0,0) inside the closed fist!
        extruded.position.set(baseScale * 0.31, baseScale * 0.31, 0);
      } else if (poseKind === 'bow') {
        // Anchor wooden bow arch grip (px 1.5, 7.5) right at (0,0,0) inside the closed fist!
        extruded.position.set(baseScale * 0.36, 0, 0);
        // Attach dynamic nocked arrow (revealed & pulled back during bowPull > 0!)
        const arrowGrp = new THREE.Group();
        const mkArrowMat = (color: number) =>
          isFirstPerson
            ? new THREE.MeshBasicMaterial({ color, vertexColors: true, depthTest: false, transparent: true })
            : new THREE.MeshLambertMaterial({ color });
        const shaftMesh = new THREE.Mesh(
          isFirstPerson ? makeShadedBoxGeo(0.44, 0.032, 0.032) : new THREE.BoxGeometry(0.44, 0.032, 0.032),
          mkArrowMat(0x8c6234)
        );
        const tipMesh = new THREE.Mesh(
          isFirstPerson ? makeShadedBoxGeo(0.075, 0.068, 0.068) : new THREE.BoxGeometry(0.075, 0.068, 0.068),
          mkArrowMat(0xdbe4f0)
        );
        tipMesh.position.x = -0.23;
        const fletchMesh = new THREE.Mesh(
          isFirstPerson ? makeShadedBoxGeo(0.065, 0.058, 0.058) : new THREE.BoxGeometry(0.065, 0.058, 0.058),
          mkArrowMat(0xf8fafc)
        );
        fletchMesh.position.x = 0.21;
        if (isFirstPerson) {
          shaftMesh.renderOrder = 61;
          tipMesh.renderOrder = 61;
          fletchMesh.renderOrder = 61;
        }
        arrowGrp.add(shaftMesh, tipMesh, fletchMesh);
        arrowGrp.position.set(0.14, 0.01, 0.025);
        arrowGrp.visible = false;
        pivotGroup.userData.bowArrow = arrowGrp;
        pivotGroup.add(arrowGrp);
      } else {
        extruded.position.set(0, baseScale * 0.06, 0);
      }
      pivotGroup.add(extruded);
      return pivotGroup;
    }
  }
  const blockObj = buildMiniBlockMesh(id, atlasTex, isFirstPerson ? 0.30 : 0.27, !isFirstPerson);
  if (poseKind === 'torch') {
    const wrap = new THREE.Group();
    blockObj.position.y = isFirstPerson ? 0.08 : 0.09;
    wrap.add(blockObj);
    if (isFirstPerson) {
      wrap.traverse((ch) => {
        if ((ch as THREE.Mesh).isMesh) ch.renderOrder = 60;
      });
    }
    return wrap;
  }
  if (isFirstPerson) {
    blockObj.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) ch.renderOrder = 60;
    });
  }
  return blockObj;
}

export function disposeHeldMeshSafe(obj: THREE.Object3D) {
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
  mat: THREE.MeshLambertMaterial,
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
  mat.userData.baseEmissive = enchanted ? 0x2c1458 : 0x000000;
  mat.emissive.setHex(mat.userData.baseEmissive);
  return true;
}

export function orientThirdPersonHeldMesh(mesh: THREE.Object3D, itemId: number, isOffhand = false) {
  const kind = getHeldPoseKind(itemId);
  mesh.position.set(0, 0, 0);
  if (kind === 'shield') {
    if (isOffhand) {
      mesh.position.set(-0.14, 0.16, -0.02);
      mesh.rotation.set(-0.36, 0.44, 0);
    } else {
      mesh.position.set(0.14, 0.16, -0.02);
      mesh.rotation.set(-0.36, -0.44, 0);
    }
  } else if (kind === 'crossbow') {
    mesh.position.set(0, 0.02, -0.04);
    mesh.rotation.set(-0.42, isOffhand ? -0.06 : 0.06, 0);
  } else if (kind === 'bow') {
    // Wooden bow arch (-X) faces forward (-Z), bowstring (+X) faces archer (+Z)
    mesh.position.set(0, 0.02, -0.03);
    mesh.rotation.set(-0.42, -1.52, 0);
  } else if (kind === 'spyglass') {
    // Brass barrel extends straight forward (-Z)
    mesh.position.set(0, 0.02, -0.02);
    mesh.rotation.set(-1.18, isOffhand ? -1.62 : -1.48, 0.80);
  } else if (kind === 'weapon') {
    // Canonical Vanilla handheld transform: compensatest armRPivot rx=+0.42 so shaft goes UP (+Y) & FORWARD (-Z),
    // and Axe/Hoe cutting blade (-X,+Y) points 92% STRAIGHT FORWARD (-Z) & slightly down (-Y)!
    mesh.rotation.set(-0.78, isOffhand ? -1.64 : -1.48, 0.82);
  } else if (kind === 'torch') {
    mesh.position.set(0, 0.01, -0.03);
    mesh.rotation.set(-0.18, isOffhand ? -0.25 : 0.25, 0);
  } else if (kind === 'flat_item') {
    mesh.position.set(0, 0.04, -0.04);
    mesh.rotation.set(-0.22, isOffhand ? -0.32 : 0.32, 0);
  } else {
    mesh.position.set(0, 0.02, -0.05);
    mesh.rotation.set(-0.12, isOffhand ? -0.58 : 0.58, 0);
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

export class VoxelCharacter {
  public root = new THREE.Group();
  private headPivot = new THREE.Group();
  private headMesh: THREE.Mesh;
  private hatMesh: THREE.Mesh;
  private bodyMesh: THREE.Mesh;
  private armLMesh: THREE.Mesh;
  private armRMesh: THREE.Mesh;
  private legLMesh: THREE.Mesh;
  private legRMesh: THREE.Mesh;
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
  private currentVisualId = '';
  private idleClock = Math.random() * 10;
  public poseMode: 'none' | 'bow' | 'crossbow' | 'trident' | 'spear' | 'spyglass' | 'eat' = 'none';

  private headArmorGroup = new THREE.Group();
  private chestArmorMesh: THREE.Mesh;
  private armLArmorMesh: THREE.Mesh;
  private armRArmorMesh: THREE.Mesh;
  private beltArmorMesh: THREE.Mesh;
  private legLArmorMesh: THREE.Mesh;
  private legRArmorMesh: THREE.Mesh;
  private bootLArmorMesh: THREE.Mesh;
  private bootRArmorMesh: THREE.Mesh;

  private headArmorMat: THREE.MeshLambertMaterial;
  private chestArmorMat: THREE.MeshLambertMaterial;
  private legsArmorMat: THREE.MeshLambertMaterial;
  private feetArmorMat: THREE.MeshLambertMaterial;

  // Tensura Character 3D Accessories (Oni/Dragon Horns, Halo Crown & Animated Wings)
  private hornMat: THREE.MeshLambertMaterial;
  private wingMat: THREE.MeshLambertMaterial;
  private elytraMat: THREE.MeshLambertMaterial;
  private hornSingleMesh: THREE.Mesh;
  private hornLeftMesh: THREE.Mesh;
  private hornRightMesh: THREE.Mesh;
  private charCrownMesh: THREE.Mesh;
  private wingLPivot = new THREE.Group();
  private wingRPivot = new THREE.Group();
  private elytraLPivot = new THREE.Group();
  private elytraRPivot = new THREE.Group();

  private skinTexs: THREE.Texture[] = [];
  private skinMats: THREE.MeshLambertMaterial[] = [];
  private ownedGeos: THREE.BufferGeometry[] = [];
  private ownedMats: THREE.MeshLambertMaterial[] = [];
  private spriteMat: THREE.SpriteMaterial | null = null;
  private ownedTexs: THREE.Texture[] = [];

  private slimeGroup = new THREE.Group();
  private slimeOuter!: THREE.Mesh;
  private slimeCore!: THREE.Mesh;
  private slimeCrown!: THREE.Mesh;
  private slimeOuterMat!: THREE.MeshLambertMaterial;
  private slimeCoreMat!: THREE.MeshLambertMaterial;
  public slimeForm = false;

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
  private atlasTex: THREE.CanvasTexture;

  constructor(name: string, accentHex: string, atlasTex: THREE.CanvasTexture, showNametag = true) {
    this.renderedName = name;
    this.renderedColor = accentHex;
    this.atlasTex = atlasTex;

    const skin = buildAvatarMaterials(accentHex);
    this.skinTexs.push(...skin.textures);
    this.skinMats.push(...skin.materials);

    this.headArmorMat = new THREE.MeshLambertMaterial({ color: 0xdce3ec });
    this.chestArmorMat = new THREE.MeshLambertMaterial({ color: 0xdce3ec });
    this.legsArmorMat = new THREE.MeshLambertMaterial({ color: 0xdce3ec });
    this.feetArmorMat = new THREE.MeshLambertMaterial({ color: 0xdce3ec });
    this.hornMat = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x3b1c08 });
    this.hornMat.userData.baseEmissive = 0x3b1c08;
    this.wingMat = new THREE.MeshLambertMaterial({ color: 0x1e1b4b, emissive: 0x110e2e, transparent: true, opacity: 0.90 });
    this.wingMat.userData.baseEmissive = 0x110e2e;
    this.elytraMat = new THREE.MeshLambertMaterial({ map: getElytraTexture(), transparent: true, alphaTest: 0.25 });
    this.elytraMat.userData.baseEmissive = 0x000000;
    this.ownedMats.push(this.headArmorMat, this.chestArmorMat, this.legsArmorMat, this.feetArmorMat, this.hornMat, this.wingMat, this.elytraMat);

    const makeBox = (w: number, h: number, d: number, mats: THREE.Material | THREE.Material[]) => {
      const g = new THREE.BoxGeometry(w, h, d);
      this.ownedGeos.push(g);
      return new THREE.Mesh(g, mats);
    };

    // Head (8x8x8 -> 0.46m cube) + 64x64 Second Skin Hair/Hat Layer (0.494m) + Open-Face 3D Helmet Shell + Tensura Horns/Crown
    this.headMesh = makeBox(0.46, 0.46, 0.46, skin.headMats);
    this.headMesh.position.y = 0.23;
    this.hatMesh = makeBox(0.494, 0.494, 0.494, skin.hatMats);
    this.hatMesh.position.y = 0.23;
    this.headPivot.position.set(0, 1.36, 0);
    this.headPivot.add(this.headMesh, this.hatMesh);

    this.hornSingleMesh = makeBox(0.065, 0.22, 0.065, this.hornMat);
    this.hornSingleMesh.position.set(0, 0.50, -0.22);
    this.hornSingleMesh.rotation.x = 0.34;
    this.hornSingleMesh.visible = false;

    this.hornLeftMesh = makeBox(0.065, 0.24, 0.065, this.hornMat);
    this.hornLeftMesh.position.set(-0.15, 0.52, -0.18);
    this.hornLeftMesh.rotation.set(0.32, 0, 0.24);
    this.hornLeftMesh.visible = false;

    this.hornRightMesh = makeBox(0.065, 0.24, 0.065, this.hornMat);
    this.hornRightMesh.position.set(0.15, 0.52, -0.18);
    this.hornRightMesh.rotation.set(0.32, 0, -0.24);
    this.hornRightMesh.visible = false;

    this.charCrownMesh = makeBox(0.49, 0.08, 0.49, this.hornMat);
    this.charCrownMesh.position.set(0, 0.50, 0);
    this.charCrownMesh.visible = false;

    this.headPivot.add(this.hornSingleMesh, this.hornLeftMesh, this.hornRightMesh, this.charCrownMesh);

    const helmTop = makeBox(0.52, 0.14, 0.52, this.headArmorMat);
    helmTop.position.set(0, 0.42, 0);
    const helmBack = makeBox(0.52, 0.36, 0.10, this.headArmorMat);
    helmBack.position.set(0, 0.24, 0.21);
    const helmL = makeBox(0.08, 0.34, 0.50, this.headArmorMat);
    helmL.position.set(-0.22, 0.24, 0.01);
    const helmR = makeBox(0.08, 0.34, 0.50, this.headArmorMat);
    helmR.position.set(0.22, 0.24, 0.01);
    const helmNose = makeBox(0.10, 0.12, 0.06, this.headArmorMat);
    helmNose.position.set(0, 0.30, -0.24);
    this.headArmorGroup.add(helmTop, helmBack, helmL, helmR, helmNose);
    this.headArmorGroup.visible = false;
    this.headPivot.add(this.headArmorGroup);
    this.root.add(this.headPivot);

    // Body (8x12x4) + Chestplate Cuirass & Leggings Belt + Tensura 3D Wings
    this.bodyMesh = makeBox(0.46, 0.68, 0.24, skin.bodyMats);
    this.bodyMesh.position.set(0, 1.02, 0);
    this.chestArmorMesh = makeBox(0.51, 0.56, 0.30, this.chestArmorMat);
    this.chestArmorMesh.position.set(0, 0.06, 0);
    this.chestArmorMesh.visible = false;
    this.bodyMesh.add(this.chestArmorMesh);
    this.beltArmorMesh = makeBox(0.49, 0.16, 0.28, this.legsArmorMat);
    this.beltArmorMesh.position.set(0, -0.27, 0);
    this.beltArmorMesh.visible = false;
    this.bodyMesh.add(this.beltArmorMesh);

    const wingBladeL1 = makeBox(0.54, 0.26, 0.04, this.wingMat);
    wingBladeL1.position.set(-0.28, 0.10, 0);
    wingBladeL1.rotation.z = 0.28;
    const wingBladeL2 = makeBox(0.42, 0.22, 0.04, this.wingMat);
    wingBladeL2.position.set(-0.24, -0.10, 0);
    wingBladeL2.rotation.z = -0.16;
    this.wingLPivot.position.set(-0.08, 0.14, 0.14);
    this.wingLPivot.add(wingBladeL1, wingBladeL2);
    this.wingLPivot.visible = false;

    const wingBladeR1 = makeBox(0.54, 0.26, 0.04, this.wingMat);
    wingBladeR1.position.set(0.28, 0.10, 0);
    wingBladeR1.rotation.z = -0.28;
    const wingBladeR2 = makeBox(0.42, 0.22, 0.04, this.wingMat);
    wingBladeR2.position.set(0.24, -0.10, 0);
    wingBladeR2.rotation.z = 0.16;
    this.wingRPivot.position.set(0.08, 0.14, 0.14);
    this.wingRPivot.add(wingBladeR1, wingBladeR2);
    this.wingRPivot.visible = false;

    this.bodyMesh.add(this.wingLPivot, this.wingRPivot);

    // Vanilla 3D Elytra Glider Wings (mounted on upper back, folded at rest & flared wide when gliding)
    const elytraWingL = makeBox(0.32, 0.72, 0.055, this.elytraMat);
    elytraWingL.position.set(-0.11, -0.32, 0.02);
    this.elytraLPivot.position.set(-0.04, 0.30, 0.14);
    this.elytraLPivot.rotation.set(0.08, 0.12, 0.16);
    this.elytraLPivot.add(elytraWingL);
    this.elytraLPivot.visible = false;

    const elytraWingR = makeBox(0.32, 0.72, 0.055, this.elytraMat);
    elytraWingR.position.set(0.11, -0.32, 0.02);
    this.elytraRPivot.position.set(0.04, 0.30, 0.14);
    this.elytraRPivot.rotation.set(0.08, -0.12, -0.16);
    this.elytraRPivot.add(elytraWingR);
    this.elytraRPivot.visible = false;

    this.bodyMesh.add(this.elytraLPivot, this.elytraRPivot);
    this.root.add(this.bodyMesh);

    // Left & Right Arms (4x12x4) + Pauldrons + Offhand Shield Mount
    this.armLMesh = makeBox(0.22, 0.68, 0.22, skin.armLeftMats);
    this.armLMesh.position.y = -0.26;
    this.armLArmorMesh = makeBox(0.26, 0.32, 0.26, this.chestArmorMat);
    this.armLArmorMesh.position.set(-0.01, -0.09, 0);
    this.armLArmorMesh.visible = false;
    this.armLPivot.position.set(-0.34, 1.30, 0);
    this.offhandMount.position.set(-0.02, -0.56, -0.09);
    this.armLPivot.add(this.armLMesh, this.armLArmorMesh, this.offhandMount);
    this.root.add(this.armLPivot);

    this.armRMesh = makeBox(0.22, 0.68, 0.22, skin.armRightMats);
    this.armRMesh.position.y = -0.26;
    this.armRArmorMesh = makeBox(0.26, 0.32, 0.26, this.chestArmorMat);
    this.armRArmorMesh.position.set(0.01, -0.09, 0);
    this.armRArmorMesh.visible = false;
    this.armRPivot.position.set(0.34, 1.30, 0);
    this.armRPivot.add(this.armRMesh, this.armRArmorMesh);

    this.heldMount.position.set(0.02, -0.56, -0.09);
    this.armRPivot.add(this.heldMount);
    this.root.add(this.armRPivot);

    // Left & Right Legs (4x12x4) + Leggings Greaves + Boots
    this.legLMesh = makeBox(0.22, 0.68, 0.22, skin.legMats);
    this.legLMesh.position.y = -0.34;
    this.legLArmorMesh = makeBox(0.25, 0.44, 0.25, this.legsArmorMat);
    this.legLArmorMesh.position.set(0, -0.23, 0);
    this.legLArmorMesh.visible = false;
    this.bootLArmorMesh = makeBox(0.27, 0.24, 0.28, this.feetArmorMat);
    this.bootLArmorMesh.position.set(0, -0.57, -0.01);
    this.bootLArmorMesh.visible = false;
    this.legLPivot.position.set(-0.12, 0.68, 0);
    this.legLPivot.add(this.legLMesh, this.legLArmorMesh, this.bootLArmorMesh);
    this.root.add(this.legLPivot);

    this.legRMesh = makeBox(0.22, 0.68, 0.22, skin.legMats);
    this.legRMesh.position.y = -0.34;
    this.legRArmorMesh = makeBox(0.25, 0.44, 0.25, this.legsArmorMat);
    this.legRArmorMesh.position.set(0, -0.23, 0);
    this.legRArmorMesh.visible = false;
    this.bootRArmorMesh = makeBox(0.27, 0.24, 0.28, this.feetArmorMat);
    this.bootRArmorMesh.position.set(0, -0.57, -0.01);
    this.bootRArmorMesh.visible = false;
    this.legRPivot.position.set(0.12, 0.68, 0);
    this.legRPivot.add(this.legRMesh, this.legRArmorMesh, this.bootRArmorMesh);
    this.root.add(this.legRPivot);

    // Tensura Rimuru Slime Form (3D Azure Gel Body + Glowing Magicule Core + Golden Eyes + Demon Lord Ring)
    this.slimeOuterMat = new THREE.MeshLambertMaterial({
      color: 0x38bdf8,
      emissive: 0x0c4a6e,
      transparent: true,
      opacity: 0.82
    });
    this.slimeOuterMat.userData.baseEmissive = 0x0c4a6e;
    this.slimeCoreMat = new THREE.MeshLambertMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8
    });
    this.slimeCoreMat.userData.baseEmissive = 0x38bdf8;
    const slimeEyeMat = new THREE.MeshLambertMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15
    });
    slimeEyeMat.userData.baseEmissive = 0xfacc15;
    const slimeCrownMat = new THREE.MeshLambertMaterial({
      color: 0xfacc15,
      emissive: 0xb45309
    });
    slimeCrownMat.userData.baseEmissive = 0xb45309;
    this.ownedMats.push(this.slimeOuterMat, this.slimeCoreMat, slimeEyeMat, slimeCrownMat);

    this.slimeOuter = makeBox(0.74, 0.62, 0.74, this.slimeOuterMat);
    this.slimeOuter.position.set(0, 0.31, 0);
    this.slimeCore = makeBox(0.34, 0.30, 0.34, this.slimeCoreMat);
    this.slimeCore.position.set(0, 0.30, 0);
    const eyeL = makeBox(0.12, 0.05, 0.04, slimeEyeMat);
    eyeL.position.set(-0.14, 0.36, -0.375);
    eyeL.rotation.z = -0.14;
    const eyeR = makeBox(0.12, 0.05, 0.04, slimeEyeMat);
    eyeR.position.set(0.14, 0.36, -0.375);
    eyeR.rotation.z = 0.14;
    this.slimeCrown = makeBox(0.46, 0.08, 0.46, slimeCrownMat);
    this.slimeCrown.position.set(0, 0.68, 0);
    this.slimeCrown.visible = false;

    this.slimeGroup.add(this.slimeCore, this.slimeOuter, eyeL, eyeR, this.slimeCrown);
    this.slimeGroup.visible = false;
    this.root.add(this.slimeGroup);

    if (showNametag) {
      const nt = makeNametagSprite(name);
      nt.sprite.position.set(0, 2.08, 0);
      this.nametagSprite = nt.sprite;
      this.spriteMat = nt.sprite.material;
      this.ownedTexs.push(nt.tex);
      this.root.add(nt.sprite);
    }
  }

  public applyCharacterVisual(spec: CharacterVisualSpec | null) {
    const nextId = spec ? spec.id : '';
    if (this.currentVisualId === nextId) return;
    this.currentVisualId = nextId;

    for (const m of this.skinMats) m.dispose();
    for (const t of this.skinTexs) t.dispose();
    this.skinMats.length = 0;
    this.skinTexs.length = 0;

    const skin = buildAvatarMaterials(this.renderedColor, spec);
    this.skinTexs.push(...skin.textures);
    this.skinMats.push(...skin.materials);

    this.headMesh.material = skin.headMats;
    this.hatMesh.material = skin.hatMats;
    this.bodyMesh.material = skin.bodyMats;
    this.armLMesh.material = skin.armLeftMats;
    this.armRMesh.material = skin.armRightMats;
    this.legLMesh.material = skin.legMats;
    this.legRMesh.material = skin.legMats;

    const horns = spec?.horns || 'none';
    this.hornMat.color.setHex(spec?.hornColor ?? 0xfacc15);
    this.hornSingleMesh.visible = horns === 'single';
    this.hornLeftMesh.visible = horns === 'twin' || horns === 'dragon';
    this.hornRightMesh.visible = horns === 'twin' || horns === 'dragon';
    this.charCrownMesh.visible = horns === 'crown';

    const wings = spec?.wings || 'none';
    const showWings = wings !== 'none';
    this.wingMat.color.setHex(spec?.wingColor ?? 0x1e1b4b);
    this.wingLPivot.visible = showWings;
    this.wingRPivot.visible = showWings;

    const sCol = spec?.slimeColor ?? 0x38bdf8;
    this.slimeOuterMat.color.setHex(sCol);
    this.slimeCoreMat.emissive.setHex(sCol);
  }

  public setSlimeForm(active: boolean, evoStage = 0) {
    this.slimeForm = active;
    this.slimeGroup.visible = active;
    this.slimeCrown.visible = active && evoStage >= 3;
    this.headPivot.visible = !active;
    this.bodyMesh.visible = !active;
    this.armLPivot.visible = !active;
    this.armRPivot.visible = !active;
    this.legLPivot.visible = !active;
    this.legRPivot.visible = !active;
    if (this.nametagSprite) {
      this.nametagSprite.position.y = active ? 1.28 : 2.08;
    }
  }

  public setArmor(headId: number, chestId: number, legsId: number, feetId: number, enchMask = 0) {
    const key = `${headId},${chestId},${legsId},${feetId},${enchMask}`;
    if (this.currentArmorKey === key) return;
    this.currentArmorKey = key;

    if (headId === BLOCK.CARVED_PUMPKIN) {
      this.headArmorGroup.visible = true;
      this.headArmorMat.map = null;
      this.headArmorMat.color.setHex(0xd97706);
      this.headArmorMat.userData.baseEmissive = 0x000000;
      this.headArmorMat.emissive.setHex(0x000000);
      this.headArmorMat.needsUpdate = true;
    } else {
      const hasH = applyArmorSlotMaterial(this.headArmorMat, headId, 'helm', !!(enchMask & 1));
      this.headArmorGroup.visible = hasH;
    }
    this.hatMesh.visible = !this.headArmorGroup.visible;

    const isElytra = chestId === ITEM.ELYTRA;
    this.elytraLPivot.visible = isElytra;
    this.elytraRPivot.visible = isElytra;
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
        orientThirdPersonHeldMesh(this.offhandMesh, itemId, true);
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
        orientThirdPersonHeldMesh(this.heldMesh, itemId, false);
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

    // Snap if teleported > 18 blocks, otherwise smooth 16Hz exponential interpolation
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
    this.animateLimbs(dt, speed, this.targetPitch);
  }

  public syncDirect(x: number, y: number, z: number, yaw: number, pitch: number, speed: number, sneak: boolean, dt: number) {
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
    this.sneaking = sneak;
    this.animateLimbs(dt, speed, pitch);
  }

  private animateLimbs(dt: number, speed: number, pitch: number) {
    this.idleClock += dt;
    const clampedPitch = Math.max(-1.1, Math.min(1.1, pitch));
    this.headPivot.rotation.x = clampedPitch;

    // Hurt red flash tint (preserves enchanted armor glow when recovery finishes)
    if (this.hurtTimer > 0) {
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
      const flashHex = this.hurtTimer > 0 ? 0x881111 : 0x000000;
      for (const m of this.skinMats) {
        m.emissive.setHex(flashHex);
      }
      for (const m of this.ownedMats) {
        m.emissive.setHex(this.hurtTimer > 0 ? 0x881111 : m.userData?.baseEmissive || 0x000000);
      }
    }

    if (this.wingLPivot.visible) {
      const flap = 0.34 + Math.sin(performance.now() * 0.0045) * 0.18 + Math.min(0.25, speed * 0.04);
      this.wingLPivot.rotation.y = flap;
      this.wingRPivot.rotation.y = -flap;
    }

    const moving = Math.min(1, speed / 4.2);

    if (this.elytraLPivot.visible) {
      if (this.gliding) {
        const flutter = Math.sin(this.idleClock * 9.0) * 0.04;
        this.elytraLPivot.rotation.set(0.24, 0.22, -0.82 + flutter);
        this.elytraRPivot.rotation.set(0.24, -0.22, 0.82 - flutter);
      } else {
        const capeSway = Math.min(0.42, moving * 0.34) + (this.sneaking ? 0.28 : 0);
        this.elytraLPivot.rotation.set(0.08 + capeSway, 0.12, 0.15);
        this.elytraRPivot.rotation.set(0.08 + capeSway, -0.12, -0.15);
      }
    }

    // Smooth Elytra horizontal flight pitch on root
    const targetRootPitch = this.gliding && !this.slimeForm ? -1.32 : 0;
    this.root.rotation.x += (targetRootPitch - this.root.rotation.x) * Math.min(1, dt * 12);

    if (moving > 0.03) {
      this.walkPhase += dt * (4.8 + moving * 6.8);
    }
    const swingAmp = 0.74 * moving;
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
      if (this.slimeCrown.visible) {
        this.slimeCrown.rotation.y += dt * 2.2;
      }
      if (this.nametagSprite && this.spriteMat) {
        this.nametagSprite.position.y = (this.sneaking ? 1.12 : 1.28) + bounce * 0.16;
        this.spriteMat.opacity = this.sneaking ? 0.55 : 1.0;
      }
      return;
    }

    // Authentic Vanilla Sneak / Crouch posture!
    if (this.sneaking) {
      this.bodyMesh.rotation.x = -0.44;
      this.bodyMesh.position.set(0, 0.93, 0.08);
      this.headPivot.position.set(0, 1.20, -0.05);
      this.armLPivot.position.set(-0.34, 1.18, -0.03);
      this.armRPivot.position.set(0.34, 1.18, -0.03);
      this.legLPivot.position.set(-0.12, 0.66, 0.16);
      this.legRPivot.position.set(0.12, 0.66, 0.16);
      if (this.nametagSprite && this.spriteMat) {
        this.nametagSprite.position.y = 1.90;
        this.spriteMat.opacity = 0.52;
      }
    } else {
      this.bodyMesh.rotation.x = 0;
      this.bodyMesh.position.set(0, 1.02, 0);
      this.headPivot.position.set(0, 1.36, 0);
      this.armLPivot.position.set(-0.34, 1.30, 0);
      this.armRPivot.position.set(0.34, 1.30, 0);
      this.legLPivot.position.set(-0.12, 0.68, 0);
      this.legRPivot.position.set(0.12, 0.68, 0);
      if (this.nametagSprite && this.spriteMat) {
        this.nametagSprite.position.y = 2.08;
        this.spriteMat.opacity = 1.0;
      }
    }

    this.legLPivot.rotation.x = w;
    this.legRPivot.rotation.x = -w;

    // Left Arm (Offhand) Pose
    if (this.poseMode === 'bow' || this.poseMode === 'crossbow') {
      this.armLPivot.rotation.set(1.42 + clampedPitch * 0.65, -0.42, 0.08);
    } else if (this.blocking && this.hasOffhandShield) {
      this.armLPivot.rotation.set(0.92, -0.52, 0.28);
    } else {
      this.armLPivot.rotation.set(
        -w * 0.85 + (this.offhandMesh ? 0.38 : 0) + (this.sneaking ? -0.35 : 0) - breathX,
        0,
        -breathZ
      );
    }

    // Right Arm (Mainhand) Pose
    if (this.swingTimer > 0) {
      this.swingTimer = Math.max(0, this.swingTimer - dt);
      const p = 1 - this.swingTimer / 0.26;
      const s = Math.sin(Math.sqrt(p) * Math.PI);
      this.armRPivot.rotation.x = 0.48 + s * 1.48;
      this.armRPivot.rotation.y = -Math.sin(p * Math.PI) * 0.28;
      this.armRPivot.rotation.z = -Math.sin(p * Math.PI) * 0.20;
    } else if (this.poseMode === 'bow') {
      this.armRPivot.rotation.set(1.48 + clampedPitch * 0.65, 0.16, 0);
    } else if (this.poseMode === 'crossbow') {
      this.armRPivot.rotation.set(1.38 + clampedPitch * 0.55, 0.24, 0);
    } else if (this.poseMode === 'trident') {
      this.armRPivot.rotation.set(2.75, 0, -0.14);
    } else if (this.poseMode === 'spear') {
      this.armRPivot.rotation.set(1.05, 0.08, 0);
    } else if (this.poseMode === 'spyglass') {
      this.armRPivot.rotation.set(1.52 + clampedPitch * 0.75, 0.34, 0);
    } else if (this.poseMode === 'eat') {
      const chew = Math.abs(Math.sin(this.idleClock * 18)) * 0.22;
      this.armRPivot.rotation.set(1.35 + chew, 0.38, -0.15);
    } else if (this.blocking && this.currentHeldId === ITEM.SHIELD) {
      this.armRPivot.rotation.set(0.92, 0.52, -0.28);
    } else {
      this.armRPivot.rotation.set(
        w * 0.72 + (this.heldMesh ? 0.42 : 0) + (this.sneaking ? -0.30 : 0) + breathX,
        0,
        (this.heldMesh ? 0.04 : 0) + breathZ
      );
    }
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.root);
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

// First-Person Dual-Hand Viewmodel (Mainhand + Offhand 3D Shield/Weapons/Blocks + Canonical Vanilla Poses!)
export class FirstPersonHand {
  public group = new THREE.Group();
  private pivot = new THREE.Group();
  private offhandPivot = new THREE.Group();
  private itemMesh: THREE.Object3D | null = null;
  private offhandItemMesh: THREE.Object3D | null = null;
  private armMesh: THREE.Mesh;
  private armTex: THREE.CanvasTexture | null = null;
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
  private lastSkinAccent = '#a9a9ff';
  private customSleeveHex = '';
  private customSkinHex = '';

  // Separate per-hand shield block & eating states so blocks/food/tools NEVER trigger fake shield poses!
  public blocking = false; // legacy alias
  public blockingMainhand = false;
  public blockingOffhand = false;
  public eatingMainhand = 0; // 0..1 active eating progress
  public eatingOffhand = 0;  // 0..1 active eating progress
  public bowPull = 0;        // 0..1 hold-to-draw bow tension
  public crossbowPull = 0;   // 0..1 horizontal crossbow draw tension
  public spearCouch = 0;     // 0..1 Horizon 26.3 couched lance charge
  public tridentAim = 0;     // 0..1 overhead trident throw aim
  public cooldownReady = 1;  // 0..1 Vanilla 1.9+ attack indicator height

  constructor(atlasTex: THREE.CanvasTexture, skinAccent: string) {
    this.atlasTex = atlasTex;
    this.lastSkinAccent = skinAccent;
    const mat = this.makeArmMaterial(skinAccent);
    this.armMesh = new THREE.Mesh(makeShadedBoxGeo(0.18, 0.54, 0.18), mat);
    this.armMesh.position.set(0.06, -0.18, 0.08);
    this.armMesh.rotation.set(0.95, -0.25, -0.22);
    this.armMesh.renderOrder = 58;

    this.pivot.position.set(0.44, -0.36, -0.66);
    this.pivot.add(this.armMesh);

    this.offhandPivot.position.set(-0.44, -0.36, -0.66);
    this.offhandPivot.visible = false;

    this.group.add(this.pivot, this.offhandPivot);
  }

  public setLeftHanded(leftHanded: boolean) {
    this.group.scale.x = leftHanded ? -1 : 1;
  }

  private makeArmMaterial(accentHex: string): THREE.MeshBasicMaterial {
    const p = getPreset(accentHex);
    const shirtHex = this.customSleeveHex || p.shirt;
    const skinHex = this.customSkinHex || p.skin;
    const skinDarkHex = this.customSkinHex ? shadeHex(this.customSkinHex, 0.85) : p.skinDark;
    if (this.armTex) this.armTex.dispose();
    this.armTex = makePixelTex(16, 24, (ctx) => {
      ctx.fillStyle = shirtHex;
      ctx.fillRect(0, 0, 16, 10);
      ctx.fillStyle = shadeHex(shirtHex, 0.82);
      ctx.fillRect(0, 8, 16, 2);
      ctx.fillStyle = skinHex;
      ctx.fillRect(0, 10, 16, 14);
      ctx.fillStyle = skinDarkHex;
      ctx.fillRect(0, 21, 16, 3);
    });
    return new THREE.MeshBasicMaterial({
      map: this.armTex,
      vertexColors: true,
      depthTest: false,
      transparent: true
    });
  }

  public setCharacterSleeve(shirtHex: string, skinHex: string) {
    if (this.customSleeveHex === shirtHex && this.customSkinHex === skinHex) return;
    this.customSleeveHex = shirtHex;
    this.customSkinHex = skinHex;
    if (this.slimeHandMode) return;
    const oldMat = this.armMesh.material as THREE.Material;
    this.armMesh.material = this.makeArmMaterial(this.lastSkinAccent);
    oldMat.dispose();
  }

  private orientFirstPersonItem(mesh: THREE.Object3D, itemId: number, isOffhand: boolean) {
    const kind = getHeldPoseKind(itemId);
    const side = isOffhand ? -1 : 1;
    if (kind === 'shield') {
      // Rests low in the corner like Vanilla 1.21+ so view stays clear while walking; raises high across chest when blocking!
      mesh.position.set(-0.06 * side, -0.06, 0.02);
      mesh.rotation.set(0.06, 0.42 * side, -0.04 * side);
    } else if (kind === 'crossbow') {
      mesh.position.set(-0.05 * side, 0.01, 0.04);
      mesh.rotation.set(0.08, 0.18 * side, -0.03 * side);
    } else if (kind === 'bow') {
      // Wooden bow arch (-X) faces forward (-Z), string (+X) faces player (+Z)
      mesh.position.set(-0.02 * side, 0.04, 0.02);
      mesh.rotation.set(0.06, isOffhand ? -1.68 : -1.46, 0.08 * side);
    } else if (kind === 'spyglass') {
      mesh.position.set(-0.04 * side, 0.02, 0.02);
      mesh.rotation.set(-0.76, isOffhand ? -1.66 : -1.48, 0.80);
    } else if (kind === 'weapon') {
      // Canonical Vanilla 3/4 handheld viewmodel:
      // Shaft (+X,+Y) points straight UP (+Y) & slightly forward (-Z);
      // Axe & Hoe cutting blade (-X,+Y) points 93% STRAIGHT FORWARD (-Z);
      // Sprite face opens at a crisp 43° 3/4 angle toward camera so the gleaming JAPPA blade & 1px 3D edge shine clearly!
      mesh.position.set(-0.04 * side, -0.03, 0.02);
      mesh.rotation.set(-0.26, isOffhand ? -1.92 : -1.22, 0.62);
    } else if (kind === 'torch') {
      mesh.position.set(-0.02 * side, -0.02, 0.0);
      mesh.rotation.set(-0.24, -0.28 * side, 0.06 * side);
    } else if (kind === 'flat_item') {
      mesh.position.set(-0.02 * side, 0.02, -0.01);
      mesh.rotation.set(0.10, -0.32 * side, 0.06 * side);
    } else {
      mesh.position.set(0, 0.01, 0);
      mesh.rotation.set(0.20, 0.72 * side, 0.05 * side);
    }
  }

  public setBlock(itemId: number, loaded = false) {
    if (this.currentId === itemId && this.currentLoaded === loaded) return;
    const changedItem = this.currentId !== itemId;
    this.currentId = itemId;
    this.currentLoaded = loaded;
    if (changedItem) this.equipProgress = 0.15;

    if (this.itemMesh) {
      this.pivot.remove(this.itemMesh);
      disposeHeldMeshSafe(this.itemMesh);
      this.itemMesh = null;
    }

    if (itemId > 0) {
      this.itemMesh = buildHeldItem3D(itemId, this.atlasTex, true, loaded);
      if (this.itemMesh) {
        this.orientFirstPersonItem(this.itemMesh, itemId, false);
        this.pivot.add(this.itemMesh);
        this.armMesh.visible = false;
        return;
      }
    }
    this.armMesh.visible = true;
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
    if (this.slimeHandMode) return;
    const oldMat = this.armMesh.material as THREE.Material;
    this.armMesh.material = this.makeArmMaterial(hex);
    oldMat.dispose();
  }

  public setSlimeHand(active: boolean) {
    if (this.slimeHandMode === active) return;
    this.slimeHandMode = active;
    const oldMat = this.armMesh.material as THREE.Material;
    if (active) {
      if (this.armTex) this.armTex.dispose();
      this.armTex = makePixelTex(16, 24, (ctx) => {
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(0, 0, 16, 8);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, 8, 16, 16);
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(3, 12, 10, 8);
      });
      this.armMesh.material = new THREE.MeshBasicMaterial({
        map: this.armTex,
        vertexColors: true,
        depthTest: false,
        transparent: true,
        opacity: 0.86
      });
    } else {
      this.armMesh.material = this.makeArmMaterial(this.lastSkinAccent);
    }
    oldMat.dispose();
  }

  public refreshGpuTextures() {
    if (this.armTex) this.armTex.needsUpdate = true;
    (this.armMesh.material as THREE.Material).needsUpdate = true;
  }

  public triggerSwing() {
    this.swing = 1.0;
  }

  public update(dt: number, horizontalSpeed: number, visible: boolean) {
    this.group.visible = visible;
    if (!visible) return;

    this.equipProgress = Math.min(1, this.equipProgress + dt * 6.5);
    this.offhandEquipProgress = Math.min(1, this.offhandEquipProgress + dt * 6.5);

    // Strictly ZERO idle animation when standing still (especially with empty hand!)
    const isMoving = horizontalSpeed > 0.18;
    if (isMoving) {
      this.bobPhase += dt * (5.5 + horizontalSpeed * 0.85);
    }
    const bobAmt = isMoving ? 0.022 : 0;
    const bx = isMoving ? Math.cos(this.bobPhase * 0.5) * bobAmt : 0;
    const by = isMoving ? Math.abs(Math.sin(this.bobPhase)) * bobAmt : 0;

    // Update dynamic nocked arrow on Bow if equipped
    const bowMesh =
      this.currentId === ITEM.BOW
        ? this.itemMesh
        : this.currentOffhandId === ITEM.BOW
          ? this.offhandItemMesh
          : null;
    if (bowMesh?.userData?.bowArrow) {
      const arrowGrp = bowMesh.userData.bowArrow as THREE.Group;
      arrowGrp.visible = this.bowPull > 0.02;
      arrowGrp.position.x = 0.10 + this.bowPull * 0.16;
    }

    // --- 1. Mainhand (Right Hand) Transform ---
    let sx = 0, sy = 0, sz = 0, rx = 0, ry = 0, rz = 0;
    const equipDip = (1 - this.equipProgress) * 0.24 + (1 - Math.min(1, Math.max(0.25, this.cooldownReady))) * 0.14;

    if (this.swing > 0) {
      this.swing = Math.max(0, this.swing - dt * 4.8);
      const p = 1 - this.swing;
      const s1 = Math.sin(p * Math.PI);
      const s2 = Math.sin(Math.sqrt(p) * Math.PI);
      sx = -0.18 * s2;
      sy = 0.08 * s1;
      sz = -0.20 * s2;
      rx = -1.08 * s2;
      ry = 0.36 * s2;
      rz = 0.34 * s1;
    } else if (this.eatingMainhand > 0) {
      const chew = Math.abs(Math.sin(performance.now() * 0.024)) * 0.045;
      sx = -0.22;
      sy = 0.12 + chew;
      sz = 0.12;
      rx = 0.26;
      ry = 0.32;
      rz = 0.18;
    } else if ((this.blockingMainhand || (this.blocking && this.currentId === ITEM.SHIELD)) && this.currentId === ITEM.SHIELD) {
      // ONLY raise Mainhand into Shield Guard Pose when Mainhand actually holds ITEM.SHIELD!
      sx = -0.18;
      sy = 0.22;
      sz = 0.08;
      rx = 0.04;
      ry = 0.38;
      rz = 0.12;
    } else if (this.bowPull > 0 && this.currentId === ITEM.BOW) {
      const jitter = this.bowPull >= 0.95 ? Math.sin(performance.now() * 0.045) * 0.004 : 0;
      sx = -0.10 * this.bowPull + jitter;
      sy = 0.06 * this.bowPull;
      sz = 0.14 * this.bowPull;
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

    this.pivot.position.set(0.44 + bx + sx, -0.36 - by + sy - equipDip, -0.66 + sz);
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
        // Left-Hand Shield Guard Pose: raises inward across lower-left chest!
        osx = 0.18;
        osy = 0.22;
        osz = 0.08;
        orx = 0.04;
        ory = -0.38;
        orz = -0.12;
      } else if (this.bowPull > 0 && this.currentOffhandId === ITEM.BOW) {
        const jitter = this.bowPull >= 0.95 ? Math.sin(performance.now() * 0.045) * 0.004 : 0;
        osx = 0.10 * this.bowPull + jitter;
        osy = 0.06 * this.bowPull;
        osz = 0.14 * this.bowPull;
        orx = 0.08 * this.bowPull;
      } else if (this.crossbowPull > 0 && this.currentOffhandId === ITEM.CROSSBOW) {
        osx = 0.14 * this.crossbowPull;
        osy = 0.05 * this.crossbowPull;
        osz = 0.10 * this.crossbowPull;
        orx = -0.10 * this.crossbowPull;
      }

      this.offhandPivot.position.set(-0.44 - bx + osx, -0.36 - by + osy - offDip, -0.66 + osz);
      this.offhandPivot.rotation.set(orx, ory, orz);
    }
  }
}
