/**
 * 第 2 节 · 音高与音名。
 * 三件事：音名是什么、八度是怎么重复的、同一个键为什么有两个名字。
 */

import {
  midiToHz, spellMidi, octaveGroupName, solfegeOf, fmtHz, centsBetween,
} from '../music/pitch.js';
import { createKeyboard } from './keyboard.js';
import { playNote, playChord } from '../audio/engine.js';

const FROM = 48;
const TO = 84;
const STANDARD = 440;

export function mountPitchNames(root) {
  const state = { midi: 60, flats: false };

  root.innerHTML = `
    <div class="card-head">
      <h2>音名实验室</h2>
      <p class="hint">点键盘上任意一个键</p>
    </div>
    <div class="kb-scroll" data-kb></div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn" type="button" data-spell aria-pressed="false">用降号拼写</button>
      <button class="btn" type="button" data-octave>听八度（2 : 1）</button>
      <button class="btn" type="button" data-standard>听标准音 A4</button>
    </div>
    <dl class="readout" style="margin-top: var(--sp-4)" data-readout></dl>
    <p class="hint" data-note></p>
  `;

  const el = {
    kbHost: root.querySelector('[data-kb]'),
    readout: root.querySelector('[data-readout]'),
    note: root.querySelector('[data-note]'),
    spell: root.querySelector('[data-spell]'),
  };

  const kb = createKeyboard(el.kbHost, {
    from: FROM, to: TO, labels: true,
    ariaLabel: '音名实验室键盘',
    onDown(midi) {
      state.midi = midi;
      playNote(midiToHz(midi), { duration: 0.8 });
      paint();
    },
  });

  el.spell.addEventListener('click', () => {
    state.flats = !state.flats;
    el.spell.setAttribute('aria-pressed', String(state.flats));
    paint();
  });

  root.querySelector('[data-octave]').addEventListener('click', () => {
    const hz = midiToHz(state.midi);
    playChord([hz, hz * 2], { duration: 1.2, level: 0.24 });
  });

  root.querySelector('[data-standard]').addEventListener('click', () => {
    playNote(STANDARD, { duration: 1.1, level: 0.28 });
  });

  function paint() {
    const m = state.midi;
    const sharp = spellMidi(m, false);
    const flat = spellMidi(m, true);
    const current = state.flats ? flat : sharp;
    const other = state.flats ? sharp : flat;
    const hz = midiToHz(m);
    const isBlack = sharp.acc !== 0;
    const letterNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    kb.setHighlight([{ midi: m, tone: 'amber' }]);

    el.readout.innerHTML = `
      <div><dt>音名</dt><dd>${current.name}</dd></div>
      <div><dt>${isBlack ? '等音（同一个键的另一个名字）' : '音级字母'}</dt>
        <dd>${isBlack ? other.name : current.letter}</dd></div>
      <div><dt>唱名（固定唱名）</dt><dd>${solfegeOf(m)}</dd></div>
      <div><dt>音组</dt><dd>${octaveGroupName(m)}</dd></div>
      <div><dt>频率</dt><dd>${fmtHz(hz)} Hz</dd></div>
      <div><dt>与中央 C 相差</dt><dd>${(centsBetween(midiToHz(60), hz) / 100).toFixed(2)} 个半音</dd></div>
    `;

    el.note.textContent = isBlack
      ? `${current.name} 和 ${other.name} 是同一个键、同一个频率——这叫等音。名字不同，是因为它们在乐谱上的写法不同。`
      : `${current.name} 是白键，字母 ${letterNames[current.letterIndex]}。`;
  }

  paint();
  return { kb };
}
