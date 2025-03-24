import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DownloadIcon, 
  FileIcon, 
  Loader2Icon 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSEOAuditStore } from '@/lib/store/seo-audit-store';

interface SEOAuditPdfButtonProps {
  reportId: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SEOAuditPdfButton({ 
  reportId,
  variant = 'default',
  size = 'default'
}: SEOAuditPdfButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  
  // Get PDF generation states from the store
  const generatePDF = useSEOAuditStore(state => state.generatePDF);
  const pdfGenerationStatus = useSEOAuditStore(state => state.pdfGenerationStatus);
  const pdfGenerationError = useSEOAuditStore(state => state.pdfGenerationError);
  const pdfDataUri = useSEOAuditStore(state => state.pdfDataUri);
  
  // Get the report info for filename
  const report = useSEOAuditStore(state => 
    state.reports.find(r => r.id === reportId) || state.currentReport
  );
  
  // Determine button state
  const isLoading = pdfGenerationStatus === 'loading' || downloading;
  
  const handleClick = async () => {
    try {
      // If we already have the PDF data URI, use it
      if (pdfDataUri && pdfGenerationStatus === 'success') {
        downloadPdf(pdfDataUri);
        return;
      }
      
      // Otherwise, generate the PDF
      const dataUri = await generatePDF(reportId);
      
      if (dataUri) {
        downloadPdf(dataUri);
      } else if (pdfGenerationError) {
        toast({
          title: "PDF Generation Failed",
          description: pdfGenerationError,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error handling PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate or download PDF",
        variant: "destructive"
      });
    }
  };
  
  const downloadPdf = async (dataUri: string) => {
    try {
      setDownloading(true);
      
      // Create safe filename from report name
      const filename = report 
        ? `seo-audit-${report.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
        : `seo-audit-report-${reportId}.pdf`;
      
      // Create an invisible link and trigger download
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the PDF",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading || report?.status !== 'completed'}
    >
      {isLoading ? (
        <>
          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          {pdfGenerationStatus === 'loading' ? 'Generating...' : 'Downloading...'}
        </>
      ) : (
        <>
          {pdfDataUri ? (
            <DownloadIcon className="mr-2 h-4 w-4" />
          ) : (
            <FileIcon className="mr-2 h-4 w-4" />
          )}
          Export PDF
        </>
      )}
    </Button>
  );
} 