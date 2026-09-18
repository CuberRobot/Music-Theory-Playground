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

/* --------------------------------------------------------------------------
   拼写：同一个键可以叫 C♯ 也可以叫 D♭，而这两者算出来的"度数"完全不同。
   度数看的是字母（C D E F G A B），音数看的是半音。这是音程那一节的核心。
   -------------------------------------------------------------------------- */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11];

/** [字母序号, 升降号]。0=C … 6=B；升降用 ±1 表示。 */
export const SHARP_SPELL = [
  [0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0],
  [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0],
];
export const FLAT_SPELL = [
  [0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0],
  [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0],
];

const ACC_TEXT = { '-1': '♭', 0: '', 1: '♯' };

/**
 * 把一个 MIDI 音高按升号或降号拼写出来。
 * 返回 { letterIndex, acc, octave, letter, name, pos }，
 * pos 是"第几个字母"，跨八度连续计数，度数就是两者 pos 之差加一。
 */
export function spellMidi(midi, flats = false) {
  const m = Math.round(midi);
  const [letterIndex, acc] = (flats ? FLAT_SPELL : SHARP_SPELL)[((m % 12) + 12) % 12];
  const octave = Math.floor(m / 12) - 1;
  return {
    letterIndex,
    acc,
    octave,
    letter: LETTERS[letterIndex],
    name: LETTERS[letterIndex] + ACC_TEXT[acc] + octave,
    pos: octave * 7 + letterIndex,
  };
}

/** 音级的汉字名：一度、二度…… */
const DEGREE_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八',
  '九', '十', '十一', '十二', '十三', '十四', '十五'];
export function degreeNameCn(n) {
  return `${DEGREE_CN[n] ?? n}度`;
}

/**
 * 每个简单音程的"大音程 / 纯音程"参照半音数。
 * 性质就是拿实际半音数跟这个参照比出来的。
 */
export const MAJOR_REF = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12 };

const PERFECT_TYPE = [1, 4, 5, 8];
const PERFECT_NAMES = ['重减', '减', '纯', '增', '重增'];
const IMPERFECT_NAMES = ['减', '小', '大', '增', '倍增'];

/** 由度数（1–8）和半音数推出性质。 */
export function intervalQuality(simpleDegree, semitones) {
  const ref = MAJOR_REF[simpleDegree];
  if (ref === undefined) return '?';
  const diff = semitones - ref;
  const table = PERFECT_TYPE.includes(simpleDegree) ? PERFECT_NAMES : IMPERFECT_NAMES;
  return table[diff + 2] ?? '?';
}

/** 完整音程分析：给两个 MIDI 和拼写方式，返回度数、音数、性质、全称。 */
export function analyseInterval(lowMidi, highMidi, flats = false) {
  const lo = spellMidi(lowMidi, flats);
  const hi = spellMidi(highMidi, flats);
  const degree = hi.pos - lo.pos + 1;
  const semis = highMidi - lowMidi;
  const compound = degree > 8;

  // 复音程（超过八度）先折算成单音程：八度数与跨过的字母数对应。
  const octaves = compound ? Math.floor((degree - 1) / 7) : 0;
  const simple = degree - octaves * 7;
  const simpleSemis = semis - octaves * 12;
  const quality = intervalQuality(simple, simpleSemis);

  const invDegree = 9 - simple;
  const invSemis = 12 - simpleSemis;

  return {
    low: lo, high: hi,
    degree, simple, compound, semis,
    quality,
    name: quality + degreeNameCn(degree),
    inversion: invDegree >= 1
      ? intervalQuality(invDegree, ((invSemis % 12) + 12) % 12) + degreeNameCn(invDegree)
      : '—',
    inversionDegree: invDegree,
    inversionSemis: ((invSemis % 12) + 12) % 12,
  };
}

/** 中国式的音组名：小字一组、大字一组…… 中央 C 是小字一组的 c¹。 */
const GROUP_CN = ['', '一', '二', '三', '四', '五'];
export function octaveGroupName(midi) {
  const n = Math.floor(Math.round(midi) / 12) - 1; // 科学音高记号法的八度数
  if (n >= 3) {
    const k = n - 3;
    return k === 0 ? '小字组' : `小字${GROUP_CN[k]}组`;
  }
  const k = 2 - n;
  return k === 0 ? '大字组' : `大字${GROUP_CN[k]}组`;
}

/** 固定唱名。 */
const SOLFEGE = ['do', 'do♯', 're', 're♯', 'mi', 'fa', 'fa♯', 'sol', 'sol♯', 'la', 'la♯', 'si'];
export function solfegeOf(midi) {
  return SOLFEGE[((Math.round(midi) % 12) + 12) % 12];
}
