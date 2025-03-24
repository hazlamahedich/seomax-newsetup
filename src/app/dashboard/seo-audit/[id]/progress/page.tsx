'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface ProgressPageProps {
  params: {
    id: string;
  };
}

export default function AuditProgressPage({ params }: ProgressPageProps) {
  const router = useRouter();
  const auditId = params.id;
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('initializing');
  const [currentTask, setCurrentTask] = useState('Preparing to crawl website');
  const [siteUrl, setSiteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    const supabase = createClient();
    
    // Initial fetch of audit data
    const fetchAuditData = async () => {
      try {
        const { data, error } = await supabase
          .from('seo_audits')
          .select('*')
          .eq('id', auditId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setSiteUrl(data.site_url);
          setStatus(data.status);
          
          // If the audit is already completed or failed, update the UI accordingly
          if (data.status === 'completed') {
            setProgress(100);
            setCurrentTask('Audit completed successfully');
            setTimeout(() => router.push(`/dashboard/seo-audit/${auditId}`), 1500);
            return;
          } else if (data.status === 'failed') {
            setError(data.error_message || 'Audit failed');
            return;
          }
          
          // Otherwise, start polling for updates
          startPolling();
        }
      } catch (error) {
        console.error('Error fetching audit data:', error);
        setError('Failed to load audit information');
      }
    };
    
    const startPolling = () => {
      // Poll for updates every 2 seconds
      intervalId = setInterval(pollProgress, 2000);
    };
    
    const pollProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('seo_audits')
          .select('*')
          .eq('id', auditId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setStatus(data.status);
          
          // Calculate progress based on various factors
          let calculatedProgress = 0;
          
          if (data.status === 'crawling') {
            setCurrentTask(`Crawling website (${data.pages_crawled || 0} pages so far)`);
            calculatedProgress = Math.min(45, (data.pages_crawled / data.options.crawl_limit) * 45);
          } else if (data.status === 'analyzing') {
            setCurrentTask(data.current_task || 'Analyzing data');
            calculatedProgress = 45 + (data.analysis_progress || 0) * 45;
          } else if (data.status === 'completed') {
            setCurrentTask('Audit completed successfully');
            calculatedProgress = 100;
            clearInterval(intervalId);
            setTimeout(() => router.push(`/dashboard/seo-audit/${auditId}`), 1500);
          } else if (data.status === 'failed') {
            setError(data.error_message || 'Audit failed');
            clearInterval(intervalId);
          }
          
          setProgress(Math.round(calculatedProgress));
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        setError('Failed to update progress information');
        clearInterval(intervalId);
      }
    };
    
    fetchAuditData();
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [auditId, router]);
  
  // For demo purposes, let's simulate progress updates in development
  // This would be replaced by real backend progress updates in production
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !error && progress < 100) {
      const simulationInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 5) + 1;
          
          if (newProgress >= 100) {
            clearInterval(simulationInterval);
            setCurrentTask('Audit completed successfully');
            setTimeout(() => router.push(`/dashboard/seo-audit/${auditId}`), 1500);
            return 100;
          }
          
          if (newProgress < 45) {
            setStatus('crawling');
            const pagesCrawled = Math.floor((newProgress / 45) * 25);
            setCurrentTask(`Crawling website (${pagesCrawled} pages so far)`);
          } else if (newProgress < 90) {
            setStatus('analyzing');
            if (newProgress < 60) {
              setCurrentTask('Analyzing performance metrics');
            } else if (newProgress < 70) {
              setCurrentTask('Analyzing content quality');
            } else if (newProgress < 80) {
              setCurrentTask('Checking for technical SEO issues');
            } else {
              setCurrentTask('Generating recommendations');
            }
          } else {
            setStatus('finalizing');
            setCurrentTask('Finalizing audit report');
          }
          
          return newProgress;
        });
      }, 800);
      
      return () => clearInterval(simulationInterval);
    }
  }, [auditId, router, error, progress]);
  
  const getTaskIcon = () => {
    if (status === 'crawling') {
      return '🔍';
    } else if (status === 'analyzing') {
      return '📊';
    } else if (status === 'finalizing') {
      return '📋';
    } else if (status === 'completed') {
      return '✅';
    } else if (status === 'failed') {
      return '❌';
    } else {
      return '⏳';
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">SEO Audit in Progress</h1>
      <p className="text-gray-500 mb-8">
        {siteUrl && `Analyzing ${siteUrl}`}
      </p>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center">
                <div className="text-2xl mr-3">{getTaskIcon()}</div>
                <div>
                  <div className="font-medium">{currentTask}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {status === 'crawling' && 'This might take a few minutes depending on the website size'}
                    {status === 'analyzing' && 'Analyzing data and generating recommendations'}
                    {status === 'finalizing' && 'Almost done! Preparing your full report'}
                    {status === 'completed' && 'Redirecting to your report...'}
                  </div>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-800">
                <div className="font-medium">Error</div>
                <div className="text-sm mt-1">{error}</div>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/dashboard/seo-audit')}
                  >
                    Return to Dashboard
                  </Button>
                </div>
              </div>
            )}
            
            <div className="text-center text-gray-500 text-sm">
              You can leave this page and come back later. The audit will continue in the background.
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/seo-audit')}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 