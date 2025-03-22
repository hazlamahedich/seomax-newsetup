import { useState, useEffect } from 'react';

// Define the types for different onboarding flows
export type OnboardingFlow = 
  | 'dashboard' 
  | 'keyword-research' 
  | 'content-optimization' 
  | 'backlinks' 
  | 'technical-seo';

// Track user progress in onboarding
export interface OnboardingProgress {
  completedFlows: OnboardingFlow[];
  skippedFlows: OnboardingFlow[];
  currentFlow?: OnboardingFlow;
  lastSeenAt?: Date;
}

const ONBOARDING_STORAGE_KEY = 'seomax-onboarding-progress';

export function useOnboarding() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [progress, setProgress] = useState<OnboardingProgress>({
    completedFlows: [],
    skippedFlows: [],
  });
  const [currentFlow, setCurrentFlow] = useState<OnboardingFlow | undefined>(undefined);

  // Load onboarding state from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress) as OnboardingProgress;
        setProgress(parsed);
        setCurrentFlow(parsed.currentFlow);
      } catch (error) {
        console.error('Failed to parse onboarding progress:', error);
      }
    }
  }, []);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (progress) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
        ...progress,
        lastSeenAt: new Date(),
        currentFlow
      }));
    }
  }, [progress, currentFlow]);

  // Start a specific onboarding flow
  const startFlow = (flow: OnboardingFlow) => {
    setCurrentFlow(flow);
    setIsOpen(true);
    setProgress(prev => ({
      ...prev,
      currentFlow: flow,
      lastSeenAt: new Date()
    }));
  };

  // Mark a flow as completed
  const completeFlow = (flow: OnboardingFlow = currentFlow as OnboardingFlow) => {
    setIsOpen(false);
    setProgress(prev => {
      const completedFlows = [...prev.completedFlows];
      if (!completedFlows.includes(flow)) {
        completedFlows.push(flow);
      }
      return {
        ...prev,
        completedFlows,
        currentFlow: undefined,
        lastSeenAt: new Date()
      };
    });
    setCurrentFlow(undefined);
  };

  // Skip a flow
  const skipFlow = (flow: OnboardingFlow = currentFlow as OnboardingFlow) => {
    setIsOpen(false);
    setProgress(prev => {
      const skippedFlows = [...prev.skippedFlows];
      if (!skippedFlows.includes(flow)) {
        skippedFlows.push(flow);
      }
      return {
        ...prev,
        skippedFlows,
        currentFlow: undefined,
        lastSeenAt: new Date()
      };
    });
    setCurrentFlow(undefined);
  };

  // Check if a flow is completed
  const isFlowCompleted = (flow: OnboardingFlow) => {
    return progress.completedFlows.includes(flow);
  };

  // Check if a flow is skipped
  const isFlowSkipped = (flow: OnboardingFlow) => {
    return progress.skippedFlows.includes(flow);
  };

  // Reset all onboarding progress
  const resetOnboarding = () => {
    setProgress({
      completedFlows: [],
      skippedFlows: [],
    });
    setCurrentFlow(undefined);
    setIsOpen(false);
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  };

  // Check if all flows are completed or skipped
  const isAllOnboardingCompleted = (flows: OnboardingFlow[]) => {
    return flows.every(flow => 
      progress.completedFlows.includes(flow) || progress.skippedFlows.includes(flow)
    );
  };

  return {
    isOpen,
    setIsOpen,
    progress,
    currentFlow,
    startFlow,
    completeFlow,
    skipFlow,
    isFlowCompleted,
    isFlowSkipped,
    resetOnboarding,
    isAllOnboardingCompleted,
  };
} 