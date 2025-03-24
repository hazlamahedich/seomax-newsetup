import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { SEOIssue } from '@/lib/types/seo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export interface IssueListProps {
  issues: Array<{
    id: string;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    description: string;
    recommendation?: string;
    affectedElements?: string[];
    affectedUrls?: string[];
    impact?: string;
  }>;
  showSeverity?: boolean;
  showRecommendations?: boolean;
  showImpact?: boolean;
  expandByDefault?: boolean;
  maxIssues?: number;
  showCount?: boolean;
  className?: string;
  groupByType?: boolean;
}

export function IssuesList({
  issues,
  showSeverity = true,
  showRecommendations = true,
  showImpact = false,
  expandByDefault = false,
  maxIssues,
  showCount = false,
  className = '',
  groupByType = false,
}: IssueListProps) {
  const [showAll, setShowAll] = useState(false);
  
  const displayIssues = maxIssues && !showAll
    ? issues.slice(0, maxIssues)
    : issues;
    
  const SeverityIcon = ({ severity }: { severity: string }) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'info':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };
  
  const getTypeLabel = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  if (issues.length === 0) {
    return <p className="text-gray-500 italic">No issues found.</p>;
  }
  
  if (groupByType) {
    // Group issues by type
    const groupedIssues: { [key: string]: SEOIssue[] } = {};
    issues.forEach(issue => {
      if (!groupedIssues[issue.type]) {
        groupedIssues[issue.type] = [];
      }
      groupedIssues[issue.type].push(issue);
    });
    
    return (
      <div className={`space-y-4 ${className}`}>
        {showCount && (
          <div className="text-sm text-gray-500">
            Found {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
          </div>
        )}
        
        <Accordion type="multiple" defaultValue={expandByDefault ? Object.keys(groupedIssues) : []}>
          {Object.entries(groupedIssues).map(([type, typeIssues]) => (
            <AccordionItem value={type} key={type}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <span className="font-medium">{getTypeLabel(type)}</span>
                    <Badge variant="outline" className="ml-2">
                      {typeIssues.length}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {typeIssues.map((issue, index) => (
                    <div 
                      key={issue.id || index} 
                      className="border rounded-md p-3"
                    >
                      <div className="flex items-start gap-2">
                        {showSeverity && (
                          <div className="mt-0.5">
                            <SeverityIcon severity={issue.severity} />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{issue.description}</p>
                          
                          {showImpact && issue.impact && (
                            <div className="mt-1 text-sm text-muted-foreground">
                              <p><span className="font-medium">Impact:</span> {issue.impact}</p>
                            </div>
                          )}
                          
                          {issue.affectedElements && issue.affectedElements.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500 font-medium">Affected elements:</p>
                              <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                                {issue.affectedElements.slice(0, 3).map((element, i) => (
                                  <li key={i}>{element}</li>
                                ))}
                                {issue.affectedElements.length > 3 && (
                                  <li className="text-gray-500">
                                    +{issue.affectedElements.length - 3} more
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                          
                          {issue.affectedUrls && issue.affectedUrls.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500 font-medium">Affected URLs:</p>
                              <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                                {issue.affectedUrls.slice(0, 3).map((url, i) => (
                                  <li key={i}>
                                    <a 
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex items-center"
                                    >
                                      {new URL(url).pathname}
                                      <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                  </li>
                                ))}
                                {issue.affectedUrls.length > 3 && (
                                  <li className="text-gray-500">
                                    +{issue.affectedUrls.length - 3} more
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                          
                          {showRecommendations && issue.recommendation && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500 font-medium">Recommendation:</p>
                              <p className="text-sm text-gray-600 mt-1">{issue.recommendation}</p>
                            </div>
                          )}
                        </div>
                        
                        {showSeverity && (
                          <Badge 
                            variant="outline" 
                            className={`${getSeverityColor(issue.severity)} capitalize`}
                          >
                            {issue.severity}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        {maxIssues && issues.length > maxIssues && !showAll && (
          <Button 
            variant="outline" 
            onClick={() => setShowAll(true)}
            className="w-full mt-2"
          >
            Show all {issues.length} issues
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {showCount && (
        <div className="text-sm text-gray-500">
          Found {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
        </div>
      )}
      
      {displayIssues.map((issue, index) => (
        <div 
          key={issue.id || index} 
          className="border rounded-md p-4"
        >
          <div className="flex items-start gap-3">
            {showSeverity && (
              <div className="mt-0.5">
                <SeverityIcon severity={issue.severity} />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center">
                <p className="font-medium text-gray-900">{issue.description}</p>
                {showSeverity && (
                  <Badge 
                    variant="outline" 
                    className={`ml-2 ${getSeverityColor(issue.severity)} capitalize`}
                  >
                    {issue.severity}
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-gray-500 mt-1">
                {getTypeLabel(issue.type)}
              </div>
              
              {showImpact && issue.impact && (
                <div className="mt-1 text-sm text-muted-foreground">
                  <p><span className="font-medium">Impact:</span> {issue.impact}</p>
                </div>
              )}
              
              {issue.affectedElements && issue.affectedElements.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 font-medium">Affected elements:</p>
                  <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                    {issue.affectedElements.slice(0, 3).map((element, i) => (
                      <li key={i}>{element}</li>
                    ))}
                    {issue.affectedElements.length > 3 && (
                      <li className="text-gray-500">
                        +{issue.affectedElements.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              {issue.affectedUrls && issue.affectedUrls.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 font-medium">Affected URLs:</p>
                  <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                    {issue.affectedUrls.slice(0, 3).map((url, i) => (
                      <li key={i}>
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          {new URL(url).pathname}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </li>
                    ))}
                    {issue.affectedUrls.length > 3 && (
                      <li className="text-gray-500">
                        +{issue.affectedUrls.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              {showRecommendations && issue.recommendation && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 font-medium">Recommendation:</p>
                  <p className="text-sm text-gray-600 mt-1">{issue.recommendation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {maxIssues && issues.length > maxIssues && !showAll && (
        <Button 
          variant="outline" 
          onClick={() => setShowAll(true)}
          className="w-full"
        >
          Show all {issues.length} issues
        </Button>
      )}
    </div>
  );
}

export default IssuesList; 