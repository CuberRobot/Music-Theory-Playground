/**
 * 站内全文搜索（客户端）。
 *
 * 索引是维护期生成好的静态 JSON（`scripts/build-search-index.mjs`），
 * 这里只做一件事：把它读进内存、打分、渲染。没有任何依赖，也没有构建步骤。
 *
 * 匹配规则故意做得简单可预期：把查询按空格拆成几个词，**每个词都要出现**（AND），
 * 然后按"出现在标题 > 小标题 > 正文"给权重排序。
 * 中文不做分词 —— 直接子串匹配，反而不会被分词器坑。
 */

const MAX_RESULTS = 30;
const SNIP = 96;   // 结果里片段前后的字数

const norm = (s) => s.toLowerCase();
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** 把命中的词包成 <mark>，并转义其余内容。 */
function highlight(text, terms) {
  let out = esc(text);
  for (const t of terms) {
    if (!t) continue;
    const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    out = out.replace(re, '<mark>$1</mark>');
  }
  return out;
}

function scoreOf(item, terms) {
  let score = 0;
  for (const t of terms) {
    const inTitle = norm(item.title ?? '').includes(t);
    const inSub = norm(item.sub ?? '').includes(t);
    const inHead = (item.headings ?? []).some((h) => norm(h).includes(t));
    const inText = norm(item.text ?? '').includes(t);
    if (!inTitle && !inSub && !inHead && !inText) return -1;   // AND：有一个词没出现就不算
    if (inTitle) score += 10;
    if (inSub) score += 6;
    if (inHead) score += 4;
    if (inText) score += 1;
  }
  return score;
}

/** 取包含第一个命中词的片段，前后留一点上下文。 */
function snippet(item, terms) {
  const text = item.text ?? '';
  const low = norm(text);
  let at = -1;
  for (const t of terms) {
    const i = low.indexOf(t);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return esc(text.slice(0, SNIP * 2));
  const from = Math.max(0, at - SNIP);
  const to = Math.min(text.length, at + SNIP);
  return (from > 0 ? '…' : '') + highlight(text.slice(from, to), terms) + (to < text.length ? '…' : '');
}

export function mountSearch() {
  const input = document.querySelector('[data-search-input]');
  const host = document.querySelector('[data-search-results]');
  const info = document.querySelector('[data-search-info]');
  const samples = document.querySelector('[data-search-samples]');
  if (!input || !host) return;

  let index = null;
  let items = [];

  const run = (raw) => {
    const q = String(raw ?? '').trim();
    const terms = norm(q).split(/\s+/).filter(Boolean);
    // 出结果之后把示例词收起来：它是给"不知道该搜什么"的人看的
    if (samples) samples.hidden = terms.length > 0;
    if (!terms.length) {
      info.textContent = index ? `索引里共 ${items.length} 节课。输入关键词开始。` : '正在载入索引…';
      host.innerHTML = '';
      return;
    }
    const hit = items
      .map((it) => ({ it, s: scoreOf(it, terms) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s || a.it.title.localeCompare(b.it.title, 'zh'))
      .slice(0, MAX_RESULTS);

    info.textContent = hit.length
      ? `找到 ${hit.length} 节${hit.length === MAX_RESULTS ? '（只显示前 30）' : ''}`
      : `没有匹配「${q}」的课。试试更短的关键词，或者去术语表查词。`;

    host.innerHTML = hit.map(({ it }) => `
      <article class="search-hit">
        <h3><a href="../${it.url}">${highlight(it.title, terms)}</a></h3>
        <p class="search-where">${esc(it.partNo ? `${it.partNo} · ${it.part}` : it.part)}${
          it.tier ? ` / ${esc(it.tier)}` : ''}${it.no ? ` · 第 ${it.no} 节` : ''}</p>
        <p class="search-snippet">${snippet(it, terms)}</p>
      </article>`).join('');
  };

  fetch('../assets/search-index.json')
    .then((r) => r.json())
    .then((data) => {
      items = data.items ?? [];
      index = data;
      const q = new URLSearchParams(location.search).get('q');
      if (q) { input.value = q; }
      run(input.value);
    })
    .catch(() => { info.textContent = '索引没加载成功——如果你在本地跑，确认是用 scripts/serve.py 起的服务。'; });

  let t = null;
  const seek = (q) => {
    input.value = q;
    run(q);
    history.replaceState(null, '', `?q=${encodeURIComponent(q)}`);
  };
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      run(input.value);
      const q = input.value.trim();
      history.replaceState(null, '', q ? `?q=${encodeURIComponent(q)}` : location.pathname);
    }, 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; run(''); }
    if (e.key === 'Enter') {
      const first = host.querySelector('a');
      if (first) first.focus();
    }
  });
  // 示例词：链接本身带着 ?q= 能用（没 JS 也能搜），有 JS 就顺手省掉一次整页重载
  if (samples) {
    samples.addEventListener('click', (e) => {
      const a = e.target.closest('[data-search-sample]');
      if (!a) return;
      e.preventDefault();
      seek(a.dataset.searchSample);
      input.focus();
    });
  }
  input.focus();
}
