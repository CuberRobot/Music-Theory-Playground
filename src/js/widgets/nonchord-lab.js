/**
 * 第 14 节 · 和弦外音。
 *
 * 这是旋律与和声的接口：一条旋律不是每个音都属于和弦，
 * 但**强拍上的音通常是和弦音，外音出现在弱拍、而且多数是级进走进去再级进走出来**。
 * 判断类型靠的就是"前后邻居"这两件事。
 */

import { midiToHz, nameOfMidi, pitchClassOfMidi } from '../music/pitch.js';
import { playSequence } from '../audio/engine.js';
import { TEMPO } from '../audio/tempo.js';

const CHORD = [60, 64, 67];          // C 大三
const CHORD_PCS = new Set(CHORD.map(pitchClassOfMidi));
const RANGE_FROM = 60;
const RANGE_TO = 72;

/** 每个音的类型由前后邻居决定，不是由它自己决定。 */
function classify(seq, i) {
  const m = seq[i];
  if (m == null) return null;
  if (CHORD_PCS.has(pitchClassOfMidi(m))) return { key: 'chord', label: '和弦音' };
  const prev = seq[i - 1], next = seq[i + 1];
  const step = (a, b) => Math.abs(a - b) <= 2;
  const prevChord = prev != null && CHORD_PCS.has(pitchClassOfMidi(prev));
  const nextChord = next != null && CHORD_PCS.has(pitchClassOfMidi(next));
  if (prevChord && nextChord) {
    if (prev === next) return { key: 'neighbor', label: '辅助音' };
    if (step(prev, m) && step(m, next)) return { key: 'passing', label: '经过音' };
  }
  if (nextChord && (!prevChord || !step(prev, m)) && step(m, next)) {
    return { key: 'appoggiatura', label: '倚音' };
  }
  return { key: 'other', label: '外音' };
}

const PRESETS = [
  { label: '经过音', seq: [60, 62, 64, null, null, null, null, null],
    tip: 'C → D → E。D 不是和弦音，但它夹在两个和弦音之间、两边都是级进，这叫经过音。' },
  { label: '辅助音', seq: [64, 65, 64, null, null, null, null, null],
    tip: 'E → F → E。F 走上去又走回来，没去别的地方，这叫辅助音。' },
  { label: '倚音', seq: [65, 64, null, null, null, null, null, null],
    tip: 'F → E。F 不是和弦音，而且它是"跳进来、级进解决"的——倚音最典型的用法就是落在强拍上，制造一瞬间的紧张。' },
  { label: '混合', seq: [60, 62, 64, 65, 64, 67, 65, 64],
    tip: '一条八小节的旋律，自己读一遍每个音属于哪一类：和弦音、经过音、辅助音。' },
];

export function mountNonchordLab(root) {
  const state = { seq: new Array(8).fill(null), slot: 0 };

  root.innerHTML = `
    <div class="card-head">
      <h2>和弦外音分类台</h2>
      <p class="hint">和弦固定是 C 大三（C E G）。点键盘往格子里放音</p>
    </div>
    <div class="tiles" data-presets role="group" aria-label="预设例子"></div>
    <div class="nc-slots" data-slots style="margin-top:var(--sp-4)"></div>
    <div class="kb-scroll" data-kb style="margin-top:var(--sp-4)"></div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放这条旋律</button>
      <button class="btn" type="button" data-clear>清空</button>
      <button class="btn" type="button" data-chord>只听和弦</button>
    </div>
    <p class="hint" data-note></p>
  `;

  const el = {
    presets: root.querySelector('[data-presets]'),
    slots: root.querySelector('[data-slots]'),
    kb: root.querySelector('[data-kb]'),
    note: root.querySelector('[data-note]'),
  };

  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = p.label;
    b.addEventListener('click', () => {
      state.seq = [...p.seq];
      el.note.textContent = p.tip;
      paint();
    });
    el.presets.appendChild(b);
  });

  el.slots.addEventListener('click', (e) => {
    const s = e.target.closest('[data-slot]');
    if (!s) return;
    state.slot = Number(s.dataset.slot);
    paint();
  });

  // 简易键盘：只列本范围内的白键，够用且不占地方
  const keys = [];
  for (let m = RANGE_FROM; m <= RANGE_TO; m++) {
    if ([1, 3, 6, 8, 10].includes(m % 12)) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = nameOfMidi(m).replace(/\d/, '');
    b.dataset.midi = String(m);
    b.style.minWidth = '46px';
    b.addEventListener('click', () => {
      state.seq[state.slot] = m;
      state.slot = Math.min(7, state.slot + 1);
      paint();
    });
    el.kb.appendChild(b);
    keys.push(b);
  }

  root.querySelector('[data-clear]').addEventListener('click', () => {
    state.seq = new Array(8).fill(null); state.slot = 0; paint();
  });

  root.querySelector('[data-chord]').addEventListener('click', () => {
    playSequence(CHORD.map(midiToHz), { gap: 0.5, duration: 1.4, level: 0.2 });
  });

  root.querySelector('[data-play]').addEventListener('click', () => {
    const notes = state.seq.filter((m) => m != null);
    if (!notes.length) return;
    playSequence([...CHORD].map(midiToHz), { gap: 0.26, duration: 1.6, level: 0.17 });
    playSequence(notes.map(midiToHz), { gap: TEMPO.scale, duration: 0.45, level: 0.26, at: 0.9 });
  });

  function paint() {
    el.slots.innerHTML = state.seq.map((m, i) => {
      const k = classify(state.seq, i);
      const head = m == null ? '—' : nameOfMidi(m);
      const cls = k ? ` is-${k.key}` : '';
      return `<button type="button" class="nc-slot${cls}" data-slot="${i}"
        ${i === state.slot ? 'aria-current="true"' : ''}>
        <span class="nc-idx">${i + 1}</span>
        <span class="nc-name">${head}</span>
        <span class="nc-kind">${k ? k.label : ''}</span>
      </button>`;
    }).join('');

    [...el.kb.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(state.seq[state.slot] === Number(b.dataset.midi)));
    });

    if (!el.note.textContent) {
      el.note.textContent = '点上面的格子选位置，再点键盘放音。类型是自动判的 —— '
        + '它看的是这个音的前后邻居，不是它自己。';
    }
  }

  paint();
}
