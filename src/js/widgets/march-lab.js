/**
 * P · 普罗旺斯的风 · 进行曲结构台
 *
 * 这首曲子是 2015 年全日本吹奏乐大赛的课题曲 IV —— 一首**进行曲**。
 * 进行曲有它自己的骨架：序奏、第一段、三声中段（トリオ）、第三段（再现），
 * 而且三声中段通常会换到一个离主调很远的地方去。
 *
 * 这首曲子换得特别远：主调是 d 小调，三声中段是 A♭ 大调 ——
 * 两个主音差**六个半音**，正好是三全音。所以中段听起来像换了一个世界。
 *
 * 下面响的素材是**本站自己写的示意**（不是原曲，也不模仿原曲的旋律）：
 * 借的是进行曲的段落布局、速度（♩=132）、拍号（4/4）和那个调性关系。
 *
 * 数据出处：日文维基百科《マーチ「プロヴァンスの風」》条目
 * （调性、拍号、速度、编制都出自它；它引的是全日本吹奏乐连盟会报 2014 年 12 月号）。
 */

import { midiToHz } from '../music/pitch.js';
import { playNote, click, hat, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';
import { createNoteStrip, PLAY_LEAD } from '../audio/transport.js';

const BRASS = spectrumToAmps('trumpet', 10);
const WOOD = spectrumToAmps('organ', 10);
const LOW = spectrumToAmps('saw', 10);

/** d 小调的主音。素材围绕它写，中段整体挪到 A♭（+6 个半音）。 */
const D = 50;
const TRITONE = 6;

export const PROVENCE = {
  tempo: 132,
  meter: '4/4',
  keyMain: 'ニ短調（d 小调）',
  keyTrio: '変イ長調（A♭ 大调）',
  /** 两个主音之间差几个半音：D → A♭ 是 6 个，也就是三全音。 */
  keyDistance: TRITONE,
  source: '日文维基百科《マーチ「プロヴァンスの風」》（2026-09 取）',
  sections: [
    { id: 'intro', label: '序奏', tip: '西班牙风的号角。铜管加打击乐，先把场面立起来——进行曲的开头不需要客气。' },
    { id: 'march1', label: '第一段', tip: 'd 小调。主旋律先交给低音乐器，木管随后接过去流动起来；伴奏是"低音在 1、3 拍，小鼓在 2、4 拍"。' },
    { id: 'trio', label: '三声中段', tip: '同一句旋律，主音从 D 挪到 A♭（三全音），调式也从自然小调变成大调——像换了一个世界。' },
    { id: 'march3', label: '第三段', tip: '回到 d 小调，第一段的材料再现，最后一路推到尾音。' },
  ],
};

/** 一拍的秒数。 */
const BEAT = 60 / PROVENCE.tempo;

/**
 * 进行曲的伴奏型：低音鼓踩 1、3 拍，小鼓（用噪声打点表示）踩 2、4 拍。
 * 这就是"进行曲为什么会走起来"的最短答案。
 */
function marchAccompaniment(bars, start = 0) {
  const taps = [];
  const hats = [];
  const drums = [];
  for (let b = 0; b < bars; b++) {
    const t = start + b * 4 * BEAT;
    for (let i = 0; i < 4; i++) {
      taps.push({ at: t + i * BEAT, accented: i === 0 });
      if (i === 1 || i === 3) hats.push({ at: t + i * BEAT });      // 小鼓在 2、4 拍
      if (i % 2 === 0) drums.push({ at: t + i * BEAT, freq: 92 });  // 低音鼓在 1、3 拍
    }
  }
  return { taps, hats, drums };
}

/** 一句"进行曲味道"的旋律，可以整体移调（中段就是把它 +6 挪过去）。 */
function marchLine(shift, start, level = 0.2) {
  const notes = [];
  // 四个小节：附点 + 八分的那种步伐感，主题落在低音区
  const bar = (b, steps) => steps.forEach(([beatInBar, midi, beats, amps]) => notes.push({
    midi: midi + shift, start: start + (b * 4 + beatInBar) * BEAT, dur: beats * BEAT * 0.9,
    amps: amps ?? BRASS, level,
  }));
  bar(0, [[0, D + 7, 1.5], [1.5, D + 7, 0.5], [2, D + 10, 1], [3, D + 12, 1]]);
  bar(1, [[0, D + 15, 2], [2, D + 14, 1], [3, D + 12, 1]]);
  bar(2, [[0, D + 10, 1.5], [1.5, D + 10, 0.5], [2, D + 12, 1], [3, D + 14, 1]]);
  bar(3, [[0, D + 15, 2], [2, D + 12, 1], [3, D + 7, 1]]);
  return notes;
}

/** 低音乐器的那一层：每小节 1、3 拍的根音，march 的"走路"。 */
function bassLine(shift, start, level = 0.16) {
  const notes = [];
  const roots = [0, 0, 3, 0];
  roots.forEach((r, b) => {
    [0, 2].forEach((beatInBar) => notes.push({
      midi: D - 12 + r + shift, start: start + (b * 4 + beatInBar) * BEAT,
      dur: BEAT * 0.85, amps: LOW, level,
    }));
  });
  return notes;
}

function buildSection(id) {
  if (id === 'intro') {
    // 序奏：只给两拍一句的号角，加滚奏
    const notes = [];
    [[0, D + 7], [1, D + 10], [2, D + 12]].forEach(([b, m]) => {
      notes.push({ midi: m, start: b * BEAT, dur: BEAT * 1.6, amps: BRASS, level: 0.22 });
      notes.push({ midi: m + 12, start: b * BEAT, dur: BEAT * 1.6, amps: BRASS, level: 0.14 });
    });
    const rolls = [];
    for (let i = 0; i < 12; i++) rolls.push({ at: i * BEAT * 0.25, freq: 120, level: 0.09 + i * 0.008 });
    return { notes, ...marchAccompaniment(1), rolls, total: 4 * BEAT };
  }
  if (id === 'march1') {
    const notes = [...marchLine(0, 0), ...bassLine(0, 0)];
    return { notes, ...marchAccompaniment(4), total: 4 * 4 * BEAT };
  }
  if (id === 'trio') {
    // 中段：同一句旋律 +6 个半音（D → A♭），低音也跟着走
    const notes = [...marchLine(TRITONE, 0, 0.2), ...bassLine(TRITONE, 0)];
    return { notes, ...marchAccompaniment(4), total: 4 * 4 * BEAT };
  }
  // 第三段：回到主调，短一点，直接推向结尾
  const notes = [...marchLine(0, 0), ...bassLine(0, 0)];
  notes.forEach((n) => { n.dur *= 0.98; });
  return { notes, ...marchAccompaniment(4), total: 4 * 4 * BEAT };
}

export const PROVENCE_DEMOS = {
  intro: buildSection('intro'),
  march1: buildSection('march1'),
  trio: buildSection('trio'),
  march3: buildSection('march3'),
};

export function mountMarchLab(root) {
  const state = { pick: 'march1' };
  const timers = [];

  root.innerHTML = `
    <div class="card-head">
      <h2>进行曲结构台</h2>
      <p class="hint">序奏 — 第一段 — 三声中段 — 第三段，中段跑到了三全音以外</p>
    </div>
    <p class="hint" style="margin-top:0">
      先说清楚：<b>下面响的是本站自己写的示意素材，不是原曲，也不模仿原曲的旋律。</b>
      借的是进行曲的骨架、速度 <span class="note" role="img" aria-label="四分音符"></span>=132、
      4/4 拍，以及"主调 d 小调 → 三声中段 A♭ 大调"这个关系。
      伴奏也是真的按进行曲的打法排的：低音鼓在 1、3 拍，小鼓在 2、4 拍。
    </p>
    <div class="tiles" data-picks role="group" aria-label="四个段落"></div>
    <div data-strip style="margin-top:var(--sp-4)"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-one>听这一段（示意）</button>
      <button class="btn" type="button" data-all>按顺序走一遍</button>
      <button class="btn" type="button" data-stop>停</button>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-tip style="margin-top:var(--sp-3)"></p>
  `;

  const el = {
    picks: root.querySelector('[data-picks]'),
    stripHost: root.querySelector('[data-strip]'),
    readout: root.querySelector('[data-readout]'),
    tip: root.querySelector('[data-tip]'),
  };
  const strip = createNoteStrip(el.stripHost, { ariaLabel: '进行曲四个段落的示意素材与播放进度' });

  el.picks.innerHTML = PROVENCE.sections.map((s) => `
    <button class="tile" type="button" data-sec="${s.id}"
      aria-pressed="${s.id === state.pick}">${s.label}</button>`).join('');

  function paint() {
    const sec = PROVENCE.sections.find((s) => s.id === state.pick);
    el.picks.querySelectorAll('[data-sec]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.sec === state.pick));
    });
    const isTrio = state.pick === 'trio';
    el.readout.innerHTML = `
      <div><dt>速度 · 拍号</dt><dd>Appassionato · <span class="note" role="img" aria-label="四分音符"></span>=${PROVENCE.tempo} · ${PROVENCE.meter}</dd></div>
      <div><dt>主调</dt><dd>${PROVENCE.keyMain}</dd></div>
      <div><dt>三声中段</dt><dd class="hi">${PROVENCE.keyTrio}（主音相距 ${PROVENCE.keyDistance} 个半音 = 三全音）</dd></div>
      <div><dt>现在这一段</dt><dd>${sec.label}${isTrio ? ' · 调性已经挪到 A♭' : ' · 在 d 小调里'}</dd></div>
      <div><dt>示意素材长度</dt><dd>${PROVENCE_DEMOS[state.pick].total.toFixed(1)} 秒</dd></div>`;
    el.tip.textContent = sec.tip;
    strip.load(PROVENCE_DEMOS[state.pick].notes);
  }

  function stop() {
    while (timers.length) clearTimeout(timers.pop());
    strip.stop();
    stopAll();
  }

  function play(id) {
    const d = PROVENCE_DEMOS[id];
    strip.load(d.notes);
    d.notes.forEach((n) => playNote(midiToHz(n.midi), {
      at: PLAY_LEAD + n.start,
      duration: Math.max(0.14, n.dur),
      amps: n.amps ?? BRASS,
      level: n.level ?? 0.18,
      decay: 1.0,
      attack: 0.01,
      release: 0.18,
    }));
    d.taps.forEach((t) => click(PLAY_LEAD + t.at, { accented: t.accented }));
    d.hats.forEach((h) => hat(PLAY_LEAD + h.at, 0.07, 0.045));
    (d.drums ?? []).forEach((x) => click(PLAY_LEAD + x.at, { freq: x.freq, level: 0.22 }));
    (d.rolls ?? []).forEach((r) => click(PLAY_LEAD + r.at, { freq: r.freq, level: r.level }));
    strip.play(() => {});
  }

  el.picks.querySelectorAll('[data-sec]').forEach((b) => {
    b.addEventListener('click', () => {
      state.pick = b.dataset.sec;
      stop();
      paint();
      play(state.pick);
    });
  });
  root.querySelector('[data-one]').addEventListener('click', () => { stop(); play(state.pick); });
  root.querySelector('[data-stop]').addEventListener('click', stop);
  root.querySelector('[data-all]').addEventListener('click', () => {
    stop();
    let delay = 0;
    PROVENCE.sections.forEach((s) => {
      timers.push(setTimeout(() => { state.pick = s.id; paint(); play(s.id); }, delay * 1000));
      delay += PROVENCE_DEMOS[s.id].total + 0.5;
    });
  });

  paint();
}
