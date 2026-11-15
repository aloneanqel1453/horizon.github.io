// Direct TypeScript port of Horizon's `launcher/src/scene.rs` pixel sunset backdrop.

const SKY = [
  0x0a0919, 0x0f0c28, 0x151136, 0x1d1444, 0x281850,
  0x361b5b, 0x481e66, 0x5d236e, 0x752873, 0x902f76,
  0xab3a75, 0xc64a71, 0xde5f6a, 0xef7c63, 0xf89d62
];

const SUN = [
  0xfff5d2, 0xffe4a0, 0xffca78, 0xffac5f, 0xff8c58, 0xfb6c62, 0xee5277
];

const TREES = [
  ['..###..', '.#####.', '#######', '#######', '.#####.', '...#...', '...#...'],
  ['..#..', '..#..', '.###.', '..#..', '.###.', '#####', '..#..', '..#..'],
  ['.###.', '#####', '#####', '..#..', '..#..']
];

class MulberryRng {
  private s: number;
  constructor(seed: number) {
    this.s = seed | 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

class ValueNoise1D {
  private table = new Float32Array(256);
  constructor(seed: number) {
    const rng = new MulberryRng(seed);
    for (let i = 0; i < 256; i++) this.table[i] = rng.next();
  }
  at(x: number): number {
    let value = 0, amp = 0.5, freq = 1, norm = 0;
    for (let o = 0; o < 4; o++) {
      const p = x * freq;
      const i = Math.floor(p);
      const s = p - i;
      const a = this.table[i & 255];
      const b = this.table[(i + 1) & 255];
      value += (a + (b - a) * s * s * (3 - 2 * s)) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return value / norm;
  }
}

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function mixHex(a: number, b: number, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

interface Star {
  x: number;
  y: number;
  phase: number;
  speed: number;
  cool: boolean;
  size: number;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  blocks: Array<{ dx: number; dy: number; kind: number }>;
}

interface Firefly {
  x: number;
  y: number;
  phase: number;
  vx: number;
  vy: number;
}

export class HorizonBackdropScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreen = document.createElement('canvas');
  private offCtx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private clouds: Cloud[] = [];
  private fireflies: Firefly[] = [];
  private active = true;
  private pxScale = 4;
  private gw = 320;
  private gh = 180;
  private rafId = 0;
  private lastDraw = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offCtx = this.offscreen.getContext('2d')!;
    this.rebuild();
    window.addEventListener('resize', () => this.rebuild());
    window.addEventListener('orientationchange', () => {
      this.rebuild();
      window.setTimeout(() => this.rebuild(), 180);
    });
    this.loop(0);
  }

  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    this.canvas.classList.toggle('hidden-scene', !active);
    if (!active && this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    } else if (active && !this.rafId) {
      this.loop(performance.now());
    }
  }

  private rebuild() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.pxScale = Math.max(3, Math.round(Math.min(w, h) / 210));
    this.gw = Math.ceil(w / this.pxScale);
    this.gh = Math.ceil(h / this.pxScale);
    this.canvas.width = this.gw;
    this.canvas.height = this.gh;
    this.offscreen.width = this.gw;
    this.offscreen.height = this.gh;

    this.bakeStaticBackdrop();
    this.populateActors();
  }

