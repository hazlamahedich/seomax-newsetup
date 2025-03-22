# SEOMax - AI-Powered SEO Optimization Platform

A Next.js application that leverages AI to provide comprehensive SEO analysis, content optimization, and keyword research.

## Features

### Core SEO Analysis
- Website performance analysis
- Keyword research and planning with AI insights
- On-page SEO optimization suggestions
- Domain overview dashboard with key metrics

### Content Management & Optimization
- Content quality analysis
- Readability scoring
- Keyword usage optimization
- Competitor content analysis
- Content brief generation

### Keyword Research & Analysis
- AI-powered keyword research
- Semantic keyword analysis
- Keyword competition analysis
- Related keyword suggestions
- Content idea generation
- Keyword trend analysis
- Keyword prioritization

### Technical Infrastructure
- Next.js 15+ with App Router
- Supabase for authentication and data storage
- Tailwind CSS with shadcn/ui components
- React Query for data fetching
- Zustand for state management
- Framer Motion for animations
- LangChain for AI integrations

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Dashboard pages for SEO tools
│   │   ├── content/      # Content management section
│   │   ├── projects/     # Project management
│   │   └── keywords/     # Keyword research section
│   └── page.tsx          # Homepage
├── components/           # React components
│   ├── ui/               # UI components from shadcn
│   ├── content/          # Content-related components
│   ├── projects/         # Project-related components
│   └── auth/             # Authentication components
├── lib/                  # Utility libraries
│   ├── services/         # Service classes for data operations
│   ├── ai/               # AI analysis functionality
│   ├── supabase/         # Supabase client setup
│   ├── store/            # Zustand state management
│   └── types/            # TypeScript type definitions
├── hooks/                # Custom React hooks
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
   OPENAI_API_KEY=your-openai-api-key
   ```
4. Run the development server:
   ```
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development Status

- ✅ Project setup and configuration
- ✅ Authentication system with Supabase
- ✅ Database schema design
- ✅ Project management interface
- ✅ Keyword research interface
- ✅ AI-powered keyword analysis
- ✅ Content analysis components
- ✅ Domain overview dashboard
- 🔄 Content optimization features
- 🔄 On-page SEO analysis
- 🔄 Backlink analysis
- 🔄 UI enhancements and animations

## Database Schema

The application uses Supabase as the database with the following main tables:

- **users** - User account information
- **projects** - Website projects for SEO optimization
- **keyword_rankings** - Keyword position tracking
- **content_pages** - Individual pages from websites for analysis
- **content_analysis** - Analysis results for content pages
- **content_suggestions** - Improvement suggestions for content
- **seo_recommendations** - Technical SEO recommendations

## AI-Powered Features

- **Keyword Research**: Generate related keywords, content ideas, and keyword clusters
- **Keyword Competition Analysis**: Analyze the competitive landscape for keywords
- **Keyword Trend Analysis**: Identify trends and seasonality for keywords
- **Content Analysis**: Analyze readability, keyword usage, and structure
- **Content Optimization**: Get AI-powered recommendations for improvement

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
- [LangChain](https://js.langchain.com/)
