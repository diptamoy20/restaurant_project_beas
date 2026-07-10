import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

function HorizontalCarousel({
  children,
  className = "",
  arrowLabel = "",
  selectedKey = null,
}) {
  const trackRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [showPrev, setShowPrev] = useState(false);
  const [showNext, setShowNext] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const updateArrows = () => {
      setShowPrev(el.scrollLeft > 0);
      setShowNext(el.scrollWidth > el.clientWidth + el.scrollLeft + 1);
    };

    updateArrows();
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    el.addEventListener("scroll", updateArrows, { passive: true });

    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateArrows);
    };
  }, [children]);

  useEffect(() => {
    // Auto-scroll selected child into view
    if (selectedKey == null) return;
    const el = trackRef.current;
    if (!el) return;

    const child = el.querySelector(`[data-key="${selectedKey}"]`);
    if (child) {
      child.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedKey]);

  // Pointer / touch drag handlers
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const onPointerDown = (e) => {
      isDragging.current = true;
      el.classList.add("is-dragging");
      startX.current = e.pageX || e.touches?.[0]?.pageX;
      scrollLeft.current = el.scrollLeft;
      // Prevent text selection
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!isDragging.current) return;
      const x = e.pageX || e.touches?.[0]?.pageX;
      const walk = (startX.current - x) * 1; // scroll-fast factor
      el.scrollLeft = scrollLeft.current + walk;
    };

    const stopDrag = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      el.classList.remove("is-dragging");
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrag);

    // Touch events fallback
    el.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", stopDrag);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrag);
      el.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", stopDrag);
    };
  }, []);

  const scrollByPage = (dir = 1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.floor(el.clientWidth * 0.8) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className={`horizontal-carousel ${className}`.trim()}>
      {showPrev && (
        <button
          type="button"
          className="carousel-nav carousel-prev"
          aria-label={`Scroll previous ${arrowLabel}`}
          onClick={() => scrollByPage(-1)}
        >
          ‹
        </button>
      )}

      <div ref={trackRef} className="horizontal-carousel-track" role="list">
        {children}
      </div>

      {showNext && (
        <button
          type="button"
          className="carousel-nav carousel-next"
          aria-label={`Scroll next ${arrowLabel}`}
          onClick={() => scrollByPage(1)}
        >
          ›
        </button>
      )}
    </div>
  );
}

HorizontalCarousel.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  arrowLabel: PropTypes.string,
  selectedKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default HorizontalCarousel;
