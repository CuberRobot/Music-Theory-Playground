/**
 * 第 28 节 · 音区与配器。
 *
 * 配器看起来是"选音色"，其实是两件很朴素的事：
 *   ① 音域覆盖 —— 低、中低、中高、高，四个区间有没有人。
 *   ② 功能分层 —— 旋律、和声、低音、节奏，四件事有没有人干。
 * 缺低音就头重脚轻，缺中声部就空洞，两件乐器挤在同一音区干同一件事就打架。
 * 这一节把这件事变成可查的：勾几件乐器，看音域条盖没盖住。
 */

import { nameOfMidi } from '../music/pitch.js';

const LO = 28;
const HI = 100;

/** 四个音区。 */
const BANDS = [
  { id: 'low', label: '低音区', lo: 28, hi: 48 },
  { id: 'midLow', label: '中低音区', lo: 48, hi: 64 },
  { id: 'midHigh', label: '中高音区', lo: 64, hi: 84 },
  { id: 'high', label: '高音区', lo: 84, hi: 100 },
];

/** 每件乐器标出主要功能与家族。同族音色更容易融合，混族色彩更丰富。 */
const INSTRUMENTS = [
  { id: 'picc', name: '短笛', lo: 74, hi: 96, family: '木管', role: '旋律' },
  { id: 'flute', name: '长笛', lo: 60, hi: 96, family: '木管', role: '旋律' },
  { id: 'oboe', name: '双簧管', lo: 58, hi: 91, family: '木管', role: '旋律' },
  { id: 'clarinet', name: '单簧管', lo: 50, hi: 94, family: '木管', role: '旋律／和声' },
  { id: 'bassoon', name: '大管', lo: 34, hi: 75, family: '木管', role: '低音' },
  { id: 'horn', name: '圆号', lo: 41, hi: 77, family: '铜管', role: '和声／低音' },
  { id: 'trumpet', name: '小号', lo: 55, hi: 82, family: '铜管', role: '旋律' },
  { id: 'trombone', name: '长号', lo: 40, hi: 72, family: '铜管', role: '和声／低音' },
  { id: 'tuba', name: '大号', lo: 28, hi: 58, family: '铜管', role: '低音' },
  { id: 'violin', name: '小提琴', lo: 55, hi: 96, family: '弦乐', role: '旋律' },
  { id: 'viola', name: '中提琴', lo: 48, hi: 88, family: '弦乐', role: '和声' },
  { id: 'cello', name: '大提琴', lo: 36, hi: 76, family: '弦乐', role: '和声／低音' },
  { id: 'bass', name: '低音提琴', lo: 28, hi: 67, family: '弦乐', role: '低音' },
  { id: 'guitar', name: '吉他', lo: 40, hi: 88, family: '拨弦', role: '和声' },
  { id: 'piano', name: '钢琴', lo: 21, hi: 108, family: '键盘', role: '全包' },
];

const SIZE = 6;

