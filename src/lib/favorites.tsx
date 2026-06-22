"use client";

/**
 * R52 (2026-06-22): 收藏夹 / favorites
 *
 * localStorage-backed slug Set, with cross-tab + cross-component sync.
 *
 * Storage shape:
 *   localStorage["atlas-kit-favorites"] = JSON.stringify(string[])
 *
 * Sync strategy:
 *   - Cross-tab: native `storage` event (fires on OTHER tabs/windows only,
 *     not the one that wrote the value — by spec).
 *   - Same-tab: custom `favorites-changed` event (the `storage` event does
 *     not fire in the writing tab).
 *
 * SSR-safe:
 *   - `useFavorites()` initialises with `[]` on first render (server +
 *     client agree), then `useEffect` reads localStorage and re-renders.
 *   - Components reading favorites must handle the "not yet hydrated"
 *     state (typically by rendering the same thing for empty Set and
 *     unhydrated Set — no flash because both are empty).
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "atlas-kit-favorites";

/** Custom event for same-tab cross-component sync. */
const CHANGED_EVENT = "atlas-kit-favorites-changed";

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    // QuotaExceededError / SecurityError / JSON.parse error — fail safe
    return [];
  }
}

function writeStorage(next: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or storage disabled — silently drop. User will
    // see the star not persist, but no app crash.
  }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: next }));
}

export function isFavoriteSlug(slug: string): boolean {
  return readStorage().includes(slug);
}

export function getFavoriteSlugs(): string[] {
  return readStorage();
}

export interface FavoritesAPI {
  /** Hydrated Set of favorited slugs. Empty before hydration. */
  favorites: Set<string>;
  /** Whether localStorage has been read yet (false on SSR / first paint). */
  hydrated: boolean;
  /** Add a slug. No-op if already favorited. */
  add: (slug: string) => void;
  /** Remove a slug. No-op if not favorited. */
  remove: (slug: string) => void;
  /** Toggle. Returns the new state (true = favorited). */
  toggle: (slug: string) => boolean;
  /** Clear all favorites. */
  clear: () => void;
  /** Total favorited count. */
  count: number;
}

/**
 * React hook — subscribe to the favorites Set, with cross-tab + cross-
 * component sync. SSR-safe (initial render returns empty Set).
 */
export function useFavorites(): FavoritesAPI {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  // Initial read + sync listeners
  useEffect(() => {
    setFavorites(new Set(readStorage()));
    setHydrated(true);

    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setFavorites(new Set(readStorage()));
    }
    function onChanged(e: Event) {
      const detail = (e as CustomEvent<string[]>).detail;
      setFavorites(new Set(Array.isArray(detail) ? detail : readStorage()));
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGED_EVENT, onChanged);
    };
  }, []);

  const add = useCallback((slug: string) => {
    const cur = readStorage();
    if (cur.includes(slug)) return;
    const next = [...cur, slug];
    writeStorage(next);
    setFavorites(new Set(next));
  }, []);

  const remove = useCallback((slug: string) => {
    const cur = readStorage();
    if (!cur.includes(slug)) return;
    const next = cur.filter((s) => s !== slug);
    writeStorage(next);
    setFavorites(new Set(next));
  }, []);

  const toggle = useCallback((slug: string): boolean => {
    const cur = readStorage();
    if (cur.includes(slug)) {
      const next = cur.filter((s) => s !== slug);
      writeStorage(next);
      setFavorites(new Set(next));
      return false;
    }
    const next = [...cur, slug];
    writeStorage(next);
    setFavorites(new Set(next));
    return true;
  }, []);

  const clear = useCallback(() => {
    writeStorage([]);
    setFavorites(new Set());
  }, []);

  return {
    favorites,
    hydrated,
    add,
    remove,
    toggle,
    clear,
    count: favorites.size,
  };
}