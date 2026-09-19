/**
 * Q · 利兹与青鸟 · 挂け合い台
 *
 * 这部片子的全部紧张感，压在一个问题上：**两个人能不能吹成一句话。**
 * 第 3 楽章的独奏写给双簧管（霙）和长笛（希美），两个人在片子里从合不上，
 * 一路走到合上——这一段就是那件事的可听版本。
 *
 * 素材是**本站自己写的**（不是原曲），做法是：两句旋律轮流说话，
 * 中间有一段两个人一起停在一个长音上。然后你可以把长笛那条线整体往后推，
 * 从 "0 毫秒（完全吻合）" 推到 "240 毫秒"（在 ♩=100 下是 0.4 拍）。
 * 推的过程里，音乐会从"一句话"变成"两个人"。
 *
 * 数据说明：片子里那两个人的主题用的是 99 与 101 两个速度
 * （见日文维基百科引的山田尚子×牛尾憲輔访谈）——那个数字和这里无关，
 * 这里的滑块只是一个可调的示意图。
 */

import { midiToHz } from '../music/pitch.js';
import { playNote, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';
import { createNoteStrip, PLAY_LEAD } from '../audio/transport.js';

const REED = spectrumToAmps('clarinet', 10);   // 双簧管那一路的近似音色（偏鼻音）
const FLUTE = spectrumToAmps('organ', 10);     // 长笛那一路的近似音色（偏纯净）

const BPM = 100;
const BEAT = 60 / BPM;

/** 双簧管的句子：上半句先说话，第 3 小节停在长音上。 */
const OBOE = [
  { midi: 77, start: 0, dur: 2 },            // 第 1 小节：F5 说两拍
  { midi: 81, start: 4, dur: 2 },            // 第 2 小节：A5
  { midi: 79, start: 8, dur: 4 },            // 第 3 小节：G5 停住（两个人一起）
  { midi: 77, start: 12, dur: 2 },           // 第 4 小节：F5
  { midi: 81, start: 14, dur: 2 },           //            A5 收尾
];

/** 长笛的句子：接在下半句，第 3 小节和双簧管一起停住。 */
const FLUTE_LINE = [
  { midi: 84, start: 2, dur: 2 },            // 第 1 小节下半句：C6
  { midi: 86, start: 6, dur: 2 },            // 第 2 小节下半句：D6
  { midi: 76, start: 8, dur: 4 },            // 第 3 小节：E5（和 G5 构成三度，一起停住）
  { midi: 84, start: 12, dur: 2 },
  { midi: 77, start: 14, dur: 2 },
];

/** 错位量：滑块的档位，以及每一档听起来是什么。 */
export const DUET = {
  bpm: BPM,
  maxOffsetMs: 240,
  bands: [
    { upTo: 25, label: '听不出来', tip: '这个范围内的差别，一般人分不出来——它已经算"齐"了。' },
    { upTo: 75, label: '毛边', tip: '像一张纸没对齐：句子还是同一句，但边上起了毛。管乐合奏最难磨的就是这一档。' },
    { upTo: 150, label: '明显是两个人', tip: '长笛的进入听成了一个单独的起音。音乐还在，但"一句话"变成了"两句话"。' },
    { upTo: 240, label: '两次进来', tip: '已经不是不齐了，是变成了两个前后脚的事件。片子里的"合不上"就长这样。' },
  ],
  oboe: OBOE,
  flute: FLUTE_LINE,
};

/** 把拍换成秒，并按错位量把长笛那条线整体推迟。 */
function lines(offsetMs) {
  const toSec = (list, delay) => list.map((n) => ({
    midi: n.midi,
    start: n.start * BEAT + delay / 1000,
    dur: n.dur * BEAT,
  }));
  return {
    oboe: toSec(OBOE, 0),
    flute: toSec(FLUTE_LINE, offsetMs),
    total: 16 * BEAT + offsetMs / 1000,
  };
}

/** 给审计用：错位 0 时两条线必须真的对齐。 */
export const DUET_LINES = { at0: lines(0), atMax: lines(DUET.maxOffsetMs) };

export function mountDuetLab(root) {
  const state = { offset: 0 };
  const timers = [];

  root.innerHTML = `
    <div class="card-head">
      <h2>挂け合い台</h2>
      <p class="hint">同一句音乐，把长笛往后推一点点，看"一句话"怎么散成"两句话"</p>
    </div>
    <p class="hint" style="margin-top:0">
      素材是本站自己写的（不是原曲）：两句旋律轮流说话，第 3 小节两个人一起停在一个长音上。
      <b>把下面这个滑块往右推</b>，长笛那条线会整体推迟——推迟的量换算成时间写在读数里。
      示范速度 <span class="note" role="img" aria-label="四分音符"></span>=${BPM}，一拍 ${Math.round(BEAT * 1000)} 毫秒。
    </p>
    <div class="field" style="margin-top:var(--sp-3)">
      <label for="dl-offset">长笛推迟 <span class="val" data-val>0</span> 毫秒</label>
      <input id="dl-offset" type="range" min="0" max="${DUET.maxOffsetMs}" step="5" value="0">
    </div>
    <div class="solo-takes">
      <div class="solo-take" data-lane="oboe">
        <h3>双簧管（霙）</h3>
        <div data-strip="oboe"></div>
      </div>
      <div class="solo-take" data-lane="flute">
        <h3>长笛（希美）</h3>
        <div data-strip="flute"></div>
      </div>
    </div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>听这一版</button>
      <button class="btn" type="button" data-zero>推回 0</button>
      <button class="btn" type="button" data-stop>停</button>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-tip style="margin-top:var(--sp-3)"></p>
  `;

  const el = {
    range: root.querySelector('#dl-offset'),
    val: root.querySelector('[data-val]'),
    readout: root.querySelector('[data-readout]'),
    tip: root.querySelector('[data-tip]'),
  };
  const strips = {
    oboe: createNoteStrip(root.querySelector('[data-strip="oboe"]'), { ariaLabel: '双簧管声部的音符与播放进度' }),
    flute: createNoteStrip(root.querySelector('[data-strip="flute"]'), { ariaLabel: '长笛声部的音符与播放进度' }),
  };

  const band = (ms) => DUET.bands.find((b) => ms <= b.upTo) ?? DUET.bands.at(-1);

  function paint() {
    const ms = state.offset;
    const L = lines(ms);
    el.val.textContent = String(ms);
    strips.oboe.load(L.oboe);
    strips.flute.load(L.flute);
    const b = band(ms);
    const share = Math.round((ms / 1000 / BEAT) * 100);
    el.readout.innerHTML = `
      <div><dt>错位</dt><dd class="${ms === 0 ? 'hi' : 'lo'}">${ms} 毫秒 = 一拍的 ${share}%</dd></div>
      <div><dt>在 ♩=${BPM} 下相当于</dt><dd>${ms < 75 ? '不到一个三十二分音符' : ms < 150 ? '一个三十二分音符左右' : '一个十六分音符以上'}</dd></div>
      <div><dt>听起来</dt><dd>${b.label}</dd></div>
    `;
    el.tip.textContent = b.tip;
  }

  function stop() {
    while (timers.length) clearTimeout(timers.pop());
    strips.oboe.stop();
    strips.flute.stop();
    stopAll();
  }

  function play() {
    const L = lines(state.offset);
    strips.oboe.load(L.oboe);
    strips.flute.load(L.flute);
    L.oboe.forEach((n) => playNote(midiToHz(n.midi), {
      at: PLAY_LEAD + n.start, duration: Math.max(0.2, n.dur),
      amps: REED, level: 0.16, decay: 1.2, attack: 0.03, release: 0.24,
    }));
    L.flute.forEach((n) => playNote(midiToHz(n.midi), {
      at: PLAY_LEAD + n.start, duration: Math.max(0.2, n.dur),
      amps: FLUTE, level: 0.15, decay: 1.0, attack: 0.04, release: 0.3,
    }));
    strips.oboe.play(() => {});
    strips.flute.play(() => {});
  }

  el.range.addEventListener('input', () => {
    state.offset = Number(el.range.value);
    stop();
    paint();
  });
  el.range.addEventListener('change', () => { stop(); play(); });
  root.querySelector('[data-play]').addEventListener('click', () => { stop(); play(); });
  root.querySelector('[data-stop]').addEventListener('click', stop);
  root.querySelector('[data-zero]').addEventListener('click', () => {
    state.offset = 0;
    el.range.value = '0';
    stop();
    paint();
  });

  paint();
}
