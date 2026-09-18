/**
 * 泛音实验台。
 *
 * 想让人看到的三件事：
 *   1. 一个音不是一个频率，是一串频率（1f, 2f, 3f, …）。
 *   2. 改这串频率的强弱 = 改音色。基频决定音高，泛音配比决定音色。
 *   3. 去掉基频，音高还在 —— 因为耳朵算的是整串频率的周期。
 *
 * 顺带埋一个钩子：第 7、11 泛音对不上十二平均律。这是下一课平均律的入口。
 */

import { midiToHz, nameOfMidi, fmtCents, fmtHz } from '../music/pitch.js';
import { harmonicDeviation, HARMONIC_LABELS, SPECTRA, spectrumToAmps } from '../music/tuning.js';
import { createVoice, playNote, usableHarmonics } from '../audio/engine.js';

const VOICE_H = 24;
const MIN_MIDI = 36;
const MAX_MIDI = 72;
const BARS = 16;
const TABLE_ROWS = 12;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function mountHarmonicLab(root) {
  const state = {
    midi: 60,
    amps: spectrumToAmps('saw', BARS),
    beforeMute: null,
    voice: null,
    playing: false,
  };

  root.innerHTML = `
    <div class="card-head">
      <h2>泛音实验台</h2>
      <p class="hint">拖动竖条改变每个泛音的强度，音色会立刻变</p>
    </div>

    <div class="lab-controls">
      <div class="field">
        <label for="hl-base">基音</label>
        <input id="hl-base" type="range" min="${MIN_MIDI}" max="${MAX_MIDI}" step="1" value="${state.midi}">
        <span class="val" data-base-name>—</span>
      </div>
      <button class="btn btn-primary" type="button" data-play>播放</button>
      <button class="btn" type="button" data-no-fund aria-pressed="false">移去基频</button>
    </div>

    <canvas class="scope" data-scope height="120" role="img"
      aria-label="当前泛音配比叠加出来的波形"></canvas>
    <p class="hint" data-scope-cap></p>

    <div class="bars" data-bars role="group" aria-label="各泛音的强度"></div>
    <div class="bar-labels" data-labels aria-hidden="true"></div>

    <div class="seg" data-presets role="group" aria-label="音色预设"></div>

    <div class="scroll-x scroll-x--wide">
      <table class="table" data-table>
        <caption class="sr-only">泛音列表与它们和十二平均律的偏差</caption>
        <thead>
          <tr>
            <th scope="col">泛音</th>
            <th scope="col">频率</th>
            <th scope="col">最接近的音</th>
            <th scope="col">与平均律的偏差</th>
            <th scope="col">听起来像</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const el = {
    base: root.querySelector('#hl-base'),
    baseName: root.querySelector('[data-base-name]'),
    play: root.querySelector('[data-play]'),
    noFund: root.querySelector('[data-no-fund]'),
    scope: root.querySelector('[data-scope]'),
    scopeCap: root.querySelector('[data-scope-cap]'),
    bars: root.querySelector('[data-bars]'),
    labels: root.querySelector('[data-labels]'),
    presets: root.querySelector('[data-presets]'),
    tbody: root.querySelector('tbody'),
  };

  // ---- 竖条 ---------------------------------------------------------------

  const barEls = [];
  for (let i = 0; i < BARS; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.tabIndex = 0;
    bar.setAttribute('role', 'slider');
    bar.setAttribute('aria-label', `第 ${i + 1} 泛音强度`);
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.innerHTML = '<i></i>';
    bar._fill = bar.querySelector('i');
    bar._index = i;
    el.bars.appendChild(bar);
    barEls.push(bar);

    const label = document.createElement('span');
    label.textContent = String(i + 1);
    el.labels.appendChild(label);
  }

  let drag = null;

  barEls.forEach((bar) => {
    const i = bar._index;

    bar.addEventListener('pointerdown', (e) => {
      bar.setPointerCapture(e.pointerId);
      drag = { i, y0: e.clientY, v0: state.amps[i], moved: false, pointerId: e.pointerId };
    });

    bar.addEventListener('pointermove', (e) => {
      if (!drag || drag.i !== i || drag.pointerId !== e.pointerId) return;
      const dy = drag.y0 - e.clientY;
      if (Math.abs(dy) > 3) drag.moved = true;
      setAmp(i, drag.v0 + dy / 90);
    });

    const endDrag = (e) => {
      if (!drag || drag.i !== i || drag.pointerId !== e.pointerId) return;
      const wasClick = !drag.moved;
      drag = null;
      if (wasClick) toggleAmp(i);
    };
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);

    bar.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.05 : 0.15;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setAmp(i, state.amps[i] + step); e.preventDefault(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setAmp(i, state.amps[i] - step); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { toggleAmp(i); e.preventDefault(); }
      else if (e.key === 'Home') { setAmp(i, 1); e.preventDefault(); }
      else if (e.key === 'End') { setAmp(i, 0); e.preventDefault(); }
    });
  });

  function setAmp(i, value) {
    state.amps[i] = clamp(value, 0, 1);
    paintBars();
    pushToVoice();
    drawScope();
    markCustom();
  }

  function toggleAmp(i) {
    if (state.amps[i] > 0.02) {
      barEls[i]._remember = state.amps[i];
      state.amps[i] = 0;
    } else {
      state.amps[i] = barEls[i]._remember ?? 0.7;
    }
    paintBars();
    pushToVoice();
    drawScope();
    markCustom();
  }

  function paintBars() {
    barEls.forEach((bar, i) => {
      const v = state.amps[i];
      bar._fill.style.height = `${Math.round(v * 100)}%`;
      bar.classList.toggle('mute', v <= 0.02);
      bar.setAttribute('aria-valuenow', String(Math.round(v * 100)));
      el.labels.children[i].className = v <= 0.02 ? 'off' : 'on';
    });
  }

  // ---- 预设 ---------------------------------------------------------------

  Object.entries(SPECTRA).forEach(([key, spec]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = spec.label;
    b.dataset.spectrum = key;
    b.addEventListener('click', () => {
      state.amps = spectrumToAmps(key, BARS);
      state.beforeMute = null;
      el.noFund.setAttribute('aria-pressed', 'false');
      paintBars();
      pushToVoice();
      drawScope();
      markPreset(key);
    });
    el.presets.appendChild(b);
  });

  function markPreset(key) {
    [...el.presets.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.spectrum === key));
    });
  }
  function markCustom() {
    [...el.presets.children].forEach((b) => b.setAttribute('aria-pressed', 'false'));
  }

  // ---- 基音与播放 ---------------------------------------------------------

  el.base.addEventListener('input', () => {
    state.midi = Number(el.base.value);
    pushToVoice();
    drawScope();
    paintTable();
    paintBase();
  });

  el.play.addEventListener('click', () => {
    if (state.playing) {
      state.voice?.stop();
      state.voice = null;
      state.playing = false;
      el.play.textContent = '播放';
      return;
    }
    state.voice = createVoice(VOICE_H);
    if (!state.voice) return;
    state.voice.setFrequency(baseHz(), 0);
    state.voice.setAmps(fullAmps(), 0);
    state.voice.start(0.3, 0.02, null, true);   // 持续音：不要滤波器包络
    state.playing = true;
    el.play.textContent = '停止';
  });

  el.noFund.addEventListener('click', () => {
    const on = el.noFund.getAttribute('aria-pressed') === 'true';
    if (on) {
      if (state.beforeMute) state.amps[0] = state.beforeMute;
      state.beforeMute = null;
      el.noFund.setAttribute('aria-pressed', 'false');
    } else {
      state.beforeMute = state.amps[0];
      state.amps[0] = 0;
      el.noFund.setAttribute('aria-pressed', 'true');
    }
    paintBars();
    pushToVoice();
    drawScope();
  });

  function baseHz() { return midiToHz(state.midi); }

  function fullAmps() {
    const out = new Array(VOICE_H).fill(0);
    for (let i = 0; i < BARS; i++) out[i] = state.amps[i];
    return out;
  }

  function pushToVoice() {
    if (state.voice && !state.voice.disposed) {
      state.voice.setAmps(fullAmps());
      state.voice.setFrequency(baseHz());
    }
  }

  // ---- 波形 ---------------------------------------------------------------

  function drawScope() {
    const canvas = el.scope;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 480;
    const h = 120;
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const css = getComputedStyle(document.documentElement);
    const bg = css.getPropertyValue('--surface-2').trim() || '#F1EBDB';
    const ink = css.getPropertyValue('--ink-4').trim() || '#A89E88';
    const amber = css.getPropertyValue('--amber-deep').trim() || '#B9861F';
    const clay = css.getPropertyValue('--clay').trim() || '#D4714C';

    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    g.strokeStyle = ink;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();

    const amps = state.amps;
    let sum = 0;
    for (let i = 0; i < BARS; i++) sum += Math.abs(amps[i]);
    if (sum === 0) {
      el.scopeCap.textContent = '所有泛音都被关掉了，所以是静音。';
      return;
    }

    const periods = 2;
    const steps = Math.max(360, Math.round(w * 1.4));
    g.strokeStyle = amps[0] > 0.02 ? amber : clay;
    g.lineWidth = 1.6;
    g.beginPath();
    for (let s = 0; s <= steps; s++) {
      const u = (s / steps) * periods;
      let y = 0;
      for (let i = 0; i < BARS; i++) {
        if (amps[i] <= 0) continue;
        y += amps[i] * Math.sin(2 * Math.PI * (i + 1) * u);
      }
      y /= sum;
      const px = (s / steps) * w;
      const py = h / 2 - y * (h / 2 - 6);
      if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();

    const n = usableHarmonics(baseHz(), BARS);
    const parts = [];
    parts.push(amps[0] > 0.02
      ? '这是两个周期，波形每重复一次就是一个基音周期，所以音高由基频决定。'
      : '基频已经拿掉了，但波形还是每格重复一次 —— 所以音高没变，变的是音色。');
    if (n < BARS) parts.push(`当前基音太高，超过 ${n} 号的泛音已经越过奈奎斯特频率，被自动关掉了（否则会混叠成错误的音高）。`);
    el.scopeCap.textContent = parts.join('');
  }

  // ---- 泛音表 -------------------------------------------------------------

  function paintTable() {
    const hz0 = baseHz();
    const rows = [];
    for (let h = 1; h <= TABLE_ROWS; h++) {
      const dev = harmonicDeviation(h);
      const noteName = nameOfMidi(state.midi + dev.semis);
      const off = dev.cents;
      const offClass = Math.abs(off) > 15 ? 'flag-lo' : 'flag-ok';
      const offText = Math.abs(off) < 0.35 ? '正好' : `${fmtCents(off, 1)} 音分`;
      rows.push(`
        <tr>
          <td class="num">${h}</td>
          <td class="num">${fmtHz(hz0 * h)} Hz</td>
          <td>${noteName}</td>
          <td class="num ${offClass}">${offText}</td>
          <td>${HARMONIC_LABELS[h] ?? ''}</td>
        </tr>`);
    }
    el.tbody.innerHTML = rows.join('');
  }

  function paintBase() {
    el.baseName.textContent = `${nameOfMidi(state.midi)} · ${fmtHz(baseHz())} Hz`;
  }

  // ---- 启动 ---------------------------------------------------------------

  paintBars();
  markPreset('saw');
  paintBase();
  paintTable();
  drawScope();

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => drawScope()).observe(el.scope);
  }

  // 给"沙盒"区留的接口：外部可以直接设定一组泛音再播放
  return {
    playOnce(amps) {
      playNote(baseHz(), { amps: amps ?? fullAmps(), duration: 1.1 });
    },
    get fundamental() { return baseHz(); },
  };
}
