"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type PricingTier = {
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
  };
  features: string[];
  popular?: boolean;
  cta: string;
};

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    description: "Perfect for small websites and businesses just getting started with SEO.",
    price: {
      monthly: 49,
      annual: 39,
    },
    features: [
      "Keyword tracking (up to 100 keywords)",
      "Basic technical SEO audit",
      "Site health monitoring",
      "Weekly rank updates",
      "1 user account"
    ],
    cta: "Start Free Trial"
  },
  {
    name: "Professional",
    description: "Designed for growing businesses with established websites and content.",
    price: {
      monthly: 99,
      annual: 79,
    },
    features: [
      "Keyword tracking (up to 500 keywords)",
      "Advanced technical SEO audit",
      "Content optimization suggestions",
      "Daily rank updates",
      "Competitor analysis (3 competitors)",
      "Backlink monitoring",
      "3 user accounts"
    ],
    popular: true,
    cta: "Start Free Trial"
  },
  {
    name: "Enterprise",
    description: "For large websites and businesses with sophisticated SEO needs.",
    price: {
      monthly: 199,
      annual: 159,
    },
    features: [
      "Unlimited keyword tracking",
      "Comprehensive technical SEO audit",
      "AI-powered content optimization",
      "Real-time rank tracking",
      "Unlimited competitor analysis",
      "Advanced backlink analytics",
      "API access",
      "Dedicated support manager",
      "Unlimited user accounts"
    ],
    cta: "Contact Sales"
  }
];

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  
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
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1]
      }
    },
    hover: {
      y: -10,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-rgb),0.15),transparent_70%)]"></div>
      
      <div className="container">
        <motion.div 
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <motion.h2 
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            variants={itemVariants}
          >
            Simple, <span className="text-primary">Transparent Pricing</span>
          </motion.h2>
          <motion.p 
            className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8"
            variants={itemVariants}
          >
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </motion.p>
          
          {/* Billing toggle */}
          <motion.div 
            className="inline-flex items-center bg-card rounded-full p-1 border shadow-sm mb-8"
            variants={itemVariants}
          >
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'annual' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual <span className="text-xs font-normal opacity-80">Save 20%</span>
            </button>
          </motion.div>
        </motion.div>
        
        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              className={`relative rounded-xl border bg-card shadow-sm transition overflow-hidden flex flex-col ${
                tier.popular ? 'md:-mt-4 md:mb-4 md:scale-105 z-10' : ''
              }`}
              initial="hidden"
              whileInView="visible"
              whileHover="hover"
              viewport={{ once: true, margin: "-100px" }}
              variants={cardVariants}
              transition={{ delay: index * 0.1 }}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold uppercase py-1 px-3 rounded-bl-lg">
                  Most Popular
                </div>
              )}
              
              <div className="p-6 border-b">
                <h3 className="text-2xl font-bold">{tier.name}</h3>
                <p className="text-muted-foreground mt-2 min-h-[50px]">{tier.description}</p>
              </div>
              
              <div className="p-6 border-b">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">${billingCycle === 'monthly' ? tier.price.monthly : tier.price.annual}</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-sm text-primary mt-1">
                    ${tier.price.monthly * 12 - tier.price.annual * 12} savings annually
                  </p>
                )}
              </div>
              
              <div className="p-6 space-y-4 flex-grow">
                <h4 className="font-medium">What's included:</h4>
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-6 mt-auto">
                <Button 
                  className={`w-full ${tier.popular ? 'bg-primary hover:bg-primary/90' : ''}`} 
                  variant={tier.popular ? 'default' : 'outline'}
                >
                  {tier.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Money back guarantee */}
        <motion.div
          className="text-center mt-12 text-muted-foreground"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1, transition: { delay: 0.6 } }}
          viewport={{ once: true }}
        >
          <p>30-day money-back guarantee. No questions asked.</p>
        </motion.div>
      </div>
    </section>
  );
} 