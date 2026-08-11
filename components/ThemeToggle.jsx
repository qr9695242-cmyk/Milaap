"use client";

import { useTheme } from "@/lib/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark/light theme"
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-panel text-sm ring-1 ring-white/5 ${className}`}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
