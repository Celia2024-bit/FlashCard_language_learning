
// app.js —— 业务逻辑：加载/规范化/间隔/持久化/diff（无调试日志）
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
export const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export const hashId   = s => { let h=0; for (let i=0;i<s.length;i++) h=(h<<5)-h+s.charCodeAt(i), h|=0; return 'id_'+(h>>>0).toString(16); };

/* 从字符串反面解析 My/AI */
function extractMyAiStr(backText) {
  const lines = String(backText).split(/\r?\n/);
  let my='', ai='';
  for (const raw of lines) {
    const line = raw.replace(/^📝\s*/,'').replace(/^✅\s*/,'').trim();
    if (/^my sentence\s*:/i.test(line)) my = line.replace(/^my sentence\s*:/i, '').trim();
    else if (/^(ai correction|ai sentence)\s*:/i.test(line)) ai = line.replace(/^(ai correction|ai sentence)\s*:/i, '').trim();
  }
  return { my, ai };
}

/* 替换 app.js 中的 normalizeCard 函数 */
export function normalizeCard(raw, i) {
    // 1. FRONT FIELDS 字段提取 (已修正，兼容新的大小写键名)
    const original = raw.front.Original || raw.front.original || '';
    const explain = raw.front.Explain || raw.front.explain || '';
    const usage = raw.front.Usage || raw.front.usage || '';
    const extended = raw.front.Extended || raw.front.extended || '';

    // *** 修正 ToneCondition 字段查找，兼容新键名 ***
    // 新的 cards.json 键名是 "ToneCondition" (无下划线)
    const toneCondition = raw.front.ToneCondition || raw.front.Tone_Condition || raw.front.tone_condition || ''; 

    // 2. BACK FIELDS 字段提取 (已修正，兼容新的大小写键名)
    const backExplain = raw.back.Explain || raw.back.explain || '';
    const fluency = raw.back.Fluency || raw.back.fluency || '';

    // *** 修正 My sentence 字段查找，兼容新键名 "Mysentence" ***
    const backMy = raw.back['My sentence'] || raw.back.Mysentence || raw.back.my || raw.back.my_sentence || '';

    // *** 修正 AI correction 字段查找，兼容新键名 "Corrected" ***
    const backAI = raw.back['AI correction'] || raw.back.Corrected || raw.back.ai || raw.back.ai_correction || '';


    // 3. METADATA
    const key_module = raw.key_module || '';
    const module_name = raw.module || key_module || 'default';


    // 4. 构建 frontText (卡片正面显示内容)
    const parts = [];
    if (key_module) parts.push(`🔹 ${key_module}`);
    if (toneCondition) parts.push(`📢 Tone/Context: ${toneCondition}`);
    if (original) parts.push(`\n❌ Original: ${original}`);
    if (explain) parts.push(`💡 Explain: ${explain}`);
    if (usage) parts.push(`📘 Usage: ${usage}`);
    if (extended) parts.push(`✨ Extended: ${extended}`);

    
    const frontText = parts.join('\n').trim();


    // 5. 构建 backText (卡片背面显示内容)
    const backParts = [];
    if (backMy) backParts.push(`📝 My sentence: ${backMy}`);
    if (backAI) backParts.push(`✅ AI correction: ${backAI}`);
    if (backExplain) backParts.push(`💡 Explain: ${backExplain}`);
    if (fluency) backParts.push(`⭐ Fluency: ${fluency}`);

    const backText = backParts.join('\n').trim();


    // 6. 返回规范化后的卡片对象
    return {
        // 假设您的 app.js 拥有 hashId 和 fmtDate 等工具函数
        id: raw.id || hashId(frontText + backText),
        frontText,
        backText,
        // ... (其他状态字段，如 reviewState, nextReview, step 等)
        key_module,
        module: module_name,
        created: raw.created || fmtDate(raw.created_time) // 兼容 created_time 字段
    };
}

