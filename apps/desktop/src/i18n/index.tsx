import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { enUS } from "./en-US";
import { zhCN, type MessageKey } from "./zh-CN";

/**
 * 语言注册表。新增语言时：
 * 1. 新建对应字典并按 `MessageKey` 补全；
 * 2. 在这里注册；
 * 3. 在设置页暴露切换入口。
 */
const dictionaries = {
  "zh-CN": zhCN,
  "en-US": enUS,
} as const satisfies Record<string, Record<MessageKey, string>>;

export type Locale = keyof typeof dictionaries;

const LOCALE_STORAGE_KEY = "tug.locale";

function readInitialLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === "zh-CN" || saved === "en-US") return saved;
    if (navigator.language.toLowerCase().startsWith("en")) return "en-US";
  } catch {
    // localStorage 在受限环境下可能不可用，回退到中文。
  }
  return "zh-CN";
}

type Vars = Record<string, string | number>;

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  pick: (zh: string, en: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const dictionary: Record<MessageKey, string> = dictionaries[locale];

    return {
      locale,
      setLocale,
      t: (key, vars) => {
        let text = dictionary[key] ?? key;
        if (vars) {
          for (const [name, value] of Object.entries(vars)) {
            text = text.split(`{${name}}`).join(String(value));
          }
        }
        return text;
      },
      pick: (zh, en) => (locale === "en-US" ? en : zh),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n 必须在 <I18nProvider> 内使用");
  }
  return context;
}
