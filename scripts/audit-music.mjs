/**
 * 乐理数据审计。用法：node scripts/audit-music.mjs
 *
 * 为什么需要它：以前的断言只核对"代码内部一致"——音名和音程名都由同一个
 * 半音数推出来，所以写错了也互相印证、一路绿灯。贝五动机那次就是这么溜过去的
 * （写成 -3、描述也跟着写"小三度"）。
 * 所以这里分两类：A 内部一致；B **对照真实作品与事实**。B 是之前缺的那一半。
 */

import { analyseInterval, spellMidi } from '../src/js/music/pitch.js';
import {
  JUST, justCents, tetCents, centsError, harmonicDeviation,
  PYTHAGOREAN_COMMA, JUST_FIFTH, wolfFifth, SPECTRA, spectrumToAmps,
} from '../src/js/music/tuning.js';
import { identify, diatonicSet, invert } from '../src/js/music/chords.js';
import { SCALES, CIRCLE_MAJOR, relativeMinorPc, SHARP_ORDER, FLAT_ORDER } from '../src/js/music/scales.js';
import { METERS, fitsMeasure } from '../src/js/music/rhythm.js';
import { TERMS, TEMPO_TERMS, DYNAMICS } from '../src/js/music/glossary.js';
import { LESSONS, findLesson } from '../src/js/music/curriculum.js';

let fails = 0;
let checks = 0;
const fail = (m) => { console.log('  x ' + m); fails++; };
const eq = (got, want, msg) => {
  checks++;
  if (got !== want) fail(`${msg}：得到 ${JSON.stringify(got)}，应为 ${JSON.stringify(want)}`);
};
const near = (got, want, tol, msg) => {
  checks++;
  if (Math.abs(got - want) > tol) fail(`${msg}：得到 ${got}，应为 ${want}`);
};
const section = (t) => console.log('\n— ' + t + ' —');
const names = (root, steps, flats = false) =>
  steps.map((s) => spellMidi(root + s, flats).name).join(' ');
const pc = (m, flats = false) => spellMidi(m, flats).name.replace(/\d+$/, '');

/* ============ A · 内部一致 ============ */

section('音程 13 档 × 两种拼写（同音异名必须给出不同名字）');
{
  // [半音数, 升号拼写下叫什么, 降号拼写下叫什么]
  const WANT = [
    [0, '纯一度', '纯一度'], [1, '增一度', '小二度'], [2, '大二度', '大二度'],
    [3, '增二度', '小三度'], [4, '大三度', '大三度'], [5, '纯四度', '纯四度'],
    [6, '增四度', '减五度'], [7, '纯五度', '纯五度'], [8, '增五度', '小六度'],
    [9, '大六度', '大六度'], [10, '增六度', '小七度'], [11, '大七度', '大七度'],
    [12, '纯八度', '纯八度'],
  ];
  for (const [n, sharp, flat] of WANT) {
    eq(analyseInterval(60, 60 + n, false).name, sharp, `C 上行 ${n} 半音（升号拼写）`);
    eq(analyseInterval(60, 60 + n, true).name, flat, `C 上行 ${n} 半音（降号拼写）`);
  }
  eq(analyseInterval(60, 76).name, '大十度', 'C4→E5 复音程');
  for (let n = 1; n <= 11; n++) {
    const r = analyseInterval(60, 60 + n);
    eq(r.inversionDegree + r.degree, 9, `第 ${n} 档转位度数之和`);
  }
}

section('律制常数与泛音偏差');
{
  near(JUST_FIFTH, 701.955, 0.001, '纯五度');
  near(PYTHAGOREAN_COMMA, 23.460, 0.001, '毕达哥拉斯逗号');
  near(wolfFifth(JUST_FIFTH), 678.495, 0.001, '狼五度');
  for (const [h, c] of [[2, 0], [3, 1.955], [5, -13.686], [7, -31.174], [11, -48.682]]) {
    near(harmonicDeviation(h).cents, c, 0.01, `第 ${h} 泛音偏差`);
  }
}

section('调式的级数性质序列');
{
  const Q = { major: 'M', minor: 'm', diminished: 'dim', augmented: 'aug' };
  const WANT = {
    major: 'M m m M M m dim', natMinor: 'm dim M m m M M', harmMinor: 'm dim aug m M M dim',
    dorian: 'm m M M m dim M', phrygian: 'm M M m dim M m', lydian: 'M M m dim M m m',
    mixolydian: 'M m dim M m m M', locrian: 'dim M m m M M m',
  };
  for (const [k, w] of Object.entries(WANT)) {
    eq(diatonicSet(60, k).map((c) => Q[c.quality]).join(' '), w, SCALES[k].label);
  }
  eq(diatonicSet(60, 'major', 4).map((c) => c.quality).join(','),
    'major7,minor7,minor7,major7,dominant,minor7,halfDim7', '大调七个七和弦');
}

