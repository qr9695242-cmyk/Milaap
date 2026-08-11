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
          pink: "#FF3B7F",
          violet: "#8B5CF6",
          orange: "#FF8A3D",
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
        "glow-gradient": "linear-gradient(135deg, #FF3B7F 0%, #8B5CF6 55%, #FF8A3D 100%)",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(139, 92, 246, 0.45)",
      },
    },
  },
  plugins: [],
};
