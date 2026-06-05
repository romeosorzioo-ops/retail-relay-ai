export type PostFormatKey =
  | "ig_square"
  | "ig_portrait"
  | "story"
  | "fb_landscape"
  | "fb_square"
  | "li_landscape";

export type PostFormat = {
  key: PostFormatKey;
  label: string;
  short: string;
  w: number;
  h: number;
  previewW: number;
  aspect: string; // e.g. "1/1"
  platform: "instagram" | "facebook" | "linkedin" | "multi";
};

export const POST_FORMATS: Record<PostFormatKey, PostFormat> = {
  ig_square:    { key: "ig_square",    label: "Instagram carré 1:1 — 1080×1080",         short: "IG 1:1",   w: 1080, h: 1080, previewW: 420, aspect: "1/1",       platform: "instagram" },
  ig_portrait:  { key: "ig_portrait",  label: "Instagram portrait 4:5 — 1080×1350",      short: "IG 4:5",   w: 1080, h: 1350, previewW: 380, aspect: "4/5",       platform: "instagram" },
  story:        { key: "story",        label: "Story / Reel 9:16 — 1080×1920",           short: "9:16",     w: 1080, h: 1920, previewW: 260, aspect: "9/16",      platform: "multi" },
  fb_landscape: { key: "fb_landscape", label: "Facebook paysage 1.91:1 — 1200×630",      short: "FB 1.91:1",w: 1200, h: 630,  previewW: 480, aspect: "1200/630",  platform: "facebook" },
  fb_square:    { key: "fb_square",    label: "Facebook carré 1:1 — 1080×1080",          short: "FB 1:1",   w: 1080, h: 1080, previewW: 420, aspect: "1/1",       platform: "facebook" },
  li_landscape: { key: "li_landscape", label: "LinkedIn paysage 16:9 — 1920×1080",       short: "LI 16:9",  w: 1920, h: 1080, previewW: 520, aspect: "16/9",      platform: "linkedin" },
};

export const POST_FORMAT_LIST: PostFormat[] = Object.values(POST_FORMATS);

export function getPostFormat(key: string | null | undefined): PostFormat {
  if (key && key in POST_FORMATS) return POST_FORMATS[key as PostFormatKey];
  return POST_FORMATS.ig_square;
}

export function formatShortLabel(key: string | null | undefined): string {
  return getPostFormat(key).short;
}
