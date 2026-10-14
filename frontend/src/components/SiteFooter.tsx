import { Link } from "react-router-dom";

const links = [
  { to: "/legal/mentions", label: "Mentions légales" },
  { to: "/legal/confidentialite", label: "Confidentialité" },
  { to: "/legal/cgu", label: "CGU" },
  { to: "/legal/cookies", label: "Cookies" },
];

/** Pied de page commun : liens légaux (RGPD/LCEN) accessibles partout. */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center">
        <nav aria-label="Liens légaux" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-slate-400 hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="font-mono text-xs text-slate-400">
          © {new Date().getFullYear()} Aperio — gestion de projet prédictive
        </p>
      </div>
    </footer>
  );
}
