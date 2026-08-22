import { useEffect, useState } from "react";

import { getAttachmentSignedUrl } from "@/lib/attachments";
import type { Attachment } from "@/types";

/**
 * Resolves a temporary signed URL for an attachment so private-bucket files
 * can be rendered (e.g. image thumbnails). Pass `null` to skip resolution.
 *
 * @returns `{ url, loading }` where `url` is the accessible URI (or `null`
 * while resolving / on failure).
 */
export function useAttachmentUrl(
  attachment: Attachment | null,
): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(attachment !== null);

  useEffect(() => {
    if (!attachment) return;

    let cancelled = false;
    getAttachmentSignedUrl(attachment)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch((err) => {
        console.warn("[attachments] Failed to resolve URL:", err);
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attachment]);

  return { url, loading };
}