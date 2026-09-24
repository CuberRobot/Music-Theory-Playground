/**
 * 第 5 节 · 音的长短。
 * 时值不是"一个符号"，是一段时间。把音符块放进小节里，听听它到底响多久。
 *
 * 这一版加了两样东西：
 *   · 休止符 —— 沉默也是被排出来的，不是"剩下没填的地方"。
 *   · 节奏模板 —— 直接套一个真实存在的节奏型，比一个个点快得多。
 *     点模板会先把小节清空：模板是"另一种整小节"，和现成内容叠着没有意义。
 */

import { DURATIONS, durationByKey, fitsMeasure } from '../music/rhythm.js';
import { playNote, click, stopAll } from '../audio/engine.js';

const BEATS_PER_MEASURE = 4;
const SEC_PER_BEAT = 0.62;
const PITCH = 440;

const restLabel = (label) => label.replace('音符', '休止符');

/**
 * 节奏模板。每一条都必须正好装满 4/4 —— 审计脚本会核对这件事：
 * 时值写错一个，这一节的练习就白做了。
 */
export const RHYTHM_TEMPLATES = [
  {
    id: 'march',
    label: '平均步伐',
    tip: '四个四分音符。最中性的走法——先听它，再听别的，差别最清楚。',
    seq: [
      { type: 'note', key: 'quarter' }, { type: 'note', key: 'quarter' },
      { type: 'note', key: 'quarter' }, { type: 'note', key: 'quarter' },
    ],
  },
  {
    id: 'longshort',
    label: '长—短—长',
    tip: '附点四分 + 八分 + 二分。附点把下一拍"吸"到自己身上，所以听起来像被推了一下。',
    seq: [
      { type: 'note', key: 'dottedQuarter' }, { type: 'note', key: 'eighth' },
      { type: 'note', key: 'half' },
    ],
  },
  {
    id: 'rests',
    label: '空拍练习',
    tip: '休止符不是"没有东西"，它是被安排好的沉默——拍子照走，只是不响。',
    seq: [
      { type: 'rest', key: 'quarter' }, { type: 'note', key: 'quarter' },
      { type: 'rest', key: 'quarter' }, { type: 'note', key: 'quarter' },
    ],
  },
  {
    id: 'syncopa',
    label: '切分的影子',
    tip: '八分 — 附点四分 — 八分 — 四分：重音落到了弱拍上，这就是最简单的切分。',
    seq: [
      { type: 'note', key: 'eighth' }, { type: 'note', key: 'dottedQuarter' },
      { type: 'note', key: 'eighth' }, { type: 'note', key: 'quarter' },
    ],
  },
  {
    id: 'whole',
    label: '一个全音符',
    tip: '整小节一个音。反过来练"不断"——听它怎么从头撑到尾。',
    seq: [{ type: 'note', key: 'whole' }],
  },
];

