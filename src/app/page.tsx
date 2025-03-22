"use client";

import { AnimatedHero } from '@/components/ui/animated-hero/animated-hero';
import ModernNavbar from '@/components/ui/modern-navbar';
import { FeaturesSection } from '@/components/ui/features-section';
import { TestimonialsSection } from '@/components/ui/testimonials-section';
import { PricingSection } from '@/components/ui/pricing-section';
import { ContactCTASection } from '@/components/ui/contact-cta-section';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <ModernNavbar />

      <main className="flex-1">
        <AnimatedHero 
          title="Optimize Your Website with AI-Powered SEO"
          subtitle="SEOMax helps you improve your search rankings with intelligent analysis and actionable recommendations."
        />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <ContactCTASection />
      </main>

      <footer className="border-t py-10 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4">SEOMax</h3>
              <p className="text-sm text-muted-foreground">
                Optimize your website with AI-powered SEO tools and analytics.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} SEOMax. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
