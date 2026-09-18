/**
 * 第 10、12 节 · 调号与调性关系。
 * 五度圈是一个罗盘：顺时针每走一格升一个号，逆时针每走一格降一个号。
 * 相邻的调只差一个音，所以它们之间转调最容易。
 */

import { midiToHz } from '../music/pitch.js';
import { CIRCLE_MAJOR, SHARP_ORDER, FLAT_ORDER, relativeMinorPc } from '../music/scales.js';
import { build, TRIADS } from '../music/chords.js';
import { playChord } from '../audio/engine.js';

const CX = 160;
const CY = 152;
const R = 108;
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const pos = (i) => {
  const rad = ((-90 + (i / 12) * 360) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
};

export function mountCircleFifths(root) {
  const state = { index: 0, prev: null };

  root.innerHTML = `
    <div class="card-head">
      <h2>五度圈</h2>
      <p class="hint">点圈上的调名，听这个调的主和弦</p>
    </div>
    <svg data-circle viewBox="0 0 320 304" role="img"
      aria-label="五度圈：十二个大调及其调号"
      style="width:100%;max-width:340px;height:auto;display:block;margin:0 auto"></svg>
    <div class="lab-split" style="margin-top: var(--sp-4)">
      <dl class="readout" data-readout></dl>
      <div>
        <p class="hint" style="margin-top:0">相邻两个调只差一个音，所以转调最容易。</p>
        <div class="tiles" data-steps>
          <button class="btn" type="button" data-step="-1">逆时针一格</button>
          <button class="btn" type="button" data-step="1">顺时针一格</button>
        </div>
      </div>
    </div>
  `;

  const el = {
    circle: root.querySelector('[data-circle]'),
    readout: root.querySelector('[data-readout]'),
  };

  el.circle.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-i]');
    if (!hit) return;
    state.prev = state.index;
    state.index = Number(hit.dataset.i);
    playTonic();
    paint();
  });

  root.querySelector('[data-steps]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    state.prev = state.index;
    state.index = ((state.index + Number(b.dataset.step)) % 12 + 12) % 12;
    playTonic();
    paint();
  });

  function playTonic() {
    const k = CIRCLE_MAJOR[state.index];
    playChord(build(midiForTonic(k.pc), 'major', TRIADS).map(midiToHz),
      { duration: 1.6, level: 0.2 });
  }

  /** 把主音放在中央 C 附近的合适八度，听起来舒服。 */
  function midiForTonic(pc) {
    let m = 60 + ((pc - 0 + 12) % 12);
    while (m > 67) m -= 12;
    return m;
  }

  function paint() {
    const k = CIRCLE_MAJOR[state.index];
    const parts = [];
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
      stroke="var(--line-strong)" stroke-width="1.5"/>`);
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${R * 0.55}" fill="none"
      stroke="var(--line)" stroke-width="1" stroke-dasharray="3 4"/>`);
    parts.push(`<text x="${CX}" y="${CY - 4}" text-anchor="middle" font-size="11"
      fill="var(--ink-3)">顺时针</text>`);
    parts.push(`<text x="${CX}" y="${CY + 14}" text-anchor="middle" font-size="11"
      fill="var(--ink-3)">升号增加</text>`);

    CIRCLE_MAJOR.forEach((key, i) => {
      const p = pos(i);
      const strong = i === state.index;
      const minorPc = relativeMinorPc(key.pc);
      const minorName = (key.flats > 0 ? FLAT_NAMES : NAMES)[minorPc];
      parts.push(`<g data-i="${i}" style="cursor:pointer">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${strong ? 22 : 18}"
          fill="${strong ? 'var(--amber)' : 'var(--surface)'}"
          stroke="${strong ? 'var(--amber-deep)' : 'var(--line-strong)'}" stroke-width="1.5"/>
        <text x="${p.x.toFixed(1)}" y="${(p.y + (strong ? -1 : 0)).toFixed(1)}"
          text-anchor="middle" font-size="13" fill="var(--ink-1)">${key.name}</text>
        <text x="${p.x.toFixed(1)}" y="${(p.y + 11).toFixed(1)}"
          text-anchor="middle" font-size="9" fill="var(--ink-3)">${minorName}m</text>
      </g>`);
    });
    el.circle.innerHTML = parts.join('');

    const sig = k.sharps > 0
      ? `${k.sharps} 个升号（${SHARP_ORDER.slice(0, k.sharps).map((p) => NAMES[p]).join(' ')}）`
      : k.flats > 0
        ? `${k.flats} 个降号（${FLAT_ORDER.slice(0, k.flats).map((p) => FLAT_NAMES[p]).join(' ')}）`
        : '没有升降号';

    const minorPc = relativeMinorPc(k.pc);
    const minorName = (k.flats > 0 ? FLAT_NAMES : NAMES)[minorPc];

    let relation = '再点一个调，就能看到它和现在这个的关系。';
    if (state.prev !== null && state.prev !== state.index) {
      const diff = ((state.index - state.prev) % 12 + 12) % 12;
      const steps = Math.min(diff, 12 - diff);
      relation = steps === 1
        ? '和上一个调相差一格，是最近的关系调 —— 只差一个音，转调最顺。'
        : `和上一个调相差 ${steps} 格，隔得越远共同音越少，转调越突然。`;
    }

    el.readout.innerHTML = `
      <div><dt>调和主音</dt><dd>${k.name} 大调</dd></div>
      <div><dt>调号</dt><dd>${sig}</dd></div>
      <div><dt>关系小调</dt><dd>${minorName} 小调</dd></div>
      <div><dt>主和弦</dt><dd>${k.name} - ${NAMES[(k.pc + 4) % 12]} - ${NAMES[(k.pc + 7) % 12]}</dd></div>
    `;
    el.readout.insertAdjacentHTML('beforeend',
      `<div><dt>与上一个调</dt><dd style="text-align:right;max-width:58%">${relation}</dd></div>`);
  }

  paint();
  return { selectIndex(i) { state.prev = state.index; state.index = i; playTonic(); paint(); } };
}
