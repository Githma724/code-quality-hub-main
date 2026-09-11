import { useState } from "react";
import { Link } from "react-router-dom";
import { CodeInputPanel, type CodeSample } from "@/components/CodeInputPanel";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { DecisionFormLink } from "@/components/DecisionFormLink";
import { GithubTokenInput, getStoredToken } from "@/components/GithubTokenInput";
import { usePipeline } from "@/hooks/usePipeline";
import { BarChart3, GitCompareArrows } from "lucide-react";

export default function Index() {
  const [token, setToken] = useState(getStoredToken());
  const [samples, setSamples] = useState<CodeSample[]>([
    { id: crypto.randomUUID(), label: "GPT-4", code: "", language: "javascript" },
    { id: crypto.randomUUID(), label: "Claude", code: "", language: "javascript" },
    { id: crypto.randomUUID(), label: "Gemini", code: "", language: "javascript" },
  ]);
  const [chosenLabel, setChosenLabel] = useState<string | null>(null);

  const { semgrep, sonar, runPipeline } = usePipeline(token);

  const isAnalyzing = semgrep.status === "running";
  const isSonarRunning = sonar.status === "running";
  const anyResults = semgrep.results || sonar.results;

  const handleRun = () => {
    setChosenLabel(null);
    runPipeline(
      samples
        .filter((s) => s.code.trim())
        .map((s) => ({ label: s.label, code: s.code, language: s.language })),
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <GitCompareArrows className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">LLM Code Analyzer</h1>
            <p className="text-sm text-muted-foreground">
              Paste LLM outputs · Run Semgrep + SonarCloud via GitHub Actions · Log your final call
            </p>
          </div>
          <Link
            to="/stats"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <BarChart3 className="h-4 w-4" /> Selection Stats
          </Link>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-8">
        <GithubTokenInput token={token} onTokenChange={setToken} />

        <CodeInputPanel
          samples={samples}
          onSamplesChange={setSamples}
          onRunBoth={handleRun}
          isAnalyzing={isAnalyzing}
          isSonarRunning={isSonarRunning}
        />

        {(isAnalyzing || isSonarRunning || semgrep.status === "failed" || sonar.status === "failed") && (
          <div className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground space-y-1">
            {isAnalyzing && <p>Semgrep scanning on GitHub Actions (usually 30–90s)…</p>}
            {semgrep.status === "completed" && !isAnalyzing && <p>Semgrep: complete.</p>}
            {semgrep.status === "failed" && <p className="text-destructive">Semgrep failed: {semgrep.error}</p>}

            {isSonarRunning && <p>SonarCloud scanning (can take a couple of minutes)…</p>}
            {sonar.status === "failed" && <p className="text-destructive">SonarCloud failed: {sonar.error}</p>}
          </div>
        )}

        {anyResults && (
          <ResultsDashboard
            semgrepResults={semgrep.results ?? {}}
            sonarResults={sonar.results ?? {}}
            isSonarRunning={isSonarRunning}
            samples={samples.filter((s) => s.code.trim())}
            chosenLabel={chosenLabel}
            onChoose={setChosenLabel}
          />
        )}

        {anyResults && chosenLabel && <DecisionFormLink chosenLabel={chosenLabel} />}
      </main>
    </div>
  );
}