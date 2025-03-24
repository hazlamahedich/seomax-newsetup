import { createClient } from '@/lib/supabase/client';
import { GradingSystemService } from './GradingSystemService';

export interface SocialMediaProfile {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'pinterest' | 'youtube' | 'tiktok';
  url: string;
  username: string;
  followers: number;
  engagement: number;
  postFrequency: number; // Average posts per week
  lastUpdated: string;
  verified: boolean;
}

export interface SocialMediaMetrics {
  totalFollowers: number;
  totalEngagement: number;
  platformCoverage: number; // Percentage of recommended platforms used
  averagePostFrequency: number;
  profileConsistency: number; // Percentage of profile elements consistent across platforms
  siteIntegration: number; // Scale of 0-100 representing social media integration on the website
}

export interface SocialMediaIntegration {
  hasSocialLinks: boolean;
  hasSocialSharing: boolean;
  hasOpenGraph: boolean;
  hasTwitterCards: boolean;
  hasRichPins: boolean;
  socialIconsPosition: 'header' | 'footer' | 'sidebar' | 'multiple' | 'none';
}

export interface SocialMediaAnalysis {
  siteId: string;
  url: string;
  profiles: SocialMediaProfile[];
  metrics: SocialMediaMetrics;
  integration: SocialMediaIntegration;
  contentAlignment: number; // Scale of 0-100 representing alignment of social and website content
  score: number;
  grade: {
    letter: string;
    color: string;
    label: string;
  };
  recommendations: string[];
  summary: string;
  createdAt: string;
}

export interface SocialMediaIssue {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  recommendation: string;
  impact: string;
}

/**
 * Service to analyze social media presence and its integration with SEO strategy
 */
export class SocialMediaAnalysisService {
  private static supabase = createClient();

  /**
   * Analyze social media presence for a domain
   */
  static async analyzeSocialMedia(siteId: string, domain: string): Promise<SocialMediaAnalysis> {
    try {
      // First check cache
      const cachedAnalysis = await this.getCachedAnalysis(siteId, domain);
      if (cachedAnalysis) {
        return cachedAnalysis;
      }

      // Discover social media profiles
      const profiles = await this.discoverSocialProfiles(domain);
      
      // Get website integration
      const integration = await this.checkSocialIntegration(domain);
      
      // Calculate metrics
      const metrics = this.calculateSocialMetrics(profiles, integration);
      
      // Calculate content alignment
      const contentAlignment = await this.analyzeSocialContentAlignment(domain, profiles);
      
      // Calculate overall score
      const score = this.calculateSocialScore(metrics, integration, contentAlignment);
      
      // Get grade based on score
      const grade = GradingSystemService.getGrade(score);
      
      // Identify issues
      const issues = this.identifySocialIssues(profiles, metrics, integration, contentAlignment);
      
      // Generate recommendations
      const recommendations = this.generateSocialRecommendations(issues, profiles);
      
      // Generate summary
      const summary = this.generateSocialSummary(profiles, metrics, score);
      
      // Create analysis object
      const analysis: SocialMediaAnalysis = {
        siteId,
        url: domain,
        profiles,
        metrics,
        integration,
        contentAlignment,
        score,
        grade,
        recommendations,
        summary,
        createdAt: new Date().toISOString()
      };
      
      // Store the analysis
      await this.storeSocialAnalysis(siteId, domain, analysis);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing social media:', error);
      // Return a default analysis with error information
      return this.createDefaultAnalysis(siteId, domain, 'Error analyzing social media');
    }
  }

