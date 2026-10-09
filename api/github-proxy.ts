// api/github-proxy.ts — Vercel Function
//
// Server-side proxy so the GitHub token never reaches the browser.
// Set GITHUB_TOKEN in Vercel → Project Settings → Environment Variables
// (do NOT prefix it with VITE_, or Vite would bundle it into the frontend).
//
// POST /api/github-proxy
//   { action: "dispatch", eventType, dispatchId, snippets }       -> triggers a workflow
//   { action: "result",   dispatchId, tool: "semgrep" | "sonar" }  -> results JSON or { ready: false }

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "Githma724";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "code-quality-hub-main";
const RESULTS_BRANCH = "main";

const ALLOWED_EVENTS = new Set(["code_quality_scan", "code_quality_sonar_scan"]);
const ALLOWED_LANGS = new Set(["python", "javascript", "typescript", "java"]);
const MAX_SNIPPETS = 5;
const MAX_CODE_CHARS = 20_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const gh = (path: string, init: RequestInit = {}) =>
  fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
  });

interface Snippet {
  name?: string;
  code?: string;
  language?: string;
}

export async function POST(request: Request): Promise<Response> {
  if (!GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN is not configured on the server" }, 500);

  try {
    const body = await request.json();
    const { action, dispatchId } = body ?? {};

    if (typeof dispatchId !== "string" || !UUID_RE.test(dispatchId)) {
      return json({ error: "valid dispatchId (UUID) is required" }, 400);
    }

    // ---- trigger a scan ----
    if (action === "dispatch") {
      const { eventType, snippets } = body as { eventType: string; snippets: Snippet[] };

      if (!ALLOWED_EVENTS.has(eventType)) return json({ error: "eventType not allowed" }, 400);
      if (!Array.isArray(snippets) || snippets.length === 0 || snippets.length > MAX_SNIPPETS) {
        return json({ error: `1-${MAX_SNIPPETS} snippets required` }, 400);
      }

      const clean = snippets.map((s) => ({
        name: String(s.name ?? "sample").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "sample",
        code: String(s.code ?? ""),
        language: ALLOWED_LANGS.has(String(s.language)) ? String(s.language) : "python",
      }));
      if (clean.some((s) => !s.code.trim() || s.code.length > MAX_CODE_CHARS)) {
        return json({ error: `each snippet needs code under ${MAX_CODE_CHARS} characters` }, 400);
      }

      const res = await gh("/dispatches", {
        method: "POST",
        body: JSON.stringify({ event_type: eventType, client_payload: { snippets: clean, dispatch_id: dispatchId } }),
      });
      if (!res.ok) return json({ error: `GitHub dispatch failed (${res.status}): ${await res.text()}` }, 502);
      return json({ ok: true, dispatchId });
    }

    // ---- check for results ----
    if (action === "result") {
      const path = body.tool === "sonar" ? `results/${dispatchId}-sonar.json` : `results/${dispatchId}.json`;
      const res = await gh(`/contents/${path}?ref=${RESULTS_BRANCH}`);
      if (res.status === 404) return json({ ready: false });
      if (!res.ok) return json({ error: `GitHub read failed (${res.status})` }, 502);

      const data = (await res.json()) as { content: string };
      const results = JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
      return json({ ready: true, results });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}
