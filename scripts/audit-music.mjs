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
import { identify, diatonicSet, invert, degreeMidi } from '../src/js/music/chords.js';
import { SCALES, CIRCLE_MAJOR, relativeMinorPc, SHARP_ORDER, FLAT_ORDER } from '../src/js/music/scales.js';
import { METERS, fitsMeasure } from '../src/js/music/rhythm.js';
import { TERMS, TEMPO_TERMS, DYNAMICS } from '../src/js/music/glossary.js';
import { LESSONS, PARTS, findLesson } from '../src/js/music/curriculum.js';
import { TEMPO } from '../src/js/audio/tempo.js';
import { SCORE_TEMPO } from '../src/js/audio/tempo.js';
import { ODE_THEME } from '../src/js/widgets/ode-lab.js';
import { TEXTURE_DEMO } from '../src/js/widgets/texture-lab.js';
import { sequenceOf } from '../src/js/widgets/motif-lab.js';
import { MIKAZUKI, MIKAZUKI_BARS, DEMOS } from '../src/js/widgets/mikazuki-form.js';
import { SOLO_TAKES, SOLO_LENGTHS } from '../src/js/widgets/solo-lab.js';
import { PROVENCE, PROVENCE_DEMOS } from '../src/js/widgets/march-lab.js';
import { DUET, DUET_LINES } from '../src/js/widgets/duet-lab.js';
import { INTERLOCK } from '../src/js/widgets/interlock-lab.js';
import { SITE, CHANGELOG } from '../src/js/site.js';
import { buildIndex, serialize } from './build-search-index.mjs';
import { CYCLE } from '../src/js/widgets/cycle-lab.js';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

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
let starSections = 0;
const section = (t) => {
  if (t.startsWith('★')) starSections++;
  console.log('\n— ' + t + ' —');
};
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

  // 模进必须按音级走：第二句是 F F F D，不是 F F F D♭
  const motifNotes = MOTIF.map((semi) => ({ semi, beats: 1 }));
  eq(names(BASE, sequenceOf(motifNotes, -1).map((n) => n.semi), false), 'F4 F4 F4 D4',
    '往下模进一个音级：G G G E♭ → F F F D');
  eq(names(BASE, sequenceOf(motifNotes, 1).map((n) => n.semi), true), 'A♭4 A♭4 A♭4 F4',
    '往上模进一个音级：G G G E♭ → A♭ A♭ A♭ F');
  // 第一句的下跳是大三度，第二句收成小三度 —— 这个差别不能被"平移半音"抹掉
  eq(analyseInterval(BASE - 4, BASE, true).name, '大三度', '第一句的下跳：G→E♭ 是大三度');
  const seqSemis = sequenceOf(motifNotes, -1).map((n) => n.semi);
  eq(analyseInterval(BASE + seqSemis[3], BASE + seqSemis[0], true).name, '小三度',
    '模进后的下跳：F→D 是小三度（比第一句紧）');
}

section('★ 贝多芬第九 · 欢乐颂主题（第四乐章第 92 小节起）');
{
  // 出处：IMSLP 上那份大提琴与低音提琴分谱，第四乐章第 92 小节，
  // Allegro assai ♩=80，D 大调 4/4，大提琴与低音提琴齐奏。
  const D = 50;                       // D3，原谱低音弦乐那一句的音区
  const beat = (ph) => ph.reduce((a, n) => a + n.b, 0);
  const hz = ODE_THEME.phrases.map(beat);
  eq(hz.join(','), '16,16,16,16', '四句各四小节（每句 16 拍）');
  eq(hz.reduce((a, b) => a + b, 0), 64, '主题总长 16 小节 64 拍');
  eq(SCORE_TEMPO.beethoven9_IV_joy, 80, '总谱速度：Allegro assai ♩=80');

  const p1 = ODE_THEME.phrases[0];
  // 用升号拼写：这是 D 大调，三级音要写成 F♯ 而不是 G♭
  eq(names(D, p1.map((n) => n.s), false),
    'F♯3 G3 A3 A3 G3 F♯3 E3 D3 E3 F♯3 F♯3 E3 E3',
    '第一句必须落在 D 大调的三级音上起（F♯ G A | A G F♯ E | D E F♯ | F♯ E E）');
  eq(p1.map((n) => n.b).join(','), '2,1,1,1,1,1,1,2,1,1,1.5,0.5,2',
    '第一句时值：起音是二分音符 F♯（不是两个四分音符）');

  const p2 = ODE_THEME.phrases[1];
  eq(p2[p2.length - 1].s, 0, '第二句结尾落在主音 D 上');
  eq(p2[p2.length - 1].b, 2, '而且是一个二分音符的 D');

  const p4 = ODE_THEME.phrases[3];
  eq(p4[0].s === p4[1].s && p4[1].b === 1, true,
    '第四句起音是两个 F♯（前一个从上一小节连过来）——和第一句的写法不同');

  // 主题里不该出现 D 大调之外的音
  const DEGREES = new Set([0, 2, 4, 5, 7, 9, 11]);
  eq(ODE_THEME.notes.every((n) => DEGREES.has(((n.s % 12) + 12) % 12)), true,
    '主题只用 D 大调音阶里的音（低音 A 记作 -5，即下五度）');
}

