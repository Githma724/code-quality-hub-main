import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SampleResult, Finding } from "@/hooks/usePipeline";
import { AlertTriangle, CheckCircle2, FileCode2, Pencil, Check, Loader2 } from "lucide-react";

interface CodeByLabel {
  label: string;
  code: string;
}

interface Props {
  semgrepResults: Record<string, SampleResult>;
  sonarResults: Record<string, SampleResult>;
  isSonarRunning: boolean;
  samples: CodeByLabel[];
  chosenLabel: string | null;
  onChoose: (label: string) => void;
  onCodeChange?: (label: string, code: string) => void;
}

const severityColor: Record<string, string> = {
  ERROR: "bg-destructive text-destructive-foreground",
  WARNING: "bg-amber-500 text-white",
  INFO: "bg-muted text-muted-foreground",
};

const severityLineBg: Record<string, string> = {
  ERROR: "bg-destructive/10 border-l-2 border-destructive",
  WARNING: "bg-amber-500/10 border-l-2 border-amber-500",
  INFO: "bg-muted/50 border-l-2 border-muted-foreground",
};

export function ResultsDashboard({
  semgrepResults, sonarResults, isSonarRunning, samples, chosenLabel, onChoose, onCodeChange,
}: Props) {
  const labels = Object.keys(semgrepResults);

  const [codeByLabel, setCodeByLabel] = useState<Record<string, string>>(() =>
    Object.fromEntries(samples.map((s) => [s.label, s.code])),
  );
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  const setCode = (label: string, code: string) => {
    setCodeByLabel((prev) => ({ ...prev, [label]: code }));
    onCodeChange?.(label, code);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Scan Results</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {labels.map((label) => {
          const code = codeByLabel[label] ?? "";
          const isEditing = editingLabel === label;
          const sg = semgrepResults[label];
          const sc = sonarResults[label];
          const sonarPending = !sc && isSonarRunning;

          // line -> findings from BOTH tools, tagged, for the inline code view
          const findingsByLine = new Map<number, (Finding & { tool: "semgrep" | "sonarcloud" })[]>();
          const tag = (f: Finding, tool: "semgrep" | "sonarcloud") => {
            if (f.line == null) return;
            const arr = findingsByLine.get(f.line) ?? [];
            arr.push({ ...f, tool });
            findingsByLine.set(f.line, arr);
          };
          sg?.findings.forEach((f) => tag(f, "semgrep"));
          sc?.findings.forEach((f) => tag(f, "sonarcloud"));

          const originalCode = samples.find((s) => s.label === label)?.code ?? "";
          const wasEdited = code !== originalCode;

          return (
            <Card
              key={label}
              className={chosenLabel === label ? "border-primary ring-1 ring-primary" : undefined}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileCode2 className="h-4 w-4" /> {label}
                    {wasEdited && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-normal text-secondary-foreground">
                        edited
                      </span>
                    )}
                  </CardTitle>
                  {chosenLabel === label && (
                    <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Chosen
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ToolMetricRow toolLabel="Semgrep" result={sg} />
                <ToolMetricRow toolLabel="SonarCloud" result={sc} pending={sonarPending} />

                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Code</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 gap-1 px-2 text-xs"
                    onClick={() => setEditingLabel(isEditing ? null : label)}
                  >
                    {isEditing ? (<><Check className="h-3 w-3" /> Done</>) : (<><Pencil className="h-3 w-3" /> Edit</>)}
                  </Button>
                </div>

                {isEditing ? (
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(label, e.target.value)}
                    className="min-h-[180px] font-mono text-xs bg-code text-code-foreground resize-y"
                    spellCheck={false}
                  />
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-md border border-border font-mono text-xs">
                    {code.split("\n").map((lineText, idx) => {
                      const lineNo = idx + 1;
                      const lineFindings = findingsByLine.get(lineNo);
                      return (
                        <div key={idx} className={lineFindings ? severityLineBg[lineFindings[0].severity] ?? "" : ""}>
                          <div className="flex px-2 py-0.5">
                            <span className="mr-3 select-none text-muted-foreground/60">{lineNo}</span>
                            <span className="whitespace-pre text-foreground/90">{lineText || " "}</span>
                          </div>
                          {lineFindings?.map((f, i) => (
                            <div key={i} className="ml-8 flex items-start gap-2 pb-1 pr-2">
                              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${severityColor[f.severity] ?? "bg-muted text-muted-foreground"}`}>
                                {f.severity}
                              </span>
                              <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                                {f.tool === "sonarcloud" ? "Sonar" : "Semgrep"}
                              </span>
                              <span className="text-muted-foreground">{f.rule} — {f.message}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                {(sg?.findings.length ?? 0) === 0 && (sc?.findings.length ?? 0) === 0 && !sonarPending && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" /> No issues found by either tool
                  </p>
                )}

                <Button
                  size="sm"
                  variant={chosenLabel === label ? "secondary" : "outline"}
                  className="w-full"
                  onClick={() => onChoose(label)}
                >
                  {chosenLabel === label ? "Selected as final choice" : "Choose this output"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ToolMetricRow({
  toolLabel, result, pending,
}: {
  toolLabel: string;
  result?: SampleResult;
  pending?: boolean;
}) {
  return (
    <div className="rounded-md border border-border p-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{toolLabel}</p>
      {pending ? (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for results…
        </div>
      ) : result ? (
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <Metric label="Findings" value={result.totalFindings} />
          <Metric label="Errors" value={result.error} tone="destructive" />
          <Metric label="Warnings" value={result.warning} tone="warning" />
          <Metric label="LOC" value={result.linesOfCode} />
        </div>
      ) : (
        <p className="py-1 text-xs text-muted-foreground">Not run</p>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "destructive" | "warning" }) {
  return (
    <div className="rounded-md border border-border p-1.5">
      <div className={tone === "destructive" ? "text-base font-bold text-destructive" : tone === "warning" ? "text-base font-bold text-amber-500" : "text-base font-bold text-foreground"}>
        {value}
      </div>
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase text-muted-foreground">
        {tone === "destructive" && <AlertTriangle className="h-2.5 w-2.5" />}
        {label}
      </div>
    </div>
  );
}