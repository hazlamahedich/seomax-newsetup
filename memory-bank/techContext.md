# Technical Context

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