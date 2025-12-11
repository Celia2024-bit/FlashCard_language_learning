
// ui.js —— 融合 diff 于反面 + 全局 Show more/less（修正版：避免 My 行重复）
import {
  PLAN, loadCards, jumpToCard, getTitles, getStatus, getCurrentCard,
  dueList, completeReview, resetProgress, toggleBack, next, prev, shuffle, fmtDate
} from './app.js';
import { escapeHtml, extractMyAi, buildDiffHTML } from './diff.js';

// DOM 元素引用
const statusEl     = document.getElementById('status');
const errEl        = document.getElementById('error');
const cardTextEl   = document.getElementById('cardText');
const moduleSelect = document.getElementById('moduleSelect');
const moduleLabel  = document.getElementById('moduleLabel');
const btnShow      = document.getElementById('show');
const btnPrev      = document.getElementById('prev');
const btnNext      = document.getElementById('next');
const btnShuffle   = document.getElementById('shuffle');
const btnDone      = document.getElementById('done');
const btnReset     = document.getElementById('reset');

// 独立 diff 面板（已不再使用，但保留以防 DOM 结构仍存在）
const diffWrap     = document.querySelector('.diff-wrap');
const diffLine     = document.getElementById('diffLine');

// ========== 初始化 ==========
(async function init(){
  try {
    await loadCards();
    fillModuleOptions();
    render(true);
  } catch (e) {
    errEl.style.display = 'block';
    errEl.textContent   = '加载错误：' + e.message + '（请确认 cards.json 与本页同目录，并通过 http 服务访问）';
    statusEl.textContent= '加载失败';
  }
})();

// ========== 模块选择 ==========
function fillModuleOptions(){
  const mods = getTitles();
  while (moduleSelect.options.length > 1) moduleSelect.remove(1);
  mods.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.text  = m;
    moduleSelect.add(opt);
  });
  moduleSelect.onchange = () => {
    const m = moduleSelect.value ?? '';
    jumpToCard(m);
    moduleLabel.innerText = '模块：' + (m ? m : '全部');
    render(true);
  };
}

// ========== 渲染 ==========
function render(resetDiff = false){
  const status = getStatus();
  const { total, index, todayCount, showBack } = status;
  if (!total || total === 0) {
    statusEl.innerText   = '没有卡片（或筛选为空）。';
    cardTextEl.innerHTML = '';
    if (diffLine) diffLine.innerHTML = '';
    if (diffWrap) diffWrap.style.display = 'none';
    return;
  }

  const c = getCurrentCard();
  statusEl.innerText = `第 ${index+1}/${total} 张 · 今日待复习：${todayCount}`;

  // 元信息
  const meta = [];
  if (c.step)    meta.push(`已完成步数：${c.step}`);
  if (c.dueDate) meta.push(`下次：${fmtDate(c.dueDate)}`);
  const metaStr  = meta.length ? `\n\n（${meta.join(' · ')}）` : '';

  // 正面始终显示（转义）
  const frontStrRaw = (c.frontText ?? c.front) ?? '';
  const frontHtml   = escapeHtml(frontStrRaw);
  const metaHtml    = escapeHtml(metaStr);

  // ===== 反面：展开时生成 HTML（逐行对齐 diff，且避免重复） =====
  let backHtml = '';
  if (showBack) {
    const backStrRaw = (c.backText ?? c.back) ?? '';

    // 1) 获取 my/ai：优先结构字段，其次从文本解析；统一按行切分并过滤空行
    let my = c.backMy ?? '';
    let ai = c.backAI ?? '';
    if ((!my || !ai) && backStrRaw) {
      const parsed = extractMyAi(backStrRaw);
      my = my || parsed.my;
      ai = ai || parsed.ai;
    }
    const myLines = String(my).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const aiLines = String(ai).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const hasStructuredPairs = myLines.length > 0 || aiLines.length > 0;

    // 2) 先渲染非 My/AI 的反面内容（如⭐与💡）
    // 规则：如果我们已经拿到了 my/ai（hasStructuredPairs=true），则只保留「明显非 My/AI」行，
    //      避免把 backText 中的原始 My/AI 段再次输出造成重复。
    const backLines = String(backStrRaw).split(/\r?\n/).map(s => s.trim());
    for (const rawLine of backLines) {
      if (!rawLine) continue;
      const line = rawLine; // 已 trim
      const isFluency = /^⭐\s*Fluency:/i.test(line);
      const isExplain = /^💡\s*/.test(line);
      const looksMy   = /^📝\s*/.test(line) || /^my sentence\s*:/i.test(line);
      const looksAI   = /^✅\s*/.test(line) || /^(ai correction|ai sentence)\s*:/i.test(line);

      if (isFluency || isExplain) {
        backHtml += `<div>${escapeHtml(line)}</div>\n`;
      } else if (hasStructuredPairs) {
        // 我们已经有 my/ai 的结构化内容 → 忽略任何可能属于 My/AI 的文本行（哪怕没有图标）
        if (looksMy || looksAI) {
          continue;
        }
        // 进一步的稳健处理：如果这一行与 myLines/aiLines 中任意一行完全相同，也跳过
        // 避免 backText 中无标签但重复的 My/AI 文本再次被输出
        const equalsAnyMy = myLines.includes(line);
        const equalsAnyAI = aiLines.includes(line);
        if (equalsAnyMy || equalsAnyAI) {
          continue;
        }
        backHtml += `<div>${escapeHtml(line)}</div>\n`;
      } else {
        // 没有结构化 my/ai → 正常保留（除非是空行）
        backHtml += `<div>${escapeHtml(line)}</div>\n`;
      }
    }

    // 3) 逐行对齐 My/AI 并输出：一行 📝 + 一行 ✅（✅ 为 diff HTML，不转义）
    if (hasStructuredPairs) {
      const n = Math.max(myLines.length, aiLines.length);
      for (let i = 0; i < n; i++) {
        const myL = myLines[i] ?? '';
        const aiL = aiLines[i] ?? '';
        if (myL) backHtml += `<div>📝 ${escapeHtml(myL)}</div>\n`;
        const diff = buildDiffHTML(myL, aiL);  // 逐行 diff，高亮差异
        backHtml += `<div>✅ ${diff}</div>\n`;
      }
    }
  }

  const combinedHtml = showBack
    ? `${frontHtml}\n\n<hr/>\n${backHtml}${metaHtml}`   // 展开：正面 + 分隔线 + 反面(含逐行 diff) + 元信息
    : `${frontHtml}${metaHtml}`;                         // 收起：正面 + 元信息

  cardTextEl.innerHTML = combinedHtml;

  // 不再使用独立 diff 面板
  if (diffLine) diffLine.innerHTML = '';
  if (diffWrap) diffWrap.style.display = 'none';

  // 按钮状态
  btnShow.textContent    = showBack ? 'Show less' : 'Show more';
  btnDone.style.display  = showBack ? 'inline-block' : 'none';
  btnReset.style.display = showBack ? 'inline-block' : 'none';
}

// ========== 事件 ==========
btnShow.onclick    = () => { toggleBack(); render(true); };
btnPrev.onclick    = () => { prev();       render(true); };
btnNext.onclick    = () => { next();       render(true); };
btnShuffle.onclick = () => { shuffle();    render(true); };

btnDone.onclick = () => {
  const c = getCurrentCard();
  if (c) { completeReview(c); next(); }
  render(true);
};

btnReset.onclick = () => {
  const c = getCurrentCard();
  if (c) { resetProgress(c); }
  render(true);
};

window.debugGetCurrentCard = getCurrentCard;
