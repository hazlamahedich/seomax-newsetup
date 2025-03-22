import { Variants } from 'framer-motion';

// Fade in animation
export const fadeIn = (
  direction: 'up' | 'down' | 'left' | 'right' = 'up', 
  delay: number = 0.2
): Variants => {
  return {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 20 : direction === 'down' ? -20 : 0,
      x: direction === 'left' ? 20 : direction === 'right' ? -20 : 0,
    },
    show: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        type: 'tween',
        duration: 0.5,
        delay,
        ease: [0.25, 0.25, 0.25, 0.75],
      },
    },
  };
};

// Scale animation
export const scaleIn = (delay: number = 0.2): Variants => {
  return {
    hidden: {
      opacity: 0,
      scale: 0.8,
    },
    show: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        duration: 0.5,
        delay,
      },
    },
  };
};

// Staggered container for children animations
export const staggerContainer = (
  staggerChildren: number = 0.1,
  delayChildren: number = 0
): Variants => {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };
};

// Grow from left animation (for progress bars or charts)
export const growFromLeft = (delay: number = 0): Variants => {
  return {
    hidden: { width: 0, opacity: 0 },
    show: {
      width: '100%',
      opacity: 1,
      transition: {
        type: 'spring',
        duration: 0.8,
        delay,
      },
    },
  };
};

// Slide in from sides for cards
export const slideIn = (
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  type: 'tween' | 'spring' = 'tween',
  delay: number = 0,
  duration: number = 0.5
): Variants => {
  return {
    hidden: {
      x: direction === 'left' ? '-100%' : direction === 'right' ? '100%' : 0,
      y: direction === 'up' ? '100%' : direction === 'down' ? '-100%' : 0,
    },
    show: {
      x: 0,
      y: 0,
      transition: {
        type,
        delay,
        duration,
        ease: 'easeOut',
      },
    },
  };
};

// Rotate in animation
export const rotateIn = (delay: number = 0): Variants => {
  return {
    hidden: {
      opacity: 0,
      rotate: -120,
    },
    show: {
      opacity: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        duration: 0.8,
        delay,
      },
    },
  };
};

// Bounce animation
export const bounce: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  show: {
    scale: [0.8, 1.2, 1],
    opacity: 1,
    transition: {
      type: 'spring',
      duration: 0.8,
    },
  },
};

// Hover animations for interactive elements
export const hoverScale = {
  scale: 1.05,
  transition: { duration: 0.2 },
};

export const hoverElevate = {
  y: -5,
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
  transition: { duration: 0.2 },
};

// Pulse animation for attention
export const pulse: Variants = {
  hidden: { scale: 1 },
  show: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      repeatType: 'reverse',
    },
  },
};

// Wave animation for illustrations
export const wave: Variants = {
  hidden: { rotate: 0 },
  show: {
    rotate: [0, 15, -15, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
    },
  },
}; 