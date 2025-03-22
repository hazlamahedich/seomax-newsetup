import React from 'react';
import { ContentAnalysisSummary } from '@/components/content/ContentAnalysisSummary';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCcw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ContentPageService } from '@/lib/services/content-service';

export const dynamic = 'force-dynamic';

export default async function ContentDetailPage({ 
  params 
}: { 
  params: { id: string; contentId: string } 
}) {
  const supabase = createServerClient();
  
  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Get the project to ensure it belongs to the current user
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    redirect('/dashboard');
  }

  // Get content page with analysis data
  const { page: contentPage, analysis: latestAnalysis } = 
    await ContentPageService.getContentPageWithAnalysis(params.contentId);

  if (!contentPage) {
    redirect(`/dashboard/projects/${params.id}/content`);
  }

  // Mock data for analysis results if needed
  const mockReadabilityData = {
    readingLevel: "Grade 9-10 (High School)",
    sentenceComplexity: "Medium complexity with some long sentences",
    vocabularyLevel: "Moderate, with some industry-specific terminology",
    passiveVoiceUsage: "10% of sentences use passive voice",
    overallScore: 78,
    improvementAreas: [
      "Consider shortening sentences in the third paragraph",
      "Replace technical jargon with simpler alternatives where possible",
      "Add more transition words to improve flow between sections"
    ]
  };

  const mockKeywordData = {
    density: "Primary keyword appears 6 times (1.8% density)",
    placement: "Present in title, H1, meta description, and body content",
    naturalUsage: "Keywords are used naturally throughout the content",
    relatedKeywords: ["SEO optimization", "content strategy", "digital marketing", "search rankings"],
    optimizationScore: 85,
    recommendations: [
      "Add 1-2 more instances of the primary keyword in the body content",
      "Include more semantically related terms",
      "Add the primary keyword to at least one image alt text"
    ]
  };

  const mockStructureData = {
    headingHierarchy: "Good use of H2 and H3 headings, follows logical structure",
    contentOrganization: "Content flows logically with clear sections",
    introAndConclusion: "Strong introduction, conclusion could be more action-oriented",
    formatting: "Good use of bullet points and short paragraphs",
    contentGaps: [
      "Missing section on mobile optimization",
      "Could expand on examples or case studies",
      "No current call-to-action at the end of the article"
    ],
    overallScore: 72
  };

  // Calculate overall score
  const overallScore = latestAnalysis?.overall_score || 
    Math.round((mockReadabilityData.overallScore + mockKeywordData.optimizationScore + mockStructureData.overallScore) / 3);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/dashboard/projects/${params.id}/content`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{contentPage.title}</h1>
          </div>
          <p className="text-muted-foreground">
            <Link href={contentPage.url} className="hover:underline text-blue-500" target="_blank">
              {contentPage.url}
            </Link>
          </p>
        </div>
        
        <div className="flex gap-2">
          <form action={async () => {
            'use server';
            
            // Delete the content page
            await ContentPageService.deleteContentPage(params.contentId);
            
            // Redirect to content page listing
            redirect(`/dashboard/projects/${params.id}/content`);
          }}>
            <Button variant="destructive" type="submit">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </form>
          
          <form action={async () => {
            'use server';
            
            // Trigger content analysis
            await ContentPageService.analyzeContentPage(params.contentId);
            
            // Redirect to the same page to refresh the data
            redirect(`/dashboard/projects/${params.id}/content/${params.contentId}`);
          }}>
            <Button type="submit">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Analyze Content
            </Button>
          </form>
        </div>
      </div>

      {contentPage.status === 'analyzing' ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 border border-dashed rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <h3 className="text-lg font-medium">Analyzing content...</h3>
          <p className="text-muted-foreground text-center max-w-md">
            We're analyzing your content to provide you with actionable insights. This may take a few moments.
          </p>
        </div>
      ) : contentPage.status === 'not-analyzed' ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 border border-dashed rounded-lg">
          <h3 className="text-lg font-medium">Content not analyzed yet</h3>
          <p className="text-muted-foreground text-center max-w-md">
            This content has not been analyzed yet. Click the "Analyze Content" button to get insights.
          </p>
        </div>
      ) : (
        <ContentAnalysisSummary
          readability={latestAnalysis?.readability_analysis || mockReadabilityData}
          keywords={latestAnalysis?.keyword_analysis || mockKeywordData}
          structure={latestAnalysis?.structure_analysis || mockStructureData}
          overallScore={overallScore}
        />
      )}
    </div>
  );
} 