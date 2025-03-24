# Technical Context

## Tech Stack

The SEOMax application is built on a modern tech stack:

- **Frontend**: Next.js 15+ with App Router
- **UI**: Tailwind CSS with shadcn/ui components
- **Backend**: Next.js API Routes and Server Components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with Supabase adapter
- **State Management**: React Query for server state, Zustand for client state
- **AI/LLM Integration**: LangChain for structured AI interactions
- **SEO Analysis**: Custom services with Cheerio for HTML parsing
- **Chart Visualization**: Recharts
- **Form Handling**: React Hook Form with Zod validation
- **Animation**: Framer Motion
- **PDF Generation**: jsPDF with html2canvas
- **Testing**: Jest with React Testing Library, Playwright for E2E

## Architecture

SEOMax follows a modern web application architecture designed for scalability and maintainability:

1. **Frontend Architecture**
   - Next.js App Router with React Server Components
   - Clear separation between server and client components
   - Folder-based routing structure
   - Layout components for consistent UI
   - Client-side interactivity with React hooks and state management

2. **Backend Architecture**
   - API Routes for data operations
   - Server Components for server-side rendering
   - Service layer for business logic
   - Repository pattern for data access
   - Middleware for request processing

3. **Database Architecture**
   - PostgreSQL with Supabase
   - Row-Level Security (RLS) for permissions
   - Foreign key relationships for data integrity
   - Indexes for query performance
   - Migrations for schema changes

4. **Authentication Architecture**
   - NextAuth.js for authentication flow
   - JWT-based session management
   - Middleware for route protection
   - Supabase adapter for credential storage

5. **SEO Analysis Architecture**
   - Service-based approach for modularity
   - Specialized analyzers for different SEO aspects
   - Crawling capabilities with pagination
   - Scoring system for SEO health assessment
   - Recommendation generation based on findings

6. **Local SEO Analysis Architecture** (New)
   - Dedicated `LocalSEOService` for local business SEO assessment
   - Specialized analysis methods for NAP consistency, GBP detection, schema validation
   - Integration with `SEOAnalysisIntegration` for cohesive analysis
   - Database schema for local SEO analysis results
   - API route for triggering and refreshing analysis

## Development Setup

### Environment Requirements
- Node.js v18+
- npm 9+ or yarn 1.22+
- PostgreSQL (via Supabase)
- Supabase CLI (optional, for local development)