section('★ 级数不是半音数（低音线的老 bug）');
{
  // 第 27、29 节的实验台曾经把"第几级"当半音数加到根音上：
  // C 大调的 vi（A）被算成 F、IV（F）被算成 D♯，和上方的和弦直接打架。
  const C3 = 48;
  eq(degreeMidi(C3, 'major', 0, 0), 48, 'I 级 = C3（这一级原来就是对的，所以没被发现）');
  eq(degreeMidi(C3, 'major', 5, 1), 45, 'vi 级低音 = A2，不是 F3');
  eq(degreeMidi(C3, 'major', 3, 1), 41, 'IV 级低音 = F2，不是 D♯3');
  eq(degreeMidi(C3, 'major', 4, 1), 43, 'V 级低音 = G2，不是 E3');
  eq(degreeMidi(C3, 'major', 5, 0), 57, '同一个 vi 级不降八度就是 A3');
  // 低音必须是那个和弦的根音，不然和声就散了
  const set = diatonicSet(60, 'major', 3);
  eq(set.every((c, d) => degreeMidi(C3, 'major', d, 0) % 12 === c.midis[0] % 12), true,
    '每个级数的低音都必须和该级和弦的根音同音名');

  // 织体台（第 27 节 / J 节）：三层各占一个音区，谁也不撞谁
  const demo = TEXTURE_DEMO;
  const bass = demo.prog.map((d) => degreeMidi(demo.tonic, 'major', d, d >= 3 ? 1 : 0));
  const chordTop = 60 - 12 + 12;      // 和弦下移一个八度后最高音的上限（C5→C4 一带）
  const chordMidis = demo.prog.flatMap((d) => diatonicSet(60, 'major', 3)[d].midis.map((m) => m - 12));
  const melodyLo = Math.min(...demo.melody);
  // I 级上低音与和弦的最低音是同一个 C3 —— 那是根音加倍，正常，所以允许相等
  eq(Math.max(...bass) <= Math.min(...chordMidis), true,
    '低音不能跑到和弦中间去（低音 41–48，和弦 48–64）');
  eq(Math.max(...chordMidis) < melodyLo, true,
    '和弦必须全部低于旋律，否则旋律音会和和弦音撞出小二度');
  eq(demo.melody.every((m) => ((m % 12) + 12) % 12 in { 0: 1, 2: 1, 4: 1, 5: 1, 7: 1, 9: 1, 11: 1 }), true,
    '旋律必须全部落在 C 大调音阶里');
  eq(chordTop > 0, true, '（占位：和弦音区上限常量）');
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
  // 五度圈方向的根音运动：把差值折到 (-6, 6] 之后，"上行四度"是 +5。
  // 这里最容易被弄反 —— 写成 -5 的话 ii–V–I 会被算成 0 处。
  const norm = (a, b) => { let d = ((b - a) % 12 + 12) % 12; return d > 6 ? d - 12 : d; };
  const C = 0, D = 2, F = 5, G = 7, A = 9;
  eq(norm(D, G), 5, 'ii→V 的根音运动是 +5（上行四度）');
  eq(norm(G, C), 5, 'V→I 的根音运动也是 +5');
  eq([norm(D, G), norm(G, C)].filter((d) => d === 5).length, 2, 'ii–V–I 两处都应是五度圈方向');
  eq([norm(C, F), norm(F, G), norm(G, C)].filter((d) => d === 5).length, 2, 'I–IV–V–I 有两处（IV→V 是大二度）');
  eq([norm(C, G), norm(G, A), norm(A, F)].filter((d) => d === 5).length, 0, 'I–V–vi–IV 没有五度圈方向');
  eq(norm(C, G), -5, 'C→G 是上行五度，折合后为 -5（方向与 +5 相反）');
}

{
  eq(TEMPO_TERMS[0].it, 'Largo', '最慢 Largo');
  eq(TEMPO_TERMS[TEMPO_TERMS.length - 1].it, 'Presto', '最快 Presto');
  const b = TEMPO_TERMS.map((t) => Number(t.bpm.split('–')[0]));
  eq(b.every((v, i) => i === 0 || v > b[i - 1]), true, '速度术语 BPM 递增');
  eq(DYNAMICS.map((d) => d.mark).join(' '), 'pp p mp mf f ff', '力度记号顺序');
}

