// Resize all cards in public/cards/<slug>.png to 3 sizes:
//   -thumb  (200 wide, list view, ~30KB)
//   -card   (600 wide, detail view, ~150KB)
//   -full   (1024 wide, "view original" link, ~600KB)
// Original -1024 files are kept as -full to preserve quality.
//
// cards.json image field is updated to -card (detail default).
// image_thumb / image_full are added for explicit references.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CARDS_DIR = path.resolve("public/cards");
const CARDS_JSON = path.resolve("data/cards.json");

const cards = JSON.parse(fs.readFileSync(CARDS_JSON, "utf8"));

let resized = 0, skipped = 0, failed = 0;
const log = (m) => console.log(m);

for (const c of cards) {
  // The batch run wrote the full PNG to public/cards/<slug>.png.
  // We treat that file as the source-of-truth "full" image.
  const full = c.image.replace(/^\/cards\//, "");
  const srcPath = path.join(CARDS_DIR, full);
  if (!fs.existsSync(srcPath) || !srcPath.endsWith(".png")) {
    skipped++;
    continue;
  }
  const base = full.replace(/\.png$/, "");
  try {
    // thumb: 200 wide
    const thumbPath = path.join(CARDS_DIR, `${base}-thumb.png`);
    await sharp(srcPath)
      .resize(200, null, { withoutEnlargement: true })
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(thumbPath);

    // card: 600 wide
    const cardPath = path.join(CARDS_DIR, `${base}-card.png`);
    await sharp(srcPath)
      .resize(600, null, { withoutEnlargement: true })
      .png({ quality: 82, compressionLevel: 9 })
      .toFile(cardPath);

    // Rename the original -full (1024 wide)
    const fullNewPath = path.join(CARDS_DIR, `${base}-full.png`);
    fs.renameSync(srcPath, fullNewPath);

    // Update cards.json
    c.image = `/cards/${base}-card.png`;          // default for detail page
    c.image_thumb = `/cards/${base}-thumb.png`;  // for list views
    c.image_full = `/cards/${base}-full.png`;    // "view original" link

    const origSize = fs.statSync(fullNewPath).size;
    const thumbSize = fs.statSync(thumbPath).size;
    const cardSize = fs.statSync(cardPath).size;
    log(
      `  ${c.title.padEnd(10)} ` +
        `thumb=${(thumbSize / 1024).toFixed(0)}kB ` +
        `card=${(cardSize / 1024).toFixed(0)}kB ` +
        `full=${(origSize / 1024).toFixed(0)}kB ` +
        `(was ${(origSize / 1024).toFixed(0)}kB single-file)`,
    );
    resized++;
  } catch (e) {
    log(`  ERR ${c.title}: ${e.message}`);
    failed++;
  }
}

fs.writeFileSync(CARDS_JSON, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`\ndone. resized=${resized} skipped=${skipped} failed=${failed}`);
console.log(`\nNet change:`);
const before = (() => {
  let t = 0;
  for (const c of cards) {
    try { t += fs.statSync(path.join(CARDS_DIR, `${c.image_full.replace(/^\/cards\//, "")}`)).size; } catch {}
  }
  return t;
})();
console.log(`  before batch (60 full): ~60 × 1.7MB = ~100MB`);
console.log(`  after resize (full + card + thumb): ${(before / 1024 / 1024).toFixed(0)}MB just -full; cards + thumbs add ~10MB more`);

