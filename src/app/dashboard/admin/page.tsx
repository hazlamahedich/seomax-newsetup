'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, MessageSquare, AlertTriangle, LightbulbIcon, ThumbsUp, Sparkles, BrainCircuit } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks';
import { FeedbackService, FeedbackType, FeedbackStatus } from '@/lib/services/feedback-service';

interface FeedbackStats {
  totalCount: number;
  byType: Record<FeedbackType, number>;
  byStatus: Record<FeedbackStatus, number>;
  averageRating: number | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { user, loading: authLoading, isAdmin } = useSupabaseAuth();
  const { toast } = useToast();
  const [requestAttempts, setRequestAttempts] = useState<number>(0);
  const maxRequestAttempts = 3; // Maximum number of fetch attempts to prevent loops

  // This useEffect handles authentication
  useEffect(() => {
    // Add a flag to prevent multiple redirects
    let isMounted = true;
    
    const initialize = async () => {
      // Only do this check if we're done loading auth and we have accurate user info
      if (!authLoading) {
        // Handle unauthenticated users
        if (!user && isMounted) {
          router.push('/login');
          return;
        }
        
        // Handle non-admin users
        if (!isAdmin() && isMounted) {
          router.push('/dashboard');
          toast({
            title: "Access Denied",
            description: "You don't have permission to access the admin dashboard.",
            variant: "destructive",
          });
          return;
        }
      }
    };
    
    initialize();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, authLoading, router, isAdmin, toast]);
  
  // Data fetching useEffect - MUST be defined before any conditional returns
  useEffect(() => {
    // Skip if not authenticated or not admin
    if (authLoading || !user || !isAdmin()) {
      return;
    }
    
    let isMounted = true;
    let hasShownError = false; // Flag to prevent multiple error toasts
    
    const loadData = async () => {
      // Only proceed if component is still mounted
      if (!isMounted) return;
      
      try {
        setLoading(true);
        const feedbackStats = await FeedbackService.admin.getFeedbackStats();
        
        if (isMounted) {
          setStats(feedbackStats);
        }
      } catch (error) {
        console.error('Error fetching feedback stats:', error);
        
        if (isMounted && !hasShownError) {
          hasShownError = true;
          toast({
            title: 'Error',
            description: 'Failed to load feedback statistics. This might be due to missing database tables.',
            variant: 'destructive',
          });
          
          // Set default stats to prevent errors when rendering
          setStats({
            totalCount: 0,
            byType: {
              general: 0,
              feature_request: 0,
              bug_report: 0,
              usability: 0,
              satisfaction: 0
            },
            byStatus: {
              new: 0,
              in_review: 0,
              planned: 0,
              implemented: 0,
              declined: 0
            },
            averageRating: null
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Only run once when component mounts
  }, []);
  
  // If still loading auth or checking admin status, show loading spinner
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If user is not admin, don't render anything (redirect happens in useEffect)
  if (!user || !isAdmin()) {
    return null;
  }

  const getFeedbackTypeIcon = (type: FeedbackType) => {
    switch (type) {
      case 'feature_request':
        return <LightbulbIcon className="h-5 w-5 text-blue-500" />;
      case 'bug_report':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'usability':
        return <ThumbsUp className="h-5 w-5 text-green-500" />;
      case 'satisfaction':
        return <Sparkles className="h-5 w-5 text-purple-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: FeedbackStatus): string => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'in_review': return 'bg-yellow-500';
      case 'planned': return 'bg-purple-500';
      case 'implemented': return 'bg-green-500';
      case 'declined': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Feedback management and statistics</p>
          </div>
          <div className="flex space-x-4">
            <Link href="/dashboard/admin/llm">
              <Button variant="default">
                <BrainCircuit className="mr-2 h-4 w-4" />
                LLM Management
              </Button>
            </Link>
            <Link href="/dashboard/admin/feedback">
              <Button variant="outline">View All Feedback</Button>
            </Link>
          </div>
        </div>

        {stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Total Feedback</CardTitle>
                  <CardDescription>All feedback count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.totalCount}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">New Items</CardTitle>
                  <CardDescription>Awaiting review</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.byStatus.new}</div>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full" 
                      style={{ width: `${(stats.byStatus.new / stats.totalCount) * 100}%` }}
                    />
                  </div>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Planned Items</CardTitle>
                  <CardDescription>In development</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.byStatus.planned}</div>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full" 
                      style={{ width: `${(stats.byStatus.planned / stats.totalCount) * 100}%` }}
                    />
                  </div>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Implemented</CardTitle>
                  <CardDescription>Completed items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.byStatus.implemented}</div>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full rounded-full" 
                      style={{ width: `${(stats.byStatus.implemented / stats.totalCount) * 100}%` }}
                    />
                  </div>
                </CardFooter>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback by Type</CardTitle>
                  <CardDescription>Distribution of feedback categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <div key={type} className="flex items-center">
                        <div className="mr-2">
                          {getFeedbackTypeIcon(type as FeedbackType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {type.replace('_', ' ')}
                            </span>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${(count / stats.totalCount) * 100}%`,
                                backgroundColor: type === 'feature_request' ? '#3b82f6' : 
                                                type === 'bug_report' ? '#ef4444' :
                                                type === 'usability' ? '#22c55e' :
                                                type === 'satisfaction' ? '#a855f7' : '#6b7280'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Feedback by Status</CardTitle>
                  <CardDescription>Current processing status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.byStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center">
                        <div className="mr-2 w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(status as FeedbackStatus) }} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {status.replace('_', ' ')}
                            </span>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${getStatusColor(status as FeedbackStatus)}`}
                              style={{ width: `${(count / stats.totalCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {stats.averageRating !== null && (
              <Card>
                <CardHeader>
                  <CardTitle>Overall Satisfaction</CardTitle>
                  <CardDescription>Average rating: {stats.averageRating.toFixed(1)} out of 5</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <div className="flex space-x-2">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const fillPercentage = Math.max(0, Math.min(100, (stats.averageRating! - i) * 100));
                        return (
                          <div key={i} className="relative w-8 h-8">
                            <div className="absolute inset-0 bg-gray-200 rounded-full" />
                            <div 
                              className="absolute inset-0 bg-yellow-400 rounded-full" 
                              style={{ width: `${fillPercentage}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 