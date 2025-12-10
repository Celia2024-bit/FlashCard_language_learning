// app.js —— 业务逻辑：加载/规范化/间隔/持久化/diff（修复版）
export const PLAN = [3, 6, 12];
const KEY  = 'flashcards_state_v1';

let cards = [];
let idx = 0;
let showBack = false;
let currentModule = '';

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
  const module = raw.module || raw.key_module || '';
  
  const original = raw.front.Original || raw.front.original || '';
  const explain  = raw.front.Explain  || raw.front.explain  || '';
  const usage    = raw.front.Usage    || raw.front.usage    || '';
  const extended = raw.front.Extended || raw.front.extended || ''; 
  const ton      = raw.front.Tone     || raw.front.Tone || ''; 
  
  const backExplain = raw.back.Explain || raw.back.explain || '';
  const fluency = raw.back.Fluency || raw.back.fluency || ''; 
  const backMy = raw.back.Mysentence || raw.back.Mysentence || ''; 
  const backAI = raw.back.Corrected || raw.back.Corrected || ''; 
  
  const parts = [];
  if (module) parts.push(`🔹 ${module}`);
  if (ton) parts.push(`\n📢 Tone/Conditon: ${ton}`);
  if (original) parts.push(`\n❌ Original: ${original}`); 
  if (explain)  parts.push(`\n💡 Explain: ${explain}`);  
  if (usage)    parts.push(`\n📘 Usage: ${usage}`); 
  if (extended) parts.push(`\n\n✨ Extended: ${extended}`);   
  
  const frontText = parts.join('').trim();
  
  const lines = [];
  if (fluency) lines.push(`⭐ Fluency: ${fluency}`); 
  if (backMy)  lines.push(`📝 My sentence: ${backMy}`);
  if (backAI)  lines.push(`✅ AI correction: ${backAI}`);
  if (backExplain) lines.push(`💡 Explain: ${backExplain}`);
  
  const backText = lines.join('\n').trim();

  const key_module = raw.key_module || '';
  const createdTime = raw.created_time || raw.createdTime || raw.CreatedTime || raw.dueDate || null; 

  const id = hashId((frontText || JSON.stringify(raw)) + ((module || '').trim()) + i);
  return { 
    id, 
    module: ((raw.module || key_module || 'default')).trim(), 
    frontText, 
    backText, 
    backMy, 
    backAI, 
    step:0, 
    lastReviewed:null, 
    dueDate:null,
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

/* 筛选与队列 */
export function setModule(m) { 
  currentModule = (m || '').trim(); 
  idx = 0;
  showBack = false;
  console.log('setModule:', currentModule);
}

export const getModules = () => Array.from(new Set(cards.map(c => (c.module || '').trim()).filter(Boolean))).sort();

export function filteredCards() {
  if (!currentModule) return cards;
  const trimmedModule = currentModule.trim();
  return cards.filter(c => (c.module || '').trim() === trimmedModule);
}

export const dueList = (date = new Date()) => {
  const today = stripTime(date);
  return filteredCards().filter(c => (!c.dueDate) || stripTime(new Date(c.dueDate)) <= today);
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
  const list = filteredCards(); 
  if (list.length > 0) {
    idx = (idx + 1) % list.length; 
  }
  showBack = false; 
}

export function shuffle() { 
  cards.sort(() => Math.random() - 0.5); 
  idx = 0; 
  showBack = false; 
}

/* 当前视图数据 */
export function getStatus() { 
  const list = filteredCards(); 
  return { 
    total: list.length, 
    index: idx, 
    todayCount: dueList().length, 
    showBack, 
    currentModule 
  }; 
}

export function getCurrentCard() { 
  const list = filteredCards(); 
  if (list.length === 0) return null;
  if (idx < 0 || idx >= list.length) return null;
  return list[idx]; 
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
