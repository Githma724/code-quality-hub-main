# Setup Guide — LLM Code Analyzer Pipeline (no backend)

This adds: an editable multi-LLM input panel → a "Run Pipeline" button that
triggers your existing Semgrep workflow directly on GitHub Actions → a
results dashboard with vulnerability/warning counts and findings per LLM.
The Google Form for logging your final decision is kept fully separate, as
you asked — just a link, no API integration.

**No backend, no database, no Supabase.** The browser talks straight to
GitHub's API. This only works because:
- GitHub's REST API supports cross-origin (CORS) requests, so the browser
  can call it directly with a token in the `Authorization` header.
- Real GitHub Actions **artifacts** don't support this (their download
  link redirects to blob storage with no CORS headers), so instead the
  workflow commits `results.json` straight into the repo, and the browser
  just checks "does this file exist yet?" via the Contents API.

The one tradeoff: your GitHub token lives in the browser (sessionStorage,
cleared when you close the tab) and is visible in DevTools' Network tab.
That's a reasonable tradeoff for a personal research tool that only you
use — just don't deploy this publicly with your real token pasted in.

## 1. Copy these files into your repo

```
.github/workflows/code-quality.yml   (replaces the existing one)
src/lib/github.ts
src/hooks/usePipeline.ts
src/components/GithubTokenInput.tsx
src/components/ResultsDashboard.tsx
src/components/DecisionFormLink.tsx
src/pages/Index.tsx                  (replaces the existing one)
```

## 2. Create a GitHub token

1. GitHub → your profile picture → **Settings** → **Developer settings**
   → **Personal access tokens** → **Fine-grained tokens** → **Generate new
   token**.
2. Resource owner: your account. Repository access: only
   `code-quality-hub-main`.
3. Permissions → Repository permissions:
   - **Actions**: Read and write (lets you trigger the workflow)
   - **Contents**: Read and write (lets the workflow commit results.json,
     and lets you read it back)
4. Generate, then copy the token (starts with `github_pat_...`) — you only
   see it once.

## 3. Point the Google Form link at your form

Open `src/components/DecisionFormLink.tsx` and replace:
```ts
const GOOGLE_FORM_URL = "https://forms.gle/REPLACE_ME";
```
with your form's actual share link. Nothing else is needed — no entry IDs,
no submission code, since you're handling that separately.

## 4. Run it

```bash
npm install
npm run dev
```

Open the local URL, paste your GitHub token into the box at the top of the
page (saved for the browser session only), paste code for each LLM, and
click **Run Local Analysis**.

## How a run flows end-to-end

1. Clicking the button calls `dispatchScan()`, which POSTs a
   `repository_dispatch` event straight to `api.github.com` with your
   snippets, using your token.
2. `.github/workflows/code-quality.yml` picks it up, writes each snippet to
   its own file, runs Semgrep (`--config auto` + security-audit +
   owasp-top-ten), aggregates per-label counts into `results.json`, and
   **commits it into the repo** at `results/{dispatch_id}.json` using the
   `actions/github-script` step (no artifact download needed).
3. The frontend polls `fetchResultsIfReady()` every 5s, which calls the
   Contents API for that exact path. While it 404s, the workflow's still
   running. Once it 200s, the JSON is base64-decoded and shown on the
   dashboard.
4. You pick a winning output on the dashboard, then click through to your
   Google Form to log why — completely separate from this app.

## Known limitations

- `results/` will accumulate one JSON file per run, committed straight to
  `main`. Fine for a research tool; if it bothers you later, point the
  commit step at a dedicated `results-data` branch instead, or add a
  cleanup job that periodically prunes old files.
- `CodeInputPanel` doesn't collect a per-sample language yet, so the
  workflow defaults every snippet to Python for file-extension purposes.
  Add a language `<Select>` per sample and thread it through
  `handleRun` in `Index.tsx` if you're testing JS/Java/etc. outputs.
- SonarCloud metrics (complexity, code smells, duplication) aren't
  included — you asked to skip that and stick to Semgrep for now. The
  workflow has a natural seam to add a second job for it later.
- Your GitHub token is visible in the browser's Network tab while this
  runs — acceptable for solo use, not something to share or deploy
  publicly as-is.
