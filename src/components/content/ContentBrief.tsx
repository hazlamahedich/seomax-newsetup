'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentBriefService } from '@/lib/services/content-service';
import { ContentBrief } from '@/lib/types/database.types';
import { Loader2, Copy, FileDown } from 'lucide-react';

interface ContentBriefGeneratorProps {
  projectId: string;
  briefId?: string;
  onBriefGenerated?: (brief: ContentBrief) => void;
}

export function ContentBriefGenerator({
  projectId,
  briefId,
  onBriefGenerated,
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
  const [generatedBrief, setGeneratedBrief] = useState<ContentBrief | null>(null);
  const [activeTab, setActiveTab] = useState('form');

  const handleGenerateBrief = async () => {
    try {
      setIsLoading(true);

      // In a real implementation, this would call the AI service to generate the brief
      // For now, we'll use mock data based on inputs
      const competitors = [competitor1, competitor2, competitor3]
        .filter(c => c.trim() !== '')
        .map(url => url.trim());

      const briefData = {
        project_id: projectId,
        target_keyword: targetKeyword,
        content_type: contentType,
        content_length: parseInt(contentLength),
        target_audience: targetAudience,
        competitors: competitors,
        additional_notes: additionalNotes,
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
        ],
        keywords: [
          targetKeyword,
          `benefits of ${targetKeyword}`,
          `${targetKeyword} examples`,
          `how to use ${targetKeyword}`,
          `${targetKeyword} guide`
        ],
        sources: [
          'Industry reports',
          'Academic studies',
          'Expert interviews',
          'Competitor analysis'
        ],
        status: 'draft'
      };

      // Save to database
      const savedBrief = await ContentBriefService.createContentBrief(briefData);
      
      setGeneratedBrief(savedBrief);
      setActiveTab('brief');
      
      if (onBriefGenerated) {
        onBriefGenerated(savedBrief);
      }
    } catch (error) {
      console.error('Error generating brief:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBrief = () => {
    if (!generatedBrief) return;

    const sections = generatedBrief.sections.map(section => (
      `## ${section.title}\n${section.description}\nTarget word count: ${section.word_count}`
    )).join('\n\n');

    const keywords = `Keywords: ${generatedBrief.keywords.join(', ')}`;
    const sources = `Sources: ${generatedBrief.sources.join(', ')}`;
    const competitors = generatedBrief.competitors?.length ? 
      `Competitors to analyze: ${generatedBrief.competitors.join(', ')}` : '';
    const notes = generatedBrief.additional_notes ? 
      `Additional notes: ${generatedBrief.additional_notes}` : '';

    const fullBrief = `
# Content Brief: ${generatedBrief.target_keyword}

Content type: ${generatedBrief.content_type}
Target word count: ${generatedBrief.content_length}
Target audience: ${generatedBrief.target_audience}

${sections}

${keywords}

${sources}

${competitors}

${notes}
`.trim();

    navigator.clipboard.writeText(fullBrief)
      .then(() => {
        alert('Brief copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy brief:', err);
      });
  };

  const handleExportBrief = () => {
    if (!generatedBrief) return;

    const sections = generatedBrief.sections.map(section => (
      `## ${section.title}\n${section.description}\nTarget word count: ${section.word_count}`
    )).join('\n\n');

    const keywords = `Keywords: ${generatedBrief.keywords.join(', ')}`;
    const sources = `Sources: ${generatedBrief.sources.join(', ')}`;
    const competitors = generatedBrief.competitors?.length ? 
      `Competitors to analyze: ${generatedBrief.competitors.join(', ')}` : '';
    const notes = generatedBrief.additional_notes ? 
      `Additional notes: ${generatedBrief.additional_notes}` : '';

    const fullBrief = `
# Content Brief: ${generatedBrief.target_keyword}

Content type: ${generatedBrief.content_type}
Target word count: ${generatedBrief.content_length}
Target audience: ${generatedBrief.target_audience}

${sections}

${keywords}

${sources}

${competitors}

${notes}
`.trim();

    const blob = new Blob([fullBrief], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-brief-${generatedBrief.target_keyword.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        {generatedBrief.competitors.map((competitor, index) => (
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
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Additional Notes</h3>
                    <p className="text-sm">{generatedBrief.additional_notes}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab('form')}
                >
                  Edit Brief Parameters
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 