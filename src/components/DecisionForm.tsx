import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  runId: string;
  chosenLabel: string;
  onLogged: () => void;
}

const QUESTIONS: { key: string; label: string; placeholder: string }[] = [
  {
    key: "whyChosen",
    label: "Why did you choose this output over the others?",
    placeholder: "e.g. fewer vulnerabilities, cleaner structure, correct edge-case handling…",
  },
  {
    key: "tradeoffs",
    label: "What tradeoffs or weaknesses did you accept by picking it?",
    placeholder: "e.g. slightly more verbose, missed one input validation case…",
  },
  {
    key: "confidence",
    label: "How confident are you this is genuinely the best output? Why?",
    placeholder: "e.g. high confidence — semgrep flagged 0 issues and it matched the spec…",
  },
  {
    key: "notes",
    label: "Anything else worth logging for the final analysis?",
    placeholder: "Optional notes",
  },
];

export function DecisionForm({ runId, chosenLabel, onLogged }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const setAnswer = (key: string, value: string) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  const canSubmit = answers.whyChosen?.trim().length > 0;

  const submit = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("log-decision", {
      body: { runId, chosenLabel, reasons: answers },
    });
    setSubmitting(false);

    if (error || data?.error) {
      toast({
        variant: "destructive",
        title: "Failed to log decision",
        description: error?.message ?? data?.error,
      });
      return;
    }

    toast({
      title: "Decision logged",
      description: data.loggedToSheet
        ? "Saved to Supabase and appended to your Google Sheet."
        : "Saved to Supabase, but the Google Sheet append failed — check the webhook URL.",
    });
    onLogged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Log your decision for <span className="text-primary">{chosenLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {QUESTIONS.map((q) => (
          <div key={q.key} className="space-y-1.5">
            <Label htmlFor={q.key}>{q.label}</Label>
            <Textarea
              id={q.key}
              value={answers[q.key] ?? ""}
              onChange={(e) => setAnswer(q.key, e.target.value)}
              placeholder={q.placeholder}
              className="min-h-[70px]"
            />
          </div>
        ))}
        <Button onClick={submit} disabled={!canSubmit || submitting} className="w-full">
          {submitting ? "Logging…" : "Log decision to Google Sheet"}
        </Button>
      </CardContent>
    </Card>
  );
}
