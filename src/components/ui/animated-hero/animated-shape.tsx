"use client";

import { motion } from 'framer-motion';

type AnimatedShapeProps = {
  position: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
  size: string;
  color: string;
  delay?: number;
  duration?: number;
  parallaxValue?: { x: number; y: number };
};

export default function AnimatedShape({
  position,
  size,
  color,
  delay = 0,
  duration = 20,
  parallaxValue = { x: 0, y: 0 }
}: AnimatedShapeProps) {
  return (
    <motion.div
      className="absolute rounded-full opacity-70 blur-3xl"
      style={{
        ...position,
        width: size,
        height: size,
        backgroundColor: color,
        transform: `translate(${parallaxValue.x}px, ${parallaxValue.y}px)`
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 0.7, 
        scale: 1,
        x: [0, 15, -15, 0],
        y: [0, -15, 15, 0]
      }}
      transition={{
        opacity: { duration: 1, delay },
        scale: { duration: 1.5, delay },
        x: { 
          repeat: Infinity, 
          duration, 
          ease: "easeInOut",
          delay 
        },
        y: { 
          repeat: Infinity, 
          duration: duration * 1.3, 
          ease: "easeInOut",
          delay 
        }
      }}
    />
  );
} 