section('和弦识别与转位');
{
  const C = [
    [[60, 64, 67], 'major'], [[60, 63, 67], 'minor'], [[60, 63, 66], 'diminished'],
    [[60, 64, 68], 'augmented'], [[60, 64, 67, 70], 'dominant'], [[60, 64, 67, 71], 'major7'],
    [[60, 63, 67, 70], 'minor7'], [[60, 63, 66, 70], 'halfDim7'], [[60, 63, 66, 69], 'dim7'],
  ];
  for (const [midis, key] of C) eq(identify(midis)?.key, key, `识别 ${midis.join(',')}`);
  eq(identify([60, 62, 67]), null, 'C D G 不是和弦');
  for (const [size, key] of [[3, 'major'], [4, 'dominant']]) {
    const base = size === 3 ? [60, 64, 67] : [60, 64, 67, 70];
    for (let inv = 0; inv < size; inv++) {
      eq(identify(invert(base, inv))?.inversion, inv, `${key} 第 ${inv} 转位`);
    }
  }
  eq(identify([64, 67, 72])?.inversion, 1, 'E4-G4-C5 = 第一转位');
}

section('五度圈与调号');
{
  eq(SHARP_ORDER.map((p) => pc(60 + p)).join(' '), 'F C G D A E B', '升号顺序');
  eq(FLAT_ORDER.map((p) => pc(60 + p, true)).join(' '), 'B E A D G C F', '降号顺序');
  const W = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, F: 1 };
  for (const [name, n] of Object.entries(W)) {
    const k = CIRCLE_MAJOR.find((x) => x.name === name);
    eq(name === 'F' ? k.flats : k.sharps, n, `${name} 大调调号个数`);
  }
  for (const [maj, min] of [[0, 9], [7, 4], [2, 11], [5, 2], [10, 7]]) {
    eq(relativeMinorPc(maj), min, `${pc(60 + maj)} 大调的关系小调`);
  }
}

/* ============ B · 对照真实作品（之前缺的一半） ============ */

section('★ 贝多芬第五开头动机');
{
  const BASE = 67;
  const MOTIF = [0, 0, 0, -4];
  eq(names(BASE, MOTIF, true), 'G4 G4 G4 E♭4', '动机音名：必须是 G G G E♭');
  eq(analyseInterval(63, 67, true).name, '大三度', 'E♭→G 是大三度（拼写必须用降号）');
  const EB_MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const deg = (s) => EB_MAJOR.indexOf(s) + 1;
  // 相对 E♭ 的半音数：G 是 4，E♭ 是 0
  eq(`${deg(4)} ${deg(4)} ${deg(4)} ${deg(0)}`, '3 3 3 1', '在 E♭ 大调里的级数（G=3, E♭=1）');
}

section('★ 十二小节布鲁斯');
{
  const T = 48;
  const FORM = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];
  eq(FORM.map((d) => pc(T + d, true)).join(' '), 'C C C C F F C C G F C G', '十二小节根音');
  eq(FORM[8], 7, '第 9 小节是 V 级');
  // 标准十二小节里 IV 出现在第 5、6、10 小节
  eq(FORM.filter((d) => d === 5).length, 3, 'IV 级三个小节（第 5、6、10）');
  eq([0, 7, 9, 10].map((s) => pc(T + s, true)).join(' '), 'C G A B♭', 'boogie 低音走法');
  const BLUES = [0, 3, 5, 6, 7, 10];
  eq(names(T + 12, BLUES, true), 'C4 E♭4 F4 G♭4 G4 B♭4', '布鲁斯音阶');
  const inScale = (s) => BLUES.includes(((s % 12) + 12) % 12);
  const A = [0, 3, 0, 3, 0, 3, 7, 6];
  const B = [7, 6, 5, 3, 0];
  eq(A.every(inScale), true, 'A 句全在布鲁斯音阶内');
  eq(B.every(inScale), true, 'B 句全在布鲁斯音阶内');
  eq(A.map((s) => pc(T + s, true)).join(' '), 'C E♭ C E♭ C E♭ G G♭', 'A 句音名');
}

section('★ 借用和弦与副属和弦');
{
  const T = 60;
  // 第四项是该和弦应有的性质 —— iv 是小三，其余是大三
  const B = [
    ['♭VII', [10, 14, 17], 'B♭ D F', true, 'major'],
    ['iv', [5, 8, 12], 'F A♭ C', true, 'minor'],
    ['♭VI', [8, 12, 15], 'A♭ C E♭', true, 'major'],
    ['♭III', [3, 7, 10], 'E♭ G B♭', true, 'major'],
    ['♭II', [1, 5, 8], 'D♭ F A♭', true, 'major'],
    ['II', [2, 6, 9], 'D F♯ A', false, 'major'],
  ];
  for (const [label, steps, want, flats, quality] of B) {
    eq(steps.map((s) => pc(T + s, flats)).join(' '), want, `${label} 构成音`);
    eq(identify(steps.map((s) => T + s))?.key, quality, `${label} 的和弦性质`);
  }
  const S = [
    ['V/V', [2, 6, 9, 12], 7], ['V/ii', [9, 13, 16, 19], 2],
    ['V/vi', [4, 8, 11, 14], 9], ['V/IV', [0, 4, 7, 10], 5],
  ];
  for (const [label, steps, toStep] of S) {
    const id = identify(steps.map((s) => T + s));
    eq(id?.key, 'dominant', `${label} 应是属七`);
    eq(id?.rootPc, (toStep + 7) % 12, `${label} 的根音在目标下方五度`);
  }
}

