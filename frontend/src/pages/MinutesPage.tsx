import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { MeetingMinutes } from "@projectmaster/shared";
import { api, toErrorMessage } from "../api/client";
import { PageHeader, Loading, ErrorBanner } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useDictation } from "../hooks/useDictation";

export function MinutesPage() {
  const { id } = useParams<{ id: string }>();
  const list = useAsync<{ items: MeetingMinutes[] }>(
    () => api.get<{ items: MeetingMinutes[] }>(`/projects/${id}/minutes`),
    [id],
  );

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dictée vocale : chaque segment reconnu est ajouté aux notes.
  const dictation = useDictation((segment) =>
    setText((prev) => (prev ? `${prev} ${segment}` : segment)),
  );

  const importFromDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const lower = file.name.toLowerCase();
    const kind = lower.endsWith(".pdf") ? "pdf" : lower.endsWith(".docx") ? "docx" : null;
    if (!kind) {
      setError("Format non pris en charge. Choisissez un fichier .pdf ou .docx.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 6 Mo).");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const contentBase64 = await fileToBase64(file);
      await api.post<MeetingMinutes>(`/projects/${id}/minutes/from-document`, {
        filename: file.name,
        kind,
        contentBase64,
        title: title.trim() || undefined,
      });
      await list.reload();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await api.post<MeetingMinutes>(`/projects/${id}/minutes`, { title: title.trim(), text });
      setTitle("");
      setText("");
      await list.reload();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (mid: string) => {
    setError(null);
    try {
      await api.del(`/projects/${id}/minutes/${mid}`);
      await list.reload();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  if (list.loading) return <Loading />;
  const items = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Réunions"
        title="Comptes rendus"
        subtitle={<Link to={`/projects/${id}`} className="pm-link">← Retour à la fiche projet</Link>}
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* Saisie des notes */}
      <form onSubmit={generate} className="pm-card mb-8 p-5">
        <h2 className="text-lg font-semibold text-heading">Générer un compte rendu</h2>
        <p className="mt-1 text-sm text-muted">
          Collez vos notes de réunion : Aperio en extrait le résumé, les décisions,
          les actions, les risques et les points à clarifier. Vous relisez, puis vous décidez.
        </p>

        <label className="mt-4 block max-w-xl">
          <span className="pm-label">Titre de la réunion</span>
          <input
            className="pm-input"
            placeholder="Comité de suivi — 15 oct."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="pm-label mb-0">Notes</span>
            <div className="flex items-center gap-2">
              {dictation.supported && (
                <button
                  type="button"
                  onClick={dictation.listening ? dictation.stop : dictation.start}
                  className={`pm-btn-ghost py-1 text-xs ${dictation.listening ? "ring-1 ring-inset ring-danger/50 text-danger" : ""}`}
                  title={dictation.listening ? "Arrêter la dictée" : "Dicter les notes au micro"}
                >
                  {dictation.listening ? "⏹ Arrêter la dictée" : "🎤 Dicter"}
                </button>
              )}
              <label className="pm-btn-ghost cursor-pointer py-1 text-xs">
                📄 Depuis un document
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={importFromDocument}
                  disabled={busy}
                />
              </label>
            </div>
          </div>
          <textarea
            className="pm-input min-h-[12rem] font-mono text-xs leading-relaxed"
            placeholder={"Collez, dictez (🎤) ou importez un document (📄)…\n- Décision : …\n- Action : … (responsable, échéance)\n- Risque : …\n- À clarifier : … ?"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          {dictation.listening && (
            <p className="mt-1.5 text-xs text-danger">
              ● Dictée en cours… (selon le navigateur, l'audio peut être transmis à un service de reconnaissance tiers)
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button className="pm-btn-primary" disabled={busy}>
            {busy ? "Génération…" : "Générer le compte rendu"}
          </button>
          <span className="text-xs text-faint">
            Le texte brut n'est pas conservé — seul le compte rendu structuré est enregistré.
          </span>
        </div>
      </form>

      {/* Historique */}
      {items.length === 0 ? (
        <div className="pm-card p-8 text-center text-sm text-muted">
          Aucun compte rendu pour l'instant. Collez vos notes ci-dessus pour en générer un.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((m) => (
            <MinutesCard key={m.id} m={m} onDelete={() => remove(m.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Lit un fichier et renvoie son contenu base64 (sans préfixe data:). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

function MinutesCard({ m, onDelete }: { m: MeetingMinutes; onDelete: () => void }) {
  return (
    <li className="pm-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-heading">{m.title}</h3>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-faint">
            <span>{new Date(m.createdAt).toLocaleString("fr-FR")}</span>
            <span className="pm-chip border-line bg-slate-500/10 text-muted">
              {m.generatedBy === "llm" ? "IA" : "Extraction"}
            </span>
          </div>
        </div>
        <button onClick={onDelete} className="pm-btn-ghost py-1.5 text-xs">Supprimer</button>
      </div>

      <p className="mt-3 text-sm text-fg">{m.summary}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Section title="Décisions" tone="text-link" empty="Aucune décision">
          {m.decisions.map((d, i) => <li key={i}>{d}</li>)}
        </Section>
        <Section title="Actions" tone="text-heading" empty="Aucune action">
          {m.actions.map((a, i) => (
            <li key={i}>
              {a.description}
              {(a.owner || a.due) && (
                <span className="text-faint">
                  {" "}— {a.owner ?? "?"}{a.due ? ` · ${a.due}` : ""}
                </span>
              )}
            </li>
          ))}
        </Section>
        <Section title="Risques" tone="text-danger" empty="Aucun risque signalé">
          {m.risks.map((r, i) => <li key={i}>{r}</li>)}
        </Section>
        <Section title="À clarifier" tone="text-warning" empty="Aucune question ouverte">
          {m.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
        </Section>
      </div>
    </li>
  );
}

function Section({
  title,
  tone,
  empty,
  children,
}: {
  title: string;
  tone: string;
  empty: string;
  children: React.ReactNode[];
}) {
  const has = Array.isArray(children) && children.length > 0;
  return (
    <div>
      <div className={`font-mono text-[11px] font-medium uppercase tracking-[0.18em] ${tone}`}>
        {title}
      </div>
      {has ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg">{children}</ul>
      ) : (
        <p className="mt-2 text-sm text-faint">{empty}</p>
      )}
    </div>
  );
}
