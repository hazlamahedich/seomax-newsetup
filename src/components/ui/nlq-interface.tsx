import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fadeIn, scaleIn } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface NLQInterfaceProps {
  onSubmit: (query: string) => Promise<string>;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function NLQInterface({
  onSubmit,
  suggestions = [
    "What are the best keywords for my site?",
    "How can I improve my page load speed?",
    "What backlinks should I target next?",
    "How can I optimize my content for featured snippets?",
    "What technical SEO issues should I fix first?",
  ],
  placeholder = "Ask any SEO question...",
  className,
}: NLQInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);
    
    try {
      const result = await onSubmit(query);
      setResponse(result);
    } catch (error) {
      setResponse("Sorry, I couldn't process that question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={cn("w-full space-y-4", className)}>
      <motion.div 
        className="w-full"
        variants={fadeIn('up', 0)}
        initial="hidden"
        animate="show"
      >
        <form onSubmit={handleSubmit} className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="w-full pl-4 pr-12 py-3 h-12 text-base rounded-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-1.5 top-1.5 rounded-full w-9 h-9"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            )}
          </Button>
          
          <AnimatePresence>
            {isOpen && suggestions.length > 0 && (
              <motion.div
                className="absolute top-14 left-0 w-full z-50 bg-background rounded-lg border shadow-md overflow-hidden"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-2">
                  <p className="text-sm text-muted-foreground px-2 py-1">Suggestions</p>
                  <ul className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <motion.li
                        key={index}
                        className="px-2 py-2 rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => handleSuggestionClick(suggestion)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ backgroundColor: 'var(--muted)' }}
                      >
                        {suggestion}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
      
      <AnimatePresence>
        {response && (
          <motion.div
            variants={scaleIn(0.2)}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-full p-2 text-primary">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-medium">Answer</h4>
                    <p className="text-muted-foreground">{response}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 