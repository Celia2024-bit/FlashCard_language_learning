// cardManager.js - 前端卡片管理模块（支持多模块 + Supabase）
// 用于添加、编辑、删除卡片，并通过 API 与 Supabase 通信

const API_BASE_URL = 'http://localhost:5000/api';

// 模块配置
const MODULE_CONFIGS = {
  'mod1': {
    apiEndpoint: `${API_BASE_URL}/mod1/cards`
  },
  'mod2': {
    apiEndpoint: `${API_BASE_URL}/mod2/cards`
  }
};

/**
 * 规范化卡片数据：将 Supabase 的 cardid 转换为前端的 cardId
 */
function normalizeCard(card) {
  if (!card) return null;
  
  // 如果有 cardid (小写)，转换为 cardId (驼峰)
  if (card.cardid && !card.cardId) {
    card.cardId = card.cardid;
    delete card.cardid;
  }
  
  return card;
}

/**
 * 规范化卡片数据用于发送到后端：将 cardId 转换为 cardid
 */
function denormalizeCard(card) {
  const normalized = { ...card };
  
  // 如果有 cardId (驼峰)，转换为 cardid (小写)
  if (normalized.cardId) {
    normalized.cardid = normalized.cardId;
    delete normalized.cardId;
  }
  
  return normalized;
}

/**
 * 从 Supabase 加载指定模块的卡片数据
 */
export async function loadCardsData(moduleId = 'mod1') {
  const config = MODULE_CONFIGS[moduleId];
  if (!config) {
    console.error(`未知的模块: ${moduleId}`);
    return [];
  }

  try {
    const response = await fetch(config.apiEndpoint);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const cards = await response.json();
    
    // 规范化所有卡片数据
    const normalizedCards = cards.map(normalizeCard).filter(c => c);
    
    console.log(`📦 从 Supabase 加载 ${moduleId} 的 ${normalizedCards.length} 张卡片`);
    return normalizedCards;
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
  const config = MODULE_CONFIGS[moduleId];
  if (!config) {
    return { success: false, error: `未知的模块: ${moduleId}` };
  }

  try {
    if (!cardData.title && !cardData.scene) {
      throw new Error('标题或场景不能为空');
    }
    
    // 转换为小写 cardid
    const dataToSend = denormalizeCard(cardData);
    
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to add card');
    }
    
    // 规范化返回的卡片
    const newCard = normalizeCard(result.card);
    
    console.log(`✅ 成功添加卡片到 ${moduleId}: ${newCard.cardId}`);
    return { success: true, cardId: newCard.cardId, card: newCard };
    
  } catch (error) {
    console.error(`❌ 添加卡片到 ${moduleId} 失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新卡片
 */
export async function updateCard(cardId, updates, moduleId = 'mod1') {
  const config = MODULE_CONFIGS[moduleId];
  if (!config) {
    return { success: false, error: `未知的模块: ${moduleId}` };
  }

  try {
    // 转换为小写 cardid
    const dataToSend = denormalizeCard(updates);
    
    const response = await fetch(`${config.apiEndpoint}/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to update card');
    }
    
    // 规范化返回的卡片
    const updatedCard = normalizeCard(result.card);
    
    console.log(`✅ 成功更新 ${moduleId} 卡片: ${cardId}`);
    return { success: true, card: updatedCard };
    
  } catch (error) {
    console.error(`❌ 更新 ${moduleId} 卡片失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 删除卡片
 */
export async function deleteCard(cardId, moduleId = 'mod1') {
  const config = MODULE_CONFIGS[moduleId];
  if (!config) {
    return { success: false, error: `未知的模块: ${moduleId}` };
  }

  try {
    const response = await fetch(`${config.apiEndpoint}/${cardId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to delete card');
    }
    
    console.log(`✅ 成功删除 ${moduleId} 卡片: ${cardId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ 删除 ${moduleId} 卡片失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 导出卡片数据（从 Supabase 导出）
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
 * 导入卡片数据到 Supabase
 */
export async function importCardsFromFile(file, moduleId = 'mod1') {
  const config = MODULE_CONFIGS[moduleId];
  if (!config) {
    return { success: false, error: `未知的模块: ${moduleId}` };
  }

  try {
    const text = await file.text();
    const cards = JSON.parse(text);
    
    if (!Array.isArray(cards)) {
      throw new Error('无效的 JSON 格式：必须是数组');
    }
    
    // 规范化所有卡片
    const cardsToImport = cards.map(denormalizeCard);
    
    const response = await fetch(`${API_BASE_URL}/${moduleId}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cards: cardsToImport })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Import failed');
    }
    
    console.log(`✅ 成功导入 ${moduleId} 的 ${result.count} 张卡片`);
    return { success: true, count: result.count };
    
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
    const response = await fetch(`${API_BASE_URL}/${moduleId}/reset`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Reset failed');
    }
    
    console.log(`✅ ${moduleId} 已重置为原始数据 (${result.count} 张卡片)`);
    return { success: true, count: result.count };
    
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