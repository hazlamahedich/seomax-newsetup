'use server';

// This module uses Node.js libraries and should ONLY be used in server components or server actions
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ScrapedContent {
  url: string;
  title: string;
  text: string;
  html: string;
  metadata: {
    description?: string;
    keywords?: string[];
    canonical?: string;
    ogTitle?: string;
    ogDescription?: string;
  };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  images: {
    src: string;
    alt?: string;
  }[];
}

export class ScraperService {
  /**
   * Scrape content from a URL
   */
  static async scrapeUrl(url: string): Promise<ScrapedContent | null> {
    try {
      // In a real implementation, this would use a proper scraping service
      // or API that respects robots.txt and has proper rate limiting
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SEOMax/1.0 (https://seomax.app; info@seomax.app)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      return this.parseHtml(url, html);
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  }
  
  /**
   * Parse HTML content
   */
  private static parseHtml(url: string, html: string): ScrapedContent {
    // Create a DOM from the HTML
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // Extract article content using Readability
    const reader = new Readability(document);
    const article = reader.parse();
    
    // Extract metadata
    const metadata = this.extractMetadata(document);
    
    // Extract headings
    const headings = this.extractHeadings(document);
    
    // Extract images
    const images = this.extractImages(document);
    
    return {
      url,
      title: article?.title || document.title || url,
      text: article?.textContent || document.body.textContent || '',
      html: article?.content || document.body.innerHTML || '',
      metadata,
      headings,
      images
    };
  }
  
  /**
   * Extract metadata from HTML
   */
  private static extractMetadata(document: Document): ScrapedContent['metadata'] {
    const metadata: ScrapedContent['metadata'] = {
      description: '',
      keywords: [],
      canonical: '',
      ogTitle: '',
      ogDescription: ''
    };
    
    // Meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metadata.description = metaDescription.getAttribute('content') || '';
    }
    
    // Meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      const keywordsString = metaKeywords.getAttribute('content') || '';
      metadata.keywords = keywordsString.split(',').map(k => k.trim());
    }
    
    // Canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      metadata.canonical = canonical.getAttribute('href') || '';
    }
    
    // Open Graph title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      metadata.ogTitle = ogTitle.getAttribute('content') || '';
    }
    
    // Open Graph description
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      metadata.ogDescription = ogDescription.getAttribute('content') || '';
    }
    
    return metadata;
  }
  
  /**
   * Extract headings from HTML
   */
  private static extractHeadings(document: Document): ScrapedContent['headings'] {
    const headings = {
      h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent || ''),
      h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent || ''),
      h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent || '')
    };
    
    return headings;
  }
  
  /**
   * Extract images from HTML
   */
  private static extractImages(document: Document): ScrapedContent['images'] {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || ''
    }));
  }
} 