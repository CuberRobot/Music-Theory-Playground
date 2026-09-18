/**
 * 第 20 节 · 谱号与音域。
 *
 * 谱号解决的是"同一个位置到底代表哪个音"。位置本身没有意义，
 * 要先有谱号定基准。而音域解决的是"这条线适合谁来唱"——
 * 写曲子时最常犯的错，就是让一件乐器去够它够不到的音。
 */

import { midiToHz, nameOfMidi } from '../music/pitch.js';
import { playSequence } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';

const PAD = spectrumToAmps('organ', 10);
const LO = 28;    // 坐标轴最低（E1）
const HI = 96;    // 坐标轴最高（C7）

const CLEFS = [
  { name: '高音谱号 G', ref: 'G4', refMidi: 67, why: '把 G4 定在从下往上第二条线上。最常见的谱号，长笛、小提琴、吉他、女高音用。' },
  { name: '低音谱号 F', ref: 'F3', refMidi: 53, why: '把 F3 定在从下往上第四条线上。大提琴、低音提琴、长号、男低音用。' },
  { name: '中音谱号 C', ref: 'C4', refMidi: 60, why: '把中央 C 定在第三条线上。中提琴用，读起来音区刚好在中间。' },
  { name: '次中音谱号 C', ref: 'C4', refMidi: 60, why: '把中央 C 定在第四条线上。大提琴高音区、长号高音区用。' },
];

/** 常见乐器/声部的实际音域（MIDI），写曲子时先看这张表。 */
const RANGES = [
  { name: '长笛', lo: 60, hi: 96 },
  { name: '单簧管', lo: 50, hi: 94 },
  { name: '萨克斯（中音）', lo: 49, hi: 80, alt: true },
  { name: '小号', lo: 55, hi: 82 },
  { name: '圆号', lo: 41, hi: 77 },
  { name: '长号', lo: 40, hi: 72 },
  { name: '小提琴', lo: 55, hi: 96 },
  { name: '中提琴', lo: 48, hi: 88, alt: true },
  { name: '大提琴', lo: 36, hi: 76 },
  { name: '低音提琴', lo: 28, hi: 67, alt: true },
  { name: '女高音', lo: 60, hi: 84 },
  { name: '男低音', lo: 41, hi: 69, alt: true },
];

export function mountClefRangeLab(root) {
  root.innerHTML = `
    <div class="card-head">
      <h2>谱号与音域</h2>
      <p class="hint">位置本身没有意义，要先有谱号定基准</p>
    </div>
    <div class="tiles" data-clefs role="group" aria-label="谱号"></div>
    <p class="hint" data-clef-note></p>

    <h3 style="font-family:var(--font-sans);font-size:var(--fs-body);font-weight:500;
      margin:var(--sp-6) 0 var(--sp-3)">常见乐器与声部的实际音域</h3>
    <div data-chart></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>从上往下听一遍</button>
      <span class="tag" data-now>—</span>
    </div>
    <p class="hint" data-note>点任意一条音域条，从它的最低音听到最高音。</p>
  `;

  const el = {
    clefs: root.querySelector('[data-clefs]'),
    clefNote: root.querySelector('[data-clef-note]'),
    chart: root.querySelector('[data-chart]'),
    now: root.querySelector('[data-now]'),
    note: root.querySelector('[data-note]'),
  };

  CLEFS.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = c.name;
    b.addEventListener('click', () => {
      playSequence([midiToHz(c.refMidi)], { gap: 0.5, duration: 1.0, amps: PAD, level: 0.26 });
      el.clefNote.innerHTML = `<b>${c.name}</b> —— ${c.why}`;
      [...el.clefs.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    el.clefs.appendChild(b);
  });

  // 音域条：横向按 MIDI 值定位
  const pct = (m) => ((Math.max(LO, Math.min(HI, m)) - LO) / (HI - LO)) * 100;
  const axis = [36, 48, 60, 72, 84, 96];
  el.chart.innerHTML = RANGES.map((r) => `
    <div class="range-row" data-range="${r.name}" style="cursor:pointer">
      <span>${r.name}</span>
      <div class="range-track">
        <i class="range-bar${r.alt ? ' alt' : ''}"
           style="left:${pct(r.lo)}%;width:${Math.max(1.5, pct(r.hi) - pct(r.lo))}%"></i>
      </div>
    </div>`).join('') + `
    <div class="range-axis">
      <span></span>
      <div class="ticks">${axis.map((m) =>
        `<i style="left:${pct(m)}%">${nameOfMidi(m)}</i>`).join('')}</div>
    </div>`;

  el.chart.addEventListener('click', (e) => {
    const row = e.target.closest('[data-range]');
    if (!row) return;
    const r = RANGES.find((x) => x.name === row.dataset.range);
    if (!r) return;
    playSequence([r.lo, r.hi].map(midiToHz), { gap: 0.75, duration: 1.1, amps: PAD, level: 0.24 });
    el.now.textContent = r.name;
    el.note.innerHTML = `<b>${r.name}</b>：最低 ${nameOfMidi(r.lo)}，最高 ${nameOfMidi(r.hi)}，`
      + `跨 ${((r.hi - r.lo) / 12).toFixed(1)} 个八度。`;
  });

  root.querySelector('[data-play]').addEventListener('click', () => {
    // 从最低的低音提琴到最高的长笛，听一遍整个可用范围
    playSequence([28, 48, 60, 72, 84, 96].map(midiToHz), { gap: 0.55, duration: 0.7, amps: PAD, level: 0.24 });
  });

  el.clefNote.textContent = '四种种谱号的区别只有一个：它们把哪个音定在线上。点一个听它的基准音。';
}
