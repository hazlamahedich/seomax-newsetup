# Technical Context

## Technologies Used

### Frontend
- **Next.js 15+**: Using the App Router for improved performance and routing capabilities
- **React 18**: For component-based UI development with the latest features
- **TypeScript**: For type safety across the codebase
- **Tailwind CSS**: For utility-first styling
- **shadcn/ui**: For high-quality UI components with Tailwind integration
- **Framer Motion**: For smooth animations and transitions
- **Recharts**: For data visualization
- **Zustand**: For client-side state management
- **React Query**: For server state management and data fetching
- **Axios**: For HTTP requests with consistent error handling

### Backend
- **Supabase**: For authentication, database, and storage
  - PostgreSQL: For relational data storage
  - Row-Level Security (RLS): For fine-grained data access control
  - Supabase Pooler: For high-traffic database connections 
- **Next.js API Routes**: For serverless API endpoints
- **Edge Functions**: For global low-latency functionality

### AI and Analysis
- **LangChain**: For AI orchestration and prompt management
- **OpenAI**: For content analysis and optimization suggestions
- **Node.js Workers**: For background processing of SEO analysis tasks

### Testing
- **Jest**: For unit and integration testing
- **React Testing Library**: For component testing
- **Playwright**: For end-to-end testing
- **Storybook**: For component documentation and visual testing
- **MSW (Mock Service Worker)**: For API mocking

### DevOps
- **GitHub Actions**: For CI/CD pipelines
- **Vercel**: For hosting and deployment
- **Docker**: For containerized development and testing

## Development Setup

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_SUPABASE_POOLER_URL=<your-supabase-pooler-url>
OPENAI_API_KEY=<your-openai-api-key>
NEXT_PUBLIC_SITE_URL=<your-site-url>
```

### Database Schema
The main tables in our Supabase database:
- **users**: User profiles and preferences
- **websites**: Websites being analyzed
- **pages**: Individual pages within websites
- **seo_audits**: SEO audit results
- **content_analyses**: Content analysis results
- **keywords**: Tracked keywords and rankings
- **user_feedback**: Feedback submitted by users

### Performance Considerations
- Use of connection pooling for database performance under load
- Implementation of optimistic updates for responsive UI
- Strategic use of React Query for caching and revalidation
- Incremental Static Regeneration for frequently accessed pages
- Edge functions for global low-latency operations
- Proper indexing on database tables for query performance

## Technical Constraints

### Supabase Integration
- Authentication tied to Supabase Auth
- Database operations follow Supabase patterns and constraints
- RLS policies must be carefully designed for security
- Session pooler requires proper connection management

### Browser Compatibility
- Support for modern browsers (Chrome, Firefox, Safari, Edge)
- Progressive enhancement for older browsers
- Mobile-first approach for responsive design

### Performance Requirements
- Page load times under 1.5 seconds
- Time to Interactive under 3 seconds
- Lighthouse score above 90 for all categories
- Smooth animations (60fps)

### AI Integration
- Rate limiting for API calls to OpenAI
- Fallback mechanisms for AI service interruptions
- Caching of AI responses when appropriate

## Data Flow Architecture

### Content Analysis Flow
1. User submits content for analysis
2. Content is processed through various analysis engines:
   - Readability analysis
   - Keyword usage analysis
   - Structure analysis
   - Competitor analysis
3. Results are stored in the database
4. UI updates with analysis results and recommendations

### SEO Audit Flow
1. User adds a website for analysis
2. Site crawler discovers pages and structure
3. Each page is analyzed for technical SEO factors
4. Results are aggregated and stored
5. UI displays issues and recommendations

### Feedback System Flow
1. User submits feedback through the feedback dialog
2. Feedback is stored in the database with user information
3. Admin users can review and manage feedback
4. Feedback statistics are calculated for administrative overview

## Dependencies
Major dependencies and their purposes:

```json
{
  "dependencies": {
    "@radix-ui/react-icons": "For accessible icons",
    "@supabase/auth-helpers-nextjs": "For Supabase auth integration",
    "@supabase/supabase-js": "For Supabase client operations",
    "axios": "For HTTP requests",
    "class-variance-authority": "For component styling variants",
    "clsx": "For conditional class names",
    "framer-motion": "For animations",
    "langchain": "For AI orchestration",
    "lucide-react": "For icon set",
    "next": "React framework",
    "react": "UI library",
    "react-dom": "DOM rendering for React",
    "react-query": "For data fetching and caching",
    "recharts": "For data visualization",
    "tailwind-merge": "For Tailwind class merging",
    "tailwindcss-animate": "For Tailwind animations",
    "zustand": "For state management"
  },
  "devDependencies": {
    "@playwright/test": "For E2E testing",
    "@testing-library/jest-dom": "For DOM testing utilities",
    "@testing-library/react": "For React component testing",
    "@types/node": "TypeScript definitions",
    "@types/react": "TypeScript definitions",
    "autoprefixer": "For CSS compatibility",
    "eslint": "For code linting",
    "eslint-config-next": "ESLint Next.js config",
    "jest": "For unit testing",
    "msw": "For API mocking",
    "postcss": "For CSS processing",
    "tailwindcss": "For utility CSS",
    "typescript": "For type checking"
  }
}
```

## Development Setup

### Environment Requirements
- Node.js 18+
- npm/yarn
- Supabase account for database
- OpenAI API key for AI features

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `OPENAI_API_KEY`: OpenAI API key
- `NEXT_PUBLIC_APP_URL`: Base URL of the application

### Local Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Run tests: `npm test`
5. Run E2E tests: `npm run test:e2e`

## Technical Constraints

### Performance
- Optimizing AI request latency for content analysis
- Managing state rehydration for large datasets
- Limiting bundle size for fast initial load

### Security
- Protected API routes with authentication
- Rate limiting for public endpoints
- Secure handling of API keys

### Scalability
- Optimizing database queries for large datasets
- Chunking large content for analysis
- Efficient storage of historical data

## Dependencies

### Core Dependencies
- React and Next.js ecosystem
- Supabase JS client
- LangChain for AI integration

### Development Dependencies
- TypeScript
- ESLint and Prettier
- Jest and React Testing Library
- Playwright for E2E testing
- Storybook (planned)

## CI/CD Pipeline

### GitHub Actions Workflows
- Build validation
- Unit and integration tests
- End-to-end tests
- Linting and type checking

### Deployment
- Vercel for frontend deployment
- Supabase for backend services

## Core Technologies

### Frontend Framework
- **Next.js**: v15+ with App Router architecture
- **React**: Core UI library with server and client components
- **TypeScript**: For type-safe code development

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library built on Radix UI
- **Framer Motion**: For animations and transitions

### State Management
- **React Query (TanStack Query)**: For server state management, data fetching, and caching
- **Zustand**: For client-side state management
- **React Context**: For theme and authentication state

### Database & Backend
- **Supabase**: PostgreSQL database with authentication services
- **Next-Auth**: For authentication with Supabase as credentials provider
- **PostgreSQL**: Relational database through Supabase

### AI Integration
- **LangChain**: For structured AI prompt workflows
- **OpenAI**: GPT-4 model access through LangChain
- **Structured Output Parsing**: For consistent AI response handling

### Data Visualization
- **Recharts**: For performance graphs and analytics
- **D3.js**: For topic cluster visualization
- **react-flow**: For node-based relationship mapping

### Testing
- **Jest**: Testing framework
- **React Testing Library**: For component testing
- **Mock Service Worker**: For API mocking in tests

## Development Setup

### Environment Requirements
- Node.js v18+ (preferably v20+)
- npm or yarn package manager
- Git for version control
- OpenAI API key for AI services
- Supabase project with configured tables

### Environment Variables
```
# Next.js
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

