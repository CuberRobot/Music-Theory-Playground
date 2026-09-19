/**
 * O · 三日月之舞 · 独奏对照台
 *
 * 这首曲子的独奏位置，在动画里演成了第一季最大的那场冲突：
 * 三年级的香织和一年级的丽奈为它比了一次公开选拔。
 *
 * 为什么"谁吹这一段"能闹到那一步？因为独奏不是换个音色，
 * 它是整首曲子的重心：同一串音高，句子往哪儿走、那个高点停多久、
 * 尾巴怎么收，全是演奏者当场决定的。同一份谱，换一个人，曲子就换了重心。
 *
 * 下面响的是**本站自己写的素材**（不是原曲，也不是香织或丽奈的演奏）：
 * 一串音高，两种吹法。两串音高一个音都不差，差别全在时间轴上，
 * 所以这里把两条时间轴并排画出来 —— 听得见，也看得见。
 *
 * 提醒：A、B 不对应香织和丽奈。那两版在官方原声带里，自己听。
 */

import { midiToHz } from '../music/pitch.js';
import { playNote, stopAll } from '../audio/engine.js';
import { spectrumToAmps } from '../music/tuning.js';
import { createNoteStrip, PLAY_LEAD } from '../audio/transport.js';

const SOLO = spectrumToAmps('voice', 10);

/** 示范用的速度。这一段素材是本站写的，所以这里不是"原谱标记"，是示范速度。 */
const DEMO_BPM = 76;

/**
 * 两种吹法。start / dur 的单位都是拍（页面再乘一拍的秒数）。
 * 两版的音高序列必须完全相同 —— 审计脚本会核对这一点。
 */
export const SOLO_TAKES = {
  bpm: DEMO_BPM,
  pitches: [72, 74, 76, 77, 76, 74, 72],
  a: {
    id: 'a',
    label: 'A · 照着拍子吹',
    tip: '每个音一样长、一样响，最高的那个 F 只停一拍，句尾收得干脆。准确、干净，句子是平的。',
    notes: [
      { midi: 72, start: 0, dur: 1 },
      { midi: 74, start: 1, dur: 1 },
      { midi: 76, start: 2, dur: 1 },
      { midi: 77, start: 3, dur: 1 },
      { midi: 76, start: 4, dur: 1 },
      { midi: 74, start: 5, dur: 1 },
      { midi: 72, start: 6, dur: 2 },
    ],
    level: 0.2,
  },
  b: {
    id: 'b',
    label: 'B · 把句子唱出来',
    tip: '起句留了半拍气口，一路推进去；最高的 F 停两拍多，是整句的重心；句尾放长，最后收细。同样的七个音，成了另一句话。',
    notes: [
      { midi: 72, start: 0.15, dur: 1.35, level: 0.16 },
      { midi: 74, start: 1.5, dur: 1.1, level: 0.18 },
      { midi: 76, start: 2.6, dur: 1.1, level: 0.2 },
      { midi: 77, start: 3.7, dur: 2.3, level: 0.26 },
      { midi: 76, start: 6.0, dur: 0.8, level: 0.2 },
      { midi: 74, start: 6.8, dur: 0.8, level: 0.17 },
      // 句尾拆成两笔：后一笔轻下去，听成一次渐弱
      { midi: 72, start: 7.6, dur: 1.6, level: 0.22 },
      { midi: 72, start: 9.1, dur: 1.3, level: 0.09 },
    ],
    level: 0.2,
  },
};

/** 把"拍"换成秒，得到音符条要的时间轴。 */
function timeline(take) {
  const beat = 60 / SOLO_TAKES.bpm;
  return take.notes.map((n) => ({
    midi: n.midi,
    start: n.start * beat,
    dur: n.dur * beat,
    level: n.level ?? take.level,
  }));
}

/** 两种吹法的总长，单位是拍。 */
const TAKE_BEATS = {
  a: Math.max(...SOLO_TAKES.a.notes.map((n) => n.start + n.dur)),
  b: Math.max(...SOLO_TAKES.b.notes.map((n) => n.start + n.dur)),
};

/** 供审计用：两种吹法的总长（拍）。 */
export const SOLO_LENGTHS = { a: TAKE_BEATS.a, b: TAKE_BEATS.b };

