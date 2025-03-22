# Technical Context: SEOMax

## Technologies Used

### Frontend
- **Next.js 14+**: React framework with App Router for server components and routing
- **React 18+**: UI library for component-based development
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Re-usable UI components built on Radix UI
- **Framer Motion**: Animation library for interactive UI elements
- **TypeScript**: Static typing for improved code reliability

### State Management
- **Zustand**: Lightweight state management for global application state
- **React Query**: Data fetching, caching, and state management for server state

### Backend & Infrastructure
- **Next.js API Routes/Server Actions**: Backend API endpoints
- **Vercel**: Hosting platform for deployment and serverless functions
- **Edge Functions**: For specific performance-critical operations

### Database & Authentication
- **Supabase**: Backend-as-a-Service platform including:
  - PostgreSQL database for data storage
  - Auth services for user authentication
  - Storage for asset management
  - Edge Functions for serverless logic

### AI Integration
- **LangChain.js**: Framework for creating AI-powered applications
- **LangGraph.js**: Framework for building complex AI agent workflows
- **OpenAI API**: For AI-powered analysis and recommendations

### Analytics
- **Umami**: Self-hosted privacy-focused analytics (planned to be hosted on Supabase)

## Development Setup
- Node.js and npm for package management
- Git for version control
- VS Code with ESLint and Prettier for code quality
- Next.js development server for local development
- Supabase local development setup for database testing

## Technical Constraints

### Vercel Free Tier Limitations
- **Serverless Function Execution**: 100 GB-hours per month
- **Serverless Function Size**: Max 50 MB per function
- **Deployments**: 100 per day
- **Build Duration**: Limited to 45 minutes
- **Edge Functions**: Limited to 1.5 million invocations

### Supabase Free Tier Limitations
- **Database**: 500 MB storage, 2 GB bandwidth
- **Auth**: 50,000 MAU (monthly active users)
- **Storage**: 1 GB storage, 2 GB bandwidth
- **Edge Functions**: 500,000 invocations per month

### AI API Constraints
- Token usage limitations
- Rate limiting for API calls
- Cost considerations for AI processing

## Dependencies
- Tailwind and shadcn/ui for UI components
- Framer Motion for animations
- Zustand for state management
- React Query for data fetching
- Supabase JS client for database and auth
- LangChain.js and LangGraph.js for AI workflows 