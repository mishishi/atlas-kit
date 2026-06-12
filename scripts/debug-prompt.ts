// Quick debug: dump the prompt that buildPrompt would send for 杭州 + city
// Run: node --import tsx scripts/debug-prompt.ts   (or via tsx)
import { buildPrompt } from "../src/lib/prompt-templates";
import { THEME_TYPE_MAP } from "../src/lib/theme-types";

const cases: { topic: string; kind: Parameters<typeof buildPrompt>[0]["kind"] }[] = [
  { topic: "杭州", kind: "city" },
  { topic: "中秋节", kind: "festival" },
  { topic: "小笼包", kind: "food" },
  { topic: "赤壁之战", kind: "history" },
  { topic: "区块链", kind: "tech" },
  { topic: "金毛寻回犬", kind: "pet" },
];

for (const c of cases) {
  const t = THEME_TYPE_MAP[c.kind];
  console.log("========================================");
  console.log("topic:", c.topic, "| kind:", c.kind);
  console.log("→ promptType:", t?.promptType, "| series:", t?.series);
  console.log("========================================");
  console.log(buildPrompt({ topic: c.topic, kind: c.kind, palette: "auto" }));
  console.log("");
}
