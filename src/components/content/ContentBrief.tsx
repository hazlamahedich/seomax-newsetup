'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentBriefService } from '@/lib/services/content-service';
import { ContentBrief } from '@/lib/types/database.types';
import { Loader2, Copy, FileDown, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define extended type for use in the component
interface EnhancedContentBrief extends ContentBrief {
  content_type: string;
  content_length: number;
  target_audience: string;
  keywords: string[];
  sections: Array<{
    title: string;
    description: string;
    word_count: number;
  }>;
  sources: string[];
  competitors?: string[];
  additional_notes?: string;
}

interface ContentBriefGeneratorProps {
  projectId: string;
  briefId?: string;
  onBriefGenerated?: (brief: EnhancedContentBrief) => void;
  onBriefUpdated?: (brief: EnhancedContentBrief) => void;
  onBack?: () => void;
}

export function ContentBriefGenerator({
  projectId,
  briefId,
  onBriefGenerated,
  onBriefUpdated,
  onBack,
}: ContentBriefGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [targetKeyword, setTargetKeyword] = useState('');
  const [contentType, setContentType] = useState('blog');
  const [contentLength, setContentLength] = useState('1500');
  const [targetAudience, setTargetAudience] = useState('');
  const [competitor1, setCompetitor1] = useState('');
  const [competitor2, setCompetitor2] = useState('');
  const [competitor3, setCompetitor3] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generatedBrief, setGeneratedBrief] = useState<EnhancedContentBrief | null>(null);
  const [activeTab, setActiveTab] = useState('form');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [newCollaborator, setNewCollaborator] = useState('');
  const [seoInsights, setSeoInsights] = useState<string[]>([]);
  const [comments, setComments] = useState<Array<{id: string; user: string; text: string; date: string}>>([]);
  const [newComment, setNewComment] = useState('');
  const [briefStatus, setBriefStatus] = useState<'draft' | 'review' | 'approved' | 'in-progress'>('draft');

  // Effect to load an existing brief if briefId is provided
  useEffect(() => {
    if (briefId) {
      loadExistingBrief(briefId);
    }
  }, [briefId]);

  const loadExistingBrief = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const loadedBrief = await ContentBriefService.getContentBrief(id);
      if (!loadedBrief) {
        setError('Brief not found');
        return;
      }
      
      // Set form fields based on loaded brief
      setTargetKeyword(loadedBrief.target_keyword);
      
      if (loadedBrief.outline) {
        setContentType(loadedBrief.outline.contentType || 'blog');
        setContentLength(loadedBrief.outline.wordCount?.toString() || '1500');
        setTargetAudience(loadedBrief.outline.targetAudience || '');
      }
      
      setAdditionalNotes(loadedBrief.research_notes || '');
      
      // Set competitor URLs if available
      if (loadedBrief.competitor_insights && loadedBrief.competitor_insights.length > 0) {
        loadedBrief.competitor_insights.forEach((competitor, index) => {
          if (index === 0) setCompetitor1(competitor.url || '');
          if (index === 1) setCompetitor2(competitor.url || '');
          if (index === 2) setCompetitor3(competitor.url || '');
        });
      }
      
      // Transform to enhanced format
      const sections = loadedBrief.outline?.sections || [];
      const enhancedBrief: EnhancedContentBrief = {
        ...loadedBrief,
        content_type: loadedBrief.outline?.contentType || 'blog',
        content_length: loadedBrief.outline?.wordCount || 1500,
        target_audience: loadedBrief.outline?.targetAudience || '',
        keywords: loadedBrief.secondary_keywords || [],
        sections: sections,
        sources: loadedBrief.outline?.sources || [
          'Google Scholar',
          'Industry reports',
          'Expert interviews'
        ],
        competitors: loadedBrief.competitor_insights?.map((comp: { url?: string }) => comp.url) || [],
        additional_notes: loadedBrief.research_notes || ''
      };
      
      // Add mock SEO insights and collaboration data for the demo
      setSeoInsights([
        `Focus on "${loadedBrief.target_keyword}" in title, H1 and first paragraph`,
        `Include at least 3 related terms: ${(loadedBrief.secondary_keywords || []).join(', ')}`,
        'Use schema markup for better SERP visibility',
        'Target a readability score of grade 7-8',
        'Aim for at least 2 videos or images with proper alt text'
      ]);
      
      setCollaborators(['alex@example.com', 'taylor@example.com']);
      
      setComments([
        {
          id: '1',
          user: 'Alex Smith',
          text: 'Can we add a section on industry statistics?',
          date: '2023-10-15'
        },
        {
          id: '2',
          user: 'Taylor Jones',
          text: 'I like the structure. Let\'s expand the case studies section.',
          date: '2023-10-16'
        }
      ]);
      
      setBriefStatus('review');
      
      setGeneratedBrief(enhancedBrief);
      setActiveTab('brief');
    } catch (err) {
      console.error('Error loading content brief:', err);
      setError('Failed to load content brief. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBrief = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!generatedBrief || !briefId) {
        setError('No brief to update');
        return;
      }
      
      // Clean up competitor URLs
      const competitors = [competitor1, competitor2, competitor3]
        .filter(c => c.trim() !== '')
        .map(url => url.trim());
      
      // Create the updated brief data
      const updatedBriefData = {
        id: briefId,
        title: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)}: ${targetKeyword}`,
        target_keyword: targetKeyword,
        secondary_keywords: generatedBrief.keywords,
        outline: {
          contentType,
          wordCount: parseInt(contentLength),
          targetAudience,
          sections: generatedBrief.sections,
          sources: generatedBrief.sources
        },
        research_notes: additionalNotes || null,
        competitor_insights: competitors.length > 0 ? competitors.map(url => ({ url })) : null
      };
      
      // Call API to update brief
      const updatedBrief = await ContentBriefService.updateContentBrief(updatedBriefData);
      
      // Transform the updated brief
      const enhancedBrief: EnhancedContentBrief = {
        ...updatedBrief,
        content_type: contentType,
        content_length: parseInt(contentLength),
        target_audience: targetAudience,
        keywords: generatedBrief.keywords,
        sections: generatedBrief.sections,
        sources: generatedBrief.sources,
        competitors,
        additional_notes: additionalNotes
      };
      
      setGeneratedBrief(enhancedBrief);
      
      toast({
        title: "Brief updated successfully",
        description: `Your content brief for "${targetKeyword}" has been updated.`,
      });
      
      if (onBriefUpdated) {
        onBriefUpdated(enhancedBrief);
      }
    } catch (err) {
      console.error('Error updating content brief:', err);
      setError('Failed to update content brief. Please try again.');
      toast({
        variant: "destructive",
        title: "Brief update failed",
        description: "There was an error updating your content brief.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCollaborator = () => {
    if (!newCollaborator || !newCollaborator.includes('@')) return;
    
    if (!collaborators.includes(newCollaborator)) {
      setCollaborators([...collaborators, newCollaborator]);
      setNewCollaborator('');
      
      toast({
        title: "Collaborator added",
        description: `${newCollaborator} has been added to this brief.`,
      });
    }
  };
  
  const handleRemoveCollaborator = (email: string) => {
    setCollaborators(collaborators.filter(c => c !== email));
  };
  
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment = {
      id: Date.now().toString(),
      user: 'You',
      text: newComment,
      date: new Date().toISOString().split('T')[0]
    };
    
    setComments([...comments, comment]);
    setNewComment('');
  };
  
  const handleUpdateStatus = (status: 'draft' | 'review' | 'approved' | 'in-progress') => {
    setBriefStatus(status);
    
    toast({
      title: "Status updated",
      description: `Brief status changed to ${status}.`,
    });
  };

  const handleGenerateBrief = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Clean up competitor URLs
      const competitors = [competitor1, competitor2, competitor3]
        .filter(c => c.trim() !== '')
        .map(url => url.trim());

      // Create the brief data object
      const briefData = {
        project_id: projectId,
        title: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)}: ${targetKeyword}`,
        target_keyword: targetKeyword,
        secondary_keywords: [
          `${targetKeyword} best practices`,
          `how to ${targetKeyword}`,
          `${targetKeyword} examples`,
          `${targetKeyword} benefits`
        ],
        topic_cluster_id: null,
        outline: {
          contentType,
          wordCount: parseInt(contentLength),
          targetAudience,
          sections: [
            {
              title: 'Introduction',
              description: `Introduce ${targetKeyword} and why it's important. Hook the reader with an interesting statistic or question.`,
              word_count: Math.round(parseInt(contentLength) * 0.1)
            },
            {
              title: `What is ${targetKeyword}?`,
              description: 'Define the term clearly and explain its significance.',
              word_count: Math.round(parseInt(contentLength) * 0.15)
            },
            {
              title: `Benefits of ${targetKeyword}`,
              description: 'Explain 3-5 key benefits, with examples for each.',
              word_count: Math.round(parseInt(contentLength) * 0.25)
            },
            {
              title: `How to Implement ${targetKeyword}`,
              description: 'Step-by-step guide with actionable tips.',
              word_count: Math.round(parseInt(contentLength) * 0.25)
            },
            {
              title: 'Case Studies',
              description: 'Include 1-2 real-world examples showing success.',
              word_count: Math.round(parseInt(contentLength) * 0.15)
            },
            {
              title: 'Conclusion',
              description: 'Summarize key points and include a call to action.',
              word_count: Math.round(parseInt(contentLength) * 0.1)
            }
          ]
        },
        research_notes: additionalNotes || null,
        competitor_insights: competitors.length > 0 ? competitors.map(url => ({ url })) : null
      };

      // Call API to generate brief
      const newBrief = await ContentBriefService.createContentBrief(briefData);
      
      // Transform the database brief into the enhanced format for the UI
      const sections = briefData.outline.sections;
      const enhancedBrief: EnhancedContentBrief = {
        ...newBrief,
        content_type: contentType,
        content_length: parseInt(contentLength),
        target_audience: targetAudience,
        keywords: briefData.secondary_keywords || [],
        sections: sections,
        sources: [
          'Google Scholar',
          'Industry reports',
          'Expert interviews',
          'Competitor analysis',
          'Case studies'
        ],
        competitors: competitors,
        additional_notes: additionalNotes
      };

      setGeneratedBrief(enhancedBrief);
      setActiveTab('brief');
      
      toast({
        title: "Brief created successfully",
        description: `Your content brief for "${targetKeyword}" is ready.`,
      });

      if (onBriefGenerated) {
        onBriefGenerated(enhancedBrief);
      }
    } catch (err) {
      console.error('Error generating content brief:', err);
      setError('Failed to generate content brief. Please try again.');
      toast({
        variant: "destructive",
        title: "Brief generation failed",
        description: "There was an error creating your content brief.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBrief = () => {
    if (!generatedBrief) return;
    
    try {
      const briefText = `
CONTENT BRIEF: ${generatedBrief.target_keyword}
==========================================
Type: ${generatedBrief.content_type}
Target Audience: ${generatedBrief.target_audience}
Word Count: ${generatedBrief.content_length}

KEYWORDS:
${generatedBrief.keywords.join(', ')}

STRUCTURE:
${generatedBrief.sections.map(section => `
${section.title} (${section.word_count} words)
${section.description}
`).join('\n')}

SOURCES:
${generatedBrief.sources.join('\n')}

ADDITIONAL NOTES:
${generatedBrief.additional_notes || 'None'}
`;

      navigator.clipboard.writeText(briefText);
      toast({
        title: "Brief copied to clipboard",
        description: "The content brief has been copied to your clipboard.",
      });
    } catch (err) {
      console.error('Error copying brief:', err);
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Failed to copy the brief to clipboard.",
      });
    }
  };

  const handleExportBrief = () => {
    if (!generatedBrief) return;
    
    try {
      const briefText = `
CONTENT BRIEF: ${generatedBrief.target_keyword}
==========================================
Type: ${generatedBrief.content_type}
Target Audience: ${generatedBrief.target_audience}
Word Count: ${generatedBrief.content_length}

KEYWORDS:
${generatedBrief.keywords.join(', ')}

STRUCTURE:
${generatedBrief.sections.map(section => `
${section.title} (${section.word_count} words)
${section.description}
`).join('\n')}

SOURCES:
${generatedBrief.sources.join('\n')}

ADDITIONAL NOTES:
${generatedBrief.additional_notes || 'None'}
`;

      const blob = new Blob([briefText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content-brief-${generatedBrief.target_keyword.replace(/\s+/g, '-').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Brief exported",
        description: "The content brief has been exported as a text file.",
      });
    } catch (err) {
      console.error('Error exporting brief:', err);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export the brief.",
      });
    }
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form">Brief Generator</TabsTrigger>
          <TabsTrigger value="brief" disabled={!generatedBrief}>Content Brief</TabsTrigger>
        </TabsList>
        
        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle>Generate Content Brief</CardTitle>
              <CardDescription>Fill out the form to create a comprehensive content brief</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="targetKeyword">Target Keyword/Topic</Label>
                <Input
                  id="targetKeyword"
                  placeholder="e.g., Content Marketing Strategies"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger id="contentType">
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blog">Blog Post</SelectItem>
                      <SelectItem value="article">Long-form Article</SelectItem>
                      <SelectItem value="guide">Comprehensive Guide</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                      <SelectItem value="case-study">Case Study</SelectItem>
                      <SelectItem value="landing-page">Landing Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contentLength">Target Word Count</Label>
                  <Select value={contentLength} onValueChange={setContentLength}>
                    <SelectTrigger id="contentLength">
                      <SelectValue placeholder="Select word count" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">Short (~500 words)</SelectItem>
                      <SelectItem value="1000">Medium (~1000 words)</SelectItem>
                      <SelectItem value="1500">Standard (~1500 words)</SelectItem>
                      <SelectItem value="2500">Long-form (~2500 words)</SelectItem>
                      <SelectItem value="4000">Comprehensive (~4000 words)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Input
                  id="targetAudience"
                  placeholder="e.g., Marketing professionals at B2B companies"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Competitor URLs to Analyze (Optional)</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Competitor URL 1"
                    value={competitor1}
                    onChange={(e) => setCompetitor1(e.target.value)}
                  />
                  <Input
                    placeholder="Competitor URL 2"
                    value={competitor2}
                    onChange={(e) => setCompetitor2(e.target.value)}
                  />
                  <Input
                    placeholder="Competitor URL 3"
                    value={competitor3}
                    onChange={(e) => setCompetitor3(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  placeholder="Any specific requirements, tone preferences, or additional context"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                disabled={isLoading || !targetKeyword || !targetAudience}
                onClick={handleGenerateBrief}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Brief...
                  </>
                ) : (
                  'Generate Content Brief'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="brief">
          {generatedBrief && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Content Brief: {generatedBrief.target_keyword}</CardTitle>
                  <CardDescription>
                    {generatedBrief.content_type.charAt(0).toUpperCase() + generatedBrief.content_type.slice(1)} • 
                    {generatedBrief.content_length} words
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleCopyBrief}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportBrief}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Target Audience</p>
                      <p>{generatedBrief.target_audience}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Target Keywords</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {generatedBrief.keywords.map((keyword, index) => (
                          <span 
                            key={index} 
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Content Structure</h3>
                  {generatedBrief.sections.map((section, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">{section.title}</h4>
                        <span className="text-sm text-gray-500">{section.word_count} words</span>
                      </div>
                      <p className="text-sm">{section.description}</p>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4 mt-6">
                  <h3 className="font-semibold text-lg">SEO Insights</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <ul className="list-disc list-inside space-y-2">
                      {seoInsights.map((insight, index) => (
                        <li key={index} className="text-sm text-blue-800">{insight}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Research Sources</h3>
                    <ul className="list-disc list-inside">
                      {generatedBrief.sources.map((source, index) => (
                        <li key={index}>{source}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {generatedBrief.competitors && generatedBrief.competitors.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Competitors to Analyze</h3>
                      <ul className="list-disc list-inside">
                        {generatedBrief.competitors.map((competitor: string, index: number) => (
                          <li key={index}>
                            <a 
                              href={competitor.startsWith('http') ? competitor : `https://${competitor}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {competitor}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {generatedBrief.additional_notes && (
                  <div className="space-y-2 mt-6">
                    <h3 className="font-semibold text-lg">Additional Notes</h3>
                    <p className="text-sm">{generatedBrief.additional_notes}</p>
                  </div>
                )}

                <div className="space-y-4 mt-6">
                  <h3 className="font-semibold text-lg">Collaboration</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Status</h4>
                      <Select value={briefStatus} onValueChange={(val: any) => handleUpdateStatus(val as 'draft' | 'review' | 'approved' | 'in-progress')}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="review">In Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Collaborators</h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {collaborators.map((email, index) => (
                          <div key={index} className="bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full flex items-center">
                            {email}
                            <button 
                              onClick={() => handleRemoveCollaborator(email)} 
                              className="ml-2 text-gray-500 hover:text-gray-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Email address" 
                          value={newCollaborator} 
                          onChange={(e) => setNewCollaborator(e.target.value)}
                          className="text-sm"
                        />
                        <Button size="sm" onClick={handleAddCollaborator}>Add</Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Comments</h4>
                    <div className="space-y-3 mb-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 p-3 rounded">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span className="font-medium">{comment.user}</span>
                            <span>{comment.date}</span>
                          </div>
                          <p className="text-sm">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Textarea 
                        placeholder="Add a comment..." 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)}
                        className="text-sm"
                        rows={2}
                      />
                      <Button className="self-end" size="sm" onClick={handleAddComment}>
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-6 border-t">
                {onBack && (
                  <Button variant="outline" onClick={onBack}>
                    Back to Briefs
                  </Button>
                )}
                <div className="flex gap-2">
                  {briefId && (
                    <Button onClick={handleUpdateBrief} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Brief'
                      )}
                    </Button>
                  )}
                  <Button variant="default">
                    Create Content
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 