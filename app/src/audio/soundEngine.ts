// Cleanroom WebAudio Synthesizer for Voxel Footsteps, Mining, Placement, Bow, Eating, XP, Portals & Explosions
// Reuses pre-allocated white-noise AudioBuffer + rate-limits rapid impacts (#15709 fix)

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  public volume = 0.7;
  public isMusicPlaying = false;
  private ambientTimer = 0;
  private musicTimer = 0;
  private musicStep = 0;
  private lastStepAt = 0;

  public unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        this.ctx = new Ctor();
        const sr = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, sr, sr);
        const ch = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < sr; i++) ch[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx && this.ctx.state !== 'running') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.ambientTimer) {
      this.ambientTimer = window.setInterval(() => this.playAmbientChord(), 18000);
    }
  }

  public playClick() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.045);
    gain.gain.setValueAtTime(0.11 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playStep(material: string) {
    if (!this.ctx || this.volume <= 0) return;
    const nowMs = performance.now();
    if (nowMs - this.lastStepAt < 140) return; // #15709 spam guard
    this.lastStepAt = nowMs;

    const freqMap: Record<string, number> = {
      grass: 155,
      wood: 215,
      stone: 295,
      sand: 130,
      snow: 390,
      glass: 520,
      water: 180,
      metal: 420,
      wool: 140
    };
    const base = (freqMap[material] ?? 170) * (0.9 + Math.random() * 0.2);
    this.noiseBurst(0.055, base, 0.09 * this.volume);
  }

  public distanceGain(wx: number, wy: number, wz: number, lx: number, ly: number, lz: number, maxDist = 28): number {
    const d = Math.hypot(wx - lx, wy - ly, wz - lz);
    if (d >= maxDist) return 0;
    return Math.max(0, (1 - d / maxDist) * (1 / (1 + d * 0.08)));
  }

  public stereoPan(wx: number, wz: number, lx: number, lz: number, listenerYaw: number): number {
    const dx = wx - lx;
    const dz = wz - lz;
    const len = Math.hypot(dx, dz);
    if (len < 0.25) return 0;
    // Camera right vector for yaw (where lookDir = (-sin(yaw), -cos(yaw))) is (cos(yaw), -sin(yaw))
    const rx = Math.cos(listenerYaw);
    const rz = -Math.sin(listenerYaw);
    return Math.max(-0.85, Math.min(0.85, (dx * rx + dz * rz) / len));
  }

  public playHitBlock(material: string, gainScale = 1.0, pan = 0) {
    if (!this.ctx || this.volume <= 0 || gainScale <= 0.02) return;
    const freqMap: Record<string, number> = {
      grass: 175,
      wood: 255,
      stone: 365,
      sand: 150,
      snow: 420,
      glass: 580,
      water: 190,
      metal: 490,
      wool: 155
    };
    const base = (freqMap[material] ?? 210) * (0.92 + Math.random() * 0.16);
    this.noiseBurst(0.048, base, 0.13 * this.volume * gainScale, pan);
  }

  public playBreak(material: string, gainScale = 1.0, pan = 0) {
    this.unlock();
    if (!this.ctx || this.volume <= 0 || gainScale <= 0.02) return;
    const high = material === 'glass' ? 980 : material === 'metal' ? 640 : material === 'stone' ? 395 : material === 'wood' ? 275 : 210;
    this.noiseBurst(0.115, high, 0.24 * this.volume * gainScale, pan);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = material === 'glass' ? 'sine' : 'square';
    osc.frequency.setValueAtTime(high * 0.85, now);
    osc.frequency.exponentialRampToValueAtTime(92, now + 0.095);
    g.gain.setValueAtTime(0.085 * this.volume * gainScale, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    this.connectPanned(osc, g, pan);
    osc.start(now);
    osc.stop(now + 0.105);
  }

  public playPlace(material: string, gainScale = 1.0, pan = 0) {
    this.unlock();
    if (!this.ctx || this.volume <= 0 || gainScale <= 0.02) return;
    const base = material === 'wood' ? 250 : material === 'stone' ? 330 : material === 'metal' ? 480 : 195;
    this.noiseBurst(0.065, base * 1.15, 0.18 * this.volume * gainScale, pan);
  }

  public playFizz(gainScale = 1.0, pan = 0) {
    this.unlock();
    if (!this.ctx || this.volume <= 0 || gainScale <= 0.02) return;
    this.noiseBurst(0.28, 1350, 0.19 * this.volume * gainScale, pan);
  }

  public playFuse(gainScale = 1.0, pan = 0) {
    this.unlock();
    if (!this.ctx || this.volume <= 0 || gainScale <= 0.02) return;
    this.noiseBurst(0.45, 1850, 0.22 * this.volume * gainScale, pan);
  }

  public playArrowDing() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1318.5, now); // High E6 crisp vanilla arrow hit ding (#8053)
    g.gain.setValueAtTime(0.2 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playBow() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);
    g.gain.setValueAtTime(0.18 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playEat() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    this.noiseBurst(0.08, 280, 0.2 * this.volume);
    window.setTimeout(() => this.noiseBurst(0.07, 340, 0.16 * this.volume), 90);
  }

  public playHurt() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);
    g.gain.setValueAtTime(0.24 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playXp(levelUp = false) {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const notes = levelUp ? [523.25, 659.25, 783.99, 1046.5] : [740 + Math.random() * 240];
    notes.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.07);
      g.gain.setValueAtTime(0.12 * this.volume, now + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.16);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.17);
    });
  }

  public playPortal() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.55);
    g.gain.setValueAtTime(0.22 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  public playBell() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    g.gain.setValueAtTime(0.28 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.95);
  }

  public playAmethystChime() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const freqs = [1174.66, 1567.98, 2093.0];
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * (0.98 + Math.random() * 0.04), now + idx * 0.045);
      g.gain.setValueAtTime(0.11 * this.volume, now + idx * 0.045);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.42);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.45);
    });
  }

  public playTotemPop() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    this.noiseBurst(0.28, 320, 0.34 * this.volume);
    const now = this.ctx.currentTime;
    const chord = [261.63, 329.63, 392.0, 523.25, 783.99];
    chord.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx < 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.035);
      g.gain.setValueAtTime(0.16 * this.volume, now + idx * 0.035);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.72);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.75);
    });
  }

  public playTridentThrow() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    this.noiseBurst(0.11, 820, 0.22 * this.volume);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.14);
    g.gain.setValueAtTime(0.19 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playTridentReturn() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18);
    g.gain.setValueAtTime(0.17 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playRiptide() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    this.noiseBurst(0.38, 620, 0.32 * this.volume);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.34);
    g.gain.setValueAtTime(0.18 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playMusicDisc() {
    this.unlock();
    this.stopMusicDisc();
    this.isMusicPlaying = true;
    this.musicStep = 0;
    const melody = [
      329.63, 392.0, 493.88, 659.25, 587.33, 493.88, 392.0, 329.63,
      293.66, 369.99, 440.0, 587.33, 523.25, 440.0, 392.0, 329.63,
      261.63, 329.63, 392.0, 523.25, 659.25, 523.25, 392.0, 329.63,
      293.66, 392.0, 493.88, 587.33, 493.88, 392.0, 329.63, 246.94
    ];
    const bass = [164.81, 146.83, 130.81, 146.83];
    const stepNote = () => {
      if (!this.isMusicPlaying || !this.ctx || this.ctx.state !== 'running' || this.volume <= 0.02) return;
      const now = this.ctx.currentTime;
      const idx = this.musicStep % melody.length;
      const freq = melody[idx];
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.095 * this.volume, now);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);

      if (idx % 8 === 0) {
        const bFreq = bass[Math.floor(idx / 8) % bass.length];
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bFreq, now);
        bGain.gain.setValueAtTime(0.08 * this.volume, now);
        bGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.4);
        bOsc.connect(bGain).connect(this.ctx.destination);
        bOsc.start(now);
        bOsc.stop(now + 1.45);
      }
      this.musicStep++;
    };
    stepNote();
    this.musicTimer = window.setInterval(stepNote, 260);
  }

  public stopMusicDisc() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = 0;
    }
  }

  public playExplosion() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    this.noiseBurst(0.55, 110, 0.48 * this.volume);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.52);
    g.gain.setValueAtTime(0.35 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.58);
  }

  public playNoteBlock(noteIndex: number, instrument: 'harp' | 'bass' | 'bd' | 'snare' | 'hat' | 'bell' | 'chime' = 'harp') {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const semitone = Math.max(0, Math.min(24, noteIndex));
    const baseFreq = 185.0 * Math.pow(2, semitone / 12); // F#3 .. F#5 (2 octaves)

    if (instrument === 'snare' || instrument === 'hat') {
      this.noiseBurst(instrument === 'snare' ? 0.16 : 0.06, instrument === 'snare' ? 1400 : 4800, 0.24 * this.volume);
    }
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type =
      instrument === 'bass' ? 'triangle' :
      instrument === 'bell' || instrument === 'chime' ? 'sine' :
      instrument === 'bd' ? 'sine' : 'triangle';
    const freq =
      instrument === 'bass' ? baseFreq * 0.5 :
      instrument === 'bell' || instrument === 'chime' ? baseFreq * 2 :
      instrument === 'bd' ? Math.max(55, baseFreq * 0.35) : baseFreq;
    osc.frequency.setValueAtTime(freq, now);
    if (instrument === 'bd') {
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.14);
    }
    const dur = instrument === 'hat' ? 0.08 : instrument === 'bd' || instrument === 'snare' ? 0.18 : 0.42;
    g.gain.setValueAtTime(0.22 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  public playCrossbowLoad() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    [280, 420].forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.06);
      g.gain.setValueAtTime(0.14 * this.volume, now + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.07);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.08);
    });
  }

  public playCrossbowShoot() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    this.noiseBurst(0.09, 1250, 0.24 * this.volume);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.11);
    g.gain.setValueAtTime(0.20 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playPickup() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.065);
    g.gain.setValueAtTime(0.15 * this.volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playSplash() {
    this.unlock();
    if (!this.ctx || this.volume <= 0) return;
    this.noiseBurst(0.18, 720, 0.24 * this.volume);
  }

  private connectPanned(src: AudioNode, gain: GainNode, pan: number) {
    if (!this.ctx) return;
    if (Math.abs(pan) > 0.02 && typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      src.connect(gain).connect(panner).connect(this.ctx.destination);
    } else {
      src.connect(gain).connect(this.ctx.destination);
    }
  }

  private noiseBurst(duration: number, filterFreq: number, peakGain: number, pan = 0) {
    if (!this.ctx || !this.noiseBuf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0005, peakGain), now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    src.connect(filter);
    this.connectPanned(filter, gain, pan);
    src.start(now, Math.random() * 0.3, duration + 0.01);
  }

  private playAmbientChord() {
    if (!this.ctx || this.ctx.state !== 'running' || this.volume <= 0.05) return;
    const chords = [
      [261.63, 329.63, 392.0, 493.88],
      [220.0, 261.63, 329.63, 392.0],
      [174.61, 220.0, 261.63, 329.63]
    ];
    const notes = chords[Math.floor(Math.random() * chords.length)];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + idx * 0.45;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.025 * this.volume, start + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 5.5);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 5.6);
    });
  }
}
