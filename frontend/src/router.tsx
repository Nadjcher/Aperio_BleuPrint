import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Loading } from "./components/ui";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage, UpgradePage } from "./pages/AuthPages";
import { MentionsLegalesPage, ConfidentialitePage, CGUPage, CookiesPage } from "./pages/LegalPages";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { TeamPage } from "./pages/TeamPage";
import { GlossaryPage } from "./pages/GlossaryPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PlanningPage } from "./pages/PlanningPage";
import { RisksPage } from "./pages/RisksPage";
import { MinutesPage } from "./pages/MinutesPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";

// Carte du portefeuille : chargée à la demande (isole React Flow du bundle initial).
const PortfolioMapPage = lazy(() =>
  import("./pages/PortfolioMapPage").then((m) => ({ default: m.PortfolioMapPage })),
);

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
          {
            path: "/portfolio",
            element: (
              <Suspense fallback={<Loading />}>
                <PortfolioMapPage />
              </Suspense>
            ),
          },
          { path: "/projects/:id", element: <ProjectDetailPage /> },
          { path: "/projects/:id/planning", element: <PlanningPage /> },
          { path: "/projects/:id/risks", element: <RisksPage /> },
          { path: "/projects/:id/minutes", element: <MinutesPage /> },
          { path: "/projects/:id/integrations", element: <IntegrationsPage /> },
          { path: "/team", element: <TeamPage /> },
          { path: "/glossaire", element: <GlossaryPage /> },
          { path: "/onboarding", element: <OnboardingPage /> },
        ],
      },
    ],
  },
]);
