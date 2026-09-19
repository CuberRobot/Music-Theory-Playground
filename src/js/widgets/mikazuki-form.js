/**
 * O · 三日月之舞 · 三段结构台
 *
 * 这一节能讲硬的地方有三样，而且都能单独听见：
 *   1. 三段的速度 —— 急（♩=152）、缓（♩=66）、急（♩=156，收尾冲到 168）
 *   2. 第一段的拍号变化 —— 4/4 走到一半变成 3/4，重音整个挪位置
 *   3. 每段由谁在说 —— 金管的宣告 / 小号的独奏 / 低音的追
 *
 * 这首曲子还在版权期内，我们不贴音源也不贴谱例，所以下面响的三段
 * 是**本站自己写的示意素材**：借的只是布局、速度和拍号，一个音都不模仿原曲。
 * 节拍器的点就按那三个真实的速度标记走 —— 那部分不是示意的。
 *
 * 数据出处：
 *   · 速度标记、拍号、各段内容 —— 萌娘百科《三日月之舞》条目的"赏析"小节（2026-09 取）
 *   · 各版本时长 —— 官方原声带曲目数据（网易云音乐；与 MusicBrainz 相差 1 秒以内）
 */

import { midiToHz } from '../music/pitch.js';
import { playNote, click, hat, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';
import { createNoteStrip, PLAY_LEAD } from '../audio/transport.js';

const BRASS = spectrumToAmps('trumpet', 10);
const PAD = spectrumToAmps('organ', 10);
const SOLO = spectrumToAmps('voice', 10);

const ALBUM_1 = '《おもいでミュージック》';
const ALBUM_2 = '《おんがくエンドレス》';

/**
 * 这一节引用到的数字全放这儿：页面、实验台、审计脚本共用一份。
 * 改的时候只改一处（第 22 节布鲁斯那次算错级数，就是因为数字散在各处）。
 */
export const MIKAZUKI = {
  source: '萌娘百科《三日月之舞》条目 · 赏析小节（2026-09 取）',
  movements: [
    {
      id: 'I', it: 'Allegro vivace con energia', bpm: 152, meters: ['4/4', '3/4'],
      who: '金管的宣告 → 木管的连奏 → 三拍子的舞 → 全奏',
      what: '开场小号把母题扔出来，木管接住往下跑；中间换成 3/4，铃鼓和单簧管把气氛转成舞曲；回到 4/4 之后母题由小号和上低音号再喊一次，全团叠到最强，最后在低音的衰减里收住。',
    },
    {
      id: 'II', it: 'Lento con espressione', bpm: 66, meters: ['4/4'],
      who: '小号独奏，双簧管与上低音号呼应',
      what: '小号的高音像一道光切进安静里，伴奏一层层托住它；然后单簧管带着木管组把旋律接过去，双簧管和上低音号一来一往，整段在暖而稳的气氛里停住。',
    },
    {
      id: 'III', it: 'Vivace', bpm: 156, meters: ['4/4'], codaBpm: 168, codaIt: 'Presto',
      who: '打击乐先导 → 低音往上追 → 全奏冲刺',
      what: '小鼓和定音鼓先把节奏钉住，木管加木琴在上面跑；低音乐器从下往上追，越追越高，在顶点放出一句新的旋律；管钟和圆号再把节奏卷一次，速度提到 ♩=168，定音鼓滚奏撑着全团一路冲到收尾的强音。',
    },
  ],
  /** 官方原声带里能听到的版本。seconds 取网易云的曲目数据，页面上的 mm:ss 由它算出来。 */
  versions: [
    { id: 'kaori', title: '三日月の舞（香織 トランペットソロ Ver.）', album: ALBUM_1, seconds: 404, song: 33051089,
      note: '独奏是香织的版本。同一个乐团、同一份谱，只把小号独奏换人。' },
    { id: 'reina', title: '三日月の舞（麗奈 トランペットソロ Ver.）', album: ALBUM_1, seconds: 409, song: 33051090,
      note: '独奏是丽奈的版本。比上一版长 5 秒 —— 音符没变，句子变了。' },
    { id: 'audKaori', title: '三日月の舞 トランペットソロパート・オーディション（香織）', album: ALBUM_1, seconds: 52, song: 33051073,
      note: '公开选拔那一场里，香织吹的片段。' },
    { id: 'audReina', title: '三日月の舞 トランペットソロパート・オーディション（麗奈）', album: ALBUM_1, seconds: 66, song: 33051074,
      note: '同一场选拔里丽奈吹的片段 —— 和上一段是同一句独奏。' },
    { id: 'kansai', title: '三日月の舞（関西大会突破 Ver.）', album: ALBUM_2, seconds: 418, song: 452814786,
      note: '关西大会那一版。北宇治在这场拿到金奖，第一次走到全国。' },
    { id: 'zenkoku', title: '三日月の舞（全国大会銅賞 Ver.）', album: ALBUM_2, seconds: 412, song: 452804861,
      note: '全国大会那一版。结果是铜奖 —— 同一首曲子，走到这儿的重量不一样了。' },
    { id: 'short', title: '三日月の舞（short）', album: ALBUM_2, seconds: 271, song: 452814788,
      note: '三年级生引退时用的短版，标注的演奏者是"1 年 & 2 年成员"。全长少了约两分半钟。' },
  ],
};

/* ---------------------------------------------------------------- 示意素材 */

/**
 * 素材按小节写：beats 是这一小节几拍，slots 里每一格占几拍。
 * slots 的总拍数必须等于 beats —— 审计脚本会替我们盯着这件事。
 */
const BARS = {
  // Ⅰ：4/4 两小节的金管宣告 + 3/4 两小节的三拍子舞（铃鼓用 hat 表示）
  I: [
    { beats: 4, slots: [
      { midis: [60, 64, 67], beats: 1 },
      { midis: [60, 64, 67], beats: 1 },
      { midis: [65, 69, 72], beats: 1 },
      { midis: [65, 69, 72], beats: 1 },
    ] },
    { beats: 4, slots: [
      { midis: [67, 71, 74], beats: 2, level: 0.2 },
      { midis: [72, 76, 79], beats: 2, level: 0.24 },
    ] },
    { beats: 3, hat: true, slots: [
      { midis: [72, 76], beats: 1, level: 0.2 },
      { midis: [74, 77], beats: 1, level: 0.2 },
      { midis: [76, 79], beats: 1, level: 0.2 },
    ] },
    { beats: 3, hat: true, slots: [
      { midis: [74, 77], beats: 1, level: 0.2 },
      { midis: [72, 76], beats: 1, level: 0.2 },
      { midis: [72, 76, 79], beats: 1, level: 0.24 },
    ] },
  ],
  // Ⅱ：♩=66，两小节。上面是独奏的句子，下面是软软的伴奏
  II: [
    { beats: 4, under: { midis: [53, 57, 60], level: 0.1 },
      slots: [
        { midis: [72], beats: 2, amps: SOLO, level: 0.2 },
        { midis: [74], beats: 2, amps: SOLO, level: 0.2 },
      ] },
    { beats: 4, under: { midis: [55, 59, 62], level: 0.1 },
      slots: [
        { midis: [76], beats: 2, amps: SOLO, level: 0.22 },
        { midis: [72], beats: 2, amps: SOLO, level: 0.18 },
      ] },
  ],
  // Ⅲ：♩=156，两小节。八分音符的跑动 + 一个和弦
  III: [
    { beats: 4, slots: [
      { midis: [72], beats: 0.5 }, { midis: [74], beats: 0.5 },
      { midis: [76], beats: 0.5 }, { midis: [77], beats: 0.5 },
      { midis: [79], beats: 0.5 }, { midis: [77], beats: 0.5 },
      { midis: [76], beats: 0.5 }, { midis: [74], beats: 0.5 },
    ] },
    { beats: 4, slots: [
      { midis: [72, 76, 79], beats: 2, level: 0.22 },
      { midis: [74, 77, 81], beats: 2, level: 0.24 },
    ] },
  ],
};

/** 把"按小节写"的素材摊成时间轴：音符、拍点、铃鼓。 */
function build(bars, bpm) {
  const beat = 60 / bpm;
  const notes = [];
  const taps = [];
  const hats = [];
  let t = 0;

  for (const bar of bars) {
    const barStart = t;
    for (let i = 0; i < bar.beats; i++) {
      taps.push({ at: barStart + i * beat, accented: i === 0 });
      if (bar.hat) hats.push({ at: barStart + i * beat });
    }
    if (bar.under) {
      bar.under.midis.forEach((m) => notes.push({
        midi: m, start: barStart, dur: bar.beats * beat * 0.95,
        amps: PAD, level: bar.under.level ?? 0.1,
      }));
    }
    for (const s of bar.slots) {
      const dur = s.beats * beat;
      (s.midis ?? []).forEach((m) => notes.push({
        midi: m, start: t, dur: dur * 0.92,
        amps: s.amps ?? BRASS, level: s.level ?? 0.18,
      }));
      t += dur;
    }
  }
  return { notes, taps, hats, total: t };
}

/**
 * Ⅲ 的收尾：速度从 ♩=156 提到 168，定音鼓滚奏，最后一个长和弦。
 * 加速是真加速 —— 每一拍的秒数按插值算出来，不是"听起来差不多"。
 */
function buildCoda() {
  const from = MIKAZUKI.movements[2].bpm;
  const to = MIKAZUKI.movements[2].codaBpm;
  const beats = 8;
  const notes = [];
  const taps = [];
  const rolls = [];
  let t = 0;

  for (let i = 0; i < beats; i++) {
    const bpm = from + (to - from) * (i / (beats - 1));
    const beat = 60 / bpm;
    taps.push({ at: t, accented: i === 0 });
    // 定音鼓的滚奏：一拍四下，频率低一点的短音
    for (let k = 0; k < 4; k++) {
      rolls.push({ at: t + (k * beat) / 4, freq: 118 + i * 2, level: 0.1 + i * 0.012 });
    }
    t += beat;
  }

  // 滚奏跑到顶，落在最后一下强和弦上（这一下也算一个重拍）
  taps.push({ at: t, accented: true });
  const tail = 2.5 * (60 / to);
  [72, 76, 79].forEach((m) => notes.push({
    midi: m, start: t, dur: tail, amps: BRASS, level: 0.26,
  }));
  return { notes, taps, hats: [], rolls, total: t + tail };
}

const HEAD_III = build(BARS.III, MIKAZUKI.movements[2].bpm);
const CODA_III = buildCoda();

export const DEMOS = {
  I: build(BARS.I, MIKAZUKI.movements[0].bpm),
  II: build(BARS.II, MIKAZUKI.movements[1].bpm),
  III: {
    notes: [...HEAD_III.notes, ...CODA_III.notes.map((n) => ({ ...n, start: n.start + HEAD_III.total }))],
    taps: [...HEAD_III.taps, ...CODA_III.taps.map((x) => ({ ...x, at: x.at + HEAD_III.total }))],
    hats: HEAD_III.hats,
    rolls: CODA_III.rolls.map((x) => ({ ...x, at: x.at + HEAD_III.total })),
    total: HEAD_III.total + CODA_III.total,
  },
};

/** 给审计脚本用：每小节 slots 的总拍数必须等于这一小节声明的拍数。 */
export const MIKAZUKI_BARS = BARS;

/* ------------------------------------------------------------------ 挂载 */

export function mountMikazukiForm(root) {
  const state = { pick: 'I' };
  const timers = [];

  root.innerHTML = `
    <div class="card-head">
      <h2>三段结构台</h2>
      <p class="hint">急 — 缓 — 急，中间那段只有头段四成多的速度</p>
    </div>
    <p class="hint" style="margin-top:0">
      先说清楚：<b>下面响的三段是本站自己写的示意素材，不是原曲，也不模仿原曲的旋律。</b>
      借的只有三样东西——段的布局、速度标记、第一段的拍号变化。
      节拍器那几下点的就是原曲标注的速度：<span class="note" role="img" aria-label="四分音符"></span>=152 / 66 / 156→168。
    </p>
    <div class="form-row" data-picks role="group" aria-label="三个乐部"></div>
    <div class="mzk-bars" data-bars aria-label="三段速度对比"></div>
    <div data-strip style="margin-top:var(--sp-4)"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-one>听这一段（示意）</button>
      <button class="btn" type="button" data-all>依次听三段</button>
      <button class="btn" type="button" data-stop>停</button>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-what style="margin-top:var(--sp-3)"></p>
  `;

  const el = {
    picks: root.querySelector('[data-picks]'),
    bars: root.querySelector('[data-bars]'),
    stripHost: root.querySelector('[data-strip]'),
    readout: root.querySelector('[data-readout]'),
    what: root.querySelector('[data-what]'),
  };
  const strip = createNoteStrip(el.stripHost, { ariaLabel: '三个乐部的示意素材与播放进度' });

  const COLORS = { I: 'var(--amber)', II: 'var(--green)', III: 'var(--clay)' };
  const FASTEST = MIKAZUKI.movements[2].codaBpm;

  el.picks.innerHTML = MIKAZUKI.movements.map((m, i) => `
    <button class="form-block" type="button" data-mv="${m.id}" aria-pressed="${i === 0}"
      style="background:${COLORS[m.id]};border:0;cursor:pointer">
      <span class="form-letter">${m.id}</span>
      <span class="form-bar"><span class="note" role="img" aria-label="四分音符"></span>=${m.bpm}</span>
    </button>`).join('');

  el.bars.innerHTML = MIKAZUKI.movements.map((m) => {
    const top = m.codaBpm ? `${m.bpm}→${m.codaBpm}` : String(m.bpm);
    const pct = Math.round((m.bpm / FASTEST) * 100);
    return `<div class="mzk-bar"><span>${m.id} · ${top}</span>
      <i class="${m.id === 'II' ? 'slow' : ''}" style="width:${pct}%"></i></div>`;
  }).join('');

  function paint() {
    const m = MIKAZUKI.movements.find((x) => x.id === state.pick);
    el.picks.querySelectorAll('[data-mv]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.mv === state.pick));
    });
    const base = MIKAZUKI.movements[0].bpm;
    const ratio = Math.round((m.bpm / base) * 100);
    const codaPct = m.codaBpm ? Math.round((m.codaBpm / base) * 100) : 0;
    const data = DEMOS[m.id];
    el.readout.innerHTML = `
      <div><dt>速度标记</dt><dd>${m.it} · <span class="note" role="img" aria-label="四分音符"></span>=${m.bpm}${m.codaBpm ? ` → ${m.codaIt} ${m.codaBpm}` : ''}</dd></div>
      <div><dt>拍号</dt><dd>${m.meters.join(' → ')}</dd></div>
      <div><dt>相对头段的速度</dt><dd class="${ratio < 100 ? 'lo' : 'hi'}">${ratio}%${m.codaBpm ? `（收尾冲到 ${codaPct}%）` : ''}</dd></div>
      <div><dt>由谁在说</dt><dd>${m.who}</dd></div>
      <div><dt>示意素材长度</dt><dd>${data.total.toFixed(1)} 秒</dd></div>`;
    el.what.textContent = m.what;
    // 先画出来：不然没按播放之前，音符条是一块空白的框
    strip.load(data.notes);
  }

  function clearTimers() {
    while (timers.length) clearTimeout(timers.pop());
  }

  function stop() {
    clearTimers();
    strip.stop();
    stopAll();
  }

  /**
   * 发声全部在这里排，音符条只负责画游标 ——
   * 这样拍点、滚奏、音符共用 PLAY_LEAD 这一根时间轴。
   */
  function play(id) {
    const data = DEMOS[id];
    strip.load(data.notes);
    data.notes.forEach((n) => playNote(midiToHz(n.midi), {
      at: PLAY_LEAD + n.start,
      duration: Math.max(0.14, n.dur),
      amps: n.amps ?? BRASS,
      level: n.level ?? 0.18,
      decay: 1.1,
      attack: 0.012,
      release: 0.2,
    }));
    data.taps.forEach((s) => click(PLAY_LEAD + s.at, { accented: s.accented }));
    data.hats.forEach((h) => hat(PLAY_LEAD + h.at, 0.07, 0.05));
    (data.rolls ?? []).forEach((r) => click(PLAY_LEAD + r.at, { freq: r.freq, level: r.level }));
    strip.play(() => {});
  }

  el.picks.querySelectorAll('[data-mv]').forEach((b) => {
    b.addEventListener('click', () => {
      state.pick = b.dataset.mv;
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
    MIKAZUKI.movements.forEach((m) => {
      const id = m.id;
      timers.push(setTimeout(() => { state.pick = id; paint(); play(id); }, delay * 1000));
      delay += DEMOS[id].total + 0.7;
    });
  });

  paint();
}
