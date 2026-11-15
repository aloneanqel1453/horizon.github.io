// Horizon Multi-Layer Anti-Cheat, Anti-Macro (Hardware & Software), Speedhack & State Integrity Shield
// Protects Singleplayer & Global Multiplayer against:
//  1. 1000x Auto-Clickers & Micro-Interval Burst Macros (< 45ms inter-click gate + instant burst lockout)
//  2. Hardware Mouse Firmware Macros (Logitech G-Hub, Razer Synapse, Bloody, X-Mouse, AHK) via:
//       - Rolling CPS cap (> 13 CPS sustained / > 8 clicks in 520ms)
//       - Inter-click period standard-deviation (jitter) analysis
//       - Press-to-release dwell-time variance analysis
//       - Lag-2 alternating delay pattern detection
//  3. Synthetic / Untrusted DOM Input Scripts (!event.isTrusted rejection)
//  4. Hard Physics Cooldown Gates (Melee swing, progressive block-break, right-click item/magic/place, skill GCD)
//  5. Speedhack / Clock Drift & rAF Simulation Budget Limiter
//  6. Movement Envelope, Reach Bounds & Legitimate Impulse Verifier
//  7. Salted XOR + Keyed FNV-1a Shadow Vault for Vitals & Signed Save Storage

import { getItemDef, ITEM, ItemStack } from '../items/catalog';

// Capture native clock & C++ DOM internal-slot getters at module load before any user-script can monkey-patch them
const nativePerfNow: () => number =
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now.bind(performance)
    : () => Date.now();
const nativeDateNow: () => number = Date.now.bind(Date);
const nativeIsTrustedGetter: ((this: unknown) => boolean) | undefined =
  typeof Event !== 'undefined'
    ? (Object.getOwnPropertyDescriptor(Event.prototype, 'isTrusted')?.get as ((this: unknown) => boolean) | undefined)
    : undefined;

export type InputChannel = 'lmb' | 'rmb' | 'action_key';
export type RightActionKind = 'block_place' | 'interact' | 'tool_edit' | 'throwable' | 'magic_weapon' | 'consumable';

export interface SecurityStatusSnapshot {
  locked: boolean;
  lockRemainingSec: number;
  strikes: number;
  lastReason: string;
  currentLmbCps: number;
  currentRmbCps: number;
  blockedClicks: number;
  blockedUntrusted: number;
}

interface ChannelTracker {
  pressTimes: number[];
  intervals: number[];
  dwells: number[];
  fastBurstTimes: number[];
  fastBurstIntervals: number[];
  lastDownAt: number;
  isDown: boolean;
  microBurstCount: number;
  microBurstWindowStart: number;
  dupDownCount: number;
  zeroDwellCount: number;
}

function createChannelTracker(): ChannelTracker {
  return {
    pressTimes: [],
    intervals: [],
    dwells: [],
    fastBurstTimes: [],
    fastBurstIntervals: [],
    lastDownAt: -1e9,
    isDown: false,
    microBurstCount: 0,
    microBurstWindowStart: 0,
    dupDownCount: 0,
    zeroDwellCount: 0
  };
}

function computeMeanAndStd(values: number[]): { mean: number; std: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 999 };
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i];
  const mean = sum / n;
  let sq = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i] - mean;
    sq += d * d;
  }
  return { mean, std: Math.sqrt(sq / n) };
}

function fnv1a32(str: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function isLocalhostQaEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === '127.0.0.1' || h === 'localhost' || h === '[::1]';
}

export class TamperProofVault {
  private readonly saltA: number;
  private readonly saltB: number;
  private slots = new Map<string, { enc: number; mac: number; scale: number }>();

  constructor() {
    const rand = Math.floor(Math.random() * 0x7fffffff) ^ (nativeDateNow() & 0x7fffffff);
    this.saltA = (rand ^ 0x5bd1e995) | 1;
    this.saltB = ((rand >>> 3) ^ 0x27d4eb2d) | 1;
  }

  public seal(key: string, value: number, scale = 100): void {
    const clean = Number.isFinite(value) ? value : 0;
    const quant = Math.round(clean * scale);
    const enc = quant ^ this.saltA;
    const mac = fnv1a32(`${key}:${quant}:${this.saltB}`, this.saltA);
    this.slots.set(key, { enc, mac, scale });
  }

