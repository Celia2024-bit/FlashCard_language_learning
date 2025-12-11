
// ui.js —— 融合 diff 于反面 + 全局 Show more/less（修正版：避免 My 行重复）
import {
  loadCards, jumpToCard, getTitles, getStatus, getCurrentCard,
  toggleBack, next, prev, shuffle
} from './app.js';
import { buildDiffHTML } from './diff.js';
import { escapeHtml } from './util.js';

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

// ========== 初始化 ==========
(async function init(){
  try {
    await loadCards();
    fillTitleOptions();
    render(true);
  } catch (e) {
    errEl.style.display = 'block';
    errEl.textContent   = '加载错误：' + e.message + '（请确认 cards.json 与本页同目录，并通过 http 服务访问）';
    statusEl.textContent= '加载失败';
  }
})();

// ========== 模块选择 ==========
function fillTitleOptions(){
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
  const { total, index, showBack } = status;
  const c = getCurrentCard();
  
  if (!c) {
    statusEl.innerText = '没有卡片';
    cardTextEl.innerHTML = '';
    return;
  }
  
  statusEl.innerText = `第 ${index+1}/${total}`;
  
  // 正面始终显示（转义）
  const frontStrRaw = c.frontText ?? '';
  const frontHtml = escapeHtml(frontStrRaw);

  let backHtml = '';
  if (showBack) {
    let my = c.backMy ?? '';
    let ai = c.backAI ?? '';
    
    if (my) {
      backHtml += `<div>📝 ${escapeHtml(my)}</div>\n`;
    }
    
    if (ai) {
      const diff = buildDiffHTML(my, ai);
      backHtml += `<div>✅ ${diff}</div>\n`;
    }
    
    if (c.backExplain) {
      backHtml += `\n<div>💬 ${escapeHtml(c.backExplain)}</div>\n`;
    }
  }

  const combinedHtml = showBack
    ? `${frontHtml}\n\n<hr/>\n${backHtml}`
    : `${frontHtml}`;

  cardTextEl.innerHTML = combinedHtml;


  // 按钮状态
  btnShow.textContent = showBack ? 'Show less' : 'Show more';
}

// ========== 事件 ==========
btnShow.onclick    = () => { toggleBack(); render(true); };
btnPrev.onclick    = () => { prev();       render(true); };
btnNext.onclick    = () => { next();       render(true); };
btnShuffle.onclick = () => { shuffle();    render(true); };


window.debugGetCurrentCard = getCurrentCard;
