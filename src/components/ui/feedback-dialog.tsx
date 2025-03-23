'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FeedbackForm } from '@/components/ui/feedback-form';
import { usePathname } from 'next/navigation';
import { FeedbackType } from '@/lib/services/feedback-service';

interface FeedbackDialogProps {
  initialFeedbackType?: FeedbackType;
  triggerClassName?: string;
  fixedPosition?: boolean;
}

export function FeedbackDialog({
  initialFeedbackType = 'general',
  triggerClassName,
  fixedPosition = true
}: FeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const pathname = usePathname();

  const handleSuccess = () => {
    setIsSubmitted(true);
    // Close the dialog after a short delay to show the success animation
    setTimeout(() => {
      setIsOpen(false);
      // Reset the submitted state after the dialog is closed
      setTimeout(() => setIsSubmitted(false), 300);
    }, 1500);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 ${fixedPosition ? 'fixed bottom-6 right-6 z-50 shadow-md' : ''} ${triggerClassName || ''}`}
          >
            <MessageSquareHeart className="h-4 w-4" />
            <span>Feedback</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isSubmitted ? 'Thank You!' : 'Share Your Feedback'}</DialogTitle>
          </DialogHeader>
          
          <AnimatePresence mode="wait">
            {isSubmitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-6 text-center space-y-4"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquareHeart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Feedback Submitted</h3>
                <p className="text-muted-foreground">
                  Thank you for your feedback! We really appreciate your input and will use it to improve our product.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-4"
              >
                <FeedbackForm
                  onSuccess={handleSuccess}
                  onCancel={() => setIsOpen(false)}
                  initialFeedbackType={initialFeedbackType}
                  currentLocation={pathname}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
} 