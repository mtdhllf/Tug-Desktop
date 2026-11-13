export const SUPPORTED_LOCALES = [
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-TW", name: "繁體中文" },
  { code: "en-US", name: "English" },
  { code: "ko-KR", name: "한국어" },
  { code: "ja-JP", name: "日本語" },
] as const;
export type Locale = typeof SUPPORTED_LOCALES[number]["code"];
export const LOCALE_STORAGE_KEY = "tug.locale";

export function normalizeLocale(value: unknown): Locale | undefined {
  if (typeof value !== "string") return undefined;
  const tag = value.toLowerCase().replace(/_/g, "-");
  if (tag === "zh" || tag.startsWith("zh-")) {
    if (/(?:^|-)hant(?:-|$)/.test(tag)) return "zh-TW";
    if (/(?:^|-)hans(?:-|$)/.test(tag)) return "zh-CN";
    return /(?:^|-)(?:tw|hk|mo)(?:-|$)/.test(tag) ? "zh-TW" : "zh-CN";
  }
  for (const [language, code] of [["en", "en-US"], ["ja", "ja-JP"], ["ko", "ko-KR"]] as const) {
    if (tag === language || tag.startsWith(language + "-")) return code;
  }
  return undefined;
}

export function detectLocale(
  storage: Pick<Storage, "getItem"> | null,
  system: { languages?: readonly string[]; language?: string },
): Locale {
  try {
    const manual = normalizeLocale(storage?.getItem(LOCALE_STORAGE_KEY));
    if (manual) return manual;
  } catch { /* Storage restrictions must not bypass system matching. */ }
  for (const tag of [...(system.languages ?? []), system.language ?? ""]) {
    const match = normalizeLocale(tag);
    if (match) return match;
  }
  return "en-US";
}
