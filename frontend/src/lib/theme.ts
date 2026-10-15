export type Theme = "light" | "dark";

const KEY = "pm.theme";

/** Lit le thème enregistré (défaut : clair). */
export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Applique le thème au document (classe `dark` sur <html>). */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Change le thème, l'applique et le persiste. */
export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore (navigation privée) */
  }
}

/** Initialise le thème au démarrage (avant le rendu, évite le flash). */
export function initTheme(): void {
  applyTheme(getTheme());
}
