/**
 * 术语词典。三块内容：
 *   1. 搜索框 —— 中英文都能搜，也搜释义
 *   2. 速查表 —— 难记的成组数据（音程、调式、调号、和弦、速度、力度）
 *   3. 词条 —— 每条给出英文名、中文名、一句话解释、去哪一节看
 */

import { CATEGORIES, TERMS, TEMPO_TERMS, DYNAMICS, searchTerms } from '../music/glossary.js';
import { JUST, justCents, tetCents, centsError } from '../music/tuning.js';
import {
  SCALES, CIRCLE_MAJOR, relativeMinorPc, SHARP_ORDER, FLAT_ORDER,
} from '../music/scales.js';
import { TRIADS, SEVENTHS } from '../music/chords.js';
import { fmtCents } from '../music/pitch.js';
import { hrefOf, findLesson } from '../music/curriculum.js';

const SHARP_PC = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_PC = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

const mod = (v, n) => ((v % n) + n) % n;

function quickTables() {
  const intervalRows = JUST.map((i) => {
    const err = centsError(i);
    return `<tr>
      <td>${i.name}</td>
      <td class="num">${i.p} : ${i.q}</td>
      <td class="num">${justCents(i).toFixed(2)}</td>
      <td class="num">${tetCents(i.semis).toFixed(2)}</td>
      <td class="num ${Math.abs(err) > 10 ? 'flag-lo' : 'flag-ok'}">${fmtCents(err, 2)}</td>
    </tr>`;
  }).join('');

  const scaleRows = Object.entries(SCALES).map(([key, s]) => {
    const steps = s.steps;
    const pattern = steps.map((v, idx) => {
      const next = idx === steps.length - 1 ? 12 : steps[idx + 1];
      return next - v === 2 ? '全' : '半';
    }).join(' ');
    return `<tr>
      <td>${s.label}</td>
      <td class="num">${steps.join(' ')}</td>
      <td>${pattern}</td>
      <td class="num">${steps.length} 个音</td>
    </tr>`;
  }).join('');

  const keyRows = CIRCLE_MAJOR.map((k) => {
    const minorPc = relativeMinorPc(k.pc);
    const minorName = k.flats > 0 ? FLAT_PC[minorPc] : SHARP_PC[minorPc];
    const sig = k.sharps > 0
      ? `${k.sharps}♯ ${SHARP_ORDER.slice(0, k.sharps).map((p) => SHARP_PC[p]).join(' ')}`
      : k.flats > 0
        ? `${k.flats}♭ ${FLAT_ORDER.slice(0, k.flats).map((p) => FLAT_PC[p]).join(' ')}`
        : '无';
    return `<tr>
      <td>${k.name} 大调</td>
      <td>${sig}</td>
      <td>${minorName} 小调</td>
    </tr>`;
  }).join('');

  const chordRows = [
    ...Object.values(TRIADS).map((d) => ({ ...d, kind: '三和弦' })),
    ...Object.values(SEVENTHS).map((d) => ({ ...d, kind: '七和弦' })),
  ].map((d) => `<tr>
      <td>${d.label}</td>
      <td class="num">${d.steps.join(' ')}</td>
      <td class="num">${d.steps.length} 个音</td>
      <td>${d.kind}</td>
    </tr>`).join('');

  const tempoRows = TEMPO_TERMS.map((t) => `<tr>
      <td>${t.it}</td><td>${t.zh}</td><td class="num">${t.bpm}</td><td>${t.note}</td>
    </tr>`).join('');

  const dynRows = DYNAMICS.map((d) => `<tr>
      <td class="num">${d.mark}</td><td>${d.it}</td><td>${d.zh}</td>
    </tr>`).join('');

  const wrap = (id, title, head, body, note = '') => `
    <details class="quick" ${id === 'interval' ? 'open' : ''}>
      <summary>${title}</summary>
      <div class="scroll-x" style="margin-top:var(--sp-3)">
        <table class="table">
          <thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${note ? `<p class="hint">${note}</p>` : ''}
    </details>`;

  return [
    wrap('interval', '音程：纯律与平均律对照',
      ['音程', '最简比', '纯律音分', '平均律音分', '平均律偏高'], intervalRows,
      '偏差超过 10 音分的用红色标出——那些是耳朵能明显听出区别的。'),
    wrap('scale', '调式一览',
      ['名称', '相对主音的半音', '全半关系', '音数'], scaleRows),
    wrap('key', '调号与关系小调',
      ['调', '调号', '关系小调'], keyRows,
      '从上往下正好是五度圈顺时针走一圈。'),
    wrap('chord', '和弦一览',
      ['名称', '结构（根音之上的半音）', '音数', '类别'], chordRows),
    wrap('tempo', '速度术语', ['术语', '中文', '约每分钟', '感觉'], tempoRows,
      'BPM 是常见区间，不是硬规定；同一首曲子的不同指挥会差很多。'),
    wrap('dynamics', '力度记号', ['记号', '原文', '中文'], dynRows),
  ].join('');
}

export function mountGlossary(root) {
  root.innerHTML = `
    <div class="gloss-search">
      <label class="sr-only" for="gloss-q">搜索术语</label>
      <input id="gloss-q" class="form-input" type="search" autocomplete="off"
        placeholder="搜英文或中文，例如 fifth、五度、协和……">
      <span class="tag" data-count></span>
    </div>
    <div class="tiles" data-cats role="group" aria-label="按分类筛选" style="margin-top:var(--sp-3)"></div>
    <p class="hint" data-empty hidden>没有找到匹配的词条。试试换个说法，或者点上面的分类。</p>
    <dl class="term-list" data-list></dl>

    <h2 style="margin-top:var(--sp-8)">速查表</h2>
    <p class="sub">那些需要成组记的东西，放在这里方便回头看。</p>
    <div data-quick></div>
  `;

  const el = {
    q: root.querySelector('#gloss-q'),
    count: root.querySelector('[data-count]'),
    cats: root.querySelector('[data-cats]'),
    list: root.querySelector('[data-list]'),
    empty: root.querySelector('[data-empty]'),
    quick: root.querySelector('[data-quick]'),
  };

  let activeCat = null;

  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'tile';
  all.textContent = '全部';
  all.dataset.cat = '';
  el.cats.appendChild(all);
  CATEGORIES.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = c.title;
    b.dataset.cat = c.id;
    el.cats.appendChild(b);
  });

  el.cats.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    activeCat = b.dataset.cat || null;
    paint();
  });

  el.q.addEventListener('input', paint);

  function paint() {
    let list = searchTerms(el.q.value);
    if (activeCat) list = list.filter((t) => t.cat === activeCat);

    [...el.cats.children].forEach((b) => {
      b.setAttribute('aria-pressed', String((b.dataset.cat || null) === activeCat));
    });

    el.count.textContent = `${list.length} / ${TERMS.length} 条`;
    el.empty.hidden = list.length > 0;

    el.list.innerHTML = list.map((t) => {
      const lesson = findLesson(t.lesson);
      const cat = CATEGORIES.find((c) => c.id === t.cat);
      return `<div class="term">
        <dt>
          <span class="term-en">${t.en}</span>
          <span class="term-zh">${t.zh}</span>
        </dt>
        <dd>
          <span class="term-def">${t.def}</span>
          <span class="term-meta">${cat?.title ?? ''}${
            lesson ? ` · <a href="../../${hrefOf(lesson)}">第 ${lesson.no} 节 ${lesson.title}</a>` : ''}</span>
        </dd>
      </div>`;
    }).join('');
  }

  el.quick.innerHTML = quickTables();
  paint();
}
