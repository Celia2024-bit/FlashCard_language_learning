// app.js —— 业务逻辑：加载/规范化/间隔/持久化/diff（最终修正版）
export const PLAN = [3, 6, 12];
const KEY  = 'flashcards_state_v1';

let cards = [];          // 规范化后的卡片
let idx = 0;
let showBack = false;
let currentModule = '';

/* 工具 */
export const addDays  = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return t; };
export const stripTime= d => { const t = new Date(d); t.setHours(0,0,0,0); return t; };
export const fmtDate  = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
// 修正 1：处理换行符 \n 为 <br>
export const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>');
export const hashId   = s => { let h=0; for (let i=0;i<s.length;i++) h=(h<<5)-h+s.charCodeAt(i), h|=0; return 'id_'+(h>>>0).toString(16); };

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
  
  // 1. FRONT FIELDS 字段提取
  const original = raw.front.Original || raw.front.original || '';
  const explain  = raw.front.Explain  || raw.front.explain  || '';
  const usage    = raw.front.Usage    || raw.front.usage    || '';
  const extended = raw.front.Extended || raw.front.extended || ''; 
  const ton      = raw.front.Tone     || raw.front.Tone || ''; 
  
  // 2. BACK FIELDS 字段提取
  const backExplain = raw.back.Explain || raw.back.explain || '';
  const fluency = raw.back.Fluency || raw.back.fluency || ''; 
  const backMy = raw.back.Mysentence || raw.back.Mysentence || ''; 
  const backAI = raw.back.Corrected || raw.back.Corrected || ''; 
  
  // 3. 构造 frontText (卡片正面显示内容)
  const parts = [];
  if (module) parts.push(`🔹 ${module}`);
  if (ton) parts.push(`\n📢 Tone/Conditon: ${ton}`);
  if (original) parts.push(`\n❌ Original: ${original}`); 
  if (explain)  parts.push(`\n💡 Explain: ${explain}`);  
  if (usage)    parts.push(`\n📘 Usage: ${usage}`); 
  if (extended) parts.push(`\n\n✨ Extended: ${extended}`);   
  
  const frontText = parts.join('').trim();
  
  // 4. 构造 backText (卡片背面显示内容)
  const lines = [];
  if (fluency) lines.push(`⭐ Fluency: ${fluency}`); 
  if (backMy)  lines.push(`📝 My sentence: ${backMy}`);
  if (backAI)  lines.push(`✅ AI correction: ${backAI}`);
  if (backExplain) lines.push(`💡 Explain: ${backExplain}`);
  
  const backText = lines.join('\n').trim();

  // 5. 元数据
  const key_module = raw.key_module || '';
  const createdTime = raw.created_time || raw.createdTime || raw.CreatedTime || raw.dueDate || null; 

  // 6. 返回规范化后的卡片对象
  const id = hashId((frontText || JSON.stringify(raw)) + (module || '') + i);
  return { 
    id, 
    module: raw.module || key_module || 'default', 
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

/* 加载与持久化 (保持不变) */
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

  const due = dueList();
  const list = filteredCards();
  if (due.length) {
    const targetId = due[0].id;
    idx = Math.max(0, list.findIndex(k => k.id === targetId));
  } else idx = 0;

  showBack = false;
}

function persist(card) {
  const state = JSON.parse(localStorage.getItem(KEY) || '{}');
  state[card.id] = { step: card.step, lastReviewed: card.lastReviewed, dueDate: card.dueDate };
  localStorage.setItem(KEY, JSON.stringify(state));
}

/* 筛选与队列 (保持不变) */
export const setModule   = m => { currentModule = m || ''; idx = 0; showBack = false; };
export const getModules  = () => Array.from(new Set(cards.map(c => c.module).filter(Boolean))).sort();
export const filteredCards = () => currentModule ? cards.filter(c => c.module === currentModule) : cards;

export const dueList = (date = new Date()) => {
  const today = stripTime(date);
  return filteredCards().filter(c => (!c.dueDate) || stripTime(new Date(c.dueDate)) <= today);
};

/* 间隔与进度 (保持不变) */
export function completeReview(card) {
  const now = new Date();
  const nextStep = Math.min((card.step || 0) + 1, PLAN.length);
  const gapDays  = PLAN[(nextStep - 1)] || 12;   
  const nextDue  = addDays(now, gapDays);
  card.step = nextStep; card.lastReviewed = now.toISOString(); card.dueDate = nextDue.toISOString();
  persist(card);
}
export function resetProgress(card) { card.step = 0; card.lastReviewed = null; card.dueDate = null; persist(card); }

/* 导航 (保持不变) */
export const toggleBack = () => { showBack = !showBack; };
export const next       = () => { const list = filteredCards(); idx = (idx + 1) % list.length; showBack = false; };
export const shuffle    = () => { cards.sort(() => Math.random() - 0.5); idx = 0; showBack = false; };

/* 当前视图数据 (保持不变) */
export const getStatus      = () => { const list = filteredCards(); return { total:list.length, index:idx, todayCount: dueList().length, showBack, currentModule }; };
export const getCurrentCard = () => { const list = filteredCards(); return list.length ? list[idx] : null; };

export const extractMyAi = back => {
  if (back && typeof back === 'object') {
    // 兼容新的 Mysentence 和 Corrected 键名
    const my = back['My sentence'] || back.MySentence || back.my || back.my_sentence || '';
    const ai = back['AI correction'] || back.Corrected || back.ai || back.ai_sentence || back.ai_correction || '';
    return { my, ai };
  }
  return extractMyAiStr(back || '');
};

/* Diff - 修正 2：修复 Diff 库作用域问题，并使用字符级比较 */
export function buildDiffHTML(myText, aiText) {
  // 核心修复：显式检查并使用 window 上的全局对象
  const DMP = (typeof diff_match_patch !== 'undefined' && diff_match_patch) || window.diff_match_patch;
  
  if (!DMP) {
    // 找不到库，直接返回 AI 文本 (确保换行符被替换)
    return escapeHtml(aiText) || 'Diff library not loaded.';
  }
  
  // 清理输入文本
  const myClean = String(myText || '').trim();
  const aiClean = String(aiText || '').trim();
  
  if (!myClean || !aiClean) {
      // 如果没有比较数据，返回 AI 文本或提示
      return escapeHtml(aiText) || 'No comparison data available.';
  }

  const dmp = new DMP();
  
  // 进行字符级 diff
  let diffs = dmp.diff_main(myClean, aiClean);
  dmp.diff_cleanupSemantic(diffs); 

  let html = '';
  const original = myClean; 
  let originalIndex = 0; 
  
  // 检查字符是否是纯空格或标点
  const isPunctuationOrSpace = char => char.match(/^[\s,.!?;:'"()\[\]@#$%^&*-]$/);
  
  diffs.forEach(([type, text]) => {
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // 使用 app.js 的 escapeHtml，它已处理 \n -> <br>
        const escapedChar = escapeHtml(char); 
        
        // 忽略纯标点/空格，不应用 diff class
        if (isPunctuationOrSpace(char) && type === 0) {
             html += escapedChar;
             originalIndex++;
             continue;
        }

        if (type === 0) {
            // 相同文本: 检查大小写差异
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
            // 添加文本
            html += `<span class="w-add">${escapedChar}</span>`; 

        } else if (type === -1) {
            // 移除文本
            html += `<span class="w-rem">${escapedChar}</span>`; 
            originalIndex++;
        }
    }
  });

  return html.trim() || 'No differences';
}