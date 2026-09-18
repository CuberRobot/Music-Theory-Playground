/**
 * 第 7 节 · 音值组合法。
 *
 * 规则只有一条，但它是所有记谱问题的根：**符尾要按拍分组**。
 * 八分、十六分音符用横线连起来的时候，连线的范围必须和拍对得上；
 * 跨过拍、跨过小节中线的连法，读谱的人会数不清拍子。
 */

import { METERS, DURATIONS, durationByKey, fitsMeasure } from '../music/rhythm.js';

/** 每拍里应该连成一组。复拍子（6/8）按三拍一组连 —— 那是它的"大拍"。 */
function beamGroups(meter) {
  if (meter.sig === '6/8') return [3, 3];
  if (meter.sig === '3/8') return [3];
  return new Array(meter.beats).fill(1);
}

export function mountGroupingLab(root) {
  const state = { sig: '4/4', seq: [], wrong: false };

  root.innerHTML = `
    <div class="card-head">
      <h2>符尾该怎么连</h2>
      <p class="hint">往小节里放音符，看横线连到哪一组</p>
    </div>
    <div class="tiles" data-meters role="group" aria-label="拍号"></div>
    <div class="tiles" data-palette role="group" aria-label="音符时值" style="margin-top:6px"></div>

    <div data-bar style="margin-top:var(--sp-5)"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn" type="button" data-undo>删掉最后一个</button>
      <button class="btn" type="button" data-clear>清空</button>
      <button class="btn" type="button" data-wrong aria-pressed="false">看错误示范</button>
    </div>
    <p class="hint" data-note></p>
  `;

  const el = {
    meters: root.querySelector('[data-meters]'),
    palette: root.querySelector('[data-palette]'),
    bar: root.querySelector('[data-bar]'),
    note: root.querySelector('[data-note]'),
    wrong: root.querySelector('[data-wrong]'),
  };

  METERS.forEach((m) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = m.sig;
    b.dataset.sig = m.sig;
    b.addEventListener('click', () => { state.sig = m.sig; state.seq = []; paint(); });
    el.meters.appendChild(b);
  });

  ['quarter', 'eighth', 'sixteenth', 'dottedQuarter', 'half'].forEach((k) => {
    const d = durationByKey(k);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.textContent = d.label;
    b.addEventListener('click', () => add(k));
    el.palette.appendChild(b);
  });

  root.querySelector('[data-undo]').addEventListener('click', () => { state.seq.pop(); paint(); });
  root.querySelector('[data-clear]').addEventListener('click', () => { state.seq = []; paint(); });
  el.wrong.addEventListener('click', () => {
    state.wrong = !state.wrong;
    el.wrong.setAttribute('aria-pressed', String(state.wrong));
    paint();
  });

  const meter = () => METERS.find((m) => m.sig === state.sig);

  function add(key) {
    const m = meter();
    const total = state.seq.reduce((a, k) => a + durationByKey(k).beats, 0);
    const next = total + durationByKey(key).beats;
    if (next > m.beats + 1e-9) { el.note.textContent = '这个小节放不下了，先删掉一个。'; return; }
    state.seq.push(key);
    paint();
  }

  function paint() {
    const m = meter();
    const groups = beamGroups(m);
    const total = state.seq.reduce((a, k) => a + durationByKey(k).beats, 0);

    [...el.meters.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sig === state.sig)));

    // 把音符铺在总拍轴上；短音符（八分及以下）每拍画一条符尾横线
    // 错误示范：整小节连成一条横线，不管拍在哪
    let cursor = 0;
    const parts = [];
    const beams = [];
    state.seq.forEach((k) => {
      const d = durationByKey(k);
      const w = (d.beats / m.beats) * 100;
      const short = d.beats <= 0.5;
      parts.push(`<div class="grp-note" style="flex:0 0 ${w}%">
        <span class="grp-head">${d.beats >= 0.5 ? d.label.replace('音符', '') : '八分'}</span>
        <span class="grp-beats">${d.beats} 拍</span></div>`);
      if (short) beams.push([cursor, cursor + d.beats]);
      cursor += d.beats;
    });

    // 正确连法：按拍切分成若干段，每段一条横线
    const bars = state.wrong ? [[0, total]] : splitByGroups(beams, groups);
    const beamHtml = bars.map(([a, b]) => {
      const left = (a / m.beats) * 100;
      const width = ((b - a) / m.beats) * 100;
      return `<i class="grp-beam" style="left:${left}%;width:${width}%"></i>`;
    }).join('');

    const ticks = Array.from({ length: m.beats }, (_, i) =>
      `<i style="left:${(i / m.beats) * 100}%"></i>`).join('');

    el.bar.innerHTML = `
      <div class="grp-bar">
        <div class="grp-grid">${ticks}</div>
        <div class="grp-beams">${beamHtml}</div>
        <div class="grp-notes">${parts.join('')}</div>
      </div>`;

    const ok = !state.wrong;
    el.note.innerHTML = state.wrong
      ? '<b style="color:var(--clay-deep)">错误示范：</b>整小节连成一条横线，读谱的人看不出拍在哪。'
      : m.sig === '6/8'
        ? '<b>6/8 是三拍一组、连成两组。</b>它的"大拍"是三拍，所以横线不能按单个八分音符分开，也不能六拍连成一条。'
        : `<b>每拍连成一组，一共 ${groups.length} 组。</b>四分音符以上的音本来就带符尾，不参与连线。`
        + (total > 0 ? ` 现在放了 ${total} / ${m.beats} 拍。` : '');
  }

  /** 把若干段短音符按"拍组"切分：每个音保留在自己的拍组里。 */
  function splitByGroups(beams, groups) {
    const bounds = [];
    let acc = 0;
    groups.forEach((g) => { bounds.push([acc, acc + g]); acc += g; });
    const out = [];
    beams.forEach(([a, b]) => {
      const g = bounds.find(([x, y]) => a >= x - 1e-9 && b <= y + 1e-9);
      if (g) {
        const last = out[out.length - 1];
        if (last && Math.abs(last[1] - a) < 1e-9 && Math.abs(last[0] - g[0]) < 1e-9) last[1] = b;
        else out.push([a, b]);
      } else out.push([a, b]);
    });
    return out;
  }

  paint();
}