section('★ 三日月之舞 · 三段的速度与拍号');
{
  // 出处：萌娘百科《三日月之舞》条目的"赏析"小节（2026-09 取）。
  // 这一节引用的是它的文字描述，不是谱面核对 —— 页面里也这么写了。
  const M = MIKAZUKI;
  eq(M.movements.length, 3, '三段：急 — 缓 — 急');
  eq(M.movements.map((m) => m.bpm).join(','), '152,66,156', '三个乐部的速度标记');
  eq(M.movements[2].codaBpm, 168, 'Ⅲ 的收尾是 Presto ♩=168');
  eq(M.movements[0].meters.join(' '), '4/4 3/4', 'Ⅰ 在 4/4 和 3/4 之间来回');
  eq(M.movements[1].meters.join(' '), '4/4', 'Ⅱ 是 4/4');
  eq(Math.round((M.movements[1].bpm / M.movements[0].bpm) * 100), 43, '中段只有头段的 43%');
  eq(Math.round((M.movements[2].codaBpm / M.movements[0].bpm) * 100), 111, '收尾比头段快 11%');

  // 节拍器必须真的按声明的速度走：前两下的间隔就是一拍。
  // 之前"设了速度却没按它响"这类问题，只有耳朵能发现，所以这里钉住。
  for (const m of M.movements) {
    const d = DEMOS[m.id];
    near(d.taps[1].at - d.taps[0].at, 60 / m.bpm, 0.002, `${m.id} 拍点间隔必须等于 60/${m.bpm}`);
  }
  // Ⅲ 的收尾要真的加速：末尾的拍要比开头的拍短
  const t3 = DEMOS.III.taps;
  const headBeat = t3[1].at - t3[0].at;
  const lastBeat = t3[t3.length - 1].at - t3[t3.length - 2].at;
  eq(lastBeat < headBeat, true, 'Ⅲ 收尾的拍比开头的拍短（真的加速了）');
  eq(Math.abs(t3[t3.length - 1].at - t3[t3.length - 2].at - 60 / M.movements[2].codaBpm) < 0.002, true,
    '最后一拍的间隔是 ♩=168');

  // 示意素材的小节必须写满：slots 的总拍数要等于这一小节声明的拍数
  for (const [id, bars] of Object.entries(MIKAZUKI_BARS)) {
    bars.forEach((bar, i) => {
      const sum = bar.slots.reduce((a, s) => a + s.beats, 0);
      eq(sum, bar.beats, `${id} 第 ${i + 1} 小节的拍数`);
    });
  }
}

section('★ 三日月之舞 · 原声带各版本（时长与链接都要能对上）');
{
  const M = MIKAZUKI;
  const byId = (id) => M.versions.find((v) => v.id === id);
  eq(byId('reina').seconds - byId('kaori').seconds, 5, '丽奈版比香织版长 5 秒');
  eq(byId('short').seconds < 300, true, '引退式短版不到 5 分钟');
  eq(byId('kansai').seconds > byId('short').seconds, true, '关西大会版比短版长');

  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const page = readFileSync(new URL('../lessons/q-mikazuki/index.html', import.meta.url), 'utf8');
  for (const v of M.versions) {
    checks++;
    if (!page.includes(mmss(v.seconds))) fail(`O 节页面没写出 ${v.id} 的时长 ${mmss(v.seconds)}`);
    checks++;
    if (!page.includes(`song?id=${v.song}`)) fail(`O 节页面没链到 ${v.id} 的曲目（网易云 ${v.song}）`);
  }
  // 三段的速度标记必须出现在页面上（页面上用 CSS 画的音符，所以只查数字）
  for (const n of ['=152', '=66', '=156', '=168']) {
    checks++;
    if (!page.includes(n)) fail(`O 节页面没写出速度 ${n}`);
  }
  // 以前那句"没有谱、不给谱例"是错的：官方在卖总谱＋全分谱
  checks++;
  if (!/print-gakufu\.com\/score\/detail\/\d+/.test(page)) {
    fail('O 节页面没有给出官方乐谱的购买链接（"没有公版谱"不等于"没有谱"）');
  }
}

section('★ 独奏对照台：两串音高一个音都不差');
{
  const A = SOLO_TAKES.a.notes;
  const B = SOLO_TAKES.b.notes;
  // B 的句尾拆成两笔（后一笔轻下去），所以先合并相邻的同音再比音高序列
  const fold = (list) => list.reduce((acc, n) => (acc.at(-1) === n.midi ? acc : [...acc, n.midi]), []);
  eq(fold(A).join(','), SOLO_TAKES.pitches.join(','), 'A 的音高序列');
  eq(fold(B).join(','), SOLO_TAKES.pitches.join(','), 'B 的音高序列和 A 完全相同');

  // A 必须整整齐齐落在拍上（这就是"照着拍子吹"）
  eq(A.map((n) => n.start).join(','), '0,1,2,3,4,5,6', 'A 的每个音都从整拍起');
  eq(new Set(A.slice(0, -1).map((n) => n.dur)).size, 1, 'A 的前六个音一样长（句尾收住）');
  eq(new Set(A.map((n) => n.level ?? SOLO_TAKES.a.level)).size, 1, 'A 的每个音一样响');

  // B 必须真的"把句子唱出来"：高点更长、句尾更长、整句更长
  const peak = (list) => Math.max(...list.filter((n) => n.midi === 77).map((n) => n.dur));
  eq(peak(B) > peak(A) * 2, true, 'B 的最高音停的时间是 A 的两倍以上');
  eq(SOLO_LENGTHS.b > SOLO_LENGTHS.a, true, 'B 整句比 A 长');
  eq(B.at(-1).midi === B.at(-2).midi && B.at(-1).level < B.at(-2).level, true,
    'B 的句尾拆成两笔，后一笔更轻（用来收细）');
  // 句尾长度必须从高点之后的那一组算起 —— 句子的第一个音也是主音，
  // 拿"所有主音"去量会量成整句（这一条在实验台上曾经算错过）
  const tailOf = (list) => {
    const end = Math.max(...list.map((n) => n.start + n.dur));
    const peakStart = Math.min(...list.filter((n) => n.midi === 77).map((n) => n.start));
    const group = list.filter((n) => n.midi === SOLO_TAKES.pitches.at(-1) && n.start > peakStart);
    return end - Math.min(...group.map((n) => n.start));
  };
  eq(tailOf(A), 2, 'A 的句尾是 2 拍');
  eq(tailOf(B) > tailOf(A), true, 'B 的句尾比 A 长');
  eq(Math.max(...B.map((n) => n.level ?? 0)) > SOLO_TAKES.b.notes[0].level, true,
    'B 的力度是往高点推上去的，不是平的');
}

