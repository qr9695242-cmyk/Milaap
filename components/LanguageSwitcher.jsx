"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { LOCALES } from "@/lib/i18n";

export default function LanguageSwitcher({ className = "" }) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        className="flex h-9 items-center gap-1.5 rounded-full bg-panel px-3 text-xs font-semibold text-ink ring-1 ring-white/5"
      >
        🌐 {current.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-36 overflow-hidden rounded-2xl bg-panel2 py-1 ring-1 ring-white/10 shadow-xl">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm ${
                  l.code === locale ? "font-bold text-diamond" : "text-ink/85"
                }`}
              >
                {l.label}
                {l.code === locale && <span>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
