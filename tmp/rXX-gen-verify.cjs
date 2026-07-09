#!/usr/bin/env node
/**
 * tmp/rXX-gen-verify.cjs - 串行 generate + auto-verify + auto-retry 合并工具
 *
 * 流程 (跟 R72/R73/R74 模式一致):
 *   1. 读 scripts/rXX-plan.json
 *   2. 对每张 card 串行 spawn generate-card.mjs (execFileSync, 600s timeout)
 *   3. run-all 后立刻 verify (3-tier file check)
 *   4. 失败的卡 auto-retry 单条 (最多 2 retries)
 *   5. 再次 verify
 *   6. 输出结果 log
 *
 * 用法:
 *   node tmp/rXX-gen-verify.cjs <round>   # round = R75 / R76 / ...
 *   node tmp/rXX-gen-verify.cjs R75
 *
 * Exit code: 0 = all OK, 1 = some cards still missing.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const round = process.argv[2];
if (!round) {
  console.error("Usage: node tmp/rXX-gen-verify.cjs <round>");
  console.error("Example: node tmp/rXX-gen-verify.cjs R75");
  process.exit(1);
}

const planPath = `scripts/${round.toLowerCase()}-plan.json`;
if (!fs.existsSync(planPath)) {
  console.error(`Plan file not found: ${planPath}`);
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const cards = JSON.parse(fs.readFileSync('data/cards.json', 'utf8'));

// Helper: verify single card 3-tier files exist + size > 0
function verifyCardFiles(card) {
  const dir = path.join('public', 'cards', card.kind, card.slug);
  const missing = [];
  for (const suffix of ['-card.png', '-thumb.webp', '-full.webp']) {
    const file = path.join(dir, `${card.slug}${suffix}`);
    try {
      const stat = fs.statSync(file);
      if (stat.size === 0) missing.push(file);
    } catch {
      missing.push(file);
    }
  }
  return missing;
}

// Step 1: 跳过已存在的卡 (允许分批跑)
const remaining = plan.plan.filter(p => !cards.find(x => x.slug === p.slug));
console.log(`Will generate ${remaining.length} cards sequential (${round} auto-verify+retry enabled)`);
console.log(`Plan total: ${plan.plan.length}, existing: ${plan.plan.length - remaining.length}`);

// Step 2: 串行 first-attempt generate
const log = [];
const cardsNeedingRetry = [];

for (let i = 0; i < remaining.length; i++) {
  const card = remaining[i];
  const t0 = Date.now();
  try {
    const out = execFileSync('node', [
      'scripts/generate-card.mjs',
      '--topic', card.title,
      '--kind', card.kind,
      '--subKind', card.subKind,
      '--slug', card.slug,
      '--series', card.series,
      '--seriesNo', card.seriesNo,
      '--resolution', '1K'
    ], { encoding: 'utf8', timeout: 600000, stdio: ['ignore', 'pipe', 'pipe'] });
    const dt = Date.now() - t0;

    // Step 3: auto-verify file (不依赖 cards.json entry 在不在)
    const missing = verifyCardFiles({ kind: card.kind, slug: card.slug });
    if (missing.length > 0) {
      log.push(`[${i+1}/${remaining.length}] ${card.slug}: first-attempt OK ${dt}ms but ${missing.length} files MISSING → retry queue`);
      console.log(`[${i+1}/${remaining.length}] ${card.slug} generate ok ${dt}ms but files missing: ${missing.join(', ')}`);
      cardsNeedingRetry.push({ card, attemptsLeft: 2 });
    } else {
      log.push(`[${i+1}/${remaining.length}] ${card.slug}: ok ${dt}ms (verified)`);
      console.log(`[${i+1}/${remaining.length}] ${card.slug} OK ${dt}ms (verified)`);
    }
  } catch (e) {
    const dt = Date.now() - t0;
    log.push(`[${i+1}/${remaining.length}] ${card.slug}: EXCEPTION ${dt}ms - ${e.message?.slice(0, 100)}`);
    console.log(`[${i+1}/${remaining.length}] ${card.slug} EXCEPTION ${dt}ms`);
    cardsNeedingRetry.push({ card, attemptsLeft: 2 });
  }
}

// Step 4: auto-retry failed cards (最多 2 attempts each)
let retryRound = 1;
while (cardsNeedingRetry.length > 0) {
  console.log(`\n=== Retry round ${retryRound}: ${cardsNeedingRetry.length} cards ===`);
  const stillFailing = [];
  for (const { card, attemptsLeft } of cardsNeedingRetry) {
    const t0 = Date.now();
    try {
      const out = execFileSync('node', [
        'scripts/generate-card.mjs',
        '--topic', card.title,
        '--kind', card.kind,
        '--subKind', card.subKind,
        '--slug', card.slug,
        '--series', card.series,
        '--seriesNo', card.seriesNo,
        '--resolution', '1K'
      ], { encoding: 'utf8', timeout: 600000, stdio: ['ignore', 'pipe', 'pipe'] });
      const dt = Date.now() - t0;
      const missing = verifyCardFiles({ kind: card.kind, slug: card.slug });
      if (missing.length > 0) {
        if (attemptsLeft > 1) {
          stillFailing.push({ card, attemptsLeft: attemptsLeft - 1 });
          log.push(`  retry-${retryRound} ${card.slug}: still missing files → next retry`);
          console.log(`  retry-${retryRound} ${card.slug} STILL MISSING ${dt}ms → next retry`);
        } else {
          log.push(`  retry-${retryRound} ${card.slug}: GIVE UP (max retries exhausted)`);
          console.log(`  retry-${retryRound} ${card.slug} GIVE UP ${dt}ms`);
        }
      } else {
        log.push(`  retry-${retryRound} ${card.slug}: ok ${dt}ms (verified on retry)`);
        console.log(`  retry-${retryRound} ${card.slug} OK ${dt}ms (verified on retry)`);
      }
    } catch (e) {
      const dt = Date.now() - t0;
      if (attemptsLeft > 1) {
        stillFailing.push({ card, attemptsLeft: attemptsLeft - 1 });
        log.push(`  retry-${retryRound} ${card.slug}: EXCEPTION ${dt}ms → next retry`);
        console.log(`  retry-${retryRound} ${card.slug} EXCEPTION ${dt}ms → next retry`);
      } else {
        log.push(`  retry-${retryRound} ${card.slug}: GIVE UP - ${e.message?.slice(0, 100)}`);
        console.log(`  retry-${retryRound} ${card.slug} GIVE UP ${dt}ms`);
      }
    }
  }
  cardsNeedingRetry.length = 0;
  cardsNeedingRetry.push(...stillFailing);
  retryRound++;
  if (retryRound > 5) break;  // safety: max 5 retry rounds
}

// Step 5: final log write
const logFile = `tmp/${round.toLowerCase()}-gen-results.txt`;
fs.writeFileSync(logFile, log.join('\n') + '\n', 'utf8');
console.log(`\n=== Final ===`);
const ok = log.filter(l => l.includes('(verified)')).length;
const retries = log.filter(l => l.includes('retry')).length;
const giveups = log.filter(l => l.includes('GIVE UP')).length;
console.log(`OK: ${ok}, Retries: ${retries}, Give-ups: ${giveups}`);
console.log(`Log written: ${logFile}`);

process.exit(giveups > 0 ? 1 : 0);