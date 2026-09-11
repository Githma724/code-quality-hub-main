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

export type ToolStatus = "idle" | "running" | "completed" | "failed";

export interface PipelineSample {
  label: string;
  code: string;
  language?: string;
}

interface ToolState {
  status: ToolStatus;
  results: Record<string, SampleResult> | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 72; // ~6 minutes ceiling before giving up

const idleTool: ToolState = { status: "idle", results: null, error: null };

export function usePipeline(token: string) {
  const [dispatchId, setDispatchId] = useState<string | null>(null);
  const [semgrep, setSemgrep] = useState<ToolState>(idleTool);
  const [sonar, setSonar] = useState<ToolState>(idleTool);

  const pollHandle = useRef<number | null>(null);
  const pollCount = useRef(0);
  const semgrepDone = useRef(false);
  const sonarDone = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollHandle.current !== null) {
      clearInterval(pollHandle.current);
      pollHandle.current = null;
    }
  }, []);

  const runPipeline = useCallback(
    async (samples: PipelineSample[]) => {
      stopPolling();
      pollCount.current = 0;
      semgrepDone.current = false;
      sonarDone.current = false;

      if (!token) {
        const failed: ToolState = { status: "failed", results: null, error: "Paste your GitHub token above first." };
        setSemgrep(failed);
        setSonar(failed);
        return;
      }

      setSemgrep({ status: "running", results: null, error: null });
      setSonar({ status: "running", results: null, error: null });

      const snippets: Snippet[] = samples.map((s) => ({
        name: s.label.replace(/[^a-zA-Z0-9_-]/g, "_") || "sample",
        code: s.code,
        language: s.language ?? "python",
      }));

      const id = crypto.randomUUID(); // shared so both result files correlate to one run
      setDispatchId(id);

      const [semgrepDispatch, sonarDispatch] = await Promise.allSettled([
        dispatchScan(token, snippets, { dispatchId: id, eventType: "code_quality_scan" }),
        dispatchScan(token, snippets, { dispatchId: id, eventType: "code_quality_sonar_scan" }),
      ]);

      if (semgrepDispatch.status === "rejected") {
        semgrepDone.current = true;
        setSemgrep({ status: "failed", results: null, error: String(semgrepDispatch.reason) });
      }
      if (sonarDispatch.status === "rejected") {
        sonarDone.current = true;
        setSonar({ status: "failed", results: null, error: String(sonarDispatch.reason) });
      }
      if (semgrepDone.current && sonarDone.current) return;

      pollHandle.current = window.setInterval(async () => {
        pollCount.current += 1;

        if (!semgrepDone.current) {
          try {
            const data = await fetchResultsIfReady(token, id, `results/${id}.json`);
            if (data) {
              setSemgrep({ status: "completed", results: data as Record<string, SampleResult>, error: null });
              semgrepDone.current = true;
            }
          } catch (e) {
            setSemgrep({ status: "failed", results: null, error: String(e) });
            semgrepDone.current = true;
          }
        }

        if (!sonarDone.current) {
          try {
            const data = await fetchResultsIfReady(token, id, `results/${id}-sonar.json`);
            if (data) {
              setSonar({ status: "completed", results: data as Record<string, SampleResult>, error: null });
              sonarDone.current = true;
            }
          } catch (e) {
            setSonar({ status: "failed", results: null, error: String(e) });
            sonarDone.current = true;
          }
        }

        if (semgrepDone.current && sonarDone.current) {
          stopPolling();
          return;
        }

        if (pollCount.current >= MAX_POLLS) {
          if (!semgrepDone.current) {
            setSemgrep({ status: "failed", results: null, error: "Timed out waiting for Semgrep. Check the Actions tab on GitHub." });
          }
          if (!sonarDone.current) {
            setSonar({ status: "failed", results: null, error: "Timed out waiting for SonarCloud. Check the Actions tab on GitHub." });
          }
          stopPolling();
        }
      }, POLL_INTERVAL_MS);
    },
    [token, stopPolling],
  );

  return { dispatchId, semgrep, sonar, runPipeline };
}