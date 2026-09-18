/**
 * 第 7、8 节 · 三和弦与七和弦。
 * 和弦不是背下来的四种，是叠两个三度叠出来的结果。
 * 改变每一层三度的大小，四种三和弦自然就长出来了。
 */

import { midiToHz, spellMidi } from '../music/pitch.js';
import { TRIADS, SEVENTHS, identify, invert, inversionLabel } from '../music/chords.js';
import { createKeyboard } from './keyboard.js';
import { playChord, playSequence } from '../audio/engine.js';

const FROM = 55;
const TO = 79;
const THIRDS = [
  { label: '大三度', semis: 4 },
  { label: '小三度', semis: 3 },
];
const FIFTHS = [
  { label: '纯五度', semis: 7 },
  { label: '减五度', semis: 6 },
  { label: '增五度', semis: 8 },
];
const SEVENTHS_OPT = [
  { label: '大七度', semis: 11 },
  { label: '小七度', semis: 10 },
  { label: '减七度', semis: 9 },
];

export function mountChordBuilder(root, opts = {}) {
  // data-size="4" 变成七和弦模式，第 8 节复用同一个实验台
  const size = String(opts.size) === '4' ? 4 : 3;
  const state = { rootMidi: 60, third: 4, fifth: 7, seventh: 10, inversion: 0, flats: false };

  root.innerHTML = `
    <div class="card-head">
      <h2>${size === 4 ? '七和弦堆叠台' : '三和弦堆叠台'}</h2>
      <p class="hint">点键盘换根音，然后改每一层是三度</p>
    </div>
    <div class="kb-scroll" data-kb></div>
    <div class="lab-split" style="margin-top: var(--sp-5)">
      <div>
        <p class="hint" style="margin:0 0 6px">从根音往上叠</p>
        <div class="tiles" data-third></div>
        <div class="tiles" data-fifth style="margin-top:6px"></div>
        <div class="tiles" data-seventh style="margin-top:6px"></div>
        <p class="hint" style="margin:var(--sp-4) 0 6px">转位</p>
        <div class="tiles" data-inv></div>
      </div>
      <dl class="readout" data-readout></dl>
    </div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>同时响</button>
      <button class="btn" type="button" data-arp>分解响</button>
      <button class="btn" type="button" data-spell aria-pressed="false">用降号拼写</button>
    </div>
    <p class="hint" data-note></p>
  `;

  const el = {
    kbHost: root.querySelector('[data-kb]'),
    third: root.querySelector('[data-third]'),
    fifth: root.querySelector('[data-fifth]'),
    seventh: root.querySelector('[data-seventh]'),
    inv: root.querySelector('[data-inv]'),
    readout: root.querySelector('[data-readout]'),
    note: root.querySelector('[data-note]'),
    spell: root.querySelector('[data-spell]'),
  };

  if (size === 3) el.seventh.style.display = 'none';

  function baseMidis() {
    const out = [state.rootMidi, state.rootMidi + state.third, state.rootMidi + state.fifth];
    if (size === 4) out.push(state.rootMidi + state.seventh);
    return out;
  }
  function chordMidis() {
    return invert(baseMidis(), state.inversion);
  }

  const kb = createKeyboard(el.kbHost, {
    from: FROM, to: TO,
    ariaLabel: '和弦实验台键盘',
    onDown(midi) {
      state.rootMidi = midi;
      state.inversion = 0;
      playChord(chordMidis().map(midiToHz), { duration: 1.4, level: 0.18 });
      paint();
    },
  });

  function makeGroup(host, list, prop) {
    list.forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.textContent = o.label;
      b.dataset.semis = String(o.semis);
      b.addEventListener('click', () => {
        state[prop] = o.semis;
        state.inversion = 0;
        playChord(chordMidis().map(midiToHz), { duration: 1.3, level: 0.18 });
        paint();
      });
      host.appendChild(b);
    });
  }
  makeGroup(el.third, THIRDS, 'third');
  makeGroup(el.fifth, FIFTHS, 'fifth');
  makeGroup(el.seventh, SEVENTHS_OPT, 'seventh');

  const INV_NAMES = ['原位', '第一转位', '第二转位', '第三转位'];
  for (let i = 0; i < size; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = INV_NAMES[i];
    b.dataset.inv = String(i);
    b.addEventListener('click', () => {
      state.inversion = i;
      playChord(chordMidis().map(midiToHz), { duration: 1.3, level: 0.18 });
      paint();
    });
    el.inv.appendChild(b);
  }

  el.spell.addEventListener('click', () => {
    state.flats = !state.flats;
    el.spell.setAttribute('aria-pressed', String(state.flats));
    paint();
  });

  root.querySelector('[data-play]').addEventListener('click', () => {
    playChord(chordMidis().map(midiToHz), { duration: 1.5, level: 0.18 });
  });
  root.querySelector('[data-arp]').addEventListener('click', () => {
    playSequence(chordMidis().map(midiToHz), { gap: 0.26, duration: 0.5, level: 0.22 });
  });

  function paint() {
    const midis = chordMidis();
    const base = baseMidis();
    const id = identify(base, size === 4 ? SEVENTHS : TRIADS);
    const tense = id ? /减|增/.test(id.key) : true;

    kb.setHighlight(midis.map((m, i) => ({
      midi: m,
      tone: i === 0 ? 'amber' : (tense ? 'clay' : 'green'),
    })));

    [['third', el.third], ['fifth', el.fifth], ['seventh', el.seventh]].forEach(([prop, host]) => {
      [...host.children].forEach((b) => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.semis) === state[prop]));
      });
    });
    [...el.inv.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.inv) === state.inversion));
    });

    const noOctave = (m) => spellMidi(m, state.flats).name.replace(/-?\d+$/, '');
    const degree = (list, v) => list.find((x) => x.semis === v);

    el.readout.innerHTML = `
      <div><dt>根音</dt><dd>${spellMidi(state.rootMidi, state.flats).name}</dd></div>
      <div><dt>构成音</dt><dd>${base.map(noOctave).join(' - ')}</dd></div>
      <div><dt>和弦性质</dt><dd>${id ? id.label : '不是常规和弦'}</dd></div>
      <div><dt>转位</dt><dd>${inversionLabel(size, state.inversion)}</dd></div>
      <div><dt>实际排列</dt><dd>${midis.map((m) => spellMidi(m, state.flats).name).join(' ')}</dd></div>
    `;

    el.note.textContent = id
      ? `根音往上叠一个${degree(THIRDS, state.third).label}和一个${degree(FIFTHS, state.fifth).label}`
        + (size === 4 ? `，再叠一个${degree(SEVENTHS_OPT, state.seventh).label}` : '')
        + `，得到${id.label}。`
      : '这个组合不是常规和弦。三度叠置要求两个三度都是大或小，五度只能是纯、减、增。';
  }

  paint();
  return { kb };
}
