// Round 31: server-only helper to read the actual pixel dimensions of a
// card's full.webp file. Used by the detail page's "查看原图 (W×H)" label
// so the dimension is honest (179 cards are 768×1376 from the 1K batch,
// 61 are 1024×1835 from the 2K batch — previously hardcoded to "1024×1835").
//
// Lives in a dedicated server-only file (NOT in data.ts) because:
// - `data.ts` is imported by client components (mention index, search, etc.)
// - sharp + node:fs pull in `child_process` / `node:fs` modules that webpack
//   can't bundle for the browser
// - This file uses `import "server-only"` so any accidental client-side
//   import fails fast at build time, instead of breaking production at runtime

import "server-only";

import { getCardBySlug } from "../data";

const _dimsCache = new Map<string, string | null>();

/** "1024×1835" or "768×1376" — actual pixel dimensions of the
 *  card's full.webp, or null if unreadable. Cached per build. */
export async function getCardFullDims(slug: string): Promise<string | null> {
  if (_dimsCache.has(slug)) return _dimsCache.get(slug)!;
  const card = getCardBySlug(slug);
  if (!card?.image_full) {
    _dimsCache.set(slug, null);
    return null;
  }
  try {
    // sharp is Node-only. Importing it dynamically at call time is
    // enough to keep webpack out of the client bundle (this file is
    // only ever imported by server components).
    const [{ default: sharp }, fs, path] = await Promise.all([
      import("sharp"),
      import("fs"),
      import("path"),
    ]);
    const filePath = path.join(process.cwd(), "public", card.image_full);
    if (!fs.existsSync(filePath)) {
      _dimsCache.set(slug, null);
      return null;
    }
    const meta = await sharp(filePath).metadata();
    const dims = meta.width && meta.height ? `${meta.width}×${meta.height}` : null;
    _dimsCache.set(slug, dims);
    return dims;
  } catch {
    _dimsCache.set(slug, null);
    return null;
  }
}