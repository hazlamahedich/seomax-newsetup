import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowUpCircle, Clock, LightbulbIcon } from 'lucide-react';

export interface CategoryRecommendations {
  category: string;
  recommendations: string[];
  priority?: 'high' | 'medium' | 'low';
  implementationTime?: 'quick' | 'medium' | 'extensive';
}

export interface RecommendationListProps {
  recommendations: CategoryRecommendations[];
  className?: string;
}

export function RecommendationList({ recommendations, className = '' }: RecommendationListProps) {
  // Count the total number of recommendations
  const totalRecommendations = recommendations.reduce(
    (sum, category) => sum + category.recommendations.length, 
    0
  );
  
  // Get priority badge
  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" /> High Priority</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" /> Medium Priority</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" /> Low Priority</Badge>;
      default:
        return null;
    }
  };
  
  // Get implementation time badge
  const getImplementationBadge = (time?: string) => {
    switch (time) {
      case 'quick':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Quick Win</Badge>;
      case 'medium':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Moderate Effort</Badge>;
      case 'extensive':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Extensive Work</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>SEO Improvement Recommendations</CardTitle>
        <CardDescription>
          {totalRecommendations > 0 
            ? `${totalRecommendations} recommendations across ${recommendations.length} categories` 
            : 'No recommendations available'}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {recommendations.length > 0 ? (
          <Accordion type="multiple" className="space-y-2">
            {recommendations.map((category, index) => (
              <AccordionItem 
                key={index} 
                value={category.category}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <LightbulbIcon className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">{category.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {category.recommendations.length} {category.recommendations.length === 1 ? 'tip' : 'tips'}
                      </Badge>
                      {getPriorityBadge(category.priority)}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-3">
                    {category.recommendations.map((recommendation, recIndex) => (
                      <div key={recIndex} className="flex gap-2 items-start border-b pb-3 last:border-0 last:pb-0">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p>{recommendation}</p>
                          {recIndex === 0 && getImplementationBadge(category.implementationTime) && (
                            <div className="mt-2">
                              {getImplementationBadge(category.implementationTime)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Recommendations Needed</h3>
            <p className="text-gray-500 text-center">
              Great job! Your website is already well optimized and doesn't need further improvements.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 