  private bakeStaticBackdrop() {
    const { gw, gh, offCtx } = this;
    const horizonY = Math.floor(gh * 0.72);

    // 1. 15-stop Horizon sky
    for (let y = 0; y < gh; y++) {
      const t = Math.min(1, y / Math.max(1, horizonY));
      const idx = t * (SKY.length - 1);
      const i0 = Math.floor(idx);
      const i1 = Math.min(SKY.length - 1, i0 + 1);
      offCtx.fillStyle = mixHex(SKY[i0], SKY[i1], idx - i0);
      offCtx.fillRect(0, y, gw, 1);
    }

    // 2. Sliced Horizon Sun (right of center as in launcher WIDE_SUN)
    const sunCx = Math.floor(gw * 0.72);
    const sunCy = Math.floor(horizonY * 0.80);
    const sunR = Math.max(16, Math.floor(Math.min(gw, gh) * 0.14));

    // Soft pixel halo
    for (let y = sunCy - sunR * 2; y <= sunCy + sunR * 2; y++) {
      if (y < 0 || y >= horizonY) continue;
      for (let x = sunCx - sunR * 2; x <= sunCx + sunR * 2; x++) {
        if (x < 0 || x >= gw) continue;
        const dist = Math.hypot(x - sunCx, y - sunCy);
        if (dist < sunR * 1.85 && dist > sunR * 0.95) {
          const a = Math.max(0, (1 - (dist - sunR) / (sunR * 0.9)) * 0.22);
          offCtx.fillStyle = `rgba(255, 141, 106, ${a.toFixed(3)})`;
          offCtx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Sun body with Horizon horizontal slice gaps near bottom
    for (let dy = -sunR; dy <= sunR; dy++) {
      const py = sunCy + dy;
      if (py < 0 || py >= horizonY) continue;
      const normY = (dy + sunR) / (2 * sunR);
      // Iconic Horizon sun slices on lower half
      if (normY > 0.58 && py % 4 === 0) continue;
      if (normY > 0.78 && py % 2 === 0) continue;

      const halfW = Math.floor(Math.sqrt(Math.max(0, sunR * sunR - dy * dy)));
      const band = Math.min(SUN.length - 1, Math.floor(normY * SUN.length));
      const [sr, sg, sb] = hexToRgb(SUN[band]);
      offCtx.fillStyle = `rgb(${sr},${sg},${sb})`;
      offCtx.fillRect(sunCx - halfW, py, halfW * 2, 1);
    }

    // 3. Three Parallax Ridges + Pixel Trees
    const ridgeConfigs = [
      { seed: 101, base: 0.69, amp: 0.12, color: 0x3a1c4e, treeDensity: 0.22 },
      { seed: 202, base: 0.77, amp: 0.10, color: 0x241238, treeDensity: 0.35 },
      { seed: 303, base: 0.85, amp: 0.08, color: 0x120a24, treeDensity: 0.45 }
    ];

    ridgeConfigs.forEach((rc, layerIdx) => {
      const noise = new ValueNoise1D(rc.seed);
      const rng = new MulberryRng(rc.seed + 77);
      const [rr, rg, rb] = hexToRgb(rc.color);
      const fill = `rgb(${rr},${rg},${rb})`;

      const heights = new Int32Array(gw);
      for (let x = 0; x < gw; x++) {
        const n = noise.at(x * 0.025 + layerIdx * 5.3);
        const ry = Math.floor(gh * rc.base - (n - 0.3) * gh * rc.amp);
        heights[x] = ry;
        offCtx.fillStyle = fill;
        offCtx.fillRect(x, ry, 1, gh - ry);
      }

      // Draw pixel trees along ridge crest
      for (let x = 4; x < gw - 8; x += 5) {
        if (rng.next() < rc.treeDensity) {
          const sprite = TREES[Math.floor(rng.next() * TREES.length)];
          const sh = sprite.length;
          const sw = sprite[0].length;
          const baseY = heights[x] - sh + 1;
          offCtx.fillStyle = fill;
          for (let sy = 0; sy < sh; sy++) {
            for (let sx = 0; sx < sw; sx++) {
              if (sprite[sy][sx] === '#') {
                offCtx.fillRect(x + sx - Math.floor(sw / 2), baseY + sy, 1, 1);
              }
            }
          }
        }
      }
    });
  }

  private populateActors() {
    const rng = new MulberryRng(2603);
    this.stars = [];
    for (let i = 0; i < 65; i++) {
      this.stars.push({
        x: Math.floor(rng.next() * this.gw),
        y: Math.floor(rng.next() * this.gh * 0.52),
        phase: rng.next() * Math.PI * 2,
        speed: 0.8 + rng.next() * 1.8,
        cool: rng.next() > 0.4,
        size: rng.next() > 0.86 ? 2 : 1
      });
    }

    this.clouds = [];
    for (let i = 0; i < 8; i++) {
      const w = 18 + Math.floor(rng.next() * 28);
      const h = 4 + Math.floor(rng.next() * 4);
      const blocks: Array<{ dx: number; dy: number; kind: number }> = [];
      for (let dy = 0; dy < h; dy++) {
        const rowPad = Math.abs(dy - Math.floor(h * 0.6)) * 3;
        for (let dx = rowPad; dx < w - rowPad; dx++) {
          const kind = dy === 0 ? 3 : dy === h - 1 ? 2 : 1;
          blocks.push({ dx, dy, kind });
        }
      }
      this.clouds.push({
        x: rng.next() * this.gw,
        y: Math.floor(this.gh * (0.16 + rng.next() * 0.36)),
        w,
        h,
        speed: 1.2 + rng.next() * 2.2,
        blocks
      });
    }

    this.fireflies = [];
    for (let i = 0; i < 18; i++) {
      this.fireflies.push({
        x: rng.next() * this.gw,
        y: this.gh * (0.68 + rng.next() * 0.28),
        phase: rng.next() * Math.PI * 2,
        vx: (rng.next() - 0.5) * 3.5,
        vy: (rng.next() - 0.5) * 1.8
      });
    }
  }

  private loop = (now: number) => {
    if (!this.active) {
      this.rafId = 0;
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);
    if (now - this.lastDraw < 33) return;
    const dt = Math.min(0.1, (now - (this.lastDraw || now)) / 1000);
    this.lastDraw = now;
    const t = now * 0.001;

    const { ctx, gw, gh } = this;
    ctx.drawImage(this.offscreen, 0, 0);

    // Twinkling stars
    for (const s of this.stars) {
      const a = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.fillStyle = s.cool
        ? `rgba(210, 200, 255, ${a.toFixed(2)})`
        : `rgba(255, 243, 228, ${a.toFixed(2)})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Banded pixel clouds
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > gw + 20) c.x = -c.w - 10;
      const cx = Math.floor(c.x);
      for (const b of c.blocks) {
        ctx.fillStyle =
          b.kind === 3
            ? 'rgba(243, 166, 189, 0.48)'
            : b.kind === 2
              ? 'rgba(201, 89, 133, 0.55)'
              : 'rgba(95, 44, 124, 0.52)';
        ctx.fillRect(cx + b.dx, c.y + b.dy, 1, 1);
      }
    }

    // Floating Horizon fireflies
    for (const f of this.fireflies) {
      f.x = (f.x + f.vx * dt + gw) % gw;
      f.y += Math.sin(t * 1.5 + f.phase) * 0.08;
      const glow = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.8 + f.phase));
      ctx.fillStyle = `rgba(255, 217, 140, ${glow.toFixed(2)})`;
      ctx.fillRect(Math.floor(f.x), Math.floor(f.y), 1, 1);
    }
  };

  dispose() {
    cancelAnimationFrame(this.rafId);
  }
}

