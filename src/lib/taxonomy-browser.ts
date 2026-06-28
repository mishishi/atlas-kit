/**
 * R60 (2026-06-28): browser-safe taxonomy loader.
 *
 * Why this lives in a separate file (not taxonomy.ts):
 *   - taxonomy.ts uses node:fs to read taxonomy.json at runtime, can't
 *     be imported into client components ("use client").
 *   - JSON imports via webpack are tree-shakeable + bundle at build time,
 *     so client code doesn't pay the IO cost either way.
 *   - If taxonomy.json adds a new subKind, both server (taxonomy.ts)
 *     AND client (taxonomy-browser.ts) see it on next build.
 *
 * If you add a new function to taxonomy.ts, mirror it here.
 *
 * Source of truth: data/taxonomy.json (mirror of taxonomy.ts's source).
 */

import data from "../../data/taxonomy.json";
import type { CardKind } from "./types";

export interface SubKindDef {
  slug: string;
  label: string;
  expected: number;
}

export interface KindTaxonomy {
  label: string;
  subKinds: SubKindDef[];
}

export type Taxonomy = Record<CardKind, KindTaxonomy>;

// Static import — bundled at build time. taxonomy.json is ~15KB.
const _taxonomy: Taxonomy = data.kinds as Taxonomy;

/** Look up the Chinese display label for a subKind. Returns null if invalid. */
export function getSubKindLabel(
  kind: CardKind,
  subKind: string | undefined,
): string | null {
  if (!subKind) return null;
  const k = _taxonomy[kind];
  if (!k) return null;
  const sk = k.subKinds.find((s) => s.slug === subKind);
  return sk ? sk.label : null;
}

/** Return all valid subKind slugs for a kind. UI uses for filter chips. */
export function getSubKindsForKind(kind: CardKind): SubKindDef[] {
  return _taxonomy[kind]?.subKinds ?? [];
}