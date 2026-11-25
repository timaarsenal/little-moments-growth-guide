import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import ru from "./ru.json";
import kz from "./kz.json";
import type { Lang } from "@/lib/types";

const dictionaries: Record<Lang, unknown> = { ru, kz };
const STORAGE_KEY = "balapan-lang";

function lookup(dict: unknown, path: string): string | undefined {
  let node: unknown = dict;
  for (const part of path.split(".")) {
    if (node && typeof node === "object" && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const raw = lookup(dictionaries[lang], key) ?? lookup(dictionaries.ru, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

function pluralRu(n: number): "one" | "few" | "many" {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "one";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
  return "many";
}

// Dates are formatted by hand from the dictionaries: the server runtime only
// has English locale data, so toLocaleDateString("kk-KZ") falls back to English.
export function formatLongDate(lang: Lang, date: Date): string {
  return translate(lang, "dates.long", {
    weekday: translate(lang, `dates.weekdays.${date.getDay()}`),
    day: date.getDate(),
    month: translate(lang, `dates.months.${date.getMonth()}`),
  });
}

export function formatDateWithYear(lang: Lang, date: Date): string {
  return translate(lang, "dates.withYear", {
    day: date.getDate(),
    month: translate(lang, `dates.months.${date.getMonth()}`),
    year: date.getFullYear(),
  });
}

export function formatShortDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()}`;
}

export function formatAge(lang: Lang, months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${translate(lang, `age.year_${pluralRu(years)}`)}`);
  if (rest > 0 || years === 0) parts.push(`${rest} ${translate(lang, `age.month_${pluralRu(rest)}`)}`);
  return parts.join(" ");
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  age: (months: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ru" || saved === "kz") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "kz" ? "kk" : "ru";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      age: (months) => formatAge(lang, months),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
