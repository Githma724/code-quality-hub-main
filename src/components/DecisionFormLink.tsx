import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ClipboardCopy, ExternalLink } from "lucide-react";

// Paste your Google Form's public link here.
const GOOGLE_FORM_URL = "https://forms.gle/nivyj6h5gkajLWCY9";

interface Props {
  chosenLabel: string;
  sessionId: string | null;
  taskLabel: string | null;
  languageLabel?: string | null;
}

export function DecisionFormLink({ chosenLabel, sessionId, taskLabel, languageLabel }: Props) {
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    if (!sessionId) return;
    await navigator.clipboard.writeText(sessionId).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          You chose <span className="text-primary">{chosenLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="mb-1 text-muted-foreground">Enter these in the form:</p>
          {taskLabel && (
            <p>
              <span className="font-medium text-foreground">Task:</span> {taskLabel}
            </p>
          )}
          {languageLabel && (
            <p>
              <span className="font-medium text-foreground">Language:</span> {languageLabel}
            </p>
          )}
          {sessionId && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">Session ID:</span>
              <code className="rounded bg-code px-2 py-0.5 font-mono text-xs text-code-foreground">{sessionId}</code>
              <Button size="sm" variant="ghost" onClick={copyId} className="h-7 px-2">
                {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          )}
          <p>
            <span className="font-medium text-foreground">Output chosen:</span> {chosenLabel}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Log why you picked this output, the trade-offs you accepted and your confidence in the form.
        </p>
        <Button asChild className="w-full">
          <a href={GOOGLE_FORM_URL} target="_blank" rel="noreferrer">
            Open Google Form <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
