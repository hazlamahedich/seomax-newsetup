'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import { FileText, Wrench, ExternalLink, CalendarDays } from 'lucide-react';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Project {
  id: string;
  website_name: string;
  website_url: string;
  keywords: string[];
  competitors: string[];
  seo_score: number;
  created_at: string;
}

interface KeywordRanking {
  id: string;
  keyword: string;
  position: number;
  previous_position: number;
  change: number;
  date_checked: string;
}

interface SeoRecommendation {
  id: string;
  issue_type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
}

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [keywordRankings, setKeywordRankings] = useState<KeywordRanking[]>([]);
  const [recommendations, setRecommendations] = useState<SeoRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchProjectData();
    }
  }, [user, authLoading, router, params.id]);

  const fetchProjectData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();
      
      if (projectError) {
        setError('Project not found or you do not have access to it');
        setLoading(false);
        return;
      }
      
      setProject(projectData);
      
      // Fetch keyword rankings
      const { data: keywordData, error: keywordError } = await supabase
        .from('keyword_rankings')
        .select('*')
        .eq('project_id', params.id);
      
      if (!keywordError) {
        setKeywordRankings(keywordData || []);
      }
      
      // Fetch SEO recommendations
      const { data: recommendationsData, error: recommendationsError } = await supabase
        .from('seo_recommendations')
        .select('*')
        .eq('project_id', params.id);
      
      if (!recommendationsError) {
        setRecommendations(recommendationsData || []);
      }
      
    } catch (err) {
      setError('Failed to load project data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create sample data if there are no keywords or recommendations yet
  useEffect(() => {
    if (project && keywordRankings.length === 0 && !loading) {
      // Sample keywords - in a real app, these would come from a keyword tracking service
      const sampleKeywords = [
        { keyword: 'website seo', position: 12, change: 3 },
        { keyword: 'seo tools', position: 8, change: -1 },
        { keyword: 'best seo service', position: 15, change: 5 },
        { keyword: 'local business seo', position: 6, change: 2 },
      ];
      
      setKeywordRankings(sampleKeywords.map((item, index) => ({
        id: `sample-${index}`,
        keyword: item.keyword,
        position: item.position,
        previous_position: item.position - item.change,
        change: item.change,
        date_checked: new Date().toISOString(),
      })));
    }
    
    if (project && recommendations.length === 0 && !loading) {
      // Sample recommendations - in a real app, these would come from an SEO analysis
      const sampleRecommendations = [
        { 
          issue_type: 'Performance',
          description: 'Improve page load speed on homepage (currently 3.2s)',
          priority: 'high' as const,
          status: 'open' as const 
        },
        { 
          issue_type: 'Content',
          description: 'Add meta descriptions to 5 pages',
          priority: 'medium' as const,
          status: 'in_progress' as const 
        },
        { 
          issue_type: 'Technical',
          description: 'Fix 4 broken links on your services page',
          priority: 'high' as const,
          status: 'open' as const 
        },
        { 
          issue_type: 'Content',
          description: 'Add alt text to 12 images',
          priority: 'medium' as const,
          status: 'open' as const 
        },
        { 
          issue_type: 'Mobile',
          description: 'Mobile-friendly design implemented',
          priority: 'low' as const,
          status: 'resolved' as const 
        },
      ];
      
      setRecommendations(sampleRecommendations.map((item, index) => ({
        id: `sample-${index}`,
        ...item
      })));
    }
  }, [project, keywordRankings.length, recommendations.length, loading]);

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/dashboard" className="font-bold text-2xl">
              SEOMax
            </Link>
          </div>
        </header>
        <main className="flex-1 container py-10">
          <div className="max-w-3xl mx-auto text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Error</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="font-bold text-2xl">
            SEOMax
          </Link>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">{project.website_name}</h1>
            <a 
              href={project.website_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline"
            >
              {project.website_url}
            </a>
          </div>
          <div>
            <Button variant="outline" className="mr-2">
              Run Audit
            </Button>
            <Button asChild>
              <Link href={`/dashboard/projects/${project.id}/edit`}>Edit Project</Link>
            </Button>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div className="border rounded-lg p-6 bg-background">
            <h2 className="text-xl font-semibold mb-4">SEO Tools</h2>
            <div className="grid grid-cols-1 gap-3">
              <Button variant="outline" className="justify-start" asChild>
                <Link href={`/dashboard/content?projectId=${project.id}`}>
                  <FileText className="h-4 w-4 mr-2" /> Content Optimization
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <Wrench className="h-4 w-4 mr-2" /> Technical SEO (Coming Soon)
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <ExternalLink className="h-4 w-4 mr-2" /> Backlink Analysis (Coming Soon)
              </Button>
            </div>
          </div>
          
          <div className="border rounded-lg p-6 bg-background">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center text-sm border-b pb-2">
                <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">Yesterday:</span>
                <span>Generated 3 content optimization suggestions</span>
              </div>
              <div className="flex items-center text-sm border-b pb-2">
                <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">3 days ago:</span>
                <span>Weekly SEO ranking update</span>
              </div>
              <div className="flex items-center text-sm">
                <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">1 week ago:</span>
                <span>Completed site audit</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3 mb-10">
          <div className="border rounded-lg p-6 bg-background">
            <div className="text-sm text-muted-foreground mb-2">SEO Score</div>
            <div className="text-3xl font-bold mb-1">{project.seo_score || 78}/100</div>
            <div className="text-sm">
              {(project.seo_score || 78) > 60 ? (
                <span className="text-green-500">Good</span>
              ) : (project.seo_score || 78) > 40 ? (
                <span className="text-amber-500">Needs Improvement</span>
              ) : (
                <span className="text-red-500">Poor</span>
              )}
            </div>
          </div>
          
          <div className="border rounded-lg p-6 bg-background">
            <div className="text-sm text-muted-foreground mb-2">Tracked Keywords</div>
            <div className="text-3xl font-bold mb-1">{project.keywords?.length || 0}</div>
            <div className="text-sm text-muted-foreground">
              {keywordRankings.length > 0 ? 
                `${keywordRankings.filter(k => k.position <= 10).length} in top 10` :
                'No keywords tracked yet'
              }
            </div>
          </div>
          
          <div className="border rounded-lg p-6 bg-background">
            <div className="text-sm text-muted-foreground mb-2">Issues to Fix</div>
            <div className="text-3xl font-bold mb-1">
              {recommendations.filter(r => r.status !== 'resolved').length}
            </div>
            <div className="text-sm text-amber-500">
              {recommendations.filter(r => r.priority === 'high' && r.status !== 'resolved').length} high priority
            </div>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Keyword Rankings</h2>
            </div>
            <div className="p-6">
              {keywordRankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-sm">
                        <th className="text-left py-2 font-medium">Keyword</th>
                        <th className="text-right py-2 font-medium">Position</th>
                        <th className="text-right py-2 font-medium">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordRankings.map((keyword) => (
                        <tr key={keyword.id} className="border-b last:border-0">
                          <td className="py-2">{keyword.keyword}</td>
                          <td className="text-right py-2">{keyword.position}</td>
                          <td className="text-right py-2">
                            {keyword.change > 0 ? (
                              <span className="text-green-500">+{keyword.change}</span>
                            ) : keyword.change < 0 ? (
                              <span className="text-red-500">{keyword.change}</span>
                            ) : (
                              <span>0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No keywords are being tracked yet
                </div>
              )}
              
              <div className="mt-4">
                <Button variant="outline" size="sm">
                  Add Keywords
                </Button>
              </div>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Competitors</h2>
            </div>
            <div className="p-6">
              {project.competitors && project.competitors.length > 0 ? (
                <ul className="space-y-2">
                  {project.competitors.map((competitor, index) => (
                    <li key={index} className="border p-3 rounded-md">
                      <a 
                        href={competitor} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline"
                      >
                        {competitor}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No competitors added yet
                </div>
              )}
              
              <div className="mt-4">
                <Button variant="outline" size="sm">
                  Add Competitors
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">SEO Recommendations</h2>
          </div>
          <div className="p-6">
            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div 
                    key={rec.id} 
                    className={`border p-4 rounded-md ${
                      rec.status === 'resolved' ? 'border-green-200 bg-green-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center mb-1">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            rec.priority === 'high' 
                              ? 'bg-red-500' 
                              : rec.priority === 'medium' 
                                ? 'bg-amber-500' 
                                : 'bg-blue-500'
                          }`}></span>
                          <span className="font-medium">{rec.issue_type}</span>
                          {rec.status === 'resolved' && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Resolved
                            </span>
                          )}
                          {rec.status === 'in_progress' && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              In Progress
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                      {rec.status !== 'resolved' && (
                        <Button variant="outline" size="sm">
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recommendations available
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 