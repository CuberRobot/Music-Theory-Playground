/**
 * 第 21 节 · 移调乐器。
 *
 * 移调乐器演奏者读到的音，和他实际发出的音不是同一个 ——
 * 这不是他吹错了，是这件乐器的记谱传统。写谱的人必须替他移调，
 * 否则整首曲子会整体跑掉一个音程。
 */

import { midiToHz, nameOfMidi } from '../music/pitch.js';
import { playSequence } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';

const PAD = spectrumToAmps('organ', 10);
const WRITTEN = 60;   // 假设作曲家写下中央 C

/** offset = 记谱到实际要加的半音数。负数是实际音更低。 */
const INSTRUMENTS = [
  { name: 'C 调乐器',   short: '长笛 / 小提琴 / 钢琴', offset: 0,   why: '记谱音就是实际音，不需要移调。' },
  { name: '降 B 调乐器', short: '小号 / 单簧管 / 次中音萨克斯', offset: -2, why: '谱上写 C，实际响 B♭。所以写谱时要往上写大二度，听起来才是你想要的那个音。' },
  { name: '降 E 调乐器', short: '中音萨克斯 / 上低音萨克斯', offset: -9, why: '谱上写 C，实际响 E♭（低一个大六度）。移调幅度最大的一类。' },
  { name: 'F 调乐器',   short: '圆号 / 英国管', offset: -7, why: '谱上写 C，实际响 F（低一个纯五度）。' },
  { name: '短笛',       short: '高八度记谱', offset: 12, why: '谱上写 C，实际响高八度的 C。它是"反方向"的移调，为了让谱面不用写满加线。' },
  { name: '低音提琴',   short: '低八度记谱', offset: -12, why: '谱上写 C，实际响低八度的 C。同样是为了少写加线。' },
];

export function mountTransposeLab(root) {
  root.innerHTML = `
    <div class="card-head">
      <h2>记谱音与实际音</h2>
      <p class="hint">作曲家写下中央 C 时，各件乐器实际发出的是什么音</p>
    </div>
    <div class="tiles" data-inst role="group" aria-label="乐器"></div>
    <dl class="readout" style="margin-top:var(--sp-4)" data-readout></dl>
    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <button class="btn btn-primary" type="button" data-play>先听记谱音，再听实际音</button>
      <span class="tag" data-now>—</span>
    </div>
    <p class="hint" data-note></p>
  `;

  const el = {
    inst: root.querySelector('[data-inst]'),
    readout: root.querySelector('[data-readout]'),
    now: root.querySelector('[data-now]'),
    note: root.querySelector('[data-note]'),
  };

  let current = INSTRUMENTS[1];

  function paint() {
    const sounding = WRITTEN + current.offset;
    el.readout.innerHTML = `
      <div><dt>作曲家写下</dt><dd>${nameOfMidi(WRITTEN)}</dd></div>
      <div><dt>乐器实际发出</dt><dd>${nameOfMidi(sounding)}</dd></div>
      <div><dt>差多少</dt><dd>${current.offset === 0 ? '没有差别'
        : `${current.offset > 0 ? '高' : '低'} ${Math.abs(current.offset)} 个半音`}</dd></div>
      <div><dt>要写的音</dt><dd>${nameOfMidi(WRITTEN - current.offset)}</dd></div>
      <div><dt>为什么</dt><dd style="text-align:right;max-width:62%">${current.why}</dd></div>
    `;
    [...el.inst.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.name === current.name)));
  }

  INSTRUMENTS.forEach((x) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile';
    b.textContent = x.name;
    b.dataset.name = x.name;
    b.addEventListener('click', () => { current = x; paint(); play(); });
    el.inst.appendChild(b);
  });

  function play() {
    const sounding = WRITTEN + current.offset;
    // 两个音先后响：先记谱音，再实际音，让差距离听得出来
    playSequence([midiToHz(WRITTEN), midiToHz(sounding)],
      { gap: 0.85, duration: 0.8, amps: PAD, level: 0.24 });
    el.now.textContent = current.name;
    el.note.innerHTML = `<b>${current.name}</b>（${current.short}）：${current.why}`;
  }

  root.querySelector('[data-play]').addEventListener('click', play);
  paint();
  el.note.textContent = '点一件乐器：先听到作曲者写下的那个音，再听到乐器实际发出的音。';
}
