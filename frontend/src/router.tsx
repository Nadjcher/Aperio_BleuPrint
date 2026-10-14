import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage, UpgradePage } from "./pages/AuthPages";
import { MentionsLegalesPage, ConfidentialitePage, CGUPage, CookiesPage } from "./pages/LegalPages";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { TeamPage } from "./pages/TeamPage";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/upgrade", element: <UpgradePage /> },
  { path: "/legal/mentions", element: <MentionsLegalesPage /> },
  { path: "/legal/confidentialite", element: <ConfidentialitePage /> },
  { path: "/legal/cgu", element: <CGUPage /> },
  { path: "/legal/cookies", element: <CookiesPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/projects", element: <ProjectsPage /> },
          { path: "/projects/:id", element: <ProjectDetailPage /> },
          { path: "/team", element: <TeamPage /> },
        ],
      },
    ],
  },
]);
