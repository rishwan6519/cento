"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Platform", href: "#platform" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Contact", href: "#cta" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-hero/80 backdrop-blur-xl border-b border-hero-muted/10"
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        
        {/* Logo */}
        <Link
          href="/"
          className="font-display text-xl font-bold text-hero-foreground tracking-tight"
        >
          Store<span className="text-cyan-400">SPARC</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-10 font-sans">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-hero-muted hover:text-hero-foreground transition-all duration-200"
            >
              {item.label}
            </a>
          ))}

          {/* Login */}
          <Link
            href="/login"
            className="text-sm font-medium text-hero-muted hover:text-hero-foreground transition-all duration-200"
          >
            Login
          </Link>

          {/* CTA */}
          <Button
            size="sm"
            className="bg-[#0081ff] hover:bg-[#0072e5] text-white rounded-full px-7 py-2.5 h-auto text-sm font-bold shadow-[0_8px_20px_rgba(0,129,255,0.3)] transition-all hover:scale-105"
          >
            Book Demo
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-hero-foreground"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-hero border-t border-hero-muted/10 overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-hero-muted hover:text-hero-foreground transition-colors"
                >
                  {item.label}
                </a>
              ))}

              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="text-hero-muted hover:text-hero-foreground transition-colors"
              >
                Login
              </Link>

              <Button
                size="sm"
                className="bg-[#0081ff] text-white rounded-full w-fit px-6 py-2 shadow-lg shadow-blue-500/20"
              >
                Book Demo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
