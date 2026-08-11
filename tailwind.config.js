/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  darkMode: "class", // toggled via lib/ThemeContext.js (adds/removes "light" on <html>)
  theme: {
    extend: {
      colors: {
        // These read from CSS variables (see app/globals.css) so the same
        // class names (bg-void, text-mist, etc.) repaint for light theme
        // without touching every page. "<alpha-value>" keeps /opacity
        // modifiers (bg-panel/60 etc.) working.
        void: "rgb(var(--color-void) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        panel2: "rgb(var(--color-panel2) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        neon: {
          pink: "#F5C34D",
          violet: "#B8860B",
          orange: "#FFF3C9",
        },
        gold: "#F5C34D",
        diamond: "#5ED4E8",
        mist: "rgb(var(--color-mist) / <alpha-value>)", // muted text
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      backgroundImage: {
        "glow-gradient": "linear-gradient(135deg, #B8860B 0%, #F5C34D 55%, #FFF3C9 100%)",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(245, 195, 77, 0.45)",
      },
    },
  },
  plugins: [],
};
