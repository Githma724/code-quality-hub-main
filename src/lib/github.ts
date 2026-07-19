// src/lib/github.ts
//
// Talks to GitHub directly from the browser — no backend needed.
// Two calls only:
//   1. dispatchScan()          -> POST /dispatches (triggers the workflow)
//   2. fetchResultsIfReady()   -> GET  /contents/results/{id}.json
//
// Why not download the GitHub Actions "artifact" the normal way? Because
// that endpoint redirects to a signed blob-storage URL that doesn't send
// CORS headers, so browsers refuse to read it. Instead, the workflow
// commits results.json straight into the repo, and we just poll for that
// file's existence via the Contents API (which does support CORS).

export const GITHUB_OWNER = "Githma724";
export const GITHUB_REPO = "code-quality-hub-main";
export const RESULTS_BRANCH = "main";

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };
}

export interface Snippet {
  name: string;
  code: string;
  language?: string;
}

export async function dispatchScan(
  token: string,
  snippets: Snippet[],
): Promise<string> {
  const dispatchId = crypto.randomUUID();

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
    {
      method: "POST",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "code_quality_scan",
        client_payload: { snippets, dispatch_id: dispatchId },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub dispatch failed (${res.status}): ${text}`);
  }

  return dispatchId;
}

/** Returns the parsed results, or null if the workflow hasn't finished (committed the file) yet. */
export async function fetchResultsIfReady(
  token: string,
  dispatchId: string,
): Promise<unknown | null> {
  const path = `results/${dispatchId}.json`;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${RESULTS_BRANCH}`,
    { headers: ghHeaders(token) },
  );

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error(`Failed to check for results (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const jsonText = decodeURIComponent(
    atob(data.content.replace(/\n/g, ""))
      .split("")
      .map((c: string) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
  return JSON.parse(jsonText);
}
