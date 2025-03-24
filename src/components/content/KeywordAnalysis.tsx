import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface KeywordAnalysisProps {
  contentPageId: string;
}

export function KeywordAnalysis({ contentPageId }: KeywordAnalysisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyword Analysis</CardTitle>
        <CardDescription>
          Analyze keyword usage and discover opportunities to improve your content.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          Keyword analysis is currently being implemented.
        </p>
      </CardContent>
    </Card>
  );
} 