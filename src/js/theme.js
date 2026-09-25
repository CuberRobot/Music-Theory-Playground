/**
 * 主题（深色 / 浅色）：全站只有这一份逻辑。
 *
 * 两个入口共用它：
 *   · 内容页 —— `main.js` 往顶栏注入一颗按钮（页面 HTML 里只有「声音」那颗）；
 *   · 门面页 —— 它是全站唯一不挂 `main.js` 的页面，按钮写在 HTML 里，
 *     由一小段模块脚本接上这里的 `wireToggle()`。
 *
 * 约定：样式只认 `<html data-theme="dark|light">`；没写这个属性就跟随系统。
 * 防闪白不在这里 —— 那是每页 `<head>` 里那 4 行内联脚本的活（必须在首次绘制前跑）。
 */

const KEY = 'mtp-theme';

export function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function isDarkNow() {
  const explicit = document.documentElement.dataset.theme;
  return explicit ? explicit === 'dark' : systemPrefersDark();
}

export function applyTheme(mode) {
  if (mode === 'dark' || mode === 'light') document.documentElement.dataset.theme = mode;
  else delete document.documentElement.dataset.theme;
}

/** 用户选过的主题（隐私模式下读不到就是 null）。 */
export function storedTheme() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function rememberTheme(mode) {
  try { localStorage.setItem(KEY, mode); } catch { /* 存不了也不影响这次切换 */ }
}

/** 把一颗按钮接成主题开关：文案与 aria 都跟着当前状态走。 */
export function wireToggle(btn) {
  if (!btn) return () => {};
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
    rememberTheme(next);
    relabel();
    // 有些图形是按当时颜色画出来的（例如 canvas），通知它们重画
    document.dispatchEvent(new CustomEvent('mtp:theme-changed'));
  });
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', relabel);
  return relabel;
}
