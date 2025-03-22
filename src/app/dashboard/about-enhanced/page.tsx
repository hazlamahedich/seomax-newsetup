'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fadeIn, staggerContainer } from '@/lib/motion';

export default function AboutEnhancedPage() {
  const features = [
    {
      title: "Interactive Dashboard",
      description: "Customize your dashboard with drag-and-drop cards to focus on what matters most to you.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      )
    },
    {
      title: "Animated UI Elements",
      description: "Enjoy smooth, kinetic animations that make data visualization more engaging and intuitive.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6.5 6.5 11 11" />
          <path d="m21 12-9-9-9 9" />
        </svg>
      )
    },
    {
      title: "Natural Language Queries",
      description: "Ask SEO questions in plain English and get AI-powered insights and recommendations.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M12 7v.01" />
          <path d="M12 11v3" />
        </svg>
      )
    },
    {
      title: "Guided Onboarding",
      description: "Interactive tours explain dashboard features as you navigate, helping you get up to speed quickly.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z" />
          <path d="M12 13v8" />
          <path d="M12 3v3" />
        </svg>
      )
    },
    {
      title: "Dynamic Data Visualization",
      description: "Animated charts and metrics that bring your SEO data to life with clear visual representations.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      )
    },
    {
      title: "Contextual Help",
      description: "Access helpful tips and explanations about SEO concepts right when you need them.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b sticky top-0 z-10 backdrop-blur-md bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="font-bold text-2xl">
            SEOMax
          </Link>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-10">
        <motion.div 
          className="max-w-3xl mx-auto text-center mb-10"
          variants={fadeIn('up', 0)}
          initial="hidden"
          animate="show"
        >
          <h1 className="text-4xl font-bold mb-4">Welcome to the Enhanced Dashboard</h1>
          <p className="text-xl text-muted-foreground">
            We've added powerful new features to make your SEO workflow more intuitive and efficient.
          </p>
        </motion.div>

        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12"
          variants={staggerContainer(0.1, 0.1)}
          initial="hidden"
          animate="show"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={feature.title}
              variants={fadeIn('up', index * 0.1)}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="text-primary mb-3">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="text-center"
          variants={fadeIn('up', 0.6)}
          initial="hidden"
          animate="show"
        >
          <Button size="lg" asChild>
            <Link href="/dashboard/enhanced">Try Enhanced Dashboard</Link>
          </Button>
        </motion.div>
      </main>
    </div>
  );
} 