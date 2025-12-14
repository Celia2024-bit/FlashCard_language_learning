// cardManager.js - 前端卡片管理模块（支持多模块）
// 用于添加、编辑、删除卡片，并保存到 localStorage

const STORAGE_KEY_PREFIX = 'cards_data_';

// 模块配置
const MODULE_CONFIGS = {
  'mod1': {
    jsonPath: './mod1_cards.json',
    storageKey: STORAGE_KEY_PREFIX + 'mod1'
  },
  'mod2': {
    jsonPath: './mod2_cards.json',
    storageKey: STORAGE_KEY_PREFIX + 'mod2'
  }
};

/**
 * 从 localStorage 加载指定模块的卡片数据
 */
export async function loadCardsData(moduleId = 'mod1') {
  const config = MODULE_CONFIGS[moduleId];
  if (!config) {
    console.error(`未知的模块: ${moduleId}`);
    return [];
  }

  try {
    const cached = localStorage.getItem(config.storageKey);
    if (cached) {
      console.log(`📦 从 localStorage 加载 ${moduleId} 卡片数据`);
      return JSON.parse(cached);
    }
    
    console.log(`📥 从 JSON 文件加载 ${moduleId} 卡片数据`);
    const response = await fetch(config.jsonPath);
    if (!response.ok) {
      throw new Error(`Failed to load cards: ${response.statusText}`);
    }
    
    const cards = await response.json();
    saveCardsData(cards, moduleId);
    return cards;
  } catch (error) {
    console.error(`❌ 加载 ${moduleId} 卡片数据失败:`, error);
    return [];
  }
}

/**
 * 保存卡片数据到 localStorage
 */
export function saveCardsData(cards, moduleId = 'mod1') {
  const config = MODULE_CONFIGS[moduleId];
  if (!config) {
    console.error(`未知的模块: ${moduleId}`);
    return false;
  }

  try {
    localStorage.setItem(config.storageKey, JSON.stringify(cards));
    console.log(`💾 ${moduleId} 卡片数据已保存到 localStorage`);
    return true;
  } catch (error) {
    console.error(`❌ 保存 ${moduleId} 卡片数据失败:`, error);
    return false;
  }
}

/**
 * 生成新的卡片ID
 */
function generateCardId(cards, moduleId) {
  const prefix = `${moduleId}_card_`;
  
  const maxNum = cards.reduce((max, card) => {
    if (card.cardId.startsWith(prefix)) {
      const numStr = card.cardId.substring(prefix.length);
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) {
        return Math.max(max, num);
      }
    }
    return max;
  }, 0);
  
  return `${prefix}${maxNum + 1}`;
}

/**
 * 添加新卡片
 */
