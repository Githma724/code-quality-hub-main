import { Link } from "react-router-dom";
import { FormStatsDashboard } from "@/components/FormStatsDashboard";
import { ArrowLeft, BarChart3 } from "lucide-react";

export default function Stats() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Selection Stats</h1>
            <p className="text-sm text-muted-foreground">
              Live numbers pulled from the Google Form responses sheet
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to pipeline
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <FormStatsDashboard />
      </main>
    </div>
  );
}