section('★ 普罗旺斯的风 · 2015 年课题曲 IV 的调性与骨架');
{
  // 出处：日文维基百科《マーチ「プロヴァンスの風」》（引全日本吹奏乐连盟会报 2014-12 号）
  // 与《全日本吹奏楽コンクール課題曲一覧》：第 63 回（2015）课题曲 IV = マーチ「プロヴァンスの風」。
  eq(PROVENCE.tempo, 132, '速度 ♩=132');
  eq(PROVENCE.meter, '4/4', '拍号 4/4');
  eq(PROVENCE.keyMain.includes('ニ短調'), true, '主调是 d 小调');
  eq(PROVENCE.keyTrio.includes('変イ長調'), true, '三声中段是 A♭ 大调');
  eq(PROVENCE.keyDistance, 6, '两个主音相距 6 个半音（三全音）');
  eq(analyseInterval(62, 68, true).name, '减五度', 'D → A♭ 的音程名（三全音的一种拼法）');
  eq(PROVENCE.sections.map((s) => s.id).join(','), 'intro,march1,trio,march3',
    '进行曲的四段：序奏—第一段—三声中段—第三段');

  // 每一段都要按 4/4 写满：march 四小节 = 16 拍；序奏一小节 = 4 拍
  const beat = 60 / PROVENCE.tempo;
  near(PROVENCE_DEMOS.intro.total, 4 * beat, 0.001, '序奏一小节（4 拍）');
  for (const id of ['march1', 'trio', 'march3']) {
    near(PROVENCE_DEMOS[id].total, 16 * beat, 0.001, `${id} 四小节（16 拍）`);
  }
  // 伴奏必须真的按进行曲的打法：低音鼓在 1、3 拍，小鼓在 2、4 拍
  const m1 = PROVENCE_DEMOS.march1;
  near(m1.taps[1].at - m1.taps[0].at, beat, 0.001, '拍点间隔 = 一拍');
  eq(m1.hats.map((h) => Math.round(h.at / beat) % 4).join(','), '1,3,1,3,1,3,1,3',
    '小鼓落在 2、4 拍（从 0 数起的 1、3）');
  eq(m1.drums.map((d) => Math.round(d.at / beat) % 4).join(','), '0,2,0,2,0,2,0,2',
    '低音鼓落在 1、3 拍');
  eq(m1.drums.every((d) => d.freq < 120), true, '低音鼓用的是低频');

  // 三声中段必须就是第一段整体挪六个半音 —— "同一句旋律换了调"这句话得是真的
  const strip = (list) => list.map((n) => ({ midi: n.midi, start: +n.start.toFixed(4), dur: +n.dur.toFixed(4) }));
  const shifted = strip(PROVENCE_DEMOS.march1.notes).map((n) => ({ ...n, midi: n.midi + PROVENCE.keyDistance }));
  eq(JSON.stringify(strip(PROVENCE_DEMOS.trio.notes)) === JSON.stringify(shifted), true,
    '三声中段 = 第一段整体 +6 个半音（同一句旋律，只换调）');

  // 页面必须写出速度、两个调，并给出四个听音链接
  const page = readFileSync(new URL('../lessons/r-provence/index.html', import.meta.url), 'utf8');
  for (const n of ['=132', 'd 小调', 'A♭ 大调']) {
    checks++;
    if (!page.includes(n)) fail(`P 节页面没写出 ${n}`);
  }
  for (const id of [33051088, 452804856, 452814790]) {
    checks++;
    if (!page.includes(`song?id=${id}`)) fail(`P 节页面没链到曲目 ${id}`);
  }
}

section('★ 利兹与青鸟 · 四个乐章与竞赛改编版');
{
  // 出处：官方原声带《girls,dance,staircase》Disc 2 的曲目数据（网易云与日文维基百科一致）
  const MOV = { 'ありふれた日々': 296, '新しい家族': 302, '愛ゆえの決断': 387, '遠き空へ': 354 };
  const total = Object.values(MOV).reduce((a, b) => a + b, 0);
  eq(total, 1339, '四个乐章加起来 1339 秒');
  eq(Math.floor(total / 60), 22, '也就是 22 分钟出头');
  const concours = 525;
  eq(concours < total / 2, true, '竞赛改编版不到原曲的一半长');
  near(concours / total, 0.39, 0.01, '改编版保留了约 39% 的长度');
  eq(MOV['愛ゆえの決断'] > MOV['ありふれた日々'], true, '第 3 楽章比第 1 楽章长（重量压在它身上）');

  const page = readFileSync(new URL('../lessons/s-liz-to-aoi-tori/index.html', import.meta.url), 'utf8');
  for (const n of ['4:56', '5:02', '6:27', '5:54', '8:45', '2:03']) {
    checks++;
    if (!page.includes(n)) fail(`Q 节页面没写出时长 ${n}`);
  }
  for (const id of [554244319, 554244320, 554245324, 554241297, 554242318]) {
    checks++;
    if (!page.includes(`song?id=${id}`)) fail(`Q 节页面没链到曲目 ${id}`);
  }
  // 第 3 楽章的双簧管与长笛分谱（自己动手对照那一段挂け合い的唯一正当路子）
  for (const id of [291131, 290435, 290405, 290403]) {
    checks++;
    if (!page.includes(`score/detail/${id}/`)) fail(`Q 节页面没给出乐谱 ${id}`);
  }
}

