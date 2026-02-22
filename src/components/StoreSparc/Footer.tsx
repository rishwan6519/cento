"use client";
const Footer = () => {
  return (
    <footer className="bg-hero border-t border-hero-muted/10 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-display text-lg font-bold text-hero-foreground tracking-tight">
              Store<span className="text-gradient">SPARC</span>
            </span>
            <p className="text-hero-muted text-sm mt-1">Digital Signage & In-Store Marketing Platform</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-hero-muted">
            <a href="#" className="hover:text-hero-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-hero-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-hero-foreground transition-colors">Support</a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-hero-muted/10 text-center text-xs text-hero-muted">
          © 2026 StoreSPARC. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
