// cardEditor.js - 卡片编辑器UI（简化版，配合HTML中的模态框，支持多模块）
import { addCard, updateCard, deleteCard, getAllCards, exportCardsToJson, importCardsFromFile, resetToOriginal } from './cardManager.js';
import { loadCards, getCurrentModuleId } from './app.js';

/**
 * 获取当前模块ID（自动检测）
 */
function getCurrentModule() {
  // 从当前卡片获取模块ID
  const currentCard = window.debugGetCurrentCard ? window.debugGetCurrentCard() : null;
  if (currentCard && currentCard.moduleId) {
    return currentCard.moduleId;
  }
  
  // 或者从 app.js 获取当前模块
  const moduleId = getCurrentModuleId();
  if (moduleId && moduleId !== '' && moduleId !== 'review') {
    return moduleId;
  }
  
  // 默认返回 mod1
  return 'mod1';
}

/**
 * 根据模块类型显示/隐藏表单字段
 */
function updateFormFields(moduleId) {
  // Module 1 专属字段
  const mod1Fields = [
    'cardOriginal', 'cardTone', 'cardExplain', 
    'cardUsage', 'cardExtended', 'cardExplainCorrected'
  ];
  
  // Module 2 专属字段
  const mod2Fields = ['cardScene', 'cardRelatedCards'];
  
  if (moduleId === 'mod1') {
    // 显示 Module 1 字段
    mod1Fields.forEach(id => {
      const field = document.getElementById(id);
      if (field) field.closest('.form-group').style.display = 'block';
    });
    
    // 隐藏 Module 2 字段
    mod2Fields.forEach(id => {
      const field = document.getElementById(id);
      if (field) field.closest('.form-group').style.display = 'none';
    });
    
    // 修改标题字段的标签
    const titleLabel = document.querySelector('label[for="cardTitle"]');
    if (titleLabel) titleLabel.textContent = '📝 标题 *';
    
  } else if (moduleId === 'mod2') {
    // 隐藏 Module 1 专属字段
    mod1Fields.forEach(id => {
      const field = document.getElementById(id);
      if (field) field.closest('.form-group').style.display = 'none';
    });
    
    // 显示 Module 2 字段
    mod2Fields.forEach(id => {
      const field = document.getElementById(id);
      if (field) field.closest('.form-group').style.display = 'block';
    });
    
    // 修改标题字段的标签为场景
    const titleLabel = document.querySelector('label[for="cardTitle"]');
    if (titleLabel) titleLabel.textContent = '🎬 场景 *';
  }
}

/**
 * 打开编辑器（添加模式）
 */
export function openCardEditor() {
  const moduleId = getCurrentModule();
  
  // 重置表单
  document.getElementById('cardEditorForm').reset();
  document.getElementById('editingCardId').value = '';
  document.getElementById('editingModuleId').value = moduleId;  // 保存模块ID
  document.getElementById('editorTitle').textContent = `添加新卡片 (${moduleId})`;
  
  // 根据模块类型更新表单字段
  updateFormFields(moduleId);
  
  // 显示模态框
  document.getElementById('cardEditorModal').style.display = 'flex';
}

/**
 * 打开编辑器（编辑模式）
 */
export async function openCardEditorForEdit(cardId) {
  const currentCard = window.debugGetCurrentCard ? window.debugGetCurrentCard() : null;
  const moduleId = currentCard ? currentCard.moduleId : 'mod1';
  
  // 获取卡片数据
  const cards = await getAllCards(moduleId);
  const card = cards.find(c => c.cardId === cardId);
  
  if (!card) {
    alert('未找到卡片');
    return;
  }
  
  // 填充表单
  document.getElementById('editingCardId').value = card.cardId;
  document.getElementById('editingModuleId').value = moduleId;
  
  if (moduleId === 'mod1') {
    document.getElementById('cardTitle').value = card.title || '';
    document.getElementById('cardOriginal').value = card.Original || '';
    document.getElementById('cardTone').value = card.Tone || 'informal';
    document.getElementById('cardExplain').value = card.Explain || '';
    document.getElementById('cardUsage').value = card.Usage || '';
    document.getElementById('cardExtended').value = card.Extended || '';
    document.getElementById('cardMysentence').value = card.Mysentence || '';
    document.getElementById('cardCorrected').value = card.Corrected || '';
    document.getElementById('cardExplainCorrected').value = card.ExplainCorrected || '';
  } else if (moduleId === 'mod2') {
    document.getElementById('cardTitle').value = card.scene || '';
    document.getElementById('cardMysentence').value = card.Mysentence || '';
    document.getElementById('cardCorrected').value = card.Corrected || '';
    document.getElementById('cardExplain').value = card.Explain || '';
    
    const relatedField = document.getElementById('cardRelatedCards');
    if (relatedField) {
      relatedField.value = (card.relatedCards || []).join(', ');
    }
  }
  
  document.getElementById('editorTitle').textContent = `编辑卡片: ${card.cardId}`;
  
  // 根据模块类型更新表单字段
  updateFormFields(moduleId);
  
  // 显示模态框
  document.getElementById('cardEditorModal').style.display = 'flex';
}

/**
 * 关闭编辑器
 */
export function closeCardEditor() {
  document.getElementById('cardEditorModal').style.display = 'none';
}

