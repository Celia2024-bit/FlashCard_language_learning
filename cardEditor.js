// cardEditor.js - 卡片编辑器UI（简化版，配合HTML中的模态框）
import { addCard, updateCard, deleteCard, getAllCards, exportCardsToJson, importCardsFromFile, resetToOriginal } from './cardManager.js';
import { loadCards } from './app.js';

/**
 * 打开编辑器（添加模式）
 */
export function openCardEditor() {
  // 重置表单
  document.getElementById('cardEditorForm').reset();
  document.getElementById('editingCardId').value = '';
  document.getElementById('editorTitle').textContent = '添加新卡片';
  
  // 显示模态框
  document.getElementById('cardEditorModal').style.display = 'flex';
}

/**
 * 打开编辑器（编辑模式）
 */
export async function openCardEditorForEdit(cardId) {
  // 获取卡片数据
  const cards = await getAllCards();
  const card = cards.find(c => c.cardId === cardId);
  
  if (!card) {
    alert('未找到卡片');
    return;
  }
  
  // 填充表单
  document.getElementById('editingCardId').value = card.cardId;
  document.getElementById('cardTitle').value = card.title || '';
  document.getElementById('cardOriginal').value = card.Original || '';
  document.getElementById('cardTone').value = card.Tone || 'informal';
  document.getElementById('cardExplain').value = card.Explain || '';
  document.getElementById('cardUsage').value = card.Usage || '';
  document.getElementById('cardExtended').value = card.Extended || '';
  document.getElementById('cardMysentence').value = card.Mysentence || '';
  document.getElementById('cardCorrected').value = card.Corrected || '';
  document.getElementById('cardExplainCorrected').value = card.ExplainCorrected || '';
  
  document.getElementById('editorTitle').textContent = `编辑卡片: ${card.cardId}`;
  
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
  
  const cardData = {
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
  
  let result;
  
  if (editingCardId) {
    // 编辑模式
    result = await updateCard(editingCardId, cardData);
  } else {
    // 添加模式
    result = await addCard(cardData);
  }
  
  if (result.success) {
    alert(editingCardId ? '✅ 卡片更新成功！' : '✅ 卡片添加成功！');
    closeCardEditor();
    
    // 重新加载卡片数据
    await loadCards();
    
    // 刷新卡片列表下拉框
    if (window.fillCardOptions) {
      window.fillCardOptions();
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
  
  if (!confirm(`确定要删除卡片 "${currentCard.title}" 吗？\n\n${currentCard.cardId}`)) {
    return;
  }
  
  const result = await deleteCard(currentCard.cardId);
  
  if (result.success) {
    alert('✅ 卡片删除成功！');
    
    // 重新加载卡片数据
    await loadCards();
    
    // 刷新卡片列表下拉框
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
  const result = await exportCardsToJson();
  if (result.success) {
    alert('✅ 数据已导出！');
  } else {
    alert('❌ 导出失败: ' + result.error);
  }
}

/**
 * 导入数据
 */
export async function importCards() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!confirm('导入将覆盖当前所有数据，确定继续吗？')) {
      return;
    }
    
    const result = await importCardsFromFile(file);
    
    if (result.success) {
      alert(`✅ 成功导入 ${result.count} 张卡片！`);
      
      // 重新加载
      await loadCards();
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
  if (!confirm('将重置为原始 JSON 数据，当前所有修改将丢失，确定吗？')) {
    return;
  }
  
  const result = await resetToOriginal();
  
  if (result.success) {
    alert(`✅ 已重置为原始数据 (${result.count} 张卡片)`);
    
    // 重新加载
    await loadCards();
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