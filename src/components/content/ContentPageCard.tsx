import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, BarChart } from 'lucide-react';

interface ContentPageCardProps {
  id: string;
  projectId: string;
  title: string;
  url: string;
  score?: number;
  lastAnalyzed?: string;
  status: 'not-analyzed' | 'analyzing' | 'analyzed' | 'optimized';
}

const statusMap = {
  'not-analyzed': { label: 'Not Analyzed', color: 'secondary' },
  'analyzing': { label: 'Analyzing', color: 'default' },
  'analyzed': { label: 'Analyzed', color: 'default' },
  'optimized': { label: 'Optimized', color: 'success' },
};

export function ContentPageCard({
  id,
  projectId,
  title,
  url,
  score,
  lastAnalyzed,
  status,
}: ContentPageCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">
            {title}
          </CardTitle>
          <Badge variant={statusMap[status].color as "default" | "secondary" | "destructive" | "outline"}>
            {statusMap[status].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm text-muted-foreground mb-4">
          <p className="truncate">
            <Link href={url} className="hover:underline text-blue-500" target="_blank">
              {url}
            </Link>
          </p>
        </div>
        
        {score !== undefined && (
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Content Score</span>
              <span className="text-sm font-medium">{score}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )}
        
        {lastAnalyzed && (
          <div className="mt-4 text-xs text-muted-foreground">
            Last analyzed: {new Date(lastAnalyzed).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex gap-2 w-full">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={url} target="_blank">
              <ExternalLink className="h-4 w-4 mr-1" /> View
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/dashboard/projects/${projectId}/content/${id}`}>
              <FileText className="h-4 w-4 mr-1" /> Details
            </Link>
          </Button>
          <Button asChild size="sm" variant="default" className="flex-1">
            <Link href={`/dashboard/projects/${projectId}/content/${id}/analysis`}>
              <BarChart className="h-4 w-4 mr-1" /> Analysis
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 