/**
 * 第 16 节 · 半音阶与变化音。
 *
 * 两件事：
 *   半音阶 —— 十二个音一个不落。上行用升号、下行用降号，这不是随意的规定，
 *   因为上行时那个音是"往上去"的，下行时是"往下走"的。
 *   变化音 —— 把调内某个音升高或降低半音，它会强烈地倾向于解决回原来的位置。
 */

import { midiToHz, spellMidi, nameOfMidi } from '../music/pitch.js';
import { playSequence, playChord } from '../audio/engine.js';
import { TEMPO } from '../audio/tempo.js';
import { createKeyboard } from './keyboard.js';
import { spectrumToAmps } from '../music/tuning.js';

const TONIC = 60;
const PAD = spectrumToAmps('organ', 10);
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const NAME = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** 常见的调式变音：把某个音级升降半音，以及它想解决的去处。 */
const ALTERED = [
  { label: '♯4', steps: [6], from: 4, to: 4, why: '第四级升高半音 → 请解决到第五级。利底亚的特征音，也是最常见的"往属走"的牵引。' },
  { label: '♭6', steps: [8], from: 9, to: 7, why: '第六级降低半音 → 请解决到第五级。小调色彩的主要来源之一。' },
  { label: '♭7', steps: [10], from: 11, to: 9, why: '第七级降低半音 → 请解决到第六级（往下一步）。它常出现在 V7 里，那个七音就是它。布鲁斯和摇滚的招牌。' },
  { label: '♭3', steps: [3], from: 4, to: 2, why: '第三级降低半音 → 大调瞬间变小调色彩。蓝调音之一。' },
  { label: '♭2', steps: [1], from: 2, to: 0, why: '第二级降低半音 → 请解决到主音，而且只有半音。弗里吉亚的招牌。' },
  { label: '♯5', steps: [8], from: 7, to: 9, why: '第五级升高半音 → 请解决到第六级。和声小调里那个增三和弦的来处。' },
];

export function mountChromaticLab(root) {
  root.innerHTML = `
    <div class="card-head">
      <h2>半音阶与变化音</h2>
      <p class="hint">十二个音一个不落，以及把调内音挪半音之后会怎样</p>
    </div>
    <p class="hint" style="margin-top:0">半音阶（点任意一格试听）</p>
    <div class="tiles" data-up role="group" aria-label="上行半音阶"></div>
    <div class="tiles" data-down role="group" aria-label="下行半音阶" style="margin-top:6px"></div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play-up>听上行</button>
      <button class="btn" type="button" data-play-down>听下行</button>
    </div>
    <p class="hint" data-note></p>

    <h3 style="font-family:var(--font-sans);font-size:var(--fs-body);font-weight:500;
      margin:var(--sp-6) 0 var(--sp-2)">变化音与其解决</h3>
    <div class="tiles" data-alt role="group" aria-label="变化音"></div>
    <div class="kb-scroll" data-kb style="margin-top:var(--sp-4)"></div>
    <p class="hint" data-alt-note></p>
  `;

  const el = {
    up: root.querySelector('[data-up]'),
    down: root.querySelector('[data-down]'),
    alt: root.querySelector('[data-alt]'),
    kb: root.querySelector('[data-kb]'),
    note: root.querySelector('[data-note]'),
    altNote: root.querySelector('[data-alt-note]'),
  };

  const kb = createKeyboard(el.kb, {
    from: 60, to: 84, ariaLabel: '变化音试听键盘',
    onDown: (m) => playSequence([midiToHz(m)], { gap: 0.5, duration: 0.8, amps: PAD, level: 0.26 }),
  });

  // 半音阶：上行用升号、下行用降号
  for (let i = 0; i < 12; i++) {
    const up = document.createElement('button');
    up.type = 'button'; up.className = 'tile';
    up.textContent = spellMidi(TONIC + i, false).name.replace(/\d/, '');
    up.addEventListener('click', () => playSequence([midiToHz(TONIC + i)], { gap: TEMPO.single, duration: 0.7, amps: PAD, level: 0.26 }));
    el.up.appendChild(up);

    const dn = document.createElement('button');
    dn.type = 'button'; dn.className = 'tile';
    dn.textContent = spellMidi(TONIC + 12 - i, true).name.replace(/\d/, '');
    dn.addEventListener('click', () => playSequence([midiToHz(TONIC + 12 - i)], { gap: TEMPO.single, duration: 0.7, amps: PAD, level: 0.26 }));
    el.down.appendChild(dn);
  }

  const upSeq = Array.from({ length: 13 }, (_, i) => TONIC + i);
  const downSeq = Array.from({ length: 13 }, (_, i) => TONIC + 12 - i);
  root.querySelector('[data-play-up]').addEventListener('click', () => {
    playSequence(upSeq.map(midiToHz), { gap: TEMPO.run, duration: 0.4, amps: PAD, level: 0.24 });
    el.note.innerHTML = '<b>上行：</b>读作 C C♯ D D♯ E F F♯ G G♯ A A♯ B C。'
      + '中间的五个音都写成"升"，因为它们是在往上走 —— 记谱跟着走向走。';
  });
  root.querySelector('[data-play-down]').addEventListener('click', () => {
    playSequence(downSeq.map(midiToHz), { gap: TEMPO.run, duration: 0.4, amps: PAD, level: 0.24 });
    el.note.innerHTML = '<b>下行：</b>读作 C B B♭ A A♭ G G♭ F E E♭ D D♭ C。'
      + '同一批键，名字全换了 —— 因为现在是往下走。'
      + '<b>半音阶的写法由方向决定</b>，这是它和音阶最不一样的地方。';
  });

  ALTERED.forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = a.label;
    b.addEventListener('click', () => {
      const altered = TONIC + a.steps[0];
      const target = TONIC + a.to;
      playSequence([midiToHz(altered), midiToHz(target)],
        { gap: 0.55, duration: 0.7, amps: PAD, level: 0.24 });
      kb.setHighlight([{ midi: altered, tone: 'clay' }, { midi: target, tone: 'green' }]);
      el.altNote.innerHTML = `<b>${a.label}</b>：${a.why}`;
    });
    el.alt.appendChild(b);
  });

  kb.setHighlight([{ midi: TONIC, tone: 'amber' }]);
  el.note.innerHTML = '半音阶把十二个音一个不落地走一遍。它的写法<b>跟着方向走</b>：'
    + '上行用升号，下行用降号。';
  el.altNote.textContent = '点上面任意一个变化音，会听到它本身、再听到它想去的那个音。'
    + '变化音的力量全在这个"想去"上 —— 它不属于本调，所以急着回去。';
}
