/**
 * 外链体检。用法：node scripts/check-links.mjs [--proxy http://127.0.0.1:10808]
 *
 * 为什么要有这个：本项目有一条硬规矩——**写进页面的外部链接必须 curl 过，
 * 200 才算数**。以前靠人记住，现在靠跑一次。
 *
 * 用 curl 而不是 fetch：需要代理的站点（Wikipedia 之类）加个 --proxy 就行，
 * 和手工核验时的行为完全一致。
 *
 * 退出码非 0 表示有链接挂了；如果需要代理的站点在直连时报错，
 * 脚本会单独列出来，并提示你加 --proxy 再跑一次。
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const proxyIdx = argv.indexOf('--proxy');
const proxy = proxyIdx >= 0 ? argv[proxyIdx + 1] : null;

/** 直连打不开、需要代理的站点（报告里单独归类，不算失败）。 */
const NEEDS_PROXY = ['wikipedia.org', 'wikimedia.org', 'youtube.com', 'google.com', 'musescore.org'];

/**
 * 会拦脚本的站点：返回 202/403/405 是它们的反爬行为，不代表链接死了。
 * 这一档算"待人工确认"，不算失败 —— 但脚本会把它们列出来，
 * 你按下链接用浏览器打开一次就算核过（本项目就是这么核的）。
 */
const BOT_BLOCKED = ['print-gakufu.com', 'lantis.jp', 'ymm.co.jp', 'anime-eupho.com'];

const pages = [];
const root = new URL('..', import.meta.url);
const indexPath = new URL('../index.html', import.meta.url);
if (existsSync(indexPath)) pages.push(indexPath);
const lessonsDir = new URL('../lessons/', import.meta.url);
for (const d of readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const page = new URL(`${d.name}/index.html`, lessonsDir);
  if (existsSync(page)) pages.push(page);
}

// 页面里引用的所有外链（按出现顺序，去重）
const links = new Map();
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const name = page.pathname.split('/').slice(-2)[0];
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const url = m[1];
    if (!links.has(url)) links.set(url, new Set());
    links.get(url).add(name);
  }
}

const check = (url) => {
  const args = ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '20', '-L',
    '-A', 'Mozilla/5.0 (compatible; MusicTheoryPlayground link check)'];
  if (proxy) args.push('-x', proxy);
  args.push(url);
  try {
    return execFileSync('curl', args, { encoding: 'utf8' }).trim();
  } catch {
    return '000';
  }
};

const needsProxy = (url) => NEEDS_PROXY.some((h) => url.includes(h));

let bad = 0;
let proxyish = 0;
let ok = 0;
let blocked = 0;
console.log(`检查 ${links.size} 条外链${proxy ? `（走代理 ${proxy}）` : ''}…\n`);

for (const [url, where] of links) {
  const code = check(url);
  const pagesText = [...where].join(' ');
  if (code === '200' || code === '204') {
    ok++;
    console.log(`  ok   ${code}  ${url}`);
  } else if (BOT_BLOCKED.some((h) => url.includes(h)) && ['202', '403', '405', '429'].includes(code)) {
    blocked++;
    console.log(`  反爬  ${code}  ${url}   ← 站点拦脚本，请用浏览器点开确认一次`);
  } else if (!proxy && needsProxy(url)) {
    proxyish++;
    console.log(`  ?    ${code}  ${url}   ← 这一类需要代理，加 --proxy 再跑（${pagesText}）`);
  } else {
    bad++;
    console.log(`  x    ${code}  ${url}   ← 出现在：${pagesText}`);
  }
}

console.log(`\n通过 ${ok} · 反爬待确认 ${blocked} · 需要代理 ${proxyish} · 失败 ${bad}`);
if (bad) {
  console.log('失败的链接请先人工确认（有些站会拦脚本，用浏览器打开看看），确认失效再换。');
  process.exitCode = 1;
}
