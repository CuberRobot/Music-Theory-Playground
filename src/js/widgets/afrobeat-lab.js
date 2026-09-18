/**
 * 第四部分 · Afrobeat 节奏台。
 *
 * 这一段的重点不是"非洲风格流行歌"，而是：**鼓不是一条节拍线，是几条互相咬合的线。**
 * 所以这里把一条 4/4 的 Afrobeat 味节奏拆成六层，可以逐层开关：
 * 底鼓、军鼓、踩镲、铃、贝斯、铜管。
 *
 * 节奏型是本站按 Afrobeat 的常见做法写的**示范**，不是某一首曲子的原样摘录 ——
 * 这一段的学习目标是"听出咬合"，不是"背下某个鼓点"。
 * 速度取 ♩=104，这是 Afrobeat 常见的区间（Fela 的录音多在 100–115 之间）。
 */

import { midiToHz } from '../music/pitch.js';
import { playNote, click, hat, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';

const BPM = 104;
const STEP = (60 / BPM) / 4;          // 一个十六分音符多少秒
const BARS = 4;                        // 循环四小节，够听出"咬合"
const STEPS = 16;                      // 每小节十六格

/** 每一层：16 格里的哪几格发声。 */
const LAYERS = [
  { id: 'bell',  label: '铃',    note: '牛铃／铃',   steps: [0, 3, 6, 10, 13],
    why: '铃是这套节奏的"骨架线"：它不打在小节的强拍上，而是绕开它们。少了它，整段会散。' },
  { id: 'kick',  label: '底鼓',  note: '脚鼓',       steps: [0, 3, 7, 10, 12],
    why: '底鼓故意错开军鼓的位置 —— 两条线互相顶，才有"往前赶"的感觉。' },
  { id: 'snare', label: '军鼓',  note: '小鼓',       steps: [4, 14],
    why: '军鼓不在正拍上待着（第 2 拍一个、第 15 格一个），这是它和摇滚的区别。' },
  { id: 'hat',   label: '踩镲',  note: '踩镲',       steps: [0, 2, 4, 6, 8, 10, 12, 14],
    why: '踩镲是唯一规规矩矩八分音符走的一条 —— 它负责让别的线听起来"歪得有理"。' },
];

/** 贝斯：一个反复的动机。Afrobeat 的贝斯往往整段不变，变化交给上面。 */
const BASS = [
  { step: 0, midi: 45, len: 3 }, { step: 3, midi: 45, len: 2 },
  { step: 6, midi: 48, len: 2 }, { step: 8, midi: 45, len: 2 },
  { step: 11, midi: 50, len: 2 }, { step: 13, midi: 48, len: 2 },
];

/** 铜管：短促的和音切分，学的是 Afrobeat 那套"喇叭打点"。 */
const HORNS = [2, 7, 10, 15].map((step) => ({ step, midis: [57, 60, 64], len: 1 }));

export function mountAfrobeatLab(root) {
  const state = {
    on: { bell: true, kick: true, snare: true, hat: true, bass: true, horns: true },
    playing: false, timer: null,
  };

  root.innerHTML = `
    <div class="card-head">
      <h2>Afrobeat 节奏台</h2>
      <p class="hint">六条线互相咬合，逐层加减听差在哪</p>
    </div>
    <p class="hint" style="margin-top:0">
      一小节十六格，循环四小节，速度 <b>♩=${BPM}</b>（Afrobeat 常见的区间）。
      节奏型是本站按这套做法写的示范，不是某一首曲子的原样。
    </p>
    <div data-grid class="afro-grid" aria-label="十六格节奏图"></div>
    <div class="tiles" data-layers style="margin-top:var(--sp-4)" role="group" aria-label="声部"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放</button>
      <button class="btn" type="button" data-stop>停</button>
      <span class="tag" data-now>—</span>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-note></p>
  `;

  const el = {
    grid: root.querySelector('[data-grid]'),
    layers: root.querySelector('[data-layers]'),
    readout: root.querySelector('[data-readout]'),
    note: root.querySelector('[data-note]'),
    now: root.querySelector('[data-now]'),
  };

  LAYERS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.dataset.id = l.id;
    b.textContent = l.label;
    b.addEventListener('click', () => { state.on[l.id] = !state.on[l.id]; paint(); });
    el.layers.appendChild(b);
  });
  ['bass', 'horns'].forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.dataset.id = id;
    b.textContent = id === 'bass' ? '贝斯' : '铜管';
    b.addEventListener('click', () => { state.on[id] = !state.on[id]; paint(); });
    el.layers.appendChild(b);
  });

  function drawGrid() {
    const rows = [...LAYERS, { id: 'bass', label: '贝斯' }, { id: 'horns', label: '铜管' }];
    el.grid.innerHTML = rows.map((r) => {
      const cells = [];
      for (let i = 0; i < STEPS; i++) {
        const on = r.id === 'bass' ? BASS.some((n) => n.step === i)
          : r.id === 'horns' ? HORNS.some((n) => n.step === i)
            : r.steps.includes(i);
        cells.push(`<i class="${on ? 'on' : ''}${i % 4 === 0 ? ' beat' : ''}"></i>`);
      }
      return `<div class="afro-row"><span class="afro-name">${r.label}</span>
        <span class="afro-cells">${cells.join('')}</span></div>`;
    }).join('');
  }

  function stop() {
    state.playing = false;
    clearTimeout(state.timer);
    state.timer = null;
    stopAll();
    el.now.textContent = '—';
  }

  /** 把四小节排期出去；offset 是"从这一刻起再等多久开始"。 */
  function schedule(offset) {
    const saw = spectrumToAmps('saw', 10);
    const brass = spectrumToAmps('trumpet', 12);
    const totalSteps = BARS * STEPS;
    for (let s = 0; s < totalSteps; s++) {
      const at = offset + s * STEP;
      const i = s % STEPS;
      if (state.on.hat && LAYERS[3].steps.includes(i)) hat(at, 0.05);
      if (state.on.bell && LAYERS[0].steps.includes(i)) click(at, { level: 0.12, freq: 1568 });
      if (state.on.snare && LAYERS[2].steps.includes(i)) click(at, { level: 0.16, freq: 330 });
      if (state.on.kick && LAYERS[1].steps.includes(i)) click(at, { level: 0.22, accented: true, freq: 98 });
      if (state.on.bass) {
        const n = BASS.find((x) => x.step === i);
        if (n) playNote(midiToHz(n.midi), { at, duration: n.len * STEP * 0.9, amps: saw, level: 0.24, decay: 0.5 });
      }
      if (state.on.horns) {
        const h = HORNS.find((x) => x.step === i);
        if (h) h.midis.forEach((m) => playNote(midiToHz(m), {
          at, duration: h.len * STEP * 0.7, amps: brass, level: 0.07, decay: 0.4,
        }));
      }
    }
    return totalSteps * STEP;
  }

  function play() {
    stop();
    const period = schedule(0);
    state.playing = true;
    el.now.textContent = '循环中';
    // 循环：提前一点点排下一遍，接缝处不留缝（不要 stopAll，那会把结尾的音切掉）
    const loop = () => {
      if (!state.playing) return;
      const next = schedule(0.15);
      state.timer = setTimeout(loop, next * 1000);
    };
    state.timer = setTimeout(loop, period * 1000 - 150);
  }

  function paint() {
    [...el.layers.children].forEach((b) => b.setAttribute('aria-pressed', String(state.on[b.dataset.id])));
    drawGrid();
    const on = ['bell', 'kick', 'snare', 'hat', 'bass', 'horns'].filter((id) => state.on[id]);
    const NAME = { bell: '铃', kick: '底鼓', snare: '军鼓', hat: '踩镲', bass: '贝斯', horns: '铜管' };
    el.readout.innerHTML = `
      <div><dt>在响</dt><dd>${on.length ? on.map((id) => NAME[id]).join('、') : '什么都没有'}</dd></div>
      <div><dt>几层</dt><dd>${on.length} / 6</dd></div>
      <div><dt>速度</dt><dd>♩=${BPM}</dd></div>
      <div><dt>和声</dt><dd>一个小调动机反复，不转调</dd></div>
    `;
    const tips = [];
    if (!state.on.bell) tips.push('没有铃：四条鼓线各自都对，但缺了把它们串起来的那一条。');
    if (!state.on.bass) tips.push('没有贝斯：鼓在响，可是没有"重量"，也听不出长度是怎么撑起来的。');
    if (!state.on.horns) tips.push('没有铜管：这是 Afrobeat 的标志之一 —— 短促的切分和音。');
    if (on.length === 6) tips.push('六层都开。注意"满"不等于"乱"：它们各自的位置是错开的，撞在一起才成立。');
    if (on.length <= 2) tips.push('只剩两条线的时候，你会听出每一条单独的走向 —— 这是拆层的目的。');
    tips.push('底鼓、军鼓、铃、贝斯都刻意避开彼此的落点，只有踩镲老老实实走八分音符。');
    el.note.textContent = tips.join('');
  }

  root.querySelector('[data-play]').addEventListener('click', play);
  root.querySelector('[data-stop]').addEventListener('click', stop);
  paint();
  return { stop };
}