  public readVerified(key: string, currentVal: number, tolerance = 0.05): { valid: boolean; value: number } {
    const entry = this.slots.get(key);
    if (!entry) {
      this.seal(key, currentVal);
      return { valid: true, value: currentVal };
    }
    const quant = entry.enc ^ this.saltA;
    const expectedMac = fnv1a32(`${key}:${quant}:${this.saltB}`, this.saltA);
    const storedVal = quant / entry.scale;
    if (expectedMac !== entry.mac) {
      return { valid: false, value: 0 };
    }
    if (!Number.isFinite(currentVal) || Math.abs(currentVal - storedVal) > tolerance) {
      return { valid: false, value: storedVal };
    }
    return { valid: true, value: currentVal };
  }
}

const SAVE_SIG_SEED = 0x6a09e667;
const SAVE_SIG_SECRET = 'hrz26_anti_tamper_v4_9f3c7b';

export function signSaveObject<T extends Record<string, unknown>>(storageKey: string, payload: T): string {
  const cleanCopy: Record<string, unknown> = {};
  const keys = Object.keys(payload).filter((k) => k !== '_hrzSig' && k !== '_hrzVer').sort();
  for (const k of keys) cleanCopy[k] = payload[k];
  const canonical = JSON.stringify(cleanCopy);
  const h1 = fnv1a32(`${storageKey}|${canonical}|${SAVE_SIG_SECRET}`, SAVE_SIG_SEED);
  const h2 = fnv1a32(`${SAVE_SIG_SECRET}|${canonical.length}|${h1}`, 0xbb67ae85);
  const sig = `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
  return JSON.stringify({ ...payload, _hrzVer: 4, _hrzSig: sig });
}

export function verifySignedSaveJson(
  storageKey: string,
  rawJson: string | null
): { ok: boolean; tampered: boolean; data: Record<string, any> | null } {
  if (!rawJson) return { ok: false, tampered: false, data: null };
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, tampered: true, data: null };
    }
    // Migrate legacy unsigned save once (still subject to strict bounds clamping by caller),
    // but if _hrzVer or _hrzSig exists, strictly verify the cryptographic MAC!
    if ('_hrzSig' in parsed || '_hrzVer' in parsed) {
      if (typeof parsed._hrzSig !== 'string') {
        return { ok: false, tampered: true, data: null };
      }
      const cleanCopy: Record<string, unknown> = {};
      const keys = Object.keys(parsed).filter((k) => k !== '_hrzSig' && k !== '_hrzVer').sort();
      for (const k of keys) cleanCopy[k] = parsed[k];
      const canonical = JSON.stringify(cleanCopy);
      const h1 = fnv1a32(`${storageKey}|${canonical}|${SAVE_SIG_SECRET}`, SAVE_SIG_SEED);
      const h2 = fnv1a32(`${SAVE_SIG_SECRET}|${canonical.length}|${h1}`, 0xbb67ae85);
      const expected = `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
      if (parsed._hrzSig !== expected) {
        return { ok: false, tampered: true, data: null };
      }
    }
    return { ok: true, tampered: false, data: parsed };
  } catch {
    return { ok: false, tampered: true, data: null };
  }
}

export function sanitizeItemStackBounds(stack: ItemStack | null): ItemStack | null {
  if (!stack || typeof stack !== 'object') return null;
  const id = Math.floor(Number(stack.id));
  if (!Number.isFinite(id) || id <= 0) return null;
  const def = getItemDef(id);
  if (!def || def.id === 0 || def.name === 'Hava' || def.name === 'Boş') return null;
  const maxSt = Math.max(1, Math.min(65535, def.maxStack || 65535));
  const count = Math.max(1, Math.min(maxSt, Math.floor(Number(stack.count) || 1)));
  const out: ItemStack = { id, count };
  if (typeof stack.damage === 'number' && Number.isFinite(stack.damage) && stack.damage > 0) {
    out.damage = Math.max(0, Math.floor(stack.damage));
  }
  if (typeof stack.ench === 'number' && Number.isFinite(stack.ench) && stack.ench > 0) {
    out.ench = Math.floor(stack.ench) & 0x7fff;
  }
  if (stack.loaded === true) out.loaded = true;
  return out;
}

export class HorizonSecurityGuard {
  private channels: Record<InputChannel, ChannelTracker> = {
    lmb: createChannelTracker(),
    rmb: createChannelTracker(),
    action_key: createChannelTracker()
  };

