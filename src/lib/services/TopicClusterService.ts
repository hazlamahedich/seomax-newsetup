import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { LiteLLMProvider } from '@/lib/ai/litellm-provider';

export interface TopicClusterInput {
  name: string;
  description?: string;
  mainKeyword: string;
  projectId: string;
  userId: string;
}

/**
 * Generate related keywords for a main keyword
 */
interface KeywordGenerationInput {
  mainKeyword: string;
  projectId: string;
  userId: string;
  count?: number;
}

export interface TopicClusterWithKeywords {
  id: string;
  name: string;
  description?: string;
  mainKeyword: string;
  relatedKeywords: string[];
  projectId: string;
  createdAt: string;
}

export class TopicClusterService {
  /**
   * Create a new topic cluster
   */
  public static async createTopicCluster(input: TopicClusterInput): Promise<TopicClusterWithKeywords | null> {
    try {
      console.log('[TopicClusterService] Creating topic cluster');
      
      // Use admin client to bypass RLS
      const supabase = createAdminClient();
      
      // Generate related keywords
      const relatedKeywords = await this.generateRelatedKeywords({
        mainKeyword: input.mainKeyword,
        projectId: input.projectId,
        userId: input.userId,
        count: 15 // Default number of related keywords
      });
      
      // Insert into the database
      const { data, error } = await supabase
        .from('topic_clusters')
        .insert([{
          name: input.name,
          description: input.description || null,
          main_keyword: input.mainKeyword,
          related_keywords: relatedKeywords,
          project_id: input.projectId,
          // Removed user_id field as it doesn't exist in the schema
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating topic cluster:', error);
        return null;
      }
      
      console.log('[TopicClusterService] Successfully created topic cluster with ID:', data.id);
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        mainKeyword: data.main_keyword,
        relatedKeywords: data.related_keywords || [],
        projectId: data.project_id,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error in createTopicCluster:', error);
      return null;
    }
  }
  
  /**
   * Get a topic cluster by ID
   */
  public static async getTopicClusterById(id: string): Promise<TopicClusterWithKeywords | null> {
    try {
      // Use regular client first
      const regularClient = createClient();
      
      try {
        // Try with regular client first (follows RLS policies)
        const { data, error } = await regularClient
          .from('topic_clusters')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!error && data) {
          return {
            id: data.id,
            name: data.name,
            description: data.description,
            mainKeyword: data.main_keyword,
            relatedKeywords: data.related_keywords || [],
            projectId: data.project_id,
            createdAt: data.created_at,
          };
        }
      } catch (regularError) {
        console.log('[TopicClusterService] Regular client failed, trying admin client');
      }
      
      // If regular client fails, try admin client
      const adminClient = createAdminClient();
      
      const { data, error } = await adminClient
        .from('topic_clusters')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        console.error('Error fetching topic cluster:', error);
        return null;
      }
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        mainKeyword: data.main_keyword,
        relatedKeywords: data.related_keywords || [],
        projectId: data.project_id,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error in getTopicClusterById:', error);
      return null;
    }
  }
  
