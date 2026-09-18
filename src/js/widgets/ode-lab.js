/**
 * B · 贝多芬第九交响曲 · 欢乐颂主题台（第四乐章）
 *
 * 这里只做一件事：**主题一个音不改，只换音区和厚度，听它会变成什么。**
 * 末乐章真正做的事比这多得多（它让这句旋律从 pp 的低音弦乐一路长到
 * 合唱加全乐队），但那是配器的事；先让人听见"主题不动、音区一动就是另一回事"。
 *
 * 素材出处（2026-09 对着 IMSLP 上的分谱逐个核对，不是凭印象）：
 *   Violoncello e Contrabasso 分谱，第四乐章第 92 小节起：
 *   Allegro assai ♩=80，D 大调，4/4。大提琴与低音提琴齐奏，pp。
 *   起点是**二分音符的 F♯3**，不是"两个 F♯ 四分音符"——
 *   后者是赞美诗集里通行的改编（Hymn to Joy），原谱这里是一个长音。
 *   主题十六小节，四句：a a′ b a″。
 *
 * 音色说明：本站没有采样，所有声音都是合成出来的。
 * 所以"低音齐奏"的不是真的大提琴 —— 它用低音区 + 暗一点的泛音配比去近似，
 * 听的是音区与厚度，不是音色本身。
 */

import { midiToHz, spellMidi } from '../music/pitch.js';
import { playNote, now } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';
import { createNoteStrip } from '../audio/transport.js';
import { SCORE_TEMPO, beatSeconds } from '../audio/tempo.js';

const BASE = 50;                    // D3，原谱低音弦乐那一句的音区
const BEAT = beatSeconds(SCORE_TEMPO.beethoven9_IV_joy);   // ♩=80，总谱上标的

/* 主题：半音数相对 D，beats 是时值（拍）。每段四小节 = 16 拍。 */
const PHRASE_A = [                              // 第 1–4 小节
  { s: 4, b: 2 }, { s: 5, b: 1 }, { s: 7, b: 1 },                      // F♯ G A
  { s: 7, b: 1 }, { s: 5, b: 1 }, { s: 4, b: 1 }, { s: 2, b: 1 },      // A G F♯ E
  { s: 0, b: 2 }, { s: 2, b: 1 }, { s: 4, b: 1 },                      // D E F♯
  { s: 4, b: 1.5 }, { s: 2, b: 0.5 }, { s: 2, b: 2 },                  // F♯. E E
];
const PHRASE_A_D = [                            // 第 5–8 小节，同一句，结尾落到主音
  { s: 4, b: 2 }, { s: 5, b: 1 }, { s: 7, b: 1 },
  { s: 7, b: 1 }, { s: 5, b: 1 }, { s: 4, b: 1 }, { s: 2, b: 1 },
  { s: 0, b: 2 }, { s: 2, b: 1 }, { s: 4, b: 1 },
  { s: 2, b: 1.5 }, { s: 0, b: 0.5 }, { s: 0, b: 2 },
];
const PHRASE_B = [                              // 第 9–12 小节
  { s: 2, b: 2 }, { s: 4, b: 1 }, { s: 0, b: 1 },                      // E F♯ D
  { s: 2, b: 1 }, { s: 4, b: 0.5 }, { s: 5, b: 0.5 }, { s: 4, b: 1 }, { s: 0, b: 1 },
  { s: 2, b: 1 }, { s: 4, b: 0.5 }, { s: 5, b: 0.5 }, { s: 4, b: 1 }, { s: 2, b: 1 },
  { s: 0, b: 1 }, { s: 2, b: 1 }, { s: -5, b: 1 }, { s: 4, b: 1 },     // D E A（往下探）F♯~
];
const PHRASE_A2 = [                             // 第 13–16 小节
  // 起音是两个 F♯：前一个从第 12 小节连过来，所以这里听上去比第一句"多重复了一次"
  { s: 4, b: 1 }, { s: 4, b: 1 }, { s: 5, b: 1 }, { s: 7, b: 1 },
  { s: 7, b: 1 }, { s: 5, b: 1 }, { s: 4, b: 1 }, { s: 2, b: 1 },
  { s: 0, b: 2 }, { s: 2, b: 1 }, { s: 4, b: 1 },
  { s: 2, b: 1.5 }, { s: 0, b: 0.5 }, { s: 0, b: 2 },
];

const THEME = [...PHRASE_A, ...PHRASE_A_D, ...PHRASE_B, ...PHRASE_A2];

/**
 * 给审计脚本用的裸数据（半音数相对 D，时值以拍为单位）。
 * 旋律写错一个音，耳朵不一定立刻发现，但审计会当场拦下来 ——
 * 之前贝五动机少半音就是这么溜过去的。
 */
export const ODE_THEME = {
  phrases: [PHRASE_A, PHRASE_A_D, PHRASE_B, PHRASE_A2],
  notes: THEME,
  beatSeconds: BEAT,
};

