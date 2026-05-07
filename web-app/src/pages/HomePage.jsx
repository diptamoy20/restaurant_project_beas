import { HeroSection } from "../components/landing/HeroSection";
import { FeaturesGrid } from "../components/landing/FeaturesGrid";
import { HowItWorks } from "../components/landing/HowItWorks";
import { Testimonials } from "../components/landing/Testimonials";
import { CTABanner } from "../components/landing/CTABanner";
import { Footer } from "../components/landing/Footer";
import { LocationPermissionModal } from "../components/LocationPermissionModal";
import { NearbyRestaurantsSection } from "../components/NearbyRestaurantsSection";
import { useNearbyRestaurants } from "../hooks/useNearbyRestaurants";
import { useUserLocation } from "../hooks/useUserLocation";

export function HomePage() {
  const locationFlow = useUserLocation();
  const nearby = useNearbyRestaurants(locationFlow.location);

  return (
    <div className="landing-page">
      <LocationPermissionModal
        open={locationFlow.permissionModalOpen}
        status={locationFlow.status}
        error={locationFlow.error}
        onAllowLocation={locationFlow.requestGpsLocation}
        onManualLocation={locationFlow.chooseManualLocation}
        onClose={() => locationFlow.setPermissionModalOpen(false)}
      />
      <HeroSection />
      <NearbyRestaurantsSection
        location={locationFlow.location}
        restaurants={nearby.restaurants}
        loading={nearby.loading}
        error={nearby.error}
        onChangeLocation={locationFlow.clearLocation}
        onRetry={nearby.refresh}
      />
      <FeaturesGrid />
      <HowItWorks />
      <Testimonials />
      <CTABanner />
      <Footer />
    </div>
  );
}