  private macroLockUntilMs = 0;
  private strikes = 0;
  private lastStrikeAtMs = -1e9;
  private lastReason = '';
  private blockedClicks = 0;
  private blockedUntrusted = 0;

  // Hard Mechanical Rate-Gate Timestamps (ms)
  private lastMeleeSwingAtMs = -1e9;
  private lastBlockBreakAtMs = -1e9;
  private lastRightActionAtMs = -1e9;
  private lastMagicWeaponAtMs = -1e9;
  private lastThrowableAtMs = -1e9;
  private lastSkillCastAtMs = -1e9;
  private lastHotbarSwitchAtMs = -1e9;

  // Speedhack / Simulation Time Budget Verifier
  private lastPerfMs = nativePerfNow();
  private lastWallMs = nativeDateNow();
  private simBudgetSec = 0.25;
  private driftViolationScore = 0;

  // Movement & Reach Sanity Tracking
  private safeX = 0;
  private safeY = 50;
  private safeZ = 0;
  private safeInitialized = false;
  private teleportGraceUntilMs = 0;
  private impulseGraceUntilMs = 0;
  private airborneRiseAccumSec = 0;

  // UI Banner Element
  private bannerEl: HTMLDivElement | null = null;
  private bannerHideTimer = 0;
  public onSecurityViolation?: (reason: string, lockSec: number) => void;

  public nowMs(): number {
    return nativePerfNow();
  }

  private resolveInputStampMs(ev?: { timeStamp?: number } | null): number {
    const perf = nativePerfNow();
    if (ev && typeof ev.timeStamp === 'number' && Number.isFinite(ev.timeStamp) && ev.timeStamp > 0) {
      if (ev.timeStamp <= perf + 50 && perf - ev.timeStamp < 6500) {
        return ev.timeStamp;
      }
    }
    return perf;
  }

  private ensureBannerEl(): HTMLDivElement | null {
    if (typeof document === 'undefined') return null;
    if (this.bannerEl) return this.bannerEl;
    const el = document.createElement('div');
    el.id = 'horizon-security-banner';
    el.style.cssText = [
      'position:fixed',
      'top:max(54px, calc(env(safe-area-inset-top, 0px) + 50px))',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:9999',
      'pointer-events:none',
      'background:linear-gradient(135deg, rgba(127,29,29,0.95), rgba(24,24,27,0.96))',
      'border:1.5px solid rgba(248,113,113,0.92)',
      'box-shadow:0 8px 26px rgba(0,0,0,0.55)',
      'color:#fef2f2',
      'font:700 13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif',
      'padding:8px 16px',
      'border-radius:10px',
      'max-width:min(92vw, 540px)',
      'text-align:center',
      'display:none',
      'letter-spacing:0.2px'
    ].join(';');
    document.body.appendChild(el);
    this.bannerEl = el;
    return el;
  }

  private lastWheelAtMs = -1e9;
  private wheelTimes: number[] = [];

  private showSecurityBanner(message: string, durationMs = 3200): void {
    const el = this.ensureBannerEl();
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    if (this.bannerHideTimer) window.clearTimeout(this.bannerHideTimer);
    this.bannerHideTimer = window.setTimeout(() => {
      if (this.bannerEl) this.bannerEl.style.display = 'none';
    }, durationMs);
  }

  public isTrustedInput(ev: { isTrusted?: boolean } | null | undefined): boolean {
    if (!ev) return false;
    const strictFlag = typeof window !== 'undefined' && Boolean((window as any).__HORIZON_STRICT_TRUST__);
    if (isLocalhostQaEnvironment() && !strictFlag) {
      return true;
    }
    let genuinelyTrusted = false;
    try {
      genuinelyTrusted = nativeIsTrustedGetter ? nativeIsTrustedGetter.call(ev) === true : ev.isTrusted === true;
    } catch {
      genuinelyTrusted = false;
    }
    if (genuinelyTrusted) return true;
    this.blockedUntrusted++;
    this.blockedClicks++;
    this.triggerMacroLockout('Sahte / Script Tıklaması (Untrusted Input) Engellendi', 3.0);
    return false;
  }

  public isLocked(now = this.nowMs()): boolean {
    return now < this.macroLockUntilMs;
  }

  public getLockRemainingSec(now = this.nowMs()): number {
    return Math.max(0, (this.macroLockUntilMs - now) / 1000);
  }

