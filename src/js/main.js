/**
 * 全站入口。做四件事：
 *   1. 由课程数据渲染左侧目录和顶栏进度（保证全站结构只有一个真源）
 *   2. 挂载页面上的实验台（<div data-widget="…">）
 *   3. 渲染上一课 / 下一课
 *   4. 接管顶栏的声音开关
 */

import { TIERS, LESSONS, findLesson, neighbours, hrefOf, readyCount } from './music/curriculum.js';
import { installUnlockOnGesture, isMuted, setMuted, isAvailable } from './audio/engine.js';

import { mountHarmonicLab } from './widgets/harmonic-lab.js';
import { mountTemperamentLab } from './widgets/temperament-lab.js';
import { mountListenChallenge } from './widgets/listen-challenge.js';

const WIDGETS = {
  'harmonic-lab': mountHarmonicLab,
  'temperament-lab': mountTemperamentLab,
  'listen-challenge': mountListenChallenge,
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

  for (const tier of TIERS) {
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
  host.innerHTML = parts.join('');

  // 窄屏下目录是横滑条，把当前这一节滚进视野，不然永远停在第 0 节
  const here = host.querySelector('[aria-current="page"]');
  if (here && host.scrollWidth > host.clientWidth) {
    here.scrollIntoView({ inline: 'center', block: 'nearest' });
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
    ? `共 ${total} 节，当前第 ${LESSONS[currentIndex].no} 节`
    : `共 ${total} 节，已写好 ${readyCount()} 节`);
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
      mount(host);
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

/** 首页的学习地图：按层展开，已上线的可点，没写的显示成灰卡。 */
function renderMap() {
  const host = document.querySelector('[data-map]');
  if (!host) return;
  const root = rootPrefix();

  host.innerHTML = TIERS.map((tier) => `
    <section class="map-tier">
      <h2>${tier.title}</h2>
      <p class="blurb">${tier.blurb}</p>
      <div class="map-grid">
        ${tier.lessons.map((l) => {
          const inner = `
            <span class="no">第 ${l.no} 节</span>
            <h3>${l.title}</h3>
            <p>${l.sub}</p>
            ${l.status === 'ready'
              ? '<span class="tag tag-amber">已上线</span>'
              : '<span class="tag tag-plain">待写</span>'}`;
          return l.status === 'ready'
            ? `<a class="map-card" href="${root}${hrefOf(l)}">${inner}</a>`
            : `<div class="map-card soon">${inner}</div>`;
        }).join('')}
      </div>
    </section>`).join('');
}

installUnlockOnGesture();
renderRail();
renderMeter();
renderFoot();
renderMap();
mountWidgets();
wireSoundToggle();

export { LESSONS, findLesson };
