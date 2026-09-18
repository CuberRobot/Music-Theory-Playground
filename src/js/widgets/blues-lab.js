/**
 * 第 22 节 · 布鲁斯的元素组成。
 *
 * 布鲁斯的好处是它小：材料有限、规则清楚，正好拿来当"把前面学的东西
 * 一次性用上"的样板。三个元素：蓝调音、十二小节、shuffle。
 */

import { midiToHz, nameOfMidi } from '../music/pitch.js';
import {
  now, stopAll, playPluck, preloadPluck, hat,
} from '../audio/engine.js';

/**
 * 十二小节布鲁斯。数组里的数字是**根音相对主音的半音数**，不是音阶级数：
 * I = 0、IV = 5、V = 7。之前误写成"级数 × 5"，于是 IV 变成了 E♭、
 * V 变成了 A♭，整条进行全错。
 */
const FORM = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];
/** 小调五声音阶 + 降五度 = 布鲁斯音阶。第 4 个音（♭5）就是蓝调音。 */
const BLUES_SCALE = [0, 3, 5, 6, 7, 10];
const BLUE_DEGREE = 3;
const TONIC = 48;          // C3，低音放在这里
const BEAT = 0.48;         // 一拍多少秒，约 125 BPM

/**
 * Boogie 低音走法：根音 → 五度 → 六度 → ♭7，四个四分音符。
 * 这是布鲁斯低音的标准动作，光这一条就能消掉大半单调感 ——
 * 原来的低音每小节只重复同一个音。
 */
const BOOGIE = [0, 7, 9, 10];

/**
 * Riff。每一格是一个八分音符，数字是相对和弦根音的半音数（已经含高八度）。
 * 全部落在布鲁斯音阶上：0 ♭3 4 ♭5 5 ♭7。
 * A 是"问句"（半音上行再回来），B 是"答句"（下行落回根音）——
 * 两小节构成一次呼与应，正好呼应正文里那条"呼与应"的元素。
 */
const RIFF_A = [[0, 12], [1, 15], [2, 17], [3, 18], [4, 19], [5, 18], [6, 17], [7, 15]];
const RIFF_B = [[0, 19], [1, 18], [2, 17], [3, 15], [4, 12], [6, 12]];
/**
 * 第 12 小节的 turnaround：从 ♭7 半音下行到五度，制造"回头"的拉力。
 * 相对主音算，不随小节的和弦移调 —— 它的任务是把你送回开头。
 * 从 ♭7 起而不是从根音起，是为了避开大七度和和弦里小七度的硬撞。
 */
const TURNAROUND = [[0, 10], [2, 9], [4, 8], [6, 7]];

export function mountBluesLab(root) {
  const state = { shuffle: true, riff: true, playing: false, bar: -1, timer: null, raf: null };

  root.innerHTML = `
    <div class="card-head">
      <h2>十二小节布鲁斯</h2>
      <p class="hint">三个元素：蓝调音、十二小节、shuffle</p>
    </div>
    <div class="tiles" data-form role="group" aria-label="十二小节和弦走向"></div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放一遍</button>
      <button class="btn" type="button" data-feel aria-pressed="true">Shuffle</button>
      <button class="btn" type="button" data-riff aria-pressed="true">加 riff</button>
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
    riff: root.querySelector('[data-riff]'),
  };

  const CHORD_NAME = { 0: 'I7', 5: 'IV7', 7: 'V7' };
  FORM.forEach((d, i) => {
    const s = document.createElement('span');
    s.className = 'tile';
    s.style.minWidth = '52px';
    s.dataset.idx = String(i);   // 不能叫 data-bar，会和下面的节号读数撞选择器
    s.textContent = `${i + 1}·${CHORD_NAME[d]}`;
    el.form.appendChild(s);
  });

  BLUES_SCALE.forEach((semi, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    if (i === BLUE_DEGREE) b.classList.add('tone-clay');
    b.textContent = `${nameOfMidi(TONIC + semi + 12)}${i === BLUE_DEGREE ? '（蓝调音）' : ''}`;
    b.addEventListener('click', () => {
      playPluck(midiToHz(TONIC + semi + 24), { duration: 1.6, level: 0.28 });
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

  el.riff.addEventListener('click', () => {
    state.riff = !state.riff;
    el.riff.setAttribute('aria-pressed', String(state.riff));
    el.riff.textContent = state.riff ? '加 riff' : '只有伴奏';
    el.note.textContent = state.riff
      ? 'riff 是压在小节上的一句短旋律，两小节一问一答。它不改变和弦，但决定了这段音乐记不记得住。'
      : '现在只剩 boogie 低音和和弦打点。同一套和弦走向，去掉 riff 之后明显垮下来 —— 这正是 riff 的作用。';
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
    preloadPluck();
    state.playing = true;
    root.querySelector('[data-play]').textContent = '停止';
    const t0 = now() + 0.1;
    const barLen = BEAT * 4;

    FORM.forEach((degree, i) => {
      const at = t0 + i * barLen - now();
      const root = TONIC + degree;

      // 低音：boogie 走法，四个四分音符各走一个音。
      // 原来这里每小节只重复同一个音，单调感大半出在这儿。
      BOOGIE.forEach((s, b) => {
        playPluck(midiToHz(root + s), {
          at: at + b * BEAT, duration: BEAT * 1.5, level: 0.26,
          brightness: 0.34, damping: 0.42,
        });
      });

      // 和弦：第 2、4 拍打点。省掉根音 —— 低音已经在走，
      // 和弦里再放一个只会把低频糊掉；三音五音降七音照样听得出是属七。
      [1, 3].forEach((b) => {
        [4, 7, 10].forEach((s, k) => {
          playPluck(midiToHz(root + 12 + s), {
            at: at + b * BEAT + k * 0.01, duration: BEAT * 1.2, level: 0.085,
            brightness: 0.58, damping: 0.5,
          });
        });
      });

      // riff：最后一小节换成 turnaround，其余 A / B 交替成一句一问一答
      if (state.riff) {
        const isTurn = i === FORM.length - 1;
        const notes = isTurn ? TURNAROUND : (i % 2 === 0 ? RIFF_A : RIFF_B);
        const base = isTurn ? TONIC : root;
        notes.forEach(([e, s]) => {
          playPluck(midiToHz(base + s), {
            at: at + (e / 2) * BEAT, duration: BEAT * 1.1, level: 0.15,
            brightness: 0.72, damping: 0.36,
          });
        });
      }
      // 踩镲：shuffle 时奏成 2:1，平均八分时两下等长
      for (let e = 0; e < 8; e++) {
        const frac = state.shuffle
          ? (Math.floor(e / 2) + (e % 2 ? 2 / 3 : 0))
          : e / 2;
        hat(at + frac * BEAT, state.shuffle && e % 2 ? 0.05 : 0.07);
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
    el.bar.textContent = i < 0 ? '—' : `第 ${i + 1} 小节 · ${CHORD_NAME[FORM[i]]}`;
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
