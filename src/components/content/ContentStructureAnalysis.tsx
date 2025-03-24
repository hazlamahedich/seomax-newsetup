import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ContentStructureAnalysisProps {
  contentPageId: string;
}

export function ContentStructureAnalysis({ contentPageId }: ContentStructureAnalysisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Structure Analysis</CardTitle>
        <CardDescription>
          Analyze your content structure for better readability and SEO performance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          Content structure analysis is currently being implemented.
        </p>
      </CardContent>
    </Card>
  );
} 