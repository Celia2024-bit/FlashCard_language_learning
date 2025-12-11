
// ui.js —— 融合 diff 于反面（保持你的现有接口）
import { PLAN, loadCards, jumpToCard, getTitles, getStatus, getCurrentCard, dueList, completeReview, resetProgress, toggleBack, next, prev, shuffle, fmtDate } from './app.js';
import { escapeHtml, extractMyAi, buildDiffHTML } from './diff.js';

// DOM 元素引用
const statusEl    = document.getElementById('status');
const errEl       = document.getElementById('error');
const cardTextEl  = document.getElementById('cardText');
const moduleSelect= document.getElementById('moduleSelect');
const moduleLabel = document.getElementById('moduleLabel');
const btnShow     = document.getElementById('show');
const btnPrev     = document.getElementById('prev');
const btnNext     = document.getElementById('next');
const btnShuffle  = document.getElementById('shuffle');
const btnDone     = document.getElementById('done');
const btnReset    = document.getElementById('reset');
const diffWrap    = document.querySelector('.diff-wrap');   // 不再使用独立 diff 面板
const diffLine    = document.getElementById('diffLine');    // 不再使用独立 diff 面板

// ========== 初始化 ==========
(async function init(){
  try {
    await loadCards();
    fillModuleOptions();
    render(true);
  } catch (e) {
    errEl.style.display = 'block';
    errEl.textContent = '加载错误：' + e.message + '（请确认 cards.json 与本页同目录，并通过 http 服务访问）';
    statusEl.textContent = '加载失败';
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
    moduleLabel.innerText = '模块：' + (m ?? '全部');
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
    diffLine.innerHTML   = '';
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

  // 反面：展开时生成 HTML（✅ 替换为 diff，高亮；其它行转义）
  let backHtml = '';
  if (showBack) {
    const backStrRaw = (c.backText ?? c.back) ?? '';
    const backLines  = String(backStrRaw).split(/\r?\n/);

    // 提取 my/ai：优先用结构字段，其次从文本解析
    let my = c.backMy ?? '';
    let ai = c.backAI ?? '';
    if ((!my || !ai) && backStrRaw) {
      const parsed = extractMyAi(backStrRaw);
      my = my || parsed.my;
      ai = ai || parsed.ai;
    }

    for (const line of backLines) {
      const isFluency = /^⭐\s*Fluency:/i.test(line);
      const isMy      = /^📝\s*/.test(line) || /^my sentence\s*:/i.test(line);
      const isAI      = /^✅\s*/.test(line) || /^(ai correction|ai sentence)\s*:/i.test(line);
      const isExplain = /^💡\s*/.test(line);

      if (isAI && my && ai) {
        const diff = buildDiffHTML(my, ai);         // diff 段保留 HTML
        backHtml += `<div>✅ ${diff}</div>\n`;
      } else if (isMy) {
        const text = line.replace(/^📝\s*/,'').replace(/^my sentence\s*:/i,'').trim();
        backHtml += `<div>📝 ${escapeHtml(text)}</div>\n`;
      } else if (isFluency || isExplain) {
        backHtml += `<div>${escapeHtml(line)}</div>\n`;
      } else if (line.trim().length > 0) {
        backHtml += `<div>${escapeHtml(line)}</div>\n`;
      }
    }
  }

  const combinedHtml = showBack
    ? `${frontHtml}\n\n<hr/>\n${backHtml}${metaHtml}`   // 展开：正面 + 分隔线 + 反面(含 diff) + 元信息
    : `${frontHtml}${metaHtml}`;                         // 收起：正面 + 元信息

  cardTextEl.innerHTML = combinedHtml;

  // 不再使用独立 diff 面板
  diffLine.innerHTML = '';
  if (diffWrap) diffWrap.style.display = 'none';

  // 按钮状态
  btnShow.textContent   = showBack ? 'Show less' : 'Show more';
  btnDone.style.display = showBack ? 'inline-block' : 'none';
  btnReset.style.display= showBack ? 'inline-block' : 'none';
}

// ========== 事件 ==========
btnShow.onclick = () => { toggleBack(); render(true); };
btnPrev.onclick = () => { prev();       render(true); };
btnNext.onclick = () => { next();       render(true); };
btnShuffle.onclick = () => { shuffle(); render(true); };

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
