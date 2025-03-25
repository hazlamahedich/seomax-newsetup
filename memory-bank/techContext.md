# SEOMax Technical Context

## Technology Stack

- **Frontend**: Next.js 15+ with App Router
- **UI**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query and Zustand
- **Backend**: Supabase for database and authentication
- **AI**: LangChain, LiteLLM, and OpenAI for AI services
- **PDF Generation**: jsPDF and HTML2Canvas
- **Testing**: Jest, React Testing Library, and Playwright
- **Deployment**: Vercel

## Development Setup

1. Clone repository
2. Install dependencies with `npm install`
3. Set up environment variables (see `.env.example`)
4. Start development server with `npm run dev`
5. Run tests with `npm test`

## Key Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: URL of Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public key for Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin functions
- `NEXTAUTH_SECRET`: Secret for NextAuth
- `NEXTAUTH_URL`: URL for NextAuth
- `OPENAI_API_KEY`: Key for OpenAI API access
- `ANTHROPIC_API_KEY`: Key for Anthropic API access
- `LITELLM_API_KEY`: Key for LiteLLM API
- `LITELLM_API_URL`: URL for LiteLLM API

## Database Schema

### Projects
```sql
projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users NOT NULL
)
```

### Content Pages
```sql
content_pages (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  word_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### Keywords
```sql
keywords (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects NOT NULL,
  keyword TEXT NOT NULL,
  volume INTEGER,
  difficulty DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### Technical SEO Audits
```sql
technical_seo_audits (
  id UUID PRIMARY KEY,
  site_id UUID REFERENCES projects NOT NULL,
  domain TEXT NOT NULL,
  score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  issues JSONB,
  recommendations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### Site Crawls
```sql
site_crawls (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects NOT NULL,
  domain TEXT NOT NULL,
  start_url TEXT NOT NULL,
  pages_count INTEGER NOT NULL,
  crawl_depth INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
)
```

### LLM Models
```sql
llm_models (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  description TEXT,
  max_tokens INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### LLM Usage
```sql
llm_usage (
  id UUID PRIMARY KEY,
  model_id UUID REFERENCES llm_models NOT NULL,
  project_id UUID REFERENCES projects,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_cost DECIMAL NOT NULL,
  feature TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

## API Endpoints

### Projects
- `GET /api/projects`: Get all projects
- `POST /api/projects`: Create a new project
- `GET /api/projects/:id`: Get a project by ID
- `PUT /api/projects/:id`: Update a project
- `DELETE /api/projects/:id`: Delete a project

### Keywords
- `GET /api/keywords`: Get keywords for a project
- `POST /api/keywords` with action "research": Run keyword research
- `POST /api/keywords` with action "trends": Analyze keyword trends
- `DELETE /api/keywords/:id`: Remove a keyword

### Content
- `GET /api/content`: Get content pages for a project
- `POST /api/content`: Add content to analyze
- `PUT /api/content/:id`: Update content analysis
- `DELETE /api/content/:id`: Delete content analysis

### SEO Audit
- `POST /api/seo/audit`: Run a new SEO audit
- `GET /api/seo/audit/:id`: Get audit results
- `GET /api/seo/audit/pdf/:id`: Generate a PDF report

### LLM Management
- `GET /api/llm/models`: Get available LLM models
- `POST /api/llm/models`: Add a new LLM model
- `GET /api/llm/usage`: Get LLM usage statistics
- `POST /api/llm/test`: Test an LLM with a prompt

## Keyword Trend Analysis Implementation

### TrendAnalyzer Service

The keyword trend analysis is implemented in `src/lib/ai/trend-analyzer.ts` as a static service class:

```typescript
export class TrendAnalyzer {
  /**
   * Analyzes trends for a given keyword by either using an external API
   * or falling back to LLM-based analysis when API is unavailable
   */
  static async analyzeTrends(
    keyword: string,
    industry?: string,
    options?: {
      projectId?: string,
      userId?: string
    }
  ): Promise<TrendAnalysisResponse> {
    try {
      // First attempt to use external API if configured
      if (process.env.TREND_API_KEY) {
        return await this.analyzeWithExternalAPI(keyword, industry);
      }
      
      // Fallback to LLM-based analysis
      return await this.analyzeWithLLM(keyword, industry, options);
    } catch (error) {
      // Error handling and logging
      return this.generateFallbackResponse(keyword, error);
    }
  }
  
  // Additional private methods for implementation
}
```

### Dual-Source Architecture

The trend analysis feature uses a dual-source approach:

1. **External API Integration** (Primary Source):
   - Configured via `TREND_API_KEY` environment variable
   - Fetches accurate historical data when available
   - Provides higher quality and more reliable trends data

2. **LLM-Based Analysis** (Fallback):
   - Uses the LiteLLMProvider for LLM access
   - Generates synthetic historical data to improve context
   - Implements robust parsing for structured JSON output
   - Provides consistent availability when APIs are unavailable

### Response Structure

The trend analysis returns a consistent response structure regardless of the data source:

```typescript
interface TrendAnalysisResponse {
  keyword: string;
  industry?: string;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  seasonality: {
    hasSeasonal: boolean;
    peakMonths?: string[];
    lowMonths?: string[];
    description?: string;
  };
  competitivePressure: {
    level: 'high' | 'medium' | 'low';
    description: string;
  };
  projections: {
    shortTerm: string;
    longTerm: string;
  };
  recommendedStrategies: string[];
  historicalData?: Array<{
    date: string;
    position?: number;
    volume?: number;
    competition?: number;
  }>;
  dataSource: 'api' | 'llm';
}
```

### Mock Data Generation

To enhance LLM predictions, the TrendAnalyzer generates realistic historical data:

```typescript
private static generateMockHistoricalData(
  keyword: string,
  trendDirection: 'increasing' | 'decreasing' | 'stable'
): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const now = new Date();
  
  // Generate 6 months of historical data
  for (let i = 6; i >= 1; i--) {
    const date = new Date();
    date.setMonth(now.getMonth() - i);
    
    // Generate realistic values based on trend direction
    const position = this.generatePositionValue(trendDirection, i, keyword);
    const volume = this.generateVolumeValue(trendDirection, i, keyword);
    const competition = this.generateCompetitionValue(trendDirection, i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      position,
      volume,
      competition
    });
  }
  
  return data;
}
```

### Integration with LiteLLMProvider

The TrendAnalyzer integrates with the existing LiteLLMProvider for LLM access:

```typescript
private static async analyzeWithLLM(
  keyword: string,
  industry?: string,
  options?: {
    projectId?: string,
    userId?: string
  }
): Promise<TrendAnalysisResponse> {
  // Generate mock data to enhance context
  const mockData = this.generateMockHistoricalData(keyword, 'stable');
  
  // Create prompt with context
  const prompt = this.createTrendAnalysisPrompt(keyword, industry, mockData);
  
  // Call LLM through provider
  const liteLLMProvider = LiteLLMProvider.getInstance();
  const response = await liteLLMProvider.callLLM(
    prompt,
    undefined, // Use default model
    {
      projectId: options?.projectId,
      userId: options?.userId,
      feature: 'keyword-trend-analysis'
    }
  );
  
  // Parse and validate response
  return this.parseLLMResponse(response, keyword, industry, mockData);
}
```

### Error Handling and Parsing

Robust error handling is implemented throughout the analysis process:

```typescript
private static parseLLMResponse(
  response: string,
  keyword: string,
  industry?: string,
  mockData?: HistoricalDataPoint[]
): TrendAnalysisResponse {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                      response.match(/{[\s\S]*}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsedData = JSON.parse(jsonStr);
      
      // Validate and return structured data
      return this.validateAndStructureResponse(parsedData, keyword, industry, mockData);
    }
    
    // Handle non-JSON responses
    return this.generateFallbackResponse(
      keyword, 
      new Error('Failed to extract JSON from LLM response'),
      industry,
      mockData
    );
  } catch (error) {
    // Log error and return fallback
    console.error('Error parsing LLM response:', error);
    return this.generateFallbackResponse(keyword, error, industry, mockData);
  }
}
```

### UI Integration

The trend analysis feature is integrated into the keyword analysis interface using a tab-based approach:

1. **Trends Tab**: Displays trend analysis results with visualizations
2. **Analysis Button**: Triggers trend analysis for selected keyword
3. **Results Display**: Shows trend direction, seasonality, competition, and recommendations

### Future Enhancements

Planned improvements for the trend analysis feature:

1. **Enhanced External API Integration**: Support for multiple trend data providers
2. **Historical Data Visualization**: Interactive charts for trend data
3. **Trend Comparison**: Compare trends across multiple keywords
4. **Alert System**: Notifications for significant trend changes
5. **Seasonal Planning**: Content calendar suggestions based on trend seasonality

## Third-Party Services

### OpenAI
Used for content analysis, keyword research, and SEO recommendations.

### LiteLLM
Used as an abstraction layer for multiple LLM providers.

### Supabase
Used for database, authentication, and storage.

### Vercel
Used for deployment and hosting.

## LLM Integration Implementation

### LiteLLM Provider

The centralized LLM service is implemented in `src/lib/ai/litellm-provider.ts` as a singleton:

```typescript
export class LiteLLMProvider {
  private static instance: LiteLLMProvider;
  
