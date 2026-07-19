// supabase/functions/run-pipeline/index.ts
//
// Kicks off one pipeline run:
//  1. inserts a `pipeline_runs` row (status=pending)
//  2. fires a repository_dispatch event to GitHub, which triggers
//     .github/workflows/code-quality.yml
// The frontend then polls `pipeline-status` with the returned runId.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, json, handleOptions } from "../_shared/cors.ts";

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")!;
const GITHUB_OWNER = Deno.env.get("GITHUB_OWNER") ?? "Githma724";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") ?? "code-quality-hub-main";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Sample {
  label: string;
  code: string;
  language?: string;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { samples } = (await req.json()) as { samples: Sample[] };

    if (!Array.isArray(samples) || samples.length === 0) {
      return json({ error: "samples[] is required" }, 400);
    }
    if (samples.some((s) => !s.code?.trim())) {
      return json({ error: "every sample needs non-empty code" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const dispatchId = crypto.randomUUID();

    const { data: run, error: insertError } = await supabase
      .from("pipeline_runs")
      .insert({ dispatch_id: dispatchId, status: "pending", samples })
      .select()
      .single();

    if (insertError) return json({ error: insertError.message }, 500);

    const snippets = samples.map((s) => ({
      name: s.label.replace(/[^a-zA-Z0-9_-]/g, "_") || "sample",
      code: s.code,
      language: s.language ?? "python",
    }));

    const dispatchRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "code_quality_scan",
          client_payload: { snippets, dispatch_id: dispatchId },
        }),
      },
    );

    if (!dispatchRes.ok) {
      const text = await dispatchRes.text();
      await supabase
        .from("pipeline_runs")
        .update({ status: "failed", error: `GitHub dispatch failed: ${text}` })
        .eq("id", run.id);
      return json({ error: `GitHub dispatch failed: ${text}` }, 502);
    }

    return json({ runId: run.id, dispatchId });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