/* 加载与持久化 */
export async function loadCards() {
  const resp = await fetch('./cards.json');           // 加相对路径，避免路径问题
  const json = await resp.json();                     // 抛错由 ui.js 捕获并提示
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

/* 筛选与队列 */
export const setModule   = m => { currentModule = m || ''; idx = 0; showBack = false; };
export const getModules  = () => Array.from(new Set(cards.map(c => c.module).filter(Boolean))).sort();
export const filteredCards = () => currentModule ? cards.filter(c => c.module === currentModule) : cards;

export const dueList = (date = new Date()) => {
  const today = stripTime(date);
  return filteredCards().filter(c => (!c.dueDate) || stripTime(new Date(c.dueDate)) <= today);
};

/* 间隔与进度 */
export function completeReview(card) {
  const now = new Date();
  const nextStep = Math.min((card.step || 0) + 1, PLAN.length);
  const gapDays  = PLAN[(nextStep - 1)] || 12;   // 超过后固定 12
  const nextDue  = addDays(now, gapDays);
  card.step = nextStep; card.lastReviewed = now.toISOString(); card.dueDate = nextDue.toISOString();
  persist(card);
}
export function resetProgress(card) { card.step = 0; card.lastReviewed = null; card.dueDate = null; persist(card); }

/* 导航 */
export const toggleBack = () => { showBack = !showBack; };
export const next       = () => { const list = filteredCards(); idx = (idx + 1) % list.length; showBack = false; };
export const shuffle    = () => { cards.sort(() => Math.random() - 0.5); idx = 0; showBack = false; };

/* 当前视图数据 */
export const getStatus      = () => { const list = filteredCards(); return { total:list.length, index:idx, todayCount: dueList().length, showBack, currentModule }; };
export const getCurrentCard = () => { const list = filteredCards(); return list.length ? list[idx] : null; };

/* Diff */
export const extractMyAi = back => {
  if (back && typeof back === 'object') {
    const my = back['My sentence'] || back.my || back.my_sentence || '';
    const ai = back['AI correction'] || back.ai || back.ai_sentence || back.ai_correction || '';
    return { my, ai };
  }
  return extractMyAiStr(back || '');
};
export const tokenizeWords = s => (s ? (s.match(/\w+|[^\s\w]+/g) || []) : []);
export function lcsAlign(aTokens, bTokens) {
  const m = aTokens.length, n = bTokens.length;
  const dp = Array.from({length:m+1}, () => Array(n+1).fill(0));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = (aTokens[i-1].toLowerCase() === bTokens[j-1].toLowerCase()) ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j], dp[i][j-1]);
  let i=m, j=n; const pairs=[];
  while (i>0 && j>0) {
    if (aTokens[i-1].toLowerCase() === bTokens[j-1].toLowerCase()) { pairs.push([i-1,j-1]); i--; j--; }
    else if (dp[i-1][j] >= dp[i][j-1]) i--; else j--;
  }
  return pairs.reverse();
}
export function buildDiffHTML(myText, aiText) {
  const a = tokenizeWords(myText), b = tokenizeWords(aiText), pairs = lcsAlign(a, b);
  let ai=0, bi=0, html=''; const wrap = (cls,t)=>`<span class="${cls}">${escapeHtml(t)}</span>`; const plain = t=>escapeHtml(t);
  for (const [aiMatch, biMatch] of pairs) {
    while (ai<aiMatch) { html += wrap('w-rem', a[ai])+' '; ai++; }
    while (bi<biMatch) { html += wrap('w-add', b[bi])+' '; bi++; }
    const at=a[aiMatch], bt=b[biMatch];
    html += (at===bt) ? (plain(bt)+' ')
          : (at.toLowerCase()===bt.toLowerCase()) ? (wrap('w-case', bt)+' ')
          : (wrap('w-add', bt)+' ');
    ai=aiMatch+1; bi=biMatch+1;
  }
  while (ai<a.length) { html += wrap('w-rem', a[ai])+' '; ai++; }
  while (bi<b.length) { html += wrap('w-add', b[bi])+' '; bi++; }
  return html.trim();
}
