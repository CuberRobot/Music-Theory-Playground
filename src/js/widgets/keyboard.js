/**
 * 复用的钢琴键盘。全站所有跟音高有关的地方都用它，保证视觉与手感一致。
 *
 * 用法：
 *   const kb = createKeyboard(host, { from: 60, to: 84, onDown(midi) {...} });
 *   kb.setHighlight([{ midi: 60, tone: 'amber' }, ...]);
 */

import { nameOfMidi } from '../music/pitch.js';

const BLACK_PCS = [1, 3, 6, 8, 10];
const pc = (m) => ((Math.round(m) % 12) + 12) % 12;

/** 语义色。和全站的颜色约定一致：黄=主音，绿=稳定，陶土=紧张。 */
export const TONES = {
  amber: 'var(--amber)',
  green: 'var(--green)',
  clay:  'var(--clay)',
  slate: 'var(--slate)',
  soft:  'var(--amber-soft)',
  deep:  'var(--amber-deep)',
};

const WHITE_W = 26;
const WHITE_H = 108;
const BLACK_W = 16;
const BLACK_H = 66;

export function createKeyboard(host, opts = {}) {
  const from = opts.from ?? 60;
  const to = opts.to ?? 84;
  const onDown = opts.onDown;
  const showLabels = opts.labels ?? false;

  const container = document.createElement('div');
  container.className = 'kb';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', opts.ariaLabel ?? '钢琴键盘');

  const whites = [];
  const blacks = [];
  for (let m = from; m <= to; m++) (BLACK_PCS.includes(pc(m)) ? blacks : whites).push(m);

  const whiteIndex = new Map(whites.map((m, i) => [m, i]));
  container.style.height = `${WHITE_H}px`;
  container.style.minWidth = `${whites.length * WHITE_W}px`;

  const keyEls = new Map();

  const makeKey = (midi, isBlack) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `kb-key ${isBlack ? 'kb-black' : 'kb-white'}`;
    b.dataset.midi = String(midi);
    b.setAttribute('aria-label', nameOfMidi(midi));
    if (isBlack) {
      const below = whites.filter((w) => w < midi).length;
      b.style.left = `${below * WHITE_W - BLACK_W / 2}px`;
      b.style.width = `${BLACK_W}px`;
      b.style.height = `${BLACK_H}px`;
    } else {
      b.style.left = `${whiteIndex.get(midi) * WHITE_W}px`;
      b.style.width = `${WHITE_W - 2}px`;
      b.style.height = `${WHITE_H}px`;
      if (showLabels) {
        const s = document.createElement('span');
        s.className = 'kb-label';
        s.textContent = nameOfMidi(midi);
        b.appendChild(s);
      }
    }
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onDown?.(midi, e);
    });
    container.appendChild(b);
    keyEls.set(midi, b);
    return b;
  };

  whites.forEach((m) => makeKey(m, false));
  blacks.forEach((m) => makeKey(m, true));
  host.appendChild(container);

  let current = [];

  function setHighlight(list) {
    current = (list ?? []).filter(Boolean);
    for (const [midi, el] of keyEls) {
      const hit = current.find((h) => h.midi === midi);
      const isBlack = BLACK_PCS.includes(pc(midi));
      el.style.background = '';
      el.classList.toggle('is-on', !!hit);
      if (hit) {
        el.style.background = TONES[hit.tone] ?? TONES.amber;
        // 黑键本来就是深色，高亮后要保证上面的字还看得见
        el.style.borderColor = isBlack ? (TONES[hit.tone] ?? TONES.amber) : 'var(--ink-1)';
      } else {
        el.style.borderColor = '';
      }
    }
  }

  return {
    element: container,
    setHighlight,
    get highlight() { return current; },
    /** 键盘宽度（像素），窄屏时外面可以横向滚动 */
    get width() { return whites.length * WHITE_W; },
  };
}
