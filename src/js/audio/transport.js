/**
 * 音符条：把一串排期播放的音画成钢琴卷帘，游标跟着音频时钟走。
 *
 * 两个用途：
 *   1. 让"现在在响哪个音"看得见 —— 这本来就是本站的原则（视觉与声音同帧）。
 *   2. 让排期错误当场暴露。之前"该一个个放却一起响"这种问题，
 *      代码全绿、控制台无报错，只有耳朵能发现；有了游标就能一眼看出来。
 *
 * 用法：
 *   const strip = createNoteStrip(host, { ariaLabel: '...' });
 *   strip.load([{ midi: 67, start: 0, dur: 0.4, label: 'G4' }, ...]);
 *   strip.play((midi, at, dur) => playPluck(midiToHz(midi), { at, duration: dur }));
 *
 * start / dur 的单位都是秒，start 从 0 起算。
 */

import { now } from './engine.js';
import { nameOfMidi } from '../music/pitch.js';

/**
 * 排期的提前量：素材从"现在 + 这一点点"开始，游标才有起步时间。
 *
 * 导出来是为了让调用方能把别的东西（节拍器的点、低音鼓的滚奏）排进
 * 同一根时间轴上 —— O 节的三段结构台要同时听见音符和拍点，两边错开就白搭。
 */
export const PLAY_LEAD = 0.1;

const W = 360;
const H = 132;
const PAD_L = 30;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 20;

export function createNoteStrip(host, opts = {}) {
  const notes = [];
  let total = 0;
  let lo = 60;
  let hi = 72;
  let raf = null;
  let t0 = 0;
  let playing = false;

  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${opts.ariaLabel ?? '播放的音符与进度'}"
      style="width:100%;height:auto;background:var(--surface-2);border-radius:var(--r-md)"></svg>
    <p class="hint" data-pos style="margin-top:6px">—</p>
  `;

  const svg = host.querySelector('svg');
  const pos = host.querySelector('[data-pos]');

  const xOf = (t) => PAD_L + (total ? t / total : 0) * (W - PAD_L - PAD_R);
  const yOf = (m) => {
    const span = Math.max(1, hi - lo);
    return H - PAD_B - ((m - lo) / span) * (H - PAD_T - PAD_B);
  };

  function load(list) {
    notes.length = 0;
    list.forEach((n) => notes.push({ ...n }));
    total = Math.max(0.01, ...notes.map((n) => n.start + n.dur));
    const midis = notes.map((n) => n.midi);
    lo = Math.min(...midis) - 1;
    hi = Math.max(...midis) + 1;
    draw(new Set());
    pos.textContent = '—';
  }

  /**
   * @param {Set<number>} active 现在正在响的音的下标集合。
   *   以前这里接单个下标，于是**同时响几个音时只亮一个** ——
   *   卡农那种叠起来的织体，看着就只有一条线在动（用户报的"音轨不直观"）。
   */
  function draw(active = new Set()) {
    const blocks = notes.map((n, i) => {
      const x = xOf(n.start);
      const w = Math.max(4, xOf(n.start + n.dur) - x);
      const y = yOf(n.midi) - 5;
      const on = active.has(i);
      const label = n.label ?? nameOfMidi(n.midi);
      return `<g>
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="10" rx="5"
          fill="${on ? 'var(--amber)' : 'var(--green)'}"/>
        ${w > 26 ? `<text x="${(x + w / 2).toFixed(1)}" y="${(y + 8).toFixed(1)}"
          text-anchor="middle" font-size="9"
          fill="${on ? 'var(--on-accent)' : 'var(--on-green)'}">${label}</text>` : ''}
      </g>`;
    }).join('');

    // 时间刻度：每 0.5 秒一格
    const ticks = [];
    for (let t = 0; t <= total + 1e-9; t += 0.5) {
      const x = xOf(t);
      ticks.push(`<line x1="${x.toFixed(1)}" y1="${H - PAD_B}" x2="${x.toFixed(1)}" y2="${H - PAD_B + 4}"
        stroke="var(--line-strong)" stroke-width="1"/>`);
    }

    svg.innerHTML = `${ticks.join('')}
      <line x1="${PAD_L}" y1="${H - PAD_B}" x2="${W - PAD_R}" y2="${H - PAD_B}"
        stroke="var(--line-strong)" stroke-width="1"/>
      <text x="${PAD_L}" y="${H - 6}" font-size="9" fill="var(--ink-4)">0s</text>
      <text x="${W - PAD_R}" y="${H - 6}" font-size="9" fill="var(--ink-4)" text-anchor="end">${total.toFixed(1)}s</text>
      ${blocks}
      <g data-cursor style="opacity:0">
        <line x1="0" y1="${PAD_T - 6}" x2="0" y2="${H - PAD_B}" stroke="var(--clay)" stroke-width="2"/>
      </g>`;
  }

  function stop() {
    playing = false;
    cancelAnimationFrame(raf);
    raf = null;
    const c = svg.querySelector('[data-cursor]');
    if (c) c.style.opacity = '0';
    pos.textContent = '—';
    draw(new Set());
  }

  /**
   * @param {(midi:number, at:number, dur:number)=>void} sound
   *   由调用方决定怎么发声。at 是从调用那一刻算起的秒数偏移。
   */
  function play(sound) {
    stop();
    if (!notes.length) return;
    const lead = PLAY_LEAD;           // 提前量见文件头的说明
    t0 = now() + lead;
    playing = true;
    notes.forEach((n) => sound(n.midi, lead + n.start, n.dur));

    const cursor = svg.querySelector('[data-cursor]');
    cursor.style.opacity = '1';
    let shown = '';

    const tick = () => {
      if (!playing) return;
      const elapsed = now() - t0;
      if (elapsed >= total + 0.15) { stop(); return; }
      const x = xOf(Math.max(0, Math.min(total, elapsed)));
      cursor.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);

      // 把"这一刻在响的"全部算出来：同时响几个就亮几个
      const active = new Set();
      notes.forEach((n, i) => {
        if (elapsed >= n.start && elapsed < n.start + n.dur) active.add(i);
      });
      const key = [...active].join(',');
      if (key !== shown) {
        shown = key;
        draw(active);
        svg.querySelector('[data-cursor]').style.opacity = '1';
        const idx = [...active][0];
        pos.textContent = active.size === 0
          ? `第 ${elapsed.toFixed(1)} 秒 · 空拍`
          : active.size === 1
            // 用 || 而不是 ??：有些实验台把 label 写成空字符串（不想在块里显示字），
            // 空字符串用 ?? 不会回退，读数就成了"正在响 "。
            ? `第 ${elapsed.toFixed(1)} 秒 · 正在响 ${notes[idx].label || nameOfMidi(notes[idx].midi)}`
            : `第 ${elapsed.toFixed(1)} 秒 · 正在响 ${active.size} 个音`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  return { load, play, stop, get notes() { return notes; } };
}
