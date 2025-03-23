'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FeedbackService, Feedback, FeedbackStatus } from '@/lib/services/feedback-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Loader2, MessageSquareHeart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function FeedbackDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchFeedback();
    }
  }, [user, authLoading, router]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const feedback = await FeedbackService.getFeedback();
      setFeedbackList(feedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
    try {
      await FeedbackService.updateFeedback(id, { status });
      toast({
        title: 'Status Updated',
        description: 'Feedback status has been updated successfully.',
      });
      fetchFeedback();
    } catch (error) {
      console.error('Error updating feedback status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feedback status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getFeedbackTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      feature_request: 'bg-blue-500',
      bug_report: 'bg-red-500',
      general: 'bg-gray-500',
      usability: 'bg-green-500',
      satisfaction: 'bg-purple-500',
    };

    return (
      <Badge className={`${colors[type] || 'bg-gray-500'} text-white`}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-500',
      in_review: 'bg-yellow-500',
      planned: 'bg-purple-500',
      implemented: 'bg-green-500',
      declined: 'bg-red-500',
    };

    return (
      <Badge className={`${colors[status] || 'bg-gray-500'} text-white`}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback Management</h1>
          <p className="text-muted-foreground">Review and manage user feedback</p>
        </div>
        <Button onClick={fetchFeedback} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : feedbackList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <MessageSquareHeart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No feedback yet</h3>
            <p className="text-muted-foreground">
              User feedback will appear here once submitted.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {feedbackList.map((feedback) => (
            <Card key={feedback.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{feedback.subject}</CardTitle>
                    <CardDescription>
                      {new Date(feedback.createdAt).toLocaleDateString()} •{' '}
                      {getFeedbackTypeBadge(feedback.feedbackType)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(feedback.status)}
                    <Select
                      value={feedback.status}
                      onValueChange={(value) => 
                        updateFeedbackStatus(feedback.id, value as FeedbackStatus)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="implemented">Implemented</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="whitespace-pre-wrap">{feedback.content}</p>
                  </div>
                  
                  {feedback.rating && (
                    <div className="flex items-center">
                      <span className="text-muted-foreground mr-2">Rating:</span>
                      <div className="flex space-x-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-5 h-5 rounded-full ${
                              i < feedback.rating! ? 'bg-primary' : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {feedback.location && (
                    <div>
                      <span className="text-muted-foreground mr-2">Location:</span>
                      <Badge variant="outline">{feedback.location}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 