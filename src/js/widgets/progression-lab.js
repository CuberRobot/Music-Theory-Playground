/**
 * 第 26 节 · 和弦进行的写法。
 *
 * 第 12 节讲了功能（T / S / D），第 15 节讲了怎么从外面借和弦。
 * 但"知道有哪些和弦"和"排出一条好听的进行"是两件事。
 * 这一节把进行做成可以摆的：点击格子换和弦，听它接得顺不顺。
 *
 * 起作用的其实是三件事：功能的方向、根音的运动、和声节奏（和弦多久换一次）。
 */

import { midiToHz } from '../music/pitch.js';
import { diatonicSet } from '../music/chords.js';
import { playChordSequence, playChord, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';
import { TEMPO } from '../audio/tempo.js';

const TONIC = 60;
const PAD = spectrumToAmps('organ', 10);
const DEGREES = [0, 1, 2, 3, 4, 5];   // I ii iii IV V vi（vii° 太少见，不进格子）
const FN_NAME = { 0: 'T', 1: 'S', 2: 'T', 3: 'S', 4: 'D', 5: 'T' };
const FN_FULL = { T: '主', S: '下属', D: '属' };

const PRESETS = [
  { label: 'I–IV–V–I', degs: [0, 3, 4, 0], tip: '最老的"出门再回家"。三个功能各出现一次，方向最清楚。' },
  { label: 'I–vi–IV–V', degs: [0, 5, 3, 4], tip: '流行歌最爱用的四和弦。它其实是把 I–IV–V 的中间插了一个 vi，让下行更顺。' },
  { label: 'ii–V–I', degs: [1, 4, 0], tip: '爵士最基本的收束。根音连续下行五度：D→G→C，这就是它听起来"一定会到"的原因。' },
  { label: 'I–V–vi–IV', degs: [0, 4, 5, 3], tip: '"四和弦神曲"用的就是它。功能绕了一圈 T→D→T→S，最后没有回 T，所以听起来还想再来一遍。' },
];

export function mountProgressionLab(root) {
  const state = { degs: [0, 5, 3, 4], playing: false };

  root.innerHTML = `
    <div class="card-head">
      <h2>进行编辑器</h2>
      <p class="hint">点格子换和弦。C 大调</p>
    </div>
    <div class="tiles" data-presets role="group" aria-label="常用进行"></div>
    <div class="prog-row" data-slots style="margin-top:var(--sp-5)"></div>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>播放</button>
      <button class="btn" type="button" data-slow>慢一倍</button>
      <button class="btn" type="button" data-add>加一格</button>
      <button class="btn" type="button" data-reset>回到四个</button>
      <span class="tag" data-now>—</span>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <p class="hint" data-tip></p>
  `;

  const el = {
    presets: root.querySelector('[data-presets]'),
    slots: root.querySelector('[data-slots]'),
    readout: root.querySelector('[data-readout]'),
    tip: root.querySelector('[data-tip]'),
    now: root.querySelector('[data-now]'),
  };

  let gap = TEMPO.chord;

  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = p.label;
    b.addEventListener('click', () => {
      state.degs = [...p.degs];
      el.tip.textContent = p.tip;
      paint();
      play();
    });
    el.presets.appendChild(b);
  });

  el.slots.addEventListener('click', (e) => {
    const s = e.target.closest('[data-slot]');
    if (!s) return;
    const i = Number(s.dataset.slot);
    // 点一下就换到下一个级数，循环
    const cur = DEGREES.indexOf(state.degs[i]);
    state.degs[i] = DEGREES[(cur + 1) % DEGREES.length];
    el.tip.textContent = '';
    playChord(chordOf(state.degs[i]).map(midiToHz),
      { duration: 0.9, amps: PAD, level: 0.17 });
    paint();
  });

  root.querySelector('[data-play]').addEventListener('click', play);
  root.querySelector('[data-slow]').addEventListener('click', (ev) => {
    gap = gap > 0.9 ? TEMPO.chord : gap * 2;
    ev.target.textContent = gap > 0.9 ? '正常速度' : '慢一倍';
    play();
  });
  root.querySelector('[data-add]').addEventListener('click', () => {
    if (state.degs.length < 8) { state.degs.push(0); paint(); }
  });
  root.querySelector('[data-reset]').addEventListener('click', () => {
    state.degs = state.degs.slice(0, 4);
    paint();
  });

  const set = () => diatonicSet(TONIC, 'major', 3);
  const chordOf = (deg) => set()[deg].midis;

  function play() {
    stopAll();   // 上一次还没放完就先掐掉，不许叠着响
    playChordSequence(state.degs.map((d) => chordOf(d).map(midiToHz)),
      { gap, duration: gap * 0.85, amps: PAD, level: 0.16 });
    el.now.textContent = state.degs.map((d) => set()[d].roman).join(' → ');
  }

  function paint() {
    const s = set();
    el.slots.innerHTML = state.degs.map((d, i) => {
      const c = s[d];
      const fn = FN_NAME[d];
      return '<button type="button" class="prog-slot fn-' + fn + '" data-slot="' + i + '">'
        + '<span class="prog-roman">' + c.roman + '</span>'
        + '<span class="prog-name">' + c.label.replace('和弦', '') + '</span>'
        + '<span class="prog-fn">' + FN_FULL[fn] + '</span></button>';
    }).join('');

    const fns = state.degs.map((d) => FN_NAME[d]);
    const roman = state.degs.map((d) => s[d].roman).join(' → ');
    // 根音运动：相邻和弦的根音差几个半音
    const roots = state.degs.map((d) => s[d].rootPc);
    const moves = [];
    for (let i = 1; i < roots.length; i++) {
      let d = (roots[i] - roots[i - 1] + 12) % 12;
      if (d > 6) d -= 12;
      moves.push(d);
    }
    /**
     * 五度圈方向 = 根音上行四度（等价于下行五度）。
     * D→G→C 的 ii–V–I 就是它，这是最有方向感的运动。
     *
     * 注意这里只能是 +5：把差值折到 (-6, 6] 之后，
     * "上行四度"是 +5，"上行五度"才变成 -5 —— 两者方向相反。
     * 最初写成 -5 是把方向弄反了，结果 ii–V–I 会被判成 0 处。
     */
    const fifths = moves.filter((d) => d === 5).length;
    const endsOnTonic = FN_NAME[state.degs[state.degs.length - 1]] === 'T';

    el.readout.innerHTML = `
      <div><dt>级数</dt><dd>${roman}</dd></div>
      <div><dt>功能走向</dt><dd>${fns.join(' → ')}</dd></div>
      <div><dt>根音运动</dt><dd>${moves.map((d) => (d > 0 ? '+' : '') + d).join(' / ')}</dd></div>
      <div><dt>五度圈方向</dt><dd>${fifths} 处</dd></div>
      <div><dt>最后落在</dt><dd>${endsOnTonic ? '主功能 —— 收住了' : '非主功能 —— 还想往下走'}</dd></div>
    `;

    if (!el.tip.textContent) {
      const t = [];
      if (fifths >= Math.max(1, moves.length - 1)) t.push('根音几乎都在走五度圈方向（上行四度）—— 这是进行听起来"顺"最直接的原因，ii–V–I 就是它。');
      else if (fifths === 0 && moves.length) t.push('根音没有走五度圈方向，所以没有太强的方向牵引 —— 不代表不好，但那是另一种效果。');
      if (!endsOnTonic) t.push('最后没落在主功能上，听起来是"没说完"，适合接下一段。');
      else t.push('最后落在主功能上，是一个收束。');
      el.tip.textContent = t.join('');
    }
  }

  paint();
  return { stop: () => {} };
}
