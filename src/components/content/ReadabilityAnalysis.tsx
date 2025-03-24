import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ReadabilityAnalysisProps {
  contentPageId: string;
}

export function ReadabilityAnalysis({ contentPageId }: ReadabilityAnalysisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Readability Analysis</CardTitle>
        <CardDescription>
          Analyze the readability of your content to ensure it meets audience expectations.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          Readability analysis is currently being implemented.
        </p>
      </CardContent>
    </Card>
  );
} 