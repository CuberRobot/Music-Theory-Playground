/**
 * 全站入口。做四件事：
 *   1. 由课程数据渲染左侧目录和顶栏进度（保证全站结构只有一个真源）
 *   2. 挂载页面上的实验台（<div data-widget="…">）
 *   3. 渲染上一课 / 下一课
 *   4. 接管顶栏的声音开关
 */

import { PARTS, LESSONS, findLesson, neighbours, hrefOf } from './music/curriculum.js';
import { installUnlockOnGesture, isMuted, setMuted, isAvailable } from './audio/engine.js';

import { mountHarmonicLab } from './widgets/harmonic-lab.js';
import { mountTemperamentLab } from './widgets/temperament-lab.js';
import { mountListenChallenge } from './widgets/listen-challenge.js';
import { mountPitchNames } from './widgets/pitch-names.js';
import { mountIntervalLab } from './widgets/interval-lab.js';
import { mountConsonanceLab } from './widgets/consonance-lab.js';
import { mountDurationBuilder } from './widgets/duration-builder.js';
import { mountMeterGrid } from './widgets/meter-grid.js';
import { mountChordBuilder } from './widgets/chord-builder.js';
import { mountScaleLab } from './widgets/scale-lab.js';
import { mountCircleFifths } from './widgets/circle-fifths.js';
import { mountChordMap } from './widgets/chord-map.js';
import { mountNotationLab } from './widgets/notation-lab.js';
import { mountGlossary } from './widgets/glossary.js';
import { mountModeDiff } from './widgets/mode-diff.js';
import { mountBluesLab } from './widgets/blues-lab.js';
import { mountGroupingLab } from './widgets/grouping-lab.js';
import { mountNonchordLab } from './widgets/nonchord-lab.js';
import { mountBorrowedLab } from './widgets/borrowed-lab.js';
import { mountChromaticLab } from './widgets/chromatic-lab.js';
import { mountChineseModesLab } from './widgets/chinese-modes-lab.js';
import { mountClefRangeLab } from './widgets/clef-range-lab.js';
import { mountTransposeLab } from './widgets/transpose-lab.js';
import { mountMotifLab } from './widgets/motif-lab.js';
import { mountContourLab } from './widgets/contour-lab.js';
import { mountGrooveLab } from './widgets/groove-lab.js';
import { mountProgressionLab } from './widgets/progression-lab.js';
import { mountTextureLab } from './widgets/texture-lab.js';
import { mountOrchestrationLab } from './widgets/orchestration-lab.js';
import { mountFormLab } from './widgets/form-lab.js';
import { mountOdeLab } from './widgets/ode-lab.js';
import { mountCanonLab } from './widgets/canon-lab.js';
import { mountAfrobeatLab } from './widgets/afrobeat-lab.js';
import { mountRagaLab } from './widgets/raga-lab.js';
import { mountMikazukiForm } from './widgets/mikazuki-form.js';
import { mountSoloLab } from './widgets/solo-lab.js';
import { mountMarchLab } from './widgets/march-lab.js';
import { mountDuetLab } from './widgets/duet-lab.js';
import { mountInterlockLab } from './widgets/interlock-lab.js';

const WIDGETS = {
  'harmonic-lab': mountHarmonicLab,
  'temperament-lab': mountTemperamentLab,
  'listen-challenge': mountListenChallenge,
  'pitch-names': mountPitchNames,
  'interval-lab': mountIntervalLab,
  'consonance-lab': mountConsonanceLab,
  'duration-builder': mountDurationBuilder,
  'meter-grid': mountMeterGrid,
  'chord-builder': mountChordBuilder,
  'scale-lab': mountScaleLab,
  'circle-fifths': mountCircleFifths,
  'chord-map': mountChordMap,
  'notation-lab': mountNotationLab,
  glossary: mountGlossary,
  'mode-diff': mountModeDiff,
  'blues-lab': mountBluesLab,
  'grouping-lab': mountGroupingLab,
  'nonchord-lab': mountNonchordLab,
  'borrowed-lab': mountBorrowedLab,
  'chromatic-lab': mountChromaticLab,
  'chinese-modes-lab': mountChineseModesLab,
  'clef-range-lab': mountClefRangeLab,
  'transpose-lab': mountTransposeLab,
  'motif-lab': mountMotifLab,
  'contour-lab': mountContourLab,
  'groove-lab': mountGrooveLab,
  'progression-lab': mountProgressionLab,
  'texture-lab': mountTextureLab,
  'orchestration-lab': mountOrchestrationLab,
  'form-lab': mountFormLab,
  'ode-lab': mountOdeLab,
  'canon-lab': mountCanonLab,
  'afrobeat-lab': mountAfrobeatLab,
  'raga-lab': mountRagaLab,
  'mikazuki-form': mountMikazukiForm,
  'solo-lab': mountSoloLab,
  'march-lab': mountMarchLab,
  'duet-lab': mountDuetLab,
  'interlock-lab': mountInterlockLab,
};

/** 页面用 data-root 声明自己离站点根目录有多远。首页是 "./"，章节页是 "../../"。 */
function rootPrefix() {
  return document.body.dataset.root || './';
}