### Environment Variables
```
# Base
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# LLM Providers
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Development Commands
```
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# E2E tests
npm run test:e2e
```

## Deployment

The application is deployed using Vercel with the following configuration:

1. **Build Settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

2. **Environment Variables**
   - All environment variables from development setup
   - Production-specific values for URLs and API keys

3. **Edge Functions**
   - Authentication middleware deployed as Edge function
   - API routes optimized for Edge runtime

4. **Serverless Functions**
   - Compute-intensive operations deployed as serverless functions
   - Memory limits adjusted for large operations

## Database Schema

The database schema includes the following key tables:

1. **Users and Authentication**
   - `auth.users`: User accounts
   - `auth.sessions`: User sessions
   - `public.user_profiles`: Extended user information

2. **Projects and Organization**
   - `projects`: SEO projects
   - `project_members`: User-project relationships
   - `organizations`: Business organizations
   - `organization_members`: User-organization relationships

3. **SEO Analysis**
   - `site_crawls`: Record of site crawling operations
   - `crawled_pages`: Individual pages from crawls
   - `seo_analyses`: Overall SEO analysis results
   - `technical_seo_analyses`: Technical SEO results
   - `content_analyses`: Content analysis results
   - `backlink_analyses`: Backlink analysis results
   - `social_media_analyses`: Social media metrics
   - `localseo_analyses`: Local SEO analysis results (New)

4. **Keywords and Content**
   - `keywords`: Target keywords
   - `keyword_rankings`: Historical ranking data
   - `content_briefs`: AI-generated content briefs
   - `content_optimizations`: Content improvement tracking

5. **LLM Management**
   - `llm_models`: Model configurations
   - `llm_usage`: Token usage tracking
   - `llm_prompts`: Stored prompt templates

## API Structure

The API is structured with the following endpoints:

1. **Authentication**
   - `/api/auth/[...nextauth]`: NextAuth.js routes

2. **Projects**
   - `/api/projects`: CRUD operations for projects
   - `/api/projects/[id]/members`: Project member management

3. **SEO Analysis**
   - `/api/analyze/technical-seo`: Technical SEO analysis
   - `/api/analyze/content`: Content analysis
   - `/api/analyze/backlinks`: Backlink analysis
   - `/api/analyze/social-media`: Social media analysis
   - `/api/analyze/local-seo`: Local SEO analysis (New)

4. **Keywords**
   - `/api/keywords`: Keyword management
   - `/api/keywords/rankings`: Ranking data
   - `/api/keywords/suggestions`: AI suggestions

5. **Content**
   - `/api/content/briefs`: Content brief generation
   - `/api/content/optimize`: Content optimization

6. **LLM Management**
   - `/api/llm/models`: Model configuration
   - `/api/llm/usage`: Usage statistics
   - `/api/llm/test`: Model testing

## Dependencies

### Core Dependencies
- `next`: 15.0.0
- `react`: 18.2.0
- `react-dom`: 18.2.0
- `tailwindcss`: 3.3.0
- `@supabase/supabase-js`: 2.10.0
- `next-auth`: 4.24.0
- `@tanstack/react-query`: 5.0.0
- `zustand`: 4.4.1
- `langchain`: 0.0.150
- `cheerio`: 1.0.0-rc.12
- `date-fns`: 2.30.0
- `zod`: 3.22.2

### UI Dependencies
- `@radix-ui/react-*`: Various UI primitives
- `class-variance-authority`: 0.7.0
- `clsx`: 2.0.0
- `framer-motion`: 10.16.4
- `lucide-react`: 0.294.0
- `tailwind-merge`: 1.14.0
- `recharts`: 2.9.0

### Dev Dependencies
- `typescript`: 5.2.2
- `@types/react`: 18.2.21
- `@types/node`: 20.6.0
- `eslint`: 8.49.0
- `prettier`: 3.0.3
- `jest`: 29.6.2
- `@testing-library/react`: 14.0.0
- `@playwright/test`: 1.38.0

### Local SEO Dependencies (New)
- Uses existing `cheerio` for HTML parsing
- Leverages `SchemaMarkupService` for JSON-LD validation
- Works with `GradingSystemService` for scoring

## Testing Strategy

The project employs a comprehensive testing strategy:

1. **Unit Testing**
   - Jest for JavaScript/TypeScript testing
   - React Testing Library for component testing
   - Mock service worker for API mocking
   - Coverage targets for critical code paths

2. **Integration Testing**
   - API route testing with supertest
   - Component integration with React Testing Library
   - Database operations with test databases

3. **End-to-End Testing**
   - Playwright for full E2E testing
   - Critical user journeys automated
   - Visual regression testing

4. **Local SEO Testing Strategy** (New)
   - Unit tests for each analyzer method
   - Mock HTML fixtures for testing detection patterns
   - Integration tests with SEO analysis flow
   - E2E tests for local SEO analysis page

## Technical Constraints

1. **Performance**
   - Optimize for Core Web Vitals
   - Large site analysis requires pagination
   - LLM API rate limits

2. **Security**
   - Row-Level Security in Supabase
   - Environment variable protection
   - API route authentication
   - CSRF protection

3. **Scalability**
   - Database connection pooling
   - Caching for frequently accessed data
   - Optimistic UI updates
   - Background processing for intensive operations

4. **Browser Compatibility**
   - Support for modern browsers (last 2 versions)
   - Graceful degradation for older browsers
   - Responsive design for all device sizes

## Local SEO Implementation (New)

The Local SEO implementation expands SEOMax's capabilities to assess business location-specific SEO factors:

1. **Core Functionality**
   - NAP (Name, Address, Phone) consistency checker
   - Google Business Profile detection
   - LocalBusiness schema.org validation
   - Local keyword usage analysis
   - Maps embed detection

2. **Technical Implementation**
   - `LocalSEOService` class with specialized analysis methods
   - Database schema extensions for storing analysis results
   - API route for triggering analysis
   - Integration with existing SEO analysis flow
   - UI components for displaying results

3. **Data Flow**
   - Site pages crawled and analyzed for local signals
   - HTML parsed with Cheerio for DOM traversal
   - Schema.org markup extracted and validated
   - Contact details pattern-matched across pages
   - Google Business Profile links detected
   - Map embeds identified and verified
   - Results scored and stored in database
   - Recommendations generated based on findings

4. **Technical Considerations**
   - NAP format normalization to handle variations
   - Schema validation against LocalBusiness specification
   - Address matching with fuzzy comparison
   - Local keyword context analysis
   - Integration with PDFGenerationService for reports 