/**
 * GradingSystemService - Provides standardized scoring and grading 
 * functionality across all SEO analysis components
 */
export class GradingSystemService {
  // Score ranges for letter grades
  static readonly GRADE_RANGES = {
    A: { min: 90, max: 100, color: '#22c55e' }, // Green
    B: { min: 75, max: 89, color: '#84cc16' },  // Light green
    C: { min: 60, max: 74, color: '#facc15' },  // Yellow
    D: { min: 40, max: 59, color: '#f97316' },  // Orange
    F: { min: 0, max: 39, color: '#ef4444' }    // Red
  };

  // Issue severity levels with weights for score calculations
  static readonly SEVERITY_WEIGHTS = {
    critical: 1.0,   // Full weight
    high: 0.8,       // 80% weight
    medium: 0.5,     // 50% weight
    low: 0.3,        // 30% weight
    info: 0.1        // 10% weight
  };

  /**
   * Get a letter grade based on a numeric score
   */
  static getGrade(score: number): {
    letter: 'A' | 'B' | 'C' | 'D' | 'F',
    color: string,
    label: string
  } {
    if (score >= this.GRADE_RANGES.A.min) {
      return { letter: 'A', color: this.GRADE_RANGES.A.color, label: 'Excellent' };
    } else if (score >= this.GRADE_RANGES.B.min) {
      return { letter: 'B', color: this.GRADE_RANGES.B.color, label: 'Good' };
    } else if (score >= this.GRADE_RANGES.C.min) {
      return { letter: 'C', color: this.GRADE_RANGES.C.color, label: 'Average' };
    } else if (score >= this.GRADE_RANGES.D.min) {
      return { letter: 'D', color: this.GRADE_RANGES.D.color, label: 'Poor' };
    } else {
      return { letter: 'F', color: this.GRADE_RANGES.F.color, label: 'Critical' };
    }
  }

  /**
   * Calculate a weighted score based on issue counts
   */
  static calculateWeightedScore(
    baseScore: number,
    issuesCounts: {
      critical?: number;
      high?: number;
      medium?: number;
      low?: number;
      info?: number;
    },
    options: {
      maxPenalty?: number;
      maxIssuesBeforeFullPenalty?: number;
      baseWeight?: number;
    } = {}
  ): number {
    const {
      maxPenalty = 100,
      maxIssuesBeforeFullPenalty = 10,
      baseWeight = 1.0
    } = options;

    // Calculate total weighted issues
    let totalWeightedIssues = 0;
    
    if (issuesCounts.critical) {
      totalWeightedIssues += issuesCounts.critical * this.SEVERITY_WEIGHTS.critical;
    }
    
    if (issuesCounts.high) {
      totalWeightedIssues += issuesCounts.high * this.SEVERITY_WEIGHTS.high;
    }
    
    if (issuesCounts.medium) {
      totalWeightedIssues += issuesCounts.medium * this.SEVERITY_WEIGHTS.medium;
    }
    
    if (issuesCounts.low) {
      totalWeightedIssues += issuesCounts.low * this.SEVERITY_WEIGHTS.low;
    }
    
    if (issuesCounts.info) {
      totalWeightedIssues += issuesCounts.info * this.SEVERITY_WEIGHTS.info;
    }
    
    // Calculate penalty as a percentage of the max penalty
    const penaltyPercentage = Math.min(
      1.0,
      totalWeightedIssues / maxIssuesBeforeFullPenalty
    );
    
    const penalty = maxPenalty * penaltyPercentage * baseWeight;
    
    // Apply penalty to base score and ensure it's between 0-100
    return Math.max(0, Math.min(100, Math.round(baseScore - penalty)));
  }

  /**
   * Get a recommended action based on grade
   */
  static getRecommendedAction(grade: 'A' | 'B' | 'C' | 'D' | 'F'): string {
    switch (grade) {
      case 'A':
        return 'Maintain current implementation and monitor periodically';
      case 'B':
        return 'Address minor issues to reach excellent status';
      case 'C':
        return 'Implement recommended improvements to enhance performance';
      case 'D':
        return 'Prioritize addressing critical issues immediately';
      case 'F':
        return 'Requires immediate attention and comprehensive overhaul';
      default:
        return 'Review and implement suggested improvements';
    }
  }

