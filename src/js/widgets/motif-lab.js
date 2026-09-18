/**
 * 第 23 节 · 动机与乐句。
 *
 * 动机（motif）是细胞，3–5 个音，本身不是完整乐思；
 * 主题（theme）才是完整的旋律句子。古典发展用的是动机，
 * 所以"发展"的本质是：用有限的几种变形，把一个小念头撑成一大段音乐。
 *
 * 例子用贝多芬第五开头那四个音 —— 三个同音加一个下行小三度。
 */

import { midiToHz, spellMidi } from '../music/pitch.js';
import { playPluck, preloadPluck } from '../audio/engine.js';
import { createNoteStrip } from '../audio/transport.js';

const BASE = 67;              // G4，那个动机的起点
const SEC = 0.42;             // 一个"短音"多少秒

const MOTIF = [
  { semi: 0, beats: 1 },
  { semi: 0, beats: 1 },
  { semi: 0, beats: 1 },
  { semi: -3, beats: 4 },
];
const REST = { rest: true, beats: 1.5 };
const mapSounding = (m, f) => m.map((n) => (n.rest ? n : f(n)));

const OPS = [
  { id: 'orig', label: '原形', fn: (m) => m,
    tip: '动机是细胞：3–5 个音，有清楚的轮廓，但它本身不是一个完整的乐思。' },
  { id: 'repeat', label: '重复', fn: (m) => [...m, REST, ...m],
    tip: '最省事的做法，本身几乎不算发展。但它是其他一切变形的前提 —— 没有重复，听者根本认不出你改了哪里。' },
  { id: 'seq', label: '模进', fn: (m) => mapSounding(m, (n) => ({ ...n, semi: n.semi - 2 })),
    tip: '整体往下移一个音级再说一遍。不换材料，只换高度 —— 最常见的推进手段。' },
  { id: 'inv', label: '倒影', fn: (m) => mapSounding(m, (n) => ({ ...n, semi: -n.semi })),
    tip: '把每个音程的方向翻过来。旋律照了镜子：音程大小没变，上下方向全反过来。' },
  { id: 'aug', label: '扩大', fn: (m) => mapSounding(m, (n) => ({ ...n, beats: n.beats * 2 })),
    tip: '时值全部加倍。同一个动机立刻变得庄重、变慢 —— 贝多芬第五的结尾就是这么做的。' },
  { id: 'dim', label: '缩小', fn: (m) => mapSounding(m, (n) => ({ ...n, beats: n.beats / 2 })),
    tip: '时值全部减半。同一个动机变得急促，常用于推向高潮。' },
  { id: 'retro', label: '逆行', fn: (m) => [...m].reverse(),
    tip: '把音的顺序倒过来。这是几种变形里最容易被听出来的一个。' },
  { id: 'combo', label: '模进 + 扩大',
    fn: (m) => mapSounding(m, (n) => ({ ...n, semi: n.semi + 2, beats: n.beats * 2 })),
    tip: '变形可以叠加。真实作品里几乎都是叠加着用的 —— 单独一种变形撑不起一段音乐。' },
];

const INTERVAL = {
  0: '同音', 1: '小二度', 2: '大二度', 3: '小三度', 4: '大三度',
  5: '纯四度', 6: '增四度', 7: '纯五度', 8: '小六度', 9: '大六度',
  10: '小七度', 11: '大七度', 12: '八度',
};

export function mountMotifLab(root) {
  const state = { op: 'orig', notes: MOTIF };

  root.innerHTML = `
    <div class="card-head">
      <h2>动机变形台</h2>
      <p class="hint">同一个念头，换一种变形再听一遍</p>
    </div>
    <p class="hint" style="margin-top:0">起点是贝多芬第五开头那四个音：三短一长，最后下行小三度</p>
    <div class="tiles" data-ops role="group" aria-label="变形方式"></div>
    <div data-strip style="margin-top:var(--sp-5)"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>再听一遍</button>
      <span class="tag" data-now>—</span>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-tip></p>
  `;

  const el = {
    ops: root.querySelector('[data-ops]'),
    stripHost: root.querySelector('[data-strip]'),
    now: root.querySelector('[data-now]'),
    readout: root.querySelector('[data-readout]'),
    tip: root.querySelector('[data-tip]'),
  };

  OPS.forEach((op) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = op.label;
    b.dataset.op = op.id;
    b.addEventListener('click', () => { state.op = op.id; apply(true); });
    el.ops.appendChild(b);
  });

  const strip = createNoteStrip(el.stripHost, { ariaLabel: '变形后的旋律与播放进度' });

  root.querySelector('[data-play]').addEventListener('click', () => play(state.notes));

  function apply(alsoPlay) {
    const op = OPS.find((x) => x.id === state.op);
    state.notes = op.fn(MOTIF);
    [...el.ops.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.op === state.op)));
    paint(op);
    if (alsoPlay) play(state.notes);
  }

  function play(notes) {
    preloadPluck();
    // 交给音符条统一排期：它负责发声，也负责把游标走过去
    strip.load(timeline(notes));
    strip.play((midi, at, dur) => playPluck(midiToHz(midi), {
      at, duration: Math.max(0.18, dur), level: 0.26,
      brightness: 0.7, damping: 0.4,
    }));
  }

  /** 把动机展开成音符条要的时间轴：每个音算好起点、时长、音名。 */
  function timeline(notes) {
    const out = [];
    let t = 0;
    notes.forEach((n) => {
      const d = n.beats * SEC;
      if (!n.rest) {
        out.push({
          midi: BASE + n.semi,
          start: t,
          dur: d * 0.88,
          label: spellMidi(BASE + n.semi, true).name,
        });
      }
      t += d;
    });
    return out;
  }

  function intervals(notes) {
    const s = notes.filter((n) => !n.rest);
    const out = [];
    for (let i = 1; i < s.length; i++) {
      const d = s[i].semi - s[i - 1].semi;
      const name = INTERVAL[Math.abs(d)] ?? `${Math.abs(d)} 半音`;
      out.push(d === 0 ? '同音' : `${d > 0 ? '上行' : '下行'}${name}`);
    }
    return out;
  }

  function paint(op) {
    const sounding = state.notes.filter((n) => !n.rest);
    const total = state.notes.reduce((a, n) => a + n.beats, 0);
    strip.load(timeline(state.notes));

    el.now.textContent = op.label;
    el.readout.innerHTML = `
      <div><dt>变形</dt><dd>${op.label}</dd></div>
      <div><dt>音数</dt><dd>${sounding.length} 个音</dd></div>
      <div><dt>起音</dt><dd>${spellMidi(BASE + (sounding[0]?.semi ?? 0), true).name}</dd></div>
      <div><dt>音程序列</dt><dd style="text-align:right;max-width:62%">${intervals(state.notes).join(' → ')}</dd></div>
      <div><dt>总时长</dt><dd>${total} 拍</dd></div>
    `;
    el.tip.textContent = op.tip;
  }

  // 先不出声：页面加载时不该有声音
  apply(false);
}
