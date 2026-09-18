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
import { playNote, playChord, click } from '../audio/engine.js';

export function mountListenChallenge(root) {
  const script = root.querySelector('script[type="application/json"]');
  if (!script) return;
  const cfg = JSON.parse(script.textContent);

  const rootMidi = cfg.root ?? 60;
  const rootHz = midiToHz(rootMidi);
  const level = cfg.level ?? 0.26;
  const duration = cfg.duration ?? 1.5;

  const ampsFor = (item) => {
    let amps = item.harmonics ? item.harmonics : spectrumToAmps(item.spectrum ?? 'organ', 16);
    if (item.muteFundamental) amps = [0, ...amps.slice(1)];
    return amps;
  };

  /** at 是从现在算起的秒数偏移，供"全部播放一遍"错开时间。 */
  const playAt = (item, at = 0) => {
    if (Array.isArray(item.chord)) {
      playChord(item.chord.map((s) => rootHz * Math.pow(2, s / 12)),
        { duration, level, amps: ampsFor(item), at });
    } else if (Array.isArray(item.clicks)) {
      const beat = item.beat ?? 0.5;
      item.clicks.forEach((v, i) => {
        if (v) click(at + i * beat, { accented: v === 2, level: v === 2 ? 0.26 : 0.15 });
      });
    } else if (Array.isArray(item.notes)) {
      const sec = item.secPerBeat ?? 0.5;
      let t = at;
      item.notes.forEach((n) => {
        playNote(rootHz * Math.pow(2, (n.transpose ?? 0) / 12), {
          at: t,
          duration: Math.max(0.12, n.beats * sec * 0.9),
          level,
          amps: ampsFor(item),
        });
        t += n.beats * sec;
      });
    } else if (typeof item.cents === 'number') {
      playChord([rootHz, rootHz * Math.pow(2, item.cents / 1200)], {
        duration, level: level * 0.8, amps: spectrumToAmps(cfg.spectrum ?? 'organ', 8), at,
      });
    } else {
      playNote(rootHz * Math.pow(2, (item.transpose ?? 0) / 12), {
        duration, level, amps: ampsFor(item), at,
      });
    }
  };

  const items = cfg.items ?? [];
  root.innerHTML = `
    <div class="card-head">
      <h2>${cfg.title ?? '听辨挑战'}</h2>
      <p class="hint">先听，想好了再选。听多少次都不算作答</p>
    </div>
    <p class="lead-p" style="font-size: var(--fs-body)">${cfg.question ?? ''}</p>
    <p class="hint" style="margin-top:0">试听 · 点 ▶ 只播放，不判对错</p>
    <div class="choices"></div>
    <div class="lab-controls" style="margin-top:var(--sp-3)">
      <button class="btn" type="button" data-play-all>全部播放一遍</button>
      <span class="tag" data-count></span>
    </div>
    <p class="hint" style="margin-bottom:6px">作答 · 想好了再点</p>
    <div class="picks"></div>
    <p class="verdict" aria-live="polite"></p>
  `;

  const choices = root.querySelector('.choices');
  const picks = root.querySelector('.picks');
  const verdict = root.querySelector('.verdict');

  items.forEach((item, i) => {
    const label = item.label ?? `选项 ${i + 1}`;

    const listen = document.createElement('button');
    listen.type = 'button';
    listen.className = 'btn choice-play';
    listen.setAttribute('aria-label', `播放${label}`);
    listen.innerHTML = '<span aria-hidden="true">▶</span>';
    listen.addEventListener('click', () => playAt(item, 0));
    choices.appendChild(listen);

    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'btn choice-pick';
    pick.textContent = label;
    pick.addEventListener('click', () => answer(i, pick));
    picks.appendChild(pick);
  });

  root.querySelector('[data-count]').textContent = `${items.length} 个选项`;

  function answer(i, btn) {
    if (btn.dataset.done === '1') return;
    if (i === cfg.answer) {
      btn.dataset.done = '1';
      btn.style.borderColor = 'var(--green)';
      btn.style.background = 'var(--green-soft)';
      verdict.className = 'verdict ok';
      verdict.textContent = cfg.explain ?? '对了。';
    } else {
      // 答错不拦、不标记，只给一句提示，让人继续听
      verdict.className = 'verdict no';
      verdict.textContent = cfg.hint ?? '再听一遍，注意比较两者的差别。';
    }
  }

  root.querySelector('[data-play-all]').addEventListener('click', () => {
    const gap = duration + 0.6;
    items.forEach((item, i) => playAt(item, i * gap));
  });
}