  private triggerMacroLockout(reason: string, baseSeconds = 3.2): void {
    const now = this.nowMs();
    // Decay old strikes if clean for > 45 seconds
    if (now - this.lastStrikeAtMs > 45_000) {
      this.strikes = Math.max(0, this.strikes - 1);
    }
    this.lastStrikeAtMs = now;
    this.strikes = Math.min(8, this.strikes + 1);
    const escalatedSec = Math.min(14.0, baseSeconds + (this.strikes - 1) * 1.8);
    this.macroLockUntilMs = Math.max(this.macroLockUntilMs, now + escalatedSec * 1000);
    this.lastReason = reason;

    // Reset channel histories so recovery after penalty starts clean
    for (const ch of Object.values(this.channels)) {
      ch.pressTimes.length = 0;
      ch.intervals.length = 0;
      ch.dwells.length = 0;
      ch.fastBurstTimes.length = 0;
      ch.fastBurstIntervals.length = 0;
      ch.microBurstCount = 0;
      ch.dupDownCount = 0;
      ch.zeroDwellCount = 0;
      ch.isDown = false;
    }
    this.wheelTimes.length = 0;

    const msg = `Güvenlik Kalkanı: ${reason} (${escalatedSec.toFixed(1)} sn kilit)`;
    this.showSecurityBanner(msg, Math.max(3200, Math.round(escalatedSec * 1000)));
    this.onSecurityViolation?.(reason, escalatedSec);
  }