  /**
   * Get cached social media analysis if available and recent
   */
  private static async getCachedAnalysis(siteId: string, domain: string): Promise<SocialMediaAnalysis | null> {
    try {
      const { data, error } = await this.supabase
        .from('social_media_analysis')
        .select('full_analysis')
        .eq('site_id', siteId)
        .eq('domain', domain)
        .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Cache for 7 days
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error || !data || data.length === 0) {
        return null;
      }
      
      return data[0].full_analysis;
    } catch (error) {
      console.error('Error getting cached social media analysis:', error);
      return null;
    }
  }

  /**
   * Discover social media profiles for a domain
   * In a real implementation, this would use APIs and web scraping
   */
  private static async discoverSocialProfiles(domain: string): Promise<SocialMediaProfile[]> {
    // For development purposes, generate synthetic data
    // In production, this would use social media APIs and web scraping
    
    // Create a seed from the domain name for consistent random values
    const seed = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (min: number, max: number) => Math.floor((Math.sin(seed * (Math.random() + 1)) + 1) * (max - min) / 2) + min;
    
    const platforms: Array<'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'pinterest' | 'youtube' | 'tiktok'> = [
      'facebook', 'twitter', 'instagram', 'linkedin', 'pinterest', 'youtube', 'tiktok'
    ];
    
    // Not all platforms may be present
    const numPlatforms = random(3, 7);
    const selectedPlatforms = platforms.sort(() => 0.5 - Math.random()).slice(0, numPlatforms);
    
    const domainName = domain.split('.')[0];
    
    return selectedPlatforms.map(platform => {
      // Create platform-specific usernames
      let username = '';
      switch (platform) {
        case 'facebook':
          username = random(0, 100) > 50 ? domainName : `${domainName}official`;
          break;
        case 'twitter':
          username = random(0, 100) > 50 ? `@${domainName}` : `@${domainName}_official`;
          break;
        case 'instagram':
          username = random(0, 100) > 50 ? domainName : `${domainName}_official`;
          break;
        case 'linkedin':
          username = `${domainName}-company`;
          break;
        case 'pinterest':
          username = domainName;
          break;
        case 'youtube':
          username = `${domainName}Channel`;
          break;
        case 'tiktok':
          username = `@${domainName}`;
          break;
      }
      
      // Generate followers based on platform
      let followers = 0;
      switch (platform) {
        case 'facebook':
          followers = random(500, 50000);
          break;
        case 'twitter':
          followers = random(200, 20000);
          break;
        case 'instagram':
          followers = random(1000, 30000);
          break;
        case 'linkedin':
          followers = random(100, 5000);
          break;
        case 'pinterest':
          followers = random(50, 3000);
          break;
        case 'youtube':
          followers = random(100, 10000);
          break;
        case 'tiktok':
          followers = random(500, 20000);
          break;
      }
      
      // Generate engagement rate (0.5% - 5%)
      const engagement = random(5, 50) / 10;
      
      // Generate post frequency (0.5 - 7 posts per week)
      const postFrequency = random(5, 70) / 10;
      
      // Generate last updated date (within the last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const lastUpdatedTime = thirtyDaysAgo.getTime() + random(0, now.getTime() - thirtyDaysAgo.getTime());
      const lastUpdated = new Date(lastUpdatedTime).toISOString();
      
      // Generate verified status (20% chance)
      const verified = random(0, 100) < 20;
      
      // Generate platform URL
      let url = '';
      switch (platform) {
        case 'facebook':
          url = `https://facebook.com/${username}`;
          break;
        case 'twitter':
          url = `https://twitter.com/${username.replace('@', '')}`;
          break;
        case 'instagram':
          url = `https://instagram.com/${username}`;
          break;
        case 'linkedin':
          url = `https://linkedin.com/company/${username}`;
          break;
        case 'pinterest':
          url = `https://pinterest.com/${username}`;
          break;
        case 'youtube':
          url = `https://youtube.com/c/${username}`;
          break;
        case 'tiktok':
          url = `https://tiktok.com/${username}`;
          break;
      }
      
      return {
        platform,
        url,
        username,
        followers,
        engagement,
        postFrequency,
        lastUpdated,
        verified
      };
    });
  }

  /**
   * Check social media integration on the website
   */
  private static async checkSocialIntegration(domain: string): Promise<SocialMediaIntegration> {
    // In a real implementation, this would crawl the website and check for social integration
    // For development purposes, generate synthetic data
    
    // Create a seed from the domain name for consistent random values
    const seed = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (min: number, max: number) => Math.floor((Math.sin(seed * (Math.random() + 1)) + 1) * (max - min) / 2) + min;
    
    // Generate integration data
    const hasSocialLinks = random(0, 100) < 80; // 80% chance
    const hasSocialSharing = random(0, 100) < 60; // 60% chance
    const hasOpenGraph = random(0, 100) < 50; // 50% chance
    const hasTwitterCards = random(0, 100) < 40; // 40% chance
    const hasRichPins = random(0, 100) < 20; // 20% chance
    
    // Generate social icons position
    const positions: Array<'header' | 'footer' | 'sidebar' | 'multiple' | 'none'> = ['header', 'footer', 'sidebar', 'multiple', 'none'];
    const socialIconsPosition = hasSocialLinks ? positions[random(0, positions.length - 1)] : 'none';
    
    return {
      hasSocialLinks,
      hasSocialSharing,
      hasOpenGraph,
      hasTwitterCards,
      hasRichPins,
      socialIconsPosition
    };
  }

  /**
   * Calculate social media metrics
   */
  private static calculateSocialMetrics(
    profiles: SocialMediaProfile[],
    integration: SocialMediaIntegration
  ): SocialMediaMetrics {
    // Calculate total followers
    const totalFollowers = profiles.reduce((sum, profile) => sum + profile.followers, 0);
    
    // Calculate weighted engagement (followers * engagement rate)
    const totalEngagement = profiles.reduce((sum, profile) => sum + (profile.followers * (profile.engagement / 100)), 0);
    
    // Calculate platform coverage (percentage of recommended platforms used)
    const recommendedPlatforms = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube'];
    const usedRecommendedPlatforms = profiles.filter(profile => recommendedPlatforms.includes(profile.platform)).length;
    const platformCoverage = (usedRecommendedPlatforms / recommendedPlatforms.length) * 100;
    
    // Calculate average post frequency
    const averagePostFrequency = profiles.reduce((sum, profile) => sum + profile.postFrequency, 0) / profiles.length || 0;
    
    // Calculate profile consistency
    // In a real implementation, this would check for consistent branding, descriptions, etc.
    // For development, generate a synthetic value
    const profileConsistency = Math.min(100, Math.max(0, 40 + (Math.random() * 60)));
    
    // Calculate site integration score
    let siteIntegration = 0;
    if (integration.hasSocialLinks) siteIntegration += 20;
    if (integration.hasSocialSharing) siteIntegration += 20;
    if (integration.hasOpenGraph) siteIntegration += 20;
    if (integration.hasTwitterCards) siteIntegration += 20;
    if (integration.hasRichPins) siteIntegration += 10;
    if (integration.socialIconsPosition === 'multiple') siteIntegration += 10;
    
    return {
      totalFollowers,
      totalEngagement,
      platformCoverage,
      averagePostFrequency,
      profileConsistency,
      siteIntegration
    };
  }

  /**
   * Analyze alignment between social media content and website content
   */
  private static async analyzeSocialContentAlignment(domain: string, profiles: SocialMediaProfile[]): Promise<number> {
    // In a real implementation, this would analyze content on both the website and social media platforms
    // For development purposes, generate a synthetic value
    
    // Create a seed from the domain name for consistent random values
    const seed = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Base alignment on the number of active profiles
    const activeProfiles = profiles.filter(profile => {
      const lastUpdatedDate = new Date(profile.lastUpdated);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return lastUpdatedDate > twoWeeksAgo;
    }).length;
    
    // More active profiles generally indicates better content alignment
    const baseAlignment = 50 + (activeProfiles * 5);
    
    // Add some randomness
    const randomOffset = (Math.sin(seed * Math.random()) + 1) * 10;
    
    return Math.min(100, Math.max(0, baseAlignment + randomOffset));
  }

  /**
   * Calculate overall social media score
   */
  private static calculateSocialScore(
    metrics: SocialMediaMetrics,
    integration: SocialMediaIntegration,
    contentAlignment: number
  ): number {
    // Weights for each component
    const weights = {
      platformCoverage: 0.15,
      profileConsistency: 0.15,
      postFrequency: 0.15,
      engagement: 0.2,
      siteIntegration: 0.2,
      contentAlignment: 0.15
    };
    
    // Normalize post frequency (ideal is 3-5 posts per week)
    const normalizedPostFrequency = Math.min(100, Math.max(0, 
      metrics.averagePostFrequency < 1 ? metrics.averagePostFrequency * 60 :
      metrics.averagePostFrequency < 3 ? 60 + (metrics.averagePostFrequency - 1) * 20 :
      metrics.averagePostFrequency <= 5 ? 100 :
      100 - ((metrics.averagePostFrequency - 5) * 10)
    ));
    
    // Normalize engagement (based on industry averages)
    // Average engagement rate is ~1-2%, excellent is 3%+
    const normalizedEngagement = Math.min(100, metrics.totalEngagement > 0 ? 
      Math.min(100, (metrics.totalEngagement / metrics.totalFollowers) * 10000) : 0);
    
    // Calculate weighted score
    const score = (
      metrics.platformCoverage * weights.platformCoverage +
      metrics.profileConsistency * weights.profileConsistency +
      normalizedPostFrequency * weights.postFrequency +
      normalizedEngagement * weights.engagement +
      metrics.siteIntegration * weights.siteIntegration +
      contentAlignment * weights.contentAlignment
    );
    
    // Round to nearest integer
    return Math.round(score);
  }

  /**
   * Identify issues with social media strategy
   */
  private static identifySocialIssues(
    profiles: SocialMediaProfile[],
    metrics: SocialMediaMetrics,
    integration: SocialMediaIntegration,
    contentAlignment: number
  ): SocialMediaIssue[] {
    const issues: SocialMediaIssue[] = [];
    
    // Check for missing key platforms
    const keyPlatforms = ['facebook', 'twitter', 'instagram', 'linkedin'];
    const missingPlatforms = keyPlatforms.filter(platform => 
      !profiles.some(profile => profile.platform === platform)
    );
    
    if (missingPlatforms.length > 0) {
      issues.push({
        id: 'missing_key_platforms',
        type: 'platform_coverage',
        severity: missingPlatforms.length > 2 ? 'high' : 'medium',
        description: `Missing ${missingPlatforms.length} key social platforms: ${missingPlatforms.join(', ')}`,
        recommendation: 'Create profiles on all major social platforms relevant to your industry',
        impact: 'Limited social media reach and missed audience segments'
      });
    }
    
    // Check for low posting frequency
    if (metrics.averagePostFrequency < 1) {
      issues.push({
        id: 'low_posting_frequency',
        type: 'posting_frequency',
        severity: 'high',
        description: `Low posting frequency (${metrics.averagePostFrequency.toFixed(1)} posts per week)`,
        recommendation: 'Increase posting frequency to at least 2-3 times per week on each platform',
        impact: 'Reduced visibility and engagement with your audience'
      });
    }
    
    // Check for inconsistent posting
    const inactivePlatforms = profiles.filter(profile => {
      const lastUpdatedDate = new Date(profile.lastUpdated);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return lastUpdatedDate < twoWeeksAgo;
    });
    
    if (inactivePlatforms.length > 0) {
      issues.push({
        id: 'inactive_platforms',
        type: 'posting_consistency',
        severity: 'medium',
        description: `${inactivePlatforms.length} platforms haven't been updated in the past 2 weeks`,
        recommendation: 'Maintain a consistent posting schedule across all platforms',
        impact: 'Decreased audience engagement and potential loss of followers'
      });
    }
    
    // Check for low engagement
    if (metrics.totalFollowers > 0 && (metrics.totalEngagement / metrics.totalFollowers) < 0.01) {
      issues.push({
        id: 'low_engagement',
        type: 'engagement',
        severity: 'high',
        description: 'Low engagement rate across social platforms',
        recommendation: 'Create more engaging content, ask questions, run polls, and respond to comments',
        impact: 'Content not resonating with audience, limiting organic growth'
      });
    }
    
    // Check for missing website integration
    if (!integration.hasSocialLinks) {
      issues.push({
        id: 'missing_social_links',
        type: 'site_integration',
        severity: 'high',
        description: 'No social media links found on website',
        recommendation: 'Add social media links to your website header and footer',
        impact: 'Website visitors cannot find and follow your social profiles'
      });
    }
    
    if (!integration.hasSocialSharing) {
      issues.push({
        id: 'missing_share_buttons',
        type: 'site_integration',
        severity: 'medium',
        description: 'No social sharing buttons found on content pages',
        recommendation: 'Add social sharing buttons to blog posts and key content pages',
        impact: 'Lost opportunity for content amplification by visitors'
      });
    }
    
    // Check for missing meta tags
    if (!integration.hasOpenGraph) {
      issues.push({
        id: 'missing_open_graph',
        type: 'social_meta',
        severity: 'medium',
        description: 'Open Graph meta tags not implemented',
        recommendation: 'Implement Open Graph tags for better content previews on Facebook and LinkedIn',
        impact: 'Poor content appearance when shared on social platforms'
      });
    }
    
    if (!integration.hasTwitterCards) {
      issues.push({
        id: 'missing_twitter_cards',
        type: 'social_meta',
        severity: 'medium',
        description: 'Twitter Card meta tags not implemented',
        recommendation: 'Implement Twitter Card tags for better content previews on Twitter',
        impact: 'Poor content appearance when shared on Twitter'
      });
    }
    
    // Check for content alignment
    if (contentAlignment < 60) {
      issues.push({
        id: 'poor_content_alignment',
        type: 'content_strategy',
        severity: contentAlignment < 40 ? 'high' : 'medium',
        description: 'Poor alignment between website content and social media content',
        recommendation: 'Create a unified content strategy that aligns social media with your website messaging',
        impact: 'Inconsistent brand messaging and confused audience'
      });
    }
    
    return issues;
  }

  /**
   * Generate recommendations based on identified issues
   */
  private static generateSocialRecommendations(
    issues: SocialMediaIssue[],
    profiles: SocialMediaProfile[]
  ): string[] {
    // Start with issue-specific recommendations
    const recommendations = issues.map(issue => issue.recommendation);
    
    // Add platform-specific recommendations
    if (profiles.some(p => p.platform === 'facebook')) {
      recommendations.push('Use Facebook for community building and sharing varied content types including videos and stories');
    }
    
    if (profiles.some(p => p.platform === 'twitter')) {
      recommendations.push('Use Twitter for industry news, timely updates, and engaging in relevant conversations');
    }
    
    if (profiles.some(p => p.platform === 'instagram')) {
      recommendations.push('Create visually appealing content for Instagram focusing on high-quality images and stories');
    }
    
    if (profiles.some(p => p.platform === 'linkedin')) {
      recommendations.push('Share industry insights and company news on LinkedIn to establish thought leadership');
    }
    
    // Add general recommendations
    recommendations.push('Develop a social media content calendar to maintain consistency');
    recommendations.push('Cross-promote content across different social platforms while adapting to each platform's format');
    recommendations.push('Monitor social media metrics regularly and adjust your strategy based on performance data');
    
    // Remove duplicates and return
    return [...new Set(recommendations)];
  }

  /**
   * Generate a human-readable summary of the social media analysis
   */
  private static generateSocialSummary(
    profiles: SocialMediaProfile[],
    metrics: SocialMediaMetrics,
    score: number
  ): string {
    const grade = GradingSystemService.getGrade(score);
    
    let summary = `Your social media presence spans ${profiles.length} platforms with a total of ${metrics.totalFollowers.toLocaleString()} followers. `;
    
    summary += `Overall social media score: ${score}/100 (${grade.label}). `;
    
    if (score >= 90) {
      summary += 'Your social media strategy is excellent, with strong integration and engagement across platforms.';
    } else if (score >= 75) {
      summary += 'Your social media presence is good, with some areas for potential improvement.';
    } else if (score >= 60) {
      summary += 'Your social media strategy is average, with several areas that need improvement to maximize impact.';
    } else if (score >= 40) {
      summary += 'Your social media presence needs significant work to improve engagement and integration with your website.';
    } else {
      summary += 'Your social media strategy is weak and requires immediate attention to support your SEO efforts.';
    }
    
    return summary;
  }

  /**
   * Store social media analysis in database
   */
  private static async storeSocialAnalysis(siteId: string, domain: string, analysis: SocialMediaAnalysis): Promise<void> {
    try {
      await this.supabase
        .from('social_media_analysis')
        .upsert({
          site_id: siteId,
          domain,
          platforms: analysis.profiles.map(p => p.platform).join(','),
          total_followers: analysis.metrics.totalFollowers,
          platform_coverage: analysis.metrics.platformCoverage,
          site_integration: analysis.metrics.siteIntegration,
          content_alignment: analysis.contentAlignment,
          score: analysis.score,
          summary: analysis.summary,
          recommendations: analysis.recommendations,
          created_at: new Date().toISOString(),
          full_analysis: analysis
        });
    } catch (error) {
      console.error('Error storing social media analysis:', error);
    }
  }

  /**
   * Get the stored social media analysis for a domain
   */
  static async getSocialMediaAnalysis(siteId: string, domain: string): Promise<SocialMediaAnalysis | null> {
    try {
      const { data, error } = await this.supabase
        .from('social_media_analysis')
        .select('full_analysis')
        .eq('site_id', siteId)
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error || !data || data.length === 0) {
        return null;
      }
      
      return data[0].full_analysis;
    } catch (error) {
      console.error('Error retrieving social media analysis:', error);
      return null;
    }
  }

  /**
   * Get historical social media metrics
   */
  static async getHistoricalSocialMetrics(siteId: string, domain: string, limit: number = 6): Promise<Array<{
    date: string;
    totalFollowers: number;
    platformCoverage: number;
    siteIntegration: number;
    score: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('social_media_analysis')
        .select('created_at, total_followers, platform_coverage, site_integration, score')
        .eq('site_id', siteId)
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error || !data) {
        return [];
      }
      
      return data.map(item => ({
        date: item.created_at,
        totalFollowers: item.total_followers,
        platformCoverage: item.platform_coverage,
        siteIntegration: item.site_integration,
        score: item.score
      })).reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error retrieving historical social media metrics:', error);
      return [];
    }
  }

  /**
   * Create a default analysis object for error cases
   */
  private static createDefaultAnalysis(siteId: string, domain: string, errorMessage: string): SocialMediaAnalysis {
    return {
      siteId,
      url: domain,
      profiles: [],
      metrics: {
        totalFollowers: 0,
        totalEngagement: 0,
        platformCoverage: 0,
        averagePostFrequency: 0,
        profileConsistency: 0,
        siteIntegration: 0
      },
      integration: {
        hasSocialLinks: false,
        hasSocialSharing: false,
        hasOpenGraph: false,
        hasTwitterCards: false,
        hasRichPins: false,
        socialIconsPosition: 'none'
      },
      contentAlignment: 0,
      score: 0,
      grade: GradingSystemService.getGrade(0),
      recommendations: [
        'Unable to analyze social media presence due to an error',
        'Try running the analysis again later'
      ],
      summary: `Error: ${errorMessage}`,
      createdAt: new Date().toISOString()
    };
  }
} 