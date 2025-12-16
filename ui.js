// ui.js - 配合重构后的 app.js，支持 Review 模式
import {
  loadCards,
  setModule,
  setCard,
  getModules,
  getCardsInCurrentModule,
  getCurrentModuleId,
  getStatus,
  getCurrentCard,
  toggleBack,
  next,
  prev,
  shuffle,
  goBack,
  jumpToCardById,
  refreshReviewList
} from './app.js';
import { buildDiffHTML } from './diff.js';
import { escapeHtml } from './util.js';
import { learnCardSrs } from './cardManager.js';

// DOM 元素引用
const statusEl     = document.getElementById('status');
const errEl        = document.getElementById('error');
const cardTextEl   = document.getElementById('cardText');
const moduleSelect = document.getElementById('moduleSelect');
const cardSelect   = document.getElementById('cardSelect');
const btnShow      = document.getElementById('show');
const btnPrev      = document.getElementById('prev');
const btnNext      = document.getElementById('next');
const btnShuffle   = document.getElementById('shuffle');
const btnBack      = document.getElementById('back');

// ========== 初始化 ==========
(async function init(){
  try {
    await refreshReviewList('mod1');
    await loadCards();
    fillModuleOptions();
    fillCardOptions(); // 初始化时填充卡片选项
    render();
  } catch (e) {
    errEl.style.display = 'block';
    errEl.textContent   = '加载错误：' + e.message + '（请确认 JSON 文件与本页同目录，并通过 http 服务访问）';
    statusEl.textContent= '加载失败';
  }
})();

// ========== 模块选择 ==========
function fillModuleOptions(){
  const mods = getModules();
  
  // 清空现有选项（保留"全部"）
  while (moduleSelect.options.length > 1) {
    moduleSelect.remove(1);
  }
  
  // 添加所有模块（包括 Review）
  mods.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.moduleId;
    opt.text  = `${m.moduleName} (${m.cardCount}张)`;
    moduleSelect.add(opt);
  });
  
  // 绑定切换事件
  moduleSelect.onchange = () => {
    const selectedModuleId = moduleSelect.value || '';
    setModule(selectedModuleId);
    
    // 重新填充卡片选项
    fillCardOptions();
    
    render();
  };
}

// ========== 卡片选择 ==========
function fillCardOptions(){
  const cards = getCardsInCurrentModule();
  
  // 清空现有选项（保留"全部"）
  while (cardSelect.options.length > 1) {
    cardSelect.remove(1);
  }
  
  // 添加当前 Module 的所有卡片
  cards.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.cardId;
    opt.text  = c.title;
    cardSelect.add(opt);
  });
  
  // 绑定切换事件
  cardSelect.onchange = () => {
    const selectedCardId = cardSelect.value || '';
    if (selectedCardId) {
      setCard(selectedCardId);
    } else {
      setCard(''); // 跳到第一张
    }
    render();
  };
}

// ========== 渲染 ==========
function render(){
  const status = getStatus();
  const { total, index, showBack, hasHistory } = status;
  const c = getCurrentCard();
  
  // 同步下拉框选中状态
  syncSelectValues();
  
  if (!c) {
    statusEl.textContent = '没有卡片';
    cardTextEl.innerHTML = '';
    btnBack.style.display = 'none';
    return;
  }
  
  // 更新状态栏
  const currentModuleId = getCurrentModuleId();
  let currentModuleName = '全部';
  
  if (currentModuleId === 'review') {
    currentModuleName = '📖 Review';
  } else if (currentModuleId) {
    const module = getModules().find(m => m.moduleId === currentModuleId);
    currentModuleName = module ? module.moduleName : currentModuleId;
  }
  
  statusEl.textContent = `${currentModuleName} - 第 ${index + 1}/${total} 张`;
  
  // 显示/隐藏返回按钮
  btnBack.style.display = hasHistory ? 'inline-block' : 'none';
  if (hasHistory) {
    btnBack.textContent = '← back';
  }
  
  // 渲染正面
  const frontStrRaw = c.frontText || '';
  const frontHtml = escapeHtml(frontStrRaw);

  // 渲染背面
  let backHtml = '';
  if (showBack) {
    let my = c.backMy || '';
    let ai = c.backAI || '';
    
    if (my) {
      backHtml += `<div>📝 我的句子：\n${escapeHtml(my)}</div>\n`;
    }
    
    if (ai) {
      const diff = buildDiffHTML(my, ai);
      backHtml += `<div>✅ AI 纠正：\n${diff}</div>\n`;
    }
    
    if (c.backExplain) {
      backHtml += `\n<div>💬 解释：\n${escapeHtml(c.backExplain)}</div>\n`;
    }
    
    // 如果是 Module 2，显示关联卡片
    if (c.relatedCards && c.relatedCards.length > 0) {
      backHtml += `\n<div>🔗 关联知识点：\n`;
      c.relatedCards.forEach(cardId => {
        backHtml += `<a href="#" class="related-link" data-card-id="${cardId}">${cardId}</a> `;
      });
      backHtml += `</div>`;
    }
  }

  const combinedHtml = showBack
    ? `${frontHtml}\n\n<hr/>\n${backHtml}`
    : `${frontHtml}`;

  cardTextEl.innerHTML = combinedHtml;
  
  // 绑定关联卡片点击事件
  document.querySelectorAll('.related-link').forEach(link => {
    link.onclick = (e) => {
      e.preventDefault();
      const targetCardId = e.target.dataset.cardId;
      jumpToCardById(targetCardId, true);
      render();
    };
  });

  // 更新按钮文本
  btnShow.textContent = showBack ? 'Show less' : 'Show more';
  updateManagementButtonsVisibility();
}

function updateManagementButtonsVisibility() {
  const currentModuleId = getCurrentModuleId();
  const managementSection = document.querySelector('.card-management');
  
  if (managementSection) {
    // 只有在 mod1 或 mod2 时显示按钮
    if (currentModuleId === 'mod1' || currentModuleId === 'mod2') {
      managementSection.style.display = 'flex';
    } else {
      managementSection.style.display = 'none';
    }
  }
}


// ========== 同步下拉框选中状态 ==========
function syncSelectValues() {
  const currentModuleId = getCurrentModuleId();
  const currentCard = getCurrentCard();
  
  // 同步 Module 下拉框
  moduleSelect.value = currentModuleId || '';
  
  // 同步 Card 下拉框
  if (currentCard) {
    cardSelect.value = currentCard.cardId;
  } else {
    cardSelect.value = '';
  }
}

// ========== 事件绑定 ==========
btnShow.onclick = async () => {
  toggleBack();
  render();
  
  const status = getStatus();
  
  // 如果当前是复习模式且显示了背面
  if (status.currentModuleId === 'review' && status.showBack) {
    console.log("触发 SRS 复习记录...");
    // 现在这里可以使用 await 了
    try {
      await learnCardSrs(status.currentCardId);
    } catch (err) {
      console.error("更新复习进度失败:", err);
    }
  }
};

btnPrev.onclick = () => {
  prev();
  render();
};

btnNext.onclick = () => {
  next();
  render();
};

btnShuffle.onclick = () => {
  shuffle();
  render();
};

btnBack.onclick = () => {
  const success = goBack();
  if (success) {
    fillCardOptions(); // 返回时可能切换了 Module，需要更新卡片列表
    render();
  }
};

// ========== 调试 ==========
// ========== 调试 ==========
window.debugGetCurrentCard = getCurrentCard;
window.debugRender = render;
window.fillCardOptions = fillCardOptions;  
window.setModule = setModule; 
window.fillModuleOptions = fillModuleOptions;  