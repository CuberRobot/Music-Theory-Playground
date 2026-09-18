/**
 * 第 9 节 · 音阶与调式。
 * 音阶不是"一串音"，是一条有重力的曲线：主音在谷底，越远越悬。
 * 换一个调式，这条曲线的形状就变了，同一个旋律的表情也跟着变。
 */

import { midiToHz, nameOfMidi, spellMidi } from '../music/pitch.js';
import { SCALES, STABILITY, degreeName } from '../music/scales.js';
import { createKeyboard } from './keyboard.js';
import { playSequence, playChord, playNote } from '../audio/engine.js';

const FROM = 55;
const TO = 84;
const W = 360;
const H = 156;
const PAD = 18;
const DEGREE_LABELS = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7', '8'];

const KEY_LIST = ['major', 'natMinor', 'harmMinor', 'melMinor', 'majorPenta', 'minorPenta',
  'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

const MINORISH = ['natMinor', 'harmMinor', 'melMinor', 'aeolian', 'dorian', 'phrygian', 'locrian', 'minorPenta'];

export function mountScaleLab(root) {
  const state = { rootMidi: 60, key: 'major', flats: false };

  root.innerHTML = `
    <div class="card-head">
      <h2>音阶引力场</h2>
      <p class="hint">点键盘换主音，换音阶看曲线怎么变形</p>
    </div>
    <div class="kb-scroll" data-kb></div>
    <div class="tiles" data-scales role="group" aria-label="音阶类型" style="margin-top:var(--sp-4)"></div>
    <svg data-curve viewBox="0 0 ${W} ${H}" role="img"
      aria-label="十二个音级相对主音的稳定度"
      style="width:100%;height:auto;margin-top:var(--sp-4)"></svg>
    <p class="hint" data-tip></p>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>听整条音阶</button>
      <button class="btn" type="button" data-resolution>听结束的方式</button>
    </div>
    <dl class="readout" style="margin-top: var(--sp-4)" data-readout></dl>
  `;

  const el = {
    kbHost: root.querySelector('[data-kb]'),
    scales: root.querySelector('[data-scales]'),
    curve: root.querySelector('[data-curve]'),
    tip: root.querySelector('[data-tip]'),
    readout: root.querySelector('[data-readout]'),
  };

  KEY_LIST.forEach((k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = SCALES[k].label;
    b.dataset.key = k;
    b.addEventListener('click', () => { state.key = k; paint(); playScale(); });
    el.scales.appendChild(b);
  });

  const kb = createKeyboard(el.kbHost, {
    from: FROM, to: TO,
    ariaLabel: '音阶实验台键盘',
    onDown(midi) {
      state.rootMidi = midi;
      playNote(midiToHz(midi), { duration: 0.7 });
      paint();
    },
  });

  const steps = () => SCALES[state.key].steps;

  function scaleMidis() {
    const s = steps();
    return s.map((v) => state.rootMidi + v).concat([state.rootMidi + 12]);
  }

  function playScale() {
    playSequence(scaleMidis().map(midiToHz), { gap: 0.28, duration: 0.5, level: 0.24 });
  }

  root.querySelector('[data-play]').addEventListener('click', playScale);

  root.querySelector('[data-resolution]').addEventListener('click', () => {
    const s = steps();
    // 导音到主音是半音才叫解决；小调的自然七级离主音是全音，听起来是"飘"的
    const seventh = state.rootMidi + s[s.length - 1];
    playChord([midiToHz(seventh), midiToHz(state.rootMidi + 12)],
      { duration: 1.7, level: 0.2 });
  });

  function paint() {
    const s = steps();
    const inScale = new Set(s);

    kb.setHighlight(scaleMidis().map((m, i, arr) => ({
      midi: m,
      tone: (i === 0 || i === arr.length - 1) ? 'amber' : 'green',
    })));

    [...el.scales.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.key === state.key));
    });

    const bw = (W - PAD * 2) / 12;
    const pts = [];
    const parts = [];
    for (let i = 0; i <= 12; i++) {
      const st = STABILITY[i % 12];
      const x = PAD + i * bw + bw / 2;
      const y = H - PAD - 14 - st * (H - PAD * 2 - 14);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      const isTonic = i === 0 || i === 12;
      const inS = isTonic || inScale.has(i % 12);
      parts.push(`<rect x="${(x - bw * 0.3).toFixed(1)}" y="${y.toFixed(1)}"
        width="${(bw * 0.6).toFixed(1)}" height="${(H - PAD - 14 - y).toFixed(1)}" rx="3"
        fill="${isTonic ? 'var(--amber)' : inS ? 'var(--green)' : 'var(--surface-3)'}"/>`);
      parts.push(`<text x="${x.toFixed(1)}" y="${H - 4}" font-size="9"
        fill="var(--ink-3)" text-anchor="middle">${DEGREE_LABELS[i]}</text>`);
    }
    parts.push(`<polyline points="${pts.join(' ')}" fill="none"
      stroke="var(--ink-4)" stroke-width="1.5" stroke-dasharray="4 4"/>`);
    el.curve.innerHTML = parts.join('');

    const degreeList = s.map((v, i) =>
      `${nameOfMidi(state.rootMidi + v)}（${degreeName(s, i)}）`).join('、');

    el.readout.innerHTML = `
      <div><dt>主音</dt><dd>${spellMidi(state.rootMidi, state.flats).name}</dd></div>
      <div><dt>音阶</dt><dd>${SCALES[state.key].label}</dd></div>
      <div><dt>相对主音的半音</dt><dd>${s.join(' ')}</dd></div>
    `;
    el.readout.insertAdjacentHTML('beforeend',
      `<div><dt>各音级</dt><dd style="text-align:right;max-width:60%">${degreeList}</dd></div>`);

    el.tip.textContent = s.length === 5
      ? '五声音阶去掉了两个最不稳定的音（第 4 级和 第 7 级），所以怎么弹都不太会难听。这是它被大量用于民族音乐和即兴的原因。'
      : MINORISH.includes(state.key)
        ? '小调类的第 3 级比大调低半音，那个半音就是"暗"的来源。和声小调还把第 7 级升高半音，造出一个离主音只有半音的导音，回家的冲动更强。'
        : '大调第 7 级离主音只有半音，这个向上解决的冲动就是"导音"这个名字的由来。点「听结束的方式」，比较一下大调和小调收尾的区别。';
  }

  paint();
  return { kb };
}