  /**
   * Get all topic clusters for a project
   */
  public static async getTopicClustersByProject(projectId: string): Promise<TopicClusterWithKeywords[]> {
    try {
      // Try regular client first
      const regularClient = createClient();
      
      try {
        const { data, error } = await regularClient
          .from('topic_clusters')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
          
        if (!error && data && data.length > 0) {
          // Regular client worked
          return data.map(cluster => ({
            id: cluster.id,
            name: cluster.name,
            description: cluster.description,
            mainKeyword: cluster.main_keyword,
            relatedKeywords: cluster.related_keywords || [],
            projectId: cluster.project_id,
            createdAt: cluster.created_at,
          }));
        }
      } catch (regularError) {
        console.log('[TopicClusterService] Regular client failed, trying admin client');
      }
      
      // If regular client fails, try admin client
      const adminClient = createAdminClient();
      
      const { data, error } = await adminClient
        .from('topic_clusters')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching topic clusters:', error);
        return [];
      }
      
      return data.map(cluster => ({
        id: cluster.id,
        name: cluster.name,
        description: cluster.description,
        mainKeyword: cluster.main_keyword,
        relatedKeywords: cluster.related_keywords || [],
        projectId: cluster.project_id,
        createdAt: cluster.created_at,
      }));
    } catch (error) {
      console.error('Error in getTopicClustersByProject:', error);
      return [];
    }
  }
  
  /**
   * Update a topic cluster
   */
  public static async updateTopicCluster(
    id: string, 
    updates: Partial<TopicClusterInput>
  ): Promise<TopicClusterWithKeywords | null> {
    try {
      const supabase = createClient();
      
      const updateData: Record<string, any> = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.mainKeyword) updateData.main_keyword = updates.mainKeyword;
      
      // If main keyword was updated, regenerate related keywords
      if (updates.mainKeyword && updates.userId && updates.projectId) {
        const relatedKeywords = await this.generateRelatedKeywords({
          mainKeyword: updates.mainKeyword,
          projectId: updates.projectId,
          userId: updates.userId,
          count: 15
        });
        updateData.related_keywords = relatedKeywords;
      }
      
      const { data, error } = await supabase
        .from('topic_clusters')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating topic cluster:', error);
        return null;
      }
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        mainKeyword: data.main_keyword,
        relatedKeywords: data.related_keywords || [],
        projectId: data.project_id,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error in updateTopicCluster:', error);
      return null;
    }
  }
  
  /**
   * Delete a topic cluster
   */
  public static async deleteTopicCluster(id: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('topic_clusters')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting topic cluster:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteTopicCluster:', error);
      return false;
    }
  }
  
  /**
   * Generate related keywords using AI
   */
  private static async generateRelatedKeywords(input: KeywordGenerationInput): Promise<string[]> {
    try {
      // Default related keywords if generation fails
      const defaultKeywords = [
        `${input.mainKeyword} guide`,
        `${input.mainKeyword} examples`,
        `${input.mainKeyword} tips`,
        `best ${input.mainKeyword}`,
        `how to ${input.mainKeyword}`,
        `${input.mainKeyword} 2023`,
        `${input.mainKeyword} tutorial`,
        `what is ${input.mainKeyword}`
      ];
      
      try {
        // If we have a LLM provider, use it to generate better related keywords
        const llmProvider = LiteLLMProvider.getInstance();
        const llm = llmProvider.getLangChainModel();
        
        const prompt = `
        Generate ${input.count || 10} related keywords or search phrases for the main keyword "${input.mainKeyword}".
        These should be SEO-friendly search terms that people might use to find content about this topic.
        Include a mix of:
        - Question phrases (how to, what is, why)
        - Comparison terms (vs, versus, alternatives)
        - Specific variations (examples, types, best)
        - Long-tail variations
        
        Format your response as a comma-separated list like this:
        "keyword 1", "keyword 2", "keyword 3"
        
        Do not include brackets, just the comma-separated list.
        `;
        
        const response = await llm.invoke(prompt);
        
        if (response && response.content) {
          const content = response.content.toString();
          console.log('[TopicClusterService] AI response:', content);
          
          // Multiple strategies to extract keywords
          let keywords: string[] = [];
          
          // Strategy 1: Try to find and parse JSON array
          try {
            const arrayMatch = content.match(/\[([\s\S]*?)\]/);
            if (arrayMatch && arrayMatch[0]) {
              // Make sure it's wrapped in quotes properly before parsing
              const fixedJSON = arrayMatch[0].replace(/([^,\[\]\s]+)/g, '"$1"')
                .replace(/""/g, '"')
                .replace(/"""/g, '"')
                .replace(/"\s*"/g, '","');
                
              console.log('[TopicClusterService] Attempting to parse fixed JSON:', fixedJSON);
              
              try {
                const parsedArray = JSON.parse(fixedJSON);
                if (Array.isArray(parsedArray) && parsedArray.length > 0) {
                  console.log(`[TopicClusterService] Successfully parsed ${parsedArray.length} keywords from JSON`);
                  return parsedArray;
                }
              } catch (innerParseError) {
                console.error('[TopicClusterService] Failed to parse fixed JSON:', innerParseError);
              }
            }
          } catch (jsonError) {
            console.error('[TopicClusterService] JSON extraction failed:', jsonError);
          }
          
          // Strategy 2: Split by commas and clean
          try {
            // Clean up the content to leave just comma-separated values
            const cleaned = content
              .replace(/[\[\]]/g, '') // Remove brackets
              .replace(/^[^"a-zA-Z0-9]*|[^"a-zA-Z0-9]*$/g, '') // Remove non-alphanumeric chars at start/end
              .replace(/([^,\s]+)/g, (match) => match.trim()) // Trim each potential keyword
              
            keywords = cleaned
              .split(',')
              .map(k => k.trim())
              .filter(k => k && k.length > 0)
              .map(k => k.replace(/^["']|["']$/g, '')); // Remove surrounding quotes
            
            if (keywords.length > 0) {
              console.log(`[TopicClusterService] Extracted ${keywords.length} keywords by comma splitting`);
              return keywords;
            }
          } catch (splitError) {
            console.error('[TopicClusterService] Comma splitting failed:', splitError);
          }
          
          // Strategy 3: Line by line extraction
          try {
            keywords = content
              .split('\n')
              .map(line => line.trim())
              .filter(line => line && line.length > 2)
              .map(line => {
                // Remove list markers, numbers, etc.
                return line.replace(/^[-*•\d.\s]+|["']/g, '').trim();
              })
              .filter(line => line && !line.startsWith('[') && !line.endsWith(']'));
              
            if (keywords.length > 0) {
              console.log(`[TopicClusterService] Extracted ${keywords.length} keywords by line splitting`);
              return keywords;
            }
          } catch (lineError) {
            console.error('[TopicClusterService] Line splitting failed:', lineError);
          }
        }
      } catch (aiError) {
        console.error('[TopicClusterService] Error generating keywords with AI:', aiError);
      }
      
      // Return default keywords if all parsing strategies failed
      console.log('[TopicClusterService] Falling back to default keywords');
      return defaultKeywords;
    } catch (error) {
      console.error('[TopicClusterService] Error in generateRelatedKeywords:', error);
      return [`${input.mainKeyword} guide`, `${input.mainKeyword} examples`, `${input.mainKeyword} tutorial`];
    }
  }
} 