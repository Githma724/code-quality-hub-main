import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ClipboardCopy, ExternalLink, ListChecks } from "lucide-react";
import { LANGUAGE_LABEL, LLM_LINKS, STUDY_TASKS, type StudyTask } from "@/data/studyTasks";

interface Props {
  selectedTaskId: string | null;
  onSelectTask: (task: StudyTask) => void;
}

const STEPS = [
  "Choose ONE task below.",
  "Click “Copy prompt”. Do not change the prompt in any way.",
  "Open ChatGPT, Gemini and Claude, each in a NEW chat, and paste the same prompt into each.",
  "Copy only the code from each answer and paste it into the matching box below (ChatGPT, Gemini, Claude).",
  "Read the three outputs and decide which one you think is safest, remember the output as the form asks this.",
  "Click “Run Analysis” and review the Semgrep and SonarCloud findings.",
  "Choose the output you would actually use, then open the form and answer the questions.",
];

export function TaskPromptPanel({ selectedTaskId, onSelectTask }: Props) {
  const [copied, setCopied] = useState(false);
  const task = STUDY_TASKS.find((t) => t.id === selectedTaskId) ?? null;

  const copy = async () => {
    if (!task) return;
    try {
      await navigator.clipboard.writeText(task.prompt);
    } catch {
      // Fallback for browsers that block the clipboard API
      const el = document.createElement("textarea");
      el.value = task.prompt;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-primary" /> Study instructions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">1. Choose your task</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {STUDY_TASKS.map((t) => {
              const active = t.id === selectedTaskId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTask(t)}
                  aria-pressed={active}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <span className="block text-xs font-semibold">{t.id}</span>
                  <span className="block">{t.title}</span>
                  <span className="block text-xs opacity-70">{LANGUAGE_LABEL[t.language]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {task && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                2. Copy this prompt — {task.id} {task.title} ({LANGUAGE_LABEL[task.language]})
              </p>
              <Button size="sm" variant={copied ? "secondary" : "default"} onClick={copy}>
                {copied ? <Check className="mr-1 h-4 w-4" /> : <ClipboardCopy className="mr-1 h-4 w-4" />}
                {copied ? "Copied" : "Copy prompt"}
              </Button>
            </div>
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-code p-3 font-mono text-sm text-code-foreground">
              {task.prompt}
            </pre>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">3. Paste it into each AI (new chat)</p>
              <div className="flex flex-wrap gap-2">
                {LLM_LINKS.map((l) => (
                  <Button key={l.label} asChild size="sm" variant="outline">
                    <a href={l.url} target="_blank" rel="noreferrer">
                      Open {l.label} <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Paste only the code (no explanations) into the matching box below. The language has been set to{" "}
                {LANGUAGE_LABEL[task.language]} for you.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