/**
 * 处理表单提交
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const editingCardId = document.getElementById('editingCardId').value;
  const moduleId = document.getElementById('editingModuleId').value || getCurrentModule();
  
  let cardData;
  
  if (moduleId === 'mod1') {
    // Module 1 数据
    cardData = {
      title: document.getElementById('cardTitle').value,
      Original: document.getElementById('cardOriginal').value,
      Tone: document.getElementById('cardTone').value,
      Explain: document.getElementById('cardExplain').value,
      Usage: document.getElementById('cardUsage').value,
      Extended: document.getElementById('cardExtended').value,
      Mysentence: document.getElementById('cardMysentence').value,
      Corrected: document.getElementById('cardCorrected').value,
      ExplainCorrected: document.getElementById('cardExplainCorrected').value
    };
  } else if (moduleId === 'mod2') {
    // Module 2 数据
    const relatedStr = document.getElementById('cardRelatedCards')?.value || '';
    const relatedCards = relatedStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    cardData = {
      scene: document.getElementById('cardTitle').value,
      title: document.getElementById('cardTitle').value,  // 兼容性
      Mysentence: document.getElementById('cardMysentence').value,
      Corrected: document.getElementById('cardCorrected').value,
      Explain: document.getElementById('cardExplain').value,
      relatedCards: relatedCards
    };
  }
  
  let result;
  
  if (editingCardId) {
    // 编辑模式
    result = await updateCard(editingCardId, cardData, moduleId);
  } else {
    // 添加模式
    result = await addCard(cardData, moduleId);
  }
  
  if (result.success) {
    alert(editingCardId ? '✅ 卡片更新成功！' : '✅ 卡片添加成功！');
    closeCardEditor();
    
    // 重新加载卡片数据
    await loadCards();
    
    // 恢复到之前的模块
    if (window.setModule) {
      window.setModule(moduleId);
    }
    
    // 刷新卡片列表下拉框
    if (window.fillCardOptions) {
      window.fillCardOptions();
    }
    
    if (window.fillModuleOptions) {
      window.fillModuleOptions();
    }
    
    // 刷新UI
    if (window.debugRender) {
      window.debugRender();
    }
  } else {
    alert('❌ 操作失败: ' + result.error);
  }
}

/**
 * 删除当前卡片
 */
export async function deleteCurrentCard() {
  const currentCard = window.debugGetCurrentCard ? window.debugGetCurrentCard() : null;
  
  if (!currentCard) {
    alert('没有选中的卡片');
    return;
  }
  
  const moduleId = currentCard.moduleId || 'mod1';
  
  if (!confirm(`确定要删除卡片 "${currentCard.title || currentCard.scene}" 吗？\n\n${currentCard.cardId}`)) {
    return;
  }
  
  const result = await deleteCard(currentCard.cardId, moduleId);
  
  if (result.success) {
    alert('✅ 卡片删除成功！');
    
    // 重新加载卡片数据
    await loadCards();
    
    // 恢复到之前的模块
    if (window.setModule) {
      window.setModule(moduleId);
    }
    
    // 刷新卡片列表下拉框
    if (window.fillCardOptions) {
      window.fillCardOptions();
    }
    
    if (window.fillCardOptions) {
      window.fillCardOptions();
    }
    
    // 刷新UI
    if (window.debugRender) {
      window.debugRender();
    }
  } else {
    alert('❌ 删除失败: ' + result.error);
  }
}

/**
 * 导出数据
 */
export async function exportCards() {
  const moduleId = getCurrentModule();
  const result = await exportCardsToJson(moduleId);
  if (result.success) {
    alert(`✅ ${moduleId} 数据已导出！`);
  } else {
    alert('❌ 导出失败: ' + result.error);
  }
}

/**
 * 导入数据
 */
export async function importCards() {
  const moduleId = getCurrentModule();
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!confirm(`导入将覆盖当前 ${moduleId} 的所有数据，确定继续吗？`)) {
      return;
    }
    
    const result = await importCardsFromFile(file, moduleId);
    
    if (result.success) {
      alert(`✅ 成功导入 ${result.count} 张卡片到 ${moduleId}！`);
      
      // 重新加载
      await loadCards();
      if (window.fillCardOptions) {
        window.fillCardOptions();
      }
      if (window.debugRender) {
        window.debugRender();
      }
    } else {
      alert('❌ 导入失败: ' + result.error);
    }
  };
  
  input.click();
}

/**
 * 重置数据
 */
export async function resetCards() {
  const moduleId = getCurrentModule();
  
  if (!confirm(`将 ${moduleId} 重置为原始 JSON 数据，当前所有修改将丢失，确定吗？`)) {
    return;
  }
  
  const result = await resetToOriginal(moduleId);
  
  if (result.success) {
    alert(`✅ ${moduleId} 已重置为原始数据 (${result.count} 张卡片)`);
    
    // 重新加载
    await loadCards();
    if (window.fillCardOptions) {
      window.fillCardOptions();
    }
    if (window.debugRender) {
      window.debugRender();
    }
  } else {
    alert('❌ 重置失败: ' + result.error);
  }
}

/**
 * 编辑当前卡片
 */
export async function editCurrentCard() {
  const currentCard = window.debugGetCurrentCard ? window.debugGetCurrentCard() : null;
  
  if (!currentCard) {
    alert('没有选中的卡片');
    return;
  }
  
  await openCardEditorForEdit(currentCard.cardId);
}

// 初始化：绑定表单提交事件
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cardEditorForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  console.log('✅ 卡片编辑器已初始化');
});

// 暴露到全局
window.closeCardEditor = closeCardEditor;
window.cardEditor = {
  openCardEditor,
  openCardEditorForEdit,
  closeCardEditor,
  editCurrentCard,
  deleteCurrentCard,
  exportCards,
  importCards,
  resetCards
};