function renderRail() {
  const host = document.querySelector('[data-nav]');
  if (!host) return;
  const current = document.body.dataset.lesson || '';
  const root = rootPrefix();
  const parts = [];

  for (const part of PARTS) {
    parts.push(`<div class="part">${part.no} · ${part.title}</div>`);
    for (const tier of part.tiers) {
      parts.push(`<div class="tier">${tier.title}</div>`);
      for (const lesson of tier.lessons) {
        const here = lesson.id === current ? ' aria-current="page"' : '';
        const label = `<em>${lesson.no}</em><span>${lesson.title}</span>`;
        if (lesson.status === 'ready') {
          parts.push(`<a href="${root}${hrefOf(lesson)}"${here}>${label}</a>`);
        } else {
          // 还没写的章节保留在目录里，让人看到全貌，但不可点
          parts.push(`<a class="soon" aria-disabled="true">${label}</a>`);
        }
      }
    }
    if (!part.tiers.length && part.reserved) {
      parts.push(`<div class="reserved">${part.reserved}</div>`);
    }
  }
  host.innerHTML = parts.join('');

  // 目录会很长，把当前这一节滚进视野，不然每次都要自己找
  const here = host.querySelector('[aria-current="page"]');
  if (here) here.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function renderMeter() {
  const host = document.querySelector('[data-meter]');
  if (!host) return;
  const current = document.body.dataset.lesson || '';
  const currentIndex = LESSONS.findIndex((l) => l.id === current);
  const total = LESSONS.length;

  const parts = [];
  for (let i = 0; i < total; i++) {
    const lesson = LESSONS[i];
    let cls = '';
    if (lesson.status === 'ready' && lesson.id !== current) cls = 'done';
    if (i === currentIndex) cls = 'now';
    parts.push(`<i class="${cls}"></i>`);
  }
  host.innerHTML = parts.join('');
  host.setAttribute('aria-label', currentIndex >= 0
    ? `共 ${total} 节，当前第 ${LESSONS[currentIndex].no} 节`
    : `共 ${total} 节`);
}

function renderFoot() {
  const host = document.querySelector('[data-foot]');
  if (!host) return;
  const current = document.body.dataset.lesson || '';
  const { prev, next } = neighbours(current);
  const root = rootPrefix();

  const link = (lesson, dir) => {
    if (!lesson || lesson.status !== 'ready') return '<span></span>';
    const arrow = dir === 'prev' ? '← ' : '';
    const tail = dir === 'next' ? ' →' : '';
    return `<a class="btn${dir === 'next' ? ' btn-primary' : ''}"
      href="${root}${hrefOf(lesson)}">${arrow}${lesson.no} ${lesson.title}${tail}</a>`;
  };

  host.innerHTML = link(prev, 'prev') + link(next, 'next');
}

function mountWidgets() {
  for (const host of document.querySelectorAll('[data-widget]')) {
    const mount = WIDGETS[host.dataset.widget];
    if (!mount) continue;
    try {
      // data-* 上的配置原样传给组件，比如 data-size="4"
      mount(host, { ...host.dataset });
    } catch (err) {
      // 一个实验台坏掉不应该带走整页
      console.error(`[Music Theory Playground] 挂载 ${host.dataset.widget} 失败`, err);
      host.innerHTML = `<p class="hint">这个实验台没能启动，刷新试试。</p>`;
    }
  }
}

function wireSoundToggle() {
  const btn = document.querySelector('[data-sound]');
  if (!btn) return;
  if (!isAvailable()) {
    btn.disabled = true;
    btn.textContent = '不支持音频';
    return;
  }
  const sync = () => {
    const m = isMuted();
    btn.setAttribute('aria-pressed', String(m));
    btn.textContent = m ? '已静音' : '声音开';
  };
  btn.addEventListener('click', () => { setMuted(!isMuted()); sync(); });
  sync();
}

/** 课程地图页：部分 → 层 → 节。没写的章节渲染成不可点的灰卡，写了就自动可点。 */
function renderMap() {
  const host = document.querySelector('[data-map]');
  if (!host) return;
  const root = rootPrefix();

  const card = (l, rootPath) => {
    const inner = `
      <span class="no">第 ${l.no} 节</span>
      <h4>${l.title}</h4>
      <p>${l.sub}</p>`;
    return l.status === 'ready'
      ? `<a class="map-card" href="${rootPath}${hrefOf(l)}">${inner}</a>`
      : `<div class="map-card soon">${inner}</div>`;
  };

  host.innerHTML = PARTS.map((part) => `
    <section class="map-part">
      <h2>${part.no} · ${part.title}</h2>
      <p class="blurb">${part.blurb}</p>
      ${part.tiers.map((tier) => `
        <h3 class="map-sub">${tier.title}</h3>
        <p class="blurb">${tier.blurb}</p>
        <div class="map-grid">${tier.lessons.map((l) => card(l, root)).join('')}</div>
      `).join('')}
      ${!part.tiers.length && part.reserved
        ? `<div class="map-reserved">${part.reserved}</div>` : ''}
    </section>`).join('');
}

/**
 * 顶栏的站内导航。所有页面的 HTML 里只写一条兜底链接，
 * 真正的导航在这里统一生成，加新页面时只改这一处。
 */
function renderTopnav() {
  const host = document.querySelector('.topnav');
  if (!host) return;
  const root = rootPrefix();
  const page = document.body.dataset.page || '';
  host.innerHTML = `
    <a href="${root}lessons/"${page === 'lessons' ? ' aria-current="page"' : ''}>课程地图</a>
    <a href="${root}glossary/"${page === 'glossary' ? ' aria-current="page"' : ''}>术语表</a>`;
}

installUnlockOnGesture();
renderRail();
renderMeter();
renderFoot();
renderMap();
renderTopnav();
mountWidgets();
wireSoundToggle();

export { LESSONS, findLesson };
