import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { SiteFooter } from "./SiteFooter";
import { ModeToggle } from "./ModeToggle";
import { ProjectsProvider } from "../hooks/ProjectsContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `pm-nav-link ${isActive ? "pm-nav-link-active" : ""}`;

export function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  const onLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-ink-950"
      >
        Aller au contenu
      </a>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 shadow-glow">
                <span className="h-2.5 w-2.5 rounded-sm bg-white/90" />
              </span>
              <span className="pm-gradient-text text-lg font-extrabold tracking-tight">
                Aperio
              </span>
            </div>
            <nav className="flex gap-1">
              <NavLink to="/dashboard" className={linkClass}>
                Tableau de bord
              </NavLink>
              <NavLink to="/projects" className={linkClass}>
                Projets
              </NavLink>
              <NavLink to="/team" className={linkClass}>
                Équipe
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <ModeToggle />
            <span className="hidden font-mono text-xs text-slate-400 sm:inline">
              {user?.isGuest ? "Mode invité" : user?.email}
            </span>
            <button onClick={onLogout} className="pm-btn-ghost py-1.5">
              {user?.isGuest ? "Quitter" : "Déconnexion"}
            </button>
          </div>
        </div>
      </header>

      {user?.isGuest && (
        <div className="border-b border-brand/20 bg-brand/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
            <span className="text-slate-300">
              👋 Mode invité — votre travail n'est pas sauvegardé. Créez un compte
              pour le conserver et continuer sans limite.
            </span>
            <Link to="/upgrade" className="pm-btn-primary py-1.5">
              Créer mon compte
            </Link>
          </div>
        </div>
      )}
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <ProjectsProvider>
          <Outlet />
        </ProjectsProvider>
      </main>
      <SiteFooter />
    </div>
  );
}
