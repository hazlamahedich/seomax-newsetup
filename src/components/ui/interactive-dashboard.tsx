import React, { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { staggerContainer, fadeIn } from '@/lib/motion';

interface DashboardItem {
  id: string;
  title: string;
  size: 'small' | 'medium' | 'large';
  content: ReactNode;
  position?: { x: number; y: number };
}

interface InteractiveDashboardProps {
  items: DashboardItem[];
  onReorder?: (items: DashboardItem[]) => void;
  className?: string;
  editable?: boolean;
}

export function InteractiveDashboard({
  items,
  onReorder,
  className,
  editable = false,
}: InteractiveDashboardProps) {
  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>(items);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    if (!editable) return;
    setActiveId(id);
  };

  const handleDragEnd = (id: string, info: any) => {
    if (!editable) return;
    
    setActiveId(null);

    const updatedItems = dashboardItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          position: {
            x: (item.position?.x || 0) + info.offset.x,
            y: (item.position?.y || 0) + info.offset.y,
          },
        };
      }
      return item;
    });
    
    setDashboardItems(updatedItems);
    if (onReorder) {
      onReorder(updatedItems);
    }
  };

  const getSizeClass = (size: DashboardItem['size']): string => {
    switch (size) {
      case 'small':
        return 'col-span-1 row-span-1';
      case 'medium':
        return 'col-span-1 row-span-2 md:col-span-2 md:row-span-1';
      case 'large':
        return 'col-span-1 md:col-span-2 lg:col-span-2 row-span-2';
      default:
        return 'col-span-1 row-span-1';
    }
  };

  return (
    <motion.div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative',
        className
      )}
      variants={staggerContainer(0.1, 0.1)}
      initial="hidden"
      animate="show"
    >
      {dashboardItems.map((item, index) => (
        <motion.div
          key={item.id}
          className={cn(
            'bg-background border rounded-lg shadow-sm overflow-hidden',
            getSizeClass(item.size),
            activeId === item.id ? 'z-10 shadow-lg' : 'z-0',
            editable && 'cursor-move'
          )}
          variants={fadeIn('up', index * 0.1)}
          drag={editable}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.1}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
          dragMomentum={false}
          onDragStart={() => handleDragStart(item.id)}
          onDragEnd={(e, info) => handleDragEnd(item.id, info)}
          style={{
            x: item.position?.x || 0,
            y: item.position?.y || 0,
          }}
          whileHover={editable ? { scale: 1.02 } : undefined}
        >
          <div className="p-4 h-full flex flex-col">
            <div className="font-medium text-sm text-muted-foreground mb-2 flex items-center justify-between">
              <h3>{item.title}</h3>
              {editable && (
                <div className="bg-muted w-5 h-5 rounded-full flex items-center justify-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M5 9h14M5 15h14"></path>
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">{item.content}</div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export function DashboardPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('h-full flex flex-col', className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
      <div className="flex-1">{children}</div>
    </div>
  );
} 