export async function addCard(cardData, moduleId = 'mod1') {
  try {
    const cards = await loadCardsData(moduleId);
    
    if (!cardData.title && !cardData.scene) {
      throw new Error('标题或场景不能为空');
    }
    
    const cardId = cardData.cardId || generateCardId(cards, moduleId);
    
    if (cards.some(c => c.cardId === cardId)) {
      throw new Error(`卡片 ID "${cardId}" 已存在`);
    }
    
    let newCard;
    
    if (moduleId === 'mod1') {
      newCard = {
        cardId: cardId,
        title: cardData.title,
        Original: cardData.Original || '',
        Tone: cardData.Tone || 'informal',
        Explain: cardData.Explain || '',
        Usage: cardData.Usage || '',
        Extended: cardData.Extended || '',
        Mysentence: cardData.Mysentence || '',
        Corrected: cardData.Corrected || '',
        ExplainCorrected: cardData.ExplainCorrected || '',
        Fluency: cardData.Fluency || '1',
        Createdtime: cardData.Createdtime || new Date().toLocaleDateString('en-US')
      };
    } else if (moduleId === 'mod2') {
      newCard = {
        cardId: cardId,
        scene: cardData.scene || cardData.title,
        Mysentence: cardData.Mysentence || '',
        Corrected: cardData.Corrected || '',
        Explain: cardData.Explain || '',
        relatedCards: cardData.relatedCards || []
      };
    } else {
      throw new Error(`不支持的模块类型: ${moduleId}`);
    }
    
    cards.push(newCard);
    saveCardsData(cards, moduleId);
    
    console.log(`✅ 成功添加卡片到 ${moduleId}: ${cardId}`);
    return { success: true, cardId: cardId, card: newCard };
    
  } catch (error) {
    console.error(`❌ 添加卡片到 ${moduleId} 失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新卡片
 */
export async function updateCard(cardId, updates, moduleId = 'mod1') {
  try {
    const cards = await loadCardsData(moduleId);
    
    const index = cards.findIndex(c => c.cardId === cardId);
    if (index === -1) {
      throw new Error(`未找到卡片: ${cardId}`);
    }
    
    cards[index] = { ...cards[index], ...updates };
    saveCardsData(cards, moduleId);
    
    console.log(`✅ 成功更新 ${moduleId} 卡片: ${cardId}`);
    return { success: true, card: cards[index] };
    
  } catch (error) {
    console.error(`❌ 更新 ${moduleId} 卡片失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 删除卡片
 */
export async function deleteCard(cardId, moduleId = 'mod1') {
  try {
    const cards = await loadCardsData(moduleId);
    
    const index = cards.findIndex(c => c.cardId === cardId);
    if (index === -1) {
      throw new Error(`未找到卡片: ${cardId}`);
    }
    
    cards.splice(index, 1);
    saveCardsData(cards, moduleId);
    
    console.log(`✅ 成功删除 ${moduleId} 卡片: ${cardId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ 删除 ${moduleId} 卡片失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 导出卡片数据
 */
export async function exportCardsToJson(moduleId = 'mod1') {
  try {
    const cards = await loadCardsData(moduleId);
    
    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleId}_cards_backup_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log(`✅ ${moduleId} 卡片数据已导出`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ 导出 ${moduleId} 失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 导入卡片数据
 */
export async function importCardsFromFile(file, moduleId = 'mod1') {
  try {
    const text = await file.text();
    const cards = JSON.parse(text);
    
    if (!Array.isArray(cards)) {
      throw new Error('无效的 JSON 格式：必须是数组');
    }
    
    cards.forEach((card, index) => {
      if (!card.cardId) {
        throw new Error(`第 ${index + 1} 张卡片缺少 cardId 字段`);
      }
      if (moduleId === 'mod1' && !card.title) {
        throw new Error(`第 ${index + 1} 张卡片缺少 title 字段`);
      }
      if (moduleId === 'mod2' && !card.scene) {
        throw new Error(`第 ${index + 1} 张卡片缺少 scene 字段`);
      }
    });
    
    saveCardsData(cards, moduleId);
    
    console.log(`✅ 成功导入 ${moduleId} 的 ${cards.length} 张卡片`);
    return { success: true, count: cards.length };
    
  } catch (error) {
    console.error(`❌ 导入 ${moduleId} 失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 重置为原始 JSON 数据
 */
export async function resetToOriginal(moduleId = 'mod1') {
  const config = MODULE_CONFIGS[moduleId];
  if (!config) {
    return { success: false, error: `未知的模块: ${moduleId}` };
  }

  try {
    localStorage.removeItem(config.storageKey);
    const cards = await loadCardsData(moduleId);
    
    console.log(`✅ ${moduleId} 已重置为原始数据 (${cards.length} 张卡片)`);
    return { success: true, count: cards.length };
    
  } catch (error) {
    console.error(`❌ 重置 ${moduleId} 失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取所有卡片
 */
export async function getAllCards(moduleId = 'mod1') {
  return await loadCardsData(moduleId);
}

/**
 * 根据ID获取单张卡片
 */
export async function getCardById(cardId, moduleId = 'mod1') {
  const cards = await loadCardsData(moduleId);
  return cards.find(c => c.cardId === cardId) || null;
}

// 暴露到全局（方便调试）
window.cardManager = {
  addCard,
  updateCard,
  deleteCard,
  getAllCards,
  getCardById,
  exportCardsToJson,
  importCardsFromFile,
  resetToOriginal
};