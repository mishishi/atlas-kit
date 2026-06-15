#!/usr/bin/env node
// Add lat/lng to geographic cards for the /map view (issue 3/6).
// Hand-picked coordinates from Wikipedia/Google Maps consensus.
// Aurora is intentionally left out — it's a global phenomenon,
// not a single lat/lng.
import fs from "node:fs";
import path from "node:path";

const cardsPath = path.resolve("data/cards.json");
const cards = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

const COORDS = {
  "shanghai":         { lat: 31.2304, lng: 121.4737 },
  "hangzhou":         { lat: 30.2741, lng: 120.1551 },
  "suzhou":           { lat: 31.2989, lng: 120.5853 },
  "xian":             { lat: 34.3416, lng: 108.9398 },
  "beijing":          { lat: 39.9042, lng: 116.4074 },
  "longjing-tea":     { lat: 30.2459, lng: 120.0897 },
  "forbidden-city":   { lat: 39.9163, lng: 116.3972 },
  "mogao-caves":      { lat: 40.0089, lng: 94.6619 },
  "suzhou-gardens":   { lat: 31.3256, lng: 120.6172 },
  "sanxingdui":       { lat: 30.9986, lng: 104.2197 },
  "qiantang-tide":    { lat: 30.2549, lng: 121.0825 },
  "plum-rain":        { lat: 30.5928, lng: 114.3055 },
};

let updated = 0;
for (const c of cards) {
  if (COORDS[c.slug]) {
    c.coords = COORDS[c.slug];
    updated++;
  }
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`Added coords to ${updated}/60 cards.`);
console.log(`Cards still without coords: ${cards.filter((c) => !c.coords).length}/60.`);