section('★ 小节长度台：9、8、7 与那个最小公倍数');
{
  // 出处：英文维基百科 Lateralus (song) —— 副歌小节在 9/8、8/8、7/8 之间轮换，
  // 以及 Carey 那句"原来叫 9-8-7，后来发现 987 是斐波那契第 16 个数"。
  eq(CYCLE.meters.join('-'), '9-8-7', '三种小节长度');
  eq(CYCLE.alignAfter, 504, '三条循环重合一次要 504 个八分音符（9、8、7 的最小公倍数）');
  eq(CYCLE.alignAfter % 9, 0, '504 能被 9 整除');
  eq(CYCLE.alignAfter % 8, 0, '504 能被 8 整除');
  eq(CYCLE.alignAfter % 7, 0, '504 能被 7 整除');
  // 动机是九格 —— 装进 8 和 7 的盒子时尾巴会被切掉，这是这一节的全部论点
  eq(CYCLE.motif.length, 9, '动机九格');
  eq(CYCLE.motif.length > 8 && CYCLE.motif.length > 7, true, '所以装进 8 和 7 时一定会被切短');
  // 斐波那契第 16 个数必须是 987（从 0 开始数）
  const fib = [0, 1];
  while (fib.length < 17) fib.push(fib.at(-1) + fib.at(-2));
  eq(fib[16], 987, '斐波那契从 0 数第 16 个数是 987');

  const page = readFileSync(new URL('../lessons/tool-lateralus/index.html', import.meta.url), 'utf8');
  for (const n of ['9:24', '5:47', 'song?id=20464495', 'song?id=3355868693', 'cycle-lab', '504']) {
    checks++;
    if (!page.includes(n)) fail(`S 节页面缺少 ${n}`);
  }
}

section('★ 交错织体台：一个人都不许把音乐演完');
{
  // 这一节的核心主张是"没有任何一层是完整的，合起来才填满"。
  // 这个主张得由数据保证，不然实验台就只是一句空话。
  eq(INTERLOCK.slots, 10, '十格 = 两小节 5/8');
  eq(INTERLOCK.bars, 2, '循环两小节');
  eq(INTERLOCK.slots / INTERLOCK.bars, 5, '每小节五格（5/8）');
  eq(INTERLOCK.layers.length, 4, '四层：两把吉他 + Stick + 鼓');

  const covered = new Set();
  for (const l of INTERLOCK.layers) {
    checks++;
    if (!l.slots.every((s) => Number.isInteger(s) && s >= 0 && s < INTERLOCK.slots)) {
      fail(`${l.id} 的格子越界了`);
    }
    checks++;
    if (new Set(l.slots).size !== l.slots.length) fail(`${l.id} 有重复的格子`);
    // 每一层都必须留空隙 —— 这就是"没有一个人演完整"
    checks++;
    if (l.slots.length >= INTERLOCK.slots) fail(`${l.id} 一个人就占满了整段，那就不叫交错织体了`);
    // 音高表和格子表要一一对应（鼓用 null 占位）
    checks++;
    if (l.midis && l.midis.length !== l.slots.length) fail(`${l.id} 的音高数和格子数对不上`);
    l.slots.forEach((s) => covered.add(s));
  }
  eq([...covered].sort((a, b) => a - b).join(','),
    Array.from({ length: INTERLOCK.slots }, (_, i) => i).join(','),
    '四层合起来正好盖满十格（不多一格、不少一格）');

  // 页面里的提示说"只留两把吉他会塌成片段"——那就必须真的塌：
  // 两把吉他合起来得留下空档，而 Stick 与鼓正好补上那些空档。
  const slotsOf = (ids) => {
    const s = new Set();
    INTERLOCK.layers.filter((l) => ids.includes(l.id)).forEach((l) => l.slots.forEach((x) => s.add(x)));
    return s;
  };
  const guitars = slotsOf(['gtrA', 'gtrB']);
  const rhythm = slotsOf(['stick', 'drums']);
  eq(guitars.size < INTERLOCK.slots, true, '两把吉他合起来仍然留空——所以才听得见"片段"');
  eq(rhythm.size < INTERLOCK.slots, true, '节奏组单独也不完整');

  const page = readFileSync(new URL('../lessons/kc-discipline/index.html', import.meta.url), 'utf8');
  for (const n of ['5:13', 'song?id=20045638', 'song?id=1892750802', 'interlock-lab', 'beat-tour.com', 'Discipline Era Transcriptions']) {
    checks++;
    if (!page.includes(n)) fail(`R 节页面缺少 ${n}`);
  }
}

