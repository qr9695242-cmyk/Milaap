"use client";

// Language switch — same pattern as lib/ThemeContext.js. Sets `lang` and
// `dir` (rtl for Urdu/Arabic) on <html> so the whole app mirrors
// correctly for RTL locales without per-page changes, and persists the
// choice in localStorage.

import { createContext, useContext, useEffect, useState } from "react";
import { LOCALES, translate } from "./i18n";

const LanguageContext = createContext({
  locale: "en",
  dir: "ltr",
  setLocale: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("milaap-locale");
    const valid = LOCALES.some((l) => l.code === saved);
    setLocaleState(valid ? saved : "en");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const meta = LOCALES.find((l) => l.code === locale) || LOCALES[0];
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
    window.localStorage.setItem("milaap-locale", locale);
  }, [locale, ready]);

  function setLocale(code) {
    if (LOCALES.some((l) => l.code === code)) setLocaleState(code);
  }

  const dir = (LOCALES.find((l) => l.code === locale) || LOCALES[0]).dir;

  return (
    <LanguageContext.Provider
      value={{ locale, dir, setLocale, t: (key) => translate(locale, key) }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
