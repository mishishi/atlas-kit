/**
 * W (2026-07-01): AI 一句话总结 (AI pitch) for cards.
 *
 * Similar pattern to editorial.ts (M round) — server-only loader
 * that reads a small JSON file. The detail page displays the pitch
 * in a small block above the description; cards without a pitch
 * silently skip the section (calm default).
 *
 * Why a separate file from editorial-notes.json: the two have
 * different rhetorical purposes:
 *   - editorial note = "为什么收录这条" (subjective, hand-voice)
 *   - AI pitch      = "这张卡是什么" (objective, knowledge-card tone)
 * Merging them would force a single voice that doesn't fit either.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

export interface AiPitch {
  pitch: string;
  source: "mmx" | "handwrite";
}

interface AiPitchesData {
  _meta: {
    version: number;
    createdAt: string;
    note: string;
    namingConvention: string;
  };
  [slug: string]: AiPitch | AiPitchesData["_meta"];
}

let _cache: AiPitchesData | null = null;

function loadData(): AiPitchesData {
  if (_cache) return _cache;
  const filePath = path.join(process.cwd(), "data", "ai-pitches.json");
  const raw = readFileSync(filePath, "utf8");
  _cache = JSON.parse(raw) as AiPitchesData;
  return _cache;
}

export function getAiPitch(slug: string): AiPitch | null {
  const data = loadData();
  const entry = data[slug];
  if (!entry) return null;
  if (!("pitch" in entry)) return null;
  return entry as AiPitch;
}

export function getAiPitchCount(): number {
  const data = loadData();
  return Object.keys(data).filter((k) => k !== "_meta").length;
}