section('★ 挂け合い台：错位多少毫秒算"不齐"');
{
  eq(DUET.bpm, 100, '示范速度 ♩=100');
  eq(DUET.maxOffsetMs, 240, '滑块最大 240 毫秒');
  eq(DUET.bands.map((b) => b.upTo).join(','), '25,75,150,240', '四档错位的分界');
  eq(DUET.bands.every((b, i) => i === 0 || b.upTo > DUET.bands[i - 1].upTo), true, '分界递增');
  eq(DUET.bands.every((b) => b.label && b.tip), true, '每一档都要有一句解释');

  // 0 毫秒时两条线必须真的对齐：第 3 小节那个一起停住的长音是重拍的同一时刻
  const at0 = DUET_LINES.at0;
  const oboeHold = at0.oboe.find((n) => n.midi === 79);
  const fluteHold = at0.flute.find((n) => n.midi === 76);
  near(oboeHold.start, fluteHold.start, 0.0005, '错位 0 时两条线同时进入那个长音');
  near(oboeHold.dur, fluteHold.dur, 0.0005, '而且一样长');
  eq(analyseInterval(fluteHold.midi, oboeHold.midi, false).name, '小三度', '两个长音构成小三度（协和）');

  // 推到最大时，长笛整体推迟的秒数必须精确等于滑块的值
  const atMax = DUET_LINES.atMax;
  const fluteAt0 = at0.flute[0];
  const fluteAtMax = atMax.flute[0];
  near(fluteAtMax.start - fluteAt0.start, DUET.maxOffsetMs / 1000, 0.0005, '长笛整体推迟 240 毫秒');
  near(atMax.oboe[0].start, at0.oboe[0].start, 0.0005, '双簧管不动');
}

section('节奏、词典引用、课程编号、泛音配方');
{
  // 播放速度统一：以前各实验台各写各的，同类素材在不同页面差一倍
  const order = ['single', 'chord', 'melody', 'scale', 'run', 'ornament'];
  const vals = order.map((k) => TEMPO[k]);
  eq(vals.every((v, i) => i === 0 || v < vals[i - 1]), true, '播放速度必须由慢到快');
  eq(vals.every((v) => v >= 0.08 && v <= 1.2), true, '速度必须落在可听范围 0.08–1.2 秒');
  eq(TEMPO.ornament >= 0.06, true, '装饰音也不能快到听不见');
  eq(fitsMeasure([4], 4), true, '一个全音符填满 4/4');
  eq(fitsMeasure([2, 2, 1], 4), false, '超拍判否');
  eq(METERS.find((m) => m.sig === '6/8').kind, '复拍子', '6/8 是复拍子');
  for (const t of TERMS) {
    checks++;
    if (!findLesson(t.lesson)) fail(`词条 ${t.en} 引用不存在的 ${t.lesson}`);
  }
  /**
   * 编号规则（2026-09 改）：
   *   第一部分、第二部分**有数字编号**，0 起连号 —— 这是教学顺序，要能说"第 12 节"。
   *   第三部分（作品分析）、第四部分（风格解析）**不编号** —— 它们按"层"组织，
   *   往里插一首曲子不该让后面所有节跟着挪号（插一次要改几十处引用，代价太高）。
   *
   * 所以这里守两条：数字连续、且**只有前两部分允许有编号**。
   */
  const numbered = LESSONS.filter((l) => /^\d+$/.test(l.no));
  const numberedParts = new Set(['fundamentals', 'craft']);
  for (const l of numbered) {
    checks++;
    if (!numberedParts.has(l.partId)) {
      fail(`${l.partId} 的《${l.title}》不该有编号（第三、四部分不编号）`);
    }
  }
  eq(numbered.map((l) => Number(l.no)).every((n, i) => n === i), true, '数字课程编号连续');
  for (const l of LESSONS) {
    checks++;
    if (numberedParts.has(l.partId) && !/^\d+$/.test(l.no)) {
      fail(`第一、二部分的《${l.title}》必须有数字编号`);
    }
  }
  eq(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length, '课程 id 无重复');
  for (const [key, spec] of Object.entries(SPECTRA)) {
    const amps = spectrumToAmps(key, 16);
    checks++;
    if (amps.some((a) => a < 0 || a > 1.0001)) fail(`${spec.label} 振幅越界`);
  }
}

section('★ 听辨题：一道题一个作答区，题面和选项数要对得上');
{
  // 用户报过两类毛病：
  //   1. 题干问了两件事（"哪一个是纯五度、哪一个是狼五度"），界面上却只有一个作答区；
  //   2. 题干写"两组"，实际给了三个选项。
  // 前者现在用 questions 数组表达（一道题一块），后者靠下面这条数量核对挡住。
  const CN = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
  const files = readdirSync(new URL('../lessons', import.meta.url), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name).sort();
  let questionsSeen = 0;
  for (const id of files) {
    const page = new URL(`../lessons/${id}/index.html`, import.meta.url);
    if (!existsSync(page)) continue;
    const html = readFileSync(page, 'utf8');
    for (const m of html.matchAll(/data-widget="listen-challenge">\s*<script type="application\/json">([\s\S]*?)<\/script>/g)) {
      checks++;
      let cfg;
      try { cfg = JSON.parse(m[1]); } catch (e) { fail(`${id} 的听辨题 JSON 解析失败：${e.message}`); continue; }
      const list = cfg.questions ?? [cfg];
      for (const [qi, q] of list.entries()) {
        questionsSeen++;
        const items = q.items ?? [];
        const where = `${id} 第 ${qi + 1} 题`;
        checks++;
        if (items.length < 2) fail(`${where} 只有 ${items.length} 个选项`);
        checks++;
        if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < items.length)) {
          fail(`${where} 的 answer=${q.answer} 不在 0..${items.length - 1} 里`);
        }
        // 题面里的"两组/三个/两段"必须和实际选项数一致
        // "哪一组"是在问选项，不是在报数量；"五个音"是在数音，也不是在数选项。
        // 只认 "两组 / 三段 / 三个和弦（音程、选项…）" 这种真的在报选项数的说法。
        const text = (q.question ?? '').replace(/哪[一两二三四五六]/g, '');
        const re = /([一两二三四五六])(组|段|个)([^，。？、\s]{0,2})/g;
        let said = null;
        let hit;
        while ((hit = re.exec(text))) {
          const [, ch, unit, after] = hit;
          if (unit !== '个' || /和弦|音程|选项|声音|音阶|拍子/.test(after)) { said = CN[ch]; break; }
        }
        if (said !== null && said !== items.length) {
          fail(`${where} 题面说 ${said} 个选项，实际有 ${items.length} 个`);
        }
      }
    }
  }
  eq(questionsSeen >= 16, true, `全站听辨题数量（${questionsSeen} 道）`);
}

