'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Tree from 'react-d3-tree';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Define tree node type
interface TreeNode {
  name: string;
  attributes?: Record<string, string>;
  children?: TreeNode[];
}

// Define page data interface for type safety
interface LinkData {
  id: string;
  source_page_id: string;
  target_page_id: string;
  link_text?: string;
  link_type?: string;
  is_followed?: boolean;
  source: {
    id: string;
    url: string;
    title: string;
  };
  target: {
    id: string;
    url: string;
    title: string;
    depth: number;
  };
}

interface SiteStructureProps {
  siteCrawlId: string;
}

export function SiteStructureVisualization({ siteCrawlId }: SiteStructureProps) {
  const [siteStructure, setSiteStructure] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'tree' | 'radial'>('tree');
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);

  const supabase = createClient();

  const fetchSiteStructure = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the root page (lowest depth) from the crawl
      const { data: rootPages, error: rootError } = await supabase
        .from('crawled_pages')
        .select('id, url, title, depth')
        .eq('site_crawl_id', siteCrawlId)
        .order('depth', { ascending: true })
        .limit(1);

      if (rootError) throw rootError;
      if (!rootPages || rootPages.length === 0) {
        throw new Error('No pages found for this crawl');
      }

      const rootPageId = rootPages[0].id;
      
      // Build a hierarchical tree structure from the flat site_structure data
      const { data: links, error: linksError } = await supabase
        .from('site_structure')
        .select(`
          id,
          source_page_id,
          target_page_id,
          link_text,
          link_type,
          is_followed,
          source:source_page_id(id, url, title),
          target:target_page_id(id, url, title, depth)
        `)
        .eq('site_crawl_id', siteCrawlId);

      if (linksError) throw linksError;
      
      // Convert to typed array for safety
      const typedLinks = links as LinkData[] || [];
      
      // Build the tree recursively from the root
      const buildTree = (pageId: string, depth = 0, visited = new Set<string>()): TreeNode | null => {
        // Prevent circular references
        if (visited.has(pageId) || depth > 20) {
          return null;
        }
        
        visited.add(pageId);
        
        // Find the page links that have this pageId as the source
        const pageLinks = typedLinks.filter(link => link.source_page_id === pageId);
        
        // Get the source page data
        let sourcePage = null;
        if (pageLinks.length > 0) {
          sourcePage = pageLinks[0].source;
        } else {
          // If no links with this pageId as source, look for it as a target
          const linkWithTarget = typedLinks.find(link => link.target_page_id === pageId);
          if (linkWithTarget) {
            sourcePage = linkWithTarget.target;
          }
        }
        
        if (!sourcePage) {
          return null;
        }
        
        // Create node - safely handle URL parsing
        let nodeName = sourcePage.title || 'Unnamed Page';
        let displayUrl = sourcePage.url || '';
        
        try {
          if (sourcePage.url) {
            const url = new URL(sourcePage.url);
            displayUrl = sourcePage.url;
            // Use pathname if title is missing
            if (!nodeName || nodeName === 'Unnamed Page') {
              nodeName = url.pathname || url.hostname || 'Unnamed Page';
            }
          }
        } catch (err) {
          console.error('Invalid URL:', sourcePage.url);
          // Keep using the fallback name if URL parsing fails
        }
        
        const node: TreeNode = {
          name: nodeName,
          attributes: {
            url: displayUrl
          },
          children: []
        };
        
        // Add children
        for (const link of pageLinks) {
          const childNode = buildTree(link.target_page_id, depth + 1, new Set(visited));
          if (childNode) {
            node.children?.push(childNode);
          }
        }
        
        return node;
      };
      
      const treeData = buildTree(rootPageId);
      
      if (treeData) {
        setSiteStructure(treeData);
      } else {
        throw new Error('Could not build site structure');
      }
    } catch (err) {
      console.error('Error fetching site structure:', err);
      setError(err instanceof Error ? err.message : 'Failed to load site structure');
    } finally {
      setLoading(false);
    }
  }, [siteCrawlId, supabase]);

  // Initialize on component mount
  useEffect(() => {
    fetchSiteStructure();
    
    // Set container dimensions based on window size
    const updateDimensions = () => {
      const width = Math.min(window.innerWidth - 40, 1200);
      const height = Math.min(window.innerHeight - 200, 800);
      setContainerWidth(width);
      setContainerHeight(height);
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [fetchSiteStructure]);

  // Node click handler - can be used to navigate to the page or show details
  const handleNodeClick = (nodeData: any) => {
    // You can expand this to show a modal with details or navigate to the page
    console.log('Node clicked:', nodeData);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Site Structure Visualization</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading site structure...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Site Structure Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={fetchSiteStructure} variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!siteStructure) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Site Structure Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No site structure data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Site Structure Visualization</CardTitle>
          <Select value={viewType} onValueChange={(value) => setViewType(value as 'tree' | 'radial')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="View type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tree">Tree View</SelectItem>
              <SelectItem value="radial">Radial View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div id="treeWrapper" style={{ width: containerWidth, height: containerHeight }}>
          <Tree
            data={siteStructure}
            orientation={viewType === 'tree' ? 'vertical' : undefined}
            translate={{ x: containerWidth / 2, y: 80 }}
            nodeSize={{ x: 200, y: 80 }}
            separation={{ siblings: 2, nonSiblings: 3 }}
            pathFunc={viewType === 'radial' ? 'step' : 'diagonal'}
            collapsible={true}
            zoom={0.7}
            onNodeClick={handleNodeClick}
            renderCustomNodeElement={(rd3tProps) => (
              <g>
                <circle r={15} fill="#5151f9" />
                <text
                  className="rd3t-label"
                  textAnchor="middle"
                  y={-20}
                  style={{
                    fill: 'black',
                    strokeWidth: 0,
                    fontSize: '14px',
                  }}
                >
                  {rd3tProps.nodeDatum.name}
                </text>
              </g>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
} 