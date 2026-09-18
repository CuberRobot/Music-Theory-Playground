/**
 * Karplus-Strong 拨弦合成。
 *
 * 原理只有两步：
 *   1. 拨的一瞬间，往延迟线上灌一段噪声 —— 这就是"拨"这个动作。
 *   2. 之后每转一圈，相邻两个采样做一次平均。平均是低通，会不断吃掉高频，
 *      于是余音自然地从亮变暗、幅度逐渐衰减 —— 这就是"弦"。
 *
 * 延迟线长度 = 采样率 / 频率，所以它天生就准，不需要任何采样素材。
 *
 * 为什么用 AudioWorklet 而不是原生节点搭反馈环：
 * Web Audio 的反馈环里必须有一个 delayTime ≥ 128/sampleRate 的 DelayNode，
 * 也就是最高只能到约 340 Hz，高音根本做不出来。写在 worklet 里没这个限制。
 */

class KarplusStrong extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      // 越大高频掉得越快，音色越暗、余音越短
      { name: 'damping', defaultValue: 0.5, minValue: 0, maxValue: 0.95, automationRate: 'k-rate' },
      // 目标衰减时间（秒），用来反推每圈的反馈量
      { name: 'decayTime', defaultValue: 4, minValue: 0.1, maxValue: 40, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.buf = new Float32Array(4096);
    this.n = 128;
    this.i = 0;
    this.prev = 0;
    this.port.onmessage = (e) => {
      if (e.data?.type === 'pluck') this.pluck(e.data.frequency, e.data.brightness ?? 0.5);
    };
  }

  pluck(frequency, brightness) {
    const sr = sampleRate;
    // 环里的低通会带来约半个采样的额外延迟，这里近似补偿一下，音准才对
    const n = Math.max(2, Math.round(sr / Math.max(20, Math.min(6000, frequency)) - 0.5));
    if (this.buf.length < n) this.buf = new Float32Array(n * 2);
    this.n = n;
    this.i = 0;
    this.prev = 0;

    // 初始噪声也要低通一下：拨片越硬、位置越靠桥，保留的高频越多
    const s = 0.1 + Math.max(0, Math.min(1, brightness)) * 0.8;
    let last = 0;
    for (let k = 0; k < n; k++) {
      const white = Math.random() * 2 - 1;
      last += s * (white - last);
      this.buf[k] = last;
    }
  }

  process(inputs, outputs, params) {
    const ch = outputs[0]?.[0];
    if (!ch) return true;
    const damp = params.damping[0];
    const decay = Math.max(0.1, params.decayTime[0]);
    // 要求 T 秒内衰减到千分之一：每转一圈衰减 g，转 T·sr/n 圈
    const fb = Math.pow(0.001, 1 / (decay * sampleRate));
    const a = 1 - damp;
    const n = this.n;
    const buf = this.buf;

    for (let k = 0; k < ch.length; k++) {
      const cur = buf[this.i];
      const filtered = a * cur + damp * this.prev;
      this.prev = cur;
      buf[this.i] = filtered * fb;
      this.i = (this.i + 1) % n;
      ch[k] = cur;
    }
    return true;
  }
}

registerProcessor('karplus-strong', KarplusStrong);
