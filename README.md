# SEOMax - AI-Powered SEO Optimization Platform

A Next.js application that leverages AI to provide comprehensive SEO analysis, content optimization, and backlink management.

## Features

### Core SEO Analysis
- Website performance analysis
- Keyword research and planning
- On-page SEO optimization suggestions

### Content Management & Optimization
- Content quality analysis
- Readability scoring
- Keyword usage optimization
- Competitor content analysis
- Content brief generation

### Backlink Analysis & Management
- Backlink tracking and monitoring
- Backlink quality scoring
- Competitor backlink gap analysis
- Automated report generation
- Backlink visualization dashboards
- Scheduled reporting capabilities

### Technical Infrastructure
- Next.js 14+ with App Router
- Supabase for authentication and data storage
- Tailwind CSS with shadcn/ui components
- React Query for data fetching
- Zustand for state management
- Framer Motion for animations

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Dashboard pages for SEO tools
│   │   ├── content/      # Content management section
│   │   ├── backlinks/    # Backlink analysis section
│   │   └── keywords/     # Keyword research section
│   └── page.tsx          # Homepage
├── components/           # React components
│   ├── ui/               # UI components from shadcn
│   ├── content/          # Content-related components
│   ├── backlinks/        # Backlink-related components
│   └── auth/             # Authentication components
├── lib/                  # Utility libraries
│   ├── services/         # Service classes for data operations
│   ├── supabase/         # Supabase client setup
│   ├── store/            # Zustand state management
│   └── types/            # TypeScript type definitions
└── styles/               # Global styles
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Run the development server:
   ```
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development Status

- ✅ Project setup and configuration
- ✅ Authentication system
- ✅ Database schema design
- ✅ Content management features
- ✅ Content analysis components
- ✅ Backlink analysis and tracking
- ✅ Competitor backlink gap analysis
- ✅ Automated report generation
- 🔄 UI enhancements and animations
- 🔄 Natural language query interface
- 🔄 Comprehensive help system

## Project Structure

```
seomax/
├── src/                # Application source code
│   ├── app/            # Next.js app router files
│   │   ├── dashboard/  # Protected dashboard routes
│   │   ├── login/      # Authentication pages
│   │   └── ...         # Other app routes
│   ├── components/     # Reusable UI components
│   │   ├── ui/         # UI component library
│   │   ├── content/    # Content-specific components
│   │   └── ...         # Other component categories
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions and libraries
│   │   ├── services/   # Service layer for backend communication
│   │   ├── supabase/   # Supabase client configuration
│   │   └── types/      # TypeScript type definitions
│   └── styles/         # Global styles
├── public/             # Static files
├── .env.local          # Environment variables (create this file)
├── next.config.js      # Next.js configuration
├── package.json        # Project dependencies
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Database Schema

The application uses Supabase as the database with the following main tables:

- **users** - User account information
- **projects** - Website projects for content optimization
- **content_pages** - Individual pages from websites for analysis
- **content_analysis** - Analysis results for content pages
- **content_suggestions** - Improvement suggestions for content
- **competitor_content** - Competitor content for comparison
- **competitor_analysis** - Analysis of competitor content
- **content_briefs** - Content briefs for creating new content
- **topic_clusters** - Topic clusters for content organization

## Content Management Features

- **Content Page Analysis**: Analyze readability, keyword usage, and structure
- **Competitor Content Analysis**: Compare your content against competitors
- **Content Optimization Suggestions**: Get AI-powered recommendations
- **Content Brief Generator**: Create detailed briefs for new content
- **Topic Clustering**: Organize content by related topics

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
