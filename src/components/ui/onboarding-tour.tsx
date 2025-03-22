import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/motion';

interface TourStep {
  target: string;
  content: React.ReactNode;
  title?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  spotlightRadius?: number;
}

interface OnboardingTourProps {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  spotlightColor?: string;
}

export function OnboardingTour({
  steps,
  onComplete,
  onSkip,
  isOpen,
  setIsOpen,
  spotlightColor = 'rgba(59, 130, 246, 0.3)',
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elementPosition, setElementPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const updatePosition = () => {
      const currentTarget = steps[currentStep]?.target;
      if (!currentTarget) return;
      
      const element = document.querySelector(currentTarget);
      if (!element) return;
      
      const rect = element.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      
      setElementPosition({
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
      });
      
      // Scroll element into view
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsOpen(false);
    if (onComplete) {
      onComplete();
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    if (onSkip) {
      onSkip();
    }
  };

  if (!isOpen || !elementPosition) return null;

  const getTooltipPosition = () => {
    if (!elementPosition) return {};
    
    const placement = steps[currentStep]?.placement || 'bottom';
    const padding = 12;
    
    switch (placement) {
      case 'top':
        return {
          top: elementPosition.top - padding,
          left: elementPosition.left + elementPosition.width / 2,
          transform: 'translate(-50%, -100%)',
        };
      case 'right':
        return {
          top: elementPosition.top + elementPosition.height / 2,
          left: elementPosition.left + elementPosition.width + padding,
          transform: 'translateY(-50%)',
        };
      case 'left':
        return {
          top: elementPosition.top + elementPosition.height / 2,
          left: elementPosition.left - padding,
          transform: 'translate(-100%, -50%)',
        };
      case 'bottom':
      default:
        return {
          top: elementPosition.top + elementPosition.height + padding,
          left: elementPosition.left + elementPosition.width / 2,
          transform: 'translateX(-50%)',
        };
    }
  };

  const getSpotlightStyle = () => {
    if (!elementPosition) return {};
    
    const radius = steps[currentStep]?.spotlightRadius || 8;
    
    return {
      top: elementPosition.top,
      left: elementPosition.left,
      width: elementPosition.width,
      height: elementPosition.height,
      borderRadius: `${radius}px`,
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop with cut-out spotlight */}
      <div className="absolute inset-0 bg-black/50">
        <motion.div
          className="absolute"
          style={{
            ...getSpotlightStyle(),
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.75)`,
            backgroundColor: spotlightColor,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      {/* Tour tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          className="absolute z-50"
          style={getTooltipPosition()}
          variants={fadeIn('up', 0)}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="w-80 shadow-lg">
            <CardContent className="p-4">
              {steps[currentStep].title && (
                <h3 className="text-lg font-medium mb-2">{steps[currentStep].title}</h3>
              )}
              <div className="text-sm text-muted-foreground mb-4">
                {steps[currentStep].content}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {Array.from({ length: steps.length }).map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        'block h-1.5 w-1.5 rounded-full',
                        index === currentStep ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button size="sm" variant="outline" onClick={handlePrevious}>
                      Back
                    </Button>
                  )}
                  {currentStep < steps.length - 1 ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={handleSkip}>
                        Skip
                      </Button>
                      <Button size="sm" onClick={handleNext}>
                        Next
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={handleComplete}>
                      Finish
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
} 