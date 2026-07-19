// supabase/functions/pipeline-status/index.ts
//
// Called repeatedly by the frontend (e.g. every 4s) with { runId }.
// - Finds the matching GitHub Actions run (matched by the dispatch_id we
//   embedded in the workflow's `run-name`).
// - While it's in progress, returns status "running".
// - Once complete, downloads the `scan-results` artifact zip, extracts
//   results.json, stores it on the pipeline_runs row, and returns it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { json, handleOptions } from "../_shared/cors.ts";

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")!;
const GITHUB_OWNER = Deno.env.get("GITHUB_OWNER") ?? "Githma724";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") ?? "code-quality-hub-main";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ghHeaders = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
};

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { runId } = (await req.json()) as { runId: string };
    if (!runId) return json({ error: "runId is required" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: run, error } = await supabase
      .from("pipeline_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (error || !run) return json({ error: "run not found" }, 404);

    if (run.status === "completed" || run.status === "failed") {
      return json(run);
    }

    // Step 1: find the GitHub Actions run for this dispatch, if we haven't yet.
    let githubRunId = run.github_run_id as number | null;

    if (!githubRunId) {
      const runsRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/code-quality.yml/runs?event=repository_dispatch&per_page=15`,
        { headers: ghHeaders },
      );
      const runsJson = await runsRes.json();
      const match = (runsJson.workflow_runs ?? []).find((r: any) =>
        typeof r.name === "string" && r.name.includes(run.dispatch_id)
      );

      if (!match) {
        // GitHub Actions can take a few seconds to register the run.
        return json({ ...run, status: "pending" });
      }

      githubRunId = match.id;
      await supabase
        .from("pipeline_runs")
        .update({ github_run_id: githubRunId, status: "running" })
        .eq("id", run.id);
    }

    // Step 2: check the run's status.
    const ghRunRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${githubRunId}`,
      { headers: ghHeaders },
    );
    const ghRun = await ghRunRes.json();

    if (ghRun.status !== "completed") {
      return json({ ...run, github_run_id: githubRunId, status: "running" });
    }

    if (ghRun.conclusion !== "success") {
      const failMsg = `Workflow finished with conclusion: ${ghRun.conclusion}`;
      await supabase
        .from("pipeline_runs")
        .update({ status: "failed", error: failMsg })
        .eq("id", run.id);
      return json({ ...run, status: "failed", error: failMsg });
    }

    // Step 3: download + unzip the scan-results artifact.
    const artifactsRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${githubRunId}/artifacts`,
      { headers: ghHeaders },
    );
    const artifactsJson = await artifactsRes.json();
    const artifact = (artifactsJson.artifacts ?? []).find(
      (a: any) => a.name === "scan-results",
    );

    if (!artifact) {
      const failMsg = "No scan-results artifact was produced by the workflow";
      await supabase
        .from("pipeline_runs")
        .update({ status: "failed", error: failMsg })
        .eq("id", run.id);
      return json({ ...run, status: "failed", error: failMsg });
    }

    const zipRes = await fetch(artifact.archive_download_url, {
      headers: ghHeaders,
    });
    const zipBuf = new Uint8Array(await zipRes.arrayBuffer());
    const zip = await JSZip.loadAsync(zipBuf);
    const resultsFile = zip.file("results.json");

    if (!resultsFile) {
      const failMsg = "results.json missing from scan-results artifact";
      await supabase
        .from("pipeline_runs")
        .update({ status: "failed", error: failMsg })
        .eq("id", run.id);
      return json({ ...run, status: "failed", error: failMsg });
    }

    const resultsText = await resultsFile.async("string");
    const results = JSON.parse(resultsText);

    await supabase
      .from("pipeline_runs")
      .update({ status: "completed", results })
      .eq("id", run.id);

    return json({ ...run, status: "completed", results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
