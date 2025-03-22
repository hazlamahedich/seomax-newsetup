'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, BookOpen, Check, Cpu, Edit, FileText, ListChecks } from 'lucide-react';
import { ContentPageService, ContentAnalysisService, ContentSuggestionService } from '@/lib/services/content-service';
import { ContentPage, ContentAnalysis, ContentSuggestion } from '@/lib/types/database.types';
import { useToast } from '@/components/ui/toast';

interface ContentEditorProps {
  projectId: string;
  pageId?: string; // Optional for creating new pages
  initialContent?: string;
  initialUrl?: string;
  initialTitle?: string;
  onSave?: (contentPage: ContentPage) => void;
}

export function ContentEditor({
  projectId,
  pageId,
  initialContent = '',
  initialUrl = '',
  initialTitle = '',
  onSave,
}: ContentEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);
  const [contentSuggestions, setContentSuggestions] = useState<ContentSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState('edit');
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    // Calculate word count whenever content changes
    const words = content.trim().split(/\s+/);
    setWordCount(content.trim() === '' ? 0 : words.length);
  }, [content]);

  const handleAddKeyword = () => {
    if (keywordsInput.trim() === '') return;
    setKeywords([...keywords, keywordsInput.trim()]);
    setKeywordsInput('');
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      const contentPageData = {
        project_id: projectId,
        url,
        title,
        content,
        word_count: wordCount,
        readability_score: null, // Will be updated after analysis
        seo_score: null, // Will be updated after analysis
      };

      let savedContentPage: ContentPage;

      if (pageId) {
        // Update existing page
        savedContentPage = await ContentPageService.updateContentPage(pageId, contentPageData);
      } else {
        // Create new page
        savedContentPage = await ContentPageService.createContentPage(contentPageData);
      }

      toast({
        title: 'Content saved successfully',
        description: 'Your content has been saved to the database.',
        variant: 'success',
      });

      if (onSave) {
        onSave(savedContentPage);
      }

      return savedContentPage;
    } catch (error) {
      toast({
        title: 'Error saving content',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);

      // First save the content
      const savedPage = await handleSave();
      
      // Mock content analysis - in a real app, this would call your AI service
      const mockAnalysisData = {
        page_id: savedPage.id,
        analysis_type: 'comprehensive',
        result: {
          readability: {
            score: 75,
            grade_level: 'High School',
            issues: ['Sentences are too long in paragraph 2', 'Consider using simpler vocabulary']
          },
          seo: {
            score: 82,
            keyword_density: 1.5,
            issues: ['Missing meta description', 'Could improve keyword usage in headings']
          },
          improvements: [
            'Break long sentences into shorter ones',
            'Add more subheadings to improve scannability',
            'Include target keywords in first paragraph'
          ]
        }
      };

      // Save analysis to database
      const savedAnalysis = await ContentAnalysisService.createContentAnalysis({
        page_id: savedPage.id,
        analysis_type: 'comprehensive',
        result: mockAnalysisData.result,
      });

      setContentAnalysis(savedAnalysis);

      // Mock content suggestions
      const mockSuggestions = [
        {
          page_id: savedPage.id,
          suggestion_type: 'title',
          original_text: savedPage.title || '',
          suggested_text: `Improved ${savedPage.title} with Keywords`,
          reason: 'Adding keywords to the title improves SEO',
          implemented: false,
        },
        {
          page_id: savedPage.id,
          suggestion_type: 'paragraph',
          original_text: 'This is a sample paragraph that could be improved.',
          suggested_text: 'This is an enhanced paragraph with better keyword usage and more engaging content.',
          reason: 'The suggested text is more engaging and includes target keywords',
          implemented: false,
        }
      ];

      // Save suggestions to database
      const savedSuggestions = await Promise.all(
        mockSuggestions.map(suggestion => 
          ContentSuggestionService.createContentSuggestion(suggestion)
        )
      );

      setContentSuggestions(savedSuggestions);

      // Update the page with analysis results
      await ContentPageService.updateContentPage(savedPage.id, {
        readability_score: mockAnalysisData.result.readability.score,
        seo_score: mockAnalysisData.result.seo.score,
        analyzed_at: new Date().toISOString(),
      });

      // Switch to the analysis tab
      setActiveTab('analysis');

      toast({
        title: 'Content analyzed successfully',
        description: 'Your content has been analyzed and suggestions generated.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error analyzing content',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplySuggestion = (suggestion: ContentSuggestion) => {
    if (suggestion.suggestion_type === 'title') {
      setTitle(suggestion.suggested_text);
    } else if (suggestion.suggestion_type === 'paragraph') {
      // Replace the original text with the suggested text
      const newContent = content.replace(suggestion.original_text, suggestion.suggested_text);
      setContent(newContent);
    }

    // Mark suggestion as implemented
    ContentSuggestionService.updateContentSuggestion(suggestion.id, true)
      .then(updatedSuggestion => {
        setContentSuggestions(suggestions => 
          suggestions.map(s => s.id === updatedSuggestion.id ? updatedSuggestion : s)
        );
      })
      .catch(error => {
        toast({
          title: 'Error updating suggestion',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
          variant: 'error',
        });
      });
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="edit">
            <Edit className="h-4 w-4 mr-2" />
            Edit Content
          </TabsTrigger>
          <TabsTrigger value="analysis" disabled={!contentAnalysis}>
            <Cpu className="h-4 w-4 mr-2" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="suggestions" disabled={contentSuggestions.length === 0}>
            <ListChecks className="h-4 w-4 mr-2" />
            Suggestions ({contentSuggestions.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Editor</CardTitle>
              <CardDescription>Create or edit your content for optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Page URL</Label>
                <Input
                  id="url"
                  placeholder="Enter the page URL (e.g., /blog/my-post)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  placeholder="Enter the page title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="keywords">Target Keywords</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="keywords"
                    placeholder="Add a target keyword"
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddKeyword}>Add</Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                      {keyword}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        onClick={() => handleRemoveKeyword(keyword)}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="content">Content</Label>
                  <span className="text-sm text-gray-500">{wordCount} words</span>
                </div>
                <Textarea
                  id="content"
                  placeholder="Enter your content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px]"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" disabled={isLoading} onClick={handleSave}>
                {isLoading ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button disabled={isAnalyzing || content.trim() === ''} onClick={handleAnalyze}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="analysis">
          {contentAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>Content Analysis</CardTitle>
                <CardDescription>AI-powered analysis of your content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Readability Score
                    </h3>
                    <div className="flex items-center">
                      <div className="h-4 w-full bg-gray-200 rounded-full">
                        <div
                          className="h-4 bg-blue-600 rounded-full"
                          style={{ width: `${contentAnalysis.result.readability.score}%` }}
                        />
                      </div>
                      <span className="ml-2 font-bold">{contentAnalysis.result.readability.score}</span>
                    </div>
                    <p className="text-sm">
                      Reading level: {contentAnalysis.result.readability.grade_level}
                    </p>
                    <div className="space-y-1 mt-2">
                      <h4 className="text-sm font-medium">Issues:</h4>
                      <ul className="list-disc list-inside text-sm">
                        {contentAnalysis.result.readability.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      SEO Score
                    </h3>
                    <div className="flex items-center">
                      <div className="h-4 w-full bg-gray-200 rounded-full">
                        <div
                          className="h-4 bg-green-600 rounded-full"
                          style={{ width: `${contentAnalysis.result.seo.score}%` }}
                        />
                      </div>
                      <span className="ml-2 font-bold">{contentAnalysis.result.seo.score}</span>
                    </div>
                    <p className="text-sm">
                      Keyword density: {contentAnalysis.result.seo.keyword_density}%
                    </p>
                    <div className="space-y-1 mt-2">
                      <h4 className="text-sm font-medium">Issues:</h4>
                      <ul className="list-disc list-inside text-sm">
                        {contentAnalysis.result.seo.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Improvement Opportunities
                  </h3>
                  <ul className="list-disc list-inside">
                    {contentAnalysis.result.improvements.map((improvement, i) => (
                      <li key={i}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setActiveTab('suggestions')}>
                  View Suggestions
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="suggestions">
          <Card>
            <CardHeader>
              <CardTitle>Content Suggestions</CardTitle>
              <CardDescription>AI-generated suggestions to improve your content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contentSuggestions.length === 0 ? (
                <p>No suggestions available yet. Analyze your content to generate suggestions.</p>
              ) : (
                contentSuggestions.map((suggestion) => (
                  <div 
                    key={suggestion.id} 
                    className={`border rounded-lg p-4 ${suggestion.implemented ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-md font-semibold capitalize">
                        {suggestion.suggestion_type} Suggestion
                      </h3>
                      {suggestion.implemented ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Applied
                        </Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleApplySuggestion(suggestion)}
                        >
                          Apply Suggestion
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <div className="text-sm">
                        <span className="font-medium">Original: </span>
                        <span className="text-gray-700">{suggestion.original_text}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Suggested: </span>
                        <span className="text-green-700">{suggestion.suggested_text}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="font-medium">Reason: </span>
                        {suggestion.reason}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('analysis')}>
                Back to Analysis
              </Button>
              <Button onClick={() => setActiveTab('edit')}>
                Continue Editing
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 