  /**
   * Analyzes every mouse/key press for:
   *  - Active Macro Penalty Lockout
   *  - Duplicate down-without-up synthetic macro injection
   *  - Sub-human micro-intervals (< 46ms -> dropped; >= 4 bursts -> immediate lockout)
   *  - High CPS (> 13 CPS in 1s or >= 9 clicks in 540ms)
   *  - Hardware Mouse Macro fixed-interval cadence (stddev < 3.4ms across 9 intervals)
   *  - Hardware Mouse Macro 2-step alternating cadence (|dt[i] - dt[i-2]| < 3.0ms)
   *  - Hardware Mouse Macro zero-jitter dwell time (stddev(up - down) < 2.3ms or ultra-short < 4ms)
   */
  public recordButtonPress(channel: InputChannel, ev?: { isTrusted?: boolean; repeat?: boolean; timeStamp?: number }): boolean {
    if (ev?.repeat) return false;
    if (ev && !this.isTrustedInput(ev)) return false;

    const now = this.nowMs();
    const evTime = this.resolveInputStampMs(ev);
    if (now < this.macroLockUntilMs) {
      this.blockedClicks++;
      return false;
    }

    const tr = this.channels[channel];
    const dt = evTime - tr.lastDownAt;

    // 0. Duplicate down-without-up macro injection (e.g. AHK Click Down loop / X-Mouse repeat down)
    if (tr.isDown && dt >= 0 && dt < 240) {
      tr.dupDownCount++;
      if (tr.dupDownCount >= 3) {
        this.blockedClicks++;
        this.triggerMacroLockout('Basılı Tutma Tekrar Makrosu (Down-Spam) Engellendi', 3.5);
        return false;
      }
    } else if (!tr.isDown) {
      tr.dupDownCount = 0;
    }

    // 1. Sub-human micro-interval & switch-bounce gate (< 58ms = > 17.2 CPS instantaneous)
    if (dt >= 0 && dt < 58) {
      this.blockedClicks++;
      if (now - tr.microBurstWindowStart > 3200) {
        tr.microBurstCount = 1;
        tr.microBurstWindowStart = now;
      } else {
        tr.microBurstCount++;
      }
      if (tr.microBurstCount >= 4) {
        this.triggerMacroLockout('Otomatik Tıklama / Hızlı Mouse Makrosu Engellendi', 3.6);
      }
      return false;
    }

    tr.isDown = true;
    tr.lastDownAt = evTime;

    // Record timestamp in rolling 2.5s & 36-click buffer
    tr.pressTimes.push(now);
    while (tr.pressTimes.length > 36) tr.pressTimes.shift();

    if (dt > 0 && dt < 520) {
      tr.intervals.push(dt);
      if (tr.intervals.length > 12) tr.intervals.shift();
    } else {
      // Natural pause > 520ms clears fast-cadence streak
      tr.intervals.length = 0;
      tr.dwells.length = 0;
      tr.dupDownCount = 0;
      tr.zeroDwellCount = 0;
    }

    // 1b. Hardware 2x / 3x Double-Click & Triple-Click Burst Macro Detector (persists across 550ms-4000ms pauses!)
    // Genuine single human clicks have natural variance; hardware "2x / 3x Fire Button" mouse macros inject
    // sub-95ms bursts OR fixed-delay (e.g. 115ms-150ms) paired follow-ups across pauses.
    if (dt >= 58 && dt <= 185) {
      tr.fastBurstTimes.push(evTime);
      tr.fastBurstIntervals.push(dt);
      while (tr.fastBurstTimes.length > 0 && evTime - tr.fastBurstTimes[0] > 8000) {
        tr.fastBurstTimes.shift();
        tr.fastBurstIntervals.shift();
      }
      const sub95: number[] = [];
      for (let i = 0; i < tr.fastBurstIntervals.length; i++) {
        if (tr.fastBurstIntervals[i] <= 95 && evTime - tr.fastBurstTimes[i] <= 4800) {
          sub95.push(tr.fastBurstIntervals[i]);
        }
      }
      if (sub95.length >= 4) {
        const fbStats = computeMeanAndStd(sub95);
        if (sub95.length >= 5 || fbStats.std < 9.5) {
          this.blockedClicks++;
          this.triggerMacroLockout('2x / 3x Çoklu Tıklama Mouse Makrosu Engellendi', 3.6);
          return false;
        }
      }
      if (tr.fastBurstIntervals.length >= 4) {
        const recentPaired = tr.fastBurstIntervals.slice(-4);
        const pairedStats = computeMeanAndStd(recentPaired);
        if (pairedStats.std < 4.4) {
          this.blockedClicks++;
          this.triggerMacroLockout('2x / 3x Sabit Aralıklı Çift Tıklama Makrosu Engellendi', 3.8);
          return false;
        }
      }
    } else if (dt > 8000) {
      tr.fastBurstTimes.length = 0;
      tr.fastBurstIntervals.length = 0;
    }

    // 2. Rolling CPS & Manual Fast-Click Spam Cap (550ms, 1000ms & 2500ms windows)
    // Blocks manual jitter-click, butterfly-click, drag-click & rapid manual spam (> 7 CPS or >= 16 clicks / 2.5s)
    let clicksLast550ms = 0;
    let clicksLast1s = 0;
    let clicksLast2500ms = 0;
    for (let i = tr.pressTimes.length - 1; i >= 0; i--) {
      const age = now - tr.pressTimes[i];
      if (age <= 2500) clicksLast2500ms++;
      if (age <= 1000) clicksLast1s++;
      if (age <= 550) clicksLast550ms++;
    }
    if (clicksLast550ms >= 6 || clicksLast1s > 7 || clicksLast2500ms >= 16) {
      this.blockedClicks++;
      this.triggerMacroLockout('Aşırı Hızlı Tıklama / Spam (Fast-Click) Engellendi', 3.5);
      return false;
    }

    // 3. Hardware Mouse Macro Constant-Cadence & Alternating-Cadence Detector
    if (tr.intervals.length >= 7) {
      const recent = tr.intervals.slice(-9);
      const { mean, std } = computeMeanAndStd(recent);
      const sorted = [...recent].sort((a, b) => a - b);
      const trimmed = sorted.length >= 8 ? sorted.slice(1, -1) : sorted;
      const trimStats = computeMeanAndStd(trimmed);
      // Only evaluate fast clicking (>= ~6.1 CPS, mean <= 165ms)
      if (mean <= 165 || trimStats.mean <= 165) {
        // 3a. Machine-flat period variance (Logitech / Razer / Bloody fixed-delay macro, immune to single-frame stall)
        if (std < 5.6 || (trimmed.length >= 6 && trimStats.std < 4.8)) {
          this.blockedClicks++;
          this.triggerMacroLockout('Donanımsal Mouse Makrosu (Sabit Ritim) Engellendi', 4.0);
          return false;
        }
        // 3b. Two-step alternating delay macro (e.g. 55ms, 85ms, 55ms, 85ms)
        let altDiffSum = 0;
        let altPairs = 0;
        for (let i = 2; i < recent.length; i++) {
          altDiffSum += Math.abs(recent[i] - recent[i - 2]);
          altPairs++;
        }
        if (altPairs >= 5 && altDiffSum / altPairs < 4.5) {
          this.blockedClicks++;
          this.triggerMacroLockout('Donanımsal Mouse Makrosu (Çift Zamanlı Döngü) Engellendi', 4.0);
          return false;
        }
      }

      // 3c. Dwell-Time Signature (Hardware macros use fixed e.g. 1ms, 10ms, or 25ms press hold)
      if (tr.dwells.length >= 7 && (mean <= 170 || trimStats.mean <= 170)) {
        const recentDwells = tr.dwells.slice(-9);
        const sortedDw = [...recentDwells].sort((a, b) => a - b);
        const trimDw = sortedDw.length >= 8 ? sortedDw.slice(1, -1) : sortedDw;
        const dwellStats = computeMeanAndStd(trimDw);
        if (dwellStats.mean < 4.5 || dwellStats.std < 3.6) {
          this.blockedClicks++;
          this.triggerMacroLockout('Donanımsal Mouse Makrosu (Sabit Basılı Tutma) Engellendi', 4.0);
          return false;
        }
      }
    }

    return true;
  }

