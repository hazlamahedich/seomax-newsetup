import { createPooledSupabaseClient } from '@/lib/supabase/client';
import { supabase } from '@/lib/supabase/client';

// Define feedback types
export type FeedbackType = 'general' | 'feature_request' | 'bug_report' | 'usability' | 'satisfaction';
export type FeedbackStatus = 'new' | 'in_review' | 'planned' | 'implemented' | 'declined';

// Define the feedback interface for the application
export interface Feedback {
  id: string;
  userId: string | null;
  feedbackType: FeedbackType;
  subject: string;
  content: string;
  rating?: number;
  location?: string;
  status: FeedbackStatus;
  adminResponse?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Define the database table type for type safety
interface FeedbackTable {
  id: string;
  user_id: string;
  feedback_type: string;
  subject: string;
  content: string;
  rating: number | null;
  location: string | null;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
}

// Map database model to application model
const mapToFeedback = (data: FeedbackTable): Feedback => ({
  id: data.id,
  userId: data.user_id,
  feedbackType: data.feedback_type as FeedbackType,
  subject: data.subject,
  content: data.content,
  rating: data.rating || undefined,
  location: data.location || undefined,
  status: data.status as FeedbackStatus,
  adminResponse: data.admin_response,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

// Define the feedback input type
export interface FeedbackInput {
  feedbackType: FeedbackType;
  subject: string;
  content: string;
  rating?: number;
  location?: string;
  status?: FeedbackStatus;
}

// Create a simple in-memory cache for stats
let cachedStats: {
  data: any;
  timestamp: number;
} | null = null;
const CACHE_TTL = 300000; // 5 minute cache TTL (increased from 1 minute)

// Get the appropriate client - prefer the singleton instance to avoid multiple client warnings
const getClient = () => {
  // Simply use the singleton instance to avoid the "Multiple GoTrueClient instances" warning
  return supabase;
};

export const FeedbackService = {
  // Get all feedback for the current user
  async getFeedback(): Promise<Feedback[]> {
    const client = getClient();
    const { data, error } = await client
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }

    return data as unknown as Feedback[];
  },

  // Get a specific feedback by ID
  async getFeedbackById(id: string): Promise<Feedback> {
    const client = getClient();
    const { data, error } = await client
      .from('user_feedback')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching feedback by id:', error);
      throw error;
    }

    return data as unknown as Feedback;
  },

  // Create new feedback
  async createFeedback(feedback: FeedbackInput): Promise<Feedback> {
    const client = getClient();
    
    // Convert from application model to database model
    const insertData = {
      feedback_type: feedback.feedbackType,
      subject: feedback.subject,
      content: feedback.content,
      rating: feedback.rating,
      location: feedback.location,
      status: feedback.status || 'new',
    };
    
    const { data, error } = await client
      .from('user_feedback')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }

    return data as unknown as Feedback;
  },

  // Update feedback
  async updateFeedback(id: string, updates: Partial<Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Feedback> {
    const client = getClient();
    
    // Convert from application model to database model
    const updateData: Record<string, any> = {};
    
    if (updates.feedbackType) updateData.feedback_type = updates.feedbackType;
    if (updates.subject) updateData.subject = updates.subject;
    if (updates.content) updateData.content = updates.content;
    if (updates.rating !== undefined) updateData.rating = updates.rating;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.status) updateData.status = updates.status;
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await client
      .from('user_feedback')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }

    return data as unknown as Feedback;
  },

  // Delete feedback
  async deleteFeedback(id: string): Promise<void> {
    const client = getClient();
    const { error } = await client
      .from('user_feedback')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  },

  // Admin-specific methods
  admin: {
    // Get all feedback with optional filtering and pagination
    async getAllFeedback(options: {
      status?: FeedbackStatus;
      type?: FeedbackType;
      limit?: number;
      offset?: number;
    } = {}): Promise<{ data: Feedback[]; count: number }> {
      const client = getClient();
      const { status, type, limit = 50, offset = 0 } = options;
      
      // Build query
      let query = client
        .from('user_feedback')
        .select('*', { count: 'exact' });
        
      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (type) {
        query = query.eq('feedback_type', type);
      }
      
      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching feedback:', error);
        throw error;
      }
      
      // Convert database records to application model
      const feedbacks = (data as any[]).map(item => ({
        id: item.id,
        userId: item.user_id,
        feedbackType: item.feedback_type as FeedbackType,
        subject: item.subject,
        content: item.content,
        rating: item.rating,
        location: item.location,
        status: item.status as FeedbackStatus,
        adminResponse: item.admin_response,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      
      return {
        data: feedbacks,
        count: count || 0
      };
    },
    
    // Get feedback statistics
    async getFeedbackStats(): Promise<{
      totalCount: number;
      byType: Record<FeedbackType, number>;
      byStatus: Record<FeedbackStatus, number>;
      averageRating: number | null;
    }> {
      // Check if we have a valid cached result
      if (cachedStats && (Date.now() - cachedStats.timestamp < CACHE_TTL)) {
        console.log('Returning cached feedback stats');
        return cachedStats.data;
      }
      
      try {
        const client = getClient();
        
        // Get all feedback for statistics
        const { data, error } = await client
          .from('user_feedback')
          .select('*');

        if (error) {
          console.error('Error fetching feedback stats:', error);
          // Return default stats when table doesn't exist or other errors
          const defaultStats = {
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
          };
          
          // Cache the default results to prevent further API calls
          cachedStats = {
            data: defaultStats,
            timestamp: Date.now()
          };
          
          return defaultStats;
        }

        // Convert database records to application model
        const feedbacks = (data as any[]).map(item => ({
          feedbackType: item.feedback_type as FeedbackType,
          status: item.status as FeedbackStatus,
          rating: item.rating
        }));
        
        const byType: Record<FeedbackType, number> = {
          general: 0,
          feature_request: 0,
          bug_report: 0,
          usability: 0,
          satisfaction: 0
        };
        
        const byStatus: Record<FeedbackStatus, number> = {
          new: 0,
          in_review: 0,
          planned: 0,
          implemented: 0,
          declined: 0
        };
        
        let ratingSum = 0;
        let ratingCount = 0;
        
        // Calculate statistics
        feedbacks.forEach(feedback => {
          // Count by type
          byType[feedback.feedbackType] += 1;
          
          // Count by status
          byStatus[feedback.status] += 1;
          
          // Sum ratings
          if (feedback.rating) {
            ratingSum += feedback.rating;
            ratingCount++;
          }
        });
        
        const stats = {
          totalCount: feedbacks.length,
          byType,
          byStatus,
          averageRating: ratingCount > 0 ? ratingSum / ratingCount : null
        };
        
        // Cache the result to prevent further API calls
        cachedStats = {
          data: stats,
          timestamp: Date.now()
        };
        
        return stats;
      } catch (error) {
        console.error('Error fetching feedback stats:', error);
        throw error;
      }
    },
    
    // Bulk update feedback status
    async bulkUpdateStatus(ids: string[], status: FeedbackStatus): Promise<void> {
      const client = getClient();
      
      const { error } = await client
        .from('user_feedback')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) {
        console.error('Error bulk updating feedback status:', error);
        throw error;
      }
    }
  }
}; 