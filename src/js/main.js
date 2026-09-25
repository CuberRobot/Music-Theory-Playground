/**
 * 全站入口。做四件事：
 *   1. 由课程数据渲染左侧目录和顶栏进度（保证全站结构只有一个真源）
 *   2. 挂载页面上的实验台（<div data-widget="…">）
 *   3. 渲染上一课 / 下一课
 *   4. 接管顶栏的声音开关
 */

import { PARTS, LESSONS, findLesson, neighbours, hrefOf } from './music/curriculum.js';
import { SITE, CHANGELOG } from './site.js';
import { installUnlockOnGesture, isMuted, setMuted, isAvailable, stopAll } from './audio/engine.js';

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
import { mountCycleLab } from './widgets/cycle-lab.js';

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
  'cycle-lab': mountCycleLab,
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
        // 编号只有第一、二部分有：作品分析与风格解析靠"层"来组织，
        // 插一首曲子不该让后面所有节的编号跟着挪（见 CONTRIBUTING 编号规则）
        const label = `${lesson.no ? `<em>${lesson.no}</em>` : ''}<span>${lesson.title}</span>`;
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

  /**
   * 目录会很长，把当前这一节滚到左栏的可视范围中间。
   * 以前用 scrollIntoView({block:'nearest'})：那是"最省力地露出来"，
   * 于是靠后的章节会贴着栏底，还得自己往下找（issue #3-9）；
   * 它还可能顺带滚动整个页面。这里只动左栏自己的 scrollTop。
   */
  const here = host.querySelector('[aria-current="page"]');
  if (here) {
    const bar = host.getBoundingClientRect();
    const item = here.getBoundingClientRect();
    host.scrollTop += (item.top - bar.top) - (bar.height - item.height) / 2;
  }
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
    ? (LESSONS[currentIndex].no
      ? `共 ${total} 节，当前第 ${LESSONS[currentIndex].no} 节`
      : `共 ${total} 节，当前是《${LESSONS[currentIndex].title}》`)
    : `共 ${total} 节`);
}

function renderFoot() {
  const host = document.querySelector('[data-foot]');
  // 没有上一课/下一课的页面（首页、课程地图、术语表）也要有项目链接
  if (!host) { renderSiteLinks(); return; }
  const current = document.body.dataset.lesson || '';
  const { prev, next } = neighbours(current);
  const root = rootPrefix();

  const link = (lesson, dir) => {
    if (!lesson || lesson.status !== 'ready') return '<span></span>';
    const arrow = dir === 'prev' ? '← ' : '';
    const tail = dir === 'next' ? ' →' : '';
    const num = lesson.no ? `${lesson.no} ` : '';
    return `<a class="btn${dir === 'next' ? ' btn-primary' : ''}"
      href="${root}${hrefOf(lesson)}">${arrow}${num}${lesson.title}${tail}</a>`;
  };

  host.innerHTML = link(prev, 'prev') + link(next, 'next');
  renderSiteLinks(host);
}

/**
 * 项目自己的链接：仓库、作者博客、其他项目。
 * 只在有页脚的地方渲染一次，位置按页面类型挑最合适的容器 ——
 * 这样 50 多个页面不用各改一遍 HTML。
 */
const SITE_LINKS = [
  ['GitHub 仓库', SITE.repo],
  [`博客 jimmyland.me`, SITE.blog],
  ['其他项目', SITE.projects],
];