section('★ 民族调式');
{
  const G = 60;
  const P = [0, 2, 4, 7, 9];
  eq(names(G, P, true), 'C4 D4 E4 G4 A4', '五声：宫商角徵羽');
  const gaps = P.map((v, i) => (i === P.length - 1 ? 12 : P[i + 1]) - v);
  eq(gaps.join(','), '2,2,3,2,3', '五声间隔（含回到宫音的小三度）');
  eq(names(G, [0, 2, 4, 5, 7, 9, 11], true), 'C4 D4 E4 F4 G4 A4 B4', '清乐 = 自然大调');
  // 雅乐里的变徵是升四度，必须用升号拼写
  eq(names(G, [0, 2, 4, 6, 7, 9, 11], false), 'C4 D4 E4 F♯4 G4 A4 B4', '雅乐 = Lydian');
  eq(names(G, [0, 2, 4, 5, 7, 9, 10], true), 'C4 D4 E4 F4 G4 A4 B♭4', '燕乐 = Mixolydian');
}

section('★ 变化音的拼写与解决方向');
{
  eq(pc(60 + 6), 'F♯', '♯4');
  eq(pc(60 + 8, true), 'A♭', '♭6');
  eq(pc(60 + 10, true), 'B♭', '♭7');
  eq(pc(60 + 3, true), 'E♭', '♭3');
  eq(pc(60 + 1, true), 'D♭', '♭2');
  eq(pc(60 + 8), 'G♯', '♯5');
  for (const [label, semi, to] of [['♯4', 6, 7], ['♭6', 8, 7], ['♭7', 10, 9],
    ['♭3', 3, 2], ['♭2', 1, 0], ['♯5', 8, 9]]) {
    checks++;
    if (Math.abs(to - semi) > 2) fail(`${label} 的解决跨了 ${to - semi} 个半音，太大`);
  }
}

section('★ 移调乐器');
{
  eq(pc(60 - 2, true), 'B♭', '降 B 调：谱上 C 实际响 B♭');
  eq(pc(60 - 9, true), 'E♭', '降 E 调：谱上 C 实际响 E♭');
  eq(pc(60 - 7, true), 'F', 'F 调：谱上 C 实际响 F');
  eq(60 - 9, 51, '降 E 调实际是 E♭3');
}

section('★ 乐器音域');
{
  const R = [
    ['长笛', 60, 96], ['单簧管', 50, 94], ['中音萨克斯', 49, 80], ['小号', 55, 82],
    ['圆号', 41, 77], ['长号', 40, 72], ['小提琴', 55, 96], ['中提琴', 48, 88],
    ['大提琴', 36, 76], ['低音提琴', 28, 67], ['女高音', 60, 84], ['男低音', 41, 69],
  ];
  for (const [name, lo, hi] of R) {
    checks++;
    if (hi <= lo) fail(`${name} 音域上下限反了`);
    if (lo < 21 || hi > 108) fail(`${name} 超出钢琴范围`);
    if (hi - lo < 12) fail(`${name} 音域不到八度`);
  }
  eq(Math.min(...R.map((r) => r[1])), 28, '最低的是低音提琴');
}

section('★ 速度与力度');
{
  eq(TEMPO_TERMS[0].it, 'Largo', '最慢 Largo');
  eq(TEMPO_TERMS[TEMPO_TERMS.length - 1].it, 'Presto', '最快 Presto');
  const b = TEMPO_TERMS.map((t) => Number(t.bpm.split('–')[0]));
  eq(b.every((v, i) => i === 0 || v > b[i - 1]), true, '速度术语 BPM 递增');
  eq(DYNAMICS.map((d) => d.mark).join(' '), 'pp p mp mf f ff', '力度记号顺序');
}

section('节奏、词典引用、课程编号、泛音配方');
{
  eq(fitsMeasure([4], 4), true, '一个全音符填满 4/4');
  eq(fitsMeasure([2, 2, 1], 4), false, '超拍判否');
  eq(METERS.find((m) => m.sig === '6/8').kind, '复拍子', '6/8 是复拍子');
  for (const t of TERMS) {
    checks++;
    if (!findLesson(t.lesson)) fail(`词条 ${t.en} 引用不存在的 ${t.lesson}`);
  }
  eq(LESSONS.map((l) => Number(l.no)).every((n, i) => n === i), true, '课程编号连续');
  eq(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length, '课程 id 无重复');
  for (const [key, spec] of Object.entries(SPECTRA)) {
    const amps = spectrumToAmps(key, 16);
    checks++;
    if (amps.some((a) => a < 0 || a > 1.0001)) fail(`${spec.label} 振幅越界`);
  }
}

console.log(fails
  ? `\n${fails} / ${checks} 项失败`
  : `\n全部 ${checks} 项通过（含 7 组对照真实作品的检查）`);
process.exitCode = fails ? 1 : 0;
