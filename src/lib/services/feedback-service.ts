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

// Get the appropriate client - try pooled first, fall back to regular
const getClient = () => {
  try {
    return createPooledSupabaseClient();
  } catch (error) {
    console.warn('Using default Supabase client, pooled client not available:', error);
    return supabase;
  }
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
        
      // Apply filters if provided
      if (status) {
        query = query.eq('status', status);
      }
      
      if (type) {
        query = query.eq('feedback_type', type);
      }
      
      // Add pagination and sorting
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching all feedback:', error);
        throw error;
      }

      return { 
        data: data as unknown as Feedback[], 
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
      const client = getClient();
      
      // Get all feedback for statistics
      const { data, error } = await client
        .from('user_feedback')
        .select('*');

      if (error) {
        console.error('Error fetching feedback stats:', error);
        throw error;
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
      
      return {
        totalCount: feedbacks.length,
        byType,
        byStatus,
        averageRating: ratingCount > 0 ? ratingSum / ratingCount : null
      };
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