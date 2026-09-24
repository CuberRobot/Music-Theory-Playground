/**
 * 通用听辨挑战。页面里写一段 JSON 配置就能用：
 *
 *   <div class="card challenge" data-widget="listen-challenge">
 *     <script type="application/json">
 *       { "question": "…", "root": 60,
 *         "items": [{ "label": "A", "cents": 678.5 }, …],
 *         "answer": 0, "explain": "…" }
 *     </script>
 *   </div>
 *
 * 每个选项可以是：
 *   { "cents": 678.5 }                       两个音同时响，相距这么多音分
 *   { "chord": [0, 4, 7] }                   同时响几个音
 *   { "clicks": [2,1,1], "beat": 0.5 }       节奏拍点：0 不响、1 响、2 重音
 *   { "notes": [{ "beats": 1, "transpose": 4 }], "secPerBeat": 0.5 }   有真实时值的旋律
 *   { "spectrum": "clarinet", "muteFundamental": true }   单音，可指定音色或拿掉基频
 *
 * **试听和作答是分开的两排按钮。** 以前点选项就等于作答，
 * 想先听一遍再决定都做不到 —— 听辨题不该这样。
 * 现在 ▶ 只播放不判定，点选项才算作答。
 *
 * 答错只是重播，不扣分 —— 这是全站的规矩，错误是信息不是惩罚。
 */

import { midiToHz } from '../music/pitch.js';
import { spectrumToAmps } from '../music/tuning.js';
import { playNote, playChord, click, stopAll } from '../audio/engine.js';