const PHRASES = [
  { label: 'a', note: '第一句', tip: '起音是一个长音 F♯（原谱是二分音符），往上走到 A，停在二级音上——像提问，没落地。' },
  { label: 'a′', note: '第二句', tip: '同一句再说一遍，结尾落到主音 D——这是回答。' },
  { label: 'b', note: '第三句', tip: '换材料：句尾往下探了一次（低音 A），句子因此变宽。' },
  { label: 'a″', note: '第四句', tip: '回到第一句的材料，但起音变成两个 F♯（前一个从前一小节连过来）——所以它听起来比第一句更"说定"了。' },
];

const LAYERS = [
  {
    id: 'low',
    label: '低音齐奏',
    desc: '大提琴与低音提琴，pp（原谱第 92 小节）',
    shifts: [0],
    amps: 'saw', level: 0.24, decay: 1.6,
  },
  {
    id: 'voice',
    label: '人声音区',
    desc: '同一句放到合唱的音区，音色换成"人声"配比',
    shifts: [12],
    amps: 'voice', level: 0.24, decay: 1.6,
  },
  {
    id: 'tutti',
    label: '全奏加厚',
    desc: '三个八度叠起来（低音 + 中音 + 高音），没有加和声',
    shifts: [-12, 0, 12],
    amps: 'trumpet', level: 0.13, decay: 1.6,
  },
];

export function mountOdeLab(root) {
  const state = { layer: 'low' };

  root.innerHTML = `
    <div class="card-head">
      <h2>欢乐颂主题台</h2>
      <p class="hint">主题一个音不改，只换音区和厚度</p>
    </div>
    <p class="hint" style="margin-top:0">
      原谱标记：D 大调，4/4，<b><span class="note" role="img" aria-label="四分音符"></span>=80</b>（Allegro assai）——下面的播放就用这个速度，不放慢、不加快。
    </p>
    <div class="seg" data-layers role="group" aria-label="音区与厚度"></div>
    <p class="hint" data-desc style="margin-top:var(--sp-3)"></p>
    <div data-phrases class="ode-phrases" aria-label="四个乐句"></div>
    <div data-strip style="margin-top:var(--sp-4)"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>听这一句主题</button>
      <button class="btn" type="button" data-stop>停</button>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
  `;

  const el = {
    layers: root.querySelector('[data-layers]'),
    desc: root.querySelector('[data-desc]'),
    phrases: root.querySelector('[data-phrases]'),
    stripHost: root.querySelector('[data-strip]'),
    readout: root.querySelector('[data-readout]'),
  };

  const strip = createNoteStrip(el.stripHost, { ariaLabel: '欢乐颂主题的音符与播放进度' });

  LAYERS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = l.label;
    b.dataset.layer = l.id;
    b.addEventListener('click', () => { state.layer = l.id; paint(); });
    el.layers.appendChild(b);
  });

  PHRASES.forEach((p) => {
    const span = document.createElement('span');
    span.className = 'ode-phrase';
    span.dataset.phrase = p.label;
    span.innerHTML = `<b>${p.label}</b> ${p.note}`;
    span.title = p.tip;
    el.phrases.appendChild(span);
  });

  root.querySelector('[data-play]').addEventListener('click', play);
  root.querySelector('[data-stop]').addEventListener('click', stop);

  let raf = null;

  function timeline(layer) {
    const out = [];
    let t = 0;
    THEME.forEach((n) => {
      const dur = n.b * BEAT;
      layer.shifts.forEach((shift) => {
        out.push({
          midi: BASE + n.s + shift,
          start: t,
          dur: Math.max(0.12, dur * 0.94),
          label: spellMidi(BASE + n.s + shift, true).name,
        });
      });
      t += dur;
    });
    return out;
  }

  function play() {
    const layer = LAYERS.find((l) => l.id === state.layer);
    const amps = spectrumToAmps(layer.amps, 16);
    stop();
    strip.load(timeline(layer));
    strip.play((midi, at, dur) => playNote(midiToHz(midi), {
      at, duration: dur, amps, level: layer.level, decay: layer.decay,
    }));

    // 乐句高亮：一句 16 拍，跟着音频时钟走
    const lead = 0.1;
    const t0 = now() + lead;
    const phraseSec = 16 * BEAT;
    const tick = () => {
      const idx = Math.floor((now() - t0) / phraseSec);
      highlight(idx);
      if (idx < PHRASES.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    strip.stop();
    highlight(-1);
  }

  function highlight(idx) {
    [...el.phrases.children].forEach((node, i) => {
      node.setAttribute('aria-current', String(i === idx));
    });
  }

  function paint() {
    const layer = LAYERS.find((l) => l.id === state.layer);
    [...el.layers.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.layer === state.layer));
    });
    el.desc.textContent = layer.desc;
    strip.load(timeline(layer));
    el.readout.innerHTML = `
      <div><dt>调性</dt><dd>D 大调</dd></div>
      <div><dt>拍号</dt><dd>4/4</dd></div>
      <div><dt>速度</dt><dd class="hi"><span class="note" role="img" aria-label="四分音符"></span>=${SCORE_TEMPO.beethoven9_IV_joy}（总谱标记）</dd></div>
      <div><dt>长度</dt><dd>16 小节 · 64 拍</dd></div>
      <div><dt>结构</dt><dd>a a′ b a″</dd></div>
      <div><dt>叠了几层</dt><dd>${layer.shifts.length} 层</dd></div>
    `;
  }

  // 页面加载时不发声，只把图画出来
  paint();
}
