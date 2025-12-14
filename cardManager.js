// cardManager.js - 前端卡片管理模块（通过 Flask 后端 API 管理数据）

// ==========================================================
// 🚨 关键配置：后端 API 地址
// 部署到公共平台后，请务必将此地址修改为您的公共 API URL
// 例如: 'https://your-flask-app-name.onrender.com/api/'
// ==========================================================
const API_BASE_URL = 'http://127.0.0.1:5000/api/'; 

// 模块配置 (不再需要 storageKey 和 jsonPath，后端会处理)
const MODULE_CONFIGS = {
  // 仅保留模块ID，用于构建 API URL
  'mod1': { moduleId: 'mod1' }, 
  'mod2': { moduleId: 'mod2' }
};

/**
 * 封装通用的 fetch 请求，用于与 Flask API 通信
 * @param {string} method - HTTP 方法 (GET, POST, PUT, DELETE)
 * @param {string} moduleId - 模块ID (mod1 或 mod2)
 * @param {string} path - 额外的 URL 路径 (如 /card_id_1)
 * @param {object} [body=null] - 请求体数据
 * @returns {Promise<object>} - 后端返回的 JSON 数据
 */
async function apiFetch(method, moduleId, path = '', body = null) {
  const config = MODULE_CONFIGS[moduleId];
  if (!config) {
    throw new Error(`未知的模块: ${moduleId}`);
  }
  
  // URL 格式: http://127.0.0.1:5000/api/mod1/cards[/card_id_1]
  const url = `${API_BASE_URL}${config.moduleId}/cards${path}`;
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      // Flask CORS 会检查 Origin，确保已在后端启用 CORS
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  // 尝试解析 JSON，即使响应体可能为空 (如 DELETE)
  const data = await response.json().catch(() => ({})); 

  if (!response.ok) {
    // 抛出错误，包含后端返回的错误信息
    throw new Error(data.error || `API 请求失败，状态码: ${response.status}`);
  }
  
  return data;
}

// ==========================================================
// 核心数据操作函数 (CRUD)
// ==========================================================

/**
 * 从 Flask 后端加载指定模块的卡片数据
 * 对应 Flask: GET /api/{moduleId}/cards
 */
export async function loadCardsData(moduleId = 'mod1') {
  try {
    console.log(`📡 从 Flask 后端加载 ${moduleId} 卡片数据`);
    const cards = await apiFetch('GET', moduleId); 
    return Array.isArray(cards) ? cards : [];
  } catch (error) {
    console.error(`❌ 加载 ${moduleId} 卡片数据失败:`, error);
    return [];
  }
}

/**
 * 移除：前端不再负责持久化。数据通过 add/update/delete 直接写入后端。
 */
// export function saveCardsData(cards, moduleId = 'mod1') { ... } 


/**
 * 添加新卡片
 * 对应 Flask: POST /api/{moduleId}/cards
 */
export async function addCard(cardData, moduleId = 'mod1') {
  try {
    if (!cardData.title && !cardData.scene) {
      throw new Error('标题或场景不能为空');
    }
    
    // 后端负责生成 cardId 并保存
    const result = await apiFetch('POST', moduleId, '', cardData); 
    
    console.log(`✅ 成功添加卡片到 ${moduleId}: ${result.card.cardId}`);
    return { success: true, cardId: result.card.cardId, card: result.card };
    
  } catch (error) {
    console.error(`❌ 添加卡片到 ${moduleId} 失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新卡片
 * 对应 Flask: PUT /api/{moduleId}/cards/{cardId}
 */
export async function updateCard(cardId, updates, moduleId = 'mod1') {
  try {
    const path = `/${cardId}`;
    const result = await apiFetch('PUT', moduleId, path, updates);
    
    console.log(`✅ 成功更新 ${moduleId} 卡片: ${cardId}`);
    return { success: true, card: result.card };
    
  } catch (error) {
    console.error(`❌ 更新 ${moduleId} 卡片失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 删除卡片
 * 对应 Flask: DELETE /api/{moduleId}/cards/{cardId}
 */
export async function deleteCard(cardId, moduleId = 'mod1') {
  try {
    const path = `/${cardId}`;
    await apiFetch('DELETE', moduleId, path); 
    
    console.log(`✅ 成功删除 ${moduleId} 卡片: ${cardId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ 删除 ${moduleId} 卡片失败:`, error);
    return { success: false, error: error.message };
  }
}

// ==========================================================
// 辅助功能
// ==========================================================

/**
 * 获取所有卡片 (只是 loadCardsData 的别名)
 */
export async function getAllCards(moduleId = 'mod1') {
  return await loadCardsData(moduleId);
}

/**
 * 根据ID获取单张卡片 (从当前内存数据中获取)
 * 注意：由于 loadCardsData 是异步的，调用方可能需要处理数据未加载的情况。
 */
export async function getCardById(cardId, moduleId = 'mod1') {
  const cards = await loadCardsData(moduleId);
  return cards.find(c => c.cardId === cardId) || null;
}

/**
 * 导出卡片数据 (先从后端获取最新数据，然后前端进行文件下载)
 */
export async function exportCardsToJson(moduleId = 'mod1') {
  try {
    // 1. 从后端获取最新数据
    const cards = await loadCardsData(moduleId);
    
    // 2. 在前端生成 JSON 文件
    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleId}_cards_backup_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log(`✅ ${moduleId} 卡片数据已导出`);
    return { success: true, count: cards.length };
    
  } catch (error) {
    console.error(`❌ 导出 ${moduleId} 失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 导入卡片数据 (需要后端实现 /import 接口来批量替换数据)
 * 对应 Flask: POST /api/{moduleId}/import (需要在 app.py 中实现)
 */
export async function importCardsFromFile(file, moduleId = 'mod1') {
  try {
    const text = await file.text();
    const cards = JSON.parse(text);
    
    if (!Array.isArray(cards)) {
      throw new Error('无效的 JSON 格式：必须是数组');
    }
    
    // 【重要】假设后端有一个 /import 接口用于接收并替换全部数据
    const importResult = await apiFetch('POST', moduleId, '/import', { cards: cards }); 
    
    console.log(`✅ 成功导入 ${moduleId} 的 ${importResult.count} 张卡片`);
    return { success: true, count: importResult.count };
    
  } catch (error) {
    console.error(`❌ 导入 ${moduleId} 失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 重置为原始 JSON 数据 (需要后端实现 /reset 接口来删除持久化文件)
 * 对应 Flask: POST /api/{moduleId}/reset (需要在 app.py 中实现)
 */
export async function resetToOriginal(moduleId = 'mod1') {
  try {
    // 1. 通知后端删除持久化文件/重置数据库
    // 以前是：localStorage.removeItem(config.storageKey);
    await apiFetch('POST', moduleId, '/reset');
    
    // 2. 重置后，重新加载数据以确认（此时后端会读取原始 JSON 文件）
    const cards = await loadCardsData(moduleId);
    
    console.log(`✅ ${moduleId} 已重置为原始数据 (${cards.length} 张卡片)`);
    return { success: true, count: cards.length };
    
  } catch (error) {
    console.error(`❌ 重置 ${moduleId} 失败:`, error);
    return { success: false, error: error.message };
  }
}
