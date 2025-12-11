// ui.js —— 最终版本 (包含 prev 逻辑)

// 🚨 导入 prev 函数
import { PLAN, loadCards, jumpToCard, getModules, getStatus, getCurrentCard, dueList, completeReview, resetProgress, toggleBack, next, prev, shuffle, fmtDate} from './app.js';
import { escapeHtml, extractMyAi, buildDiffHTML } from './diff.js';

// DOM 元素引用
const statusEl     = document.getElementById('status');
const errEl        = document.getElementById('error');
const cardTextEl   = document.getElementById('cardText');
const moduleSelect = document.getElementById('moduleSelect');
const moduleLabel  = document.getElementById('moduleLabel');

const btnShow      = document.getElementById('show');
// 🚨 新增 DOM 引用
const btnPrev      = document.getElementById('prev');
const btnNext      = document.getElementById('next');
const btnShuffle   = document.getElementById('shuffle');
const btnDone      = document.getElementById('done');
const btnReset     = document.getElementById('reset');

const diffWrap     = document.querySelector('.diff-wrap');
const diffLine     = document.getElementById('diffLine');

// ========== 初始化逻辑 ==========
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

// ========== 模块选择处理 ==========
function fillModuleOptions(){
  const mods = getModules();
  while (moduleSelect.options.length > 1) moduleSelect.remove(1);
  
  mods.forEach(m => { 
    const opt = document.createElement('option'); 
    opt.value = m; 
    opt.text = m; 
    moduleSelect.add(opt); 
  });
  
  moduleSelect.onchange = () => { 
    const m = moduleSelect.value || ''; 
    jumpToCard(m);  
    moduleLabel.innerText = '模块：' + (m || '全部'); 
    render(true); 
  };
}


// ========== 视图渲染函数 (包含自动 Diff 和容器隐藏逻辑) ==========
function render(resetDiff = false){
  const status = getStatus();
  const { total, index, todayCount, showBack } = status;
  
  if (!total || total === 0) { 
    statusEl.innerText = '没有卡片（或筛选为空）。'; 
    cardTextEl.innerHTML = '';
    diffLine.innerHTML = '';
    if(diffWrap) diffWrap.style.display = 'none';
    return; 
  }
  
  const c = getCurrentCard();
  statusEl.innerText = `第 ${index+1}/${total} 张 · 今日待复习：${todayCount}`;
  
  const meta = []; 
  if (c.step) meta.push(`已完成步数：${c.step}`); 
  if (c.dueDate) meta.push(`下次：${fmtDate(c.dueDate)}`); 
  const metaStr = meta.length ? `\n\n（${meta.join(' · ')}）` : '';
  
  // 1. 卡片内容
  const textRaw = (showBack ? (c.backText || c.back) : (c.frontText || c.front)) || ''; 
  cardTextEl.innerHTML = escapeHtml(textRaw + metaStr); 
  
  
  // 2. 自动显示 Diff 逻辑 (仅在显示背面时执行)
  if (showBack) {
    let my = c.backMy || ''; 
    let ai = c.backAI || '';
    
    if (!my || !ai){ 
      const fromStr = (c.backText || c.back || ''); 
      const parsed = extractMyAi(fromStr); 
      my = my || parsed.my; 
      ai = ai || parsed.ai; 
    }
    
    if (my && ai) {
      diffLine.innerHTML = buildDiffHTML(my, ai);
    } else {
      diffLine.innerHTML = '<span style="color:#aaa;">（未找到 My sentence 或 AI correction，跳过差异显示）</span>';
    }
    
    if(diffWrap) diffWrap.style.display = 'block';
    
  } else {
    diffLine.innerHTML = '';
    if(diffWrap) diffWrap.style.display = 'none';
  }
  
  // 3. 按钮状态
  btnShow.textContent = showBack ? '显示正面' : '显示背面';
  btnDone.style.display = showBack ? 'inline-block' : 'none';
  btnReset.style.display = showBack ? 'inline-block' : 'none';
}

// ========== 事件绑定 ==========

btnShow.onclick = () => { 
  toggleBack(); 
  render(true);
};

// 🚨 绑定上一张按钮事件
btnPrev.onclick = () => { 
  prev(); 
  render(true); 
};

btnNext.onclick = () => { 
  next(); 
  render(true); 
};

btnShuffle.onclick = () => { 
  shuffle(); 
  render(true); 
};

btnDone.onclick = () => { 
  const c = getCurrentCard(); 
  if (c) {
    completeReview(c); 
    next(); 
  }
  render(true); 
};

btnReset.onclick = () => { 
  const c = getCurrentCard(); 
  if (c) {
    resetProgress(c); 
  }
  render(true); 
};

window.debugGetCurrentCard = getCurrentCard;