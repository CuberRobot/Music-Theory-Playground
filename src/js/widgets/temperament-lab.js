/**
 * 律制实验台：十二平均律是怎么被逼出来的。
 *
 * 想让人看到的一件事：
 *   往上叠纯五度（3:2，701.955 音分）走 12 步，本该回到出发的那个音
 *   （因为 12 个五度约等于 7 个八度），但实际上多出来 23.46 音分 —— 毕达哥拉斯逗号。
 *   只要把每一步的五度从 701.955 压到 700，链条就正好闭合，
 *   代价是每一个五度都差 1.955 音分。那个 700 音分，就是 2^(1/12)。
 *
 * 圆盘上就是这件事：十二个点随滑块散开，滑到 700 时刚好均匀分布。
 */

import { midiToHz, fmtCents } from '../music/pitch.js';
import {
  JUST, justCents, tetCents, chainResidual, wolfFifth,
  JUST_FIFTH, TET_FIFTH, PYTHAGOREAN_COMMA, tetRatio, spectrumToAmps,
} from '../music/tuning.js';
import { playChord, stopAll } from '../audio/engine.js';

const C4 = 60;
const CX = 160;
const CY = 152;
const R = 112;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * 磁吸点。滑块走 688–716 音分，但真正有意义的位置只有两个：
 * 平均律 700 和纯五度 701.955。靠近它们时自动吸过去，
 * 否则想"正好停在 700"几乎不可能。
 */
const SNAP_TARGETS = [TET_FIFTH, JUST_FIFTH];
const SNAP_RADIUS = 0.7;
function snapCents(v) {
  for (const t of SNAP_TARGETS) {
    if (Math.abs(v - t) < SNAP_RADIUS) return t;
  }
  return v;
}

