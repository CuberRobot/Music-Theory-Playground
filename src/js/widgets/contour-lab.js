/**
 * 第 24 节 · 旋律的轮廓。
 *
 * 上一节讲怎么把一个动机变形撑开，这一节讲撑开之后它得**有形状**。
 * 轮廓就是把它画成一条线之后看到的起伏。
 *
 * 两条最有用的经验：
 *   1. 级进为主、跳进点缀。全是级进会平，全是跳进唱不动。
 *   2. **跳进之后用反向的级进填回来** —— 这是最老的旋律法则之一。
 */

import { midiToHz, nameOfMidi } from '../music/pitch.js';
import { playNote } from '../audio/engine.js';
import { createNoteStrip } from '../audio/transport.js';
import { TEMPO } from '../audio/tempo.js';

const SLOTS = 8;
const FROM = 57;   // A3
const TO = 76;     // E5

const PRESETS = [
  { label: '拱形', notes: [60, 62, 64, 65, 67, 65, 64, 62],
    tip: '最经典的旋律形状：上去、到顶、再下来。最高音落在第 5 个音，也就是全长的 62% 处 —— 正文说的"三分之二前后"。' },
  { label: '单调上行', notes: [60, 62, 64, 65, 67, 69, 71, 72],
    tip: '八个音一路往上。它没有形状，只有方向 —— 听两遍就腻了。这不是"错"，但它是所有写法里最容易被听腻的一种。' },
  { label: '跳进后填回来', notes: [60, 67, 65, 64, 62, 60, 62, 64],
    tip: '先跳上去（纯五度），再用反向的级进一步步填回来。这是最老的旋律法则之一，也是让跳进听起来"站得住"的办法。' },
  { label: '全是跳进', notes: [60, 64, 60, 67, 60, 64, 60, 67],
    tip: '全是三度以上的跳。听起来像号角，有力量，但很难唱 —— 因为人的嗓子更擅长级进。' },
];

const STEP_NAMES = {
  0: '同音', 1: '小二度', 2: '大二度', 3: '小三度', 4: '大三度',
  5: '纯四度', 6: '增四度', 7: '纯五度', 8: '小六度', 9: '大六度',
  10: '小七度', 11: '大七度', 12: '八度',
};