function renderSiteLinks(after) {
  const html = SITE_LINKS
    .map(([label, href]) => `<a href="${href}">${label}</a>`)
    .join('<span aria-hidden="true">·</span>');

  if (after) {
    after.insertAdjacentHTML('afterend',
      `<p class="site-links">${html}</p>`);
    return;
  }
  const pageFoot = document.querySelector('.page-foot');
  if (pageFoot) {
    pageFoot.insertAdjacentHTML('beforeend',
      `<span class="site-links">${html}</span>`);
    return;
  }
  const note = document.querySelector('.landing-note');
  if (note) {
    note.insertAdjacentHTML('afterend',
      `<p class="site-links site-links--center">${html}</p>`);
  }
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
      ${l.no ? `<span class="no">第 ${l.no} 节</span>` : ''}
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
 * 深色模式。
 *
 * 页面样式只认 `<html data-theme="dark|light">`（没写就是跟随系统），
 * 所以这里只做两件事：读用户的选择、写那个属性。
 * 顶栏的切换按钮是注入的 —— 页面 HTML 里只有「声音」那颗，
 * 不给 50 多个页面各加一遍。
 */
const THEME_KEY = 'mtp-theme';

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function isDarkNow() {
  const explicit = document.documentElement.dataset.theme;
  return explicit ? explicit === 'dark' : systemPrefersDark();
}

function applyTheme(mode) {
  if (mode === 'dark' || mode === 'light') document.documentElement.dataset.theme = mode;
  else delete document.documentElement.dataset.theme;
}

function wireThemeToggle() {
  const sound = document.querySelector('[data-sound]');
  if (!sound) return;
  try { applyTheme(localStorage.getItem(THEME_KEY)); } catch { /* 隐私模式下读不到就算了 */ }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-ghost';
  const relabel = () => {
    const dark = isDarkNow();
    btn.textContent = dark ? '浅色' : '深色';
    btn.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    btn.setAttribute('aria-pressed', String(dark));
  };
  relabel();
  btn.addEventListener('click', () => {
    const next = isDarkNow() ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* 存不了也不影响这次切换 */ }
    relabel();
    // 有些图形是按当时颜色画出来的（例如谱例 SVG），通知它们重画
    document.dispatchEvent(new CustomEvent('mtp:theme-changed'));
  });
  sound.parentNode.insertBefore(btn, sound);
  window.matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener?.('change', relabel);
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
    <a href="${root}glossary/"${page === 'glossary' ? ' aria-current="page"' : ''}>术语表</a>
    <a href="${root}about/"${page === 'about' ? ' aria-current="page"' : ''}>关于</a>
    <a href="${root}changelog/"${page === 'changelog' ? ' aria-current="page"' : ''}>更新</a>`;
}

/**
 * 全站兜底：点实验台里的按钮时，先把上一段播放停掉。
 *
 * 规矩本来是"谁出声谁负责 stopAll()"，但漏掉一处就会叠音 ——
 * 用户报的"换个调式上一段还在响""连点和弦变成单音"就是这么来的。
 * 所以在**捕获阶段**拦一次指针按下：此时实验台自己的处理函数还没跑，
 * 停掉旧的、再让它去播新的，一个点击里排的一串音（例如"先和弦后旋律"）
 * 依然能正常排完。
 *
 * 需要故意叠着放的实验台，在容器或按钮上加 `data-keep-audio` 就豁免。
 */
function installPlaybackGuard() {
  document.addEventListener('pointerdown', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const btn = target?.closest('button');
    if (!btn) return;
    if (!btn.closest('[data-widget]')) return;      // 只管实验台内部
    if (btn.closest('[data-keep-audio]')) return;   // 显式豁免
    stopAll();
  }, true);
}

/**
 * 版本号、许可、维护历史表：都从 site.js 取，避免页脚说一个版本、历史页停在另一个。
 * 这些元素在页面里只是占位（[data-version] / [data-changelog] …），有才渲染。
 */
function renderSiteMeta() {
  for (const el of document.querySelectorAll('[data-version]')) el.textContent = `v${SITE.version}`;
  for (const el of document.querySelectorAll('[data-updated]')) el.textContent = SITE.updated;
  for (const el of document.querySelectorAll('[data-license]')) el.textContent = SITE.license;
  const repoLink = document.querySelector('[data-link="repo"]');
  if (repoLink) repoLink.href = SITE.repo;

  const host = document.querySelector('[data-changelog]');
  if (host) {
    host.innerHTML = CHANGELOG.map((v) => `
      <section class="card" style="margin-bottom:var(--sp-4)">
        <div class="card-head">
          <h2>v${v.version} · ${v.title}</h2>
          <p class="hint">${v.date}</p>
        </div>
        <ul style="margin:0;padding-left:1.2em">
          ${v.items.map((i) => `<li>${i}</li>`).join('')}
        </ul>
      </section>`).join('');
  }
}

installUnlockOnGesture();
installPlaybackGuard();
renderRail();
renderMeter();
renderFoot();
renderMap();
renderTopnav();
renderSiteMeta();
mountWidgets();
wireSoundToggle();
wireThemeToggle();

export { LESSONS, findLesson };