export function mountOrchestrationLab(root) {
  const state = { picked: ['flute', 'clarinet', 'horn', 'cello'] };

  root.innerHTML = `
    <div class="card-head">
      <h2>编制诊断台</h2>
      <p class="hint">最多勾 ${SIZE} 件，看音域盖住没有、功能齐不齐</p>
    </div>
    <div class="tiles" data-inst role="group" aria-label="乐器"></div>
    <div data-chart style="margin-top:var(--sp-5)"></div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-note></p>
  `;

  const el = {
    inst: root.querySelector('[data-inst]'),
    chart: root.querySelector('[data-chart]'),
    readout: root.querySelector('[data-readout]'),
    note: root.querySelector('[data-note]'),
  };

  INSTRUMENTS.forEach((x) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.dataset.id = x.id;
    b.textContent = x.name;
    b.addEventListener('click', () => {
      const i = state.picked.indexOf(x.id);
      if (i >= 0) state.picked.splice(i, 1);
      else if (state.picked.length < SIZE) state.picked.push(x.id);
      paint();
    });
    el.inst.appendChild(b);
  });

  const pct = (m) => ((Math.max(LO, Math.min(HI, m)) - LO) / (HI - LO)) * 100;

  function paint() {
    [...el.inst.children].forEach((b) =>
      b.setAttribute('aria-pressed', String(state.picked.includes(b.dataset.id))));
    const list = state.picked.map((id) => INSTRUMENTS.find((x) => x.id === id)).filter(Boolean);
    const axis = [28, 40, 52, 64, 76, 88, 100];
    el.chart.innerHTML = list.length
      ? list.map((x, i) => '<div class="range-row"><span>' + x.name + '</span>'
        + '<div class="range-track"><i class="range-bar' + (i % 2 ? ' alt' : '')
        + '" style="left:' + pct(x.lo) + '%;width:'
        + Math.max(1.5, pct(x.hi) - pct(x.lo)) + '%"></i></div></div>').join('')
        + '<div class="range-axis"><span></span><div class="ticks">' + axis.map((m) =>
          '<i style="left:' + pct(m) + '%">' + nameOfMidi(m) + '</i>').join('')
        + '</div></div>'
      : '<p class="hint" style="margin-top:0">还没选乐器。</p>';

    const covered = BANDS.filter((b) => list.some((x) => x.lo <= b.hi && x.hi >= b.lo));
    const empty = BANDS.filter((b) => !covered.includes(b));
    const roles = new Set();
    list.forEach((x) => x.role.split('／').forEach((r) => roles.add(r)));
    const families = new Set(list.map((x) => x.family));

    const clashes = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const ov = Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo);
        const small = Math.min(a.hi - a.lo, b.hi - b.lo);
        if (ov > small * 0.75 && a.role.split('／')[0] === b.role.split('／')[0]) {
          clashes.push(a.name + ' 与 ' + b.name);
        }
      }
    }

    el.readout.innerHTML = list.length
      ? '<div><dt>用了</dt><dd>' + list.length + ' 件</dd></div>'
        + '<div><dt>覆盖的音区</dt><dd>' + (covered.map((b) => b.label).join('、') || '无') + '</dd></div>'
        + '<div><dt>空着的音区</dt><dd class="' + (empty.length ? 'lo' : 'hi') + '">'
        + (empty.map((b) => b.label).join('、') || '没有空的') + '</dd></div>'
        + '<div><dt>功能</dt><dd>'
        + (['旋律', '和声', '低音', '节奏'].filter((r) => roles.has(r)).join('、') || '无') + '</dd></div>'
        + '<div><dt>家族</dt><dd>' + [...families].join('、') + '</dd></div>'
      : '';

    if (!list.length) { el.note.textContent = '先勾几件乐器。'; return; }
    const t = [];
    if (empty.length) {
      t.push('空着的是 ' + empty.map((b) => b.label).join('、') + ' —— '
        + (empty.some((b) => b.id === 'low')
          ? '缺低音是最常见的问题，整个东西会飘。'
          : '缺中声部会让音响空洞，高音和低音接不上。'));
    } else t.push('四个音区都有人，这是最基本的"盖满"。');
    if (!roles.has('低音')) t.push('没有一件乐器的主职是低音 —— 除非有人肯往下写，否则脚下是空的。');
    if (!roles.has('和声')) t.push('没有主职和声的乐器，中间会缺填充。');
    if (clashes.length) t.push('音区打架：' + clashes.join('；') + ' —— 两件乐器主要音域重叠、又干同一件事，写在一起会互相盖住。');
    if (families.size === 1) t.push('全是一个家族：最容易融合，但也最缺色彩对比 —— 弦乐四重奏走的就是这条路。');
    else if (families.size >= 3) t.push('混了 ' + families.size + ' 个家族：色彩丰富，但音准与融合都比同族编制难。木管五重奏硬塞一个圆号就是这个道理 —— 纯木管缺厚度，宁可牺牲融合也要补上。');
    el.note.textContent = t.join('');
  }

  paint();
}
