"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AnimatedShape from './animated-shape';
import { DashboardPreview } from './dashboard-preview';
import { calculateParallax, isClient } from '@/lib/client-utils';

type AnimatedHeroProps = {
  title: string;
  subtitle: string;
  cta?: React.ReactNode;
};

export function AnimatedHero({ title, subtitle, cta }: AnimatedHeroProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    if (!isClient()) return; // Only run on client
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  // Calculate parallax values for different elements based on mouse position
  const getParallaxValue = (strength: number = 0.02) => {
    return calculateParallax(mousePosition.x, mousePosition.y, strength);
  };
  
  // Animation variants for text elements
  const titleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }
  };
  
  const subtitleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.2,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }
  };
  
  const ctaVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }
  };
  
  const defaultCTA = (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button 
          size="lg" 
          className="rounded-full px-8 font-semibold"
          asChild
        >
          <Link href="/signup">Get Started Free</Link>
        </Button>
      </motion.div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button 
          size="lg" 
          variant="outline" 
          className="rounded-full px-8"
          asChild
        >
          <Link href="/login">Sign In</Link>
        </Button>
      </motion.div>
    </div>
  );

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Animated background shapes */}
      <AnimatedShape
        position={{ top: '10%', left: '5%' }}
        size="300px"
        color="rgba(var(--primary-rgb), 0.15)"
        parallaxValue={getParallaxValue(0.03)}
        duration={25}
      />
      <AnimatedShape
        position={{ top: '20%', right: '10%' }}
        size="200px"
        color="rgba(var(--primary-rgb), 0.1)"
        delay={0.5}
        parallaxValue={getParallaxValue(0.02)}
        duration={20}
      />
      <AnimatedShape
        position={{ bottom: '15%', right: '15%' }}
        size="180px"
        color="rgba(var(--primary-rgb), 0.08)"
        delay={1}
        parallaxValue={getParallaxValue(0.04)}
        duration={30}
      />
      <AnimatedShape
        position={{ bottom: '10%', left: '15%' }}
        size="240px"
        color="rgba(var(--primary-rgb), 0.12)"
        delay={1.5}
        parallaxValue={getParallaxValue(0.05)}
        duration={22}
      />
      
      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.h1
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60"
            initial="hidden"
            animate="visible"
            variants={titleVariants}
          >
            {title}
          </motion.h1>
          <motion.p
            className="text-xl text-muted-foreground mb-10"
            initial="hidden"
            animate="visible"
            variants={subtitleVariants}
          >
            {subtitle}
          </motion.p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={ctaVariants}
          >
            {cta || defaultCTA}
          </motion.div>
        </div>
        
        {/* Dashboard preview */}
        <div className="relative max-w-5xl mx-auto">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
} 