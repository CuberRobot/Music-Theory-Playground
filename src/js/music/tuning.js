/**
 * 律制：纯律（自然泛音给出的比例）与十二平均律（人为等分）。
 * "为什么需要平均律"这个问题的全部数学都在这里。
 */

import { ratioToCents } from './pitch.js';

/**
 * 各音程的最简频率比。这些数字不是人编的，是从泛音列里直接读出来的：
 * 纯五度 3:2 出现在第 3 泛音与第 2 泛音之间，大三度 5:4 出现在第 5 与第 4 之间。
 */
export const JUST = [
  { semis: 0,  p: 1,  q: 1,  name: '纯一度', degree: '一度', quality: '纯', consonance: '完全协和' },
  { semis: 1,  p: 16, q: 15, name: '小二度', degree: '二度', quality: '小', consonance: '不协和' },
  { semis: 2,  p: 9,  q: 8,  name: '大二度', degree: '二度', quality: '大', consonance: '不协和' },
  { semis: 3,  p: 6,  q: 5,  name: '小三度', degree: '三度', quality: '小', consonance: '不完全协和' },
  { semis: 4,  p: 5,  q: 4,  name: '大三度', degree: '三度', quality: '大', consonance: '不完全协和' },
  { semis: 5,  p: 4,  q: 3,  name: '纯四度', degree: '四度', quality: '纯', consonance: '完全协和' },
  { semis: 6,  p: 45, q: 32, name: '增四度', degree: '四度', quality: '增', consonance: '不协和' },
  { semis: 7,  p: 3,  q: 2,  name: '纯五度', degree: '五度', quality: '纯', consonance: '完全协和' },
  { semis: 8,  p: 8,  q: 5,  name: '小六度', degree: '六度', quality: '小', consonance: '不完全协和' },
  { semis: 9,  p: 5,  q: 3,  name: '大六度', degree: '六度', quality: '大', consonance: '不完全协和' },
  { semis: 10, p: 9,  q: 5,  name: '小七度', degree: '七度', quality: '小', consonance: '不协和' },
  { semis: 11, p: 15, q: 8,  name: '大七度', degree: '七度', quality: '大', consonance: '不协和' },
  { semis: 12, p: 2,  q: 1,  name: '纯八度', degree: '八度', quality: '纯', consonance: '完全协和' },
];

/** 十二平均律：半音数 → 音分。定义上就是 100 的整数倍。 */
export function tetCents(semis) { return 100 * semis; }

/** 十二平均律：半音数 → 频率比。这就是 2^(1/12) 的用法。 */
export function tetRatio(semis) { return Math.pow(2, semis / 12); }

/** 一个半音的频率比，约 1.059463094。 */
export const SEMITONE_RATIO = Math.pow(2, 1 / 12);

/** 纯律里某个音程的音分。 */
export function justCents(i) { return ratioToCents(i.p / i.q); }

/** 平均律相对纯律偏了多少音分（正数表示平均律偏高）。 */
export function centsError(i) { return tetCents(i.semis) - justCents(i); }

/** 按半音数找音程定义。 */
export function bySemis(semis) { return JUST[semis] ?? null; }

/** 纯五度的音分，约 701.955。 */
export const JUST_FIFTH = ratioToCents(3 / 2);

/** 十二平均律五度的音分，正好 700。 */
export const TET_FIFTH = 700;

/** 毕达哥拉斯逗号：12 个纯五度比 7 个八度多出的音分，约 23.46。 */
export const PYTHAGOREAN_COMMA = 12 * JUST_FIFTH - 7 * 1200;

/**
 * 从一个起始音往上叠 n 个"大小可调"的五度，返回每一步的累计音分。
 * 第 12 步如果正好落在 8400（7 个八度）上，这个五度就是平均律五度。
 */
export function fifthChain(stepCents, steps = 12) {
  const out = [];
  for (let k = 0; k <= steps; k++) out.push(k * stepCents);
  return out;
}

/** 链条末端与 7 个八度之间的误差，也就是"逗号"有多大。 */
export function chainResidual(stepCents, steps = 12) {
  return steps * stepCents - 7 * 1200;
}

/**
 * 狼五度：如果前 11 个五度都是 stepCents，为了让第 12 个音正好落到
 * 7 个八度上，最后这个五度只能是多少音分。纯五度链条下约 678.5，
 * 听起来像狼嚎，所以叫狼音。
 */
export function wolfFifth(stepCents) {
  return 7 * 1200 - 11 * stepCents;
}

/** 十二平均律在八度内的十二个音，按五度循环排列的顺序。 */
export const FIFTH_ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

/**
 * 泛音列中每个泛音与"最接近的十二平均律音"之间差多少音分。
 * 这是泛音列和平均律之间的裂缝：第 7、11、13、14 泛音明显对不上。
 */
export function harmonicDeviation(harmonic) {
  const exact = ratioToCents(harmonic);
  const semis = Math.round(exact / 100);
  const nearest = semis * 100;
  return { exact, nearest, cents: exact - nearest, semis };
}

/** 泛音在听感上大致对应哪个音程，用于泛音表的说明列。 */
export const HARMONIC_LABELS = {
  1: '基音，也就是你听到的那个音高',
  2: '八度',
  3: '八度 + 纯五度',
  4: '两个八度',
  5: '两个八度 + 大三度',
  6: '两个八度 + 纯五度',
  7: '两个八度 + 小七度，对不上，偏低约 31 音分',
  8: '三个八度',
  9: '三个八度 + 大二度',
  10: '三个八度 + 大三度',
  11: '三个八度 + 增四度，对不上，偏低约 49 音分',
  12: '三个八度 + 纯五度',
  13: '三个八度 + 小六度，偏高约 41 音分',
  14: '三个八度 + 小七度，偏高约 31 音分',
  15: '三个八度 + 大七度',
  16: '四个八度',
};

/**
 * 常用泛音配方。返回长度为 count 的振幅数组，下标 0 是基音。
 * 用 1/n 之类的衰减是为了模仿真实乐器的频谱包络。
 */
export const SPECTRA = {
  sine:     { label: '纯音',   amp: (n) => (n === 1 ? 1 : 0) },
  saw:      { label: '锯齿波', amp: (n) => 1 / n },
  square:   { label: '方波',   amp: (n, i) => (i % 2 === 0 ? 1 / n : 0) },
  triangle: { label: '三角波', amp: (n, i) => (i % 2 === 0 ? 1 / (n * n) : 0) },
  organ:    { label: '风琴',   amp: (n) => 1 / Math.pow(n, 0.9) },
  clarinet: { label: '单簧管', amp: (n, i) => (i % 2 === 0 ? 1 / Math.pow(n, 1.3) : 0) },
  trumpet:  { label: '小号',   amp: (n, i) => (i < 6 ? 1 / Math.pow(n, 0.6) : 0) },
  voice:    { label: '人声',   amp: (n, i) => (i < 5 ? 1 / Math.pow(n, 1.4) : 1 / Math.pow(n, 2.6)) },
};

/** 把配方展开成归一化后的振幅数组。 */
export function spectrumToAmps(key, count = 16) {
  const spec = SPECTRA[key] ?? SPECTRA.saw;
  const amps = [];
  for (let i = 0; i < count; i++) amps.push(spec.amp(i + 1, i));
  const max = Math.max(...amps, 0) || 1;
  return amps.map((a) => a / max);
}
