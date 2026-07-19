import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SampleResult } from "@/hooks/usePipeline";
import { AlertTriangle, CheckCircle2, FileCode2 } from "lucide-react";

interface Props {
  results: Record<string, SampleResult>;
  chosenLabel: string | null;
  onChoose: (label: string) => void;
}

const severityColor: Record<string, string> = {
  ERROR: "bg-destructive text-destructive-foreground",
  WARNING: "bg-amber-500 text-white",
  INFO: "bg-muted text-muted-foreground",
};

export function ResultsDashboard({ results, chosenLabel, onChoose }: Props) {
  const entries = Object.entries(results);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Scan Results</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {entries.map(([label, r]) => (
          <Card
            key={label}
            className={chosenLabel === label ? "border-primary ring-1 ring-primary" : undefined}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileCode2 className="h-4 w-4" /> {label}
                </CardTitle>
                {chosenLabel === label && (
                  <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    <CheckCircle2 className="h-3 w-3" /> Chosen
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <Metric label="Findings" value={r.totalFindings} />
                <Metric label="Errors" value={r.error} tone="destructive" />
                <Metric label="Warnings" value={r.warning} tone="warning" />
                <Metric label="LOC" value={r.linesOfCode} />
              </div>

              {r.findings.length > 0 && (
                <div className="h-40 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                  {r.findings.map((f, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${severityColor[f.severity] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {f.severity}
                        </span>
                        <span className="text-muted-foreground">
                          line {f.line ?? "?"} · {f.rule}
                        </span>
                      </div>
                      <p className="mt-0.5 text-foreground/90">{f.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {r.findings.length === 0 && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" /> No issues found
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
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "destructive" | "warning";
}) {
  return (
    <div className="rounded-md border border-border p-2">
      <div
        className={
          tone === "destructive"
            ? "text-lg font-bold text-destructive"
            : tone === "warning"
              ? "text-lg font-bold text-amber-500"
              : "text-lg font-bold text-foreground"
        }
      >
        {value}
      </div>
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase text-muted-foreground">
        {tone === "destructive" && <AlertTriangle className="h-3 w-3" />}
        {label}
      </div>
    </div>
  );
}
