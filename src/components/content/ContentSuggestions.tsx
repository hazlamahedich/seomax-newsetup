import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ContentSuggestionsProps {
  contentPageId: string;
}

export function ContentSuggestions({ contentPageId }: ContentSuggestionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Suggestions</CardTitle>
        <CardDescription>
          Get AI-powered suggestions to improve your content performance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          Content suggestions functionality is currently being implemented.
        </p>
      </CardContent>
    </Card>
  );
} 