### Local Development
1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env.local`
4. Run development server: `npm run dev`
5. Access application at `http://localhost:3000`

### Database Schema
Key tables in Supabase:
- **users**: User profiles
- **projects**: SEO projects
- **keywords**: Keyword research data
- **content_pages**: Content pieces being analyzed
- **content_analysis**: Analysis results for content
- **content_suggestions**: SEO suggestions for content

## Technical Constraints

### AI Service Limitations
- **Rate Limits**: OpenAI API has token and request limits
- **Response Time**: AI analysis can take 5-30 seconds depending on content length
- **Token Costs**: Longer content analysis has higher token costs
- **Consistency**: AI response quality may vary despite structured prompts

### Performance Considerations
- **Hydration**: Next.js hydration can be affected by browser extensions
  - Resolved with `suppressHydrationWarning` on html/body elements
- **API Timeouts**: Supabase and OpenAI requests may timeout
  - Implement timeout handling and graceful degradation
- **Bundle Size**: Monitor client bundle size with large dependencies
- **Content Size**: Large content pieces may affect analysis performance

### Browser Compatibility
- Targets modern browsers (Chrome, Firefox, Safari, Edge)
- Minimal compatibility with IE11 (not actively supported)

### Deployment Requirements
- Node.js hosting environment
- Environment variables for API keys and secrets
- Database connection to Supabase
- Memory allocation for AI service calls

## Architectural Decisions

### Server Components vs. Client Components
- Server Components for data fetching and initial rendering
- Client Components for interactive elements
- "use client" directive clearly marks client components

### Error Handling Strategy
- Try/catch blocks around all data fetching operations
- Fallback UI components for error states
- Structured error messages for user guidance
- Error logging for debugging and monitoring

### Authentication Flow
- Next-Auth with Supabase Credentials provider
- Protected routes via middleware
- Session persistence with cookies
- Automatic redirection for unauthenticated users

### Content Analysis Pipeline
- Content submission → Initial analysis → Competitor comparison → Suggestions
- Background processing for long-running tasks
- Persistent storage of analysis results
- Incremental updates for content changes

## Known Issues and Workarounds

1. **React Hydration Errors**
   - **Issue**: Browser extensions like Grammarly modify DOM, causing hydration mismatches
   - **Solution**: Added `suppressHydrationWarning` to html and body elements

2. **Session Fetch Errors**
   - **Issue**: "Unexpected end of JSON input" errors during session fetching
   - **Solution**: Implemented fallback session data and timeout handling

3. **Supabase Client Export**
   - **Issue**: Missing `createClient` export in Supabase client file
   - **Solution**: Added proper export of `createClient` function

4. **TypeScript-LangChain Integration**
   - **Issue**: Type definitions for custom LangChain outputs
   - **Solution**: Created custom type declarations for structured outputs

5. **Testing Environment Setup**
   - **Issue**: Missing module declarations for testing libraries
   - **Solution**: Add type definitions for Jest and Testing Library 