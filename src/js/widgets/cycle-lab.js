/**
 * S · Tool《Lateralus》· 小节长度台
 *
 * 这首曲子最好讲的一处，是一个 Drummond 式的"笨"办法：
 * **同一句东西，换一个长度的盒子装它。**
 * 副歌的小节在 9/8、8/8、7/8 之间轮换 —— 吉他照样弹那句旋律，
 * 但每一句的落脚点越来越早，句子一次比一次被"挤"短。
 *
 * 这个实验台有两种模式：
 *   A · 按原曲的做法：同一句九拍的动机，依次装进 9、8、7 的盒子。
 *   B · 三条一起跑：9、8、7 三条循环同时进行，看它们多久才重合一次。
 *       （答案在读数里：504 个八分音符，因为 504 是 9、8、7 的最小公倍数。）
 *
 * 素材说明：动机是本站自己写的示意素材，不是原曲的旋律。
 * 原曲的拍号变化（9/8 → 8/8 → 7/8）与 Carey 的"9-8-7 原来是斐波那契第 16 个数"
 * 出自英文维基百科 Lateralus (song) 条目所引的访谈。
 */

import { midiToHz } from '../music/pitch.js';
import { playNote, click, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';

const BPM = 132;                       // 四分音符；一格是八分音符
const SLOT = 60 / BPM / 2;             // 一格（八分音符）多少秒
const AMP = spectrumToAmps('trumpet', 10);

/** 九格的动机（示意素材）。装进更短的盒子时，尾巴被切掉——这正是要听的东西。 */
const MOTIF = [52, 55, 59, 62, 59, 57, 55, 52, 50];

export const CYCLE = {
  bpm: BPM,
  motif: MOTIF,
  meters: [9, 8, 7],
  /** 三条循环同时跑时，多久重合一次：最小公倍数。 */
  alignAfter: [9, 8, 7].reduce((a, b) => lcm(a, b)),
};

function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function lcm(a, b) { return (a * b) / gcd(a, b); }

export function mountCycleLab(root) {
  const state = { mode: 'rebar', playing: false, timer: null, row: -1, col: -1 };

  root.innerHTML = `
    <div class="card-head">
      <h2>小节长度台</h2>
      <p class="hint">同一句旋律，装进 9、8、7 三种长度的盒子</p>
    </div>
    <p class="hint" style="margin-top:0">
      <b>素材是本站自己写的示意</b>（不是原曲旋律），速度 <span class="note" role="img" aria-label="四分音符"></span>=${BPM}，
      一格 = 一个八分音符。两种模式听起来完全不同：
      一种是"句子被越挤越短"，一种是"三条循环互相错开"。
    </p>
    <div class="seg" data-mode role="group" aria-label="模式">
      <button class="btn" type="button" data-set="rebar" aria-pressed="true">A · 依次换盒子</button>
      <button class="btn" type="button" data-set="stack" aria-pressed="false">B · 三条一起跑</button>
    </div>
    <div data-grid class="afro-grid" style="margin-top:var(--sp-4)" aria-label="三种小节长度的落点"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放</button>
      <button class="btn" type="button" data-stop>停</button>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-tip style="min-height:1.6em"></p>
  `;

  const el = {
    grid: root.querySelector('[data-grid]'),
    readout: root.querySelector('[data-readout]'),
    tip: root.querySelector('[data-tip]'),
  };

  const rows = () => CYCLE.meters.map((m) => ({
    meter: m,
    cells: Array.from({ length: m }, (_, i) => i),
  }));

  function paint() {
    el.grid.innerHTML = rows().map((r) => {
      const cells = r.cells.map((i) => {
        const on = i < MOTIF.length;
        const isRow = r.meter === CYCLE.meters[state.row];
        const now = state.playing && isRow && i === state.col ? ' now' : '';
        return `<i class="${on ? 'on' : ''}${now}" data-cell="${r.meter}:${i}"></i>`;
      }).join('');
      return `<div class="afro-row"><span class="afro-name">${r.meter}/8</span>
        <span class="afro-cells">${cells}</span></div>`;
    }).join('');

    [...root.querySelector('[data-mode]').children].forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.set === state.mode));
    });

    const barSecs = CYCLE.meters.map((m) => (m * SLOT).toFixed(2)).join(' / ');
    el.readout.innerHTML = state.mode === 'rebar'
      ? `
        <div><dt>模式</dt><dd>同一句动机，依次装进 9、8、7</dd></div>
        <div><dt>三种小节各多长</dt><dd>${barSecs} 秒</dd></div>
        <div><dt>动机的长度</dt><dd>9 格 —— 所以装进 8 和 7 时，尾巴被切掉</dd></div>
        <div><dt>状态</dt><dd>${state.playing ? `${CYCLE.meters[state.row]}/8 的第 ${state.col + 1} 格` : '停止'}</dd></div>`
      : `
        <div><dt>模式</dt><dd>9、8、7 三条循环同时进行</dd></div>
        <div><dt>多久重合一次</dt><dd class="hi">${CYCLE.alignAfter} 个八分音符（约 ${(CYCLE.alignAfter * SLOT).toFixed(1)} 秒）</dd></div>
        <div><dt>为什么是这个数</dt><dd>504 是 9、8、7 的最小公倍数</dd></div>
        <div><dt>状态</dt><dd>${state.playing ? `第 ${state.col + 1} 格` : '停止'}</dd></div>`;

    el.tip.textContent = state.mode === 'rebar'
      ? '注意每一句的落脚点：盒子越短，"落"得越早。原曲副歌用的就是这一招——吉他没变，盒子变了。'
      : '三条线各走各的，只有走到 504 格才全部回到起点。这也是"循环"和"节拍"的区别：节拍每一下都在，循环要很久才回来一次。';
  }

  function play() {
    stopAll();
    state.playing = true;
    const total = state.mode === 'rebar' ? 9 + 8 + 7 : 9 * 3;
    let t = 0;

    for (let i = 0; i < total; i++) {
      if (state.mode === 'rebar') {
        const meter = CYCLE.meters[Math.floor(i / 9) % 3];
        const idx = i % 9;
        if (idx < meter) {
          playNote(midiToHz(MOTIF[idx]), { at: t, duration: SLOT * 0.9, level: 0.22, amps: AMP });
        }
        click(t, { accented: idx === 0, level: idx === 0 ? 0.26 : 0.1 });
        t += SLOT;
      } else {
        // 三条同时跑：9、8、7，各自从自己的第 0 格开始
        CYCLE.meters.forEach((m) => {
          const idx = i % m;
          const midi = MOTIF[idx % MOTIF.length];
          if (idx < MOTIF.length) {
            playNote(midiToHz(midi - (m === 9 ? 0 : m === 8 ? 5 : 10)),
              { at: t, duration: SLOT * 0.85, level: 0.16, amps: AMP });
          }
        });
        if (i % 9 === 0) click(t, { accented: true, level: 0.22 });
        t += SLOT;
      }
    }

    const t0 = performance.now();
    clearInterval(state.timer);
    state.timer = setInterval(() => {
      const elapsed = (performance.now() - t0) / 1000;
      if (elapsed >= total * SLOT) { stop(); return; }
      const step = Math.floor(elapsed / SLOT);
      const row = state.mode === 'rebar' ? Math.floor(step / 9) % 3 : 0;
      const col = state.mode === 'rebar' ? step % 9 : step % 9;
      if (row !== state.row || col !== state.col) { state.row = row; state.col = col; paint(); }
    }, 30);
    paint();
  }

  function stop() {
    state.playing = false;
    clearInterval(state.timer);
    state.timer = null;
    state.row = -1;
    state.col = -1;
    stopAll();
    paint();
  }

  root.querySelector('[data-play]').addEventListener('click', play);
  root.querySelector('[data-stop]').addEventListener('click', stop);
  [...root.querySelector('[data-mode]').children].forEach((b) => {
    b.addEventListener('click', () => {
      state.mode = b.dataset.set;
      stop();
    });
  });

  paint();
  return { play, stop };
}
