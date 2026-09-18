/**
 * 音阶、调式、调号、五度圈。
 * 全部用半音数表示，不做拼写（升号还是降号由调用方按调号决定）。
 */

/** 各类音阶的半音结构，第一个音永远是主音（0）。 */
export const SCALES = {
  major:        { label: '大调',       steps: [0, 2, 4, 5, 7, 9, 11] },
  natMinor:     { label: '自然小调',   steps: [0, 2, 3, 5, 7, 8, 10] },
  harmMinor:    { label: '和声小调',   steps: [0, 2, 3, 5, 7, 8, 11] },
  melMinor:     { label: '旋律小调',   steps: [0, 2, 3, 5, 7, 9, 11] },
  majorPenta:   { label: '大调五声',   steps: [0, 2, 4, 7, 9] },
  minorPenta:   { label: '小调五声',   steps: [0, 3, 5, 7, 10] },
  ionian:       { label: '伊奥尼亚',   steps: [0, 2, 4, 5, 7, 9, 11] },
  dorian:       { label: '多利亚',     steps: [0, 2, 3, 5, 7, 9, 10] },
  phrygian:     { label: '弗里吉亚',   steps: [0, 1, 3, 5, 7, 8, 10] },
  lydian:       { label: '利底亚',     steps: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian:   { label: '混合利底亚', steps: [0, 2, 4, 5, 7, 9, 10] },
  aeolian:      { label: '爱奥利亚',   steps: [0, 2, 3, 5, 7, 8, 10] },
  locrian:      { label: '洛克里亚',   steps: [0, 1, 3, 5, 6, 8, 10] },
};

/** 七个音级的名字。第 7 级在自然小调里不是导音，所以另给一个别名。 */
export const DEGREE_NAMES = ['主音', '上主音', '中音', '下属音', '属音', '下中音', '导音'];
export const DEGREE_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** 大调里第 7 级到主音是半音，才叫导音；小调的七级一般叫下主音。 */
export function degreeName(steps, i) {
  if (i === 6 && steps[6] !== 11) return '下主音';
  return DEGREE_NAMES[i % 7];
}

/** 五度圈上的十二个大调，按纯五度顺序排列。 */
export const CIRCLE_MAJOR = [
  { pc: 0,  name: 'C',    sharps: 0, flats: 0 },
  { pc: 7,  name: 'G',    sharps: 1, flats: 0 },
  { pc: 2,  name: 'D',    sharps: 2, flats: 0 },
  { pc: 9,  name: 'A',    sharps: 3, flats: 0 },
  { pc: 4,  name: 'E',    sharps: 4, flats: 0 },
  { pc: 11, name: 'B',    sharps: 5, flats: 0 },
  { pc: 6,  name: 'G♭',   sharps: 0, flats: 6, alt: 'F♯' },
  { pc: 1,  name: 'D♭',   sharps: 0, flats: 5 },
  { pc: 8,  name: 'A♭',   sharps: 0, flats: 4 },
  { pc: 3,  name: 'E♭',   sharps: 0, flats: 3 },
  { pc: 10, name: 'B♭',   sharps: 0, flats: 2 },
  { pc: 5,  name: 'F',    sharps: 0, flats: 1 },
];

/** 升号出现顺序 F C G D A E B；降号是它的倒序 B E A D G C F。 */
export const SHARP_ORDER = [5, 0, 7, 2, 9, 4, 11];
export const FLAT_ORDER = [11, 4, 9, 2, 7, 0, 5];

/** 关系小调：主音往下小三度。 */
export function relativeMinorPc(majorPc) {
  return (majorPc + 9) % 12;
}

/** 同主音小调（同名大小调）：主音相同。 */
export function parallelMinorPc(majorPc) {
  return majorPc;
}

/** 生成一条音阶的 MIDI 音高。 */
export function scaleMidis(rootMidi, scaleKey, octaves = 1) {
  const scale = SCALES[scaleKey] ?? SCALES.major;
  const out = [];
  for (let o = 0; o < octaves; o++) {
    for (const s of scale.steps) out.push(rootMidi + s + o * 12);
  }
  out.push(rootMidi + octaves * 12);
  return out;
}

/** 某个音在调内是第几级（0 起）。不在调内返回 -1。 */
export function degreeInScale(midi, rootMidi, scaleKey) {
  const scale = SCALES[scaleKey] ?? SCALES.major;
  const rel = ((midi - rootMidi) % 12 + 12) % 12;
  return scale.steps.indexOf(rel);
}

/** 音级距离主音的半音数。 */
export function semisFromTonic(midi, rootMidi) {
  return ((midi - rootMidi) % 12 + 12) % 12;
}

/**
 * 引力场：把"稳定度"做成一条曲线。
 * 数值只是可听经验的粗略建模：主音最稳（1），三全音最不稳（0），
 * 属音、下属音次稳。目的是让抽象感觉有个可见的形状，不是科学测量。
 */
export const STABILITY = [
  1.00, // 0  主音
  0.30, // 1  小二度
  0.55, // 2  大二度
  0.72, // 3  小三度
  0.72, // 4  大三度
  0.85, // 5  下属音
  0.18, // 6  三全音
  0.92, // 7  属音
  0.70, // 8  小六度
  0.70, // 9  大六度
  0.45, // 10 小七度
  0.22, // 11 大七度 / 导音
];

/** 调号的升降号清单，用来画谱面上的调号。 */
export function keySignature(pc) {
  const key = CIRCLE_MAJOR.find((k) => k.pc === pc);
  if (!key) return { sharps: [], flats: [] };
  return {
    sharps: SHARP_ORDER.slice(0, key.sharps),
    flats: FLAT_ORDER.slice(0, key.flats),
  };
}

/** 调号里某个音级要不要升高/降低。返回 -1 / 0 / +1。 */
export function accidentalInKey(pc, letterPc) {
  const { sharps, flats } = keySignature(pc);
  if (sharps.includes(letterPc)) return 1;
  if (flats.includes(letterPc)) return -1;
  return 0;
}

/** 给一个音级半音数配上自然音级字母（C D E F G A B）。 */
const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11];
export function letterForStep(step) {
  return LETTER_PCS[((step % 7) + 7) % 7];
}
