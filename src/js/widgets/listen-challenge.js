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
 *   { "spectrum": "clarinet" }               单音，用某个泛音配方
 *   { "spectrum": "saw", "muteFundamental": true }   同上，但拿掉基频
 *   { "harmonics": [1,0,0.5,…] }             直接给振幅数组
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
    let amps = item.harmonics
      ? item.harmonics
      : spectrumToAmps(item.spectrum ?? 'organ', 16);
    if (item.muteFundamental) amps = [0, ...amps.slice(1)];
    return amps;
  };

  const play = (item) => {
    if (Array.isArray(item.clicks)) {
      // 节奏题：0 不响、1 响、2 重音。beat 是一拍多少秒。
      const beat = item.beat ?? 0.5;
      item.clicks.forEach((v, i) => {
        if (v) click(i * beat, { accented: v === 2, level: v === 2 ? 0.26 : 0.15 });
      });
    } else if (Array.isArray(item.notes)) {
      // 时值题：每个音真的响够那么长，不然听不出长短
      const sec = item.secPerBeat ?? 0.5;
      let at = 0;
      item.notes.forEach((n) => {
        playNote(rootHz * Math.pow(2, (n.transpose ?? 0) / 12), {
          at,
          duration: Math.max(0.12, n.beats * sec * 0.9),
          level,
          amps: ampsFor(item),
        });
        at += n.beats * sec;
      });
    } else if (typeof item.cents === 'number') {
      playChord([rootHz, rootHz * Math.pow(2, item.cents / 1200)], {
        duration, level: level * 0.8, amps: spectrumToAmps(cfg.spectrum ?? 'organ', 8),
      });
    } else {
      playNote(rootHz * Math.pow(2, (item.transpose ?? 0) / 12), {
        duration, level, amps: ampsFor(item),
      });
    }
  };

  const items = cfg.items ?? [];
  root.innerHTML = `
    <div class="card-head">
      <h2>${cfg.title ?? '听辨挑战'}</h2>
      <p class="hint">点一次听一遍，可以反复听</p>
    </div>
    <p class="lead-p" style="font-size: var(--fs-body)">${cfg.question ?? ''}</p>
    <div class="choices"></div>
    <p class="verdict" aria-live="polite"></p>
  `;

  const choices = root.querySelector('.choices');
  const verdict = root.querySelector('.verdict');
  const buttons = [];

  items.forEach((item, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = item.label ?? `选项 ${i + 1}`;
    b.addEventListener('click', () => {
      play(item);
      if (b.dataset.picked === '1') return;
      if (i === cfg.answer) {
        b.dataset.picked = '1';
        b.style.borderColor = 'var(--green)';
        verdict.className = 'verdict ok';
        verdict.textContent = cfg.explain ?? '对了。';
      } else {
        // 答错不拦，也不标记，只是给一句提示，让人继续听
        verdict.className = 'verdict no';
        verdict.textContent = cfg.hint ?? '再听一遍，注意比较两者的差别。';
      }
    });
    choices.appendChild(b);
    buttons.push(b);
  });
}
