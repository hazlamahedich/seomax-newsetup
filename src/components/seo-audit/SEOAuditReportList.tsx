'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Eye, 
  Download, 
  BarChart, 
  AlertTriangle,
  CheckCircle,
  Clock,
  PlusCircle,
  AlertCircle,
  ExternalLink,
  FileCheck,
  FileWarning,
  Search,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { StartAuditDialog } from './StartAuditDialog';
import { useRouter, useParams } from 'next/navigation';
import { useSEOAuditStore } from '@/lib/store/seo-audit-store';
import { SEOAuditPdfButton } from './SEOAuditPdfButton';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SEOAuditReportListProps {
  projectId: string;
}

export function SEOAuditReportList({ projectId }: SEOAuditReportListProps) {
  const [startAuditOpen, setStartAuditOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  
  // Get reports and loading states from store
  const reports = useSEOAuditStore(state => state.reports);
  const filteredReports = useSEOAuditStore(state => state.filteredReports);
  const filters = useSEOAuditStore(state => state.filters);
  const isLoading = useSEOAuditStore(state => state.isLoading);
  const error = useSEOAuditStore(state => state.error);
  const fetchReports = useSEOAuditStore(state => state.fetchReports);
  const setFilters = useSEOAuditStore(state => state.setFilters);
  
  // Fetch reports when component mounts
  useEffect(() => {
    fetchReports(projectId);
  }, [projectId, fetchReports]);
  
  // Handle search filter
  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value });
  };
  
  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setFilters({ 
      ...filters, 
      status: status === 'all' ? undefined : [status]
    });
  };
  
  // Navigate to report details
  const handleViewReport = (reportId: string) => {
    router.push(`/dashboard/projects/${projectId}/seo-audit/${reportId}`);
  };
  
  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-500">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            <AlertCircle className="mr-1 h-3 w-3" />
            Processing
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700">
            <FileCheck className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const handleSuccessfulAudit = () => {
    // Refresh the reports after a successful audit
    fetchReports(projectId);
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>SEO Audit Reports</CardTitle>
        <StartAuditDialog projectId={projectId}>
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Audit
          </Button>
        </StartAuditDialog>
      </CardHeader>
      <div className="px-6 pb-2">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search reports..."
              className="pl-8"
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Select 
            defaultValue="all"
            onValueChange={handleStatusFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>{error}</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileWarning className="h-12 w-12 mx-auto mb-4" />
            <p>No reports found. Start your first SEO audit.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="max-w-xs truncate">{report.url}</span>
                        <a
                          href={report.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="sr-only">Open URL</span>
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>{renderStatusBadge(report.status)}</TableCell>
                    <TableCell>{formatDate(report.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {report.status === 'completed' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/dashboard/projects/${projectId}/seo-audit/${report.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </Button>
                          
                          <SEOAuditPdfButton 
                            reportId={report.id}
                            variant="outline"
                            size="sm"
                          />
                        </div>
                      ) : report.status === 'failed' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => toast({
                            title: "Audit Failed",
                            description: report.error || "The audit failed to complete. Please try again.",
                            variant: "destructive"
                          })}
                        >
                          <FileWarning className="mr-2 h-4 w-4" />
                          View Error
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={report.status === 'pending'}
                          onClick={() => handleViewReport(report.id)}
                        >
                          {report.status === 'processing' ? (
                            <>
                              <AlertCircle className="mr-2 h-4 w-4" />
                              Processing
                            </>
                          ) : (
                            <>
                              <Clock className="mr-2 h-4 w-4" />
                              Pending
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-sm text-slate-500">
          {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
        </div>
      </CardFooter>
    </Card>
  );
} 