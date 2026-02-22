"use client";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section id="cta" className="py-24 bg-hero relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-glow-blue/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-1.5 mb-8"
          >
            <Sparkles size={14} className="text-accent" />
            <span className="text-xs font-medium text-hero-muted">Ready to transform your stores?</span>
          </motion.div>

          <h2 className="font-display text-3xl md:text-5xl font-bold text-hero-foreground mb-6 leading-tight">
            Run in-store marketing campaigns{" "}
            <span className="text-gradient">without any friction</span>
          </h2>
          <p className="text-hero-muted text-lg mb-10 max-w-xl mx-auto">
            Join leading retail brands using StoreSPARC to deliver consistent, automated in-store experiences.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 text-base gap-2 animate-pulse-glow"
            >
              Book a Demo <ArrowRight size={18} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 text-base border-hero-muted/20 text-hero-foreground hover:bg-hero-muted/10 hover:text-hero-foreground"
            >
              Buy Now
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
