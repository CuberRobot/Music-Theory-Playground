/**
 * R · King Crimson《Discipline》· 交错织体台
 *
 * 这一节的题目是"织体"，而这首曲子是最好用的样本：
 * **没有任何一个人演奏完整的音乐。** 两把吉他、Stick、鼓各拿一块拼图，
 * 音乐只存在于它们的组合里。把任意一层拿掉，剩下的都只是片段。
 *
 * 下面这个格子是本站自己写的**示意素材**（不是原曲，也不抄它的动机）：
 * 十格 = 两小节 5/8，四层各自占几格，合起来正好填满每一格 ——
 * 这就是"交错"（interlocking / hocket）最干净的演示。
 *
 * 关于原曲的拍号：本节不替你下结论。1981 年的曲子没有公版谱，
 * 而数出它的循环长度本来就是这一节留给你做的练习。
 */

import { midiToHz } from '../music/pitch.js';
import { playNote, playPluck, click, hat, preloadPluck, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';

const BPM = 160;                       // 四分音符；下面一格是八分音符
const SLOT = 60 / BPM / 2;             // 一格（八分音符）多少秒
const BARS = 2;
const SLOTS = 10;                      // 两小节 × 5/8
const CYCLES = 4;                      // 循环几轮
const STICK = spectrumToAmps('saw', 10);

/**
 * 四层。slots 是"第几格发声"，midis 和 slots 一一对应。
 * 四层的 slots 合起来必须正好盖满 0..9 —— 审计脚本会核对这件事，
 * 因为"交错"的全部意思就在这一条上。
 */
export const INTERLOCK = {
  bpm: BPM,
  slots: SLOTS,
  bars: BARS,
  meter: '5/8（示意用，不是对原曲拍号的主张）',
  layers: [
    {
      id: 'gtrA', label: '吉他 A', note: '挑弦的分解音型',
      slots: [0, 2, 3, 5, 7, 8], midis: [76, 72, 74, 76, 72, 74],
      why: '这一层看起来像"主旋律"，其实不是：十格里它只占六格，其余时间是空的。单独听它，会听见一堆断断续续的点。',
    },
    {
      id: 'gtrB', label: '吉他 B', note: '专填空隙',
      slots: [1, 4, 9], midis: [69, 71, 67],
      why: '第二把吉他不弹同一句话，只负责填第一把留下的空档。两层咬在一起，才出现接近连续的音流——但即使两层都在，第 7 格还是空的，那是留给下面两层的位置。',
    },
    {
      id: 'stick', label: 'Stick', note: '低音与中音的点',
      slots: [0, 6, 8], midis: [45, 43, 50],
      why: 'Chapman Stick 一只手按低音、一只手点中音，它是这套织体的地基——没有它，上面两层会浮起来。',
    },
    {
      id: 'drums', label: '鼓', note: '电子鼓的固定型',
      slots: [2, 5, 9], midis: [null, null, null],
      why: '鼓不跟着吉他走，它给的是另一条循环。织体里最容易被忽略的一层，往往是决定"稳不稳"的那一层。',
    },
  ],
};

export function mountInterlockLab(root) {
  const state = {
    on: Object.fromEntries(INTERLOCK.layers.map((l) => [l.id, true])),
    playing: false,
    timer: null,
    cursor: -1,
  };

  root.innerHTML = `
    <div class="card-head">
      <h2>交错织体台</h2>
      <p class="hint">四层各自只占几格，合起来正好填满每一格</p>
    </div>
    <p class="hint" style="margin-top:0">
      下面十格 = 两小节 ${INTERLOCK.meter}，速度 <b>♩=${BPM}</b>。
      <b>这是本站自己写的示意素材，不是原曲</b>；它演示的是"交错"这件事本身：
      任何一层单独拿出来都不成立，四层合起来才是一段音乐。
      点层名可以关掉它——听听同一段音乐怎么塌成片段。
    </p>
    <div data-grid class="afro-grid" aria-label="十格交错图"></div>
    <div class="tiles" data-layers style="margin-top:var(--sp-4)" role="group" aria-label="声部开关"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放</button>
      <button class="btn" type="button" data-only-gtr>只留两把吉他</button>
      <button class="btn" type="button" data-only-rhythm>只留节奏组</button>
      <button class="btn" type="button" data-all>全部打开</button>
      <button class="btn" type="button" data-stop>停</button>
    </div>
    <p class="hint" data-why style="min-height:1.6em"></p>
    <dl class="readout" data-readout></dl>
  `;

  const el = {
    grid: root.querySelector('[data-grid]'),
    layers: root.querySelector('[data-layers]'),
    why: root.querySelector('[data-why]'),
    readout: root.querySelector('[data-readout]'),
  };

  // 格子图：每层一行，十格
  el.grid.innerHTML = INTERLOCK.layers.map((l) => {
    const cells = Array.from({ length: SLOTS }, (_, s) => {
      const on = l.slots.includes(s);
      const bar = s === 0 || s === 5 ? ' beat' : '';
      return `<i class="${on ? 'on' : ''}${bar}" data-cell="${l.id}:${s}"></i>`;
    }).join('');
    return `<div class="afro-row"><span class="afro-name">${l.label}</span>
      <span class="afro-cells">${cells}</span></div>`;
  }).join('');

  INTERLOCK.layers.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = `${l.label}（${l.note}）`;
    b.dataset.layer = l.id;
    b.addEventListener('click', () => {
      state.on[l.id] = !state.on[l.id];
      el.why.textContent = state.on[l.id] ? `${l.label}：${l.why}` : `${l.label} 已关掉。`;
      paint();
      if (state.playing) play();     // 播放中改动就重来一轮，听得清楚
    });
    el.layers.appendChild(b);
  });

  const cycleSecs = SLOTS * SLOT;

  function play() {
    stopAll();                       // 上一次还没放完就先掐掉
    preloadPluck();
    for (let c = 0; c < CYCLES; c++) {
      // 每一轮的音排在同一根时间轴上
      const offset = c * cycleSecs;
      INTERLOCK.layers.forEach((l) => {
        if (!state.on[l.id]) return;
        l.slots.forEach((s, i) => {
          const at = offset + s * SLOT;
          if (l.id === 'drums') {
            if (i < 2) click(at, { freq: 72, level: 0.24 });
            else hat(at, 0.11, 0.06);
            return;
          }
          const hz = midiToHz(l.midis[i]);
          if (l.id === 'stick') {
            playNote(hz, { at, duration: SLOT * 2.2, level: 0.2, amps: STICK, decay: 0.6 });
          } else {
            playPluck(hz, { at, duration: 0.5, level: 0.2, brightness: 0.6 });
          }
        });
      });
    }

    // 游标：让人看得见现在走到第几格（上一批的教训：播放必须有指示）
    state.playing = true;
    clearInterval(state.timer);
    const t0 = performance.now();
    state.timer = setInterval(() => {
      const elapsed = (performance.now() - t0) / 1000;
      if (elapsed >= CYCLES * cycleSecs) { stop(); return; }
      const s = Math.floor((elapsed % cycleSecs) / SLOT);
      if (s !== state.cursor) { state.cursor = s; paint(); }
    }, 30);
    paint();
  }

  function stop() {
    state.playing = false;
    clearInterval(state.timer);
    state.timer = null;
    state.cursor = -1;
    stopAll();
    paint();
  }

  root.querySelector('[data-play]').addEventListener('click', play);
  root.querySelector('[data-stop]').addEventListener('click', stop);
  root.querySelector('[data-all]').addEventListener('click', () => {
    INTERLOCK.layers.forEach((l) => { state.on[l.id] = true; });
    el.why.textContent = '四层都在：十格被填满，这是这套织体本来的样子。';
    paint();
    if (state.playing) play();
  });
  root.querySelector('[data-only-gtr]').addEventListener('click', () => {
    state.on = { gtrA: true, gtrB: true, stick: false, drums: false };
    el.why.textContent = '只留两把吉他：两层的空隙露出来了，你会听见"点"而不是"线"。';
    paint();
    if (state.playing) play();
  });
  root.querySelector('[data-only-rhythm]').addEventListener('click', () => {
    state.on = { gtrA: false, gtrB: false, stick: true, drums: true };
    el.why.textContent = '只留节奏组：没有和声与旋律，同一段音乐立刻变成"光秃秃的骨架"。';
    paint();
    if (state.playing) play();
  });

  function paint() {
    [...el.layers.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(!!state.on[b.dataset.layer]));
    });
    INTERLOCK.layers.forEach((l) => {
      l.slots.forEach((s) => {
        const cell = el.grid.querySelector(`[data-cell="${l.id}:${s}"]`);
        if (!cell) return;
        const on = state.on[l.id];
        cell.classList.toggle('on', on);
        cell.classList.toggle('muted', !on);
        cell.classList.toggle('now', state.playing && s === state.cursor && on);
      });
    });
    const live = INTERLOCK.layers.filter((l) => state.on[l.id]);
    const covered = new Set();
    live.forEach((l) => l.slots.forEach((s) => covered.add(s)));
    el.readout.innerHTML = `
      <div><dt>现在响的层</dt><dd>${live.length} / ${INTERLOCK.layers.length}</dd></div>
      <div><dt>十格被填满了几格</dt><dd class="${covered.size === SLOTS ? 'hi' : 'lo'}">${covered.size} / ${SLOTS}</dd></div>
      <div><dt>循环长度</dt><dd>${BARS} 小节 × ${SLOTS / BARS} 格 = ${SLOTS} 格（${cycleSecs.toFixed(2)} 秒）</dd></div>
      <div><dt>状态</dt><dd>${state.playing ? `第 ${state.cursor + 1} 格` : '停止'}</dd></div>
    `;
  }

  paint();
  return { play, stop };
}
