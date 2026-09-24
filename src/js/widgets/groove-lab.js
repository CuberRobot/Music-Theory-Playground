/**
 * 第 25 节 · 节奏与律动。
 *
 * 第一部分第 6 节讲了拍与强弱，但只到切分音为止。这里补两块：
 *   奇数拍 —— 5/4、7/8 本身不难，难的是**把它分组**。
 *     人是按组听拍的，3+2 和 2+3 是两种完全不同的音乐。
 *   交叉节奏 —— 两条线用不同的等分数跑同一个时间跨度，最经典的是 3 对 2。
 */

import { click, now, playNote, stopAll } from '../audio/engine.js';
import { midiToHz } from '../music/pitch.js';
import { TEMPO } from '../audio/tempo.js';

/** groups 是每一组占几拍，总数就是这小节的拍数。 */
const METERS = [
  { sig: '4/4', groups: [[4]], kind: '单拍子' },
  { sig: '3/4', groups: [[3]], kind: '单拍子' },
  { sig: '5/4', groups: [[3, 2], [2, 3]], kind: '不规则拍子' },
  { sig: '7/8', groups: [[2, 2, 3], [3, 2, 2], [2, 3, 2]], kind: '不规则拍子' },
];

export function mountGrooveLab(root) {
  const state = { meter: '4/4', gi: 0, playing: false, timer: null };

  root.innerHTML = `
    <div class="card-head">
      <h2>奇数拍与交叉节奏</h2>
      <p class="hint">同一个 5/4，分成 3+2 还是 2+3，是两个东西</p>
    </div>
    <div class="tiles" data-meters role="group" aria-label="拍号"></div>
    <p class="hint" style="margin:var(--sp-3) 0 6px">分组 · 重音落在每一组的第一个音上</p>
    <!-- 播放中换分组只是改设定，不要因此打断正在响的那一遍 -->
    <div class="tiles" data-groups data-keep-audio role="group" aria-label="分组方式"></div>
    <div class="accent-bar" data-strip style="height:44px;margin-top:var(--sp-4)"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放这个分组</button>
      <button class="btn" type="button" data-cross>听 3 对 2</button>
      <span class="tag" data-now>—</span>
    </div>
    <p class="hint" data-note></p>
  `;

  const el = {
    meters: root.querySelector('[data-meters]'),
    groups: root.querySelector('[data-groups]'),
    strip: root.querySelector('[data-strip]'),
    now: root.querySelector('[data-now]'),
    note: root.querySelector('[data-note]'),
  };

  METERS.forEach((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = m.sig;
    b.dataset.sig = m.sig;
    b.addEventListener('click', () => { state.meter = m.sig; state.gi = 0; stop(); paint(); });
    el.meters.appendChild(b);
  });

  const meter = () => METERS.find((m) => m.sig === state.meter);
  const groups = () => meter().groups[state.gi] ?? meter().groups[0];
  const countBeats = () => groups().reduce((a, b) => a + b, 0);

  el.groups.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gi]');
    if (!b) return;
    state.gi = Number(b.dataset.gi);
    paint();
  });

  root.querySelector('[data-play]').addEventListener('click', () => { stop(); playGroove(); });
  root.querySelector('[data-cross]').addEventListener('click', () => { stop(); playCross(); });

  function setStrip(vals) {
    el.strip.innerHTML = vals.map((v) =>
      '<span style="height:' + Math.max(8, Math.round(v * 100)) + '%;background:'
      + (v > 0.9 ? 'var(--amber)' : v > 0.5 ? 'var(--green)' : 'var(--surface-3)') + '"></span>').join('');
  }

  function stop() {
    state.playing = false;
    clearTimeout(state.timer);
    state.timer = null;
    stopAll();
  }

  function playGroove() {
    stopAll();   // 上一次还没放完就先掐掉，不许叠着响
    const unit = TEMPO.run * 0.9;
    const g = groups();
    const accents = [];
    let at = 0;
    g.forEach((n, gi) => {
      for (let i = 0; i < n; i++) {
        const strong = i === 0;
        click(at, {
          accented: strong && gi === 0,
          level: strong ? (gi === 0 ? 0.32 : 0.22) : 0.09,
          freq: strong ? (gi === 0 ? 1568 : 1245) : 880,
        });
        accents.push(strong ? (gi === 0 ? 1 : 0.65) : 0.12);
        at += unit;
      }
    });
    setStrip(accents);
    const total = at;
    const start = now();
    state.playing = true;
    const tick = () => {
      if (!state.playing) return;
      const t = now() - start;
      if (t > total + 0.4) { stop(); paint(); return; }
      const idx = Math.min(accents.length - 1, Math.floor(t / unit));
      [...el.strip.children].forEach((s, k) => { s.style.outline = k === idx ? '2px solid var(--ink-1)' : 'none'; });
      state.timer = setTimeout(tick, 40);
    };
    tick();
    el.now.textContent = state.meter + ' → ' + g.join('+');
    el.note.textContent = state.meter + ' 一共 ' + countBeats() + ' 拍，按 ' + g.join(' + ')
      + ' 分组。重音不是均匀的 —— 这就是不规则拍子的全部秘密：拍数没变，分组变了，性格就变了。'
      + (state.meter === '5/4' ? ' 5/4 常出现在前卫摇滚与爵士里：3+2 听起来前倾，2+3 听起来稳一些。' : '');
  }

  function playCross() {
    const span = TEMPO.scale * 3.2;
    for (let i = 0; i < 3; i++) {
      playNote(midiToHz(72), { at: (i / 3) * span, duration: (span / 3) * 0.7, level: 0.22 });
    }
    for (let i = 0; i < 2; i++) {
      playNote(midiToHz(55), { at: (i / 2) * span, duration: (span / 2) * 0.7, level: 0.26 });
    }
    const accents = [1, 0.6, 0.3, 0.6, 0.3, 0.6];
    setStrip(accents);
    el.now.textContent = '3 对 2';
    el.note.textContent = '上面一条线在一个跨度里走三等分，下面走二等分 —— 这就是 3:2 交叉节奏。'
      + '两条线各自都均匀，合起来却要 2×3 拍才对齐一次。'
      + '它和切分音不是一回事：切分音是一条线自己把重音挪歪，交叉节奏是两条稳的线之间冲突。';
  }

  function paint() {
    const m = meter();
    [...el.meters.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sig === state.meter)));

    if (m.groups.length > 1) {
      el.groups.style.display = '';
      el.groups.innerHTML = m.groups.map((g, i) =>
        '<button type="button" class="tile" data-gi="' + i + '" aria-pressed="'
        + (i === state.gi) + '">' + g.join('+') + '</button>').join('');
    } else {
      el.groups.style.display = 'none';
      el.groups.innerHTML = '';
      state.gi = 0;
    }

    const g = groups();
    const accents = [];
    g.forEach((n, gi) => {
      for (let i = 0; i < n; i++) accents.push(i === 0 ? (gi === 0 ? 1 : 0.65) : 0.12);
    });
    setStrip(accents);
    el.now.textContent = state.meter + ' → ' + g.join('+');
    el.note.textContent = m.kind === '不规则拍子'
      ? state.meter + ' 是不规则拍子：每小节的拍数没法整分成几个大拍。'
        + '处理办法只有一个 —— 把它分组，让人听得出重音落在哪。'
      : state.meter + ' 是单拍子，每小节一个强拍，不需要再分组。';
  }

  paint();
  return { stop };
}
