"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image"; // ✅ important
import heroDashboard from "/assets/hero-dashboard.jpg";

const HeroSection = () => {
  return (   // ✅ missing return fixed
    <section className="relative min-h-screen bg-hero overflow-hidden flex items-center pt-16">
      
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-glow-blue/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-glow-cyan/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-1.5 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-glow-cyan animate-pulse" />
            <span className="text-xs font-medium text-hero-muted">
              Digital Signage Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-hero-foreground leading-tight mb-6"
          >
            Run all in-store campaigns{" "}
            <span className="text-blue-400">from one</span>{" "}
            <span className="text-cyan-400">platform</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-lg md:text-xl text-hero-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            StoreSPARC Multimedia Module is built for retail marketing teams that need speed, control, and consistency in how in-store campaigns are executed.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-5 justify-center"
          >
            <Button 
              className="bg-[#0081ff] hover:bg-[#0072e5] text-white rounded-full px-10 py-5 h-auto text-lg font-bold shadow-[0_10px_30px_rgba(0,129,255,0.3)] flex items-center justify-center gap-2 transition-all hover:scale-105"
            >
              Book a Demo 
              <span className="text-xl font-light">→</span>
            </Button>

            <Button 
              className="bg-white hover:bg-slate-50 text-slate-400 rounded-full px-10 py-5 h-auto text-lg font-bold shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-105"
            >
              <Play size={22} fill="currentColor" stroke="none" className="opacity-10" />
              Watch Video
            </Button>
          </motion.div>
        </div>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 max-w-5xl mx-auto relative"
        >
          <div className="rounded-xl overflow-hidden glow-blue gradient-border">
            <Image
              src="/assets/hero-dashboard.jpg"
              width={1920}
              height={1080}
              alt="StoreSPARC Dashboard"
              priority
              className="w-full h-auto"
            />
          </div>

          <div className="absolute -bottom-20 left-0 right-0 h-20 bg-gradient-to-b from-hero/0 to-hero" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
