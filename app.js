// app.js - 重构版：添加 Review 模式支持
const KEY = 'flashcards_state_v1';

let modules = [];           // 所有模块信息
let allCards = [];          // 所有卡片（扁平化）
let filteredCards = [];     // 当前显示的卡片（根据 module 筛选）
let idx = 0;                // 当前卡片索引
let showBack = true;       // 是否显示背面
let currentModuleId = '';   // 当前选择的 moduleId（空表示全部，'review'表示复习模式）
let history = [];           // 导航历史记录

// Review 模式的卡片列表（可以从外部设置）
let reviewCardIds = [
    'mod1_card_1',  // I was inundated with A
    'mod1_card_3',  // I was A when B happens
    'mod1_card_6',  // talk science without jargon
    'mod1_card_10'  // Get real with sb about sth
];

import { addDays, stripTime } from './util.js';

/* ========== Review 模式管理 ========== */

/**
 * 设置 Review 模式的卡片列表
 * @param {Array<string>} cardIds - 卡片ID数组
 */
export function setReviewCardIds(cardIds) {
  if (Array.isArray(cardIds)) {
    reviewCardIds = cardIds;
    console.log(`📝 设置 Review 卡片列表:`, reviewCardIds);
    
    // 如果当前就在 Review 模式，刷新卡片列表
    if (currentModuleId === 'review') {
      setModule('review');
    }
  }
}

/**
 * 获取 Review 模式的卡片列表
 */
export function getReviewCardIds() {
  return [...reviewCardIds];
}

/* ========== 卡片规范化 ========== */

function normalizeModule1Card(raw, moduleId) {
  const cardId = raw.cardId;
  const title = raw.title || 'Untitled';
  
  const original = raw.Original || raw.original || '';
  const explain  = raw.Explain  || raw.explain  || '';
  const usage    = raw.Usage    || raw.usage    || '';
  const extended = raw.Extended || raw.extended || ''; 
  const tone     = raw.Tone     || raw.tone || ''; 
  
  const backExplain = raw.ExplainCorrected || raw.explainCorrected || '';
  const fluency = raw.Fluency || raw.fluency || ''; 
  const backMy = raw.Mysentence || raw.mysentence || ''; 
  const backAI = raw.Corrected || raw.corrected || ''; 
  
  const parts = [];
  if (title) parts.push(`🔹 ${title}${tone ? ' : ' + tone : ''}`);
  if (original) parts.push(`\n📢 ${original}`); 
  if (explain)  parts.push(`\n💡${explain}`);  
  if (usage)    parts.push(`\n📘 ${usage}`); 
  if (extended) parts.push(`\n\n✨ ${extended}`);   
  
  const frontText = parts.join('').trim();
  const createdTime = raw.Createdtime || raw.createdtime || null; 

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

// 异步加载一个 JSON 文件
async function fetchJson(path) {
  const resp = await fetch(path);
  if (!resp.ok) {
    throw new Error(`Failed to load ${path}: ${resp.statusText}`);
  }
  return resp.json();
}

export async function loadCards() {
  // 1. 加载模块配置
  const moduleConfigs = await fetchJson('../database/modules_config.json');
  modules = moduleConfigs || [];
  allCards = [];
  
  // 2. 准备并发加载所有模块卡片数据的 Promise
  const loadPromises = modules.map(async module => {
    try {
      // 从配置中获取数据文件路径
      const dataPath = module.dataFile; 
      if (!dataPath) {
        console.warn(`⚠️ Module ${module.moduleId} has no dataFile specified.`);
        return [];
      }
      
      const rawCards = await fetchJson(dataPath);
      const moduleId = module.moduleId;
      
      // 3. 规范化卡片数据
      return rawCards.map(raw => {
        let card;
        if (moduleId === 'mod1') {
          card = normalizeModule1Card(raw, moduleId);
        } else if (moduleId === 'mod2') {
          card = normalizeModule2Card(raw, moduleId);
        }
        return card;
      }).filter(c => c); // 过滤掉null/undefined的卡片
      
    } catch (error) {
      console.error(`❌ Error loading cards for module ${module.moduleId}:`, error);
      return [];
    }
  });

  // 4. 等待所有卡片数据加载完成并合并
  const allCardArrays = await Promise.all(loadPromises);
  allCards = allCardArrays.flat(); // 使用 flat() 将二维数组展平成一维
  
  // 5. 初始化状态
  setModule('');
  console.log('✅ 加载了', allCards.length, '张卡片，分布在', modules.length, '个模块');
}

/* ========== 核心功能：Module 和 Card 选择 ========== */

/**
 * 设置当前 Module（会自动更新 filteredCards）
 * @param {string} moduleId - 模块ID，空字符串表示"全部"，'review'表示复习模式
 */
export function setModule(moduleId) {
  currentModuleId = moduleId || '';
  
  if (!currentModuleId) {
    // 显示全部卡片
    filteredCards = [...allCards];
  } else if (currentModuleId === 'review') {
    // Review 模式：只显示指定的卡片
    filteredCards = reviewCardIds
      .map(cardId => allCards.find(c => c.cardId === cardId))
      .filter(c => c); // 过滤掉未找到的卡片
    
    console.log(`📖 Review 模式: ${filteredCards.length}/${reviewCardIds.length} 张卡片`);
  } else {
    // 只显示该 module 的卡片
    filteredCards = allCards.filter(c => c.moduleId === currentModuleId);
  }
  
  // 重置状态
  idx = 0;
  history = [];
  
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
  const origincard = filteredCards[idx];
  const originalModuleId = currentModuleId;
  
  // 在全局查找目标卡片
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
        moduleId: originalModuleId,
        cardId: origincard.cardId,
        idx: idx
      });
    }
  }
  console.log('jumpToCardById, history:', history);
}

/**
 * 返回上一个位置
 */
export function goBack() {
  if (history.length === 0) return false;
  const prev = history.pop();
  console.log('goBack, history:', history);
  
  // 恢复 Module
  if (prev.moduleId !== currentModuleId) {
    setModule(prev.moduleId);
  }
  setCard(prev.cardId);
  
  return true;
}

/* ========== 获取信息 ========== */

/**
 * 获取所有模块信息（包含 Review 模式）
 * @returns {Array<{moduleId: string, moduleName: string, cardCount: number}>}
 */
export function getModules() {
  const regularModules = modules.map(m => {
    const cardCount = allCards.filter(c => c.moduleId === m.moduleId).length;
    return {
      moduleId: m.moduleId,
      moduleName: m.moduleName,
      cardCount: cardCount
    };
  });
  
  // 添加 Review 模式
  const reviewModule = {
    moduleId: 'review',
    moduleName: '📖 Review (复习模式)',
    cardCount: reviewCardIds.filter(id => allCards.find(c => c.cardId === id)).length
  };
  
  return [...regularModules, reviewModule];
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
  history: history.length,
  reviewCards: reviewCardIds.length
});

// 导出供外部调用
window.setReviewCardIds = setReviewCardIds;
window.getReviewCardIds = getReviewCardIds;