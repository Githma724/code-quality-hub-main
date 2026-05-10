import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GitCompareArrows, Plus, Trash2, Zap } from "lucide-react";

interface Sample {
  id: string;
  label: string;
  code: string;
}

export default function Index() {
  const [samples, setSamples] = useState<Sample[]>([
    { id: crypto.randomUUID(), label: "GPT-4", code: "" },
    { id: crypto.randomUUID(), label: "Claude", code: "" },
  ]);

  const update = (id: string, field: "label" | "code", value: string) =>
    setSamples((s) => s.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const add = () =>
    setSamples((s) => [...s, { id: crypto.randomUUID(), label: `LLM ${s.length + 1}`, code: "" }]);

  const remove = (id: string) =>
    setSamples((s) => (s.length > 1 ? s.filter((x) => x.id !== id) : s));

  const hasCode = samples.some((s) => s.code.trim());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <GitCompareArrows className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">LLM Code Analyzer</h1>
            <p className="text-sm text-muted-foreground">
              Compare code outputs · Static analysis · Vulnerability scanning
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Code Samples</h2>
          <Button variant="outline" size="sm" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Add LLM
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {samples.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={s.label}
                    onChange={(e) => update(s.id, "label", e.target.value)}
                    className="h-8 text-sm font-medium"
                  />
                  {samples.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={s.code}
                  onChange={(e) => update(s.id, "code", e.target.value)}
                  placeholder="Paste code output from this LLM..."
                  className="min-h-[200px] resize-y bg-code font-mono text-sm text-code-foreground"
                  spellCheck={false}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.code.split("\n").length} lines
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button size="lg" disabled={!hasCode} className="w-full">
          <Zap className="mr-2 h-5 w-5" /> Run Analysis Pipeline
        </Button>
      </main>
    </div>
  );
}
