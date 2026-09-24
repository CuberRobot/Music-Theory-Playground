/**
 * 第 29 节 · 曲式与结构。
 *
 * 形式的底层公式只有一句：**重复建立、对比更新、回归满足。**
 * 所有曲式都是这句话的不同兑现方式 —— 差别在于"重复几次、对比放在哪、最后回不回来"。
 *
 * 这一节把曲式做成积木：选一个模板，看段落序列，听一遍整体，
 * 并在地图上看见"哪些段落在重复、哪些是新东西"。
 */

import { midiToHz } from '../music/pitch.js';
import { diatonicSet, degreeMidi } from '../music/chords.js';
import { playChordSequence, playNote, hat, now, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';
import { TEMPO } from '../audio/tempo.js';

const TONIC = 48;
const PAD = spectrumToAmps('organ', 10);
const BAR = TEMPO.melody * 4;

/**
 * 每种曲式给一串段落。letter 相同 = 同一段材料；tone 决定它在图上画成什么颜色。
 * chords 是这一段的和弦级数（相对主音）。
 */
const FORMS = [
  {
    id: 'aaba',
    label: 'AABA（32 小节标准曲）',
    bars: [
      { letter: 'A', chords: [0, 5, 3, 4] }, { letter: 'A', chords: [0, 5, 3, 4] },
      { letter: 'B', chords: [3, 4, 1, 4] }, { letter: 'A', chords: [0, 5, 3, 4] },
    ],
    tip: 'A 说两遍建立起来，B 换一个地方走一趟（对比），最后回到 A 收尾。爵士标准曲和很多老流行歌都是它。注意 B 段不是新写的旋律 —— 通常是把 A 的材料换个高度或换个调。',
  },
  {
    id: 'verseChorus',
    label: '主歌–副歌',
    bars: [
      { letter: 'V', chords: [0, 5, 3, 4] }, { letter: 'C', chords: [3, 4, 0, 0] },
      { letter: 'V', chords: [0, 5, 3, 4] }, { letter: 'C', chords: [3, 4, 0, 0] },
    ],
    tip: '主歌负责说事、铺路，副歌负责爆发、被记住。它的动力来自"主歌没解决、副歌才解决"—— 所以主歌结尾常常不停在主和弦上。',
  },
  {
    id: 'blues12',
    label: '十二小节布鲁斯',
    bars: [
      { letter: 'A', chords: [0, 0, 0, 0] }, { letter: 'B', chords: [5, 5, 0, 0] },
      { letter: 'C', chords: [7, 5, 0, 7] },
    ],
    tip: '它不是靠段落对比，而是靠一条固定循环。每轮十二小节的骨架一样，差别全在演奏时怎么加花 —— 所以它能无限循环下去。第 22 节已经听过一次。',
  },
  {
    id: 'aba',
    label: 'ABA（三段体）',
    bars: [
      { letter: 'A', chords: [0, 5, 3, 4] }, { letter: 'B', chords: [3, 1, 4, 4] },
      { letter: 'A', chords: [0, 5, 3, 4] },
    ],
    tip: '古典里最常见的小型曲式。中间那段通常换调或换材料，回来的时候往往把 A 稍微改一下收束 —— 完全原样回来的很少。',
  },
  {
    id: 'through',
    label: '通谱（不做重复）',
    bars: [
      { letter: 'A', chords: [0, 5, 3, 4] }, { letter: 'B', chords: [3, 1, 4, 4] },
      { letter: 'C', chords: [1, 4, 0, 0] }, { letter: 'D', chords: [3, 4, 0, 0] },
    ],
    tip: '一段接一段全是新东西，不回头。适合叙事性内容，但代价很大：听者记不住任何一段。用它必须靠别的线索把人拴住（歌词、音色、织体）。',
  },
  {
    id: 'vamp',
    label: 'Vamp（一个循环到底）',
    bars: [
      { letter: 'A', chords: [0, 4] }, { letter: 'A', chords: [0, 4] },
      { letter: 'A', chords: [0, 4] }, { letter: 'A', chords: [0, 4] },
    ],
    tip: '和声完全不动，靠节奏、织体、音色的变化撑起整段。Fela Kuti、"So What"、大量电子乐都是这个思路。它把"重复建立"推到了极端。',
  },
  {
    id: 'ritornello',
    label: '里托内洛（巴洛克协奏曲）',
    bars: [
      { letter: 'R', chords: [0, 0, 5, 0] }, { letter: 'S', chords: [1, 4, 3, 1] },
      { letter: 'R', chords: [0, 0, 5, 0] }, { letter: 'S', chords: [5, 3, 4, 4] },
      { letter: 'R', chords: [0, 5, 0, 0] },
    ],
    tip: '巴洛克协奏曲的基本套路：乐队反复说同一段（R），中间插进独奏带来的新东西（S），来回几次；最后一次 R 通常不再原样照搬，而是留在主调上收束。维瓦尔第《四季》的每一个第一乐章都是这么搭起来的。',
  },
];

export function mountFormLab(root) {
  const state = { form: 'aaba', playing: false, timer: null };

  root.innerHTML = `
    <div class="card-head">
      <h2>曲式积木</h2>
      <p class="hint">选一种曲式，看段落怎么排、听整体怎么走</p>
    </div>
    <div class="tiles" data-forms role="group" aria-label="曲式"></div>
    <div data-map style="margin-top:var(--sp-5)"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放一遍</button>
      <span class="tag" data-now>—</span>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-tip></p>
  `;

  const el = {
    forms: root.querySelector('[data-forms]'),
    map: root.querySelector('[data-map]'),
    readout: root.querySelector('[data-readout]'),
    tip: root.querySelector('[data-tip]'),
    now: root.querySelector('[data-now]'),
  };

  FORMS.forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.dataset.id = f.id;
    b.textContent = f.label;
    b.addEventListener('click', () => { stop(); state.form = f.id; el.tip.textContent = ''; paint(); });
    el.forms.appendChild(b);
  });

  root.querySelector('[data-play]').addEventListener('click', () => { stop(); play(); });

  const form = () => FORMS.find((f) => f.id === state.form);
  const set = () => diatonicSet(TONIC + 12, 'major', 3);

  function stop() {
    state.playing = false;
    clearTimeout(state.timer);
    state.timer = null;
    stopAll();
  }

  function play() {
    stopAll();   // 上一次还没放完就先掐掉，不许叠着响
    const f = form();
    let at = 0;
    f.bars.forEach((bar) => {
      const chords = bar.chords.map((d) => set()[d].midis.map(midiToHz));
      playChordSequence(chords, { gap: BAR / chords.length, duration: BAR / chords.length * 0.8, amps: PAD, level: 0.15, at });
      // 每小节开头给一下低音，让段落边界听得出来。
      // 低音按音阶算，不能把级数下标当半音数（vi 是 A，不是 F）。
      const d0 = bar.chords[0];
      playNote(midiToHz(degreeMidi(TONIC, 'major', d0, d0 >= 3 ? 1 : 0)),
        { at, duration: BAR * 0.9, level: 0.24 });
      for (let i = 0; i < 8; i++) hat(at + (i / 2) * (BAR / 4), i % 2 ? 0.04 : 0.07);
      at += BAR;
    });
    const total = at;
    const start = now();
    state.playing = true;
    const tick = () => {
      if (!state.playing) return;
      const t = now() - start;
      if (t > total + 0.3) { stop(); paint(); return; }
      const idx = Math.min(f.bars.length - 1, Math.floor(t / BAR));
      [...el.map.children].forEach((c, k) => { c.style.outline = k === idx ? '2px solid var(--ink-1)' : 'none'; });
      state.timer = setTimeout(tick, 60);
    };
    tick();
  }

  function paint() {
    const f = form();
    [...el.forms.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state.form)));

    const letters = f.bars.map((b) => b.letter);
    const uniq = [...new Set(letters)];
    const KIND = { A: 'var(--amber)', B: 'var(--green)', C: 'var(--slate)', D: 'var(--clay)',
      V: 'var(--green)', R: 'var(--amber)', S: 'var(--green)', };

    el.map.innerHTML = '<div class="form-row">' + f.bars.map((b, i) =>
      '<div class="form-block" style="background:' + (KIND[b.letter] ?? 'var(--amber)') + '">'
      + '<span class="form-letter">' + b.letter + '</span>'
      + '<span class="form-bar">第 ' + (i + 1) + ' 段</span></div>').join('') + '</div>';

    const total = f.bars.length;
    const repeated = letters.filter((l, i) => letters.indexOf(l) !== i).length;
    el.now.textContent = f.label;
    el.readout.innerHTML = `
      <div><dt>段落数</dt><dd>${total}</dd></div>
      <div><dt>用了几种材料</dt><dd>${uniq.length} 种（${uniq.join('、')}）</dd></div>
      <div><dt>重复的段落</dt><dd>${repeated} 段</dd></div>
      <div><dt>最后一段是</dt><dd>${letters[letters.length - 1]} —— ${
        letters[letters.length - 1] === letters[0] ? '回到了开头，是收束' : '没有回到开头，是开放结尾'}</dd></div>
    `;
    if (!el.tip.textContent) el.tip.textContent = f.tip;
  }

  paint();
  return { stop };
}