  private constructor() {}
  
  static getInstance(): LiteLLMProvider {
    if (!LiteLLMProvider.instance) {
      LiteLLMProvider.instance = new LiteLLMProvider();
    }
    return LiteLLMProvider.instance;
  }
  
  async callLLM(
    prompt: string, 
    model?: string, 
    options?: { 
      projectId?: string,
      featureName?: string,
      temperature?: number,
      maxTokens?: number
    }
  ): Promise<any> {
    // Implementation details for making API calls to LiteLLM
    // With error handling, logging, and usage tracking
  }
}
```

### LocalSEOService Implementation

NAP (Name, Address, Phone) extraction using LLM in `src/lib/services/LocalSEOService.ts`:

```typescript
private static async extractNAPInfo($: cheerio.CheerioAPI): Promise<NAPInfo | null> {
  // First try schema extraction (original method)
  
  // Then try LLM-based extraction
  try {
    const llmProvider = (await import('../ai/litellm-provider')).LiteLLMProvider.getInstance();
    
    // Extract relevant HTML parts for analysis
    const relevantHtmlParts = [
      $('header').html(),
      $('footer').html(),
      $('.contact, .contact-us, .contact-info, #contact').html(),
      // Additional relevant sections
    ].filter(Boolean).join('\n');
    
    // Get page metadata for context
    const pageTitle = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Construct detailed prompt
    const prompt = `
      Analyze this business website HTML content to extract business NAP information...
      // Detailed prompt with instructions and output format
    `;
    
    const response = await llmProvider.callLLM(prompt, undefined, {});
    
    // Process response with confidence checking
    if (response?.choices?.[0]?.message?.content) {
      const result = JSON.parse(response.choices[0].message.content);
      
      if (result && result.confidence.name > 70 && 
         (result.confidence.address > 70 || result.confidence.phone > 70)) {
        // Return structured NAP data
      }
    }
  } catch (llmError) {
    console.error('LLM extraction failed, falling back to rule-based extraction:', llmError);
  }
  
  // Fall back to rule-based extraction
}
```

### CompetitorAnalysisService Implementation

Content gap analysis with semantic understanding in `src/lib/services/CompetitorAnalysisService.ts`:

```typescript
private static async _identifyContentGaps(contentPage: any, competitors: CompetitorData[]): Promise<ContentGap[]> {
  try {
    // Try LLM-based content gap analysis
    try {
      const { LiteLLMProvider } = await import('../ai/litellm-provider');
      const llmProvider = LiteLLMProvider.getInstance();
      
      // Prepare limited content samples to control token usage
      const userContent = contentPage.content?.substring(0, 5000) || '';
      const competitorData = competitors.map(comp => ({
        title: comp.title,
        content: comp.content?.substring(0, 3000) || '',
        url: comp.url
      }));
      
      // Construct detailed prompt
      const prompt = `
        I need to identify content gaps between my page and competitor pages...
        // Detailed prompt with instructions and output format
      `;
      
      const response = await llmProvider.callLLM(prompt, undefined, {
        projectId: contentPage.projectId
      });
      
      // Process and validate response
      if (response?.choices?.[0]?.message?.content) {
        try {
          const result = JSON.parse(response.choices[0].message.content);
          // Validation logic
          if (validResults.length > 0) {
            return validResults;
          }
        } catch (parseError) {
          console.error('Error parsing LLM response:', parseError);
        }
      }
    } catch (llmError) {
      console.error('LLM content gap analysis failed:', llmError);
    }
    
    // Fall back to rule-based implementation
    return sampleGaps;
  } catch (error) {
    console.error('Error in _identifyContentGaps:', error);
    return [];
  }
}
```

### TechnicalSEOService Implementation

Generating contextual recommendations in `src/lib/services/TechnicalSEOService.ts`:

```typescript
static async generateRecommendations(siteCrawlId: string): Promise<Record<string, string[]>> {
  try {
    // Fetch technical issues and site information
    const issues = await this.getIssuesByCrawlId(siteCrawlId);
    const crawl = await this.getCrawlData(siteCrawlId);
    
    if (!issues.length || !crawl) {
      return this.getFallbackRecommendations();
    }
    
    // Group issues by type for analysis
    const issuesByType = this.groupIssuesByType(issues);
    
    // Try LLM-based recommendation generation
    try {
      const { LiteLLMProvider } = await import('../ai/litellm-provider');
      const llmProvider = LiteLLMProvider.getInstance();
      
      // Prepare summary of issues for the prompt
      const issueSummary = this.prepareIssueSummary(issuesByType);
      
      // Construct detailed prompt
      const prompt = `
        Generate prioritized SEO recommendations based on the following technical issues...
        // Detailed prompt with instructions and output format
      `;
      
      const response = await llmProvider.callLLM(prompt, undefined, { 
        projectId: crawl.project_id 
      });
      
      // Process and validate response
      if (response?.choices?.[0]?.message?.content) {
        try {
          const results = JSON.parse(response.choices[0].message.content);
          if (this.validateRecommendationsSchema(results)) {
            return results;
          }
        } catch (parseError) {
          console.error('Error parsing LLM recommendations:', parseError);
        }
      }
    } catch (llmError) {
      console.error('LLM recommendation generation failed:', llmError);
    }
    
    // Fall back to rule-based recommendations
    return this.generateRuleBasedRecommendations(issuesByType);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {};
  }
}
```

## Testing Approach

### Unit Tests
- Small, isolated tests for individual functions and components
- Mock external dependencies and services

### Integration Tests
- Test interactions between components
- Mock external APIs but use real service implementations

### End-to-End Tests
- Use Playwright to test complete user journeys
- Run against a development environment

## Dependencies

### Core
- next: ^15.0.0
- react: ^18.2.0
- react-dom: ^18.2.0
- next-auth: ^4.24.5
- @supabase/auth-helpers-nextjs: ^0.8.7
- @supabase/supabase-js: ^2.39.1

### UI
- tailwindcss: ^3.3.0
- class-variance-authority: ^0.7.0
- clsx: ^2.0.0
- lucide-react: ^0.294.0
- framer-motion: ^10.16.16

### Data Fetching
- @tanstack/react-query: ^5.13.4
- zustand: ^4.4.7

### AI
- langchain: ^0.0.200
- litellm: ^1.11.1
- openai: ^4.20.1
- anthropic: ^0.9.0

### PDF Generation
- jspdf: ^2.5.1
- html2canvas: ^1.4.1

### Testing
- jest: ^29.7.0
- @testing-library/react: ^14.1.2
- @playwright/test: ^1.40.1

## Build and Deployment

- Build with `npm run build`
- Test with `npm test`
- Deploy with Vercel CLI or GitHub integration

## Technical Constraints

- Node.js v18+ required
- PostgreSQL v15+ required for Supabase
- API keys required for various services
- Environment variables must be configured properly
- Rate limits on external APIs (OpenAI, Anthropic, etc.)
- Token usage constraints for LLM services

## Performance Considerations

- LLM API calls are expensive and can be slow
- Implement caching for LLM responses
- Control token usage with input truncation
- Use streaming responses where appropriate
- Implement proper error handling and fallbacks
- Monitor usage and costs with analytics

## Technologies Used

### Frontend
- **Next.js 15+** - React framework with App Router for server and client components
- **React** - UI library for component-based development
- **TypeScript** - Typed JavaScript for better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI
- **React Query** - Data fetching and state management
- **Zustand** - Lightweight state management
- **Framer Motion** - Animation library
- **Recharts** - Charting library for data visualization

### Backend
- **Supabase** - PostgreSQL database with auth and RLS
- **Next.js API Routes** - Serverless functions for API endpoints
- **NextAuth.js** - Authentication for Next.js
- **LangChain** - Framework for LLM applications

### AI Integration
- **LiteLLM** - Abstraction layer for LLM providers
- **OpenAI API** - Primary LLM provider
- **Anthropic Claude** - Alternative LLM for specific use cases
- **Langchain** - Framework for LLM application development

### SEO Analysis
- **Crawlee** - Web crawling and scraping library
- **Cheerio** - HTML parsing
- **Lighthouse** - Performance and SEO analysis
- **Chrome Headless** - Browser automation

### Visualization
- **jsPDF** - PDF generation
- **HTML2Canvas** - Screenshot and image generation
- **Recharts** - Interactive charts and graphs
- **CountUp.js** - Animated number counters

### Testing
- **Jest** - JavaScript testing framework
- **React Testing Library** - Testing React components
- **Playwright** - E2E testing framework
- **MSW** - Mock Service Worker for API mocking

## New AI Features Technical Stack

### AI Content Rewriter with SEO Context
- **Implementation**: TypeScript service with static methods
- **Database**: `content_rewrites` table in Supabase with RLS
- **Key Technologies**:
  - LangChain for structured LLM interactions
  - Readability algorithms (Flesch-Kincaid)
  - JSON parsing for E-E-A-T signal analysis
  - React Query for data fetching and mutations
  - Tailwind/shadcn for UI components
  - Tab-based interface with form inputs and results display

### SEO ROI Forecasting
- **Implementation**: TypeScript service with forecasting algorithms
- **Database**: `seo_forecasts` and `site_metrics` tables
- **Key Technologies**:
  - LiteLLM for provider abstraction
  - Statistical projection algorithms
  - JSON-based data modeling
  - Recharts for visualization
  - React Query for fetching and managing data
  - Form components with validation

### SERP Volatility Prediction
- **Implementation**: Static service with prediction methods
- **Database**: Tables for storing predictions and historical data
- **Key Technologies**:
  - LLM integration for pattern recognition
  - Historical data analysis
  - React Query for data management
  - Error handling middleware for robust operation

### Schema Markup Generator
- **Implementation**: Service with template-based generation
- **Database**: Tables for templates and implementations
- **Key Technologies**:
  - JSON-LD generation and validation
  - Template system for common schema types
  - Code highlighting for markup display
  - Wizard-based implementation flow

### Competitor Strategy Decoder
- **Implementation**: Service for competitor analysis
- **Database**: Tables for storing strategies and counter-tactics
- **Key Technologies**:
  - LLM for strategic analysis
  - Comparative data processing
  - React components for strategy visualization
  - Implementation planning algorithms

## Development Setup

### Required Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

### Local Development
1. Clone the repository
2. Install dependencies with `npm install`
3. Set up environment variables in `.env.local`
4. Run database migrations
5. Start the development server with `npm run dev`

### Database Migrations
- Stored in `/migrations` directory
- Run with Supabase CLI or manually
- Include RLS policies for security

## Technical Constraints

### Performance
- LLM API calls can have high latency (1-5 seconds)
- PDF generation for large reports is resource-intensive
- Full site crawls may time out for very large sites

### Security
- API keys stored as environment variables
- Row-level security enforced at database level
- User data isolation through RLS policies
- NextAuth for secure session management

### Scalability
- Serverless architecture for most API routes
- Database connection pooling for high traffic
- Rate limiting for expensive operations
- Caching for common queries

## Dependencies
Major dependencies and their versions:

```json
{
  "dependencies": {
    "@radix-ui/react-icons": "^1.3.0",
    "@tanstack/react-query": "^5.0.0",
    "langchain": "^0.0.167",
    "next": "^15.0.0",
    "next-auth": "^4.24.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.1",
    "zustand": "^4.4.6",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "date-fns": "^2.30.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.9.0",
    "@types/react": "^18.2.37",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.53.0",
    "jest": "^29.7.0",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2"
  }
}
``` 