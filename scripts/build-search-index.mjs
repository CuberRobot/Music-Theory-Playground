/**
 * 生成站内全文搜索的索引：把 54 节课的正文抽成一份小 JSON。
 *
 * 为什么是"维护期生成"而不是运行时抓页面：
 *   本站在浏览器里是零依赖、零构建的静态站。如果让搜索页去逐个 fetch 54 个页面，
 *   一个查询要发几十个请求，又慢又浪费；所以在改完内容之后跑一次这个脚本，
 *   把结果提交进仓库。审计会检查"索引是不是最新的"——忘了跑就当场报错。
 *
 * 用法：
 *   node scripts/build-search-index.mjs          # 写入 assets/search-index.json
 *   node scripts/build-search-index.mjs --check  # 只比较，不写（审计用）
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { LESSONS, PARTS } from '../src/js/music/curriculum.js';

const OUT = new URL('../assets/search-index.json', import.meta.url);
const MAX_TEXT = 4000;        // 每节课最多收这么多字的正文

/** 课 → 它属于哪个部分、哪一层（搜索结果显示"三 · 作品分析 / 贝多芬"用得上）。 */
function metaOf(id) {
  for (const part of PARTS) {
    for (const tier of part.tiers) {
      const hit = tier.lessons.find((l) => l.id === id);
      if (hit) return { part: part.title, partNo: part.no, tier: tier.title };
    }
  }
  return { part: '', partNo: '', tier: '' };
}

const strip = (html) => html
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

/** 从一节页面里抽：标题、各级小标题、正文。 */
function extract(id) {
  const file = new URL(`../lessons/${id}/index.html`, import.meta.url);
  const html = readFileSync(file, 'utf8');
  const body = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const headings = [...body.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)]
    .map((m) => strip(m[1]))
    .filter(Boolean);
  const text = strip(body).slice(0, MAX_TEXT);
  return { headings, text };
}

export function buildIndex() {
  const items = [];
  for (const l of LESSONS) {
    if (l.status !== 'ready') continue;
    const file = new URL(`../lessons/${l.id}/index.html`, import.meta.url);
    if (!existsSync(file)) continue;
    const meta = metaOf(l.id);
    const { headings, text } = extract(l.id);
    items.push({
      id: l.id,
      url: `lessons/${l.id}/`,
      no: l.no,
      title: l.title,
      sub: l.sub ?? '',
      part: meta.part,
      tier: meta.tier,
      headings,
      text,
    });
  }
  return { version: 1, count: items.length, items };
}

/** 序列化成固定格式 —— 审计要逐字节比较，所以不能带时间戳。 */
export function serialize(index) {
  return JSON.stringify(index, null, 0) + '\n';
}

const check = process.argv.includes('--check');
const out = serialize(buildIndex());

if (check) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== out) {
    console.error('搜索索引不是最新的：跑 `node scripts/build-search-index.mjs` 重新生成。');
    process.exit(1);
  }
  console.log('搜索索引是最新的。');
} else {
  writeFileSync(OUT, out);
  const kb = (out.length / 1024).toFixed(0);
  console.log(`写入 assets/search-index.json：${kb}KB，${buildIndex().count} 节课。`);
}
