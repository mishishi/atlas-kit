/**
 * R58 (2026-06-26): taxonomy loader for the 3-level classification:
 *   kind (L1, ~25 values) → subKind (L2, ~138 values) → series (L3, 10 editorial groups)
 *
 * Source of truth: data/taxonomy.json (hand-edited, 25 × 138 mappings)
 * Validated at build time: assertValidSubKind() in the backfill script +
 * (future) at request time. UI should always resolve label through
 * getSubKindLabel() rather than hard-coding Chinese strings.
 *
 * Why a separate file (not inlined into types.ts):
 * - Taxonomy.json is a data file the user can edit in 5 seconds without
 *   TS recompile. Useful for iterating subKind splits during launch.
 * - Keeps types.ts focused on the Card schema, not the taxonomy mapping.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { CardKind } from "./types";

export interface SubKindDef {
  slug: string;
  label: string;
  /** 期望张数 — backfill script 对账用, 不参与运行时校验 */
  expected: number;
}

export interface KindTaxonomy {
  label: string;
  subKinds: SubKindDef[];
}

/** Type for the full taxonomy.json. Keys are kind slugs. */
export type Taxonomy = Record<CardKind, KindTaxonomy>;

let _taxonomy: Taxonomy | null = null;

/**
 * Load + cache taxonomy.json. Caller can pass an override path for tests
 * or for an upcoming hot-reload feature; defaults to repo root.
 */
export function loadTaxonomy(pathOverride?: string): Taxonomy {
  if (_taxonomy && !pathOverride) return _taxonomy;
  const p = pathOverride || path.join(process.cwd(), "data", "taxonomy.json");
  const raw = JSON.parse(readFileSync(p, "utf8"));
  // Drop the _meta wrapper, return the kinds map only.
  _taxonomy = raw.kinds as Taxonomy;
  return _taxonomy;
}

/** Look up the Chinese display label for a subKind. Returns null if invalid. */
export function getSubKindLabel(
  kind: CardKind,
  subKind: string | undefined,
  taxonomy: Taxonomy = loadTaxonomy(),
): string | null {
  if (!subKind) return null;
  const k = taxonomy[kind];
  if (!k) return null;
  const sk = k.subKinds.find((s) => s.slug === subKind);
  return sk ? sk.label : null;
}

/**
 * Type guard: validate that a subKind slug is in the taxonomy for the
 * given kind. Throws on invalid. Use in backfill script + future API
 * endpoints that write to cards.json.
 */
export function assertValidSubKind(
  kind: CardKind,
  subKind: string,
  taxonomy: Taxonomy = loadTaxonomy(),
): void {
  const k = taxonomy[kind];
  if (!k) {
    throw new Error(`assertValidSubKind: unknown kind "${kind}"`);
  }
  if (!k.subKinds.some((s) => s.slug === subKind)) {
    const known = k.subKinds.map((s) => s.slug).join(", ");
    throw new Error(
      `assertValidSubKind: "${subKind}" is not a valid subKind for kind "${kind}". Known: ${known}`,
    );
  }
}

/** Return all valid subKind slugs for a kind. UI uses for filter chips. */
export function getSubKindsForKind(
  kind: CardKind,
  taxonomy: Taxonomy = loadTaxonomy(),
): SubKindDef[] {
  return taxonomy[kind]?.subKinds ?? [];
}

/** Return all (kind, subKind) pairs. Useful for the migration preview. */
export function getAllSubKindPairs(
  taxonomy: Taxonomy = loadTaxonomy(),
): Array<{ kind: CardKind; subKind: string; label: string; expected: number }> {
  const out: Array<{ kind: CardKind; subKind: string; label: string; expected: number }> = [];
  for (const [kind, def] of Object.entries(taxonomy) as Array<[CardKind, KindTaxonomy]>) {
    for (const sk of def.subKinds) {
      out.push({ kind, subKind: sk.slug, label: sk.label, expected: sk.expected });
    }
  }
  return out;
}