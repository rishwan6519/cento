"use client"
import { motion } from "framer-motion";
import { Shield, Lock, Plug, BarChart3 } from "lucide-react";

const items = [
  {
    icon: Shield,
    title: "Control & Security",
    description: "Enterprise-grade governance with role-based access controls and audit trails for every campaign action.",
  },
  {
    icon: Lock,
    title: "Data Governance",
    description: "Your data stays yours. End-to-end encryption and compliance-ready infrastructure for peace of mind.",
  },
  {
    icon: Plug,
    title: "Integrations & Extensibility",
    description: "Connect with your existing tools. Extend capabilities through analytics, interactive add-ons, and APIs.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Track campaign performance across your network with real-time dashboards and reporting.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-background relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Enterprise-ready <span className="text-gradient">by design</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Security, governance, and extensibility built into every layer.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="text-center p-6 rounded-2xl border border-border hover:border-primary/20 transition-colors duration-300 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center mx-auto mb-5 transition-colors">
                <item.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
