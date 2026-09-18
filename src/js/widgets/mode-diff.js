/**
 * 第 14 节 · 调式中的音程与和弦。
 *
 * 核心那句话：级数是形状，字母是位置。
 * 从音阶的第 N 个音「隔一个取一个」，出来的就是那一级的和弦；
 * 它是大是小，由脚下的半音位置决定，不由人挑。
 * 所以七个级数的性质序列就是那个调式的指纹 —— 两个调式一对比，差在哪一目了然。
 */

import { midiToHz, nameOfMidi, spellMidi, pitchClassOfMidi } from '../music/pitch.js';
import { SCALES, SHARP_ORDER, FLAT_ORDER } from '../music/scales.js';
import { diatonicSet } from '../music/chords.js';
import { playChord, playSequence } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';

const PAD = spectrumToAmps('organ', 10);
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MAJOR_QUALITIES = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
/** 大调音阶各音级相对主音的半音数，用来算级数记号里要不要加升降号。 */
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const QUALITY_CN = {
  major: '大三', minor: '小三', diminished: '减三', augmented: '增三',
};
/** 各调式的性格标签，用来解释"这一级为什么是它的招牌"。 */
const SIGNATURE = {
  major: null,
  natMinor: { degree: 2, why: '♭III 是大三和弦 —— 小调之所以"暗"，源头就是第 3 级降了半音。' },
  dorian: { degree: 3, why: 'IV 是大三和弦 —— 这是 Dorian 最容易被认出来的地方，自然小调同一位置是小三。' },
  phrygian: { degree: 1, why: '♭II 是大三和弦 —— 那就是那个"阿拉伯"和弦，弗里吉亚的味道全在这儿。' },
  lydian: { degree: 1, why: 'II 是大三和弦 —— 大调同一位置是小三，这一个和弦就让整条音阶悬起来。' },
  mixolydian: { degree: 6, why: '♭VII 是大三和弦 —— 布鲁斯和摇滚里那个"降七级"的来处。' },
  aeolian: { degree: 2, why: '♭III 是大三和弦，和自然小调一样。' },
  locrian: { degree: 0, why: '主和弦本身就是减三和弦 —— 所以它几乎无法当"家"，最不稳定。' },
  harmMinor: { degree: 2, why: 'III 是增三和弦 —— 第七级升高造出导音，顺带把三级和弦撑大了。' },
};

const ROOTS = [
  { pc: 0, name: 'C' }, { pc: 1, name: 'D♭' }, { pc: 2, name: 'D' }, { pc: 3, name: 'E♭' },
  { pc: 4, name: 'E' }, { pc: 5, name: 'F' }, { pc: 6, name: 'G♭' }, { pc: 7, name: 'G' },
  { pc: 8, name: 'A♭' }, { pc: 9, name: 'A' }, { pc: 10, name: 'B♭' }, { pc: 11, name: 'B' },
];

const MODES = ['major', 'natMinor', 'harmMinor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'];

