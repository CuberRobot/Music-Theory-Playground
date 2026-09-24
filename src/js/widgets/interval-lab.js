/**
 * 第 3 节 · 音程。
 * 核心是分清两件一直被人搞混的事：
 *   度数看的是字母（C 到 G 跨了五个字母 = 五度），
 *   音数看的是半音（C 到 G 是 7 个半音）。
 * 同一个键换个拼写，度数就变了：C→E♭ 是小三度，C→D♯ 是增二度。
 */

import { midiToHz, spellMidi, analyseInterval } from '../music/pitch.js';
import { createKeyboard } from './keyboard.js';
import { playNote, playChord, playSequence, stopAll } from '../audio/engine.js';

const LOW_FROM = 55;
const KB_TO = 84;
const MAX_SEMIS = 13;
const LETTER_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export function mountIntervalLab(root) {
  const state = { low: 60, semis: 7, flats: false };

  root.innerHTML = `
    <div class="card-head">
      <h2>音程实验台</h2>
      <p class="hint">点键盘换下方音，拖滑块换上方音</p>
    </div>
    <div class="kb-scroll" data-kb></div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <div class="field">
        <label for="il-semis">上方音在半音 <span data-semis-val></span> 处</label>
        <input id="il-semis" type="range" min="0" max="${MAX_SEMIS}" step="1" value="${state.semis}">
      </div>
    </div>
    <div class="lab-controls">
      <button class="btn btn-primary" type="button" data-play>同时响</button>
      <button class="btn" type="button" data-play-seq>先后响</button>
      <button class="btn" type="button" data-spell aria-pressed="false">用降号拼写</button>
    </div>
    <div class="lab-split" style="margin-top: var(--sp-5)">
      <div>
        <p class="hint" style="margin-top:0">从下方音往上数的半音格子</p>
        <div class="accent-bar" data-strip style="height:44px"></div>
        <p class="hint" data-stepnote></p>
      </div>
      <dl class="readout" data-readout></dl>
    </div>
  `;

  const el = {
    kbHost: root.querySelector('[data-kb]'),
    semis: root.querySelector('#il-semis'),
    semisVal: root.querySelector('[data-semis-val]'),
    strip: root.querySelector('[data-strip]'),
    readout: root.querySelector('[data-readout]'),
    stepnote: root.querySelector('[data-stepnote]'),
    spell: root.querySelector('[data-spell]'),
  };

  const kb = createKeyboard(el.kbHost, {
    from: LOW_FROM, to: KB_TO,
    ariaLabel: '音程实验台键盘',
    onDown(midi) {
      /**
       * 以前这里把下方音钳死在 KB_TO - MAX_SEMIS（= F♯4），
       * 结果 F♯4 右边的键点了没反应 —— 看起来像键盘坏了。
       * 现在：点哪儿就是哪儿；只有当上方音会被顶出键盘时，
       * 才把"半音数"收回来，并在下面说一句为什么。
       */
      const low = Math.max(LOW_FROM, Math.min(midi, KB_TO));
      state.low = low;
      if (low + state.semis > KB_TO) {
        state.semis = Math.max(0, KB_TO - low);
        el.semis.value = String(state.semis);
        el.stepnote.dataset.trimmed = '1';
      } else {
        el.stepnote.dataset.trimmed = '';
      }
      stopAll();
      playNote(midiToHz(state.low), { duration: 0.7 });
      paint();
    },
  });

  el.semis.addEventListener('input', () => {
    state.semis = Number(el.semis.value);
    paint();
  });

  el.spell.addEventListener('click', () => {
    state.flats = !state.flats;
    el.spell.setAttribute('aria-pressed', String(state.flats));
    paint();
  });

  root.querySelector('[data-play]').addEventListener('click', () => {
    stopAll();
    playChord([midiToHz(state.low), midiToHz(state.low + state.semis)],
      { duration: 1.4, level: 0.24 });
  });

  root.querySelector('[data-play-seq]').addEventListener('click', () => {
    stopAll();
    playSequence([midiToHz(state.low), midiToHz(state.low + state.semis)],
      { gap: 0.5, duration: 0.45 });
  });

  function paint() {
    const low = state.low;
    const high = low + state.semis;
    const iv = analyseInterval(low, high, state.flats);
    const lo = spellMidi(low, state.flats);
    const hi = spellMidi(high, state.flats);

    const letters = [];
    for (let k = 0; k < iv.degree; k++) letters.push(LETTER_NAMES[(lo.letterIndex + k) % 7]);

    kb.setHighlight([
      { midi: low, tone: 'amber' },
      { midi: high, tone: /纯/.test(iv.quality) ? 'green' : 'clay' },
    ]);

    el.semisVal.textContent = String(state.semis);
    el.strip.innerHTML = Array.from({ length: MAX_SEMIS }, (_, i) => {
      const on = i < state.semis;
      const bg = on ? (i === state.semis - 1 ? 'var(--green)' : 'var(--amber)') : 'var(--surface-3)';
      return `<span style="height:${on ? 100 : 8}%;background:${bg}"></span>`;
    }).join('');

    el.stepnote.innerHTML = `从 <b>${lo.name}</b> 走到 <b>${hi.name}</b>，` +
      `中间跨过 ${iv.degree} 个字母（${letters.join(' ')}），所以是 <b>${iv.degree} 度</b>；` +
      `一共 ${state.semis} 个半音，所以音数是 <b>${state.semis}</b>。` +
      (state.semis > 0 && iv.degree !== state.semis + 1
        ? '注意度数和半音数不是一回事。' : '') +
      (el.stepnote.dataset.trimmed === '1'
        ? `（刚才点的键太靠右上，上方音会被顶出键盘，所以半音数自动收到了 ${state.semis}。）` : '');

    el.readout.innerHTML = `
      <div><dt>度数</dt><dd>${iv.degree} 度</dd></div>
      <div><dt>音数</dt><dd>${iv.semis} 个半音</dd></div>
      <div><dt>性质</dt><dd>${iv.quality}</dd></div>
      <div><dt>全称</dt><dd>${iv.name}</dd></div>
      <div><dt>单音程 / 复音程</dt><dd>${iv.compound ? '复音程' : '单音程'}</dd></div>
      <div><dt>转位</dt><dd>${iv.inversion}</dd></div>
    `;
  }

  paint();
  return { kb };
}
