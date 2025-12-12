// app.js - 重构版：清晰区分 Module 和 Card 的关系
const KEY = 'flashcards_state_v1';

let modules = [];           // 所有模块信息
let allCards = [];          // 所有卡片（扁平化）
let filteredCards = [];     // 当前显示的卡片（根据 module 筛选）
let idx = 0;                // 当前卡片索引
let showBack = true;       // 是否显示背面
let currentModuleId = '';   // 当前选择的 moduleId（空表示全部）
let history = [];           // 导航历史记录

import { addDays, stripTime } from './util.js';

/* ========== 卡片规范化 ========== */

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

function normalizeModule2Card(raw, moduleId) {
  const cardId = raw.cardId;
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

/* ========== 数据加载 ========== */

export async function loadCards() {
  const resp = await fetch('./cards.json');           
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
      } else if (moduleId === 'mod2') {
        card = normalizeModule2Card(raw, moduleId);
      }
      
      if (card) {
        allCards.push(card);
      }
    });
  });

  // 默认显示全部
  setModule('');
  console.log('✅ 加载了', allCards.length, '张卡片，分布在', modules.length, '个模块');
}

/* ========== 核心功能：Module 和 Card 选择 ========== */

/**
 * 设置当前 Module（会自动更新 filteredCards）
 * @param {string} moduleId - 模块ID，空字符串表示"全部"
 */
export function setModule(moduleId) {
  currentModuleId = moduleId || '';
  
  if (!currentModuleId) {
    // 显示全部卡片
    filteredCards = [...allCards];
  } else {
    // 只显示该 module 的卡片
    filteredCards = allCards.filter(c => c.moduleId === currentModuleId);
  }
  
  // 重置状态
  idx = 0;
  history = [];
  
  console.log('set module ,history is null',  history);
  
  console.log(`📂 切换到 Module: ${currentModuleId || '全部'}, 卡片数: ${filteredCards.length}`);
}

/**
 * 获取当前 Module 的所有卡片标题
 * @returns {Array<{cardId: string, title: string}>}
 */
export function getCardsInCurrentModule() {
  return filteredCards.map(c => ({
    cardId: c.cardId,
    title: c.title || 'Untitled'
  }));
}

/**
 * 在当前 Module 中跳转到指定 cardId
 * @param {string} cardId - 卡片ID
 */
export function setCard(cardId) {
  if (!cardId) {
    idx = 0;
    return;
  }
  
  const targetIdx = filteredCards.findIndex(c => c.cardId === cardId);
  
  if (targetIdx >= 0) {
    idx = targetIdx;
    console.log(`🎯 跳转到卡片: ${cardId}`);
  } else {
    console.warn(`⚠️ 在当前 Module 中未找到卡片: ${cardId}`);
  }
}

/**
 * 跨 Module 跳转到指定卡片（会自动切换 Module）
 * @param {string} cardId - 卡片ID
 * @param {boolean} saveHistory - 是否保存历史记录
 */
export function jumpToCardById(cardId, saveHistory = true) {
  // 保存当前位置到历史
  // 在全局查找目标卡片
  const origincard = filteredCards[idx];
  const originalModuelId = currentModuleId;
  const targetCard = allCards.find(c => c.cardId === cardId);
  if (!targetCard) {
    console.warn('⚠️ 未找到卡片:', cardId);
    return;
  }
  
  // 切换到目标卡片所在的 Module
  if (targetCard.moduleId !== currentModuleId) {
    setModule(targetCard.moduleId);
  }
  
  // 定位到目标卡片
  setCard(cardId);
  
  if (saveHistory && filteredCards.length > 0) {
    if (origincard) { 
      history.push({
        moduleId: originalModuelId,
        cardId: origincard.cardId,
        idx: idx
      });
    }
  }
  console.log('jumpToCardById ,history :',  history);
}

/**
 * 返回上一个位置
 */
export function goBack() {
  if (history.length === 0) return false;
  const prev = history.pop();
  console.log('goBack ,history :',  history);
  // 恢复 Module
  if (prev.moduleId !== currentModuleId) {
    setModule(prev.moduleId);
  }
  setCard(prev.cardId);
  
  return true;
}

/* ========== 获取信息 ========== */

/**
 * 获取所有模块信息
 * @returns {Array<{moduleId: string, moduleName: string, cardCount: number}>}
 */
export function getModules() {
  return modules.map(m => {
    const cardCount = allCards.filter(c => c.moduleId === m.moduleId).length;
    return {
      moduleId: m.moduleId,
      moduleName: m.moduleName,
      cardCount: cardCount
    };
  });
}

/**
 * 获取当前 Module ID
 */
export function getCurrentModuleId() {
  return currentModuleId;
}

/**
 * 获取当前卡片
 */
export function getCurrentCard() {
  if (filteredCards.length === 0) return null;
  if (idx < 0 || idx >= filteredCards.length) return null;
  return filteredCards[idx];
}

/**
 * 获取状态信息
 */
export function getStatus() {
  const current = getCurrentCard();
  return {
    total: filteredCards.length,
    index: idx,
    showBack,
    hasHistory: history.length > 0,
    currentModuleId: currentModuleId,
    currentCardId: current ? current.cardId : '',
    currentTitle: current ? current.title : ''
  };
}

/* ========== 导航控制 ========== */

export function toggleBack() {
  showBack = !showBack;
}

export function next() {
  if (filteredCards.length > 0) {
    idx = (idx + 1) % filteredCards.length;
  }
}

export function prev() {
  if (filteredCards.length > 0) {
    idx = (idx - 1 + filteredCards.length) % filteredCards.length;
  }
}

export function shuffle() {
  filteredCards.sort(() => Math.random() - 0.5);
  idx = 0;
}

/* ========== 调试 ========== */
window.debugState = () => ({
  currentModuleId,
  totalCards: allCards.length,
  filteredCards: filteredCards.length,
  currentIndex: idx,
  showBack,
  history: history.length
});