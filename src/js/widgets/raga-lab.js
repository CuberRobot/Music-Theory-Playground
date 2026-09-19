/**
 * 第四部分 · 拉格台（Raga Yaman）。
 *
 * 这一段要讲清楚的第一件事是：**拉格不是一首曲子，是一套规定。**
 * 一条拉格规定了用哪些音、怎么上去怎么下来、哪个音是中心、哪些走法是它的"指纹"；
 * 演奏者在这套规定上即兴 —— 香卡自己说过，一场演出里大约九成是即兴。
 *
 * 这里用 Yaman（也叫 Kalyan）做示范，因为它是最常被当"第一条"教的拉格：
 *   上行 S R G M↑ P D N S'   下行 S' N D P M↑ G R S
 *   七个音里只有第四级升高半音（tivra Ma），其他都是自然音。
 *   顺带一个巧合：把它按升高半音排开，正好是西方调式里的利底亚（Lydian）。
 *
 * 塔拉（节奏循环）这里用最常见的 tintal：十六拍，四个四拍一组，
 * 第 1、5、13 拍拍手，第 9 拍是"空"（khali）—— 名字里的"三"就来自三次拍手。
 */

import { midiToHz } from '../music/pitch.js';
import { playNote, click, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';

const SA = 48;                       // C3 作为基础 Sa

/** 上行与下行（音级之间的半音数，以 Sa 为 0）。 */
const AROHA = [0, 2, 4, 6, 7, 9, 11, 12];
const AVAROHA = [12, 11, 9, 7, 6, 4, 2, 0];
const NAMES = ['S', 'R', 'G', 'M↑', 'P', 'D', 'N', 'S′'];

/** 一条示范乐句（本站写的，用来听"拐弯"的感觉，不是某首曲子的原样）。 */
const PHRASE = [7, 9, 11, 11, 9, 7, 6, 4, 2, 0];

const TINTAL = { beats: 16, divisions: [4, 4, 4, 4], khaliDivision: 2 };   // 第 3 组是空的

export function mountRagaLab(root) {
  const state = { drone: true, playing: false, timer: null };

  root.innerHTML = `
    <div class="card-head">
      <h2>拉格台 · Yaman</h2>
      <p class="hint">同一个框架，上下行不一样，中间还有一个持续音</p>
    </div>
    <p class="hint" style="margin-top:0">
      上行：<b>S R G M↑ P D N S′</b>　下行：<b>S′ N D P M↑ G R S</b>。
      只有第四级升高半音（M↑ 记作 tivra Ma）——把它排开听，正好是西方的利底亚。
    </p>
    <div class="raga-scale" data-scale aria-label="Yaman 的七个音"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-aroha>听上行</button>
      <button class="btn" type="button" data-avaroha>听下行</button>
      <button class="btn" type="button" data-phrase>听一条示范乐句</button>
      <button class="btn" type="button" data-stop>停</button>
    </div>
    <label class="field" style="margin-top:var(--sp-3)">
      <input type="checkbox" data-drone checked>
      <span>持续音（Sa + Pa）——拉格里的"参照面"，从头响到尾</span>
    </label>
    <p class="hint" style="margin:var(--sp-5) 0 6px">
      节奏循环 tintal：16 拍 = 4+4+4+4，第 1、5、13 拍是拍手，第 9 拍是"空"（khali）
    </p>
    <div class="accent-bar" data-tala style="height:34px"></div>
    <div class="lab-controls" style="margin-top:var(--sp-3)">
      <button class="btn" type="button" data-tala-play>听一遍循环（♩=90）</button>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
  `;

  const el = {
    scale: root.querySelector('[data-scale]'),
    drone: root.querySelector('[data-drone]'),
    tala: root.querySelector('[data-tala]'),
    readout: root.querySelector('[data-readout]'),
  };

  function drawScale() {
    el.scale.innerHTML = AROHA.map((semi, i) => {
      const ma = i === 3;
      return `<span class="raga-note${ma ? ' hi' : ''}">
        <b>${NAMES[i]}</b><i>${spellName(SA + semi)}</i></span>`;
    }).join('');
  }

  function drawTala(active = -1) {
    const cells = [];
    let beat = 0;
    TINTAL.divisions.forEach((len, d) => {
      for (let i = 0; i < len; i++) {
        const first = i === 0;
        const isKhali = d === TINTAL.khaliDivision && first;
        const cls = ['tala-cell'];
        if (first) cls.push('first');
        if (isKhali) cls.push('khali');
        if (beat === active) cls.push('now');
        cells.push(`<i class="${cls.join(' ')}" title="第 ${beat + 1} 拍"></i>`);
        beat++;
      }
    });
    el.tala.innerHTML = `<div class="tala-grid">${cells.join('')}</div>`;
  }

  const hz = (semi, oct = 1) => midiToHz(SA + 12 * oct + semi);

  function startDrone() {
    // 持续音不是装饰：它给即兴一个不变的参照，音准关系才听得出来
    const amps = spectrumToAmps('organ', 10);
    return [
      playNote(hz(0, 0), { duration: 30, amps, level: 0.07, attack: 0.4 }),
      playNote(hz(7, 0), { duration: 30, amps, level: 0.05, attack: 0.4 }),
    ];
  }

  function stop() {
    state.playing = false;
    clearTimeout(state.timer);
    state.timer = null;
    stopAll();
    drawTala();
  }

  function playLine(line) {
    stop();
    if (el.drone.checked) startDrone();
    const amps = spectrumToAmps('saw', 12);
    line.forEach((semi, i) => playNote(hz(semi, 1), {
      at: 0.25 + i * 0.62, duration: 1.1, amps, level: 0.2, decay: 0.9,
    }));
    state.playing = true;
    state.timer = setTimeout(stop, (line.length * 0.62 + 3) * 1000);
  }

  function playPhrase() {
    stop();
    if (el.drone.checked) startDrone();
    const amps = spectrumToAmps('saw', 12);
    PHRASE.forEach((semi, i) => playNote(hz(semi, 1), {
      at: 0.25 + i * 0.38, duration: 0.8, amps, level: 0.2, decay: 0.8,
    }));
    state.playing = true;
    state.timer = setTimeout(stop, (PHRASE.length * 0.38 + 3) * 1000);
  }

  function playTala() {
    stop();
    const beatSec = 60 / 90;
    for (let b = 0; b < TINTAL.beats; b++) {
      const first = TINTAL.divisions.reduce((acc, len) => acc.concat(acc[acc.length - 1] + len), [0]).includes(b);
      const isKhali = b === TINTAL.divisions[0] + TINTAL.divisions[1];
      const level = first ? (isKhali ? 0.16 : 0.3) : 0.1;
      click(b * beatSec, { level, freq: isKhali ? 880 : first ? 1568 : 1175 });
    }
    // 让方块跟着走
    state.playing = true;
    const start = performance.now();
    const tick = () => {
      if (!state.playing) return;
      const t = (performance.now() - start) / 1000;
      if (t > TINTAL.beats * beatSec + 0.2) { drawTala(-1); state.playing = false; return; }
      drawTala(Math.floor(t / beatSec));
      state.timer = setTimeout(tick, 60);
    };
    tick();
  }

  root.querySelector('[data-aroha]').addEventListener('click', () => playLine(AROHA));
  root.querySelector('[data-avaroha]').addEventListener('click', () => playLine(AVAROHA));
  root.querySelector('[data-phrase]').addEventListener('click', playPhrase);
  root.querySelector('[data-stop]').addEventListener('click', () => { stop(); drawTala(-1); });
  root.querySelector('[data-tala-play]').addEventListener('click', playTala);

  el.readout.innerHTML = `
    <div><dt>拉格</dt><dd>Yaman（别名 Kalyan）</dd></div>
    <div><dt>音</dt><dd>七个音全用，只有 M 升高半音</dd></div>
    <div><dt>中心音</dt><dd>主音（vadi）G　次主音（samvadi）N</dd></div>
    <div><dt>对应</dt><dd>西方的利底亚调式</dd></div>
    <div><dt>场合</dt><dd>夜里第一条，常用来开场</dd></div>
  `;
  drawScale();
  drawTala();
  return { stop };
}

function spellName(midi) {
  const N = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return N[((midi % 12) + 12) % 12];
}
