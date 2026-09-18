/**
 * 第 15 节 · 借用与副属和弦。
 *
 * 两种"从外面拿东西来用"，借的不是同一样东西：
 *   借用和弦（modal mixture）借的是**颜色** —— 从同主音的另一个调式拿一个和弦过来；
 *   副属和弦（secondary dominant）借的是**方向** —— 给某个和弦临时装一个它专属的 V7。
 */

import { midiToHz, spellMidi } from '../music/pitch.js';
import { playChord, playSequence } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';

const TONIC = 60;
const PAD = spectrumToAmps('organ', 10);

/** 相对主音的半音偏移。borrowed 记来源调式，secondary 记它推向谁。 */
/**
 * flats 决定拼写方向。多数借用和弦来自降号一侧的调式，用降号；
 * 但从 Lydian 借来的 II 里那个音是升四度，必须写成 F♯ 而不是 G♭ ——
 * 否则和弦音读起来会变成 D-G♭-A，看起来像含了降五度，完全走了样。
 */
const BORROWED = [
  { name: '♭VII', steps: [10, 14, 17], from: 'Mixolydian', flats: true,  why: '大调第七级降半音，摇滚里最常见的一个外来和弦' },
  { name: 'iv',   steps: [5, 8, 12],  from: 'Aeolian',   flats: true,  why: '把大调的四级小三化，瞬间变暗 —— 流行歌里的"叹气"就是它' },
  { name: '♭VI',  steps: [8, 12, 15], from: 'Aeolian',   flats: true,  why: '和 iv 是一对，常连在一起用' },
  { name: '♭III', steps: [3, 7, 10],  from: 'Aeolian',   flats: true,  why: '关系大调的主和弦，接手很自然' },
  { name: '♭II',  steps: [1, 5, 8],   from: 'Phrygian',  flats: true,  why: '离主音只有半音，最刺的一个，弗里吉亚的招牌' },
  { name: 'II',   steps: [2, 6, 9],   from: 'Lydian',    flats: false, why: '大调第二级是大三，因为第四级升高了半音' },
];

const SECONDARY = [
  { name: 'V/V',  steps: [2, 6, 9, 12],   to: 'G',  toStep: 7,  why: 'D7 → G，最常见的一个' },
  { name: 'V/ii', steps: [9, 13, 16, 19], to: 'Dm', toStep: 2,  why: 'A7 → Dm' },
  { name: 'V/vi', steps: [4, 8, 11, 14],  to: 'Am', toStep: 9,  why: 'E7 → Am' },
  { name: 'V/IV', steps: [0, 4, 7, 10],   to: 'F',  toStep: 5,  why: 'C7 → F —— 注意它正好是本调的主和弦加上小七度，等于主和弦"临时变属"' },
];

export function mountBorrowedLab(root) {
  root.innerHTML = `
    <div class="card-head">
      <h2>从外面拿东西来用</h2>
      <p class="hint">主调固定是 C 大调。点任意一个和弦听它怎么改变颜色或方向</p>
    </div>
    <p class="hint" style="margin-top:0"><b>借用和弦</b> —— 从同主音的另一个调式拿一个和弦过来，借的是颜色</p>
    <div class="tiles" data-borrowed role="group" aria-label="借用和弦"></div>
    <p class="hint" style="margin-top:var(--sp-5)"><b>副属和弦</b> —— 给某个和弦临时装一个它专属的 V7，借的是方向</p>
    <div class="tiles" data-secondary role="group" aria-label="副属和弦"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-compare>听对比：I → ♭VII → I</button>
      <span class="tag" data-now>—</span>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
  `;

  const el = {
    borrowed: root.querySelector('[data-borrowed]'),
    secondary: root.querySelector('[data-secondary]'),
    readout: root.querySelector('[data-readout]'),
    now: root.querySelector('[data-now]'),
  };

  const hz = (steps) => steps.map((s) => midiToHz(TONIC + s));

  function makeTile(host, item, kind) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = item.name;
    b.addEventListener('click', () => {
      playChord(hz(item.steps), { duration: 1.5, amps: PAD, level: 0.17 });
      el.now.textContent = item.name;
      el.readout.innerHTML = kind === 'borrowed'
        ? `<div><dt>和弦</dt><dd>${item.name}</dd></div>
           <div><dt>构成音</dt><dd>${item.steps.map((s) => spellMidi(TONIC + s, item.flats).name.replace(/-?\d+$/, '')).join(' - ')}</dd></div>
           <div><dt>来自</dt><dd>${item.from}</dd></div>
           <div><dt>为什么</dt><dd style="text-align:right;max-width:60%">${item.why}</dd></div>`
        : `<div><dt>和弦</dt><dd>${item.name}</dd></div>
           <div><dt>推向</dt><dd>${item.to}</dd></div>
           <div><dt>为什么</dt><dd style="text-align:right;max-width:60%">${item.why}</dd></div>`;
    });
    host.appendChild(b);
  }

  BORROWED.forEach((x) => makeTile(el.borrowed, x, 'borrowed'));
  SECONDARY.forEach((x) => makeTile(el.secondary, x, 'secondary'));

  // 副属和弦的"解决"：先听它，再听它推向的那个和弦
  el.secondary.addEventListener('click', (e) => {
    const b = e.target.closest('.tile');
    if (!b) return;
    const item = SECONDARY[[...el.secondary.children].indexOf(b)];
    if (!item) return;
    playChord([0, 4, 7].map((s) => midiToHz(TONIC + item.toStep + s)),
      { at: 1.5, duration: 1.5, amps: PAD, level: 0.17 });
  });

  root.querySelector('[data-compare]').addEventListener('click', () => {
    // I → ♭VII → I：同一条进行，中间那个和弦来自 Mixolydian
    const I = [0, 4, 7].map((s) => midiToHz(TONIC + s));
    const bVII = [10, 14, 17].map((s) => midiToHz(TONIC + s));
    playSequence([...I, null, ...bVII, null, ...I].filter(Boolean),
      { gap: 0.8, duration: 0.7, amps: PAD, level: 0.15 });
    el.now.textContent = 'I → ♭VII → I';
    el.readout.innerHTML = `<div><dt>听什么</dt>
      <dd style="text-align:right;max-width:62%">同一个主和弦，中间插一个降七级。
      它不属于 C 大调，但听起来完全不突兀 —— 因为它属于同主音的 Mixolydian。</dd></div>`;
  });

  el.readout.innerHTML = `<div><dt>提示</dt>
    <dd style="text-align:right;max-width:62%">点任意一个和弦。副属和弦会自动接上它推向的那个和弦，
    听那个"解决"的瞬间。</dd></div>`;
}
