import { ScanIcon, MenuIcon, PaymentIcon } from './LandingIcons';
import { RevealSection } from './RevealSection';

const steps = [
  {
    title: 'Scan QR',
    description: 'Guests land instantly on your branded ordering page with no app download.',
    Icon: ScanIcon,
  },
  {
    title: 'Browse & Order',
    description: 'They explore dishes, adjust quantity, and add favorites with confidence.',
    Icon: MenuIcon,
  },
  {
    title: 'Pay & Enjoy',
    description: 'Checkout stays quick, clear, and satisfying so tables turn faster.',
    Icon: PaymentIcon,
  },
];

export function HowItWorks() {
  return (
    <RevealSection className="content-section how-it-works" id="how-it-works">
      <div className="section-heading">
        <p className="eyebrow">How It Works</p>
        <h2>A three-step flow diners understand instantly</h2>
      </div>
      <div className="stepper">
        {steps.map(({ title, description, Icon }, index) => (
          <article key={title} className="step-card">
            <div className="step-index">0{index + 1}</div>
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
