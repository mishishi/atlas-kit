/**
 * M (2026-06-30): editorial "为什么收录这条" notes.
 *
 * A hand-curated JSON file (data/editorial-notes.json) maps slug →
 * { why, vibe? }. The detail page reads this and shows a 1-2 sentence
 * editor voice paragraph below the description. Not every card has
 * a note — only 30/600 do, the ones the editor has a real personal
 * connection to (so it doesn't read as a templated apology).
 *
 * Implementation note: we read the JSON via fs.readFileSync (server-only)
 * because tsconfig paths alias `@/*` only resolves to .ts files, not
 * .json (Next.js webpack config doesn't include the resolveJsonModule
 * flag for the @/data/ namespace). data/cards.json is also read via
 * fs.readFileSync in src/lib/data.ts for the same reason.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

export interface EditorialNote {
  why: string;
  vibe?: string;
}

interface EditorialData {
  _meta: {
    version: number;
    createdAt: string;
    note: string;
    namingConvention: string;
  };
  [slug: string]: EditorialNote | EditorialData["_meta"];
}

let _cache: EditorialData | null = null;

function loadData(): EditorialData {
  if (_cache) return _cache;
  const filePath = path.join(process.cwd(), "data", "editorial-notes.json");
  const raw = readFileSync(filePath, "utf8");
  _cache = JSON.parse(raw) as EditorialData;
  return _cache;
}

export function getEditorialNote(slug: string): EditorialNote | null {
  const data = loadData();
  const entry = data[slug];
  if (!entry) return null;
  // Skip _meta key — it has a different shape (no `why` field)
  if (!("why" in entry)) return null;
  return entry as EditorialNote;
}

export function getEditorialCount(): number {
  const data = loadData();
  return Object.keys(data).filter((k) => k !== "_meta").length;
}