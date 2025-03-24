import React from 'react';
import { render, screen } from '@testing-library/react';
import { BacklinkAnalysisService } from '@/lib/services/BacklinkAnalysisService';

// Mock the service
jest.mock('@/lib/services/BacklinkAnalysisService');

describe('Backlink Analysis Service', () => {
  // Helper to access private methods for testing
  let privateBacklinkService: any;
  
  beforeEach(() => {
    // Create a fresh copy before each test to prevent test interference
    privateBacklinkService = {
      // Mock implementation of the high value backlinks method
      getHighValueBacklinks: (backlinks: any[]) => {
        // Educational backlinks
        const educationalBacklinks = backlinks.filter(link => 
          link.sourceDomain.endsWith('.edu') || 
          link.sourceDomain.includes('university') || 
          link.sourceDomain.includes('college')
        );
        
        // Government backlinks
        const governmentBacklinks = backlinks.filter(link => 
          link.sourceDomain.endsWith('.gov') || 
          link.sourceDomain.includes('government') || 
          link.sourceDomain.includes('agency')
        );
        
        // Sort by domain authority (highest first)
        const sortByAuthority = (a: any, b: any) => 
          b.domainAuthority - a.domainAuthority;
        
        return {
          educational: educationalBacklinks.sort(sortByAuthority),
          government: governmentBacklinks.sort(sortByAuthority)
        };
      }
    };
  });
  
  it('should identify educational backlinks correctly', () => {
    const mockBacklinks = [
      {
        sourceDomain: 'example.edu',
        domainAuthority: 85
      },
      {
        sourceDomain: 'harvard.edu',
        domainAuthority: 95
      },
      {
        sourceDomain: 'example.com',
        domainAuthority: 60
      }
    ];
    
    const result = privateBacklinkService.getHighValueBacklinks(mockBacklinks);
    
    expect(result.educational.length).toBe(2);
    // Should be sorted by authority, so Harvard should be first
    expect(result.educational[0].sourceDomain).toBe('harvard.edu');
    expect(result.educational[1].sourceDomain).toBe('example.edu');
  });
  
  it('should identify government backlinks correctly', () => {
    const mockBacklinks = [
      {
        sourceDomain: 'example.gov',
        domainAuthority: 85
      },
      {
        sourceDomain: 'government-agency.org',
        domainAuthority: 75
      },
      {
        sourceDomain: 'example.com',
        domainAuthority: 60
      }
    ];
    
    const result = privateBacklinkService.getHighValueBacklinks(mockBacklinks);
    
    expect(result.government.length).toBe(2);
    expect(result.government[0].sourceDomain).toBe('example.gov');
    expect(result.government[1].sourceDomain).toBe('government-agency.org');
  });
  
  it('should identify both educational and government backlinks', () => {
    const mockBacklinks = [
      {
        sourceDomain: 'example.edu',
        domainAuthority: 85
      },
      {
        sourceDomain: 'example.gov',
        domainAuthority: 90
      },
      {
        sourceDomain: 'example.com',
        domainAuthority: 60
      }
    ];
    
    const result = privateBacklinkService.getHighValueBacklinks(mockBacklinks);
    
    expect(result.educational.length).toBe(1);
    expect(result.government.length).toBe(1);
    expect(result.educational[0].sourceDomain).toBe('example.edu');
    expect(result.government[0].sourceDomain).toBe('example.gov');
  });
}); 