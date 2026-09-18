/**
 * 第 18 节 · 五声与七声调式。
 *
 * 民族调式这套东西的骨架是：**同一批音，谁当主音就是谁的调式**。
 * 宫商角徵羽是五个音级名，不是五个音阶 —— 拿 C 那一组五声音来说，
 * 以 C 为主音叫宫调式，以 D 为主音就叫商调式，音一个没变。
 * 这和教会调式是同一件事的两种语言。
 */

import { midiToHz, nameOfMidi, spellMidi } from '../music/pitch.js';
import { playSequence, playChord } from '../audio/engine.js';
import { SCALE_ARGS } from '../audio/tempo.js';
import { createKeyboard } from './keyboard.js';
import { spectrumToAmps } from '../music/tuning.js';

const GONG = 60;                       // 宫音
const PENTA = [0, 2, 4, 7, 9];         // 宫 商 角 徵 羽
const DEGREE_CN = ['宫', '商', '角', '徵', '羽'];
const PAD = spectrumToAmps('organ', 10);

/** 七声的三种：在五声之上加两个"偏音"。 */
/** flats 同理：雅乐里的变徵是升四度，必须写 F♯，写成 G♭ 会和徵音撞名。 */
const SEVEN = [
  { label: '清乐', add: [5, 11], flats: true,  names: ['清角', '变宫'], why: '加清角与变宫 = 就是自然大调音阶。最常用的一种。' },
  { label: '雅乐', add: [6, 11], flats: false, names: ['变徵', '变宫'], why: '把清角再升高半音成变徵，多了大七度的亮度，古乐里常见。' },
  { label: '燕乐', add: [5, 10], flats: true,  names: ['清角', '闰'],   why: '把变宫降低半音成闰，得到降七度 —— 和 Mixolydian 是同一个东西。' },
];

export function mountChineseModesLab(root) {
  const state = { index: 0, seven: null };

  root.innerHTML = `
    <div class="card-head">
      <h2>宫商角徵羽</h2>
      <p class="hint">同一批音，谁当主音就是谁的调式</p>
    </div>
    <p class="hint" style="margin-top:0">五声：以哪个音为主音（主音高亮）</p>
    <div class="tiles" data-modes role="group" aria-label="五声调式"></div>
    <div class="kb-scroll" data-kb style="margin-top:var(--sp-4)"></div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>听这条调式</button>
      <span class="tag" data-now></span>
    </div>

    <h3 style="font-family:var(--font-sans);font-size:var(--fs-body);font-weight:500;
      margin:var(--sp-6) 0 var(--sp-2)">七声：在五声上加两个偏音</h3>
    <div class="tiles" data-seven role="group" aria-label="七声调式"></div>
    <p class="hint" data-seven-note></p>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
  `;

  const el = {
    modes: root.querySelector('[data-modes]'),
    seven: root.querySelector('[data-seven]'),
    kb: root.querySelector('[data-kb]'),
    now: root.querySelector('[data-now]'),
    sevenNote: root.querySelector('[data-seven-note]'),
    readout: root.querySelector('[data-readout]'),
  };

  const kb = createKeyboard(el.kb, {
    from: 60, to: 84, ariaLabel: '五声调式键盘',
    onDown: (m) => playSequence([midiToHz(m)], { gap: 0.4, duration: 0.7, amps: PAD, level: 0.26 }),
  });

  DEGREE_CN.forEach((cn, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile';
    b.textContent = `${cn}调式`;
    b.dataset.i = String(i);
    b.addEventListener('click', () => { state.index = i; paint(); play(); });
    el.modes.appendChild(b);
  });

  SEVEN.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = s.label;
    b.dataset.label = s.label;
    b.addEventListener('click', () => {
      state.seven = state.seven === s.label ? null : s.label;
      el.sevenNote.textContent = state.seven ? s.why : '点一个听七声的样子。';
      paint();
    });
    el.seven.appendChild(b);
  });

  root.querySelector('[data-play]').addEventListener('click', play);

  /** 这条调式的音：从主音开始，沿着五声骨架往上走一个八度。 */
  function modeMidis() {
    const out = [];
    for (let k = 0; k < 6; k++) {
      out.push(GONG + PENTA[(state.index + k) % 5] + Math.floor((state.index + k) / 5) * 12);
    }
    return out;
  }

  function play() {
    if (state.seven) {
      const s = SEVEN.find((x) => x.label === state.seven);
      const root0 = modeMidis()[0];
      // 七声：以这条调式的主音为起点，用清乐/雅乐/燕乐的偏音
      const base = ((root0 - GONG) % 12 + 12) % 12;
      const seven = PENTA.map((p) => (p - base + 12) % 12).sort((a, b) => a - b).concat(s.add);
      const uniq = [...new Set(seven)].sort((a, b) => a - b);
      const seq = uniq.map((v) => GONG + base + v).concat([GONG + base + 12]);
      playSequence(seq.map(midiToHz), { ...SCALE_ARGS, amps: PAD });
      return;
    }
    playSequence(modeMidis().map(midiToHz), { ...SCALE_ARGS, amps: PAD });
  }

  function paint() {
    const seq = modeMidis();
    const root = seq[0];
    const notes = [...new Set(seq.slice(0, 5).map((m) => ((m % 12) + 12) % 12))];

    kb.setHighlight(seq.map((m, i) => ({ midi: m, tone: i === 0 ? 'amber' : 'green' })));

    [...el.modes.children].forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === state.index)));
    [...el.seven.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.label === state.seven)));

    const cn = DEGREE_CN[state.index];
    el.now.textContent = `${cn}调式（主音 ${nameOfMidi(root)}）`;
    el.readout.innerHTML = `
      <div><dt>调式</dt><dd>${cn}调式</dd></div>
      <div><dt>主音</dt><dd>${nameOfMidi(root)}</dd></div>
      <div><dt>音级</dt><dd>${DEGREE_CN.map((x, i) => `${x}${i === state.index ? '（主）' : ''}`).join(' ')}</dd></div>
      <div><dt>用到的音</dt><dd>${notes.map((pc) => spellMidi(pc, !state.seven || SEVEN.find((x) => x.label === state.seven).flats).name.replace(/-?\d+$/, '')).join(' ')}</dd></div>
      <div><dt>关键点</dt><dd style="text-align:right;max-width:62%">
        五种调式用的是<b>完全相同的五个音</b>，只有主音不同。
        这和第 10 节讲的教会调式是同一件事的两种语言。</dd></div>
    `;
  }

  paint();
}
