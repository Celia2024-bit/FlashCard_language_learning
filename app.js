// app.js —— 简化版：移除模块过滤逻辑
export const PLAN = [3, 6, 12];
const KEY  = 'flashcards_state_v1';

let cards = [];
let idx = 0;
let showBack = false;

/* 工具 */
export const addDays  = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return t; };
export const stripTime= d => { const t = new Date(d); t.setHours(0,0,0,0); return t; };
export const fmtDate  = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const hashId   = s => { let h=0; for (let i=0;i<s.length;i++) h=(h<<5)-h+s.charCodeAt(i), h|=0; return 'id_'+(h>>>0).toString(16); };
export const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>');

/* 从字符串反面解析 My/AI */
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

/* 规范化一张卡 */
function normalizeCard(raw, i) {
  const module = (raw.module || 'default').trim();
  
  const original = raw.front.Original || raw.front.original || '';
  const explain  = raw.front.Explain  || raw.front.explain  || '';
  const usage    = raw.front.Usage    || raw.front.usage    || '';
  const extended = raw.front.Extended || raw.front.extended || ''; 
  const ton      = raw.front.Tone     || raw.front.tone || ''; 
  
  const backExplain = raw.back.Explain || raw.back.explain || '';
  const fluency = raw.back.Fluency || raw.back.fluency || ''; 
  const backMy = raw.back.Mysentence || raw.back.mysentence || ''; 
  const backAI = raw.back.Corrected || raw.back.corrected || ''; 
  
  const parts = [];
  if (module) parts.push(`🔹 ${module} ： ${ton}`);
 // if (ton) parts.push(`\n📢 Tone/Conditon: ${ton}`);
  if (original) parts.push(`\n📢 ${original}`); 
  if (explain)  parts.push(`\n💡${explain}`);  
  if (usage)    parts.push(`\n📘 ${usage}`); 
  if (extended) parts.push(`\n\n✨ ${extended}`);   
  
  const frontText = parts.join('').trim();
  
  const lines = [];
  if (fluency) lines.push(`⭐ Fluency: ${fluency}`); 
  if (backMy)  lines.push(`📝  ${backMy}`);
  if (backAI)  lines.push(`✅  ${backAI}`);
  if (backExplain) lines.push(`💡  ${backExplain}`);
  
  const backText = lines.join('\n').trim();

  const createdTime = raw.back.Createdtime || raw.back.createdtime || null; 

  const id = hashId((frontText || JSON.stringify(raw)) + module + i);
  return { 
    id, 
    module, 
    frontText, 
    backText, 
    backMy, 
    backAI, 
    step: 0, 
    lastReviewed: null, 
    dueDate: null,
    createdTime 
  };
}

/* 加载与持久化 */
export async function loadCards() {
  const resp = await fetch('./cards.json');           
  const json = await resp.json();                     
  const state = JSON.parse(localStorage.getItem(KEY) || '{}');

  cards = json.map((raw, i) => {
    const c = normalizeCard(raw, i);
    const s = state[c.id] || {};
    c.step = s.step || 0;
    c.lastReviewed = s.lastReviewed || null;
    c.dueDate = s.dueDate || null;
    return c;
  });

  idx = 0;
  showBack = false;
}

function persist(card) {
  const state = JSON.parse(localStorage.getItem(KEY) || '{}');
  state[card.id] = { step: card.step, lastReviewed: card.lastReviewed, dueDate: card.dueDate };
  localStorage.setItem(KEY, JSON.stringify(state));
}

/* 快速跳转到某个模块的卡片 */
export function jumpToModule(moduleName) { 
  const targetModule = (moduleName || '').trim();
  if (!targetModule) {
    idx = 0; // 跳到第一张
  } else {
    const foundIdx = cards.findIndex(c => (c.module || '').trim() === targetModule);
    idx = foundIdx >= 0 ? foundIdx : 0;
  }
  showBack = false;
  console.log('jumpToModule:', targetModule, 'idx:', idx);
}

export const getModules = () => Array.from(new Set(cards.map(c => (c.module || '').trim()).filter(Boolean))).sort();

export const dueList = (date = new Date()) => {
  const today = stripTime(date);
  return cards.filter(c => (!c.dueDate) || stripTime(new Date(c.dueDate)) <= today);
};

/* 间隔与进度 */
export function completeReview(card) {
  const now = new Date();
  const nextStep = Math.min((card.step || 0) + 1, PLAN.length);
  const gapDays  = PLAN[(nextStep - 1)] || 12;   
  const nextDue  = addDays(now, gapDays);
  card.step = nextStep; 
  card.lastReviewed = now.toISOString(); 
  card.dueDate = nextDue.toISOString();
  persist(card);
}

export function resetProgress(card) { 
  card.step = 0; 
  card.lastReviewed = null; 
  card.dueDate = null; 
  persist(card); 
}

/* 导航 */
export const toggleBack = () => { showBack = !showBack; };

export function next() { 
  if (cards.length > 0) {
    idx = (idx + 1) % cards.length;
    console.log('next() called, new idx:', idx, 'total:', cards.length);
  }
  showBack = false; 
}

export const prev = () => { 
    if (cards.length > 0) {
        idx = (idx - 1 + cards.length) % cards.length;
        console.log('previous() called, new idx:', idx, 'total:', cards.length);
      }
      showBack = false; 
};

export function shuffle() { 
  cards.sort(() => Math.random() - 0.5); 
  idx = 0; 
  showBack = false; 
}

/* 当前视图数据 */
export function getStatus() { 
  const current = getCurrentCard();
  return { 
    total: cards.length, 
    index: idx, 
    todayCount: dueList().length, 
    showBack, 
    currentModule: current ? current.module : '' // 显示当前卡片的模块
  }; 
}

export function getCurrentCard() { 
  if (cards.length === 0) return null;
  if (idx < 0 || idx >= cards.length) {
    console.warn('idx out of range:', idx, 'max:', cards.length);
    return null;
  }
  return cards[idx]; 
}

export const extractMyAi = back => {
  if (back && typeof back === 'object') {
    const my = back['My sentence'] || back.MySentence || back.my || back.my_sentence || '';
    const ai = back['AI correction'] || back.Corrected || back.ai || back.ai_sentence || back.ai_correction || '';
    return { my, ai };
  }
  return extractMyAiStr(back || '');
};

export function buildDiffHTML(myText, aiText) {
  const DMP = window.diff_match_patch;
  
  if (!DMP) {
    console.error("❌ 错误：diff_match_patch 库未找到。");
    return escapeHtml(aiText) || 'Diff library not loaded.';
  }
  
  const myClean = String(myText || '').trim();
  const aiClean = String(aiText || '').trim();

  if (!myClean || !aiClean) {
    return escapeHtml(aiText) || 'No comparison data available.';
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