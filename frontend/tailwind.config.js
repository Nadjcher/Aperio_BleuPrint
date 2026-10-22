/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        // Display éditoriale-technique pour les titres de la landing.
        display: ["Bricolage Grotesque", "Inter", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        // ── Identité « poste de pilotage » (landing) ───────────────────────
        paper: "#F6F6F4", // fond stone très clair
        ink: {
          DEFAULT: "#12151B", // encre navy (titres / texte fort)
          soft: "#2A2F3A",
          900: "#0a1020", // (hérité, ancien thème sombre)
          950: "#070b16",
          850: "#0d1426",
          800: "#111a30",
        },
        graphite: "#4A4F5A", // corps de texte éditorial
        signal: {
          DEFAULT: "#6D4AFF", // accent unique (violet électrique)
          deep: "#4A2FE0", // survol / contraste
          soft: "#EEEAFF", // fond teinté très léger
          ring: "#C9BCFF",
        },
        // Bleu électrique « blueprint »
        brand: {
          DEFAULT: "#38bdf8",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
        },
        accent: {
          DEFAULT: "#3b82f6",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        // ── Jetons sémantiques (pilotés par variables CSS, voir index.css).
        // Les deux thèmes (clair par défaut, sombre) partagent le même markup.
        app: "rgb(var(--c-app) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        surface2: "rgb(var(--c-surface2) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        heading: "rgb(var(--c-heading) / <alpha-value>)",
        fg: "rgb(var(--c-fg) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        faint: "rgb(var(--c-faint) / <alpha-value>)",
        link: "rgb(var(--c-link) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
        warning: "rgb(var(--c-warning) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
      },
      boxShadow: {
        // Halo maîtrisé : fin anneau + ombre portée nette
        glow: "0 0 0 1px rgba(56,189,248,0.3), 0 10px 30px -12px rgba(37,99,235,0.5)",
        "glow-violet":
          "0 0 0 1px rgba(59,130,246,0.3), 0 10px 30px -12px rgba(37,99,235,0.5)",
        panel:
          "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 24px 60px -28px rgba(0,0,0,0.75)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        // Révélation orchestrée du briefing (une seule fois, au chargement).
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        riseIn: "riseIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
