/**
 * 第 13 节 · 记谱法与常用记号。
 * 谱表是一把尺子：位置决定音高，形状决定长短。
 * 这里先让你把位置和键盘一一对上，再看力度、速度、装饰音这些记号。
 */

import { midiToHz, spellMidi } from '../music/pitch.js';
import { playNote, playSequence } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';

const W = 360;
const H = 132;
const X0 = 62;
const DX = 34;
const LINE_GAP = 12;
const BOTTOM_LINE = 84;   // 高音谱表最下面那条线 = E4
const PAD = spectrumToAmps('organ', 10);

/** 自然音级序号：C=0 D=1 E=2 … B=6，跨八度连续。 */
function diatonicIndex(midi) {
  const s = spellMidi(midi, false);
  return (s.octave - 4) * 7 + s.letterIndex;
}

export function mountNotationLab(root) {
  const state = { sel: 4 };

  root.innerHTML = `
    <div class="card-head">
      <h2>谱表是一把尺子</h2>
      <p class="hint">点谱表上的音符，看它对应键盘上哪个键</p>
    </div>
    <svg data-staff viewBox="0 0 ${W} ${H}" role="img"
      aria-label="五线谱上的 C 大调音阶位置"
      style="width:100%;height:auto;background:var(--surface-2);border-radius:var(--r-md)"></svg>
    <p class="hint" data-tip></p>

    <h3 style="font-family:var(--font-sans);font-size:var(--fs-body);font-weight:500;
      margin:var(--sp-6) 0 var(--sp-2)">常用记号，听一下差别</h3>
    <div class="tiles" data-terms></div>
    <p class="hint" data-term-tip></p>
  `;

  const el = {
    staff: root.querySelector('[data-staff]'),
    tip: root.querySelector('[data-tip]'),
    terms: root.querySelector('[data-terms]'),
    termTip: root.querySelector('[data-term-tip]'),
  };

  // ---- 谱表 ----

  const yOf = (midi) => BOTTOM_LINE - (diatonicIndex(midi) - 2) * (LINE_GAP / 2);

  el.staff.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-midi]');
    if (!hit) return;
    state.sel = Number(hit.dataset.midi);
    playNote(midiToHz(state.sel), { duration: 0.9, amps: PAD, level: 0.26 });
    paint();
  });

  function paint() {
    const parts = [];

    // 五条线
    for (let i = 0; i < 5; i++) {
      const y = BOTTOM_LINE - i * LINE_GAP;
      parts.push(`<line x1="30" y1="${y}" x2="${W - 24}" y2="${y}"
        stroke="var(--ink-3)" stroke-width="1.2"/>`);
    }
    // 谱号位置示意（不画真谱号，用文字标注，避免字形在不同系统上不统一）
    parts.push(`<text x="36" y="${BOTTOM_LINE - 26}" font-size="10" fill="var(--ink-4)"
      writing-mode="tb">高音谱表</text>`);

    const midis = [60, 62, 64, 65, 67, 69, 71, 72];
    midis.forEach((m, i) => {
      const x = X0 + i * DX;
      const y = yOf(m);
      const on = m === state.sel;
      if (m === 60) {
        parts.push(`<line x1="${x - 13}" y1="${y}" x2="${x + 13}" y2="${y}"
          stroke="var(--ink-3)" stroke-width="1.6"/>`);
      }
      parts.push(`<g data-midi="${m}" style="cursor:pointer">
        <rect x="${x - 15}" y="${y - 16}" width="30" height="32" fill="transparent"/>
        <ellipse cx="${x}" cy="${y}" rx="7" ry="5.4" transform="rotate(-20 ${x} ${y})"
          fill="${on ? 'var(--amber)' : 'var(--ink-1)'}"/>
        <line x1="${x + 6.2}" y1="${y}" x2="${x + 6.2}" y2="${y - 30}"
          stroke="${on ? 'var(--amber-deep)' : 'var(--ink-1)'}" stroke-width="1.6"/>
      </g>`);
    });

    // 键盘对照条
    const kbY = H - 16;
    [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72].forEach((m) => {
      const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
      const x = 30 + (m - 60) * 23;
      parts.push(`<rect x="${x}" y="${kbY - (isBlack ? 14 : 22)}" width="22"
        height="${isBlack ? 14 : 22}" rx="2"
        fill="${m === state.sel ? 'var(--amber)' : isBlack ? 'var(--ink-1)' : 'var(--surface)'}"
        stroke="var(--line-strong)" stroke-width="1"/>`);
    });

    el.staff.innerHTML = parts.join('');

    const sel = state.sel;
    const s = spellMidi(sel, false);
    const idx = diatonicIndex(sel) - 2;   // 相对最下面那条线
    const where = idx === 0 ? '最下面那条线上'
      : idx === 8 ? '最上面那条线上'
        : idx % 2 === 0 ? `从下往上第 ${idx / 2 + 1} 条线上`
          : `从下往上第 ${Math.ceil(idx / 2)} 间里`;

    el.tip.innerHTML = `<b>${s.name}</b> 在谱表上的位置：${where}。`
      + (idx === -2 ? '它下面还加了一条短线，这条线叫加线。' : '')
      + ' 位置决定音高，符头的形状和符尾决定长短。';
  }

  // ---- 常用记号 ----

  const TERMS = [
    { label: '弱奏 p', tip: 'p 是 piano，弱。和 f 的差别是音量，不是音高。',
      run: () => playNote(midiToHz(67), { duration: 1.1, amps: PAD, level: 0.07 }) },
    { label: '强奏 f', tip: 'f 是 forte，强。同一个音，只是力度变了。',
      run: () => playNote(midiToHz(67), { duration: 1.1, amps: PAD, level: 0.34 }) },
    { label: '慢速 Adagio', tip: '速度记号写的是每分钟多少拍，不是"快慢的感觉"。Adagio 约每分钟 66 拍。',
      run: () => playSequence([60, 62, 64, 65, 67].map(midiToHz), { gap: 0.9, duration: 0.7, amps: PAD }) },
    { label: '快速 Allegro', tip: 'Allegro 约每分钟 132 拍，是慢速的一半间隔——音符本身没变，只是走得快。',
      run: () => playSequence([60, 62, 64, 65, 67].map(midiToHz), { gap: 0.45, duration: 0.34, amps: PAD }) },
    { label: '不加装饰', tip: '先听原样。',
      run: () => playNote(midiToHz(72), { duration: 1.1, amps: PAD, level: 0.26 }) },
    { label: '加颤音 tr', tip: '颤音是在本音和上方邻音之间快速交替。它写在谱上是一个 tr，听起来是一串装饰。',
      run: () => {
        const seq = [];
        for (let i = 0; i < 8; i++) seq.push(midiToHz(i % 2 ? 74 : 72));
        playSequence(seq, { gap: 0.09, duration: 0.07, amps: PAD, level: 0.22 });
      } },
  ];

  TERMS.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = t.label;
    b.addEventListener('click', () => {
      t.run();
      el.termTip.textContent = t.tip;
      [...el.terms.children].forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
    });
    el.terms.appendChild(b);
  });

  paint();
}
