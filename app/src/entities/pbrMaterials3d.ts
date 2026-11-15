// High-Resolution Procedural PBR Textures (Diffuse, Bump/Relief, Subsurface, Weave, Forged Steel, Wood, Scales),
// Fresnel Rim + Crease AO Shader Enhancement, and Organic Multi-Slice Lofted 3D Geometry Builders.

import * as THREE from 'three';

const sharedPbrTextures = new Map<string, THREE.CanvasTexture>();
const sharedOrganicGeos = new Map<string, THREE.BufferGeometry>();

export function cachedOrganicGeo<T extends THREE.BufferGeometry>(key: string, build: () => T): T {
  let g = sharedOrganicGeos.get(key) as T | undefined;
  if (!g) {
    g = build();
    g.userData.shared = true;
    sharedOrganicGeos.set(key, g);
  }
  return g;
}

function makeCachedTex(
  key: string,
  w: number,
  h: number,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  let tex = sharedPbrTextures.get(key);
  if (tex) return tex;

  if (typeof document === 'undefined') {
    const data = new Uint8Array(w * h * 4);
    data.fill(220);
    const dt = new THREE.DataTexture(data, w, h);
    dt.needsUpdate = true;
    dt.userData.shared = true;
    sharedPbrTextures.set(key, dt as unknown as THREE.CanvasTexture);
    return dt as unknown as THREE.CanvasTexture;
  }

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  draw(ctx, w, h);

  tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.userData.shared = true;
  tex.needsUpdate = true;
  sharedPbrTextures.set(key, tex);
  return tex;
}

// Deterministic fast hash for organic micro-detail without randomness jitter across runs
function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * 256x256 Woven Heavy Twill Cloth Diffuse Shading + Crease Bump Map
 * Eliminates flat plastic cylinder appearance on gi, hakama, coats, vests, and tunics.
 */
export function getFabricWeaveMap(): THREE.CanvasTexture {
  return makeCachedTex('pbr_fabric_weave_col_v1', 256, 256, true, 2, 2, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fcfcfd');
    g.addColorStop(0.45, '#f1f5f9');
    g.addColorStop(0.82, '#dce3ec');
    g.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Subtle vertical & diagonal drapery fold shading
    for (let i = 0; i < 7; i++) {
      const x = (i / 7) * w + 18;
      const fg = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
      fg.addColorStop(0, 'rgba(255,255,255,0)');
      fg.addColorStop(0.42, 'rgba(15,23,42,0.11)');
      fg.addColorStop(0.62, 'rgba(255,255,255,0.10)');
      fg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(x - 18, 0, 36, h);
    }

    // Fine woven fabric threads
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.055)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 3) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += 3) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  });
}

export function getFabricBumpMap(): THREE.CanvasTexture {
  return makeCachedTex('pbr_fabric_bump_v1', 256, 256, false, 3, 3, (ctx, w, h) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);

    // Soft tension folds
    for (let i = 0; i < 8; i++) {
      const cx = (i / 8) * w + 14;
      const fg = ctx.createLinearGradient(cx - 16, 0, cx + 16, 0);
      fg.addColorStop(0, 'rgba(128,128,128,0)');
      fg.addColorStop(0.35, 'rgba(40,40,40,0.42)');
      fg.addColorStop(0.68, 'rgba(235,235,235,0.42)');
      fg.addColorStop(1, 'rgba(128,128,128,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(cx - 16, 0, 32, h);
    }

    // Diagonal twill weave relief
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const v = ((x + y) % 4 === 0 ? 156 : 108) + Math.round((hash2(x, y) - 0.5) * 18);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 2, 1);
      }
    }
  });
}

/**
 * 256x256 Subsurface Warm Human/Anime Skin & Toned Muscle Shading Map
 */
