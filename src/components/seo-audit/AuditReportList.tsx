import { useState } from 'react';
import { SEOAuditReport } from '@/lib/services/seo-audit-service';
import { AuditReportCard } from './AuditReportCard';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { NewAuditDialog } from './NewAuditDialog';
import { useToast } from '@/components/ui/use-toast';

interface AuditReportListProps {
  reports: SEOAuditReport[];
  projectId: string;
  onStartNewAudit: (reportName: string, options: any) => Promise<SEOAuditReport>;
  isLoading?: boolean;
}

export function AuditReportList({ reports, projectId, onStartNewAudit, isLoading }: AuditReportListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleStartAudit = async (reportName: string, options: any) => {
    try {
      setIsCreating(true);
      await onStartNewAudit(reportName, options);
      toast({
        title: "Audit started",
        description: "Your new SEO audit is now in progress.",
        variant: "default",
      });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Failed to start audit",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleGeneratePDF = async (reportId: string) => {
    setIsPdfGenerating(reportId);
    
    try {
      const response = await fetch(`/api/seo-audit/${reportId}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate PDF');
      }
      
      toast({
        title: "PDF Generated",
        description: "Your PDF report is ready to download.",
        variant: "default",
      });
      
      // Open the PDF in a new tab
      window.open(data.data.pdfUrl, '_blank');
    } catch (error) {
      toast({
        title: "Failed to generate PDF",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPdfGenerating(null);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">SEO Audit Reports</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" /> New Audit
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading audit reports...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg dark:bg-gray-800">
          <h3 className="text-lg font-medium mb-2">No audit reports yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Start your first SEO audit to analyze your website's performance.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Start your first audit
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <AuditReportCard 
              key={report.id} 
              report={report} 
              projectId={projectId}
              onGeneratePDF={handleGeneratePDF}
              isPdfGenerating={isPdfGenerating === report.id}
            />
          ))}
        </div>
      )}
      
      <NewAuditDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onSubmit={handleStartAudit}
        isSubmitting={isCreating}
      />
    </div>
  );
} 