/**
 * 第 4 节 · 协和与不协和。
 * 为什么有的音程听起来"合"、有的"扎"：看两个音的泛音梯对不对得上。
 * 判据很干净 —— 最简整数比的两个数都不超过 8 就是协和，不超过 4 是完全协和。
 */

import { midiToHz, fmtCents } from '../music/pitch.js';
import { JUST, justCents, tetCents, centsError, spectrumToAmps } from '../music/tuning.js';
import { playChord } from '../audio/engine.js';

const W = 360;
const H = 150;
const PAD_L = 52;
const PAD_R = 16;
const Y_TOP = 46;
const Y_BOT = 100;
const RICH = spectrumToAmps('organ', 8);

export function mountConsonanceLab(root) {
  const state = { semis: 7, base: 60, ab: false };

  root.innerHTML = `
    <div class="card-head">
      <h2>泛音梯</h2>
      <p class="hint">两个音一起响的时候，它们的泛音能不能对上</p>
    </div>
    <div class="tiles" data-tiles role="group" aria-label="选择音程"></div>
    <svg data-ladder viewBox="0 0 ${W} ${H}" role="img"
      aria-label="两个音的泛音列对齐情况"
      style="width:100%;height:auto;margin-top:var(--sp-4)"></svg>
    <p class="hint" data-tag></p>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>同时响</button>
      <button class="btn" type="button" data-ab aria-pressed="false">换成平均律听</button>
    </div>
    <dl class="readout" style="margin-top: var(--sp-4)" data-readout></dl>
  `;

  const el = {
    tiles: root.querySelector('[data-tiles]'),
    ladder: root.querySelector('[data-ladder]'),
    tag: root.querySelector('[data-tag]'),
    readout: root.querySelector('[data-readout]'),
    ab: root.querySelector('[data-ab]'),
  };

  JUST.forEach((iv) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = iv.name;
    b.dataset.semis = String(iv.semis);
    b.addEventListener('click', () => { state.semis = iv.semis; paint(); });
    el.tiles.appendChild(b);
  });

  el.ab.addEventListener('click', () => {
    state.ab = !state.ab;
    el.ab.setAttribute('aria-pressed', String(state.ab));
    paint();
  });

  root.querySelector('[data-play]').addEventListener('click', () => {
    const iv = JUST[state.semis];
    const base = midiToHz(state.base);
    const top = state.ab ? base * Math.pow(2, iv.semis / 12) : base * (iv.p / iv.q);
    playChord([base, top], { duration: 1.8, amps: RICH, level: 0.2 });
  });

  function paint() {
    const iv = JUST[state.semis];
    const base = midiToHz(state.base);
    const fTop = base * (iv.p / iv.q);
    const limit = Math.max(iv.p, iv.q);
    const aligned = limit <= 8;
    const lineColor = aligned ? (limit <= 4 ? 'var(--green)' : 'var(--slate)') : 'var(--clay)';

    [...el.tiles.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.semis) === state.semis));
    });

    const fMin = base;
    const fMax = base * 16;
    const x = (f) => PAD_L + (Math.log2(f / fMin) / 4) * (W - PAD_L - PAD_R);
    const parts = [];

    for (let o = 0; o <= 4; o++) {
      const gx = x(fMin * Math.pow(2, o));
      parts.push(`<line x1="${gx.toFixed(1)}" y1="18" x2="${gx.toFixed(1)}" y2="118"
        stroke="var(--line)" stroke-width="1"/>`);
    }

    const dot = (f, y, h, hi) => {
      const cx = x(f);
      const fill = hi ? lineColor : 'var(--ink-4)';
      const labelY = y > 60 ? y + 15 : y - 9;
      return `<circle cx="${cx.toFixed(1)}" cy="${y}" r="${hi ? 5.5 : 3.5}" fill="${fill}"/>`
        + `<text x="${cx.toFixed(1)}" y="${labelY}" font-size="9"
            fill="var(--ink-3)" text-anchor="middle">${h}</text>`;
    };

    const hiTop = aligned ? iv.q : -1;
    const hiBot = aligned ? iv.p : -1;
    for (let h = 1; h <= 8; h++) {
      const f = fTop * h;
      if (f <= fMax) parts.push(dot(f, Y_TOP, h, h === hiTop));
    }
    for (let h = 1; h <= 8; h++) {
      const f = fMin * h;
      if (f <= fMax) parts.push(dot(f, Y_BOT, h, h === hiBot));
    }
    if (aligned) {
      parts.push(`<line x1="${x(fTop * iv.q).toFixed(1)}" y1="${Y_TOP + 7}"
        x2="${x(fMin * iv.p).toFixed(1)}" y2="${Y_BOT - 7}"
        stroke="${lineColor}" stroke-width="2"/>`);
    }

    parts.push(`<text x="4" y="${Y_TOP + 4}" font-size="11" fill="var(--ink-2)">上方音</text>`);
    parts.push(`<text x="4" y="${Y_BOT + 4}" font-size="11" fill="var(--ink-2)">下方音</text>`);
    parts.push(`<text x="${W - PAD_R}" y="142" font-size="10" fill="var(--ink-3)"
      text-anchor="end">泛音次序 · 横轴为对数频率（4 个八度）</text>`);
    el.ladder.innerHTML = parts.join('');

    el.tag.textContent = aligned
      ? `两个音的泛音梯在第 ${iv.p} 阶和第 ${iv.q} 阶上对上了，所以听起来是"合"的。`
      : '8 阶以内找不到一对重合的泛音，所以听起来是"扎"的。';

    const cents = centsError(iv);
    el.readout.innerHTML = `
      <div><dt>最简频率比</dt><dd>${iv.p} : ${iv.q}</dd></div>
      <div><dt>最简泛音阶</dt><dd>${limit}</dd></div>
      <div><dt>纯律音分</dt><dd>${justCents(iv).toFixed(2)}</dd></div>
      <div><dt>平均律音分</dt><dd>${tetCents(iv.semis).toFixed(2)}</dd></div>
      <div><dt>平均律偏高</dt><dd class="${Math.abs(cents) > 10 ? 'lo' : 'hi'}">${fmtCents(cents)}</dd></div>
      <div><dt>协和度</dt><dd>${iv.consonance}</dd></div>
      <div><dt>现在听的是</dt><dd>${state.ab ? '平均律' : '纯律'}</dd></div>
    `;
  }

  paint();
}