export function getSkinToneShadingMap(): THREE.CanvasTexture {
  return makeCachedTex('pbr_skin_sss_v1', 256, 256, true, 1, 1, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#fff7f2');
    bg.addColorStop(0.5, '#f9ebe2');
    bg.addColorStop(1, '#ead2c4');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle lateral limb curvature & muscle valley warmth (subsurface rose-amber)
    const sideGrad = ctx.createLinearGradient(0, 0, w, 0);
    sideGrad.addColorStop(0, 'rgba(154, 78, 56, 0.16)');
    sideGrad.addColorStop(0.24, 'rgba(255, 255, 255, 0.08)');
    sideGrad.addColorStop(0.5, 'rgba(168, 85, 62, 0.10)');
    sideGrad.addColorStop(0.76, 'rgba(255, 255, 255, 0.08)');
    sideGrad.addColorStop(1, 'rgba(154, 78, 56, 0.16)');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * 256x256 Brushed Forged Damascus / Tempered Steel Map + Bump Map
 */
export function getForgedSteelMap(): THREE.CanvasTexture {
  return makeCachedTex('pbr_forged_steel_col_v1', 256, 256, true, 1, 2, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f8fafc');
    g.addColorStop(0.32, '#cbd5e1');
    g.addColorStop(0.52, '#ffffff');
    g.addColorStop(0.76, '#94a3b8');
    g.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Fine brushed metal & Damascus wave lines
    for (let y = 0; y < h; y += 2) {
      const a = 0.04 + hash2(y, 7) * 0.08;
      ctx.strokeStyle = y % 4 === 0 ? `rgba(255,255,255,${a})` : `rgba(15,23,42,${a})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.33, y + Math.sin(y * 0.08) * 5, w * 0.66, y - Math.sin(y * 0.08) * 5, w, y);
      ctx.stroke();
    }
  });
}

export function getForgedSteelBumpMap(): THREE.CanvasTexture {
  return makeCachedTex('pbr_forged_steel_bump_v1', 256, 256, false, 1, 2, (ctx, w, h) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      const v = Math.round(118 + Math.sin(y * 0.25) * 18 + (hash2(y, 13) - 0.5) * 20);
      ctx.strokeStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
}

/**
 * 256x256 Natural Ash/Walnut Wood Grain Diffuse + Bump Map (Tool Handles, Bows, Staffs)
 */
export function getWoodGrainMap(): THREE.CanvasTexture {
  return makeCachedTex('pbr_wood_grain_col_v1', 256, 256, true, 1, 2, (ctx, w, h) => {
    ctx.fillStyle = '#d6b28e';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) {
      const wave = Math.sin(x * 0.14) * 18 + (hash2(x, 3) - 0.5) * 16;
      const v = Math.max(120, Math.min(245, Math.round(196 + wave)));
      ctx.fillStyle = `rgb(${v}, ${Math.round(v * 0.84)}, ${Math.round(v * 0.68)})`;
      ctx.fillRect(x, 0, 2, h);
    }
    ctx.strokeStyle = 'rgba(45, 22, 8, 0.16)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 18; i++) {
      const bx = (i / 18) * w;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.bezierCurveTo(bx + 8, h * 0.35, bx - 8, h * 0.7, bx + 2, h);
      ctx.stroke();
    }
  });
}

/**
 * 256x256 Cross-Wrapped Leather & Pebbled Hide Bump Map (Sword Grips, Tsuka-ito, Boots, Belts)
 */
export function getLeatherWrapBumpMap(): THREE.CanvasTexture {
  return makeCachedTex('pbr_leather_wrap_bump_v1', 256, 256, false, 2, 4, (ctx, w, h) => {
    ctx.fillStyle = '#787878';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d4d4d4';
    ctx.lineWidth = 5;
    const step = 32;
    for (let y = -h; y < h * 2; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + w * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w, y);
      ctx.lineTo(0, y + w * 0.5);
      ctx.stroke();
    }
  });
}

/**
 * 256x256 Overlapping Reptilian Dragon Scale / Monster Hide Bump Map
 */
export function getDragonScaleBumpMap(): THREE.CanvasTexture {
  return makeCachedTex('pbr_dragon_scale_bump_v1', 256, 256, false, 3, 3, (ctx, w, h) => {
    ctx.fillStyle = '#525252';
    ctx.fillRect(0, 0, w, h);
    const r = 16;
    let row = 0;
    for (let y = 0; y <= h + r; y += r * 1.35) {
      const off = (row % 2) * r;
      for (let x = -r; x <= w + r; x += r * 2) {
        const g = ctx.createRadialGradient(x + off, y - 3, 2, x + off, y, r);
        g.addColorStop(0, '#f4f4f5');
        g.addColorStop(0.72, '#a1a1aa');
        g.addColorStop(1, '#27272a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x + off, y, r * 0.96, 0, Math.PI * 2);
        ctx.fill();
      }
      row++;
    }
  });
}

/**
 * Injects subtle Fresnel rim-lighting + downward crease ambient occlusion into MeshStandardMaterial
 * so characters, garments, weapons, and dragons have crisp AAA 3D depth instead of flat plastic shading.
 */
export function enhanceRealisticMaterial(
  mat: THREE.MeshStandardMaterial,
  rimIntensity = 0.24,
  rimColorHex = 0xdbeafe
): THREE.MeshStandardMaterial {
  const rCol = new THREE.Color(rimColorHex);
  const key = `rim_${rimIntensity.toFixed(2)}_${rimColorHex.toString(16)}`;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimCol = { value: new THREE.Vector3(rCol.r, rCol.g, rCol.b) };
    shader.uniforms.uRimStrength = { value: rimIntensity };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform vec3 uRimCol;
         uniform float uRimStrength;`
      )
      .replace(
        '#include <dithering_fragment>',
        `vec3 viewDirRim = normalize(vViewPosition);
         float fresnelRim = pow(1.0 - clamp( abs(dot(normal, viewDirRim)), 0.0, 1.0 ), 2.65);
         float hemiLift = clamp(normal.y * 0.5 + 0.5, 0.35, 1.0);
         gl_FragColor.rgb = gl_FragColor.rgb * mix(0.86, 1.04, hemiLift) + uRimCol * (fresnelRim * uRimStrength);
         #include <dithering_fragment>`
      );
  };
  return mat;
}

// ============================================================================
// ORGANIC MULTI-SLICE LOFTED 3D MESH GENERATOR (Zero Tin-Can Seams!)
// ============================================================================
export interface LoftSlice {
  y: number;
  rx: number;
  rz: number;
  cx?: number;
  cz?: number;
  /** Optional bilateral pectoral/muscle swell on -Z front */
  pecFront?: number;
  /** Optional N-fold cloth pleat amplitude (e.g. 6 or 8 pleats on baggy gi / hakama / sleeves) */
  pleatCount?: number;
  pleatAmp?: number;
  /** Vertex brightness multiplier (0.72..1.15) for baked anatomical/cloth AO! */
  shade?: number;
}

export function buildLoftedOrganicGeo(
  slices: LoftSlice[],
  radialSegs = 28,
  capBottom = true,
  capTop = true
): THREE.BufferGeometry {
  const ringVerts = radialSegs + 1;
  const sliceCount = slices.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const yMin = slices[0].y;
  const ySpan = Math.max(0.001, slices[sliceCount - 1].y - yMin);

  for (let s = 0; s < sliceCount; s++) {
    const sl = slices[s];
    const cx = sl.cx ?? 0;
    const cz = sl.cz ?? 0;
    const vCoord = (sl.y - yMin) / ySpan;
    const baseShade = sl.shade ?? 1.0;

    for (let r = 0; r <= radialSegs; r++) {
      const uCoord = r / radialSegs;
      const theta = uCoord * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta); // +1 is +Z (back), -1 is -Z (front)

      let rx = sl.rx;
      let rz = sl.rz;

      // Cloth pleats (baggy martial-arts gi, samurai hakama, billowing sleeves, coat hems)
      if (sl.pleatCount && sl.pleatAmp) {
        const pleat = Math.cos(theta * sl.pleatCount) * sl.pleatAmp;
        rx += pleat;
        rz += pleat;
      }

      let px = cx + sinT * rx;
      let pz = cz + cosT * rz;

      // Bilateral sculpted pectoral muscle contour on -Z chest + central sternum valley!
      if (sl.pecFront && cosT < -0.15) {
        const frontFactor = Math.min(1, (-cosT - 0.15) / 0.85);
        const twinPec = Math.pow(Math.sin(Math.abs(sinT) * Math.PI), 1.25);
        pz -= sl.pecFront * frontFactor * (0.28 + 0.72 * twinPec);
      }

      positions.push(px, sl.y, pz);
      uvs.push(uCoord, vCoord);

      // Subtle baked AO in cloth pleat valleys & undercuts
      const pleatAo =
        sl.pleatCount && sl.pleatAmp
          ? 1.0 + Math.cos(theta * sl.pleatCount) * 0.08
          : 1.0;
      const sh = Math.max(0.55, Math.min(1.18, baseShade * pleatAo));
      colors.push(sh, sh, sh);
    }
  }

  for (let s = 0; s < sliceCount - 1; s++) {
    const rowA = s * ringVerts;
    const rowB = (s + 1) * ringVerts;
    for (let r = 0; r < radialSegs; r++) {
      const a = rowA + r;
      const b = rowA + r + 1;
      const c = rowB + r;
      const d = rowB + r + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  if (capBottom && slices[0].rx > 0.002) {
    const s0 = slices[0];
    const centerIdx = positions.length / 3;
    positions.push(s0.cx ?? 0, s0.y, s0.cz ?? 0);
    uvs.push(0.5, 0);
    const sh = (s0.shade ?? 1.0) * 0.82;
    colors.push(sh, sh, sh);
    for (let r = 0; r < radialSegs; r++) {
      indices.push(centerIdx, r + 1, r);
    }
  }

  if (capTop && slices[sliceCount - 1].rx > 0.002) {
    const sN = slices[sliceCount - 1];
    const baseRow = (sliceCount - 1) * ringVerts;
    const centerIdx = positions.length / 3;
    positions.push(sN.cx ?? 0, sN.y, sN.cz ?? 0);
    uvs.push(0.5, 1);
    const sh = sN.shade ?? 1.0;
    colors.push(sh, sh, sh);
    for (let r = 0; r < radialSegs; r++) {
      indices.push(centerIdx, baseRow + r, baseRow + r + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// CURVED 4-RIDGE ANIME / RPG HAIR BLADE LOCK (Replaces Toy Cones!)
// ============================================================================
/**
 * Builds a thick, S-curved, diamond-ridged 3D anime hair lock extending along +Y with curve bend along +Z
 * and baked root-to-tip gradient vertex colors so overlapping locks look like real sculpted 3D anime hair!
 */
export function buildCurvedHairBladeGeo(
  length: number,
  baseWidth: number,
  baseThick: number,
  bendZ: number,
  sCurve = 0.0
): THREE.BufferGeometry {
  const key = `hair_blade_${length.toFixed(3)}_${baseWidth.toFixed(3)}_${baseThick.toFixed(3)}_${bendZ.toFixed(3)}_${sCurve.toFixed(2)}`;
  return cachedOrganicGeo(key, () => {
    const steps = 10;
    const ring = 6; // 6-point sharp diamond-hex hair lock cross-section for crisp specular planes!
    const positions: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Full lush width through mid-shaft, razor-tapered tip!
      const profile = t < 0.22 ? 0.82 + (t / 0.22) * 0.18 : Math.pow(1 - (t - 0.22) / 0.78, 1.35);
      const w = Math.max(0.0015, baseWidth * profile);
      const th = Math.max(0.0012, baseThick * profile);

      const cy = t * length;
      const cz = bendZ * (t * t) + sCurve * Math.sin(t * Math.PI * 1.5);

      // Root shadow -> rich midtone -> bright anime highlight band -> crisp tip
      const highlightBand = Math.exp(-Math.pow((t - 0.58) / 0.18, 2)) * 0.22;
      const vShade = 0.72 + t * 0.26 + highlightBand;

      for (let r = 0; r <= ring; r++) {
        const u = r / ring;
        const ang = u * Math.PI * 2;
        // Sharp central ridge on front & back (cos) for authentic anime hair facet shading
        const ridgeBoost = Math.abs(Math.cos(ang)) > 0.85 ? 1.18 : 0.86;
        const px = Math.sin(ang) * w * 0.5;
        const pz = cz + Math.cos(ang) * th * 0.5 * ridgeBoost;
        positions.push(px, cy, pz);
        uvs.push(u, t);
        const c = Math.min(1.28, vShade * (Math.cos(ang) < 0 ? 1.05 : 0.92));
        colors.push(c, c, c);
      }
    }

    const rowStride = ring + 1;
    for (let i = 0; i < steps; i++) {
      const a0 = i * rowStride;
      const b0 = (i + 1) * rowStride;
      for (let r = 0; r < ring; r++) {
        indices.push(a0 + r, a0 + r + 1, b0 + r + 1);
        indices.push(a0 + r, b0 + r + 1, b0 + r);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  });
}

// ============================================================================
// FLARED SPLIT COAT / HAORI / HAKAMA SKIRT MESH (Open Front + Rippled Hem!)
// ============================================================================
export function buildSplitCoatSkirtGeo(
  topRx: number,
  topRz: number,
  botRx: number,
  botRz: number,
  height: number,
  frontGapRad = 0.58
): THREE.BufferGeometry {
  const key = `coat_skirt_${topRx.toFixed(3)}_${botRx.toFixed(3)}_${height.toFixed(3)}_${frontGapRad.toFixed(2)}`;
  return cachedOrganicGeo(key, () => {
    const segs = 28;
    const rows = 8;
    const positions: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Arc starts at -PI + frontGapRad and sweeps around +Z back to +PI - frontGapRad (since -Z is theta = +-PI!)
    const startTheta = -Math.PI + frontGapRad;
    const endTheta = Math.PI - frontGapRad;

    for (let iy = 0; iy <= rows; iy++) {
      const t = iy / rows; // 0 = top waist, 1 = bottom hem
      const y = -t * height;
      const flare = Math.pow(t, 1.15);
      const rx = topRx + (botRx - topRx) * flare;
      const rz = topRz + (botRz - topRz) * flare;

      for (let ix = 0; ix <= segs; ix++) {
        const u = ix / segs;
        const theta = startTheta + u * (endTheta - startTheta);
        const ripple = Math.sin(u * Math.PI * 7) * 0.016 * t;
        const px = Math.sin(theta) * (rx + ripple);
        const pz = Math.cos(theta) * (rz + ripple) + t * 0.035; // gentle backward sweep
        positions.push(px, y, pz);
        uvs.push(u, 1 - t);
        const sh = 0.96 - t * 0.12 + Math.sin(u * Math.PI * 7) * 0.06 * t;
        colors.push(sh, sh, sh);
      }
    }

    const stride = segs + 1;
    for (let iy = 0; iy < rows; iy++) {
      const a0 = iy * stride;
      const b0 = (iy + 1) * stride;
      for (let ix = 0; ix < segs; ix++) {
        indices.push(a0 + ix, b0 + ix, b0 + ix + 1);
        indices.push(a0 + ix, b0 + ix + 1, a0 + ix + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  });
}

// ============================================================================
// SCALLOPED BAT-LIKE DRAGON WING MEMBRANE GEOMETRY (For Right Wing +X)
// ============================================================================
export function buildScallopedDragonWingGeo(span = 2.8, chord = 1.85): THREE.BufferGeometry {
  const key = `scalloped_dragon_wing_${span.toFixed(2)}_${chord.toFixed(2)}`;
  return cachedOrganicGeo(key, () => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.25 * chord);
    sh.quadraticCurveTo(span * 0.42, 0.42 * chord, span, 0.18 * chord);
    // 3 dramatic scalloped bat-wing membrane arches along trailing edge!
    sh.quadraticCurveTo(span * 0.80, -0.18 * chord, span * 0.68, -0.58 * chord);
    sh.quadraticCurveTo(span * 0.50, -0.32 * chord, span * 0.38, -0.62 * chord);
    sh.quadraticCurveTo(span * 0.20, -0.36 * chord, 0, -0.45 * chord);
    sh.closePath();

    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.010,
      bevelSize: 0.010,
      bevelSegments: 2,
      curveSegments: 18
    });
    g.rotateX(-Math.PI / 2);
    // Camber airfoil arch along Y so the wing looks muscular & aerodynamic in 3D!
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const archY = Math.sin((x / span) * Math.PI) * 0.22 - (z > 0 ? z * 0.08 : 0);
      pos.setY(i, y + archY);
    }
    g.computeVertexNormals();
    return g;
  });
}