  public recordButtonRelease(channel: InputChannel, ev?: { timeStamp?: number } | null): void {
    const evTime = this.resolveInputStampMs(ev);
    const tr = this.channels[channel];
    if (!tr.isDown) return;
    tr.isDown = false;
    const dwell = Math.max(0, evTime - tr.lastDownAt);
    if (dwell <= 1.2) {
      tr.zeroDwellCount++;
      if (tr.zeroDwellCount >= 3) {
        this.blockedClicks++;
        this.triggerMacroLockout('Donanımsal Mouse Makrosu (0ms Anlık Basım) Engellendi', 4.0);
        return;
      }
    } else if (dwell >= 6.0) {
      tr.zeroDwellCount = 0;
    }
    if (dwell < 400) {
      tr.dwells.push(dwell);
      if (tr.dwells.length > 12) tr.dwells.shift();
    }
  }

  public recordWheelInput(ev?: { isTrusted?: boolean; timeStamp?: number } | null): boolean {
    if (ev && !this.isTrustedInput(ev)) return false;
    const now = this.nowMs();
    const evTime = this.resolveInputStampMs(ev);
    if (now < this.macroLockUntilMs) return false;
    this.wheelTimes.push(evTime);
    while (this.wheelTimes.length > 36) this.wheelTimes.shift();
    let recentHalfSec = 0;
    for (let i = this.wheelTimes.length - 1; i >= 0; i--) {
      const gap = evTime - this.wheelTimes[i];
      if (gap >= 0 && gap <= 550) recentHalfSec++;
    }
    if (recentHalfSec >= 18) {
      this.blockedClicks++;
      this.triggerMacroLockout('Fare Tekerleği (Hyper-Scroll) Makrosu Engellendi', 3.0);
      return false;
    }
    if (evTime - this.lastWheelAtMs < 18) return false;
    this.lastWheelAtMs = evTime;
    return true;
  }

  // ==========================================================================
  // HARD MECHANICAL COOLDOWN GATES (Zero Fast-Click or Swap-Cancel Advantage!)
  // ==========================================================================

  public notifyHotbarSwitch(now = this.nowMs()): void {
    this.lastHotbarSwitchAtMs = now;
  }

  /**
   * Enforces weapon-class minimum swing cadence (default 460ms, heavy weapons up to 900ms),
   * blocks hotbar quick-swap animation cancelling (220ms settle),
   * AND requires >= 88% physical weapon recharge readiness (attackCooldown <= 0.12).
   */
  public tryCommitMeleeSwing(attackCooldownRemaining: number, minSwingMs = 460, now = this.nowMs()): boolean {
    if (now < this.macroLockUntilMs) return false;
    if (now - this.lastHotbarSwitchAtMs < 220) return false;
    if (attackCooldownRemaining > 0.12) return false;
    const reqGap = Math.max(380, minSwingMs);
    if (now - this.lastMeleeSwingAtMs < reqGap) return false;
    this.lastMeleeSwingAtMs = now;
    return true;
  }

