import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

// Paste your Google Form's public link here.
const GOOGLE_FORM_URL = "https://forms.gle/REPLACE_ME";

interface Props {
  chosenLabel: string;
}

export function DecisionFormLink({ chosenLabel }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          You chose <span className="text-primary">{chosenLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Log why you picked this output, tradeoffs, and confidence in the form below.
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
