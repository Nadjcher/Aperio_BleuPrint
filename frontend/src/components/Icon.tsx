/** Icônes SVG (style ligne, 24x24) — héritent de currentColor. */

type IconName =
  | "bolt"
  | "trending"
  | "bot"
  | "report"
  | "shield"
  | "check"
  | "branch"
  | "search"
  | "rocket";

const paths: Record<IconName, JSX.Element> = {
  bolt: <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />,
  trending: (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  bot: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="2.5" />
      <path d="M12 5v4" />
      <circle cx="12" cy="4" r="1.3" />
      <path d="M9 14h.01M15 14h.01" />
      <path d="M2 13v3M22 13v3" />
    </>
  ),
  report: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h8M8 17h8M8 9h2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 7.3 7 8.9 4-1.6 7-4.4 7-8.9V6z" />
      <path d="m9 11.5 2 2 4-4" />
    </>
  ),
  check: (
    <>
      <path d="M21.8 10A10 10 0 1 1 17 3.3" />
      <path d="m9 11 3 3L22 4" />
    </>
  ),
  branch: (
    <>
      <line x1="6" y1="4" x2="6" y2="14" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M18 8.5a9 9 0 0 1-9 9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  rocket: (
    <>
      <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.1 2.1 0 0 0-2.9-.1z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z" />
      <path d="M9 12H4s.5-3 2-4c1.6-1.1 5 0 5 0" />
      <path d="M12 15v5s3-.5 4-2c1.1-1.6 0-5 0-5" />
    </>
  ),
};

export type { IconName };

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
