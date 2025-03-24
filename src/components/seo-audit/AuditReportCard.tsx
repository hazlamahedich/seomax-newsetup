import { SEOAuditReport } from '@/lib/services/seo-audit-service';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, Clock, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import Link from 'next/link';
import { formatDistance } from 'date-fns';

interface AuditReportCardProps {
  report: SEOAuditReport;
  projectId: string;
  onGeneratePDF?: (reportId: string) => void;
  isPdfGenerating?: boolean;
}

export function AuditReportCard({ report, projectId, onGeneratePDF, isPdfGenerating }: AuditReportCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 mr-1 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 mr-1" />;
      default:
        return <Activity className="h-4 w-4 mr-1" />;
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{report.reportName}</CardTitle>
          <Badge className={`flex items-center ${getStatusColor(report.status)}`}>
            {getStatusIcon(report.status)}
            {report.status === 'in_progress' ? 'In Progress' : 
             report.status === 'completed' ? 'Completed' : 'Failed'}
          </Badge>
        </div>
        <CardDescription className="flex items-center text-sm text-gray-500 mt-1">
          <Calendar className="h-4 w-4 mr-1" />
          {report.createdAt.toLocaleDateString()}
          <span className="mx-2">•</span>
          <Clock className="h-4 w-4 mr-1" />
          {formatDistance(report.createdAt, new Date(), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {report.overallScore !== undefined && (
          <div className="mt-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Score</span>
              <span className={`text-2xl font-bold ${getScoreColor(report.overallScore)}`}>
                {report.overallScore}
                {report.overallGrade && (
                  <span className="ml-1 text-sm">({report.overallGrade})</span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className={`h-2.5 rounded-full ${
                  report.overallScore >= 90 ? 'bg-green-600' : 
                  report.overallScore >= 70 ? 'bg-blue-600' : 
                  report.overallScore >= 50 ? 'bg-yellow-600' : 
                  'bg-red-600'
                }`}
                style={{ width: `${report.overallScore}%` }}
              ></div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-between gap-2">
        <Button 
          variant="outline"
          size="sm"
          asChild
        >
          <Link href={`/dashboard/projects/${projectId}/seo-audit/${report.id}`}>
            <FileText className="h-4 w-4 mr-2" /> View Report
          </Link>
        </Button>
        
        {report.status === 'completed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGeneratePDF?.(report.id)}
            disabled={isPdfGenerating || !!report.pdfUrl}
          >
            <Download className="h-4 w-4 mr-2" />
            {report.pdfUrl ? 'Download PDF' : 'Generate PDF'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 