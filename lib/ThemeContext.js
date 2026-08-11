"use client";

// Dark/Light theme switch. Adds/removes the "light" class on <html>;
// app/globals.css swaps the CSS variables that void/panel/ink/mist
// resolve to (see tailwind.config.js), so existing classNames across
// the app repaint automatically — no per-page changes needed.

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  const [ready, setReady] = useState(false);

  // Read saved preference once on mount (localStorage isn't available
  // during SSR, so this has to happen client-side in an effect).
  useEffect(() => {
    const saved = window.localStorage.getItem("milaap-theme");
    const initial = saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    setTheme(initial);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem("milaap-theme", theme);
  }, [theme, ready]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
