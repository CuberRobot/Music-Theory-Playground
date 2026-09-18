/**
 * 第 11 节 · 调内和声。
 * 调里的七个和弦不是选出来的，是音阶自己长出来的。
 * 而且它们有明确的分工：主、下属、属。
 */

import { midiToHz, nameOfMidi } from '../music/pitch.js';
import { diatonicSet } from '../music/chords.js';
import { CIRCLE_MAJOR } from '../music/scales.js';
import { playChordSequence, playChord } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';

const PAD = spectrumToAmps('organ', 10);

/** 功能圈：主 T、下属 S、属 D。 */
const FUNCTION = ['T', 'S', 'D', 'S', 'D', 'T', 'D'];
const FUNCTION_NAME = { T: '主功能', S: '下属功能', D: '属功能' };

const PROGRESSIONS = [
  { label: 'I – IV – V – I', degs: [0, 3, 4, 0], note: '最常见的"出门再回家"' },
  { label: 'I – vi – IV – V', degs: [0, 5, 3, 4], note: '流行歌最爱用的四和弦' },
  { label: 'ii – V – I', degs: [1, 4, 0], note: '爵士里最基本的收束' },
];

export function mountChordMap(root) {
  const state = { keyIndex: 0, last: [] };

  root.innerHTML = `
    <div class="card-head">
      <h2>调内和弦地图</h2>
      <p class="hint">选一个调，再点任意一个和弦听</p>
    </div>
    <div class="tiles" data-keys role="group" aria-label="选择调"></div>
    <div class="tiles" data-chords role="group" aria-label="调内和弦" style="margin-top:var(--sp-4)"></div>
    <p class="hint" data-note></p>
    <div class="lab-controls" style="margin-top: var(--sp-4)" data-progs></div>
    <div class="scroll-x" style="margin-top: var(--sp-5)">
      <table class="table">
        <caption class="sr-only">调内和弦的功能分工</caption>
        <thead>
          <tr><th scope="col">级数</th><th scope="col">和弦</th><th scope="col">性质</th>
              <th scope="col">功能</th><th scope="col">倾向</th></tr>
        </thead>
        <tbody data-table></tbody>
      </table>
    </div>
  `;

  const el = {
    keys: root.querySelector('[data-keys]'),
    chords: root.querySelector('[data-chords]'),
    note: root.querySelector('[data-note]'),
    progs: root.querySelector('[data-progs]'),
    tbody: root.querySelector('[data-table]'),
  };

  ['C', 'G', 'D', 'F', 'B♭'].forEach((name) => {
    const idx = CIRCLE_MAJOR.findIndex((k) => k.name === name);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = `${name} 大调`;
    b.dataset.idx = String(idx);
    b.addEventListener('click', () => {
      state.keyIndex = idx;
      state.last = [];
      paint();
    });
    el.keys.appendChild(b);
  });

  PROGRESSIONS.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = p.label;
    b.addEventListener('click', () => {
      const set = currentSet();
      playChordSequence(p.degs.map((d) => set[d].midis.map(midiToHz)),
        { gap: 0.85, duration: 0.75, amps: PAD, level: 0.16 });
      el.note.textContent = `${p.label} —— ${p.note}。听最后那个回到主和弦的瞬间。`;
    });
    el.progs.appendChild(b);
  });

  function rootMidi() {
    const pc = CIRCLE_MAJOR[state.keyIndex].pc;
    let m = 60 + ((pc - 0 + 12) % 12);
    while (m > 67) m -= 12;
    return m;
  }

  function currentSet() {
    return diatonicSet(rootMidi(), 'major', 3);
  }

  function paint() {
    const set = currentSet();
    const key = CIRCLE_MAJOR[state.keyIndex];

    [...el.keys.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.idx) === state.keyIndex));
    });

    el.chords.innerHTML = '';
    set.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.style.minWidth = '78px';
      b.innerHTML = `<strong>${c.roman}</strong> <span style="color:var(--ink-3)">${
        c.label.replace('和弦', '')}</span>`;
      b.addEventListener('click', () => {
        playChord(c.midis.map(midiToHz), { duration: 1.3, amps: PAD, level: 0.18 });
        state.last = c.midis;
        paint();
      });
      if (state.last.length && state.last.join() === c.midis.join()) b.setAttribute('aria-pressed', 'true');
      el.chords.appendChild(b);
    });

    el.tbody.innerHTML = set.map((c, i) => `
      <tr>
        <td>${c.roman}</td>
        <td>${c.midis.map(nameOfMidi).map((n) => n.replace(/\d/, '')).join(' - ')}</td>
        <td>${c.label.replace('和弦', '')}</td>
        <td>${FUNCTION_NAME[FUNCTION[i]]}</td>
        <td>${['最稳定，是"家"', '推向属', '推向主，最需要解决', '远离主', '最强的解决动力',
          '主功能的替身', '极不稳定，几乎一定要回主'][i]}</td>
      </tr>`).join('');

    el.note.textContent = `${key.name} 大调的七个调内和弦。I 最稳定，V 最想回家，`
      + `vii° 最不稳定。注意它们的大小性质不是挑的——是音阶里那七个音自己决定的。`;
  }

  paint();
}