export function mountSoloLab(root) {
  const timers = [];

  root.innerHTML = `
    <div class="card-head">
      <h2>独奏对照台</h2>
      <p class="hint">七个音，一个音都不改，只改句子怎么走</p>
    </div>
    <p class="hint" style="margin-top:0">
      这一段是<b>本站自己写的素材</b>：不是原曲，也不是香织或丽奈的演奏。
      A、B 也不对应她们两个人 —— 那两版在官方原声带里（见下面的对照表），自己听。
      示范速度 <span class="note" role="img" aria-label="四分音符"></span>=${DEMO_BPM}，不是原谱标记。
    </p>
    <div class="solo-takes">
      ${['a', 'b'].map((id) => `
        <div class="solo-take" data-take="${id}">
          <h3>${SOLO_TAKES[id].label}</h3>
          <p class="hint" style="margin:0 0 var(--sp-2)">${SOLO_TAKES[id].tip}</p>
          <div data-strip="${id}"></div>
          <div class="lab-controls" style="margin-top:var(--sp-3)">
            <button class="btn" type="button" data-play="${id}">听这一版</button>
          </div>
        </div>`).join('')}
    </div>
    <div class="lab-controls" style="margin-top:var(--sp-4)">
      <button class="btn btn-primary" type="button" data-ab>连着听（A → B）</button>
      <button class="btn" type="button" data-stop>停</button>
    </div>
    <dl class="readout" style="margin-top:var(--sp-4)"></dl>
  `;

  const strips = {
    a: createNoteStrip(root.querySelector('[data-strip="a"]'), { ariaLabel: 'A 版（照着拍子吹）的音符与播放进度' }),
    b: createNoteStrip(root.querySelector('[data-strip="b"]'), { ariaLabel: 'B 版（把句子唱出来）的音符与播放进度' }),
  };
  const lines = { a: timeline(SOLO_TAKES.a), b: timeline(SOLO_TAKES.b) };
  // 两条时间轴先画出来 —— 这个实验台的重点就是"看得出来 B 更长"
  strips.a.load(lines.a);
  strips.b.load(lines.b);

  const peak = (take) => Math.max(...take.notes.map((n) => (n.midi === 77 ? n.dur : 0)));
  /**
   * 句尾的长度：从最后一组音（主音 72，且在高点之后）的起音算到整句结束。
   * 不能直接拿"所有主音"来量 —— 句子的第一个音也是主音，那样量出来是整句的长度。
   */
  const tail = (take) => {
    const end = Math.max(...take.notes.map((n) => n.start + n.dur));
    const peakStart = Math.min(...take.notes.filter((n) => n.midi === 77).map((n) => n.start));
    const group = take.notes.filter((n) => n.midi === SOLO_TAKES.pitches.at(-1) && n.start > peakStart);
    return end - Math.min(...group.map((n) => n.start));
  };
  const beat = 60 / DEMO_BPM;
  root.querySelector('dl').innerHTML = `
    <div><dt>音高</dt><dd class="hi">两版完全相同（${SOLO_TAKES.pitches.length} 个音，顺序一样）</dd></div>
    <div><dt>最高音 F5 停多久</dt><dd>A ${peak(SOLO_TAKES.a)} 拍 · B ${peak(SOLO_TAKES.b).toFixed(1)} 拍</dd></div>
    <div><dt>句尾 C5 有多长</dt><dd>A ${tail(SOLO_TAKES.a)} 拍 · B ${tail(SOLO_TAKES.b).toFixed(1)} 拍</dd></div>
    <div><dt>整句长度</dt><dd>A ${TAKE_BEATS.a} 拍 · B ${TAKE_BEATS.b} 拍（约 ${(TAKE_BEATS.b * beat).toFixed(1)} 秒）</dd></div>
    <div><dt>这个差别有多大</dt><dd>B 比 A 长了约四分之一。真实演奏当然没这么夸张 —— 官方原声带那两版全长只差 5 秒，差别就在这种"停多久、收多长"上</dd></div>`;

  function clearTimers() {
    while (timers.length) clearTimeout(timers.pop());
  }

  function stop() {
    clearTimers();
    strips.a.stop();
    strips.b.stop();
    stopAll();
  }

  function play(id) {
    strips[id].load(lines[id]);
    lines[id].forEach((n) => playNote(midiToHz(n.midi), {
      at: PLAY_LEAD + n.start,
      duration: Math.max(0.2, n.dur),
      amps: SOLO,
      level: n.level ?? SOLO_TAKES[id].level,
      decay: 1.4,
      attack: 0.03,
      release: 0.28,
    }));
    strips[id].play(() => {});
  }

  ['a', 'b'].forEach((id) => {
    root.querySelector(`[data-play="${id}"]`).addEventListener('click', () => { stop(); play(id); });
  });
  root.querySelector('[data-ab]').addEventListener('click', () => {
    stop();
    play('a');
    timers.push(setTimeout(() => play('b'), (TAKE_BEATS.a * beat + 0.6) * 1000));
  });
  root.querySelector('[data-stop]').addEventListener('click', stop);
}
