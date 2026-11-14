// Deterministic PRNG & Multi-Octave 2D/3D Noise for Horizon World Seed #2026077 (Zümrüt Çayır · Tempest)

export const WORLD_SEED = 2026077;

export function hash2D(x: number, z: number, seed = WORLD_SEED): number {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function hash3D(x: number, y: number, z: number, seed = WORLD_SEED): number {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 1442695041) ^ Math.imul(z, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class SeededNoise {
  private perm = new Uint8Array(512);

  constructor(seed = WORLD_SEED) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed | 0;
    for (let i = 255; i > 0; i--) {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      const j = ((t ^ (t >>> 14)) >>> 0) % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private grad2(hash: number, x: number, y: number): number {
    switch (hash & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  }

  private grad3(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;
    return lerp(
      lerp(this.grad2(this.perm[A], x, y), this.grad2(this.perm[B], x - 1, y), u),
      lerp(this.grad2(this.perm[A + 1], x, y - 1), this.grad2(this.perm[B + 1], x - 1, y - 1), u),
      v
    );
  }

  noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;
    return lerp(
      lerp(
        lerp(this.grad3(this.perm[AA], x, y, z), this.grad3(this.perm[BA], x - 1, y, z), u),
        lerp(this.grad3(this.perm[AB], x, y - 1, z), this.grad3(this.perm[BB], x - 1, y - 1, z), u),
        v
      ),
      lerp(
        lerp(this.grad3(this.perm[AA + 1], x, y, z - 1), this.grad3(this.perm[BA + 1], x - 1, y, z - 1), u),
        lerp(this.grad3(this.perm[AB + 1], x, y - 1, z - 1), this.grad3(this.perm[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  fbm2D(x: number, z: number, octaves = 4, lacunarity = 2.0, gain = 0.5): number {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let max = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.noise2D(x * freq, z * freq) * amp;
      max += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / max;
  }
}

