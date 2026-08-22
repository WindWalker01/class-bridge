import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { supabase } from "@/lib/supabase";
import type { Attachment } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUCKET = "class-attachments";

/** Signed URLs are valid for one hour — plenty for viewing/downloading. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// ---------------------------------------------------------------------------
// Storage path helpers
// ---------------------------------------------------------------------------

/**
 * Derives the storage object path (`${classId}/${postId}/${fileName}`) from
 * the stored `file_url`.
 *
 * The app currently persists `getPublicUrl()` output even though the bucket is
 * private, so the path is recoverable by parsing the URL:
 *   `<supabase>/storage/v1/object/public/class-attachments/<path>`
 * This keeps existing rows working without a schema migration.
 *
 * @returns The storage path, or `null` when it cannot be determined.
 */
export function getAttachmentStoragePath(attachment: Attachment): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = attachment.file_url.indexOf(marker);
  if (idx === -1) return null;
  const raw = attachment.file_url.slice(idx + marker.length);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Returns a temporary, access-controlled URL that any class member can fetch,
 * regardless of whether the underlying bucket is public or private.
 *
 * Falls back to the stored `file_url` when signing fails or the storage path
 * cannot be recovered (e.g. legacy rows).
 */
export async function getAttachmentSignedUrl(
  attachment: Attachment,
): Promise<string> {
  const path = getAttachmentStoragePath(attachment);
  if (!path) return attachment.file_url;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn(
      "[attachments] Failed to create signed URL:",
      error?.message ?? "no data",
    );
    return attachment.file_url;
  }
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Open / download via system share sheet
// ---------------------------------------------------------------------------

/** Keeps letters, numbers, dash, underscore, dot and spaces; else underscore. */
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, "_") || "attachment";
}

/**
 * Downloads the attachment into the cache directory using a short-lived signed
 * URL and opens the OS share sheet, letting the user preview it, save it to
 * Files / Drive, or pass it to another app.
 */
export async function openAttachment(attachment: Attachment): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      "Sharing is not available on this device. Attachments need a native device.",
    );
  }

  const url = await getAttachmentSignedUrl(attachment);
  const file = new File(Paths.cache, sanitizeFileName(attachment.file_name));
  if (file.exists) {
    file.delete();
  }

  await File.downloadFileAsync(url, file);

  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: attachment.file_type || "application/octet-stream",
      dialogTitle: attachment.file_name,
    });
  } finally {
    try {
      file.delete();
    } catch {
      // Ignore cleanup failures.
    }
  }
}