#!/usr/bin/env node
/**
 * Test de charge Aperio — sans dépendance (fetch natif Node ≥ 18).
 *
 * Scénario :
 *   1. Inscrit un admin, seede N projets (défaut 50).
 *   2. Phase LECTURE : frappe GET /projects et GET /projects/:id en concurrence,
 *      mesure débit et percentiles de latence.
 *   3. Phase ASYNC : enfile un sync par projet, mesure le temps de vidage de la
 *      file (dépend du nombre de workers) et l'issue des jobs.
 *
 * Usage :
 *   node scripts/loadtest.mjs --api http://localhost:4100 --projects 50 \
 *        --duration 15 --concurrency 50
 */
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);
const API = args.api ?? "http://localhost:4100";
const N = Number(args.projects ?? 50);
const DURATION = Number(args.duration ?? 15) * 1000;
const CONCURRENCY = Number(args.concurrency ?? 50);
const PASSWORD = "loadTestPass123";

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

async function j(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text }; // réponses non-JSON (ex. 429 rate-limit en texte)
  }
  return { status: res.status, body: parsed };
}

async function main() {
  console.log(`▶ Cible ${API} — ${N} projets, lecture ${DURATION / 1000}s @ concurrence ${CONCURRENCY}\n`);

  // 1. Auth + seed
  const email = `load_${Date.now()}@aperio.io`;
  const reg = await j("POST", "/api/v1/auth/register", null, { email, password: PASSWORD, name: "Load" });
  const token = reg.body?.tokens?.accessToken;
  if (!token) throw new Error(`register a échoué: ${JSON.stringify(reg.body)}`);

  const seedStart = Date.now();
  const ids = [];
  for (let i = 0; i < N; i += 10) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(10, N - i) }, (_, k) =>
        j("POST", "/api/v1/projects", token, { name: `Load #${i + k}`, repo: "octocat/Hello-World" }),
      ),
    );
    for (const b of batch) ids.push(b.body.id);
  }
  console.log(`✓ ${ids.length} projets créés en ${Date.now() - seedStart} ms\n`);

  // 2. Phase LECTURE — workers concurrents pendant DURATION
  const latencies = [];
  let ok = 0;
  let errors = 0;
  const endAt = Date.now() + DURATION;
  async function reader() {
    while (Date.now() < endAt) {
      const id = ids[(Math.random() * ids.length) | 0];
      const path = Math.random() < 0.5 ? "/api/v1/projects" : `/api/v1/projects/${id}`;
      const t0 = performance.now();
      try {
        const r = await j("GET", path, token);
        const dt = performance.now() - t0;
        latencies.push(dt);
        if (r.status === 200) ok++;
        else errors++;
      } catch {
        errors++;
      }
    }
  }
  const readStart = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, reader));
  const readSecs = (Date.now() - readStart) / 1000;
  latencies.sort((a, b) => a - b);
  const total = ok + errors;
  console.log("── Phase LECTURE ──");
  console.log(`  requêtes      : ${total}  (ok ${ok} / err ${errors})`);
  console.log(`  débit         : ${(total / readSecs).toFixed(0)} req/s`);
  console.log(`  latence p50   : ${pct(latencies, 50).toFixed(1)} ms`);
  console.log(`  latence p95   : ${pct(latencies, 95).toFixed(1)} ms`);
  console.log(`  latence p99   : ${pct(latencies, 99).toFixed(1)} ms`);
  console.log(`  latence max   : ${latencies[latencies.length - 1].toFixed(1)} ms\n`);

  // 2bis. Phase LECTURE AVANCÉE — routes analytiques (briefing, forecast,
  //        resourcing, members). Ces routes agrègent des données : on vérifie
  //        qu'elles tiennent la charge concurrente sans erreur.
  const advRoutes = [
    () => "/api/v1/briefing",
    () => "/api/v1/members",
    () => `/api/v1/projects/${ids[(Math.random() * ids.length) | 0]}/forecast`,
    () => `/api/v1/projects/${ids[(Math.random() * ids.length) | 0]}/resourcing`,
  ];
  const advLat = [];
  let advOk = 0;
  let advErr = 0;
  const advEndAt = Date.now() + DURATION;
  async function advReader() {
    while (Date.now() < advEndAt) {
      const path = advRoutes[(Math.random() * advRoutes.length) | 0]();
      const t0 = performance.now();
      try {
        const r = await j("GET", path, token);
        advLat.push(performance.now() - t0);
        if (r.status === 200) advOk++;
        else advErr++;
      } catch {
        advErr++;
      }
    }
  }
  const advStart = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, advReader));
  const advSecs = (Date.now() - advStart) / 1000;
  advLat.sort((a, b) => a - b);
  const advTotal = advOk + advErr;
  console.log("── Phase LECTURE AVANCÉE (briefing / forecast / resourcing / members) ──");
  console.log(`  requêtes      : ${advTotal}  (ok ${advOk} / err ${advErr})`);
  console.log(`  débit         : ${(advTotal / advSecs).toFixed(0)} req/s`);
  console.log(`  latence p50   : ${pct(advLat, 50).toFixed(1)} ms`);
  console.log(`  latence p95   : ${pct(advLat, 95).toFixed(1)} ms`);
  console.log(`  latence p99   : ${pct(advLat, 99).toFixed(1)} ms\n`);

  // 3. Phase ASYNC — enfile un sync par projet, mesure le vidage
  console.log("── Phase ASYNC (enqueue + drain) ──");
  const enqStart = Date.now();
  const jobIds = [];
  for (let i = 0; i < ids.length; i += 20) {
    const batch = await Promise.all(
      ids.slice(i, i + 20).map((id) => j("POST", `/api/v1/projects/${id}/sync`, token)),
    );
    for (const b of batch) if (b.body?.jobId) jobIds.push(b.body.jobId);
  }
  console.log(`  ${jobIds.length} jobs enfilés en ${Date.now() - enqStart} ms (202 immédiat)`);

  const drainStart = Date.now();
  const terminal = new Map();
  while (terminal.size < jobIds.length && Date.now() - drainStart < 120000) {
    const pending = jobIds.filter((id) => !terminal.has(id));
    const results = await Promise.all(pending.map((id) => j("GET", `/api/v1/jobs/${id}`, token)));
    results.forEach((r, k) => {
      const s = r.body?.status;
      if (s === "done" || s === "failed") terminal.set(pending[k], s);
    });
    if (terminal.size < jobIds.length) await new Promise((r) => setTimeout(r, 500));
  }
  const drainSecs = (Date.now() - drainStart) / 1000;
  const done = [...terminal.values()].filter((s) => s === "done").length;
  const failed = [...terminal.values()].filter((s) => s === "failed").length;
  console.log(`  file vidée en : ${drainSecs.toFixed(1)} s  (${(jobIds.length / drainSecs).toFixed(1)} jobs/s)`);
  console.log(`  issues        : done ${done} / failed ${failed} / en cours ${jobIds.length - terminal.size}`);
  console.log(`\n✓ Test terminé.`);
}

main().catch((e) => {
  console.error("✗ Load test échoué:", e.message);
  process.exit(1);
});
