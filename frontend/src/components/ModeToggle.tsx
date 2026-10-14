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
      className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5"
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
              active ? "bg-brand/20 text-brand-300" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
