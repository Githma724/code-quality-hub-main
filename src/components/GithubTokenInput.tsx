import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

const STORAGE_KEY = "gh_pat";

export function getStoredToken(): string {
  return sessionStorage.getItem(STORAGE_KEY) ?? "";
}

interface Props {
  token: string;
  onTokenChange: (token: string) => void;
}

export function GithubTokenInput({ token, onTokenChange }: Props) {
  const [draft, setDraft] = useState(token);

  const save = () => {
    sessionStorage.setItem(STORAGE_KEY, draft.trim());
    onTokenChange(draft.trim());
  };

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="gh-token" className="text-sm">
          GitHub token (kept only in this browser tab, never sent anywhere but api.github.com)
        </Label>
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          id="gh-token"
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="github_pat_..."
          className="font-mono text-sm"
        />
        <Button size="sm" variant="secondary" onClick={save}>
          Save
        </Button>
      </div>
      {token && (
        <p className="mt-1 text-xs text-muted-foreground">Token saved for this session.</p>
      )}
    </div>
  );
}
