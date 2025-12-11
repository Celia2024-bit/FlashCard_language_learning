// app.js —— 简化版：移除模块过滤逻辑
const KEY  = 'flashcards_state_v1';

let cards = [];
let idx = 0;
let showBack = true;

import { addDays, stripTime, hashId } from './util.js';

/* 规范化一张卡 */
function normalizeCard(raw, i) {
  const title = (raw.title || 'default').trim();
  
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
  if (title) parts.push(`🔹 ${title} ： ${ton}`);
  if (original) parts.push(`\n📢 ${original}`); 
  if (explain)  parts.push(`\n💡${explain}`);  
  if (usage)    parts.push(`\n📘 ${usage}`); 
  if (extended) parts.push(`\n\n✨ ${extended}`);   
  
  const frontText = parts.join('').trim();
  
  const createdTime = raw.back.Createdtime || raw.back.createdtime || null; 

  const id = hashId((frontText || JSON.stringify(raw)) + title + i);
  return { 
    id, 
    title, 
    frontText,  
    backMy, 
    backAI, 
    backExplain,
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
}

/* 快速跳转到某个模块的卡片 */
export function jumpToCard(titleName) { 
  const targettitle = (titleName || '').trim();
  if (!targettitle) {
    idx = 0; // 跳到第一张
  } else {
    const foundIdx = cards.findIndex(c => (c.title || '').trim() === targettitle);
    idx = foundIdx >= 0 ? foundIdx : 0;
  }
  console.log('jumpToCard:', targettitle, 'idx:', idx);
}

export const getTitles = () => Array.from(new Set(cards.map(c => (c.title || '').trim()).filter(Boolean))).sort();


/* 间隔与进度 */
export function completeReview(card) {
  const now = new Date();
}

export function resetProgress(card) { 
}

/* 导航 */
export const toggleBack = () => { showBack = !showBack; };

export function next() { 
  if (cards.length > 0) {
    idx = (idx + 1) % cards.length;
    console.log('next() called, new idx:', idx, 'total:', cards.length);
  }
}

export const prev = () => { 
    if (cards.length > 0) {
        idx = (idx - 1 + cards.length) % cards.length;
        console.log('previous() called, new idx:', idx, 'total:', cards.length);
      }
};

export function shuffle() { 
  cards.sort(() => Math.random() - 0.5); 
  idx = 0; 
}

/* 当前视图数据 */
export function getStatus() { 
  const current = getCurrentCard();
  return { 
    total: cards.length, 
    index: idx, 
    showBack, 
    currenttitle: current ? current.title : '' // 显示当前卡片的模块
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
