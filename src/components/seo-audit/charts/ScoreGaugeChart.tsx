import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScoreGaugeChartProps {
  score: number;
  grade?: string;
  title?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ScoreGaugeChart({ 
  score, 
  grade, 
  title = 'SEO Score', 
  showPercentage = true,
  size = 'md',
  className = ''
}: ScoreGaugeChartProps) {
  // Ensure the score is between 0 and 100
  const validScore = Math.max(0, Math.min(100, score));
  
  // Define the color based on the score
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#3b82f6'; // blue
    if (score >= 50) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };
  
  const color = getScoreColor(validScore);
  
  // Data for the gauge chart
  const data = [
    { name: 'Score', value: validScore },
    { name: 'Remaining', value: 100 - validScore }
  ];
  
  // Chart dimensions based on size
  const getDimensions = () => {
    switch (size) {
      case 'sm': return { height: 120, innerRadius: 35, outerRadius: 48 };
      case 'lg': return { height: 250, innerRadius: 75, outerRadius: 100 };
      default: return { height: 180, innerRadius: 55, outerRadius: 75 };
    }
  };
  
  const { height, innerRadius, outerRadius } = getDimensions();

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col items-center justify-center">
          <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={true}
                >
                  <Cell key="score" fill={color} />
                  <Cell key="remaining" fill="#e5e7eb" />
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Score']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div 
              style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -30%)',
                textAlign: 'center'
              }}
            >
              <div className="flex flex-col items-center">
                <span 
                  className="text-4xl font-bold" 
                  style={{ color }}
                >
                  {validScore}{showPercentage && '%'}
                </span>
                {grade && (
                  <span className="text-xl font-medium text-gray-600 mt-1">
                    {grade}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 