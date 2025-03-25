import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';

export interface SemanticEntity {
  id?: string;
  entityName: string;
  entityType: string;
  entityDescription?: string;
  relatedEntities: {
    entityId?: string;
    entityName: string;
    relationshipType: string;
    relationshipStrength: number;
  }[];
  relatedKeywords: string[];
  semanticImportance: number;
  contentCoverageScore: number;
  opportunityScore: number;
}

export interface EntityRelationship {
  id?: string;
  entityId: string;
  relatedEntityId: string;
  relationshipType: string;
  relationshipStrength: number;
}

export interface SemanticEntityMappingParams {
  projectId: string;
  content?: string;
  pageIds?: string[];
  focusKeywords?: string[];
  entityTypes?: string[];
  minImportance?: number;
}

export class SemanticEntityMappingService {
  private static supabase = createClient();

  /**
   * Generate a semantic entity map from content
   */
  static async generateEntityMap(params: SemanticEntityMappingParams): Promise<SemanticEntity[]> {
    try {
      const { 
        projectId, 
        content, 
        pageIds = [], 
        focusKeywords = [],
        entityTypes = ['person', 'place', 'organization', 'product', 'concept', 'event'],
        minImportance = 0 
      } = params;
      
      // Collect content from pages if no content provided directly
      let combinedContent = content || '';
      
      if (!content && pageIds.length > 0) {
        const { data: pagesData, error: pagesError } = await this.supabase
          .from('crawled_pages')
          .select('content')
          .in('id', pageIds);
        
        if (pagesError) {
          console.error('Error fetching pages data:', pagesError);
          throw pagesError;
        }
        
        if (pagesData) {
          combinedContent = pagesData.map(page => page.content).join('\n\n');
        }
      }
      
      if (!combinedContent) {
        throw new Error('Content is required for semantic entity mapping');
      }
      
      // Get existing content keywords for context
      const { data: contentData, error: contentError } = await this.supabase
        .from('content_pages')
        .select('keywords')
        .eq('project_id', projectId)
        .limit(20);
      
      if (contentError) {
        console.error('Error fetching content keywords:', contentError);
        throw contentError;
      }
      
      const existingKeywords = contentData
        ? contentData.flatMap(item => item.keywords || [])
        : [];
      
      // Create the prompt for entity extraction
      const prompt = `
        You are an expert in semantic entity extraction and relationship mapping. 
        Analyze the following content to identify key entities and their relationships.
        
        CONTENT:
        ${combinedContent.substring(0, 8000)} // Limit to avoid token limits
        
        ${focusKeywords.length > 0 
          ? `FOCUS KEYWORDS: ${focusKeywords.join(', ')}` 
          : `EXISTING KEYWORDS: ${existingKeywords.join(', ')}`}
        
        ENTITY TYPES TO IDENTIFY: ${entityTypes.join(', ')}
        
        Your task is to:
        1. Identify key entities in the content
        2. Determine their semantic relationships
        3. Assess content coverage and opportunity scores
        4. Identify related keywords for each entity
        
        For each entity, provide:
        - Entity name (the canonical name of the entity)
        - Entity type (one of: ${entityTypes.join(', ')})
        - Entity description (brief 1-2 sentence description)
        - Related entities (list of other entities with relationship type and strength 1-100)
        - Related keywords (list of 5-10 keywords closely related to this entity)
        - Semantic importance (score 1-100 indicating how central this entity is to the overall topic)
        - Content coverage score (score 1-100 indicating how well the content covers this entity)
        - Opportunity score (score 1-100 indicating opportunity for expanding content about this entity)
        
        Return your analysis as a JSON array with this structure:
        [
          {
            "entityName": string,
            "entityType": string,
            "entityDescription": string,
            "relatedEntities": [
              {
                "entityName": string,
                "relationshipType": string,
                "relationshipStrength": number
              }
            ],
            "relatedKeywords": string[],
            "semanticImportance": number,
            "contentCoverageScore": number,
            "opportunityScore": number
          }
        ]
        
        Only include entities with semantic importance scores above ${minImportance}.
        Focus on the most important entities - aim for 10-20 high-quality entities rather than a large number.
      `;
      
      // Call the LLM
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      
      // Parse the JSON response
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }
      
      const entities: SemanticEntity[] = JSON.parse(jsonMatch[0]);
      
      // Store entities in the database
      for (const entity of entities) {
        // Insert the entity
        const { data: entityData, error: entityError } = await this.supabase
          .from('semantic_entity_mappings')
          .insert({
            project_id: projectId,
            entity_name: entity.entityName,
            entity_type: entity.entityType,
            entity_description: entity.entityDescription,
            related_keywords: entity.relatedKeywords,
            semantic_importance: entity.semanticImportance,
            content_coverage_score: entity.contentCoverageScore,
            opportunity_score: entity.opportunityScore,
            related_entities: JSON.stringify(entity.relatedEntities)
          })
          .select('id')
          .single();
        
        if (entityError) {
          console.error('Error storing entity:', entityError);
          continue;
        }
        
        // Add ID to the entity
        entity.id = entityData?.id;
        
        // Store relationships for visualization
        for (const relatedEntity of entity.relatedEntities) {
          // Skip if we don't have the ID of the related entity yet
          if (!relatedEntity.entityId) {
            // Try to find if this entity was already created
            const { data: existingEntity } = await this.supabase
              .from('semantic_entity_mappings')
              .select('id')
              .eq('project_id', projectId)
              .eq('entity_name', relatedEntity.entityName)
              .limit(1);
              
            if (existingEntity && existingEntity.length > 0) {
              relatedEntity.entityId = existingEntity[0].id;
            } else {
              continue;
            }
          }
          
          // Store the relationship
          const { error: relationshipError } = await this.supabase
            .from('entity_relationships')
            .insert({
              entity_id: entity.id,
              related_entity_id: relatedEntity.entityId,
              relationship_type: relatedEntity.relationshipType,
              relationship_strength: relatedEntity.relationshipStrength
            });
            
          if (relationshipError) {
            console.error('Error storing entity relationship:', relationshipError);
          }
        }
      }
      
      return entities;
    } catch (error) {
      console.error('Error generating semantic entity map:', error);
      throw error;
    }
  }

  /**
   * Get semantic entities for a project
   */
  static async getProjectEntities(
    projectId: string,
    options: {
      entityTypes?: string[];
      minImportance?: number;
      minOpportunity?: number;
      limit?: number;
    } = {}
  ): Promise<SemanticEntity[]> {
    try {
      const {
        entityTypes,
        minImportance = 0,
        minOpportunity = 0,
        limit = 100
      } = options;
      
      let query = this.supabase
        .from('semantic_entity_mappings')
        .select('*')
        .eq('project_id', projectId)
        .gte('semantic_importance', minImportance)
        .gte('opportunity_score', minOpportunity)
        .order('semantic_importance', { ascending: false })
        .limit(limit);
        
      if (entityTypes && entityTypes.length > 0) {
        query = query.in('entity_type', entityTypes);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching project entities:', error);
        throw error;
      }
      
      const entities: SemanticEntity[] = data.map(item => ({
        id: item.id,
        entityName: item.entity_name,
        entityType: item.entity_type,
        entityDescription: item.entity_description,
        relatedEntities: typeof item.related_entities === 'string' 
          ? JSON.parse(item.related_entities) 
          : item.related_entities || [],
        relatedKeywords: item.related_keywords || [],
        semanticImportance: item.semantic_importance,
        contentCoverageScore: item.content_coverage_score,
        opportunityScore: item.opportunity_score
      }));
      
      // Load relationships for each entity
      for (const entity of entities) {
        const { data: relationships, error: relationshipsError } = await this.supabase
          .from('entity_relationships')
          .select('*, related_entity:related_entity_id(id, entity_name)')
          .eq('entity_id', entity.id);
          
        if (!relationshipsError && relationships) {
          // Update related entities with full relationship data
          entity.relatedEntities = relationships.map(rel => ({
            entityId: rel.related_entity_id,
            entityName: rel.related_entity?.entity_name || '',
            relationshipType: rel.relationship_type,
            relationshipStrength: rel.relationship_strength
          }));
        }
      }
      
      return entities;
    } catch (error) {
      console.error('Error fetching project entities:', error);
      throw error;
    }
  }

  /**
   * Get entity relationships for visualization
   */
  static async getEntityRelationships(
    projectId: string,
    options: {
      entityId?: string;
      minStrength?: number;
      includeIndirect?: boolean;
    } = {}
  ): Promise<EntityRelationship[]> {
    try {
      const { entityId, minStrength = 0, includeIndirect = false } = options;
      
      // Base query to get direct relationships
      let query = this.supabase
        .from('entity_relationships as er')
        .select(`
          id,
          entity_id,
          related_entity_id,
          relationship_type,
          relationship_strength,
          entity:entity_id(id, entity_name, entity_type, project_id),
          related:related_entity_id(id, entity_name, entity_type, project_id)
        `)
        .gte('relationship_strength', minStrength);
        
      // Filter by project ID
      query = query.eq('entity.project_id', projectId);
      
      // Filter by entity ID if provided
      if (entityId) {
        if (includeIndirect) {
          query = query.or(`entity_id.eq.${entityId},related_entity_id.eq.${entityId}`);
        } else {
          query = query.eq('entity_id', entityId);
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching entity relationships:', error);
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        entityId: item.entity_id,
        relatedEntityId: item.related_entity_id,
        relationshipType: item.relationship_type,
        relationshipStrength: item.relationship_strength
      }));
    } catch (error) {
      console.error('Error fetching entity relationships:', error);
      throw error;
    }
  }

  /**
   * Generate content ideas for an entity
   */
  static async generateEntityContentIdeas(
    entityId: string,
    options: {
      contentTypes?: string[];
      targetAudience?: string;
      contentCount?: number;
    } = {}
  ): Promise<{ title: string; description: string; keywords: string[] }[]> {
    try {
      const { 
        contentTypes = ['blog', 'article', 'page', 'FAQ'], 
        targetAudience = 'general',
        contentCount = 5
      } = options;
      
      // Get entity details
      const { data: entity, error: entityError } = await this.supabase
        .from('semantic_entity_mappings')
        .select('*, project:project_id(id, industry)')
        .eq('id', entityId)
        .single();
        
      if (entityError || !entity) {
        console.error('Error fetching entity:', entityError);
        throw entityError || new Error('Entity not found');
      }
      
      // Get related entities
      const { data: relationships, error: relationshipsError } = await this.supabase
        .from('entity_relationships')
        .select('*, related:related_entity_id(id, entity_name, entity_type)')
        .eq('entity_id', entityId);
        
      if (relationshipsError) {
        console.error('Error fetching entity relationships:', relationshipsError);
        throw relationshipsError;
      }
      
      const relatedEntities = relationships.map(rel => ({
        name: rel.related?.entity_name || '',
        type: rel.related?.entity_type || '',
        relationshipType: rel.relationship_type,
        relationshipStrength: rel.relationship_strength
      }));
      
      // Create the prompt for content ideas
      const prompt = `
        You are an expert content strategist. Generate content ideas focused on the following entity.
        
        ENTITY: ${entity.entity_name}
        TYPE: ${entity.entity_type}
        DESCRIPTION: ${entity.entity_description || 'Not provided'}
        INDUSTRY: ${entity.project?.industry || 'Not specified'}
        
        RELATED KEYWORDS: ${entity.related_keywords?.join(', ') || 'None'}
        
        RELATED ENTITIES:
        ${relatedEntities.map(rel => 
          `- ${rel.name} (${rel.type}): ${rel.relationshipType} relationship, strength: ${rel.relationshipStrength}/100`
        ).join('\n')}
        
        CONTENT OPPORTUNITY SCORE: ${entity.opportunity_score}/100
        CURRENT CONTENT COVERAGE: ${entity.content_coverage_score}/100
        
        TARGET AUDIENCE: ${targetAudience}
        CONTENT TYPES: ${contentTypes.join(', ')}
        
        Generate ${contentCount} content ideas that focus on this entity. For each idea, provide:
        1. Title
        2. Brief description (2-3 sentences)
        3. List of 5-8 target keywords
        
        Return your ideas as a JSON array with this structure:
        [
          {
            "title": string,
            "description": string,
            "keywords": string[]
          }
        ]
        
        Focus on high-opportunity content that addresses gaps in current coverage.
      `;
      
      // Call the LLM
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      
      // Parse the JSON response
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error generating entity content ideas:', error);
      throw error;
    }
  }
} 