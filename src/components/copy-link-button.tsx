"use client";

/**
 * L (2026-06-30): CopyLinkButton for /changelog RSS link.
 *
 * Lives in its own file because it uses useState/useEffect, which
 * require this module to be a Client Component. The /changelog
 * page itself is a Server Component and can import this client
 * island without flipping the whole page to client.
 *
 * Behavior: copies `${origin}/feed.xml` to the clipboard on click.
 * Shows "已复制" + Check icon for 2s after success. If the
 * clipboard API rejects (insecure context, no permission), the
 * button silently no-ops — the user can still long-press the
 * adjacent RSS link to copy manually.
 */

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function onCopy() {
    const url = `${origin || ""}/feed.xml`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API rejected (insecure context, no permission) —
      // do nothing; the RSS link still works for manual copy.
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground hover:border-gold hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          已复制
        </>
      ) : (
        <>复制 RSS 链接</>
      )}
    </button>
  );
}