export function mountModeDiff(root) {
  const state = { rootPc: 0, key: 'dorian', sel: null };

  root.innerHTML = `
    <div class="card-head">
      <h2>调式差分表</h2>
      <p class="hint">同一个级数，在不同调式里性质不一样 —— 那几处不一样就是它的指纹</p>
    </div>
    <div class="tiles" data-roots role="group" aria-label="主音"></div>
    <div class="tiles" data-modes role="group" aria-label="调式" style="margin-top:6px"></div>
    <div class="scroll-x" style="margin-top:var(--sp-5)">
      <table class="table" data-table>
        <caption class="sr-only">七个级数的性质，以及它和大调的差别</caption>
        <thead>
          <tr>
            <th scope="col">级数</th><th scope="col">和弦</th><th scope="col">性质</th>
            <th scope="col">大调同一级是</th><th scope="col">差在哪</th>
          </tr>
        </thead>
        <tbody data-body></tbody>
      </table>
    </div>
    <p class="hint" data-sig></p>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play-scale>听这条音阶</button>
      <button class="btn" type="button" data-play-vamp>听主和弦与它的招牌和弦</button>
    </div>
  `;

  const el = {
    roots: root.querySelector('[data-roots]'),
    modes: root.querySelector('[data-modes]'),
    body: root.querySelector('[data-body]'),
    sig: root.querySelector('[data-sig]'),
  };

  ROOTS.forEach((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = r.name;
    b.dataset.pc = String(r.pc);
    b.addEventListener('click', () => { state.rootPc = r.pc; paint(); });
    el.roots.appendChild(b);
  });

  MODES.forEach((k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = SCALES[k].label;
    b.dataset.key = k;
    b.addEventListener('click', () => { state.key = k; paint(); });
    el.modes.appendChild(b);
  });

  el.body.addEventListener('click', (e) => {
    const row = e.target.closest('[data-degree]');
    if (!row) return;
    state.sel = Number(row.dataset.degree);
    playChord(currentSet()[state.sel].midis.map(midiToHz), { duration: 1.5, amps: PAD, level: 0.18 });
    paint();
  });

  root.querySelector('[data-play-scale]').addEventListener('click', () => {
    playSequence(scaleMidis().map(midiToHz), { gap: 0.28, duration: 0.5, amps: PAD, level: 0.24 });
  });

  root.querySelector('[data-play-vamp]').addEventListener('click', () => {
    const set = currentSet();
    const sig = SIGNATURE[state.key];
    const seq = sig && sig.degree !== 0 ? [set[0].midis, set[sig.degree].midis] : [set[0].midis];
    playSequence([].concat(...seq.map((c) => c.map(midiToHz).concat([null]))).filter(Boolean),
      { gap: 0.8, duration: 0.75, amps: PAD, level: 0.16 });
  });

  function rootMidi() {
    // 主音放在中央 C 附近，听起来舒服
    let m = 60 + state.rootPc;
    while (m > 67) m -= 12;
    return m;
  }

  function scaleMidis() {
    const steps = SCALES[state.key].steps;
    return steps.map((v) => rootMidi() + v).concat([rootMidi() + 12]);
  }

  function currentSet() {
    return diatonicSet(rootMidi(), state.key, 3);
  }

  /**
   * 这条调式相对大调是偏降还是偏升。拼写跟着它走，
   * 否则多利亚的 C 小三和弦会被写成 C - D♯ - G，音对但名字不对。
   */
  function useFlats() {
    const steps = SCALES[state.key].steps;
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += steps[i] - MAJOR_STEPS[i];
    return sum < 0 || (sum === 0 && state.rootPc > 5);
  }

  function paint() {
    const set = currentSet();
    const key = SCALES[state.key];
    const rootName = ROOTS.find((r) => r.pc === state.rootPc).name;

    [...el.roots.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.pc) === state.rootPc));
    });
    [...el.modes.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.key === state.key));
    });

    const rows = set.map((c, i) => {
      const majorQ = MAJOR_QUALITIES[i];
      const diff = c.quality !== majorQ;
      const same = !diff;
      const flats = useFlats();
      // 级数记号里的升降号是相对大调音阶说的：C 大调里 VI 是 A 大三，♭VI 是 A♭ 大三
      const alter = SCALES[state.key].steps[i] - MAJOR_STEPS[i];
      const mark = alter < 0 ? '♭'.repeat(-alter) : alter > 0 ? '♯'.repeat(alter) : '';
      const roman = c.roman.replace(/^([ivIV]+)/, (m) => mark + m);
      return `<tr data-degree="${i}" style="cursor:pointer${
        state.sel === i ? ';background:var(--amber-soft)' : ''}">
        <td>${roman}</td>
        <td>${c.midis.map((m) => spellMidi(m, flats).name.replace(/-?\d+$/, '')).join(' - ')}</td>
        <td>${QUALITY_CN[c.quality] ?? '?'}</td>
        <td class="${same ? '' : 'flag-lo'}">${QUALITY_CN[majorQ]}</td>
        <td>${same ? '同大调' : '<b>不一样</b>'}</td>
      </tr>`;
    }).join('');
    el.body.innerHTML = rows;

    const sig = SIGNATURE[state.key];
    const diffs = set.map((c, i) => {
      if (c.quality === MAJOR_QUALITIES[i]) return null;
      const alter = SCALES[state.key].steps[i] - MAJOR_STEPS[i];
      const mark = alter < 0 ? '♭'.repeat(-alter) : alter > 0 ? '♯'.repeat(alter) : '';
      return mark + ROMAN[i];
    }).filter(Boolean);
    const diffText = diffs.length
      ? `与同主音大调相比，有 ${diffs.length} 个级数的性质不同：<b>${diffs.join('、')}</b>。`
      : '这条音阶的级数性质和大调完全一样。';

    el.sig.innerHTML = `${key.label}（以 ${rootName} 为主音）的指纹：${diffText}`
      + (sig ? ` ${sig.why}` : '')
      + ' 点表格里任意一行可以听那个和弦。';
  }

  paint();
}