export function mountContourLab(root) {
  const state = { notes: [...PRESETS[0].notes], slot: 0 };

  root.innerHTML = `
    <div class="card-head">
      <h2>旋律轮廓台</h2>
      <p class="hint">点格子选位置，再点键盘放音；下面的数字会跟着变</p>
    </div>
    <div class="tiles" data-presets role="group" aria-label="预设轮廓"></div>
    <div class="nc-slots" data-slots style="margin-top:var(--sp-4)"></div>
    <div class="kb-scroll" data-kb style="margin-top:var(--sp-4)"></div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放</button>
      <button class="btn" type="button" data-clear>清空</button>
      <span class="tag" data-now>—</span>
    </div>
    <div data-strip style="margin-top:var(--sp-4)"></div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-tip></p>
  `;

  const el = {
    presets: root.querySelector('[data-presets]'),
    slots: root.querySelector('[data-slots]'),
    kb: root.querySelector('[data-kb]'),
    stripHost: root.querySelector('[data-strip]'),
    readout: root.querySelector('[data-readout]'),
    tip: root.querySelector('[data-tip]'),
    now: root.querySelector('[data-now]'),
  };

  const strip = createNoteStrip(el.stripHost, { ariaLabel: '这条旋律的音高与播放进度' });

  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = p.label;
    b.addEventListener('click', () => {
      state.notes = [...p.notes];
      el.tip.textContent = p.tip;
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

  for (let m = FROM; m <= TO; m++) {
    if ([1, 3, 6, 8, 10].includes(m % 12)) continue;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile';
    b.textContent = nameOfMidi(m).replace(/\d/, '');
    b.dataset.midi = String(m);
    b.style.minWidth = '44px';
    b.addEventListener('click', () => {
      state.notes[state.slot] = m;
      state.slot = Math.min(SLOTS - 1, state.slot + 1);
      playNote(midiToHz(m), { duration: 0.7, level: 0.26 });
      el.tip.textContent = '';   // 手动改过之后，改由自动分析来说
      paint();
    });
    el.kb.appendChild(b);
  }

  root.querySelector('[data-clear]').addEventListener('click', () => {
    state.notes = new Array(SLOTS).fill(null);
    state.slot = 0;
    el.tip.textContent = '';
    paint();
  });

  root.querySelector('[data-play]').addEventListener('click', play);

  function timeline() {
    return state.notes
      .map((m, i) => (m == null ? null : {
        midi: m, start: i * TEMPO.scale, dur: TEMPO.scale * 0.88, label: nameOfMidi(m),
      }))
      .filter(Boolean);
  }

  function play() {
    const tl = timeline();
    if (!tl.length) return;
    strip.load(tl);
    strip.play((midi, at, dur) => playNote(midiToHz(midi), {
      at, duration: Math.max(0.2, dur), level: 0.26,
    }));
  }

  /** 轮廓的三个指标：级进跳进的比例、最高音落在哪、音域多宽。 */
  function analyse(notes) {
    const s = notes.filter((m) => m != null);
    if (s.length < 2) return null;
    let steps = 0;
    let leaps = 0;
    const ivs = [];
    for (let i = 1; i < s.length; i++) {
      const d = s[i] - s[i - 1];
      ivs.push(d);
      if (Math.abs(d) <= 2) steps++; else leaps++;
    }
    const hi = Math.max(...s);
    const peak = s.indexOf(hi);
    const range = hi - Math.min(...s);
    // 跳进后面有没有反向级进填回来
    let filled = 0;
    let unfilled = 0;
    for (let i = 0; i < ivs.length - 1; i++) {
      if (Math.abs(ivs[i]) >= 3) {
        if (Math.sign(ivs[i + 1]) === -Math.sign(ivs[i]) && Math.abs(ivs[i + 1]) <= 2) filled++;
        else unfilled++;
      }
    }
    return { n: s.length, steps, leaps, hi, peak, range, filled, unfilled, ivs };
  }

  function paint() {
    el.slots.innerHTML = state.notes.map((m, i) => `
      <button type="button" class="nc-slot" data-slot="${i}"
        ${i === state.slot ? 'aria-current="true"' : ''}>
        <span class="nc-idx">${i + 1}</span>
        <span class="nc-name">${m == null ? '—' : nameOfMidi(m)}</span>
      </button>`).join('');

    [...el.kb.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(state.notes[state.slot] === Number(b.dataset.midi)));
    });

    strip.load(timeline());

    const a = analyse(state.notes);
    if (!a) {
      el.readout.innerHTML = '<div><dt>先放几个音</dt><dd>—</dd></div>';
      el.now.textContent = '—';
      return;
    }
    const peakPct = Math.round(((a.peak + 1) / a.n) * 100);
    el.now.textContent = `${a.n} 个音`;
    el.readout.innerHTML = `
      <div><dt>音数</dt><dd>${a.n}</dd></div>
      <div><dt>级进 / 跳进</dt><dd>${a.steps} / ${a.leaps}</dd></div>
      <div><dt>最高音落在</dt><dd>第 ${a.peak + 1} 个音（全长 ${peakPct}% 处）</dd></div>
      <div><dt>音域</dt><dd>${a.range} 个半音</dd></div>
      <div><dt>跳进后被填回来的</dt><dd>${a.filled} 处，没填的 ${a.unfilled} 处</dd></div>
    `;

    // 给一句判断，而不是只给数字
    const notes = [];
    if (a.leaps === 0) notes.push('全是级进：平滑、好唱，但缺少起伏，容易显得平。');
    else if (a.steps === 0) notes.push('全是跳进：像号角，有力量，但很难唱 —— 人的嗓子更擅长级进。');
    else if (a.leaps > a.steps) notes.push('跳进偏多：有棱角，但要注意跳完之后有没有填回来。');
    else notes.push('级进为主、跳进点缀 —— 这是最常见的搭配。');
    if (a.unfilled > a.filled && a.leaps > 0) notes.push('有几处跳进之后没有反向级进填回来，听起来会"悬着"。');
    if (peakPct >= 55 && peakPct <= 80) notes.push('最高音落在三分之二前后，这是最舒服的位置。');
    else if (a.peak === a.n - 1) notes.push('最高音在最后一个音 —— 高潮放在结尾，适合收束，但不适合当乐句的中段。');
    if (!el.tip.textContent) el.tip.textContent = notes.join('');
  }

  paint();
}
