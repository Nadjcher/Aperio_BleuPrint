import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Job, Project } from "@projectmaster/shared";
import { api, RequestError, toErrorMessage } from "../api/client";
import { PageHeader, ErrorBanner } from "../components/ui";
import { useProjects } from "../hooks/ProjectsContext";

const STEPS = ["Décrire le projet", "Connecter le dépôt", "Lancer l'analyse"];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { reload } = useProjects();

  const [step, setStep] = useState(0); // 0..2
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const createProjectStep = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await api.post<Project>("/projects", {
        name: name.trim(),
        repo: repo.trim() || undefined,
      });
      setProject(p);
      await reload();
      setStep(2);
    } catch (err) {
      if (err instanceof RequestError && err.code === "guest_limit") {
        navigate("/upgrade");
        return;
      }
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const runAnalysis = async () => {
    if (!project) return;
    setBusy(true);
    setError(null);
    setStatus("Analyse en file d'attente…");
    try {
      const { jobId } = await api.post<{ jobId: string }>(`/projects/${project.id}/sync`);
      setStatus("Analyse en cours…");
      for (let i = 0; i < 60; i++) {
        const job = await api.get<Job>(`/jobs/${jobId}`);
        if (job.status === "done" || job.status === "failed") {
          setStatus(
            job.status === "done" ? "Analyse terminée ✓" : `Échec : ${job.error ?? "erreur"}`,
          );
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      setDone(true);
    } catch (err) {
      setError(toErrorMessage(err, "Erreur pendant l'analyse"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        eyebrow="Premiers pas"
        title="Démarrez en 3 étapes"
        subtitle="Quelques minutes pour relier un projet et lancer votre première analyse."
      />

      {/* Indicateur de progression */}
      <ol className="mb-8 flex items-center gap-2" aria-label="Progression">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-white/10"}`}
              aria-hidden
            />
            <span className={`text-xs ${i === step ? "text-brand-300" : "text-slate-500"}`}>
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="pm-card p-6">
        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white">Comment s'appelle votre projet ?</h2>
            <p className="mt-1 text-sm text-slate-400">Un nom clair, par exemple « Refonte du site ».</p>
            <label className="mt-4 block">
              <span className="pm-label">Nom du projet</span>
              <input
                className="pm-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon projet"
                autoFocus
              />
            </label>
            <div className="mt-6 flex justify-between">
              <Link to="/dashboard" className="pm-btn-ghost">
                Plus tard
              </Link>
              <button
                className="pm-btn-primary"
                disabled={!name.trim()}
                onClick={() => setStep(1)}
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-white">Connectez un dépôt de code</h2>
            <p className="mt-1 text-sm text-slate-400">
              Format <span className="font-mono">propriétaire/dépôt</span> (ex.{" "}
              <span className="font-mono">facebook/react</span>). Aperio y lira l'activité
              (commits, relectures, tickets). Vous pouvez aussi sauter cette étape.
            </p>
            <label className="mt-4 block">
              <span className="pm-label">Dépôt (optionnel)</span>
              <input
                className="pm-input font-mono"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="facebook/react"
              />
            </label>
            <div className="mt-6 flex justify-between">
              <button className="pm-btn-ghost" onClick={() => setStep(0)} disabled={busy}>
                ← Retour
              </button>
              <button className="pm-btn-primary" onClick={createProjectStep} disabled={busy}>
                {busy ? "Création…" : "Créer le projet →"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-white">Lancez la première analyse</h2>
            <p className="mt-1 text-sm text-slate-400">
              {project?.repo
                ? "Aperio va collecter l'activité du dépôt et faire travailler ses agents."
                : "Aucun dépôt relié : vous pourrez en ajouter un plus tard depuis la fiche projet."}
            </p>

            {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}

            <div className="mt-6 flex flex-wrap justify-between gap-2">
              {project && (
                <Link to={`/projects/${project.id}`} className="pm-btn-ghost">
                  Ouvrir la fiche projet
                </Link>
              )}
              {!done && project?.repo ? (
                <button className="pm-btn-primary" onClick={runAnalysis} disabled={busy}>
                  {busy ? "Analyse…" : "⚡ Lancer l'analyse"}
                </button>
              ) : (
                <button className="pm-btn-primary" onClick={() => navigate("/dashboard")}>
                  Terminer →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