  /**
   * Calculate a normalized score (0-100) for a value based on thresholds
   * For metrics where lower is better (e.g. page load time)
   */
  static normalizeScoreLowerBetter(
    value: number,
    idealThreshold: number,
    warningThreshold: number, 
    criticalThreshold: number
  ): number {
    if (value <= idealThreshold) {
      return 100; // Ideal or better
    } else if (value <= warningThreshold) {
      // Linear scale between ideal and warning
      return Math.round(
        100 - ((value - idealThreshold) / (warningThreshold - idealThreshold)) * 25
      );
    } else if (value <= criticalThreshold) {
      // Linear scale between warning and critical
      return Math.round(
        75 - ((value - warningThreshold) / (criticalThreshold - warningThreshold)) * 35
      );
    } else {
      // Exponential decay for very poor values
      const excessPercentage = (value - criticalThreshold) / criticalThreshold;
      const baseScore = 40;
      return Math.max(0, Math.round(
        baseScore - (baseScore * Math.min(1, excessPercentage))
      ));
    }
  }

  /**
   * Calculate a normalized score (0-100) for a value based on thresholds
   * For metrics where higher is better (e.g. content quality)
   */
  static normalizeScoreHigherBetter(
    value: number,
    criticalThreshold: number,
    warningThreshold: number,
    idealThreshold: number
  ): number {
    if (value >= idealThreshold) {
      return 100; // Ideal or better
    } else if (value >= warningThreshold) {
      // Linear scale between ideal and warning
      return Math.round(
        100 - ((idealThreshold - value) / (idealThreshold - warningThreshold)) * 25
      );
    } else if (value >= criticalThreshold) {
      // Linear scale between warning and critical
      return Math.round(
        75 - ((warningThreshold - value) / (warningThreshold - criticalThreshold)) * 35
      );
    } else {
      // Exponential decay for very poor values
      const excessPercentage = (criticalThreshold - value) / criticalThreshold;
      const baseScore = 40;
      return Math.max(0, Math.round(
        baseScore - (baseScore * Math.min(1, excessPercentage))
      ));
    }
  }

  /**
   * Calculate performance improvement potential
   * Returns a value between 0-100 representing how much improvement is possible
   */
  static calculateImprovementPotential(
    currentScore: number,
    issueCount: number,
    maxIssueImpact: number = 5
  ): number {
    // Calculate how much the score could theoretically improve
    const theoreticalImprovement = 100 - currentScore;
    
    // Calculate impact based on issues (each issue can improve score by maxIssueImpact points)
    const potentialImpact = Math.min(100, issueCount * maxIssueImpact);
    
    // Take the lower of theoretical improvement or potential impact
    return Math.min(theoreticalImprovement, potentialImpact);
  }

  /**
   * Generate a human-readable summary of the score
   */
  static generateScoreSummary(score: number, issueCount: number): string {
    const grade = this.getGrade(score);
    
    if (score >= 90) {
      return `Excellent (${score}/100). ${issueCount > 0 ? `${issueCount} minor issues found.` : 'No significant issues found.'}`;
    } else if (score >= 75) {
      return `Good (${score}/100). ${issueCount} issues found that could be improved.`;
    } else if (score >= 60) {
      return `Average (${score}/100). ${issueCount} issues found requiring attention.`;
    } else if (score >= 40) {
      return `Poor (${score}/100). ${issueCount} significant issues found requiring immediate attention.`;
    } else {
      return `Critical (${score}/100). ${issueCount} critical issues found requiring comprehensive overhaul.`;
    }
  }

  /**
   * Calculate how a score compares to industry average
   */
  static compareToIndustryAverage(score: number, industryAverage: number): {
    difference: number;
    percentageDifference: number;
    comparisonText: string;
  } {
    const difference = score - industryAverage;
    const percentageDifference = (difference / industryAverage) * 100;
    
    let comparisonText = '';
    
    if (difference >= 15) {
      comparisonText = `Significantly above industry average (${Math.abs(Math.round(percentageDifference))}% better)`;
    } else if (difference >= 5) {
      comparisonText = `Above industry average (${Math.abs(Math.round(percentageDifference))}% better)`;
    } else if (difference >= -5) {
      comparisonText = `At industry average level`;
    } else if (difference >= -15) {
      comparisonText = `Below industry average (${Math.abs(Math.round(percentageDifference))}% worse)`;
    } else {
      comparisonText = `Significantly below industry average (${Math.abs(Math.round(percentageDifference))}% worse)`;
    }
    
    return {
      difference,
      percentageDifference,
      comparisonText
    };
  }
} 