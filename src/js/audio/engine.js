/**
 * Web Audio 加法合成引擎。
 *
 * 为什么不用预录音频文件：
 *   1. 泛音实验要能连续拖动基频和每个泛音的强度，预录素材做不到。
 *   2. 零素材 = 零体积 = 离线可用。
 *
 * 两条必须守住的规矩：
 *   1. 抗混叠。任何超过奈奎斯特频率的泛音都要关掉，否则会听成完全错误的音高。
 *   2. 所有参数用 setTargetAtTime 平滑过渡，避免咔哒声。
 */

/** 每个声部最多准备多少个正弦振荡器。16 个泛音够用，留一点余量。 */
const VOICE_HARMONICS = 24;

/** 输出总电平。单声部峰值约 0.3，两个声部叠加也不至于削波。 */
const MASTER_LEVEL = 0.9;

let ctx = null;
let master = null;
let muted = false;
const liveVoices = new Set();

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_LEVEL;
  master.connect(ctx.destination);
  return ctx;
}

/**
 * 浏览器要求音频必须由用户手势启动。这里在第一次点击 / 触摸时就解锁，
 * 之后所有播放都不用再等。
 */
export function installUnlockOnGesture() {
  const handler = () => { unlock(); };
  document.addEventListener('pointerdown', handler, { passive: true });
  document.addEventListener('keydown', handler);
}

export function unlock() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
  return c;
}

export function isMuted() { return muted; }

export function setMuted(next) {
  muted = !!next;
  if (ctx && master) {
    master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, ctx.currentTime, 0.015);
  }
  return muted;
}

export function toggleMuted() { return setMuted(!muted); }

/** 当前采样率下一共有多少个泛音还能安全地响（不混叠）。 */
export function usableHarmonics(hz, count = VOICE_HARMONICS) {
  if (!ctx) return count;
  const limit = (ctx.sampleRate / 2) * 0.92;
  return Math.max(0, Math.min(count, Math.floor(limit / hz)));
}

function ramp(param, value, glide, t) {
  if (glide > 0) param.setTargetAtTime(value, t, glide);
  else param.setValueAtTime(value, t);
}

/**
 * 一个加法合成声部：若干个正弦振荡器分别控制强度，合起来就是任意音色。
 */
class AdditiveVoice {
  constructor(count = VOICE_HARMONICS) {
    this.ctx = ensureContext();
    this.count = count;
    this.freq = 220;
    this.amps = new Array(count).fill(0);
    this.disposed = false;

    this.out = this.ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(master);

    this.osc = [];
    this.gains = [];
    for (let i = 0; i < count; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = this.freq * (i + 1);
      const g = this.ctx.createGain();
      g.gain.value = 0;
      osc.connect(g).connect(this.out);
      osc.start();
      this.osc.push(osc);
      this.gains.push(g);
    }
    liveVoices.add(this);
  }

  /** 基频。glide 是过渡时间常数，拖动时给 0.01 左右会很顺滑。 */
  setFrequency(hz, glide = 0.01) {
    if (this.disposed) return this;
    this.freq = Math.max(20, hz);
    this.apply(glide, glide);
    return this;
  }

  /** 泛音振幅数组，下标 0 是基音。内部会做归一化，防止削波。 */
  setAmps(amps, glide = 0.02) {
    if (this.disposed) return this;
    this.amps = amps;
    this.apply(glide, 0);
    return this;
  }

  /**
   * 把当前频率和泛音配比写进各个振荡器。
   * 抗混叠在这里：超过奈奎斯特频率 92% 的泛音直接给 0。
   */
  apply(freqGlide = 0.01, ampGlide = 0.02) {
    if (this.disposed) return;
    const t = this.ctx.currentTime;
    const nyquistSafe = (this.ctx.sampleRate / 2) * 0.92;

    let sum = 0;
    for (let i = 0; i < this.count; i++) sum += Math.abs(this.amps[i] || 0);
    const norm = Math.max(1, sum);

    for (let i = 0; i < this.count; i++) {
      const hz = this.freq * (i + 1);
      const safe = hz < nyquistSafe;
      const target = safe ? (this.amps[i] || 0) / norm : 0;
      ramp(this.gains[i].gain, target, ampGlide, t);
      if (safe) ramp(this.osc[i].frequency, hz, freqGlide, t);
    }
  }

  start(level = 0.3, attack = 0.02) {
    if (this.disposed) return this;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(level, t + attack);
    return this;
  }

  /** 淡出，默认把结束时间排在 duration 之后。 */
  releaseAfter(duration, release = 0.25) {
    if (this.disposed) return this;
    const t = this.ctx.currentTime + Math.max(0.02, duration);
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0.0001, t + release);
    setTimeout(() => this.dispose(), (Math.max(0.02, duration) + release + 0.05) * 1000);
    return this;
  }

  /** 立刻淡出。 */
  stop(release = 0.08) {
    if (this.disposed) return this;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0.0001, t + release);
    setTimeout(() => this.dispose(), (release + 0.05) * 1000);
    return this;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    liveVoices.delete(this);
    for (const osc of this.osc) {
      try { osc.stop(); } catch { /* 已经停过就忽略 */ }
      osc.disconnect();
    }
    for (const g of this.gains) g.disconnect();
    this.out.disconnect();
  }
}

export function createVoice(count = VOICE_HARMONICS) {
  if (!ensureContext()) return null;
  return new AdditiveVoice(count);
}

/** 放一个音，duration 秒后自动收尾。 */
export function playNote(hz, opts = {}) {
  const { duration = 0.9, amps = null, level = 0.3, attack = 0.02, release = 0.25 } = opts;
  const v = createVoice();
  if (!v) return null;
  v.setFrequency(hz, 0);
  if (amps) v.setAmps(amps, 0);
  v.start(level, attack);
  v.releaseAfter(duration, release);
  return v;
}

/** 同时放几个音。用于对比两种律制、听音程的拍频。 */
export function playChord(freqs, opts = {}) {
  return freqs.map((hz) => playNote(hz, opts));
}

export function stopAll() {
  for (const v of [...liveVoices]) v.stop();
}

/** 给界面用：判断音频是否真的可用。 */
export function isAvailable() {
  return !!(window.AudioContext || window.webkitAudioContext);
}
