/**
 * 同步每个页面的「分享卡片」与图标标签。用法：node scripts/sync-share-meta.mjs
 *
 * 为什么要有这个脚本：链接发到微信、小红书、QQ 时，对方抓到的是 og:title /
 * og:description / og:image 这三行 —— 没有它们，转出去的卡片就是一条光秃秃的
 * 灰链接，没有标题、没有图。这三行（加上 favicon 与 apple-touch-icon）
 * 要出现在全站 60 个页面里，手写 60 遍就等于埋了 60 个将来会不一致的地方。
 *
 * 做法：每个页面里只维护一个受管区块（<!-- share-meta -->…<!-- /share-meta -->），
 * 标题与描述从页面自己的 <title> / <meta name="description"> 取，
 * 图片与 URL 从 src/js/site.js 的 SITE.origin 取。跑一次是幂等的。
 *
 * 这个脚本不参与部署（站点是零构建的，提交进仓库的 HTML 就是最终产物），
 * 它只是"批量维护那份 HTML"的工具，和 build-search-index.mjs 一个路数。
 * scripts/audit-music.mjs 会核对结果，跑完忘了同步会被 CI 拦下来。
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SITE } from '../src/js/site.js';

const START = '<!-- share-meta -->';
const END = '<!-- /share-meta -->';
/** 站点根目录。这样脚本从哪个目录调用都一样（和审计脚本一个写法）。 */
const ROOT = new URL('../', import.meta.url);
const at = (rel) => fileURLToPath(new URL(rel, ROOT));

/**
 * 页面清单：根目录的用 './'，其余都靠 '../'。
 *
 * defer 这一档只给 404.html：它的地址栏里是用户输错的路径，直接写 href 会让浏览器
 * 的「预扫描」按错地址白发一轮请求，所以那个页面上所有外部资源都只写 data-site-path、
 * 由页面自己的一段脚本补 href。理由写在那份文件里。
 */
function pages() {
  const root = [
    { file: 'index.html', prefix: './' },
    { file: '404.html', prefix: './', defer: true },
  ];
  const nested = ['about', 'changelog', 'glossary', 'search'];
  const out = [];
  for (const page of root) out.push(page);
  for (const dir of nested) out.push({ file: `${dir}/index.html`, prefix: '../' });
  for (const d of readdirSync(at('lessons'))) {
    if (statSync(at(`lessons/${d}`)).isDirectory()) out.push({ file: `lessons/${d}/index.html`, prefix: '../../' });
  }
  return out;
}

/** 页面上的 <title> 与 description，转义成可以直接放进属性的样子。 */
function metaOf(html) {
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim();
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1]?.trim();
  if (!title) throw new Error('页面里找不到 <title>');
  return { title, desc: desc || '' };
}

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function block({ title, desc }, prefix, relUrl, defer) {
  const url = SITE.origin + '/' + relUrl;
  const asset = defer
    ? (rel) => `data-site-path="${rel}"`
    : (rel) => `href="${prefix}${rel}"`;
  return [
    START,
    `<!-- 分享卡片与图标。这三行 og 决定链接转出去长什么样：抓不到就只剩一条光秃秃的灰链接。`,
    `     这一块由 node scripts/sync-share-meta.mjs 生成，别手改（下次跑会被抹平）。 -->`,
    `<link rel="icon" ${asset('assets/icon.svg')} type="image/svg+xml">`,
    `<link rel="apple-touch-icon" ${asset('assets/apple-touch-icon.png')}>`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${attr(SITE.name)}">`,
    `<meta property="og:locale" content="zh_CN">`,
    `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${SITE.origin}/assets/og-cover.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    END,
  ].join('\n');
}

let changed = 0;
for (const { file, prefix, defer } of pages()) {
  let html;
  try {
    html = readFileSync(at(file), 'utf8');
  } catch {
    continue; // 404.html 之类的可选页面
  }
  const relUrl = file === 'index.html' ? '' : file.replace(/\/index\.html$/, '/');
  const fresh = block(metaOf(html), prefix, relUrl, defer);

  // 已经有受管区块就整块替换，没有就插在 description 后面（没有 description 就插在 title 后面）
  let next;
  if (html.includes(START)) {
    next = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), fresh);
  } else {
    const anchor = html.match(/<meta name="description" content="[^"]*">\n/) || html.match(/<title>[\s\S]*?<\/title>\n/);
    if (!anchor) throw new Error(`${file} 里找不到可以插入的位置`);
    next = html.replace(anchor[0], anchor[0] + fresh + '\n');
  }

  if (next !== html) {
    writeFileSync(at(file), next);
    changed++;
  }
}
console.log(changed ? `已更新 ${changed} 个页面` : '所有页面都已是最新的');
