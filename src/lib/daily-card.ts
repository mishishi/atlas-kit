import type { Card } from "./types";

/**
 * R60.2 (2026-06-29): 提取 pickDailyCard 到独立文件,让 client
 * component (TodayFab) 可以复用 (FAB 是 'use client', 不能再
 * 用 taxonomy.ts 那条 path 读 fs). Server-side call picks the
 * card, passes slug to <TodayFab card={...}>.
 */
export function pickDailyCard(cards: Card[], now: Date = new Date()): Card {
  const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  // mulberry32 seeded by hash of dateKey
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h = (h ^ dateKey.charCodeAt(i)) * 16777619;
    h = h >>> 0;
  }
  let s = h >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Prefer higher score (7+) but mix in lower scores so variety accumulates
  const high = cards.filter((c) => c.score >= 7);
  const pool = high.length >= 30 ? high : cards;
  return pool[Math.floor(rand() * pool.length)];
}