"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

type FeatureCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
  href?: string;
  ctaText?: string;
  imageSrc?: string;
};

export function InteractiveFeatureCard({ 
  title, 
  description, 
  icon, 
  index, 
  href = '/signup', 
  ctaText = 'Learn more',
  imageSrc,
}: FeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const cardVariants = {
    hidden: { 
      opacity: 0,
      y: 20,
    },
    visible: (i: number) => ({ 
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.1 * i,
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }),
    hover: {
      scale: 1.05,
      boxShadow: "0 22px 40px rgba(0, 0, 0, 0.1)",
      transition: { 
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }
  };
  
  const iconContainerVariants = {
    hidden: { 
      scale: 0.8, 
      opacity: 0 
    },
    visible: (i: number) => ({ 
      scale: 1, 
      opacity: 1,
      transition: {
        delay: 0.2 * i,
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }),
    hover: {
      scale: 1.1,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }
  };
  
  const descriptionVariants = {
    hidden: { 
      opacity: 0,
      y: 10,
    },
    visible: (i: number) => ({ 
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.3 * i,
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      }
    })
  };
  
  const ctaVariants = {
    hidden: { 
      opacity: 0,
      y: 10
    },
    visible: {
      opacity: 0,
      y: 20,
      transition: {
        duration: 0.3
      }
    },
    hover: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };
  
  return (
    <motion.div
      className="relative bg-background rounded-xl border overflow-hidden group"
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      whileHover="hover"
      viewport={{ once: true, margin: "-100px" }}
      custom={index}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Feature card content */}
      <div className="p-6 relative space-y-4">
        <motion.div
          className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary relative overflow-hidden mb-4"
          variants={iconContainerVariants}
          custom={index}
        >
          {/* Animated background on hover */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br from-primary/80 to-primary transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          ></div>
          <div className={`relative z-10 transition-colors duration-300 ${isHovered ? 'text-white' : 'text-primary'}`}>
            {icon}
          </div>
        </motion.div>
        
        <h3 className="text-xl font-semibold relative transition-transform duration-300 group-hover:translate-y-0">
          {title}
        </h3>
        
        <motion.p 
          className="text-muted-foreground relative"
          variants={descriptionVariants}
          custom={index}
        >
          {description}
        </motion.p>
        
        {/* Image preview on hover */}
        {imageSrc && (
          <div 
            className="w-full h-0 overflow-hidden relative transition-all duration-300 group-hover:h-32 mt-2"
            style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }}
          >
            <div className="absolute inset-0 bg-muted/50 rounded-md">
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {/* You can add an image preview here */}
                <div className="text-xs">Preview Image</div>
              </div>
            </div>
          </div>
        )}
        
        {/* CTA link that appears on hover */}
        <motion.div
          className="mt-4 relative"
          variants={ctaVariants}
        >
          <Link href={href} className="text-primary text-sm font-medium inline-flex items-center group-hover:underline">
            {ctaText}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 ml-1 transform transition-transform duration-300 group-hover:translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
} 