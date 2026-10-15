import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ConnectorConfig, ConnectorProvider, NotificationSettings } from "@projectmaster/shared";
import { CONNECTOR_META, CONNECTOR_PROVIDERS } from "@projectmaster/shared";
import { api, toErrorMessage } from "../api/client";
import { PageHeader, Loading, ErrorBanner } from "../components/ui";
import { useAsync } from "../hooks/useAsync";

export function IntegrationsPage() {
  const { id } = useParams<{ id: string }>();
  const cfg = useAsync<ConnectorConfig | null>(() => api.get<ConnectorConfig | null>(`/projects/${id}/connector`), [id]);
  const notif = useAsync<NotificationSettings>(() => api.get<NotificationSettings>(`/projects/${id}/notifications`), [id]);

  if (cfg.loading || notif.loading) return <Loading />;

  return (
    <div>
      <PageHeader
        eyebrow="Intégrations"
        title="Connecteur & notifications"
        subtitle={<Link to={`/projects/${id}`} className="text-link hover:underline">← Retour à la fiche projet</Link>}
      />
      <ConnectorSection projectId={id!} initial={cfg.data} onSaved={() => void cfg.reload()} />
      <DocumentSection projectId={id!} />
      <NotificationSection projectId={id!} initial={notif.data!} onSaved={() => void notif.reload()} />
    </div>
  );
}

