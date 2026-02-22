"use client"
import { motion } from "framer-motion";
import { AlertTriangle, Clock, Mail, RefreshCw, CheckCircle2 } from "lucide-react";

const painPoints = [
  { icon: AlertTriangle, text: "Create campaign content" },
  { icon: Clock, text: "Get approvals" },
  { icon: Mail, text: "Email store managers" },
  { icon: RefreshCw, text: "Follow up repeatedly" },
  { icon: AlertTriangle, text: "Fix inconsistencies after launch" },
];

const solutions = [
  { icon: CheckCircle2, text: "Campaigns are launched centrally" },
  { icon: CheckCircle2, text: "Stores receive updates automatically" },
  { icon: CheckCircle2, text: "Audio & visual messaging stay aligned" },
  { icon: CheckCircle2, text: "Execution happens as planned, every time" },
];

const ProblemSection = () => {
  return (
    <section id="features" className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            In-store campaign execution is <span className="text-cyan-400">broken</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Too many manual steps. Too many people involved. StoreSPARC fixes this.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Pain points */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-destructive/5 border border-destructive/10 rounded-2xl p-8"
          >
            <h3 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle size={16} className="text-destructive" />
              </span>
              Without StoreSPARC
            </h3>
            <div className="space-y-4">
              {painPoints.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i + 0.2 }}
                  className="flex items-center gap-3 text-muted-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive/50 shrink-0" />
                  {item.text}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Solutions */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-primary/5 border border-primary/10 rounded-2xl p-8"
          >
            <h3 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-primary" />
              </span>
              With StoreSPARC
            </h3>
            <div className="space-y-4">
              {solutions.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i + 0.3 }}
                  className="flex items-center gap-3 text-foreground"
                >
                  <CheckCircle2 size={18} className="text-primary shrink-0" />
                  {item.text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
