"use client";

import Navbar from "@/components/StoreSparc/Navbar";
import HeroSection from "@/components/StoreSparc/HeroSection";
import ProblemSection from "@/components/StoreSparc/ProblemSection";
import CapabilitiesSection from "@/components/StoreSparc/CapabilitiesSection";
import IndustrySection from "@/components/StoreSparc/IndustrySection";
import HowItWorksSection from "@/components/StoreSparc/HowItWorksSection";
import CTASection from "@/components/StoreSparc/CTASection";
import Footer from "@/components/StoreSparc/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <CapabilitiesSection />
      <IndustrySection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
