import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store";

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
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 shadow-glow">
                <span className="h-2.5 w-2.5 rounded-sm bg-white/90" />
              </span>
              <span className="pm-gradient-text text-lg font-extrabold tracking-tight">
                ProjectMaster
              </span>
            </div>
            <nav className="flex gap-1">
              <NavLink to="/dashboard" className={linkClass}>
                Tableau de bord
              </NavLink>
              <NavLink to="/projects" className={linkClass}>
                Projets
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden font-mono text-xs text-slate-500 sm:inline">
              {user?.email}
            </span>
            <button onClick={onLogout} className="pm-btn-ghost py-1.5">
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        <Outlet />
      </main>
    </div>
  );
}
