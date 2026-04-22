import { LightningIcon, RewardIcon, MobileIcon } from './LandingIcons';
import { RevealSection } from './RevealSection';

const features = [
  {
    title: 'Fast Ordering',
    description: 'Scan, customize, and send orders to the kitchen in seconds with a frictionless flow.',
    Icon: LightningIcon,
  },
  {
    title: 'Loyalty Built In',
    description: 'Turn every order into repeat business with rewards, offers, and personalized perks.',
    Icon: RewardIcon,
  },
  {
    title: 'Mobile-First',
    description: 'A polished phone experience that still feels premium on desktop and tablet screens.',
    Icon: MobileIcon,
  },
];

export function FeaturesGrid() {
  return (
    <RevealSection className="content-section" id="features">
      <div className="section-heading">
        <p className="eyebrow">Why Guests Convert</p>
        <h2>Designed to move diners from curiosity to checkout.</h2>
      </div>
      <div className="feature-grid">
        {features.map(({ title, description, Icon }) => (
          <article key={title} className="glass-card feature-card">
            <div className="icon-badge">
              <Icon />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </RevealSection>
  );
}
