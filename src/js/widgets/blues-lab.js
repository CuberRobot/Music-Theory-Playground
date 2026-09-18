/**
 * 第 22 节 · 布鲁斯的元素组成。
 *
 * 布鲁斯的好处是它小：材料有限、规则清楚，正好拿来当"把前面学的东西
 * 一次性用上"的样板。三个元素：蓝调音、十二小节、shuffle。
 */

import { midiToHz, nameOfMidi } from '../music/pitch.js';
import { playNote, playChord, click, now, stopAll } from '../audio/engine.js';

/** 十二小节布鲁斯的和弦级数：I / IV / V。 */
const FORM = [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4];
/** 小调五声音阶 + 降五度 = 布鲁斯音阶。第 4 个音（♭5）就是蓝调音。 */
const BLUES_SCALE = [0, 3, 5, 6, 7, 10];
const BLUE_DEGREE = 3;
const TONIC = 48;          // C3，低音放在这里
const BEAT = 0.48;         // 一拍多少秒，约 125 BPM

export function mountBluesLab(root) {
  const state = { shuffle: true, playing: false, bar: -1, timer: null, raf: null };

  root.innerHTML = `
    <div class="card-head">
      <h2>十二小节布鲁斯</h2>
      <p class="hint">三个元素：蓝调音、十二小节、shuffle</p>
    </div>
    <div class="tiles" data-form role="group" aria-label="十二小节和弦走向"></div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放一遍</button>
      <button class="btn" type="button" data-feel aria-pressed="true">Shuffle</button>
      <span class="tag" data-bar>—</span>
    </div>
    <p class="hint" data-note></p>

    <h3 style="font-family:var(--font-sans);font-size:var(--fs-body);font-weight:500;
      margin:var(--sp-6) 0 var(--sp-2)">布鲁斯音阶（小调五声 + ♭5）</h3>
    <div class="tiles" data-scale role="group" aria-label="布鲁斯音阶"></div>
    <p class="hint" data-scale-note></p>
  `;

  const el = {
    form: root.querySelector('[data-form]'),
    bar: root.querySelector('[data-bar]'),
    note: root.querySelector('[data-note]'),
    scale: root.querySelector('[data-scale]'),
    feel: root.querySelector('[data-feel]'),
  };

  /** FORM 里存的是音阶级数，不是数组下标 —— 要用度数查名字，不能直接索引。 */
  const DEGREE_NAME = { 0: 'I7', 3: 'IV7', 4: 'V7' };
  FORM.forEach((d, i) => {
    const s = document.createElement('span');
    s.className = 'tile';
    s.style.minWidth = '52px';
    s.dataset.idx = String(i);   // 不能叫 data-bar，会和下面的节号读数撞选择器
    s.textContent = `${i + 1}·${DEGREE_NAME[d]}`;
    el.form.appendChild(s);
  });

  BLUES_SCALE.forEach((semi, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    if (i === BLUE_DEGREE) b.classList.add('tone-clay');
    b.textContent = `${nameOfMidi(TONIC + semi + 12)}${i === BLUE_DEGREE ? '（蓝调音）' : ''}`;
    b.addEventListener('click', () => {
      playNote(midiToHz(TONIC + semi + 24), { duration: 0.8, level: 0.26 });
    });
    el.scale.appendChild(b);
  });

  el.feel.addEventListener('click', () => {
    state.shuffle = !state.shuffle;
    el.feel.setAttribute('aria-pressed', String(state.shuffle));
    el.feel.textContent = state.shuffle ? 'Shuffle' : '平均八分';
    el.note.textContent = state.shuffle
      ? 'Shuffle：每一对八分音符奏成 2:1，前长后短 —— 那种"跛脚"的摇摆感就是从这儿来的。'
      : '平均八分：两下一样长。同一个走向，改这一处，整个性格就变了。';
  });

  root.querySelector('[data-play]').addEventListener('click', () => {
    if (state.playing) { stop(); return; }
    play();
  });

  function stop() {
    state.playing = false;
    clearInterval(state.timer);
    cancelAnimationFrame(state.raf);
    state.timer = null; state.raf = null;
    stopAll();
    setBar(-1);
    root.querySelector('[data-play]').textContent = '播放一遍';
  }

  function play() {
    state.playing = true;
    root.querySelector('[data-play]').textContent = '停止';
    const t0 = now() + 0.1;
    const barLen = BEAT * 4;

    FORM.forEach((degree, i) => {
      const at = t0 + i * barLen - now();
      const rootHz = midiToHz(TONIC + degree * 5);
      // 低音在第 1、3 拍，和弦（属七）在第 2、4 拍，这是最基本的布鲁斯伴奏型
      playNote(rootHz, { at, duration: BEAT * 0.85, level: 0.24, release: 0.08 });
      playNote(rootHz, { at: at + BEAT * 2, duration: BEAT * 0.85, level: 0.22, release: 0.08 });
      playChord([0, 4, 7, 10].map((s) => midiToHz(TONIC + degree * 5 + 12 + s)),
        { at: at + BEAT, duration: BEAT * 0.8, level: 0.13, release: 0.08 });
      playChord([0, 4, 7, 10].map((s) => midiToHz(TONIC + degree * 5 + 12 + s)),
        { at: at + BEAT * 3, duration: BEAT * 0.8, level: 0.13, release: 0.08 });
      // 踩镲：shuffle 时奏成 2:1，平均八分时两下等长
      for (let e = 0; e < 8; e++) {
        const frac = state.shuffle
          ? (Math.floor(e / 2) + (e % 2 ? 2 / 3 : 0))
          : e / 2;
        click(at + frac * BEAT, { freq: e % 2 ? 820 : 1180, level: 0.05 });
      }
    });

    const total = FORM.length * barLen;
    state.timer = setInterval(() => {
      const elapsed = now() - t0;
      if (elapsed > total + 0.3) { stop(); return; }
      setBar(Math.max(0, Math.min(11, Math.floor(elapsed / barLen))));
    }, 60);
  }

  function setBar(i) {
    state.bar = i;
    el.bar.textContent = i < 0 ? '—' : `第 ${i + 1} 小节 · ${DEGREE_NAME[FORM[i]]}`;
    [...el.form.children].forEach((s, k) => {
      s.classList.toggle('is-on', k === i);
    });
  }

  setBar(-1);
  el.scale.children[BLUE_DEGREE].setAttribute('aria-pressed', 'false');
  el.note.textContent = 'Shuffle：每一对八分音符奏成 2:1，前长后短 —— 那种"跛脚"的摇摆感就是从这儿来的。';
  el.scale.querySelectorAll('button')[BLUE_DEGREE].style.borderColor = 'var(--clay)';
  el.scale.querySelectorAll('button')[BLUE_DEGREE].style.color = 'var(--clay-deep)';
  root.querySelector('[data-scale-note]').textContent =
    '布鲁斯音阶就是小调五声音阶加一个 ♭5 —— 那个音叫蓝调音，它谁都不属于，所以特别扎耳。'
    + '另外第 3、7 级在实际演唱演奏里经常在大和小之间游移，这就是"蓝调"的来源。';

  return { stop };
}
