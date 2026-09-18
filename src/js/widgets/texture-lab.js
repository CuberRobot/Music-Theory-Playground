/**
 * 第 27 节 · 低音线与织体。
 *
 * 织体听起来是个很玄的词，其实就一个问题：**同一段时间里，有几个人在干活、分别干什么。**
 * 第 22 节讲布鲁斯时已经用过一次（boogie 低音 + 和弦打点 + riff），
 * 这一节把它做成可以逐层开关的。
 *
 * 判断"满不满"不是听谁响，而是听**每一层有没有人**：
 * 缺低音 → 头重脚轻；缺中声部 → 空洞；两层挤在同一音区 → 打架。
 */

import { midiToHz } from '../music/pitch.js';
import { diatonicSet, degreeMidi } from '../music/chords.js';
import { playNote, playChord, hat, now, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';
import { TEMPO } from '../audio/tempo.js';

const TONIC = 48;          // C3，低音放这里
const PAD = spectrumToAmps('organ', 10);
const PROG = [0, 5, 3, 4];  // I vi IV V
const BEAT = TEMPO.melody;  // 一拍多少秒

/** 低音的四种写法，从最省事到最忙。 */
const BASS_STYLES = [
  { id: 'root', label: '只有根音', offsets: [0], why: '最省事。干净，但没有推动力 —— 民谣和慢歌里常见。' },
  { id: 'root5', label: '根音 + 五度', offsets: [0, 7], why: '加一个五度，低音立刻有了方向。这是最常见的"够用"写法。' },
  { id: 'boogie', label: 'boogie 走法', offsets: [0, 7, 9, 10], why: '根音→五度→六度→降七，四个音一路走。布鲁斯和早期摇滚的标准动作。' },
  { id: 'pedal', label: '持续音', offsets: [0], why: '整段只踩一个音不换。它取消了低音的方向感 —— 调式音乐和氛围音乐常用。' },
];

const LAYERS = [
  { id: 'bass', label: '低音', role: '托底' },
  { id: 'chord', label: '和声', role: '填中间' },
  { id: 'melody', label: '旋律', role: '说主线' },
  { id: 'drums', label: '节奏', role: '推着走' },
];

const MELODY = [72, 71, 69, 69, 71, 72, 74, 72, 71, 69, 67, 69, 71, 72, 71, 69];

/** 给审计用的裸数据。 */
export const TEXTURE_DEMO = { tonic: TONIC, prog: PROG, melody: MELODY, layers: LAYERS };

export function mountTextureLab(root) {
  const state = { on: { bass: true, chord: true, melody: true, drums: false }, bass: 'root5', playing: false, timer: null };

  root.innerHTML = `
    <div class="card-head">
      <h2>织体分层台</h2>
      <p class="hint">I–vi–IV–V，每层可以单独关掉，听去掉之后哪里空了</p>
    </div>
    <div class="tiles" data-layers role="group" aria-label="声部层"></div>
    <p class="hint" style="margin:var(--sp-4) 0 6px">低音写法</p>
    <div class="tiles" data-bass role="group" aria-label="低音写法"></div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放</button>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-note></p>
  `;

  const el = {
    layers: root.querySelector('[data-layers]'),
    bass: root.querySelector('[data-bass]'),
    readout: root.querySelector('[data-readout]'),
    note: root.querySelector('[data-note]'),
  };

  LAYERS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.dataset.id = l.id;
    b.textContent = l.label + '（' + l.role + '）';
    b.addEventListener('click', () => {
      state.on[l.id] = !state.on[l.id];
      paint();
    });
    el.layers.appendChild(b);
  });

  BASS_STYLES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.dataset.id = s.id;
    b.textContent = s.label;
    b.addEventListener('click', () => { state.bass = s.id; paint(); });
    el.bass.appendChild(b);
  });

  root.querySelector('[data-play]').addEventListener('click', () => { stop(); play(); });

  const set = () => diatonicSet(TONIC + 12, 'major', 3);
  const style = () => BASS_STYLES.find((s) => s.id === state.bass);

  function stop() {
    state.playing = false;
    clearTimeout(state.timer);
    state.timer = null;
    stopAll();
  }

  function play() {
    const barLen = BEAT * 4;
    const s = style();
    PROG.forEach((deg, bar) => {
      const at = bar * barLen;
      const chordObj = set()[deg];
      // 和弦整体下移一个八度，让它真的待在"中间"：
      // 低音 41–48、和弦 53–64、旋律 67–74，三层各占一个音区。
      // （原先把和弦摆在旋律同一个音区上，旋律音和和弦音会撞出小二度。）
      const chord = chordObj.midis.map((m) => m - 12);
      // 低音根音要按音阶算：vi 是 A 不是 F，IV 是 F 不是 D♯。
      // 三级以上的音再往下挪一个八度，低音线就是 C–A–F–G。
      const root = degreeMidi(TONIC, 'major', deg, deg >= 3 ? 1 : 0);
      // boogie 走法里的"六度"要跟着和弦性质走：小和弦上是大六度会跟和弦打架
      const offsets = (style().id === 'boogie' && chordObj.quality === 'minor')
        ? [0, 7, 8, 10] : style().offsets;

      if (state.on.bass) {
        offsets.forEach((off, k) => {
          const slot = offsets.length === 1 ? (state.bass === 'pedal' ? bar : 0) : k;
          playNote(midiToHz(root + off), {
            at: at + slot * BEAT, duration: BEAT * 0.9, level: 0.26,
          });
        });
      }
      if (state.on.chord) {
        [1, 3].forEach((b) => {
          playChord(chord.map(midiToHz), {
            at: at + b * BEAT, duration: BEAT * 0.7, amps: PAD, level: 0.12,
          });
        });
      }
      if (state.on.melody) {
        for (let i = 0; i < 4; i++) {
          playNote(midiToHz(MELODY[bar * 4 + i]), {
            at: at + i * BEAT, duration: BEAT * 0.85, level: 0.22,
          });
        }
      }
      if (state.on.drums) {
        for (let i = 0; i < 8; i++) {
          const frac = i / 2;
          hat(at + frac * BEAT, i % 2 ? 0.05 : 0.08);
        }
      }
    });

    const total = PROG.length * barLen;
    const start = now();
    state.playing = true;
    const tick = () => {
      if (!state.playing) return;
      if (now() - start > total + 0.3) { stop(); return; }
      state.timer = setTimeout(tick, 80);
    };
    tick();
  }

  function paint() {
    [...el.layers.children].forEach((b) => b.setAttribute('aria-pressed', String(state.on[b.dataset.id])));
    [...el.bass.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state.bass)));

    const on = LAYERS.filter((l) => state.on[l.id]);
    const missing = LAYERS.filter((l) => !state.on[l.id]);
    el.readout.innerHTML = `
      <div><dt>在响的层</dt><dd>${on.length ? on.map((l) => l.label).join('、') : '什么都没有'}</dd></div>
      <div><dt>低音写法</dt><dd>${style().label}</dd></div>
      <div><dt>缺了谁</dt><dd>${missing.length ? missing.map((l) => l.label + '（' + l.role + '）').join('、') : '一层不缺'}</dd></div>
    `;

    const t = [];
    if (!state.on.bass) t.push('没有低音：整个东西会头重脚轻，飘着。');
    if (!state.on.melody) t.push('没有旋律：只剩伴奏，像等一个人进来。这也可以是刻意的 —— 主歌前奏常有这种留白。');
    if (!state.on.chord) t.push('没有和声：低音和旋律之间空掉了。两件乐器也能不空，但那要靠低音走得更忙。');
    if (!state.on.drums) t.push('没有节奏层：律动全靠低音的断句撑，会显得静。');
    if (on.length === 4) t.push('四层都满了。注意"满"不等于"好" —— 四层同时都在动的时候，听者的注意力会被摊薄。真实作品会在段落之间加减层。');
    if (on.length <= 1) t.push('只剩一层，那它必须自己承担全部信息量 —— 这就是单线条写作的难处，下一节还会碰到。');
    t.push('低音写法：' + style().why);
    el.note.textContent = t.join('');
  }

  paint();
  return { stop };
}