/** 音分 → 圆周上的坐标。0 音分在正上方，顺时针为正。 */
function polar(cents, radius = R) {
  const rad = ((-90 + (cents / 1200) * 360) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

/** 把音分折回一个八度以内。 */
function mod1200(cents) {
  return ((cents % 1200) + 1200) % 1200;
}

export function mountTemperamentLab(root) {
  const state = { fifth: JUST_FIFTH, rich: spectrumToAmps('organ', 8) };

  root.innerHTML = `
    <div class="card-head">
      <h2>五度叠 12 次，能不能回到原点</h2>
      <p class="hint">拖动滑块改变每一步五度的大小，看圆盘上的点怎么散开</p>
    </div>

    <div class="temper-grid">
      <div class="circle-wrap">
        <svg data-circle viewBox="0 0 320 300" role="img"
          aria-label="十二个音在八度圆上的分布"></svg>
      </div>
      <div>
        <dl class="readout" data-readout></dl>
        <div class="seg" style="margin-top: var(--sp-4)" data-audio>
          <button class="btn" type="button" data-hear-tempered>试听平均律五度</button>
          <button class="btn" type="button" data-hear-wolf>试听狼五度</button>
        </div>
      </div>
    </div>

    <div class="lab-controls" style="margin-top: var(--sp-5)">
      <div class="field">
        <label for="tl-fifth">每个五度</label>
        <input id="tl-fifth" type="range" min="688" max="716" step="0.02" value="${state.fifth}">
        <span class="val" data-fifth-val></span>
      </div>
      <div class="seg" data-quick>
        <button class="btn" type="button" data-set="${JUST_FIFTH}">纯五度 3:2</button>
        <button class="btn" type="button" data-set="${TET_FIFTH}">平均律 700</button>
      </div>
    </div>
    <p class="hint" data-snap style="min-height:1.4em;margin:var(--sp-2) 0 0"></p>

    <p class="hint" data-verdict style="min-height: 1.6em"></p>

    <div class="scroll-x" style="margin-top: var(--sp-5)">
      <table class="table" data-table>
        <caption class="sr-only">各音程在纯律与十二平均律里的音分对照</caption>
        <thead>
          <tr>
            <th scope="col">音程</th>
            <th scope="col">纯律比</th>
            <th scope="col">纯律音分</th>
            <th scope="col">平均律音分</th>
            <th scope="col">平均律偏高</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const el = {
    circle: root.querySelector('[data-circle]'),
    readout: root.querySelector('[data-readout]'),
    verdict: root.querySelector('[data-verdict]'),
    fifth: root.querySelector('#tl-fifth'),
    fifthVal: root.querySelector('[data-fifth-val]'),
    snap: root.querySelector('[data-snap]'),
    quick: root.querySelector('[data-quick]'),
    tbody: root.querySelector('tbody'),
  };

  function drawCircle(c) {
    const residual = chainResidual(c);
    const parts = [];

    // 外圈
    parts.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
      stroke="var(--line-strong)" stroke-width="1.5"/>`);

    // 十二个"平均律目标位"刻度
    for (let i = 0; i < 12; i++) {
      const a = polar(i * 100, R - 13);
      const b = polar(i * 100, R);
      parts.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}"
        x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"
        stroke="var(--line-strong)" stroke-width="1"/>`);
    }

    // 五度链条上的十一个音
    for (let k = 1; k < 12; k++) {
      const p = polar(mod1200(k * c));
      parts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6"
        fill="var(--amber)" stroke="var(--surface)" stroke-width="1.5"/>`);
    }

    // 起点
    const start = polar(0);
    parts.push(`<circle cx="${start.x.toFixed(1)}" cy="${start.y.toFixed(1)}" r="7"
      fill="var(--green)" stroke="var(--surface)" stroke-width="2"/>`);
    parts.push(`<text x="${start.x.toFixed(1)}" y="${(start.y - 16).toFixed(1)}"
      text-anchor="middle" font-size="11" fill="var(--ink-2)">起点</text>`);

    // 走完十二个五度之后落在哪。
    // 这里用带符号的误差而不是 mod 1200 的结果：误差是负的（少走了）就该画在起点逆时针方向，
    // 用 mod 会把它画成绕一大圈，看起来像走了 +1188 音分。
    const land = polar(residual);
    const closed = Math.abs(residual) < 0.05;
    parts.push(`<rect x="${(land.x - 6).toFixed(1)}" y="${(land.y - 6).toFixed(1)}"
      width="12" height="12" rx="2"
      transform="rotate(45 ${land.x.toFixed(1)} ${land.y.toFixed(1)})"
      fill="none" stroke="${closed ? 'var(--green)' : 'var(--clay)'}" stroke-width="2.5"/>`);

    // 没闭合时，把差的这段画成一段弧
    if (!closed) {
      const from = polar(0, R + 10);
      const to = polar(residual, R + 10);
      parts.push(`<path d="M ${from.x.toFixed(1)} ${from.y.toFixed(1)}
        A ${R + 10} ${R + 10} 0 0 ${residual > 0 ? 1 : 0} ${to.x.toFixed(1)} ${to.y.toFixed(1)}"
        fill="none" stroke="var(--clay)" stroke-width="3" stroke-linecap="round"/>`);
    }

    el.circle.innerHTML = parts.join('');
  }

  function paint() {
    const c = state.fifth;
    const residual = chainResidual(c);
    const wolf = wolfFifth(c);
    const closed = Math.abs(residual) < 0.05;

    drawCircle(c);
    const snapped = SNAP_TARGETS.some((t) => Math.abs(c - t) < 0.05);
    // 数值这一格只放数字：文字变长会挤窄滑块，滑块的取值跟着变，
    // 于是"文字一变→滑块一动→数值再变"——拖起来就抽搐。吸附状态另起一行说。
    el.fifthVal.textContent = `${c.toFixed(3)}`;
    el.snap.textContent = snapped
      ? '已吸附到关键值（平均律 700 或纯五度 701.955）。'
      : '自由移动中（松手时会吸附到最近的关键值）。';

    el.readout.innerHTML = `
      <div><dt>每个五度</dt><dd>${c.toFixed(3)} 音分</dd></div>
      <div><dt>叠 12 个五度之后</dt><dd>${(12 * c).toFixed(3)} 音分</dd></div>
      <div><dt>7 个八度</dt><dd>8400.000 音分</dd></div>
      <div><dt>差多少（毕达哥拉斯逗号）</dt>
        <dd class="${closed ? 'hi' : 'lo'}">${fmtCents(residual, 3)} 音分</dd></div>
      <div><dt>代价：狼五度有多大</dt>
        <dd class="${closed ? 'hi' : 'lo'}">${wolf.toFixed(3)} 音分</dd></div>
    `;

    if (closed) {
      el.verdict.className = 'hint';
      el.verdict.innerHTML =
        '<span class="tag tag-green">闭合了</span> ' +
        `每一步正好 700 音分，十二步正好等于七个八度。这就是十二平均律的定义：` +
        `八度严格保持 2:1，八度之内十二个半音完全等分，每一步的频率比都是 ` +
        `2^(1/12) ≈ 1.059463。代价是没有任何一个音程是"纯"的 —— 五度亏了 1.955 音分。`;
    } else {
      const dir = residual > 0 ? '高' : '低';
      el.verdict.className = 'hint';
      el.verdict.innerHTML =
        '<span class="tag tag-clay">没闭合</span> ' +
        `走完十二个五度，比七个八度${dir}了 ${Math.abs(residual).toFixed(3)} 音分。` +
        `为了让整圈能合上，最后一个五度被压成了 ${wolf.toFixed(1)} 音分 —— ` +
        `这就是"狼五度"，听起来像狼嚎，所以没法随意转调。`;
    }

    [...el.quick.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.set) - c) < 0.02));
    });
  }

  // ---- 交互 ---------------------------------------------------------------

  el.fifth.addEventListener('input', () => {
    // 拖动过程中用滑块的原始值，不做吸附 —— 吸附留到松手。
    state.fifth = Number(el.fifth.value);
    paint();
  });

  // 松手时吸附，并把滑块拉到那个点上，手感上才"吸得住"
  el.fifth.addEventListener('change', () => {
    state.fifth = snapCents(Number(el.fifth.value));
    el.fifth.value = String(state.fifth);
    paint();
  });

  el.quick.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-set]');
    if (!b) return;
    state.fifth = Number(b.dataset.set);
    el.fifth.value = String(state.fifth);
    paint();
  });

  function hearCents(cents) {
    const root = midiToHz(C4);
    stopAll();
    playChord([root, root * Math.pow(2, cents / 1200)],
      { duration: 1.6, amps: state.rich, level: 0.22 });
  }

  root.querySelector('[data-hear-tempered]').addEventListener('click', () => hearCents(TET_FIFTH));
  root.querySelector('[data-hear-wolf]').addEventListener('click', () => hearCents(wolfFifth(state.fifth)));

  // ---- 音程对照表 ---------------------------------------------------------

  el.tbody.innerHTML = JUST.map((i) => {
    const j = justCents(i);
    const t = tetCents(i.semis);
    const err = t - j;
    const cls = Math.abs(err) > 10 ? 'flag-lo' : 'flag-ok';
    return `
      <tr>
        <td>${i.name}</td>
        <td class="num">${i.p} : ${i.q}</td>
        <td class="num">${j.toFixed(2)}</td>
        <td class="num">${t.toFixed(2)}</td>
        <td class="num ${cls}">${fmtCents(err, 2)}</td>
      </tr>`;
  }).join('');

  paint();

  return {
    hear(freqs, opts) { playChord(freqs, { ...opts, amps: state.rich }); },
    get equalTemperedFifth() { return TET_FIFTH; },
    get comma() { return PYTHAGOREAN_COMMA; },
    ratioOf(semis) { return tetRatio(semis); },
    setFifth(cents) {
      state.fifth = clamp(cents, 688, 716);
      el.fifth.value = String(state.fifth);
      paint();
    },
  };
}
