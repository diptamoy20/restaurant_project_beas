import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesGrid } from '../components/landing/FeaturesGrid';
import { HowItWorks } from '../components/landing/HowItWorks';
import { FeaturedMenu } from '../components/landing/FeaturedMenu';
import { Testimonials } from '../components/landing/Testimonials';
import { CTABanner } from '../components/landing/CTABanner';
import { Footer } from '../components/landing/Footer';

export function HomePage() {
  return (
    <div className="landing-page">
      <HeroSection />
      <FeaturesGrid />
      <HowItWorks />
      {/* <FeaturedMenu /> */}
      <Testimonials />
      <CTABanner />
      <Footer />
    </div>
  );
}
