// app.js 
const KEY  = 'flashcards_state_v1';

let modules = [];
let allCards = [];
let filteredCards = []; // 当前显示的卡片（根据 module 筛选）
let idx = 0;
let showBack = true;
let currentModuleFilter = ''; // 当前选择的 module（空表示全部）
let history = []; // 导航历史记录

import { addDays, stripTime } from './util.js';

/* 规范化 Module 1 类型的卡片 */
function normalizeModule1Card(raw, moduleId) {
  const cardId = raw.cardId;
  const title = raw.title || 'Untitled';
  
  const original = raw.front.Original || raw.front.original || '';
  const explain  = raw.front.Explain  || raw.front.explain  || '';
  const usage    = raw.front.Usage    || raw.front.usage    || '';
  const extended = raw.front.Extended || raw.front.extended || ''; 
  const tone     = raw.front.Tone     || raw.front.tone || ''; 
  
  const backExplain = raw.back.Explain || raw.back.explain || '';
  const fluency = raw.back.Fluency || raw.back.fluency || ''; 
  const backMy = raw.back.Mysentence || raw.back.mysentence || ''; 
  const backAI = raw.back.Corrected || raw.back.corrected || ''; 
  
  const parts = [];
  if (title) parts.push(`🔹 ${title}${tone ? ' : ' + tone : ''}`);
  if (original) parts.push(`\n📢 ${original}`); 
  if (explain)  parts.push(`\n💡${explain}`);  
  if (usage)    parts.push(`\n📘 ${usage}`); 
  if (extended) parts.push(`\n\n✨ ${extended}`);   
  
  const frontText = parts.join('').trim();
  
  const createdTime = raw.back.Createdtime || raw.back.createdtime || null; 

  return { 
    cardId, 
    moduleId,
    moduleType: 'single_usage',
    title, 
    frontText,  
    backMy, 
    backAI, 
    backExplain,
    createdTime 
  };
}

/* 规范化 Module 2 类型的卡片 */
function normalizeModule2Card(raw, moduleId) {
  const cardId = raw.cardId ;
  const scene = raw.scene || 'Untitled Scene';
  
  const frontText = `🎬 场景：${scene}`;
  
  const backMy = raw.Mysentence || '';
  const backAI = raw.Corrected || '';
  const backExplain = raw.Explain || '';
  const relatedCards = raw.relatedCards || [];

  return {
    cardId,
    moduleId,
    moduleType: 'comprehensive',
    title: scene,
    frontText,
    backMy,
    backAI,
    backExplain,
    relatedCards
  };
}

/* 加载卡片数据 */
export async function loadCards() {
  const resp = await fetch('./future_.json');           
  const json = await resp.json();
  
  modules = json.modules || [];
  allCards = [];
  
  modules.forEach(module => {
    const moduleId = module.moduleId;
    const cards = module.cards || [];
    
    cards.forEach(raw => {
      let card;
      if (moduleId === 'mod1') {
        card = normalizeModule1Card(raw, moduleId);
        console.log('加载了mod1');
      } else if (moduleId === 'mod2') {
        card = normalizeModule2Card(raw, moduleId);
        console.log('加载了mod2');
      }
      
      if (card) {
        allCards.push(card);
      }
    });
  });

  filterCardsByModule(''); // 默认显示全部
  idx = 0;
  console.log('加载了', allCards.length, '张卡片');
}


/* 根据 module 筛选卡片 */
export function filterCardsByModule(moduleId) {
  currentModuleFilter = moduleId;
  if (!moduleId) {
    filteredCards = [...allCards];
  } else {
    filteredCards = allCards.filter(c => c.moduleId === moduleId);
  }
  idx = 0;
  history = []; // 切换 module 时清空历史
  console.log('筛选后卡片数:', filteredCards.length);
}

/* 根据 cardId 查找卡片（在全部卡片中查找） */
export function findCardById(cardId) {
  return allCards.find(c => c.cardId === cardId);
}

/* 跳转到指定卡片（支持历史记录） */
export function jumpToCardById(cardId, saveHistory = true) {
  // 保存当前位置到历史
  if (saveHistory && filteredCards.length > 0) {
    const currentCard = filteredCards[idx];
    if (currentCard) {
      history.push({
        moduleFilter: currentModuleFilter,
        cardId: currentCard.cardId,
        idx: idx
      });
    }
  }
  
  // 查找目标卡片
  const targetCard = findCardById(cardId);
  if (!targetCard) {
    console.warn('未找到卡片:', cardId);
    return;
  }
  
  // 切换到目标卡片所在的 module
  if (targetCard.moduleId !== currentModuleFilter) {
    filterCardsByModule(targetCard.moduleId);
  }
  
  // 定位到目标卡片
  const targetIdx = filteredCards.findIndex(c => c.cardId === cardId);
  if (targetIdx >= 0) {
    idx = targetIdx;
    showBack = false; // 跳转后默认显示正面
  }
}

/* 返回上一个位置 */
export function goBack() {
  if (history.length === 0) return false;
  
  const prev = history.pop();
  
  // 恢复 module 筛选
  if (prev.moduleFilter !== currentModuleFilter) {
    filterCardsByModule(prev.moduleFilter);
  }
  
  // 恢复位置
  const targetIdx = filteredCards.findIndex(c => c.cardId === prev.cardId);
  if (targetIdx >= 0) {
    idx = targetIdx;
  } else {
    idx = prev.idx;
  }
  
  showBack = false;
  return true;
}

/* 获取所有模块 */
export function getModules() {
  return modules.map(m => ({
    moduleId: m.moduleId,
    moduleName: m.moduleName
  }));
}

/* 获取当前模块的所有卡片标题 */
export const getTitles = () => {
  return Array.from(new Set(filteredCards.map(c => c.title).filter(Boolean)));
};

/* 跳转到指定标题的卡片 */
export function jumpToCard(titleName) { 
  const targettitle = (titleName || '').trim();
  if (!targettitle) {
    idx = 0; // 跳到第一张
  } else {
    const foundIdx = filteredCards.findIndex(c => c.title === targettitle);
    idx = foundIdx >= 0 ? foundIdx : 0;
  }
  history = []; // 清空历史
}



/* 导航 */
export const toggleBack = () => { showBack = !showBack; };

export function next() { 
  if (filteredCards.length > 0) {
    idx = (idx + 1) % filteredCards.length;
  }
}

export function prev() { 
  if (filteredCards.length > 0) {
    idx = (idx - 1 + filteredCards.length) % filteredCards.length;
  }
};

export function shuffle() { 
  filteredCards.sort(() => Math.random() - 0.5); 
  idx = 0; 
}

/* 当前状态 */
export function getStatus() { 
  const current = getCurrentCard();
  return { 
    total: filteredCards.length, 
    index: idx, 
    showBack,
    hasHistory: history.length > 0,
    currentModule: currentModuleFilter,
    currentTitle: current ? current.title : ''
  }; 
}

export function getCurrentCard() { 
  if (filteredCards.length === 0) return null;
  if (idx < 0 || idx >= filteredCards.length) {
    return null;
  }
  return filteredCards[idx]; 
}
