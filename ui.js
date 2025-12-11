import { PLAN, loadCards, jumpToModule, getModules, getStatus, getCurrentCard, dueList, completeReview, resetProgress, toggleBack, next, shuffle, fmtDate, escapeHtml, extractMyAi, buildDiffHTML } from './app.js';

// DOM 元素引用 (已清理，只保留必要的元素)
const statusEl     = document.getElementById('status');
const errEl        = document.getElementById('error');
const cardTextEl   = document.getElementById('cardText');
const moduleSelect = document.getElementById('moduleSelect');
const moduleLabel  = document.getElementById('moduleLabel');

const btnShow      = document.getElementById('show');
const btnNext      = document.getElementById('next');
const btnShuffle   = document.getElementById('shuffle');
const btnDone      = document.getElementById('done');
const btnReset     = document.getElementById('reset');

// 核心修复：获取整个 Diff 容器和 Diff 结果行
const diffWrap     = document.querySelector('.diff-wrap'); // 容器，用于控制显示/隐藏
const diffLine     = document.getElementById('diffLine');   // Diff 结果

// ========== 初始化逻辑 ==========
(async function init(){
  try {
    // 确保 Diff 库已在 index.html 中通过 CDN 或本地文件加载，并挂载到 window.diff_match_patch
    
    await loadCards(); // 加载卡片数据和本地进度
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
  // 清空除 "全部" 之外的选项
  while (moduleSelect.options.length > 1) moduleSelect.remove(1);
  
  mods.forEach(m => { 
    const opt = document.createElement('option'); 
    opt.value = m; 
    opt.text = m; 
    moduleSelect.add(opt); 
  });
  
  // 绑定模块切换事件
  moduleSelect.onchange = () => { 
    const m = moduleSelect.value || ''; 
    jumpToModule(m);  // 调用 app.js 中的 jumpToModule (相当于 setModule/loadCards)
    moduleLabel.innerText = '模块：' + (m || '全部'); 
    render(true); // 重新渲染，并重置 Diff
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
    diffWrap.style.display = 'none'; // 列表为空时隐藏 Diff 框
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
    
    // 兼容老数据结构
    if (!my || !ai){ 
      const fromStr = (c.backText || c.back || ''); 
      const parsed = extractMyAi(fromStr); 
      my = my || parsed.my; 
      ai = ai || parsed.ai; 
    }
    
    // 仅当 My sentence 和 AI correction 都存在时才显示 Diff
    if (my && ai) {
      diffLine.innerHTML = buildDiffHTML(my, ai);
    } else {
      diffLine.innerHTML = '<span style="color:#aaa;">（未找到 My sentence 或 AI correction，跳过差异显示）</span>';
    }
    
    // 🚨 核心修复：显示 Diff 容器
    diffWrap.style.display = 'block';
    
  } else {
    // 🚨 核心修复：隐藏 Diff 容器
    diffLine.innerHTML = '';
    diffWrap.style.display = 'none';
  }
  
  // 3. 按钮状态
  btnShow.textContent = showBack ? '显示正面' : '显示背面';
  btnDone.style.display = showBack ? 'inline-block' : 'none';
  btnReset.style.display = showBack ? 'inline-block' : 'none';
}

// ========== 事件绑定 (已移除手动 Diff 按钮绑定) ==========

btnShow.onclick = () => { 
  toggleBack(); 
  render(true); // 翻面时重新渲染，触发 Diff 逻辑
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

// 移除手动 Diff 按钮的绑定

window.debugGetCurrentCard = getCurrentCard;