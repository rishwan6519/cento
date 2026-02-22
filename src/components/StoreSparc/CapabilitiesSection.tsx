"use client";
import { motion } from "framer-motion";
import { Monitor, Calendar, Music, TrendingUp } from "lucide-react";

const capabilities = [
  {
    icon: Monitor,
    title: "Centralised Control",
    description: "Manage all in-store audio and visual communication from a single dashboard. Push updates to one store, a region, or your entire network instantly.",
    color: "primary" as const,
  },
  {
    icon: Calendar,
    title: "Campaign Scheduling & Automation",
    description: "Schedule campaigns by date, time, or duration. Automate start and end of promotions without manual intervention at store level.",
    color: "accent" as const,
  },
  {
    icon: Music,
    title: "Audio & Visual Alignment",
    description: "Coordinate music, announcements, and visual promotions together. Avoid mismatched or outdated in-store messaging across all touchpoints.",
    color: "primary" as const,
  },
  {
    icon: TrendingUp,
    title: "Scales With Your Network",
    description: "Add new stores without changing existing workflows. Maintain consistent execution as your network grows from a handful to hundreds.",
    color: "accent" as const,
  },
];

const CapabilitiesSection = () => {
  return (
    <section id="platform" className="py-24 bg-hero relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-glow-blue/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-glow-cyan/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-hero-foreground mb-4">
            Platform <span className="text-gradient">Capabilities</span>
          </h2>
          <p className="text-hero-muted text-lg max-w-2xl mx-auto">
            Built to control in-store execution at scale with zero room for errors.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass-card rounded-2xl p-8 group cursor-default"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                  cap.color === "primary" ? "bg-primary/10" : "bg-accent/10"
                }`}
              >
                <cap.icon
                  size={24}
                  className={cap.color === "primary" ? "text-primary" : "text-accent"}
                />
              </div>
              <h3 className="font-display text-xl font-semibold text-hero-foreground mb-3">
                {cap.title}
              </h3>
              <p className="text-hero-muted leading-relaxed text-sm">
                {cap.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CapabilitiesSection;