export function mountDurationBuilder(root) {
  const state = { seq: [], template: null };

  root.innerHTML = `
    <div class="card-head">
      <h2>小节拼装台</h2>
      <p class="hint">往 4/4 的小节里放音符或休止符，放满四拍</p>
    </div>
    <p class="hint" style="margin:0 0 var(--sp-2)">音符</p>
    <div class="tiles" data-palette role="group" aria-label="音符时值"></div>
    <p class="hint" style="margin:var(--sp-4) 0 var(--sp-2)">休止符（同样的时值，只是不发音）</p>
    <div class="tiles" data-rests role="group" aria-label="休止符时值"></div>
    <p class="hint" style="margin:var(--sp-4) 0 var(--sp-2)">节奏模板（点一下会先清空小节）</p>
    <div class="tiles" data-templates role="group" aria-label="节奏模板"></div>

    <div class="timeline" data-timeline style="margin-top: var(--sp-4)">
      <div class="tickbar" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </div>

    <div class="lab-controls" style="margin-top: var(--sp-4)">
      <span class="tag" data-count></span>
      <button class="btn btn-primary" type="button" data-play>播放</button>
      <button class="btn" type="button" data-undo>删掉最后一个</button>
      <button class="btn" type="button" data-clear>清空</button>
    </div>
    <p class="hint" data-msg style="min-height:1.6em"></p>
    <p class="hint" data-tip style="min-height:1.6em"></p>

    <div class="scroll-x" style="margin-top: var(--sp-5)">
      <table class="table">
        <caption class="sr-only">常用时值表</caption>
        <thead>
          <tr><th scope="col">音符 / 休止符</th><th scope="col">占几拍</th><th scope="col">与全音符的关系</th><th scope="col">一个四拍小节能放几个</th></tr>
        </thead>
        <tbody data-table></tbody>
      </table>
    </div>
  `;

  const el = {
    palette: root.querySelector('[data-palette]'),
    rests: root.querySelector('[data-rests]'),
    templates: root.querySelector('[data-templates]'),
    timeline: root.querySelector('[data-timeline]'),
    count: root.querySelector('[data-count]'),
    msg: root.querySelector('[data-msg]'),
    tip: root.querySelector('[data-tip]'),
    tbody: root.querySelector('[data-table]'),
  };

  const addTile = (host, type, d) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = type === 'rest' ? restLabel(d.label) : d.label;
    b.dataset.key = d.key;
    b.dataset.type = type;
    b.addEventListener('click', () => addEntry({ type, key: d.key }));
    host.appendChild(b);
  };
  DURATIONS.forEach((d) => addTile(el.palette, 'note', d));
  DURATIONS.forEach((d) => addTile(el.rests, 'rest', d));

  RHYTHM_TEMPLATES.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = t.label;
    b.dataset.tpl = t.id;
    b.addEventListener('click', () => {
      state.seq = t.seq.map((x) => ({ ...x }));
      state.template = t.id;
      el.msg.textContent = `已套用模板「${t.label}」，原来的内容清空了。`;
      el.tip.textContent = t.tip;
      paint();
    });
    el.templates.appendChild(b);
  });

  el.tbody.innerHTML = DURATIONS.map((d) => {
    const ratio = d.beats === 4 ? '本身' : `1 / ${Math.round(4 / d.beats)}`;
    return `<tr>
      <td>${d.label} / ${restLabel(d.label)}</td>
      <td class="num">${d.beats}</td>
      <td class="num">${ratio}</td>
      <td class="num">${Number.isInteger(4 / d.beats) ? 4 / d.beats : '不是整数个'}</td>
    </tr>`;
  }).join('');

  const total = () => state.seq.reduce((a, e) => a + durationByKey(e.key).beats, 0);

  function addEntry(entry) {
    const d = durationByKey(entry.key);
    const next = total() + d.beats;
    if (next > BEATS_PER_MEASURE + 1e-9) {
      const name = entry.type === 'rest' ? restLabel(d.label) : d.label;
      el.msg.textContent = `再加一个「${name}」就超过四拍了。先删掉最后一个，或者换一个短一点的。`;
      return;
    }
    state.seq.push(entry);
    state.template = null;
    el.tip.textContent = '';
    el.msg.textContent = next === BEATS_PER_MEASURE ? '正好填满四拍，可以播放了。' : '';
    paint();
  }

  root.querySelector('[data-undo]').addEventListener('click', () => {
    state.seq.pop();
    state.template = null;
    el.msg.textContent = '';
    el.tip.textContent = '';
    paint();
  });
  root.querySelector('[data-clear]').addEventListener('click', () => {
    state.seq = [];
    state.template = null;
    el.msg.textContent = '';
    el.tip.textContent = '';
    paint();
  });

  root.querySelector('[data-play]').addEventListener('click', () => {
    stopAll();                    // 上一次还没放完就先掐掉，不许叠着响
    if (!state.seq.length) {
      el.msg.textContent = '小节还是空的，先放几个音符进去。';
      return;
    }
    let at = 0;
    state.seq.forEach((e) => {
      const d = durationByKey(e.key);
      const dur = d.beats * SEC_PER_BEAT;
      if (e.type === 'note') {
        playNote(PITCH, { at, duration: Math.max(0.1, dur - 0.06), level: 0.26, release: 0.12 });
      }
      at += dur;
    });
    // 小节边界补一下，让人听出四拍走完了
    click(at, { freq: 784, level: 0.1 });
  });

  function paint() {
    const t = total();
    el.count.textContent = `${t} / ${BEATS_PER_MEASURE} 拍`;
    [...el.templates.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.tpl === state.template));
    });

    const segs = state.seq.map((e) => {
      const d = durationByKey(e.key);
      const w = (d.beats / BEATS_PER_MEASURE) * 100;
      const label = d.beats >= 0.5 ? (e.type === 'rest' ? '空' : d.label.replace('音符', '')) : '';
      const cls = e.type === 'rest' ? 'seg rest' : 'seg';
      const title = e.type === 'rest' ? restLabel(d.label) : d.label;
      return `<div class="${cls}" style="flex:0 0 ${w}%;border-right-color:var(--surface)" title="${title}">${label}</div>`;
    }).join('');

    const rest = BEATS_PER_MEASURE - t;
    const restSeg = rest > 1e-9
      ? `<div class="seg rest" style="flex:0 0 ${(rest / BEATS_PER_MEASURE) * 100}%;border-right:0">${
          rest >= 0.5 ? '剩下 ' + rest + ' 拍' : ''}</div>`
      : '';

    el.timeline.innerHTML = `<div class="tickbar" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`
      + segs + restSeg;

    if (fitsMeasure(state.seq.map((e) => durationByKey(e.key).beats), BEATS_PER_MEASURE)) {
      el.timeline.style.outline = '2px solid var(--green)';
      el.timeline.style.outlineOffset = '2px';
    } else {
      el.timeline.style.outline = 'none';
    }
  }

  paint();
}