function ConnectorSection({
  projectId,
  initial,
  onSaved,
}: {
  projectId: string;
  initial: ConnectorConfig | null;
  onSaved: () => void;
}) {
  const [provider, setProvider] = useState<ConnectorProvider>(initial?.provider ?? "github");
  const [settings, setSettings] = useState<Record<string, string>>(initial?.settings ?? {});
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Réinitialise les champs quand on change de provider.
  useEffect(() => {
    if (provider !== initial?.provider) setSettings({});
  }, [provider, initial]);

  const meta = CONNECTOR_META[provider];

  const save = async () => {
    setError(null);
    setOk(null);
    try {
      await api.put(`/projects/${projectId}/connector`, {
        provider,
        settings,
        token: token.trim() || undefined,
      });
      setToken("");
      setOk("Connecteur enregistré.");
      onSaved();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const remove = async () => {
    setError(null);
    try {
      await api.del(`/projects/${projectId}/connector`);
      setSettings({});
      setToken("");
      setOk("Connecteur supprimé.");
      onSaved();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  return (
    <section className="pm-card mb-6 p-5">
      <h2 className="text-lg font-semibold text-heading">Source de données</h2>
      <p className="mt-1 text-sm text-muted">{meta.hint}</p>
      {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
      {ok && <p className="mt-3 text-sm text-success">{ok}</p>}

      <label className="mt-4 block max-w-xs">
        <span className="pm-label">Fournisseur</span>
        <select className="pm-input" value={provider} onChange={(e) => setProvider(e.target.value as ConnectorProvider)}>
          {CONNECTOR_PROVIDERS.map((p) => (
            <option key={p} value={p}>{CONNECTOR_META[p].label}</option>
          ))}
        </select>
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {meta.settings.map((s) => (
          <label key={s.key} className="flex flex-col">
            <span className="pm-label">{s.label}{s.required && " *"}</span>
            <input
              className="pm-input"
              placeholder={s.placeholder}
              value={settings[s.key] ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, [s.key]: e.target.value }))}
            />
          </label>
        ))}
        {meta.needsToken && (
          <label className="flex flex-col">
            <span className="pm-label">
              Token {initial?.hasToken ? "(enregistré — laisser vide pour conserver)" : "*"}
            </span>
            <input
              type="password"
              className="pm-input font-mono"
              placeholder={initial?.hasToken ? "•••••• (conservé)" : "collez votre token"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </label>
        )}
      </div>

      <p className="mt-3 text-xs text-faint">
        Le token est chiffré au repos (AES-256-GCM) et n'est jamais réaffiché.
      </p>

      <div className="mt-4 flex gap-2">
        <button onClick={save} className="pm-btn-primary">Enregistrer</button>
        {initial && <button onClick={remove} className="pm-btn-ghost">Supprimer</button>}
      </div>
    </section>
  );
}

/** Import de documents (PDF, Word) : le texte est extrait et versé en signal. */
function DocumentSection({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de ré-importer le même fichier
    if (!file) return;
    setError(null);
    setOk(null);

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

    setBusy(true);
    try {
      const contentBase64 = await fileToBase64(file);
      const res = await api.post<{ title: string; chars: number; truncated: boolean }>(
        `/projects/${projectId}/documents`,
        { filename: file.name, kind, contentBase64 },
      );
      setOk(
        `« ${res.title} » importé — ${res.chars} caractères analysés` +
          (res.truncated ? " (extrait tronqué)." : "."),
      );
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pm-card mb-6 p-5">
      <h2 className="text-lg font-semibold text-heading">Importer un document</h2>
      <p className="mt-1 text-sm text-muted">
        Cahier des charges, spécifications, compte-rendu… Le texte est extrait
        puis analysé. Formats : PDF et Word (.docx).
      </p>
      {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
      {ok && <p className="mt-3 text-sm text-success">{ok}</p>}

      <label className="mt-4 inline-flex cursor-pointer items-center gap-2">
        <span className={`pm-btn-primary ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy ? "Import en cours…" : "Choisir un fichier (.pdf, .docx)"}
        </span>
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={onFile}
          disabled={busy}
        />
      </label>

      <p className="mt-3 text-xs text-faint">
        Seul un extrait borné du texte est conservé — le fichier d'origine n'est pas stocké.
      </p>
    </section>
  );
}

/** Lit un fichier et renvoie son contenu encodé en base64 (sans préfixe data:). */
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

function NotificationSection({
  projectId,
  initial,
  onSaved,
}: {
  projectId: string;
  initial: NotificationSettings;
  onSaved: () => void;
}) {
  const [slackWebhook, setSlackWebhook] = useState("");
  const [onAnomaly, setOnAnomaly] = useState(initial.onAnomaly);
  const [onPendingDecision, setOnPendingDecision] = useState(initial.onPendingDecision);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setOk(null);
    try {
      await api.put(`/projects/${projectId}/notifications`, {
        slackWebhook: slackWebhook.trim() || undefined,
        onAnomaly,
        onPendingDecision,
      });
      setSlackWebhook("");
      setOk("Réglages enregistrés.");
      onSaved();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  return (
    <section className="pm-card p-5">
      <h2 className="text-lg font-semibold text-heading">Notifications</h2>
      <p className="mt-1 text-sm text-muted">
        Les e-mails d'alerte sont gérés dans votre profil. Ici, le webhook Slack
        et ce que ce projet notifie.
      </p>
      {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
      {ok && <p className="mt-3 text-sm text-success">{ok}</p>}

      <label className="mt-4 block max-w-xl">
        <span className="pm-label">
          Webhook Slack {initial.hasSlackWebhook ? "(enregistré — laisser vide pour conserver)" : ""}
        </span>
        <input
          type="password"
          className="pm-input font-mono"
          placeholder={initial.hasSlackWebhook ? "•••••• (conservé)" : "https://hooks.slack.com/services/…"}
          value={slackWebhook}
          onChange={(e) => setSlackWebhook(e.target.value)}
          autoComplete="off"
        />
      </label>

      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={onAnomaly} onChange={(e) => setOnAnomaly(e.target.checked)} />
          Notifier les anomalies critiques
        </label>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={onPendingDecision} onChange={(e) => setOnPendingDecision(e.target.checked)} />
          Notifier les décisions en attente d'approbation
        </label>
      </div>

      <button onClick={save} className="pm-btn-primary mt-4">Enregistrer</button>
    </section>
  );
}
