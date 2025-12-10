import { PLAN, loadCards, filteredCards, setModule, getModules, getStatus, getCurrentCard, dueList, completeReview, resetProgress, toggleBack, next, shuffle, fmtDate, escapeHtml, extractMyAi, buildDiffHTML } from './app.js';

const statusEl = document.getElementById('status');
const errEl    = document.getElementById('error');
const cardTextEl = document.getElementById('cardText');
const moduleSelect = document.getElementById('moduleSelect');
const moduleLabel  = document.getElementById('moduleLabel');

const btnShow   = document.getElementById('show');
const btnNext   = document.getElementById('next');
const btnShuffle= document.getElementById('shuffle');
const btnDone   = document.getElementById('done');
const btnReset  = document.getElementById('reset');

const diffStatus = document.getElementById('diffStatus');
const diffLine   = document.getElementById('diffLine');
const btnShowDiff= document.getElementById('btnShowDiff');
const btnClearDiff= document.getElementById('btnClearDiff');
const btnCopyDiff = document.getElementById('btnCopyDiff');

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
    setModule(m); 
    moduleLabel.innerText = '模块：' + (m || '全部'); 
    render(true); 
  };
}

function render(clearDiff=false){
  const status = getStatus();
  const { total, index, todayCount, showBack } = status;
  
  if (!total || total === 0) { 
    statusEl.innerText = '没有卡片（或筛选为空）。'; 
    cardTextEl.innerText = ''; 
    return; 
  }
  
  const c = getCurrentCard();
  if (!c) {
    statusEl.innerText = '无法获取当前卡片。';
    cardTextEl.innerText = '';
    return;
  }
  
  statusEl.innerText = `第 ${index+1}/${total} 张 · 今日待复习：${todayCount}`;
  
  const meta = []; 
  if (c.step) meta.push(`已完成步数：${c.step}`); 
  if (c.dueDate) meta.push(`下次：${fmtDate(c.dueDate)}`); 
  const metaStr = meta.length ? `\n\n（${meta.join(' · ')}）` : '';
  
  const text = (showBack ? (c.backText || c.back) : (c.frontText || c.front)) || ''; 
  cardTextEl.innerText = text + metaStr;
  
  if (clearDiff){ 
    diffStatus.innerText = '点击"显示差异"来比较 My sentence 与 AI correction。'; 
    diffLine.innerHTML=''; 
  }
}

btnShow.onclick = () => { 
  toggleBack(); 
  render(true); 
};

btnNext.onclick = () => { 
  console.log('=== 点击下一张 ===');
  console.log('点击前 status:', getStatus());
  console.log('点击前 filteredCards 长度:', filteredCards().length);
  
  next(); 
  
  console.log('点击后 status:', getStatus());
  console.log('点击后当前卡片:', getCurrentCard());
  
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

btnShowDiff.onclick = () => {
  const c = getCurrentCard(); 
  if (!c) return;
  
  let my = c.backMy || ''; 
  let ai = c.backAI || '';
  
  if (!my || !ai){ 
    const fromStr = (c.backText || c.back || ''); 
    const parsed = extractMyAi(fromStr); 
    my = my || parsed.my; 
    ai = ai || parsed.ai; 
  }
  
  if (!my && !ai){ 
    diffStatus.innerText = '未找到 "My sentence" 或 "AI correction" 行。'; 
    diffLine.innerHTML=''; 
    return; 
  }
  
  if (!my){ 
    diffStatus.innerText = '缺少 My sentence。'; 
    diffLine.innerHTML = escapeHtml(ai); 
    return; 
  }
  
  if (!ai){ 
    diffStatus.innerText = '缺少 AI correction。'; 
    diffLine.innerHTML = escapeHtml(my); 
    return; 
  }
  
  diffStatus.innerText = '已比较：绿色=新增；红色=删除；黄色=大小写差异。';
  diffLine.innerHTML = buildDiffHTML(my, ai);
};

btnClearDiff.onclick = () => { 
  diffStatus.innerText = '已清空差异。'; 
  diffLine.innerHTML=''; 
};

btnCopyDiff.onclick = async () => { 
  const html = diffLine.innerHTML; 
  if (!html){ 
    diffStatus.innerText = '当前无差异结果可复制。'; 
    return; 
  } 
  
  const text = html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); 
  
  try { 
    await navigator.clipboard.writeText(text); 
    diffStatus.innerText = '已复制差异结果（纯文本）。'; 
  } catch(e){ 
    diffStatus.innerText = '复制失败：' + e.message; 
  } 
};