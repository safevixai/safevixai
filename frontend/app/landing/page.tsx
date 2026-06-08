'use client';

import { useSmoothScroll } from './hooks/useSmoothScroll';

import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import CrisisSection from './components/CrisisSection';
import HowItWorks from './components/HowItWorks';
import CoreModules from './components/CoreModules';
import CommandCenter from './components/CommandCenter';
import AIInfrastructure from './components/AIInfrastructure';
import NationalNetwork from './components/NationalNetwork';
import TechStack from './components/TechStack';
import MissionSection from './components/MissionSection';
import CTASection from './components/CTASection';
import LandingFooter from './components/LandingFooter';

export default function LandingPage() {
  useSmoothScroll();

  return (
    <main className="bg-bg text-text-1 min-h-dvh overflow-x-hidden">
      <LandingNavbar />
      <HeroSection />
      <CrisisSection />
      <HowItWorks />
      <CoreModules />
      <CommandCenter />
      <AIInfrastructure />
      <NationalNetwork />
      <TechStack />
      <MissionSection />
      <CTASection />
      <LandingFooter />
    </main>
  );
}
