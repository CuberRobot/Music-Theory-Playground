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

/** 同时最多几个声部。每个声部是一组振荡器，点太快不加限制会把音频线程压垮。 */
const MAX_LIVE_VOICES = 16;

/**
 * 默认音色。以前这里是全 0，导致所有没显式指定音色的播放调用都是静音的。
 * 指数 1.8 的衰减出来的音色温和，不会像纯正弦那么单薄，也不像锯齿那么刺。
 */
function defaultAmps(count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(1 / Math.pow(i + 1, 1.8));
  return out;
}

/** 一份泛音配比实际用到第几个泛音。用来少建几个振荡器。 */
function harmonicsNeeded(amps) {
  if (!amps) return 8;
  let last = 0;
  for (let i = 0; i < amps.length; i++) {
    if (Math.abs(amps[i] ?? 0) > 0.0005) last = i;
  }
  return Math.min(VOICE_HARMONICS, Math.max(6, last + 1));
}

let ctx = null;
let master = null;
let muted = false;
const liveVoices = new Set();

/**
 * 起音瞬态用的噪声。真实乐器起音瞬间都有一小段宽带噪声 ——
 * 槌子击弦、弓毛摩擦、气流声。缺了它，音头永远是"电子"的。
 * 只生成一次，之后所有音符复用同一段 buffer。
 */
let noiseBuf = null;
function getNoiseBuffer(c) {
  if (noiseBuf) return noiseBuf;
  const len = Math.max(64, Math.floor(c.sampleRate * 0.05));
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
  }
  return noiseBuf;
}

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

/** 当前音频时钟。做节拍器和排时间表要用它，不能用 Date.now()。 */
export function now() {
  return ctx ? ctx.currentTime : 0;
}

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
    this.amps = defaultAmps(count);
    this.disposed = false;

    this.out = this.ctx.createGain();
    this.out.gain.value = 0;
    // 每个声部一个低通：起音时开、随后关下去，这是"击弦感"的另一半
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 0.7;
    this.filter.frequency.value = 12000;
    this.out.connect(this.filter).connect(master);

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

    // 超过上限就把最早的那个声部淡出，防止连点造成节点堆积
    if (liveVoices.size > MAX_LIVE_VOICES) {
      const oldest = liveVoices.values().next().value;
      if (oldest && oldest !== this) oldest.stop(0.03);
    }
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
      // 真实弦不是精确谐波：高次泛音会略偏高（inharmonicity）。
      // 这一点点"不准"正是"活"的来源，纯整数倍反而死板。
      const hz = this.freq * (i + 1) * (1 + 0.00012 * i * i);
      const safe = hz < nyquistSafe;
      const target = safe ? (this.amps[i] || 0) / norm : 0;
      ramp(this.gains[i].gain, target, ampGlide, t);
      if (safe) ramp(this.osc[i].frequency, hz, freqGlide, t);
    }
  }

  /** at 是绝对时间（ctx.currentTime 的坐标系），用来排时间表。 */
  /**
   * @param {boolean} sustained 持续音（实验台里那种一直响的）跳过滤波器包络，
   *   否则拖竖条的过程中音色会自己越变越暗，干扰判断。
   */
  start(level = 0.3, attack = 0.02, at = null, sustained = false) {
    if (this.disposed) return this;
    const t = at ?? this.ctx.currentTime;
    this.level = level;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(t <= this.ctx.currentTime ? this.out.gain.value : 0, t);
    this.out.gain.linearRampToValueAtTime(level, t + attack);

    // 滤波器包络：起音亮、随后收暗。截止跟着基频走，免得高音被削掉。
    const open = Math.min(13000, Math.max(3000, this.freq * 10));
    const closed = sustained ? open : Math.min(7000, Math.max(1100, this.freq * 3.4));
    this.filter.frequency.cancelScheduledValues(t);
    this.filter.frequency.setValueAtTime(open, t);
    this.filter.frequency.exponentialRampToValueAtTime(closed, t + 0.45);
    return this;
  }

  /**
   * 起音瞬态：一小段带通噪声叠在音头上。
   * 音量压得很低（默认只有主音的 15%），多了像噪声，少了像电子琴。
   */
  transient(hz, level, at) {
    if (this.disposed) return this;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = getNoiseBuffer(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(6500, Math.max(400, hz * 5));
    bp.Q.value = 0.9;
    const g = c.createGain();
    g.gain.value = Math.max(0.01, level * 0.15);
    src.connect(bp).connect(g).connect(master);
    src.start(at);
    src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect(); };
    return this;
  }

  /** 在指定的绝对时间开始淡出。 */
  releaseAt(at, release = 0.25) {
    if (this.disposed) return this;
    const t = Math.max(this.ctx.currentTime + 0.01, at);
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.level ?? 0.3, t);
    this.out.gain.linearRampToValueAtTime(0.0001, t + release);
    const wait = (t - this.ctx.currentTime + release + 0.05) * 1000;
    setTimeout(() => this.dispose(), Math.max(50, wait));
    return this;
  }

  /** 淡出，把结束时间排在 duration 之后。 */
  releaseAfter(duration, release = 0.25) {
    if (this.disposed) return this;
    this.releaseAt(this.ctx.currentTime + Math.max(0.02, duration), release);
    return this;
  }

  /**
   * 每个泛音按自己的速度衰减。
   *
   * 这是"像真乐器"和"像电子琴"之间最要紧的一条：真实乐器的泛音不是一起断的，
   * 高次泛音衰减得快得多，所以起音亮、余音暖。以前所有泛音走同一个包络，
   * 听起来就是一块静止的板。
   *
   * @param {number} baseTau 基音的时间常数（秒），高次泛音按 1/(1+0.9i) 递减
   * @param {number} [at] 绝对起始时间，默认现在
   */
  setDecay(baseTau = 1.1, at = null) {
    if (this.disposed) return this;
    const t = (at ?? this.ctx.currentTime) + 0.008;
    for (let i = 0; i < this.count; i++) {
      if ((this.amps[i] ?? 0) <= 0.0005) continue;   // 本来就没响的泛音不用管
      const tau = Math.max(0.04, baseTau / (1 + i * 0.9));
      this.gains[i].gain.setTargetAtTime(0, t, tau);
    }
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
    this.filter.disconnect();
    this.out.disconnect();
  }
}