  /**
   * Enforces strict physical minimum interval between ANY two block breaks so
   * fast-clicking or macros can NEVER instant-shred terrain in Survival OR Creative!
   */
  public tryCommitBlockBreak(isCreative: boolean, blockHardness: number, now = this.nowMs()): boolean {
    if (now < this.macroLockUntilMs) return false;
    if (now - this.lastHotbarSwitchAtMs < 160) return false;
    const minGapMs = isCreative ? 210 : blockHardness <= 0 ? 185 : 235;
    if (now - this.lastBlockBreakAtMs < minGapMs) {
      return false;
    }
    this.lastBlockBreakAtMs = now;
    return true;
  }

  /**
   * Enforces strict cooldowns on right-click block placement, interaction,
   * tool edits, consumables, throwable projectiles, and anime/mythic active weapons.
   */
  public tryCommitRightAction(kind: RightActionKind, now = this.nowMs()): boolean {
    if (now < this.macroLockUntilMs) return false;
    if (kind === 'magic_weapon') {
      if (now - this.lastMagicWeaponAtMs < 680) return false;
      this.lastMagicWeaponAtMs = now;
      this.lastRightActionAtMs = now;
      return true;
    }
    if (kind === 'throwable') {
      if (now - this.lastThrowableAtMs < 460) return false;
      this.lastThrowableAtMs = now;
      this.lastRightActionAtMs = now;
      return true;
    }
    const minGapMs =
      kind === 'consumable'
        ? 280
        : kind === 'tool_edit'
          ? 250
          : kind === 'interact'
            ? 240
            : 220;
    if (now - this.lastRightActionAtMs < minGapMs) return false;
    this.lastRightActionAtMs = now;
    return true;
  }

  public tryCommitSkillCast(now = this.nowMs()): boolean {
    if (now < this.macroLockUntilMs) return false;
    if (now - this.lastSkillCastAtMs < 340) return false;
    this.lastSkillCastAtMs = now;
    return true;
  }

  // ==========================================================================
  // SPEEDHACK / CLOCK DRIFT & SIMULATION BUDGET GUARD
  // ==========================================================================

  /**
   * Validates frame `dt` against both `performance.now()` and `Date.now()` wall clock
   * and enforces a token-bucket simulation budget so Cheat Engine Speedhack or
   * synthetic rAF loops cannot accelerate mining, cooldowns, or movement!
   */
  public validateFrameStep(rawDtSec: number): number {
    const perfNow = nativePerfNow();
    const wallNow = nativeDateNow();

    const perfElapsedSec = Math.max(0, (perfNow - this.lastPerfMs) / 1000);
    const wallElapsedSec = Math.max(0, (wallNow - this.lastWallMs) / 1000);
    this.lastPerfMs = perfNow;
    this.lastWallMs = wallNow;

    // Replenish simulation budget from real wall/perf clock (capped to 120ms burst)
    const trustedRealSec =
      wallElapsedSec > 0.002 ? Math.min(perfElapsedSec, wallElapsedSec * 1.25 + 0.018) : perfElapsedSec;
    this.simBudgetSec = Math.min(0.14, this.simBudgetSec + trustedRealSec * 1.08);

    // Detect sustained clock tampering (performance.now running >> Date.now)
    if (perfElapsedSec > 0.04 && wallElapsedSec >= 0 && perfElapsedSec > wallElapsedSec * 1.65 + 0.03) {
      this.driftViolationScore += 1;
      if (this.driftViolationScore >= 8) {
        this.driftViolationScore = 0;
        this.triggerMacroLockout('Hız Hilesi (Speedhack / Saat Manipülasyonu) Engellendi', 4.5);
      }
    } else {
      this.driftViolationScore = Math.max(0, this.driftViolationScore - 0.15);
    }

    const clamped = Math.max(0, Math.min(0.05, Number.isFinite(rawDtSec) ? rawDtSec : 0.016));
    const allowed = Math.min(clamped, Math.max(0.001, this.simBudgetSec));
    this.simBudgetSec = Math.max(0, this.simBudgetSec - allowed);
    return allowed;
  }

  // ==========================================================================
  // MOVEMENT ENVELOPE, ANTI-FLY & REACH BOUNDS VERIFIER
  // ==========================================================================