export function mountListenChallenge(root) {
  const script = root.querySelector('script[type="application/json"]');
  if (!script) return;
  const cfg = JSON.parse(script.textContent);

  /**
   * 一道题还是多道题。
   *
   * 以前的写法只允许整个实验台出一道题 —— 结果第 1 节的题干问了
   * "哪一个是纯五度、哪一个是狼五度"（两件事），界面上却只有一个作答区。
   * 现在两种写法都支持：老页面（question + items + answer）照旧，
   * 想要两道题就写 questions: [{ question, items, answer, ... }, …]，
   * 每一道题有自己的试听行、作答行和反馈行。
   */
  const questions = (cfg.questions ?? [{
    question: cfg.question,
    items: cfg.items ?? [],
    answer: cfg.answer,
    hint: cfg.hint,
    explain: cfg.explain,
  }]).map((q) => ({
    ...q,
    items: q.items ?? [],
    rootHz: midiToHz(q.root ?? cfg.root ?? 60),
    spectrum: q.spectrum ?? cfg.spectrum ?? 'organ',
    level: q.level ?? cfg.level ?? 0.26,
    duration: q.duration ?? cfg.duration ?? 1.5,
  }));

  const ampsFor = (item) => {
    let amps = item.harmonics ? item.harmonics : spectrumToAmps(item.spectrum ?? 'organ', 16);
    if (item.muteFundamental) amps = [0, ...amps.slice(1)];
    return amps;
  };

  /** 一个选项要响多久（秒）。用来排"全部播放一遍"，也用来决定指示器什么时候灭。 */
  const lengthOf = (item, q) => {
    if (Array.isArray(item.clicks)) return item.clicks.length * (item.beat ?? 0.5);
    if (Array.isArray(item.notes)) {
      return item.notes.reduce((a, n) => a + n.beats, 0) * (item.secPerBeat ?? 0.5);
    }
    return q.duration;
  };

  /** at 是从现在算起的秒数偏移。 */
  const playAt = (item, at, q) => {
    const level = q.level;
    if (Array.isArray(item.chord)) {
      playChord(item.chord.map((s) => q.rootHz * Math.pow(2, s / 12)),
        { duration: q.duration, level, amps: ampsFor(item), at });
    } else if (Array.isArray(item.clicks)) {
      const beat = item.beat ?? 0.5;
      item.clicks.forEach((v, i) => {
        if (v) click(at + i * beat, { accented: v === 2, level: v === 2 ? 0.26 : 0.15 });
      });
    } else if (Array.isArray(item.notes)) {
      const sec = item.secPerBeat ?? 0.5;
      let t = at;
      item.notes.forEach((n) => {
        playNote(q.rootHz * Math.pow(2, (n.transpose ?? 0) / 12), {
          at: t,
          duration: Math.max(0.12, n.beats * sec * 0.9),
          level,
          amps: ampsFor(item),
        });
        t += n.beats * sec;
      });
    } else if (typeof item.cents === 'number') {
      playChord([q.rootHz, q.rootHz * Math.pow(2, item.cents / 1200)], {
        duration: q.duration, level: level * 0.8, amps: spectrumToAmps(q.spectrum, 8), at,
      });
    } else {
      playNote(q.rootHz * Math.pow(2, (item.transpose ?? 0) / 12), {
        duration: q.duration, level, amps: ampsFor(item), at,
      });
    }
  };

  root.innerHTML = `
    <div class="card-head">
      <h2>${cfg.title ?? '听辨挑战'}</h2>
      <p class="hint">先听，想好了再选。听多少次都不算作答</p>
    </div>
    <div data-questions></div>
  `;

  const host = root.querySelector('[data-questions]');
  const timers = new Set();

  const clearTimers = () => { for (const t of timers) clearTimeout(t); timers.clear(); };

  let blocks = [];

  questions.forEach((q, qi) => {
    const multi = questions.length > 1;
    const box = document.createElement('div');
    box.className = 'challenge-q';
    box.innerHTML = `
      <p class="lead-p" style="font-size: var(--fs-body);margin:0 0 var(--sp-2)">
        ${multi ? `<span class="tag">第 ${qi + 1} 题</span> ` : ''}${q.question ?? ''}
      </p>
      <p class="hint" style="margin:0">试听 · 点 ▶ 只播放，不判对错</p>
      <div class="choices"></div>
      <div class="lab-controls" style="margin-top:var(--sp-2)">
        <button class="btn" type="button" data-play-all>全部播放一遍</button>
        <span class="tag" data-count></span>
      </div>
      <p class="hint" style="margin-bottom:6px">作答 · 想好了再点</p>
      <div class="picks"></div>
      <p class="verdict" aria-live="polite"></p>
    `;
    host.appendChild(box);

    const choices = box.querySelector('.choices');
    const picks = box.querySelector('.picks');
    const verdict = box.querySelector('.verdict');
    const tag = box.querySelector('[data-count]');
    const playAllBtn = box.querySelector('[data-play-all]');

    const setPlaying = (idx) => {
      [...choices.children].forEach((b, i) => b.classList.toggle('is-playing', i === idx));
    };

    /** 正在播放时按钮上要看得出来 —— 以前"全部播放一遍"点了像没点。 */
    const setProgress = (text) => { tag.textContent = text; };

    const block = { items: q.items, setPlaying, setProgress, playAllBtn, solved: false };
    blocks.push(block);

    q.items.forEach((item, i) => {
      const label = item.label ?? `选项 ${i + 1}`;
      const letter = label.replace(/\s*组$/, '');

      const listen = document.createElement('button');
      listen.type = 'button';
      listen.className = 'btn choice-play';
      listen.setAttribute('aria-label', `播放${label}`);
      listen.innerHTML = `<span aria-hidden="true">▶</span> ${letter}`;
      listen.addEventListener('click', () => playOne(q, i, setPlaying, setProgress));
      choices.appendChild(listen);

      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'btn choice-pick';
      pick.textContent = label;
      pick.addEventListener('click', () => answer(i, pick, q, verdict, block));
      picks.appendChild(pick);
    });

    setProgress(`${q.items.length} 个选项`);
    playAllBtn.addEventListener('click', () => playAll(q, setPlaying, setProgress));
  });

  function answer(i, btn, q, verdict, block) {
    const correct = i === q.answer;
    if (correct) {
      block.solved = true;
      block.explain = q.explain ?? '对了。';
      btn.dataset.done = '1';
      btn.style.borderColor = 'var(--green)';
      btn.style.background = 'var(--green-soft)';
    }
    verdict.className = `verdict ${correct ? 'ok' : 'no'}`;
    verdict.textContent = correct
      ? block.explain
      : block.solved
        // 答对之后再点错选项，不要把已经给出的解释擦掉 ——
        // 想回头核对"错在哪里"的人需要它（issue #3-6）。
        ? `${block.explain}（这次点的不是它。）`
        : (q.hint ?? '再听一遍，注意比较两者的差别。');
  }

  /** 每按一次播放都先掐掉上一次 —— 不允许两次播放叠在一起。 */
  function resetAll(except) {
    stopAll();
    clearTimers();
    for (const b of blocks) {
      if (b !== except) { b.setPlaying(-1); b.setProgress(`${b.items.length} 个选项`); }
    }
  }

  function playOne(q, i, setPlaying, setProgress) {
    resetAll();
    playAt(q.items[i], 0, q);
    setPlaying(i);
    setProgress(`正在播放：${q.items[i].label ?? `选项 ${i + 1}`}`);
    timers.add(setTimeout(() => {
      setPlaying(-1);
      setProgress(`${q.items.length} 个选项`);
    }, (lengthOf(q.items[i], q) + 0.25) * 1000));
  }

  function playAll(q, setPlaying, setProgress) {
    resetAll();
    const gap = 0.6;
    let at = 0;
    q.items.forEach((item, i) => {
      playAt(item, at, q);
      timers.add(setTimeout(() => {
        setPlaying(i);
        setProgress(`正在播放 ${i + 1} / ${q.items.length}`);
      }, at * 1000));
      at += lengthOf(item, q) + gap;
    });
    timers.add(setTimeout(() => {
      setPlaying(-1);
      setProgress(`${q.items.length} 个选项`);
    }, (at + 0.2) * 1000));
  }
}