export function createVoice(count = VOICE_HARMONICS) {
  if (!ensureContext()) return null;
  return new AdditiveVoice(count);
}

/**
 * 放一个音，duration 秒后自动收尾。
 * decay 传一个秒数就会开启"高次泛音先衰减"的包络（推荐 0.8–1.6），
 * 不传则所有泛音一起断（实验台里需要听静态配比时用这种）。
 */
export function playNote(hz, opts = {}) {
  const {
    duration = 0.9, amps = null, level = 0.3, attack = 0.02, release = 0.25,
    at = 0, decay = 1.2,
  } = opts;
  const v = createVoice(harmonicsNeeded(amps));
  if (!v) return null;
  const t0 = v.ctx.currentTime + Math.max(0, at);
  v.setFrequency(hz, 0);
  if (amps) v.setAmps(amps, 0);
  v.start(level, attack, t0);
  if (decay) v.setDecay(decay, t0);
  if (attack > 0.004) v.transient(hz, level, t0);
  v.releaseAt(t0 + duration, release);
  return v;
}

/** 同时放几个音。用于对比两种律制、听音程的拍频。 */
export function playChord(freqs, opts = {}) {
  return freqs.map((hz) => playNote(hz, opts));
}

/** 依次放一串音。at 是从现在算起的秒数偏移。 */
export function playSequence(hzs, opts = {}) {
  const { gap = 0.34, duration = 0.55, amps = null, level = 0.3, at = 0, decay = 0.9 } = opts;
  return hzs.map((hz, i) => playNote(hz, {
    duration, amps, level, at: at + i * gap, decay,
  }));
}

/** 依次放一组和弦，每个和弦是一个频率数组。 */
export function playChordSequence(chords, opts = {}) {
  const { gap = 0.9, duration = 0.85, amps = null, level = 0.22, at = 0 } = opts;
  const out = [];
  chords.forEach((freqs, i) => {
    const t = at + i * gap;
    freqs.forEach((hz) => out.push(playNote(hz, { duration, amps, level, at: t })));
  });
  return out;
}

/**
 * 短促的点击声。第二参数可以传布尔（是否重音）或一个对象。
 * 重音更高更亮，用来做节拍器；自定义 freq 可以做鼓点。
 */
export function click(at = 0, opts = {}) {
  const o = typeof opts === 'boolean' ? { accented: opts } : opts;
  const accented = !!o.accented;
  const freq = o.freq ?? (accented ? 1568 : 988);
  const level = o.level ?? (accented ? 0.30 : 0.14);
  const v = createVoice();
  if (!v) return null;
  const t0 = v.ctx.currentTime + Math.max(0, at);
  const amps = new Array(VOICE_HARMONICS).fill(0);
  amps[0] = 1;
  v.setFrequency(freq, 0);
  v.setAmps(amps, 0);
  v.start(level, 0.002, t0);
  v.releaseAt(t0 + 0.015, 0.05);
  return v;
}

export function stopAll() {
  for (const v of [...liveVoices]) v.stop();
}

/** 给界面用：判断音频是否真的可用。 */
export function isAvailable() {
  return !!(window.AudioContext || window.webkitAudioContext);
}
