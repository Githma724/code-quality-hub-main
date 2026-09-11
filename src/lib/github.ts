
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
  options?: { dispatchId?: string; eventType?: string },
): Promise<string> {
  const dispatchId = options?.dispatchId ?? crypto.randomUUID();
  const eventType = options?.eventType ?? "code_quality_scan";

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
    {
      method: "POST",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
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
  resultsPath?: string,
): Promise<unknown | null> {
  const path = resultsPath ?? `results/${dispatchId}.json`;

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
