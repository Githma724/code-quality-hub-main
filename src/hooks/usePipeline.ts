import { useCallback, useRef, useState } from "react";
import { dispatchScan, fetchResultsIfReady, type Snippet } from "@/lib/github";

export interface Finding {
  severity: string;
  message: string;
  line: number | null;
  rule: string;
}

export interface SampleResult {
  linesOfCode: number;
  critical: number;
  error: number;
  warning: number;
  info: number;
  totalFindings: number;
  findings: Finding[];
}

export type PipelineStatus = "idle" | "running" | "completed" | "failed";

export interface PipelineSample {
  label: string;
  code: string;
  language?: string;
}

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 72; // ~6 minutes ceiling before giving up

export function usePipeline(token: string) {
  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [results, setResults] = useState<Record<string, SampleResult> | null>(null);
  const [dispatchId, setDispatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollHandle = useRef<number | null>(null);
  const pollCount = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollHandle.current !== null) {
      clearInterval(pollHandle.current);
      pollHandle.current = null;
    }
  }, []);

  const runPipeline = useCallback(
    async (samples: PipelineSample[]) => {
      stopPolling();
      setError(null);
      setResults(null);
      pollCount.current = 0;

      if (!token) {
        setStatus("failed");
        setError("Paste your GitHub token above first.");
        return;
      }

      setStatus("running");

      const snippets: Snippet[] = samples.map((s) => ({
        name: s.label.replace(/[^a-zA-Z0-9_-]/g, "_") || "sample",
        code: s.code,
        language: s.language ?? "python",
      }));

      let id: string;
      try {
        id = await dispatchScan(token, snippets);
      } catch (e) {
        setStatus("failed");
        setError(String(e));
        return;
      }

      setDispatchId(id);

      pollHandle.current = window.setInterval(async () => {
        pollCount.current += 1;

        try {
          const data = await fetchResultsIfReady(token, id);

          if (data) {
            setResults(data as Record<string, SampleResult>);
            setStatus("completed");
            stopPolling();
            return;
          }
        } catch (e) {
          setStatus("failed");
          setError(String(e));
          stopPolling();
          return;
        }

        if (pollCount.current >= MAX_POLLS) {
          setStatus("failed");
          setError(
            "Timed out waiting for the workflow to finish. Check the Actions tab on GitHub.",
          );
          stopPolling();
        }
      }, POLL_INTERVAL_MS);
    },
    [token, stopPolling],
  );

  return { status, results, dispatchId, error, runPipeline };
}
