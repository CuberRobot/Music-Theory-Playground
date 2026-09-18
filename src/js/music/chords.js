/**
 * 和弦：三和弦、七和弦、转位、调内和弦。
 * 判定用音级集合做，所以对排列顺序不敏感（原位转位都能认出来）。
 */

import { SCALES } from './scales.js';

export const TRIADS = {
  major:      { label: '大三和弦', steps: [0, 4, 7] },
  minor:      { label: '小三和弦', steps: [0, 3, 7] },
  diminished: { label: '减三和弦', steps: [0, 3, 6] },
  augmented:  { label: '增三和弦', steps: [0, 4, 8] },
};

export const SEVENTHS = {
  dominant:    { label: '属七和弦',   steps: [0, 4, 7, 10] },
  major7:      { label: '大七和弦',   steps: [0, 4, 7, 11] },
  minor7:      { label: '小七和弦',   steps: [0, 3, 7, 10] },
  halfDim7:    { label: '半减七和弦', steps: [0, 3, 6, 10] },
  dim7:        { label: '减七和弦',   steps: [0, 3, 6, 9] },
  minorMajor7: { label: '小大七和弦', steps: [0, 3, 7, 11] },
  augMajor7:   { label: '增大七和弦', steps: [0, 4, 8, 11] },
};

/** 转位的名字。三和弦和七和弦的中文叫法不一样，分开给。 */
export const INVERSION_NAMES = {
  3: ['原位', '第一转位（六和弦）', '第二转位（四六和弦）'],
  4: ['原位', '第一转位（五六和弦）', '第二转位（三四和弦）', '第三转位（二和弦）'],
};

const pc = (m) => ((Math.round(m) % 12) + 12) % 12;

/**
 * 认和弦。传入一组 MIDI 音高（排列顺序无所谓）。
 * 返回 { key, label, rootPc, inversion } 或 null。
 */
export function identify(midis, defs = { ...TRIADS, ...SEVENTHS }) {
  const n = midis.length;
  const pcs = midis.map(pc);
  if (new Set(pcs).size !== n) return null; // 有重复音，不是和弦

  for (const rootPc of pcs) {
    const rel = pcs.map((p) => ((p - rootPc) % 12 + 12) % 12).sort((a, b) => a - b);
    for (const [key, def] of Object.entries(defs)) {
      if (def.steps.length !== n) continue;
      if (def.steps.every((s, i) => s === rel[i])) {
        return {
          key,
          label: def.label,
          steps: def.steps,
          rootPc,
          inversion: inversionOf(midis, rootPc, def.steps),
        };
      }
    }
  }
  return null;
}

/**
 * 转位序号 = 最低的那个音是这个和弦的第几个音（0 原位、1 第一转位…）。
 * 注意不能数"根音在排列里排第几"：E4-G4-C5 里的 C 排第三，
 * 但它明明是低音 E 在下面，所以是第一转位。
 */
export function inversionOf(midis, rootPc, steps) {
  const sorted = [...midis].sort((a, b) => a - b);
  const bassPc = pc(sorted[0]);
  const rel = ((bassPc - rootPc) % 12 + 12) % 12;
  const i = (steps ?? []).indexOf(rel);
  return i < 0 ? 0 : i;
}

export function inversionLabel(size, inversion) {
  return (INVERSION_NAMES[size] ?? ['原位'])[inversion] ?? '转位';
}

/** 以某个音为根音往上叠一个和弦，返回 MIDI 数组（密集排列）。 */
export function build(rootMidi, key, defs = { ...TRIADS, ...SEVENTHS }) {
  const def = defs[key];
  if (!def) return [];
  return def.steps.map((s) => rootMidi + s);
}

/** 把和弦转到指定转位：把最低音往上搬八度。 */
export function invert(midis, inversion) {
  const out = [...midis].sort((a, b) => a - b);
  for (let i = 0; i < inversion; i++) out.push(out.shift() + 12);
  return out.sort((a, b) => a - b);
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** 罗马数字标记：大三和弦大写，小三和弦小写，减三和弦带 °。 */
export function romanFor(degree, qualityKey) {
  const base = ROMAN[degree % 7];
  if (qualityKey === 'major' || qualityKey === 'augmented') return base;
  if (qualityKey === 'minor') return base.toLowerCase();
  if (qualityKey === 'diminished') return `${base.toLowerCase()}°`;
  return base;
}

/**
 * 调内和弦：在某个调里，第 degree 级音上叠出来的和弦。
 * 这是"和弦为什么会有大小之分"的答案 —— 它由音阶本身决定，不是选的。
 */
export function diatonic(rootMidi, scaleKey, degree, size = 3) {
  const steps = (SCALES[scaleKey] ?? SCALES.major).steps;
  const at = (i) => steps[((i % 7) + 7) % 7] + Math.floor(i / 7) * 12;
  const base = at(degree);
  const offsets = size === 4 ? [0, 2, 4, 6] : [0, 2, 4];
  const midis = offsets.map((o) => rootMidi + at(degree + o));
  const rel = offsets.map((o) => at(degree + o) - base);
  const defs = size === 4 ? SEVENTHS : TRIADS;
  const key = Object.keys(defs).find((k) => defs[k].steps.every((s, i) => s === rel[i]));
  return {
    degree,
    midis,
    quality: key ?? null,
    label: key ? defs[key].label : '不是常规和弦',
    rootPc: pc(midis[0]),
    roman: key ? romanFor(degree, key) : ROMAN[degree],
    rel,
  };
}

/** 一个调里全部的调内三和弦（I 到 vii°）。 */
export function diatonicSet(rootMidi, scaleKey, size = 3) {
  return [0, 1, 2, 3, 4, 5, 6].map((d) => diatonic(rootMidi, scaleKey, d, size));
}
