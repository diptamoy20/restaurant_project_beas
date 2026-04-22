import { useEffect, useRef } from 'react';

export function RevealSection({ as: Component = 'section', className = '', id, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('is-visible');
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.2,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <Component ref={ref} id={id} className={`reveal-section ${className}`.trim()}>
      {children}
    </Component>
  );
}
