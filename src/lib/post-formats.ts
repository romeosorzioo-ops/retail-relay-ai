export type PostFormatKey = "ig_square" | "ig_portrait" | "story";

export type PostFormat = {
  key: PostFormatKey;
  label: string;
  short: string;
  w: number;
  h: number;
  previewW: number;
  aspect: string;
};

export const DEFAULT_POST_FORMAT: PostFormatKey = "ig_portrait";

export const POST_FORMATS: Record<PostFormatKey, PostFormat> = {
  ig_square:   { key: "ig_square",   label: "Post carré 1:1 — 1080×1080",    short: "Carré 1:1",    w: 1080, h: 1080, previewW: 420, aspect: "1/1"  },
  ig_portrait: { key: "ig_portrait", label: "Post portrait 4:5 — 1080×1350", short: "Portrait 4:5", w: 1080, h: 1350, previewW: 380, aspect: "4/5"  },
  story:       { key: "story",       label: "Story 9:16 — 1080×1920",        short: "Story 9:16",   w: 1080, h: 1920, previewW: 260, aspect: "9/16" },
};

export const POST_FORMAT_LIST: PostFormat[] = Object.values(POST_FORMATS);

export function getPostFormat(key: string | null | undefined): PostFormat {
  if (key && key in POST_FORMATS) return POST_FORMATS[key as PostFormatKey];
  return POST_FORMATS[DEFAULT_POST_FORMAT];
}

export function formatShortLabel(key: string | null | undefined): string {
  return getPostFormat(key).short;
}
