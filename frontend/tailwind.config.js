/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#070b16",
          900: "#0a1020",
          850: "#0d1426",
          800: "#111a30",
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
      },
      animation: {
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
