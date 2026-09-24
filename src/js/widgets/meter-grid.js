/**
 * 第 6 节 · 节奏与节拍。
 * 节拍不是均匀的嘀嗒，是强弱交替的循环。换拍号，重音的位置就变。
 */

import { METERS, meterBySig } from '../music/rhythm.js';
import { click, now } from '../audio/engine.js';

const LOOKAHEAD = 0.12;   // 提前排这么多秒
const TICK_MS = 25;

export function mountMeterGrid(root) {
  const state = {
    sig: '4/4',
    hits: {},
    bpm: 84,
    playing: false,
    step: 0,
    nextAt: 0,
    timer: null,
  };

  root.innerHTML = `
    <div class="card-head">
      <h2>节拍网格</h2>
      <p class="hint">点格子放拍点，换拍号看强弱位置怎么挪</p>
    </div>
    <div class="tiles" data-meters role="group" aria-label="拍号"></div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <div class="field">
        <label for="mg-bpm">每分钟 <span data-bpm-val></span> 拍</label>
        <input id="mg-bpm" type="range" min="50" max="160" step="2" value="${state.bpm}">
      </div>
    </div>
    <div style="margin-top: var(--sp-3)">
      <p class="hint" style="margin:0 0 4px">强弱规律（越高越强）</p>
      <div class="accent-bar" data-accent></div>
    </div>
    <div style="margin-top: var(--sp-4)">
      <p class="hint" style="margin:0 0 4px">拍点</p>
      <div class="tiles" data-grid aria-label="拍点格子"></div>
    </div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>开始</button>
      <button class="btn" type="button" data-clear>清空拍点</button>
      <span class="tag" data-info></span>
    </div>
    <p class="hint" data-note></p>
  `;

  const el = {
    meters: root.querySelector('[data-meters]'),
    bpm: root.querySelector('#mg-bpm'),
    bpmVal: root.querySelector('[data-bpm-val]'),
    accent: root.querySelector('[data-accent]'),
    grid: root.querySelector('[data-grid]'),
    play: root.querySelector('[data-play]'),
    info: root.querySelector('[data-info]'),
    note: root.querySelector('[data-note]'),
  };

  METERS.forEach((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = m.sig;
    b.dataset.sig = m.sig;
    b.addEventListener('click', () => { state.sig = m.sig; state.step = 0; paint(); });
    el.meters.appendChild(b);
  });

  el.bpm.addEventListener('input', () => {
    state.bpm = Number(el.bpm.value);
    paint();
  });

  root.querySelector('[data-clear]').addEventListener('click', () => {
    state.hits = {};
    paint();
  });

  el.play.addEventListener('click', () => {
    if (state.playing) stop(); else start();
  });

  function meter() { return meterBySig(state.sig); }

  function start() {
    state.playing = true;
    state.step = 0;
    state.nextAt = now() + 0.08;
    el.play.textContent = '停止';
    state.timer = setInterval(tick, TICK_MS);
  }

  function stop() {
    state.playing = false;
    clearInterval(state.timer);
    state.timer = null;
    el.play.textContent = '开始';
  }

  function tick() {
    const beat = 60 / state.bpm;
    const t = now();
    while (state.nextAt < t + LOOKAHEAD) {
      const m = meter();
      const i = state.step % m.beats;
      const weight = m.weights[i];
      click(state.nextAt - t, { accented: weight > 0.8, level: 0.10 + weight * 0.16 });
      if (state.hits[i]) {
        click(state.nextAt - t, { freq: 523, level: 0.22 });
      }
      state.nextAt += beat;
      state.step++;
    }
  }

  function paint() {
    const m = meter();
    el.bpmVal.textContent = String(state.bpm);

    [...el.meters.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.sig === state.sig));
    });

    el.accent.innerHTML = m.weights
      .map((w) => `<span style="height:${Math.round(w * 100)}%"></span>`).join('');

    el.grid.innerHTML = '';
    for (let i = 0; i < m.beats; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.setAttribute('aria-pressed', String(!!state.hits[i]));
      b.style.minWidth = '44px';
      b.textContent = `第 ${i + 1} 拍`;
      b.addEventListener('click', () => {
        state.hits[i] = !state.hits[i];
        // 正在打拍子的时候，点格子只改图案、不发声 —— 否则节拍里会混进
        // 一串不属于这一拍的"嘀"（issue #3 体验-4）。
        if (state.hits[i] && !state.playing) click(0, { accented: m.weights[i] > 0.8 });
        paint();
      });
      el.grid.appendChild(b);
    }

    const strong = m.weights.filter((w) => w > 0.8).length;
    const medium = m.weights.filter((w) => w > 0.5 && w <= 0.8).length;
    el.info.textContent = `${m.kind} · 每小节 ${m.beats} 拍`;
    el.note.textContent = `${m.sig} 的重音位置：强拍 ${strong} 个`
      + (medium ? `，次强拍 ${medium} 个` : '')
      + `。${m.beats % 3 === 0 && m.unit === 8
        ? '6/8 是复拍子——它其实是两个三拍子，所以除了第一拍，第 ' + (Math.floor(m.beats / 2) + 1) + ' 拍也有次重音。'
        : '单拍子每小节只有一个强拍，其余都是弱拍。'}`;
  }

  paint();
  return { stop };
}