section('实验台的 stopAll 必须真的导入（写过一次"用了没导入"）');
{
  const dir = new URL('../src/js/widgets/', import.meta.url);
  const names = readdirSync(dir).filter((f) => f.endsWith('.js'));
  for (const name of names) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    if (!/\bstopAll\(/.test(src)) continue;
    checks++;
    if (!/import \{[^}]*\bstopAll\b[^}]*\} from '\.\.\/audio\/engine\.js'/.test(src)) {
      fail(`${name} 用了 stopAll 但没有从 engine.js 导入它`);
    }
  }
}

section('站内搜索：索引必须是最新的');
{
  // 索引是维护期生成的静态文件。改完正文忘了重新生成，搜索就会"少一节"，
  // 而这种错在页面上看不出来 —— 所以交给审计逐字节比。
  const index = buildIndex();
  const want = serialize(index);
  const file = new URL('../assets/search-index.json', import.meta.url);
  checks++;
  if (!existsSync(file)) { fail('assets/search-index.json 不存在，跑 scripts/build-search-index.mjs'); }
  else {
    eq(readFileSync(file, 'utf8') === want, true,
      '搜索索引是最新的（跑 node scripts/build-search-index.mjs）');
  }
  eq(index.count, LESSONS.filter((l) => l.status === 'ready').length, '索引覆盖了所有 ready 的课');
  for (const it of index.items) {
    checks++;
    if (!it.title || !it.url) fail(`${it.id} 索引项缺标题或链接`);
    checks++;
    if (!(it.text || '').length) fail(`${it.id} 索引项没有正文`);
  }
  const page = new URL('../search/index.html', import.meta.url);
  checks++;
  if (!existsSync(page)) fail('search/ 页面不存在');
  else {
    const html = readFileSync(page, 'utf8');
    checks++;
    if (!html.includes('data-search-input')) fail('搜索页没有输入框');
    checks++;
    if (!html.includes('mtp-theme')) fail('搜索页少了防闪白的内联脚本');
  }
}

section('站点元信息：版本号与维护历史必须自洽');
{
  // 版本号散在页脚、关于页、历史页三处，最容易出现"页脚 v1.0、历史页停在 v0.3"。
  // 这里让它们只能有一个来源：src/js/site.js。
  eq(/^\d+\.\d+\.\d+$/.test(SITE.version), true, '版本号是 x.y.z 形式');
  eq(CHANGELOG[0].version, SITE.version, '维护历史的第一条就是当前版本');
  const dates = CHANGELOG.map((v) => v.date);
  eq(dates.join(',') === [...dates].sort().reverse().join(','), true, '维护历史按日期从新到旧');
  for (const [i, v] of CHANGELOG.entries()) {
    checks++;
    if (!v.title || !v.items?.length) fail(`v${v.version} 缺标题或内容`);
    checks++;
    if (i > 0 && !(v.version < CHANGELOG[i - 1].version)) {
      fail(`v${v.version} 不该排在 v${CHANGELOG[i - 1].version} 后面（版本号要从新到旧）`);
    }
  }
  for (const page of ['about', 'changelog']) {
    const f = new URL(`../${page}/index.html`, import.meta.url);
    checks++;
    if (!existsSync(f)) { fail(`${page}/ 页面不存在`); continue; }
    const html = readFileSync(f, 'utf8');
    checks++;
    if (!html.includes('data-version') && page === 'about') fail('关于页没有版本号占位');
    checks++;
    if (!html.includes('src/js/main.js')) fail(`${page} 页没挂 main.js`);
  }
  /**
   * 首页是唯一不挂 main.js 的页面（门面页刻意不放交互），它的顶栏导航是静态写死的。
   * 所以"新加一个顶级入口"这件事要改两处：main.js 的 renderTopnav + 首页的静态标记 ——
   * 「关于 / 更新」这次就只改了前者，从门面页根本走不到。
   */
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const [pageName, dir] of [['关于', 'about'], ['更新', 'changelog']]) {
    checks++;
    if (!home.includes(`href="./${dir}/"`)) {
      fail(`首页的静态导航没有链到${pageName}页（./${dir}/）`);
    }
  }
  // 站点链接必须写出到页面（页脚/关于页都要用）
  checks++;
  if (!SITE.repo.includes('github.com')) fail('SITE.repo 不像 GitHub 地址');
}

