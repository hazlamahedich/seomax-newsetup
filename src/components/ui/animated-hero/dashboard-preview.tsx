"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Random data generator functions
const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const randomDataArray = (length: number, min: number, max: number) => {
  return Array.from({ length }, () => randomInt(min, max));
};

export function DashboardPreview() {
  const [isHovered, setIsHovered] = useState(false);
  const [data, setData] = useState({
    keywordRankings: randomDataArray(7, 20, 90),
    trafficData: randomDataArray(12, 500, 2500),
    issuesFixed: randomInt(18, 36),
    totalIssues: randomInt(40, 60),
    conversionRate: randomInt(2, 5) + randomInt(0, 99) / 100,
    searchVisibility: randomInt(35, 75),
  });
  
  // Periodically update data for animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovered) {
        setData({
          keywordRankings: randomDataArray(7, 20, 90),
          trafficData: randomDataArray(12, 500, 2500),
          issuesFixed: randomInt(18, 36),
          totalIssues: randomInt(40, 60),
          conversionRate: randomInt(2, 5) + randomInt(0, 99) / 100,
          searchVisibility: randomInt(35, 75),
        });
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isHovered]);
  
  const calculateHeight = (value: number, max: number, baseHeight: number = 80) => {
    return (value / max) * baseHeight;
  };
  
  const getColorClass = (value: number, threshold: number) => {
    return value >= threshold ? 'bg-green-500' : 'bg-amber-500';
  };
  
  const mockupVariants = {
    hidden: { 
      opacity: 0,
      y: 40,
    },
    visible: { 
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.8,
        ease: "easeOut",
      }
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.3 }
    }
  };
  
  const chartVariants = {
    hidden: { opacity: 0, scaleY: 0 },
    visible: (i: number) => ({
      opacity: 1,
      scaleY: 1,
      transition: { 
        delay: 0.3 + (i * 0.05),
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };
  
  return (
    <motion.div 
      className="relative w-full bg-gradient-to-br from-background to-muted p-1.5 rounded-xl border shadow-xl overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 blur-2xl"></div>
      <div className="relative bg-background/80 backdrop-blur-sm rounded-lg overflow-hidden">
        {/* Dashboard Header */}
        <div className="bg-muted/30 p-3 border-b flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex space-x-1.5 mr-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="h-4 w-32 bg-primary/10 rounded"></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-4 w-4 bg-primary/20 rounded-full"></div>
            <div className="h-4 w-4 bg-primary/20 rounded-full"></div>
            <div className="h-4 w-8 bg-primary/20 rounded-full"></div>
          </div>
        </div>
        
        {/* Dashboard Content */}
        <div className="p-6 grid grid-cols-12 gap-6">
          {/* Stats row */}
          <div className="col-span-12 grid grid-cols-3 gap-4">
            {[
              { label: "Keywords Tracked", value: "245", change: "+12%" },
              { label: "Average Position", value: "4.7", change: "+0.3" },
              { label: "Organic Traffic", value: "18.5K", change: "+22%" }
            ].map((stat, i) => (
              <div key={i} className="bg-card border rounded-lg p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-bl-full"></div>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <div className="flex items-baseline">
                  <p className="text-xl font-bold">{stat.value}</p>
                  <span className="ml-2 text-xs font-medium text-green-500">{stat.change}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Chart + keywords list */}
          <div className="col-span-8 bg-card border rounded-lg overflow-hidden">
            {/* Chart header */}
            <div className="p-4 border-b">
              <div className="h-5 w-40 bg-primary/10 rounded mb-2"></div>
              <div className="flex space-x-3">
                <div className="h-4 w-12 bg-primary/20 rounded-full"></div>
                <div className="h-4 w-12 bg-muted rounded-full"></div>
                <div className="h-4 w-12 bg-muted rounded-full"></div>
              </div>
            </div>
            
            {/* Chart area */}
            <div className="p-4 h-[200px] flex items-end space-x-2">
              {[35, 45, 40, 50, 42, 65, 55, 70, 60, 75, 65, 80].map((height, i) => (
                <div key={i} className="flex-1 flex items-end">
                  <div 
                    className="w-full bg-primary/30 rounded-t transition-all duration-500"
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Side panel */}
          <div className="col-span-4 space-y-4">
            {/* Mini card 1 */}
            <div className="bg-card border rounded-lg p-4">
              <div className="flex justify-between mb-3">
                <div className="h-4 w-24 bg-primary/20 rounded"></div>
                <div className="h-4 w-4 bg-muted rounded-full"></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-3 w-24 bg-muted rounded"></div>
                  <div className="h-3 w-8 bg-green-500/20 rounded"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-3 w-32 bg-muted rounded"></div>
                  <div className="h-3 w-8 bg-green-500/20 rounded"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-3 w-20 bg-muted rounded"></div>
                  <div className="h-3 w-8 bg-yellow-500/20 rounded"></div>
                </div>
              </div>
            </div>
            
            {/* Mini card 2 */}
            <div className="bg-primary/5 border-primary/10 border rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="h-5 w-5 bg-primary/20 rounded-full mr-2"></div>
                <div className="h-4 w-32 bg-primary/20 rounded"></div>
              </div>
              <div className="h-3 w-full bg-muted rounded mb-2"></div>
              <div className="h-3 w-4/5 bg-muted rounded mb-2"></div>
              <div className="h-3 w-2/3 bg-muted rounded"></div>
            </div>
          </div>
          
          {/* Keywords table */}
          <div className="col-span-12 bg-card border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <div className="h-5 w-40 bg-primary/10 rounded"></div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-12 gap-4 border-b pb-2 text-xs text-muted-foreground">
                <div className="col-span-6">Keyword</div>
                <div className="col-span-2">Position</div>
                <div className="col-span-2">Volume</div>
                <div className="col-span-2">Change</div>
              </div>
              {[
                { keyword: "SEO optimization tools", position: 3, volume: "5.2K", change: "+2" },
                { keyword: "Best SEO software", position: 5, volume: "8.7K", change: "+1" },
                { keyword: "SEO rank tracking", position: 2, volume: "4.1K", change: "0" }
              ].map((keyword, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 py-3 border-b">
                  <div className="col-span-6">
                    <div className="h-4 w-40 bg-muted rounded"></div>
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 w-6 bg-muted rounded"></div>
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 w-10 bg-muted rounded"></div>
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 w-8 bg-green-500/20 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -top-6 right-6 w-24 h-24 bg-primary/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
    </motion.div>
  );
} 