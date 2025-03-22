import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { scaleIn, growFromLeft } from '@/lib/motion';

interface ChartData {
  name: string;
  [key: string]: any;
}

interface AnimatedChartProps {
  title?: string;
  description?: string;
  data: ChartData[];
  type: 'line' | 'area' | 'bar';
  dataKeys: {
    key: string;
    color: string;
    name?: string;
  }[];
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  height?: number;
  xAxisDataKey?: string;
  formatTooltip?: (value: any, name: string) => string;
}

export function AnimatedChart({
  title,
  description,
  data,
  type = 'line',
  dataKeys,
  className,
  showGrid = true,
  showLegend = true,
  height = 300,
  xAxisDataKey = 'name',
  formatTooltip,
}: AnimatedChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const getChartContent = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            <XAxis 
              dataKey={xAxisDataKey} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              dx={-10}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{ 
                backgroundColor: 'var(--background)', 
                borderColor: 'var(--border)',
                borderRadius: '8px'
              }} 
            />
            {showLegend && (
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
              />
            )}
            {dataKeys.map((dataKey, index) => (
              <Line
                key={dataKey.key}
                type="monotone"
                dataKey={dataKey.key}
                name={dataKey.name || dataKey.key}
                stroke={dataKey.color}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={isVisible}
              />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            <XAxis 
              dataKey={xAxisDataKey} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              dx={-10}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{ 
                backgroundColor: 'var(--background)', 
                borderColor: 'var(--border)',
                borderRadius: '8px'
              }} 
            />
            {showLegend && (
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="circle"
                iconSize={8}
              />
            )}
            {dataKeys.map((dataKey, index) => (
              <Area
                key={dataKey.key}
                type="monotone"
                dataKey={dataKey.key}
                name={dataKey.name || dataKey.key}
                fill={dataKey.color}
                stroke={dataKey.color}
                strokeWidth={2}
                fillOpacity={0.2}
                isAnimationActive={isVisible}
              />
            ))}
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            <XAxis 
              dataKey={xAxisDataKey} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              dx={-10}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{ 
                backgroundColor: 'var(--background)', 
                borderColor: 'var(--border)',
                borderRadius: '8px'
              }} 
            />
            {showLegend && (
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="circle"
                iconSize={8}
              />
            )}
            {dataKeys.map((dataKey, index) => (
              <Bar
                key={dataKey.key}
                dataKey={dataKey.key}
                name={dataKey.name || dataKey.key}
                fill={dataKey.color}
                radius={[4, 4, 0, 0]}
                barSize={20}
                isAnimationActive={isVisible}
              />
            ))}
          </BarChart>
        );
      default:
        return null;
    }
  };
  
  return (
    <motion.div 
      className={cn('w-full', className)}
      variants={scaleIn(0.2)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      onViewportEnter={() => setIsVisible(true)}
    >
      <Card className="border shadow-sm">
        {(title || description) && (
          <CardHeader className="pb-4">
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="pt-0">
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
              {getChartContent()}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AnimatedProgressBar({
  value,
  total = 100,
  label,
  color = 'bg-primary',
  size = 'medium',
  showValue = true,
  className,
  delay = 0,
}: {
  value: number;
  total?: number;
  label?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  className?: string;
  delay?: number;
}) {
  const percentage = Math.min(100, Math.max(0, (value / total) * 100));
  
  const heightClass = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3',
  }[size];
  
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">{label}</span>
          {showValue && <span className="font-medium">{value}</span>}
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', heightClass)}>
        <motion.div 
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          transition={{ 
            type: 'spring', 
            stiffness: 60, 
            delay,
            duration: 0.8
          }}
          viewport={{ once: true }}
        />
      </div>
    </div>
  );
} 