section('MuseScore 三节：图与示例谱都在，而且不胖');
{
  // 这一层是给"教程"加的：教程最容易坏的地方不是代码，是图。
  // 图片被删掉、路径写错、或者哪天塞进来一张 3MB 的截图，页面都会悄悄变差。
  const LESSONS_MS = ['30-musescore-basics', '31-musescore-notation', '32-musescore-publish'];
  const seen = new Set();
  for (const id of LESSONS_MS) {
    const page = new URL(`../lessons/${id}/index.html`, import.meta.url);
    checks++;
    if (!existsSync(page)) { fail(`${id} 的页面不存在`); continue; }
    const html = readFileSync(page, 'utf8');
    for (const m of html.matchAll(/<img\s+src="([^"]+)"/g)) {
      const rel = m[1].replace(/^\.\.\/\.\.\//, '');
      const file = new URL(`../${rel}`, import.meta.url);
      seen.add(rel);
      checks++;
      if (!existsSync(file)) { fail(`${id} 引用了不存在的图片 ${rel}`); continue; }
      const kb = statSync(file).size / 1024;
      checks++;
      if (kb > 400) fail(`${rel} 有 ${Math.round(kb)}KB —— 静态站不该挂这么大的图`);
    }
  }
  eq(seen.size >= 3, true, '三节教程至少各有一张图');
  // 三份示例谱：图和谱都要在
  for (const name of ['30-first-score', '31-markings', '32-layout']) {
    checks++;
    if (!existsSync(new URL(`../assets/musescore/${name}.musicxml`, import.meta.url))) {
      fail(`示例谱 ${name}.musicxml 不见了`);
    }
    checks++;
    if (!existsSync(new URL(`../assets/musescore/${name}.png`, import.meta.url))) {
      fail(`示例谱的渲染图 ${name}.png 不见了`);
    }
  }
}

section('ready 的课必须真的有页面，页面上的实验台必须真的有文件');
{
  // 两个都能整页翻车的失误：status 提前改成 ready 但页面还没写（线上点进去 404），
  // 以及 data-widget 名字写错（main.js 对没注册的名字是静默跳过的，页面上就空一块）。
  const main = readFileSync(new URL('../src/js/main.js', import.meta.url), 'utf8');
  for (const l of LESSONS) {
    if (l.status !== 'ready') continue;
    const page = new URL(`../lessons/${l.id}/index.html`, import.meta.url);
    checks++;
    if (!existsSync(page)) {
      fail(`${l.no} ${l.title} 标成 ready，但 lessons/${l.id}/index.html 不存在`);
      continue;
    }
    const html = readFileSync(page, 'utf8');
    // 第三、四部分取消编号之后，正文里不该再出现"第 E 节""O 节"这类字母编号引用 ——
    // 改编号规则时最容易漏的就是这些散在散文里的交叉引用（这次就漏了四处）。
    const staleRef = html.match(/[A-Z] 节/);
    checks++;
    if (staleRef) {
      fail(`${l.title} 的正文里还留着字母编号引用：${staleRef[0]}`);
    }
    const who = l.no ? `${l.no} ${l.title}` : l.title;
    for (const m of html.matchAll(/data-widget="([^"]+)"/g)) {
      checks++;
      const name = m[1];
      if (!existsSync(new URL(`../src/js/widgets/${name}.js`, import.meta.url))) {
        fail(`${who} 用了不存在的实验台 ${name}`);
      } else if (!new RegExp(`(['"]${name}['"]|\\b${name})\\s*:`).test(main)) {
        fail(`${who} 的实验台 ${name} 没有在 main.js 的 WIDGETS 里注册`);
      }
    }
  }
}

section('README 上的规模数字必须和课程表、注册表对得上');
{
  // "54 节 · 20 层 · 41 个实验台" 这种数字最容易随加课悄悄过期 —— 这次就写错了一个
  // （实验台按 widgets/ 目录的文件数算成 41，但那里还含共享组件 keyboard.js，
  // 真正注册的台子是 40）。所以让它只能从代码算出来。
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const m = readme.match(/(\d+)\s*节\s*·\s*(\d+)\s*层\s*·\s*(\d+)\s*个实验台/);
  checks++;
  if (!m) {
    fail('README 里没找到「共 N 节 · N 层 · N 个实验台」那句（改了措辞请同步改这条检查）');
  } else {
    const tiers = PARTS.reduce((a, p) => a + (p.tiers ?? p.groups ?? []).length, 0);
    const mainSrc = readFileSync(new URL('../src/js/main.js', import.meta.url), 'utf8');
    const block = mainSrc.match(/WIDGETS = \{([\s\S]*?)\n\};/);
    const widgets = block ? [...block[1].matchAll(/^\s*['"]?([\w-]+)['"]?\s*:/gm)].length : -1;
    eq(Number(m[1]), LESSONS.length, 'README 的节数与课程表一致');
    eq(Number(m[2]), tiers, 'README 的层数与课程表一致');
    eq(Number(m[3]), widgets, 'README 的实验台数与 main.js 里注册的数量一致');
  }
}

console.log(fails
  ? `\n${fails} / ${checks} 项失败`
  : `\n全部 ${checks} 项通过（含 ${starSections} 组对照真实作品的检查）`);
process.exitCode = fails ? 1 : 0;
