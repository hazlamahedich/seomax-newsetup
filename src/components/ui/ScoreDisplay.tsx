import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { BadgeCheck, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { SEOScore } from '@/lib/types/seo';
import { GradingSystemService } from '@/lib/services/GradingSystemService';

interface ScoreDisplayProps {
  score: number | SEOScore;
  size?: 'sm' | 'md' | 'lg';
  showGrade?: boolean;
  showLabel?: boolean;
  showIssueCount?: boolean;
  issueCount?: number;
  label?: string;
  className?: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  size = 'md',
  showGrade = true,
  showLabel = true,
  showIssueCount = false,
  issueCount,
  label,
  className = '',
}) => {
  // Handle both number and SEOScore types
  const scoreValue = typeof score === 'number' ? score : score.value;
  const scoreGrade = typeof score === 'number' 
    ? GradingSystemService.getGrade(score) 
    : score.grade;
  const scoreLabel = typeof score === 'number' 
    ? scoreGrade.label 
    : score.label || scoreGrade.label;
  const scoreColor = typeof score === 'number' 
    ? scoreGrade.color 
    : score.color || scoreGrade.color;
  const issues = typeof score === 'number' 
    ? issueCount || 0 
    : score.issueCount;
  const displayLabel = label || scoreLabel;
  
  // Size classes
  const sizeClasses = {
    sm: {
      container: 'w-16 h-16',
      grade: 'text-xl font-bold',
      label: 'text-xs',
      issues: 'text-xs',
    },
    md: {
      container: 'w-24 h-24',
      grade: 'text-2xl font-bold',
      label: 'text-sm',
      issues: 'text-xs',
    },
    lg: {
      container: 'w-32 h-32',
      grade: 'text-3xl font-bold',
      label: 'text-base',
      issues: 'text-sm',
    },
  };
  
  // Icon based on grade
  const GradeIcon = () => {
    switch (scoreGrade.letter) {
      case 'A':
        return <BadgeCheck className="w-4 h-4 text-green-500" />;
      case 'B':
        return <BadgeCheck className="w-4 h-4 text-lime-500" />;
      case 'C':
        return <Info className="w-4 h-4 text-yellow-500" />;
      case 'D':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'F':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeClasses[size].container}`}>
        <CircularProgressbar
          value={scoreValue}
          text={`${Math.round(scoreValue)}`}
          circleRatio={0.75}
          styles={buildStyles({
            rotation: 1 / 2 + 1 / 8,
            strokeLinecap: 'round',
            trailColor: '#e6e6e6',
            pathColor: scoreColor,
            textColor: scoreColor,
            textSize: '28px',
          })}
        />
        {showGrade && (
          <div className="absolute inset-0 flex items-center justify-center mt-10">
            <div className={`flex items-center ${sizeClasses[size].grade}`} style={{ color: scoreColor }}>
              {scoreGrade.letter}
            </div>
          </div>
        )}
      </div>
      
      {showLabel && (
        <div className={`mt-2 flex items-center ${sizeClasses[size].label}`}>
          <GradeIcon />
          <span className="ml-1">{displayLabel}</span>
        </div>
      )}
      
      {showIssueCount && issues > 0 && (
        <div className={`mt-1 text-gray-500 ${sizeClasses[size].issues}`}>
          {issues} {issues === 1 ? 'issue' : 'issues'} found
        </div>
      )}
    </div>
  );
};

interface ScoreCardProps {
  title: string;
  score: number | SEOScore;
  description?: string;
  improvement?: number;
  showImprovement?: boolean;
  issueCount?: number;
  className?: string;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  title,
  score,
  description,
  improvement,
  showImprovement = false,
  issueCount,
  className = '',
}) => {
  // Handle both number and SEOScore types
  const scoreValue = typeof score === 'number' ? score : score.value;
  const scoreGrade = typeof score === 'number' 
    ? GradingSystemService.getGrade(score) 
    : score.grade;
  const issues = typeof score === 'number' 
    ? issueCount || 0 
    : score.issueCount;
  const improvementValue = typeof score === 'number'
    ? improvement || 0
    : score.improvementPotential;
  
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <ScoreDisplay
          score={score}
          size="sm"
          showLabel={false}
        />
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Grade: </span>
          <span className="font-medium" style={{ color: scoreGrade.color }}>
            {scoreGrade.letter} ({scoreGrade.label})
          </span>
        </div>
        
        {issues > 0 && (
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Issues: </span>
            <span className="font-medium">{issues}</span>
          </div>
        )}
        
        {showImprovement && improvementValue > 0 && (
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Potential improvement: </span>
            <span className="font-medium text-blue-600">+{improvementValue}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ScoreComparisonProps {
  current: number | SEOScore;
  previous?: number | null;
  industry?: number;
  showDelta?: boolean;
  showIndustry?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreComparison: React.FC<ScoreComparisonProps> = ({
  current,
  previous = null,
  industry,
  showDelta = true,
  showIndustry = false,
  size = 'md',
}) => {
  const currentValue = typeof current === 'number' ? current : current.value;
  const hasImproved = previous !== null && currentValue > previous;
  const hasDeclined = previous !== null && currentValue < previous;
  const delta = previous !== null ? currentValue - previous : 0;
  
  return (
    <div className="flex flex-col items-center">
      <ScoreDisplay score={current} size={size} />
      
      {showDelta && previous !== null && (
        <div className={`mt-2 flex items-center ${hasImproved ? 'text-green-500' : hasDeclined ? 'text-red-500' : 'text-gray-400'}`}>
          {hasImproved && <span>↑</span>}
          {hasDeclined && <span>↓</span>}
          <span className="ml-1">
            {hasImproved ? '+' : ''}{delta} pts since last check
          </span>
        </div>
      )}
      
      {showIndustry && industry !== undefined && (
        <div className="mt-1 text-gray-500 text-sm">
          {currentValue > industry
            ? `${Math.round(currentValue - industry)} pts above industry avg`
            : currentValue < industry
            ? `${Math.round(industry - currentValue)} pts below industry avg`
            : 'At industry average'}
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay; 