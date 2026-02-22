"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const industries = [
  {
    title: "Retail",
    description:
      "Drive sales with dynamic promotions and engaging product displays",
    image: "/assets/industry-retail.jpg",
  },
  {
    title: "Corporate",
    description:
      "Enhance internal communications and employee engagement",
    image: "/assets/industry-corporate.jpg",
  },
  {
    title: "Hospitality",
    description:
      "Deliver exceptional guest experiences with dynamic content",
    image: "/assets/industry-hospitality.jpg",
  },
  {
    title: "Education",
    description:
      "Improve campus communications and student engagement",
    image: "/assets/industry-education.jpg",
  },
];

const IndustrySection = () => {
  return (
    <section className="py-24 bg-background relative">
      <div className="container mx-auto px-6">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Solutions for Every <span className="text-gradient">Industry</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Trusted by leading organizations across multiple sectors
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {industries.map((industry, i) => (
            <motion.div
              key={industry.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              whileHover={{ scale: 1.02 }}
              className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[16/10]"
            >
              {/* Correct Image */}
              <Image
                src={industry.image}
                alt={`${industry.title} digital signage solutions`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-hero/90 via-hero/40 to-transparent" />

              {/* Text */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-display text-xl md:text-2xl font-bold text-hero-foreground mb-1">
                  {industry.title}
                </h3>
                <p className="text-hero-muted text-sm md:text-base">
                  {industry.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustrySection;
