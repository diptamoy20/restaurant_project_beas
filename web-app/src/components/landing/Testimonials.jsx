import { useEffect, useState } from 'react';
import { QuoteIcon } from './LandingIcons';
import { RevealSection } from './RevealSection';

const testimonials = [
  {
    quote: 'The QR flow feels premium. Guests order faster, and staff spend less time taking repeat requests.',
    name: 'Aarav Mehta',
    role: 'Restaurant Manager',
  },
  {
    quote: 'I scanned, customized my order, and paid before the waiter even reached our table. Smooth experience.',
    name: 'Sophia Carter',
    role: 'Weekend Customer',
  },
  {
    quote: 'The mobile design is clean, fast, and very easy for first-time diners to understand.',
    name: 'Daniel Ross',
    role: 'Operations Lead',
  },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonials.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <RevealSection className="content-section testimonials-section" id="testimonials">
      <div className="section-heading">
        <p className="eyebrow">Guest Feedback</p>
        <h2>Proof that the experience feels as good as the food looks</h2>
      </div>
      <div className="testimonial-shell">
        <article className="glass-card testimonial-card">
          <div className="icon-badge quote-badge">
            <QuoteIcon />
          </div>
          <p className="testimonial-quote">&ldquo;{testimonials[activeIndex].quote}&rdquo;</p>
          <div className="testimonial-meta">
            <strong>{testimonials[activeIndex].name}</strong>
            <span>{testimonials[activeIndex].role}</span>
          </div>
        </article>
        <div className="testimonial-controls" aria-label="Testimonials carousel controls">
          {testimonials.map((testimonial, index) => (
            <button
              key={testimonial.name}
              type="button"
              className={index === activeIndex ? 'testimonial-dot active' : 'testimonial-dot'}
              aria-label={`Show testimonial ${index + 1}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
