import { useState } from "react";
import { getTheme, setTheme, type Theme } from "../lib/theme";

/** Bascule thème clair / sombre (persistée). */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getTheme());

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-fg transition hover:bg-surface2"
      aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
      title={theme === "dark" ? "Thème clair" : "Thème sombre"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
