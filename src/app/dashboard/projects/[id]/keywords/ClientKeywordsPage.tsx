'use client';

// Debugging log for page import
console.log('ClientKeywordsPage Module Loaded');

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks';
import keywordAnalyzer from '@/lib/ai/keyword-analyzer';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Additional debug logging for module initialization
console.log('ClientKeywordsPage Module: Supabase client created');

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Keywords page error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-500 rounded-md">
          <h2 className="text-xl font-bold text-red-500 mb-4">Something went wrong</h2>
          <details className="whitespace-pre-wrap text-sm">
            <summary>Error details</summary>
            <pre>{this.state.error && JSON.stringify(this.state.error, null, 2)}</pre>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Project {
  id: string;
  website_name: string;
  website_url: string;
  keywords: string[];
  competitors: string[];
}

interface KeywordRanking {
  id: string;
  keyword: string;
  position: number;
  previous_position: number;
  change: number;
  date_checked: string;
}

interface ClientKeywordsPageProps {
  projectId: string;
}

export function ClientKeywordsPage({ projectId }: ClientKeywordsPageProps) {
  // Debug before any hooks are called
  console.log('ClientKeywordsPage component initializing with projectId:', projectId);
  
  const router = useRouter();
  const { user } = useAuth();
  console.log('Keywords Page - Auth loaded, user present:', !!user);
  
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [keywordRankings, setKeywordRankings] = useState<KeywordRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const [keywordInsights, setKeywordInsights] = useState<any | null>(null);
  const [updatingRankings, setUpdatingRankings] = useState(false);

  console.log('Keywords Page - User authenticated:', !!user);

  // Main component content will be implemented in subsequent edits
  
  return (
    <ErrorBoundary>
      <div className="p-6">
        <h1>Keywords page for project {projectId}</h1>
        {/* Full implementation will be added in subsequent edits */}
      </div>
    </ErrorBoundary>
  );
} 