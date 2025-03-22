import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { scaleIn, hoverScale, hoverElevate } from '@/lib/motion';

interface AnimatedCardProps {
  title?: string;
  description?: string;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
  interactive?: boolean;
  delay?: number;
  onClick?: () => void;
  icon?: ReactNode;
}

export function AnimatedCard({
  title,
  description,
  footer,
  className,
  contentClassName,
  children,
  interactive = false,
  delay = 0,
  onClick,
  icon,
}: AnimatedCardProps) {
  const MotionCard = motion(Card);
  
  return (
    <MotionCard
      className={cn(
        'overflow-hidden',
        interactive && 'cursor-pointer',
        className
      )}
      variants={scaleIn(delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      whileHover={interactive ? hoverScale : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      onClick={onClick}
    >
      {title && (
        <CardHeader className="relative">
          {icon && (
            <div className="absolute right-6 top-4 text-muted-foreground opacity-20">{icon}</div>
          )}
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn("pt-0", contentClassName)}>
        {children}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </MotionCard>
  );
}

export function AnimatedMetricCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  className,
  delay = 0,
  onClick,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  delay?: number;
  onClick?: () => void;
}) {
  const MotionCard = motion(Card);
  
  return (
    <MotionCard
      className={cn('overflow-hidden', onClick && 'cursor-pointer', className)}
      variants={scaleIn(delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      whileHover={onClick ? hoverScale : undefined}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <div className="flex items-center text-xs">
              <span
                className={cn(
                  'mr-1',
                  trend === 'up' && 'text-green-500',
                  trend === 'down' && 'text-red-500',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
              </span>
              <span
                className={cn(
                  trend === 'up' && 'text-green-500',
                  trend === 'down' && 'text-red-500',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {trendValue}
              </span>
              {description && (
                <span className="ml-1 text-muted-foreground">{description}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </MotionCard>
  );
} 