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

import { zhTW } from "./zh-TW";
import { jaJP } from "./ja-JP";
import { koKR } from "./ko-KR";
import { detectLocale, LOCALE_STORAGE_KEY, type Locale } from "./locales";
import { invoke } from "@tauri-apps/api/core";
export { SUPPORTED_LOCALES } from "./locales";
export type { Locale } from "./locales";
const dictionaries = { "zh-CN": zhCN, "zh-TW": zhTW, "en-US": enUS, "ja-JP": jaJP, "ko-KR": koKR } satisfies Record<Locale, Record<MessageKey,string>>;
function readInitialLocale(): Locale {
  let storage: Storage | null = null;
  try { storage = window.localStorage; } catch { /* Use system language. */ }
  return detectLocale(storage, navigator);
}

type Vars = Record<string, string | number>;

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    if (!Object.prototype.hasOwnProperty.call(dictionaries, next)) return;
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    // Native tray and notification labels follow the resolved language immediately.
    void invoke("set_ui_locale", { locale }).catch(() => { /* Browser preview has no native bridge. */ });
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const dictionary: Record<MessageKey, string> = dictionaries[locale];

    return {
      locale,
      setLocale,
      t: (key, vars) => {
        const singular = (vars?.count ?? vars?.peers) === 1 ? dictionary[`${key}.one` as MessageKey] : undefined;
        let text = singular ?? dictionary[key] ?? enUS[key];
        if (vars) {
          for (const [name, value] of Object.entries(vars)) {
            text = text.split(`{${name}}`).join(String(value));
          }
        }
        return text;
      },
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
