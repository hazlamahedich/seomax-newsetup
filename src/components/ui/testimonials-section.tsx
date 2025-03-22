"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

type TestimonialType = {
  id: number;
  name: string;
  role: string;
  company: string;
  testimonial: string;
  avatar: string;
  rating: number;
};

const testimonials: TestimonialType[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Marketing Director",
    company: "TechScale",
    testimonial: "SEOMax transformed our digital strategy. Our organic traffic increased by 187% in just 3 months, and we're now ranking for keywords we never thought possible.",
    avatar: "https://i.pravatar.cc/150?img=1",
    rating: 5
  },
  {
    id: 2,
    name: "David Chen",
    role: "E-commerce Manager",
    company: "StyleBoutique",
    testimonial: "The keyword research and competitor analysis tools have given us insights that completely changed our content strategy. Our conversion rate has doubled since implementation.",
    avatar: "https://i.pravatar.cc/150?img=2",
    rating: 5
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "SEO Specialist",
    company: "GrowthMarket",
    testimonial: "As an SEO professional, I've used many tools, but none match the depth and accuracy of SEOMax. The technical SEO audits have helped us resolve issues we didn't even know existed.",
    avatar: "https://i.pravatar.cc/150?img=3",
    rating: 5
  },
  {
    id: 4,
    name: "Michael Peters",
    role: "Content Strategist",
    company: "ContentLab",
    testimonial: "The content optimization features are incredible. We've seen a 43% increase in time on page and significantly improved engagement metrics across our entire site.",
    avatar: "https://i.pravatar.cc/150?img=4",
    rating: 4
  }
];

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  // Handle automatic cycling of testimonials
  useEffect(() => {
    if (!autoplay) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [autoplay]);

  // Pause autoplay when hovering over testimonials
  const handleMouseEnter = () => setAutoplay(false);
  const handleMouseLeave = () => setAutoplay(true);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };
  
  const headingVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }
  };

  const testimonialVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1]
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { 
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  return (
    <section className="py-24 relative overflow-hidden" id="testimonials">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,rgba(var(--primary-rgb),0.08),transparent_80%)]"></div>
      
      <div className="container">
        <motion.div 
          className="max-w-3xl mx-auto text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <motion.h2 
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            variants={headingVariants}
          >
            Trusted by <span className="text-primary">Leading Businesses</span>
          </motion.h2>
          <motion.p 
            className="text-muted-foreground text-lg"
            variants={headingVariants}
          >
            See what our customers have to say about their experience with SEOMax
          </motion.p>
        </motion.div>

        <div 
          className="relative max-w-4xl mx-auto min-h-[320px]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence mode="wait">
            <motion.div 
              key={testimonials[activeIndex].id}
              className="relative bg-card border rounded-xl p-8 shadow-sm"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={testimonialVariants}
            >
              {/* Quote icon */}
              <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground p-3 rounded-full shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                </svg>
              </div>

              {/* Rating */}
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg 
                    key={i} 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill={i < testimonials[activeIndex].rating ? "currentColor" : "none"} 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className={i < testimonials[activeIndex].rating ? "text-yellow-400" : "text-gray-300"}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                ))}
              </div>

              {/* Testimonial content */}
              <p className="text-lg md:text-xl font-medium italic mb-8">"{testimonials[activeIndex].testimonial}"</p>

              {/* Author info */}
              <div className="flex items-center">
                <div className="relative w-12 h-12 mr-4 rounded-full overflow-hidden border-2 border-primary">
                  <Image 
                    src={testimonials[activeIndex].avatar} 
                    alt={testimonials[activeIndex].name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold">{testimonials[activeIndex].name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonials[activeIndex].role}, {testimonials[activeIndex].company}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation dots */}
          <div className="flex justify-center mt-8 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  activeIndex === index 
                    ? 'bg-primary scale-110' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                onClick={() => setActiveIndex(index)}
                aria-label={`View testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 