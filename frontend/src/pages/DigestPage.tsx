import { useState } from "react";
import type {
  DigestChannel,
  DigestFrequency,
  DigestPreference,
  DigestSendResult,
} from "@projectmaster/shared";
import { DIGEST_CHANNEL_META, DIGEST_FREQUENCY_META } from "@projectmaster/shared";
import { api, toErrorMessage } from "../api/client";
import { PageHeader, Loading, ErrorBanner } from "../components/ui";
import { useAsync } from "../hooks/useAsync";

const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

export function DigestPage() {
  const pref = useAsync<DigestPreference>(() => api.get<DigestPreference>("/digest"), []);
  if (pref.loading) return <Loading />;
  return (
    <div>
      <PageHeader
        eyebrow="Alertes"
        title="Recevoir mon briefing"
        subtitle="Aperio pousse votre briefing là où vous travaillez — Slack, Teams ou e-mail — sans ouvrir l'app."
      />
      {pref.error && <div className="mb-4"><ErrorBanner message={pref.error} /></div>}
      {pref.data && <DigestForm initial={pref.data} onSaved={() => void pref.reload()} />}
    </div>
  );
}

function DigestForm({ initial, onSaved }: { initial: DigestPreference; onSaved: () => void }) {
  const [channels, setChannels] = useState<DigestChannel[]>(initial.channels);
  const [frequency, setFrequency] = useState<DigestFrequency>(initial.frequency);
  const [hour, setHour] = useState(initial.hour);
  const [weekday, setWeekday] = useState(initial.weekday);
  const [email, setEmail] = useState(initial.email ?? "");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [teamsWebhook, setTeamsWebhook] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [sendResults, setSendResults] = useState<DigestSendResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const toggle = (c: DigestChannel) =>
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const save = async () => {
    setError(null);
    setOk(null);
    setSendResults(null);
    setSaving(true);
    try {
      await api.put("/digest", {
        channels,
        frequency,
        hour,
        weekday,
        email: email.trim() || null,
        slackWebhook: slackWebhook.trim() || undefined,
        teamsWebhook: teamsWebhook.trim() || undefined,
      });
      setSlackWebhook("");
      setTeamsWebhook("");
      setOk("Préférences enregistrées.");
      onSaved();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    setError(null);
    setOk(null);
    setSendResults(null);
    setSending(true);
    try {
      const res = await api.post<{ results: DigestSendResult[] }>("/digest/send", {});
      setSendResults(res.results);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const active = (c: DigestChannel) => channels.includes(c);

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} />}
      {ok && <p className="text-sm text-success">{ok}</p>}

      {/* Fréquence & heure */}
      <section className="pm-card p-5">
        <h2 className="text-lg font-semibold text-heading">Quand</h2>
        <p className="mt-1 text-sm text-muted">
          Choisissez la fréquence et l'heure d'envoi. L'heure est en UTC.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col">
            <span className="pm-label">Fréquence</span>
            <select
              className="pm-input"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as DigestFrequency)}
            >
              {(["daily", "weekly", "off"] as DigestFrequency[]).map((f) => (
                <option key={f} value={f}>{DIGEST_FREQUENCY_META[f]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="pm-label">Heure (UTC)</span>
            <select
              className="pm-input"
              value={hour}
              disabled={frequency === "off"}
              onChange={(e) => setHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
              ))}
            </select>
          </label>
          {frequency === "weekly" && (
            <label className="flex flex-col">
              <span className="pm-label">Jour</span>
              <select
                className="pm-input"
                value={weekday}
                onChange={(e) => setWeekday(Number(e.target.value))}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      {/* Canaux */}
      <section className="pm-card p-5">
        <h2 className="text-lg font-semibold text-heading">Où</h2>
        <p className="mt-1 text-sm text-muted">
          Un ou plusieurs canaux. Les webhooks sont chiffrés au repos et ne sont jamais réaffichés.
        </p>

        <div className="mt-4 space-y-4">
          {/* E-mail */}
          <div className="rounded-lg border border-line p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-fg">
              <input type="checkbox" checked={active("email")} onChange={() => toggle("email")} />
              {DIGEST_CHANNEL_META.email.label}
            </label>
            <p className="mt-1 text-xs text-muted">{DIGEST_CHANNEL_META.email.hint}</p>
            {active("email") && (
              <label className="mt-3 block max-w-md">
                <span className="pm-label">Adresse (vide = adresse du compte)</span>
                <input
                  type="email"
                  className="pm-input"
                  placeholder="vous@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </label>
            )}
          </div>

          {/* Slack */}
          <div className="rounded-lg border border-line p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-fg">
              <input type="checkbox" checked={active("slack")} onChange={() => toggle("slack")} />
              {DIGEST_CHANNEL_META.slack.label}
            </label>
            <p className="mt-1 text-xs text-muted">{DIGEST_CHANNEL_META.slack.hint}</p>
            {active("slack") && (
              <label className="mt-3 block max-w-xl">
                <span className="pm-label">
                  Webhook Slack {initial.hasSlackWebhook ? "(enregistré — laisser vide pour conserver)" : "*"}
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
            )}
          </div>

          {/* Teams */}
          <div className="rounded-lg border border-line p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-fg">
              <input type="checkbox" checked={active("teams")} onChange={() => toggle("teams")} />
              {DIGEST_CHANNEL_META.teams.label}
            </label>
            <p className="mt-1 text-xs text-muted">{DIGEST_CHANNEL_META.teams.hint}</p>
            {active("teams") && (
              <label className="mt-3 block max-w-xl">
                <span className="pm-label">
                  Webhook Teams {initial.hasTeamsWebhook ? "(enregistré — laisser vide pour conserver)" : "*"}
                </span>
                <input
                  type="password"
                  className="pm-input font-mono"
                  placeholder={initial.hasTeamsWebhook ? "•••••• (conservé)" : "https://…webhook.office.com/webhookb2/…"}
                  value={teamsWebhook}
                  onChange={(e) => setTeamsWebhook(e.target.value)}
                  autoComplete="off"
                />
              </label>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving} className="pm-btn-primary">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          onClick={sendNow}
          disabled={sending || channels.length === 0}
          className="pm-btn-ghost"
          title={channels.length === 0 ? "Activez au moins un canal" : "Envoyer un briefing de test maintenant"}
        >
          {sending ? "Envoi…" : "Envoyer maintenant"}
        </button>
      </div>

      {sendResults && (
        <section className="pm-card p-5">
          <h3 className="text-sm font-semibold text-heading">Résultat de l'envoi</h3>
          {sendResults.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Aucun canal actif à envoyer.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {sendResults.map((r) => (
                <li key={r.channel} className="flex items-center gap-2 text-sm">
                  <span className={r.ok ? "text-success" : "text-danger"}>{r.ok ? "✓" : "✕"}</span>
                  <span className="font-medium text-fg">{DIGEST_CHANNEL_META[r.channel].label}</span>
                  {r.detail && <span className="text-muted">— {r.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
