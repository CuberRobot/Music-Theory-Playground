/**
 * D · 帕赫贝尔 · 卡农台
 *
 * 卡农的全部秘密在低音里：一条四小节的循环，八个和弦，一直转下去。
 * 上面三层（三把小提琴）说的是同一句话，每隔两小节依次进来 —— 这就是"卡农"。
 *
 * 素材：低音线 D D A A | B B F♯ F♯ | G G D D | G G A A（四分音符）；
 * 八个和弦的进行 D–A–Bm–F♯m–G–D–G–A 是通行说法
 * （Gjerdingen 把它归入 Romanesca 图式）。
 *
 * 速度：**原谱没有速度标记**，所以这里不放"原速"，只给一个中庸的示范速度，
 * 而且明说出来 —— 免得让人以为那是帕赫贝尔写的。
 */

import { midiToHz } from '../music/pitch.js';
import { playNote, now, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';
import { createNoteStrip } from '../audio/transport.js';

const DEMO_BPM = 60;                       // 示范速度，不是原谱标记
const BEAT = 60 / DEMO_BPM;                // 一拍多少秒

/* 低音：每小节四个四分音符，一个和弦占两拍。 */
const BASS = [
  { rn: 'I',   chord: 'D',   midis: [50, 50] },
  { rn: 'V',   chord: 'A',   midis: [45, 45] },
  { rn: 'vi',  chord: 'Bm',  midis: [47, 47] },
  { rn: 'iii', chord: 'F♯m', midis: [42, 42] },
  { rn: 'IV',  chord: 'G',   midis: [43, 43] },
  { rn: 'I',   chord: 'D',   midis: [50, 50] },
  { rn: 'IV',  chord: 'G',   midis: [43, 43] },
  { rn: 'V',   chord: 'A',   midis: [45, 45] },
];

/* 四个声部的进入位置：低音从第 1 小节起，之后每两小节进一层。 */
/**
 * 上面三层演奏的那句话：两小节（8 拍）的短句，**每个声部一模一样** ——
 * 这就是卡农：同一句话，隔两小节依次进来，叠在一起。
 * 以前这个实验台只把低音放进音符条，于是"三层依次进入"只画在图上、没在响，
 * 音轨上也就只有一条线（用户报的"卡农不够直观"）。
 */
const PHRASE = [
  { s: 7, b: 1 }, { s: 5, b: 1 }, { s: 4, b: 1 }, { s: 2, b: 1 },
  { s: 0, b: 2 }, { s: 2, b: 1 }, { s: 4, b: 1 },
];
const PHRASE_BEATS = PHRASE.reduce((a, n) => a + n.b, 0);   // = 8 拍 = 2 小节

const VOICES = [
  { label: '低音', bar: 1 },
  { label: '小提琴 I', bar: 3, shift: 12 },
  { label: '小提琴 II', bar: 5, shift: 12 },
  { label: '小提琴 III', bar: 7, shift: 12 },
];

export function mountCanonLab(root) {
  const state = { bars: 8, playing: false, raf: null, t0: 0 };

  root.innerHTML = `
    <div class="card-head">
      <h2>卡农台</h2>
      <p class="hint">一条四小节的低音循环，上面三层依次进来</p>
    </div>
    <p class="hint" style="margin-top:0">
      低音循环：<b>D–A–Bm–F♯m–G–D–G–A</b>（八个和弦，每个占两拍）。
      原谱没有速度标记，下面用的是本站设的中庸速度
      <span class="note" role="img" aria-label="四分音符"></span>=${DEMO_BPM}，不是"原速"。
    </p>
    <div data-lanes class="canon-lanes" aria-label="四个声部的进入位置"></div>
    <div data-strip style="margin-top:var(--sp-4)"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>听一遍低音（4 小节）</button>
      <button class="btn" type="button" data-loop>循环四遍</button>
      <button class="btn" type="button" data-stop>停</button>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
  `;

  const el = {
    lanes: root.querySelector('[data-lanes]'),
    stripHost: root.querySelector('[data-strip]'),
    readout: root.querySelector('[data-readout]'),
  };
  const strip = createNoteStrip(el.stripHost, { ariaLabel: '卡农四个声部的音符与播放进度' });

  function drawLanes() {
    el.lanes.innerHTML = VOICES.map((v) => {
      const cells = [];
      for (let bar = 1; bar <= state.bars; bar++) {
        cells.push(`<i class="${bar >= v.bar ? 'on' : ''}"></i>`);
      }
      return `<div class="canon-lane"><span class="canon-name">${v.label}</span>
        <span class="canon-cells">${cells.join('')}</span>
        <span class="canon-bar">第 ${v.bar} 小节进</span></div>`;
    }).join('');
  }

  /**
   * 展开成音符条要的时间轴：低音循环 repeat 遍，三个小提琴声部依次进来。
   * 低音每遍 4 小节；声部按"每 2 小节进一层"从第 3 小节开始进（和上面那张进入图一致）。
   */
  function timeline(repeat) {
    const out = [];
    for (let r = 0; r < repeat; r++) {
      BASS.forEach((step, i) => {
        step.midis.forEach((midi, k) => {
          const start = (r * 8 + i * 2 + k) * BEAT;
          out.push({ midi, start, dur: BEAT * 0.92, label: '' });
        });
      });
    }

    const totalBeats = repeat * 16;
    VOICES.filter((v) => v.shift).forEach((v) => {
      const enterBeat = (v.bar - 1) * 4;
      for (let b = enterBeat; b < totalBeats; b += PHRASE_BEATS) {
        let cursor = b;
        PHRASE.forEach((n) => {
          const start = cursor * BEAT;
          if (cursor < totalBeats) {
            out.push({ midi: 50 + n.s + v.shift, start, dur: n.b * BEAT * 0.92, label: '' });
          }
          cursor += n.b;
        });
      }
    });
    return out;
  }

  function play(repeat) {
    stopAll();   // 上一次还没放完就先掐掉，不许叠着响
    stop();
    const amps = spectrumToAmps('saw', 12);
    strip.load(timeline(repeat));
    strip.play((midi, at, dur) => playNote(midiToHz(midi), {
      at, duration: dur, amps, level: 0.26, decay: 1.1,
    }));
    state.playing = true;
    const total = 8 * BEAT * repeat;
    state.t0 = now() + 0.1;
    const tick = () => {
      if (!state.playing) return;
      if (now() - state.t0 > total + 0.2) { state.playing = false; return; }
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }

  function stop() {
    state.playing = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = null;
    strip.stop();
  }

  root.querySelector('[data-play]').addEventListener('click', () => play(2));   // 两遍 = 8 小节，正好让三层都进来
  root.querySelector('[data-loop]').addEventListener('click', () => play(4));
  root.querySelector('[data-stop]').addEventListener('click', stop);

  el.readout.innerHTML = `
    <div><dt>低音长度</dt><dd>4 小节 · 8 个和弦（循环两遍 = 8 小节）</dd></div>
    <div><dt>和弦进行</dt><dd>I–V–vi–iii–IV–I–IV–V</dd></div>
    <div><dt>进入间隔</dt><dd>每 2 小节一层</dd></div>
    <div><dt>原谱的速度</dt><dd>没有标记</dd></div>
  `;
  drawLanes();
  strip.load(timeline(2));
}
