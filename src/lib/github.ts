// All GitHub calls go through the /api/github-proxy Vercel Function.
// The GitHub token lives only in Vercel environment variables — it is never shipped to the browser.

export interface Snippet {
  name: string;
  code: string;
  language?: string;
}

async function callProxy<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/github-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `Proxy returned ${res.status}` }));
  if (!res.ok || data?.error) throw new Error(data?.error ?? `Proxy returned ${res.status}`);
  return data as T;
}

export async function dispatchScan(
  snippets: Snippet[],
  options?: { dispatchId?: string; eventType?: string },
): Promise<string> {
  const dispatchId = options?.dispatchId ?? crypto.randomUUID();
  const eventType = options?.eventType ?? "code_quality_scan";
  await callProxy({ action: "dispatch", eventType, dispatchId, snippets });
  return dispatchId;
}

/** Returns the parsed results, or null if the workflow hasn't committed the file yet. */
export async function fetchResultsIfReady(
  dispatchId: string,
  tool: "semgrep" | "sonar",
): Promise<unknown | null> {
  const data = await callProxy<{ ready: boolean; results?: unknown }>({ action: "result", dispatchId, tool });
  return data.ready ? data.results ?? null : null;
}