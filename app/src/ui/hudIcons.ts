// Crisp 9x9 Pixel-Art HUD Sprite Generator (Hearts, Hunger Shanks, Armor, Bubbles & Ping Bars)
// Zero emojis — 100% authentic Minecraft / Horizon 26.3 pixel HUD look!

function spriteToDataUrl(rows: string[], palette: Record<string, string>, scale = 2): string {
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (!ch || ch === '.') continue;
      const col = palette[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c.toDataURL('image/png');
}

const HEART_SHAPE = [
  '.OO...OO.',
  'OLLM.OMMO',
  'OLWMMOMMO',
  'OMMMMMMMO',
  '.OMMMMMO.',
  '..OMMMO..',
  '...OMO...',
  '....O....',
  '.........'
];

const HEART_HALF = [
  '.OO...OO.',
  'OLLM.ODDO',
  'OLWMMCDDO',
  'OMMMMDDDO',
  '.OMMMDDO.',
  '..OMMDO..',
  '...OMD...',
  '....O....',
  '.........'
];

const HUNGER_SHAPE = [
  '.....OOO.',
  '....OMMMO',
  '...OMLLMO',
  '...OMMMMO',
  '..OOMMMO.',
  '.OBBOMOO.',
  'OBBBO....',
  '.OOO.....',
  '.........'
];

const HUNGER_HALF = [
  '.....OOO.',
  '....ODDDO',
  '...ODDDDO',
  '...OMMDDO',
  '..OOMMDO.',
  '.OBBOMOO.',
  'OBBBO....',
  '.OOO.....',
  '.........'
];

const ARMOR_SHAPE = [
  '.OO...OO.',
  'OLLM.OLLO',
  'OLLMOOLLO',
  'OMMMMMMMO',
  '.OMLLLMO.',
  '.OMMMMMO.',
  '..OMMMO..',
  '...OOO...',
  '.........'
];

const BUBBLE_SHAPE = [
  '..OOOOO..',
  '.OLLLLMO.',
  'OLWWLLMMO',
  'OLLLMMMMO',
  'OMMMMMMMO',
  '.OMMMMMO.',
  '..OOOOO..',
  '.........',
  '.........'
];

export interface HudSprites {
  heartFull: string;
  heartHalf: string;
  heartEmpty: string;
  hungerFull: string;
  hungerHalf: string;
  hungerEmpty: string;
  armorFull: string;
  armorEmpty: string;
  bubble: string;
}

let cachedSprites: HudSprites | null = null;

export function getHudSprites(): HudSprites {
  if (cachedSprites) return cachedSprites;
  cachedSprites = {
    heartFull: spriteToDataUrl(HEART_SHAPE, { O: '#1a0808', M: '#e02424', L: '#ff5252', W: '#ffd6d6' }),
    heartHalf: spriteToDataUrl(HEART_HALF, { O: '#1a0808', M: '#e02424', L: '#ff5252', W: '#ffd6d6', D: '#2d2d2d', C: '#444444' }),
    heartEmpty: spriteToDataUrl(HEART_SHAPE, { O: '#141414', M: '#2d2d2d', L: '#3b3b3b', W: '#484848' }),

    hungerFull: spriteToDataUrl(HUNGER_SHAPE, { O: '#241208', M: '#a85524', L: '#d97a38', B: '#f2e8d5' }),
    hungerHalf: spriteToDataUrl(HUNGER_HALF, { O: '#241208', M: '#a85524', D: '#2d2d2d', B: '#f2e8d5' }),
    hungerEmpty: spriteToDataUrl(HUNGER_SHAPE, { O: '#171412', M: '#2e2b29', L: '#3b3735', B: '#4a4643' }),

    armorFull: spriteToDataUrl(ARMOR_SHAPE, { O: '#1f242b', M: '#9aa3b2', L: '#e2e8f0' }),
    armorEmpty: spriteToDataUrl(ARMOR_SHAPE, { O: '#17191c', M: '#2d3138', L: '#3d424b' }),

    bubble: spriteToDataUrl(BUBBLE_SHAPE, { O: '#0c3666', M: '#2b8aff', L: '#75baff', W: '#ffffff' })
  };
  return cachedSprites;
}

export function renderBarIcons(container: HTMLElement, value: number, max = 20, fullUrl: string, halfUrl: string, emptyUrl: string, reverse = false) {
  const slots = Math.ceil(max / 2);
  if (container.children.length !== slots) {
    container.innerHTML = '';
    for (let i = 0; i < slots; i++) {
      const img = document.createElement('img');
      img.className = 'pixel-stat-icon';
      img.alt = '';
      container.appendChild(img);
    }
  }
  for (let i = 0; i < slots; i++) {
    const logicalIdx = reverse ? slots - 1 - i : i;
    const thresholdFull = (logicalIdx + 1) * 2;
    const thresholdHalf = thresholdFull - 1;
    const img = container.children[i] as HTMLImageElement;
    const want = value >= thresholdFull ? fullUrl : value >= thresholdHalf ? halfUrl : emptyUrl;
    if (!want) {
      img.style.visibility = 'hidden';
    } else {
      img.style.visibility = 'visible';
      if (img.getAttribute('src') !== want) img.src = want;
    }
  }
}

export function makePingBarsElement(pingMs: number): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'mc-ping-bars';
  const filled = pingMs < 60 ? 5 : pingMs < 120 ? 4 : pingMs < 200 ? 3 : pingMs < 320 ? 2 : 1;
  for (let b = 1; b <= 5; b++) {
    const bar = document.createElement('i');
    bar.style.height = `${b * 2 + 2}px`;
    bar.className = b <= filled ? 'lit' : 'dim';
    wrap.appendChild(bar);
  }
  return wrap;
}

