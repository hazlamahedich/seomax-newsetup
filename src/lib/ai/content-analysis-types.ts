export interface ReadabilityAnalysis {
  reading_level: string;
  sentence_complexity: string;
  vocabulary_level: string;
  passive_voice_percentage: number;
  readability_score: number;
  improvement_areas: string[];
  analysis_summary: string;
}

export interface KeywordAnalysis {
  keyword_density: Record<string, number>;
  keyword_placement: {
    title: boolean;
    headings: boolean;
    intro: boolean;
    body: boolean;
    conclusion: boolean;
  };
  optimization_score: number;
  analysis_summary: string;
}

export interface StructureAnalysis {
  heading_hierarchy: {
    h1_count: number;
    h2_count: number;
    h3_count: number;
  };
  structure_score: number;
  analysis_summary: string;
}

export interface ContentAIAnalysis {
  readability: ReadabilityAnalysis;
  keyword: KeywordAnalysis;
  structure: StructureAnalysis;
  suggestions: {
    suggestion_type: string;
    original_text: string;
    suggested_text: string;
    reason: string;
  }[];
}