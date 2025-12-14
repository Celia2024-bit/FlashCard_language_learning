// cardManager.js - 前端卡片管理模块
// 用于添加、编辑、删除卡片，并保存到 localStorage

const CARDS_STORAGE_KEY = 'mod1_cards_data';
const CARDS_JSON_PATH = './mod1_cards.json';

/**
 * 从 localStorage 加载卡片数据
 * 如果没有缓存，则从 JSON 文件加载
 */
export async function loadCardsData() {
  try {
    // 先尝试从 localStorage 读取
    const cached = localStorage.getItem(CARDS_STORAGE_KEY);
    if (cached) {
      console.log('📦 从 localStorage 加载卡片数据');
      return JSON.parse(cached);
    }
    
    // 如果没有缓存，从 JSON 文件加载
    console.log('📥 从 JSON 文件加载卡片数据');
    const response = await fetch(CARDS_JSON_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load cards: ${response.statusText}`);
    }
    
    const cards = await response.json();
    
    // 保存到 localStorage
    saveCardsData(cards);
    
    return cards;
  } catch (error) {
    console.error('❌ 加载卡片数据失败:', error);
    return [];
  }
}

/**
 * 保存卡片数据到 localStorage
 */
export function saveCardsData(cards) {
  try {
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(cards));
    console.log('💾 卡片数据已保存到 localStorage');
    return true;
  } catch (error) {
    console.error('❌ 保存卡片数据失败:', error);
    return false;
  }
}

/**
 * 生成新的卡片ID
 */
function generateCardId(cards) {
  // 找出当前最大的卡片编号
  const maxNum = cards.reduce((max, card) => {
    const match = card.cardId.match(/^mod1_card_(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.max(max, num);
    }
    return max;
  }, 0);
  
  return `mod1_card_${maxNum + 1}`;
}

/**
 * 添加新卡片
 */
export async function addCard(cardData) {
  try {
    const cards = await loadCardsData();
    
    // 验证必填字段
    if (!cardData.title) {
      throw new Error('标题不能为空');
    }
    
    // 生成新的卡片ID（如果没有提供）
    const cardId = cardData.cardId || generateCardId(cards);
    
    // 检查ID是否重复
    if (cards.some(c => c.cardId === cardId)) {
      throw new Error(`卡片 ID "${cardId}" 已存在`);
    }
    
    // 创建完整的卡片对象（带默认值）
    const newCard = {
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
    
    // 添加到数组
    cards.push(newCard);
    
    // 保存
    saveCardsData(cards);
    
    console.log(`✅ 成功添加卡片: ${cardId}`);
    return { success: true, cardId: cardId, card: newCard };
    
  } catch (error) {
    console.error('❌ 添加卡片失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新卡片
 */
export async function updateCard(cardId, updates) {
  try {
    const cards = await loadCardsData();
    
    // 找到目标卡片
    const index = cards.findIndex(c => c.cardId === cardId);
    if (index === -1) {
      throw new Error(`未找到卡片: ${cardId}`);
    }
    
    // 更新卡片数据
    cards[index] = { ...cards[index], ...updates };
    
    // 保存
    saveCardsData(cards);
    
    console.log(`✅ 成功更新卡片: ${cardId}`);
    return { success: true, card: cards[index] };
    
  } catch (error) {
    console.error('❌ 更新卡片失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 删除卡片
 */
export async function deleteCard(cardId) {
  try {
    const cards = await loadCardsData();
    
    // 找到目标卡片
    const index = cards.findIndex(c => c.cardId === cardId);
    if (index === -1) {
      throw new Error(`未找到卡片: ${cardId}`);
    }
    
    // 删除卡片
    cards.splice(index, 1);
    
    // 保存
    saveCardsData(cards);
    
    console.log(`✅ 成功删除卡片: ${cardId}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ 删除卡片失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 导出卡片数据（用于备份）
 */
export async function exportCardsToJson() {
  try {
    const cards = await loadCardsData();
    
    // 创建下载链接
    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `mod1_cards_backup_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log('✅ 卡片数据已导出');
    return { success: true };
    
  } catch (error) {
    console.error('❌ 导出失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 导入卡片数据（从文件）
 */
export async function importCardsFromFile(file) {
  try {
    const text = await file.text();
    const cards = JSON.parse(text);
    
    if (!Array.isArray(cards)) {
      throw new Error('无效的 JSON 格式：必须是数组');
    }
    
    // 验证每张卡片的基本结构
    cards.forEach((card, index) => {
      if (!card.cardId || !card.title) {
        throw new Error(`第 ${index + 1} 张卡片缺少必填字段`);
      }
    });
    
    // 保存
    saveCardsData(cards);
    
    console.log(`✅ 成功导入 ${cards.length} 张卡片`);
    return { success: true, count: cards.length };
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 重置为原始 JSON 数据
 */
export async function resetToOriginal() {
  try {
    // 清除 localStorage
    localStorage.removeItem(CARDS_STORAGE_KEY);
    
    // 重新从 JSON 文件加载
    const cards = await loadCardsData();
    
    console.log(`✅ 已重置为原始数据 (${cards.length} 张卡片)`);
    return { success: true, count: cards.length };
    
  } catch (error) {
    console.error('❌ 重置失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取所有卡片
 */
export async function getAllCards() {
  return await loadCardsData();
}

/**
 * 根据ID获取单张卡片
 */
export async function getCardById(cardId) {
  const cards = await loadCardsData();
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