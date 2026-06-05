// Server-side allowlists for user-uploaded files. Enforces MIME type and size
// limits to prevent stored XSS / phishing via the public promotion-files bucket.

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_POST_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
] as const;

// 15 MB cap for images, generous enough for high-res visuals.
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function assertAllowedMime(
  mime: string,
  allowed: readonly string[],
): void {
  const normalized = mime.trim().toLowerCase();
  if (!allowed.includes(normalized)) {
    throw new Error("Type de fichier non autorisé.");
  }
}

export function assertBase64SizeWithin(
  base64: string,
  maxBytes: number,
): number {
  // 4 base64 chars = 3 bytes; subtract padding.
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const size = Math.floor((base64.length * 3) / 4) - padding;
  if (size > maxBytes) {
    throw new Error("Le fichier dépasse la taille maximale autorisée.");
  }
  return size;
}
