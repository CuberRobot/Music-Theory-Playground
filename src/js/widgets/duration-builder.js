/**
 * 第 5 节 · 音的长短。
 * 时值不是"一个符号"，是一段时间。把音符块拖进小节里，听听它到底响多久。
 */

import { DURATIONS, durationByKey, fitsMeasure } from '../music/rhythm.js';
import { playNote, click } from '../audio/engine.js';

const BEATS_PER_MEASURE = 4;
const SEC_PER_BEAT = 0.62;
const PITCH = 440;

export function mountDurationBuilder(root) {
  const state = { seq: [] };

  root.innerHTML = `
    <div class="card-head">
      <h2>小节拼装台</h2>
      <p class="hint">往 4/4 的小节里放音符，放满四拍</p>
    </div>
    <div class="tiles" data-palette role="group" aria-label="音符时值"></div>

    <div class="timeline" data-timeline style="margin-top: var(--sp-4)">
      <div class="tickbar" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </div>

    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <span class="tag" data-count></span>
      <button class="btn btn-primary" type="button" data-play>播放</button>
      <button class="btn" type="button" data-undo>删掉最后一个</button>
      <button class="btn" type="button" data-clear>清空</button>
    </div>
    <p class="hint" data-msg></p>

    <div class="scroll-x" style="margin-top: var(--sp-5)">
      <table class="table">
        <caption class="sr-only">常用时值表</caption>
        <thead>
          <tr><th scope="col">音符</th><th scope="col">占几拍</th><th scope="col">与全音符的关系</th><th scope="col">一个四拍小节能放几个</th></tr>
        </thead>
        <tbody data-table></tbody>
      </table>
    </div>
  `;

  const el = {
    palette: root.querySelector('[data-palette]'),
    timeline: root.querySelector('[data-timeline]'),
    count: root.querySelector('[data-count]'),
    msg: root.querySelector('[data-msg]'),
    tbody: root.querySelector('[data-table]'),
  };

  DURATIONS.forEach((d) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = d.label;
    b.dataset.key = d.key;
    b.addEventListener('click', () => add(d.key));
    el.palette.appendChild(b);
  });

  el.tbody.innerHTML = DURATIONS.map((d) => {
    const ratio = d.beats === 4 ? '本身' : `1 / ${Math.round(4 / d.beats)}`;
    return `<tr>
      <td>${d.label}</td>
      <td class="num">${d.beats}</td>
      <td class="num">${ratio}</td>
      <td class="num">${Number.isInteger(4 / d.beats) ? 4 / d.beats : '不是整数个'}</td>
    </tr>`;
  }).join('');

  function total() {
    return state.seq.reduce((a, k) => a + durationByKey(k).beats, 0);
  }

  function add(key) {
    const next = total() + durationByKey(key).beats;
    if (next > BEATS_PER_MEASURE + 1e-9) {
      el.msg.textContent = `再加一个「${durationByKey(key).label}」就超过四拍了。先删掉最后一个，或者换一个短一点的。`;
      return;
    }
    state.seq.push(key);
    el.msg.textContent = next === BEATS_PER_MEASURE ? '正好填满四拍，可以播放了。' : '';
    paint();
  }

  root.querySelector('[data-undo]').addEventListener('click', () => {
    state.seq.pop();
    el.msg.textContent = '';
    paint();
  });
  root.querySelector('[data-clear]').addEventListener('click', () => {
    state.seq = [];
    el.msg.textContent = '';
    paint();
  });

  root.querySelector('[data-play]').addEventListener('click', () => {
    let at = 0;
    for (const key of state.seq) {
      const d = durationByKey(key);
      const dur = d.beats * SEC_PER_BEAT;
      playNote(PITCH, { at, duration: Math.max(0.1, dur - 0.06), level: 0.26, release: 0.12 });
      at += dur;
    }
    // 补上空拍，让人听出小节边界
    if (state.seq.length) click(at, { freq: 784, level: 0.1 });
  });

  function paint() {
    const t = total();
    el.count.textContent = `${t} / ${BEATS_PER_MEASURE} 拍`;

    const segs = state.seq.map((key) => {
      const d = durationByKey(key);
      const w = (d.beats / BEATS_PER_MEASURE) * 100;
      const label = d.beats >= 0.5 ? d.label.replace('音符', '') : '';
      return `<div class="seg" style="flex:0 0 ${w}%;border-right-color:var(--surface)" title="${d.label}">${label}</div>`;
    }).join('');

    const rest = BEATS_PER_MEASURE - t;
    const restSeg = rest > 1e-9
      ? `<div class="seg rest" style="flex:0 0 ${(rest / BEATS_PER_MEASURE) * 100}%;border-right:0">${
          rest >= 0.5 ? '空 ' + rest + ' 拍' : ''}</div>`
      : '';

    el.timeline.innerHTML = `<div class="tickbar" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`
      + segs + restSeg;

    if (fitsMeasure(state.seq.map((k) => durationByKey(k).beats), BEATS_PER_MEASURE)) {
      el.timeline.style.outline = '2px solid var(--green)';
      el.timeline.style.outlineOffset = '2px';
    } else {
      el.timeline.style.outline = 'none';
    }
  }

  paint();
}
