import type { UiMode } from "@projectmaster/shared";
import { setUiMode } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store";

/** Bascule mode simple / expert (persistée via le profil). */
export function ModeToggle() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.auth.user?.uiMode ?? "simple");

  const choose = (m: UiMode) => {
    if (m !== mode) void dispatch(setUiMode(m));
  };

  const options: { value: UiMode; label: string }[] = [
    { value: "simple", label: "Simple" },
    { value: "expert", label: "Expert" },
  ];

  return (
    <div
      className="inline-flex rounded-lg border border-line bg-surface p-0.5"
      role="group"
      aria-label="Niveau d'affichage"
    >
      {options.map((o) => {
        const active = o.value === mode;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            aria-pressed={active}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              active
                ? "bg-brand/20 text-heading ring-1 ring-inset ring-link/30"
                : "text-muted hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