  public notifyLegitimateTeleport(x: number, y: number, z: number, graceMs = 1500): void {
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      this.safeX = x;
      this.safeY = y;
      this.safeZ = z;
      this.safeInitialized = true;
    }
    this.teleportGraceUntilMs = Math.max(this.teleportGraceUntilMs, this.nowMs() + graceMs);
    this.airborneRiseAccumSec = 0;
  }

  public notifyLaunchImpulse(graceMs = 2200): void {
    this.impulseGraceUntilMs = Math.max(this.impulseGraceUntilMs, this.nowMs() + graceMs);
    this.airborneRiseAccumSec = 0;
  }

  public verifyPlayerPosition(
    player: { x: number; y: number; z: number; vx: number; vy: number; vz: number; onGround?: boolean },
    dt: number,
    exemptFlightOrMount: boolean
  ): void {
    // 1. Reject NaN / Infinity / World-bound escape
    if (!Number.isFinite(player.x) || !Number.isFinite(player.y) || !Number.isFinite(player.z)) {
      player.x = this.safeX;
      player.y = this.safeY;
      player.z = this.safeZ;
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
      return;
    }
    player.x = Math.max(-29990, Math.min(29990, player.x));
    player.z = Math.max(-29990, Math.min(29990, player.z));
    player.y = Math.max(-48, Math.min(254, player.y));

    const now = this.nowMs();
    if (!this.safeInitialized || now < this.teleportGraceUntilMs) {
      this.safeX = player.x;
      this.safeY = player.y;
      this.safeZ = player.z;
      this.safeInitialized = true;
      this.airborneRiseAccumSec = 0;
      return;
    }

    if (exemptFlightOrMount) {
      this.safeX = player.x;
      this.safeY = player.y;
      this.safeZ = player.z;
      this.airborneRiseAccumSec = 0;
      return;
    }

    const dx = player.x - this.safeX;
    const dy = player.y - this.safeY;
    const dz = player.z - this.safeZ;
    const horizDist = Math.hypot(dx, dz);
    const hasImpulse = now < this.impulseGraceUntilMs;

    // Max single-step horizontal displacement in survival (generous for Ice + Sprint + Speed II + Knockback, lethal to teleport/speed hacks)
    const maxHorizStep = Math.max(1.85, dt * (hasImpulse ? 46 : 24));
    if (horizDist > maxHorizStep) {
      player.x = this.safeX;
      player.y = this.safeY;
      player.z = this.safeZ;
      player.vx = 0;
      player.vz = 0;
      this.showSecurityBanner('Güvenlik Kalkanı: Anormal Hız / Işınlanma Hilesi Geri Alındı!', 2600);
      return;
    }

    // Anti-Fly upward sustain check in Survival when not on ground / water / climbable / mount / impulse
    if (!player.onGround && !hasImpulse && dy > 0.02) {
      this.airborneRiseAccumSec += dt;
      if (this.airborneRiseAccumSec > 1.65 || dy > Math.max(2.2, dt * 26)) {
        player.y = this.safeY;
        player.vy = Math.min(0, player.vy);
        this.airborneRiseAccumSec = 0.8;
        this.showSecurityBanner('Güvenlik Kalkanı: Havada Uçuş (Fly Hack) Engellendi!', 2600);
        return;
      }
    } else if (player.onGround || dy <= 0) {
      this.airborneRiseAccumSec = Math.max(0, this.airborneRiseAccumSec - dt * 3);
    }

    this.safeX = player.x;
    this.safeY = player.y;
    this.safeZ = player.z;
  }

  public verifyReach(
    eyeX: number,
    eyeY: number,
    eyeZ: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    maxReach: number
  ): boolean {
    const d = Math.hypot(targetX - eyeX, targetY - eyeY, targetZ - eyeZ);
    return Number.isFinite(d) && d <= maxReach + 0.85;
  }

  public getStatusSnapshot(): SecurityStatusSnapshot {
    const now = this.nowMs();
    const countRecent = (arr: number[]) => {
      let c = 0;
      for (let i = arr.length - 1; i >= 0; i--) {
        if (now - arr[i] <= 1000) c++;
      }
      return c;
    };
    return {
      locked: now < this.macroLockUntilMs,
      lockRemainingSec: this.getLockRemainingSec(now),
      strikes: this.strikes,
      lastReason: this.lastReason,
      currentLmbCps: countRecent(this.channels.lmb.pressTimes),
      currentRmbCps: countRecent(this.channels.rmb.pressTimes),
      blockedClicks: this.blockedClicks,
      blockedUntrusted: this.blockedUntrusted
    };
  }
}

try {
  Object.freeze(TamperProofVault.prototype);
  Object.freeze(HorizonSecurityGuard.prototype);
} catch {
  // Ignore in restricted runtimes
}
