import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Zap } from "lucide-react";

export interface CodeSample {
  id: string;
  label: string;
  code: string;
}

interface Props {
  samples: CodeSample[];
  onSamplesChange: (s: CodeSample[]) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onRunSonar?: () => void;
  isSonarRunning?: boolean;
}

export function CodeInputPanel({ samples, onSamplesChange, onAnalyze, isAnalyzing, onRunSonar, isSonarRunning }: Props) {
  const addSample = () => {
    onSamplesChange([
      ...samples,
      { id: crypto.randomUUID(), label: `LLM ${samples.length + 1}`, code: "" },
    ]);
  };

  const removeSample = (id: string) => {
    if (samples.length <= 2) return;
    onSamplesChange(samples.filter(s => s.id !== id));
  };

  const update = (id: string, field: "label" | "code", value: string) => {
    onSamplesChange(samples.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const hasCode = samples.some(s => s.code.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Code Samples</h2>
        <Button variant="outline" size="sm" onClick={addSample}>
          <Plus className="mr-1 h-4 w-4" /> Add LLM
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {samples.map((sample) => (
          <Card key={sample.id} className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Input
                  value={sample.label}
                  onChange={(e) => update(sample.id, "label", e.target.value)}
                  className="h-8 text-sm font-medium"
                  placeholder="Model name"
                />
                {samples.length > 2 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeSample(sample.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sample.code}
                onChange={(e) => update(sample.id, "code", e.target.value)}
                placeholder="Paste code output from this LLM..."
                className="min-h-[200px] font-mono text-sm bg-code text-code-foreground resize-y"
                spellCheck={false}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {sample.code.split("\n").length} lines
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Button onClick={onAnalyze} disabled={!hasCode || isAnalyzing} size="lg">
          <Zap className="mr-2 h-5 w-5" />
          {isAnalyzing ? "Analyzing…" : "Run Local Analysis"}
        </Button>
        {onRunSonar && (
          <Button onClick={onRunSonar} disabled={!hasCode || isSonarRunning} size="lg" variant="secondary">
            {isSonarRunning ? "Scanning on SonarCloud…" : "Run on SonarCloud"}
          </Button>
        )}
      </div>
    </div>
  );
}
