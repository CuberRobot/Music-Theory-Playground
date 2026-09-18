/**
 * 音高基础数学。全部是纯函数，不碰 DOM、不碰音频。
 *
 * 约定：
 *   MIDI 60 = C4 = 261.6256 Hz，MIDI 69 = A4 = 440 Hz（科学音高记号法）
 *   音分（cent）= 十二平均律里一个半音的百分之一，1200 音分 = 一个八度
 */

export const A4_HZ = 440;
export const A4_MIDI = 69;

/** 用升号拼写的音名。降号在需要时由 flat 参数切换。 */
const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

/** MIDI 号 → 频率（Hz）。十二平均律：每升高一个半音乘 2^(1/12)。 */
export function midiToHz(midi) {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/** 频率 → MIDI 号（可能是小数，小数部分表示音分偏移）。 */
export function hzToMidi(hz) {
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ);
}

/** 两个频率之间差多少音分。 */
export function centsBetween(hzA, hzB) {
  return 1200 * Math.log2(hzB / hzA);
}

export function ratioToCents(ratio) {
  return 1200 * Math.log2(ratio);
}

export function centsToRatio(cents) {
  return Math.pow(2, cents / 1200);
}

/** MIDI 号 → 音名，例如 60 → "C4"、70 → "A♯4"。 */
export function nameOfMidi(midi, { flats = false } = {}) {
  const m = Math.round(midi);
  const octave = Math.floor(m / 12) - 1;
  return (flats ? FLAT : SHARP)[((m % 12) + 12) % 12] + octave;
}

/** MIDI 号 → 不带八度的音级名，例如 60 → "C"。 */
export function pitchClassOfMidi(midi, { flats = false } = {}) {
  const m = Math.round(midi);
  return (flats ? FLAT : SHARP)[((m % 12) + 12) % 12];
}

/** 频率 → 最接近的音名，附带偏离多少音分。 */
export function nearestName(hz, opts) {
  const midi = hzToMidi(hz);
  const rounded = Math.round(midi);
  return {
    midi: rounded,
    name: nameOfMidi(rounded, opts),
    centsOff: centsBetween(midiToHz(rounded), hz),
  };
}

/** 格式化音分数，永远带符号，例如 "+1.96"、"-31.17"。 */
export function fmtCents(cents, digits = 2) {
  const sign = cents >= 0 ? '+' : '−';
  return sign + Math.abs(cents).toFixed(digits);
}

/** 格式化频率，按大小自动选精度。 */
export function fmtHz(hz, digits) {
  const d = digits ?? (hz >= 1000 ? 0 : hz >= 100 ? 1 : 2);
  return hz.toFixed(d);
}
