import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { tokenStore } from "../api/client";
import { loadMe } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store";

/** Protège les routes : exige un token et charge le profil au montage. */
export function ProtectedRoute() {
  const dispatch = useAppDispatch();
  const { status, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (tokenStore.access && !user) {
      void dispatch(loadMe());
    }
  }, [dispatch, user]);

  if (!tokenStore.access) return <Navigate to="/login" replace />;
  if (status === "idle" && !user) return <div className="p-8">Chargement…</div>;
  return <Outlet />;
}
