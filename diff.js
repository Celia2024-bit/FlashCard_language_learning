// diff.js - Diff 比对与 HTML 生成模块

/* HTML 转义工具 */
export const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>');

/* 从字符串后面解析 My/AI */
function extractMyAiStr(backText) {
  const lines = String(backText).split(/\r?\n/);
  let my='', ai='';
  for (const raw of lines) {
    const line = raw.replace(/^📝\s*/,'').replace(/^✅\s*/,'').trim();
    if (/^my sentence\s*:/i.test(line)) my = line.replace(/^my sentence\s*:/i, '').trim();
    else if (/^(ai correction|ai sentence)\s*:/i.test(line)) ai = line.replace(/^(ai correction|ai correction)\s*:/i, '').trim();
  }
  return { my, ai };
}

/* 从对象或字符串中提取 My/AI 句子 */
export const extractMyAi = back => {
  if (back && typeof back === 'object') {
    const my = back['My sentence'] || back.MySentence || back.my || back.my_sentence || '';
    const ai = back['AI correction'] || back.Corrected || back.ai || back.ai_sentence || back.ai_correction || '';
    return { my, ai };
  }
  return extractMyAiStr(back || '');
};

/* 生成 Diff HTML */
export function buildDiffHTML(myText, aiText) {
  const DMP = window.diff_match_patch;
  
  if (!DMP) {
    console.error("❌ 错误：diff_match_patch 库未找到。");
    return escapeHtml(aiText) || 'Diff library not loaded.';
  }
  
  const myClean = String(myText || '').trim();
  const aiClean = String(aiText || '').trim();

  if (!myClean || !aiClean) {
    return escapeHtml(aiText) || '';
  }

  const dmp = new DMP();
  let diffs = dmp.diff_main(myClean, aiClean);
  dmp.diff_cleanupSemantic(diffs); 

  let html = '';
  const original = myClean; 
  let originalIndex = 0; 
  
  const isPunctuationOrSpace = char => char.match(/^[\s,.!?;:'"()\[\]@#$%^&*-]$/);
  
  diffs.forEach(([type, text]) => {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const escapedChar = escapeHtml(char); 
      
      if (isPunctuationOrSpace(char) && type === 0) {
        html += escapedChar;
        originalIndex++;
        continue;
      }

      if (type === 0) {
        const originalChar = original[originalIndex]; 
        
        if (originalChar && 
            originalChar.toLowerCase() === char.toLowerCase() && 
            originalChar !== char) {
          html += `<span class="w-case">${escapedChar}</span>`; 
        } else {
          html += escapedChar; 
        }
        originalIndex++;

      } else if (type === 1) {
        html += `<span class="w-add">${escapedChar}</span>`; 

      } else if (type === -1) {
        html += `<span class="w-rem">${escapedChar}</span>`; 
        originalIndex++;
      }
    }
  });

  return html.trim() || 'No differences';
}