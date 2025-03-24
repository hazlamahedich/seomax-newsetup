import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SEOAuditOptions } from '@/lib/services/seo-audit-service';
import { Loader2 } from 'lucide-react';

interface NewAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reportName: string, options: SEOAuditOptions) => Promise<void>;
  isSubmitting: boolean;
}

export function NewAuditDialog({ open, onOpenChange, onSubmit, isSubmitting }: NewAuditDialogProps) {
  const [reportName, setReportName] = useState('');
  const [options, setOptions] = useState<SEOAuditOptions>({
    includeOnPage: true,
    includeTechnical: true,
    includeLinks: true,
    includeContent: true,
    includePerformance: true,
    includeSocial: false,
    includeLocal: false,
    includeMobile: true,
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reportName.trim()) {
      onSubmit(reportName.trim(), options);
    }
  };
  
  const updateOption = (key: keyof SEOAuditOptions, value: boolean) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };
  
  const isValid = reportName.trim().length > 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Start New SEO Audit</DialogTitle>
          <DialogDescription>
            Create a new SEO audit to analyze your website's performance and identify opportunities for improvement.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportName">Audit Report Name</Label>
              <Input
                id="reportName"
                placeholder="e.g., Monthly SEO Audit - June 2024"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Audit Options</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="onPage" 
                    checked={options.includeOnPage} 
                    onCheckedChange={(checked) => updateOption('includeOnPage', checked as boolean)}
                  />
                  <Label htmlFor="onPage" className="cursor-pointer">On-Page SEO</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="technical" 
                    checked={options.includeTechnical} 
                    onCheckedChange={(checked) => updateOption('includeTechnical', checked as boolean)}
                  />
                  <Label htmlFor="technical" className="cursor-pointer">Technical SEO</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="links" 
                    checked={options.includeLinks} 
                    onCheckedChange={(checked) => updateOption('includeLinks', checked as boolean)}
                  />
                  <Label htmlFor="links" className="cursor-pointer">Links Analysis</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="content" 
                    checked={options.includeContent} 
                    onCheckedChange={(checked) => updateOption('includeContent', checked as boolean)} 
                  />
                  <Label htmlFor="content" className="cursor-pointer">Content Analysis</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="performance" 
                    checked={options.includePerformance} 
                    onCheckedChange={(checked) => updateOption('includePerformance', checked as boolean)}
                  />
                  <Label htmlFor="performance" className="cursor-pointer">Performance</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="mobile" 
                    checked={options.includeMobile} 
                    onCheckedChange={(checked) => updateOption('includeMobile', checked as boolean)}
                  />
                  <Label htmlFor="mobile" className="cursor-pointer">Mobile SEO</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="social" 
                    checked={options.includeSocial} 
                    onCheckedChange={(checked) => updateOption('includeSocial', checked as boolean)}
                  />
                  <Label htmlFor="social" className="cursor-pointer">Social Signals</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="local" 
                    checked={options.includeLocal} 
                    onCheckedChange={(checked) => updateOption('includeLocal', checked as boolean)}
                  />
                  <Label htmlFor="local" className="cursor-pointer">Local SEO</Label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Starting...
                </>
              ) : (
                'Start Audit'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 