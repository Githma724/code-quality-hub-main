// supabase/functions/log-decision/index.ts
//
// Called when the user finalizes which LLM output they picked.
// Persists it in Supabase (for your own records/dashboard) and forwards
// the same payload to your Google Apps Script webhook, which appends a
// row to your Google Sheet.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { json, handleOptions } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_SHEETS_WEBHOOK_URL = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL")!;

interface DecisionPayload {
  runId: string;
  chosenLabel: string;
  reasons: Record<string, string>;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = (await req.json()) as DecisionPayload;

    if (!body.runId || !body.chosenLabel || !body.reasons) {
      return json({ error: "runId, chosenLabel and reasons are required" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let sheetOk = false;
    let sheetError: string | null = null;

    try {
      const sheetRes = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          runId: body.runId,
          chosenLabel: body.chosenLabel,
          ...body.reasons,
        }),
      });
      sheetOk = sheetRes.ok;
      if (!sheetOk) sheetError = await sheetRes.text();
    } catch (e) {
      sheetError = String(e);
    }

    const { data, error } = await supabase
      .from("decisions")
      .insert({
        run_id: body.runId,
        chosen_label: body.chosenLabel,
        reasons: body.reasons,
        logged_to_sheet: sheetOk,
      })
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);

    return json({ decision: data, loggedToSheet: sheetOk, sheetError });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
