import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export default function LoadingSpinner({ size = 'medium', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
  };
  
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} rounded-full animate-spin border-t-transparent border-primary`} />
      {message && (
        <p className="mt-4 text-muted-foreground text-sm">{message}</p>
      )}
    </div>
  );
} 