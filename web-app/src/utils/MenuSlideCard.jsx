import { useState } from "react";

const formatRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function MenuSlideCard({ item, onAdd, subtitle }) {
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);

  // const price =
  //   item.discountPrice != null && item.discountPrice > 0
  //     ? item.discountPrice
  //     : item.price;

  const badge = item.foodType === "NON_VEG" ? "Non-veg" : "Veg";

  return (
    <article className="menu-slide-card">
      <div className="menu-slide-media">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="menu-slide-placeholder" aria-hidden />
        )}
        <span
          className={`menu-slide-badge menu-slide-badge--${item.foodType === "NON_VEG" ? "nv" : "veg"}`}
        >
          {badge}
        </span>
      </div>

      <div className="menu-slide-body">
        <p className="menu-slide-eyebrow">{subtitle ?? item.category?.name}</p>
        <h4>{item.name}</h4>
        <p
          className="menu-slide-description"
          onClick={() =>
            (item.description || item.ingredients) && setShowDetailsPopup(true)
          }
          role={item.description || item.ingredients ? "button" : undefined}
          tabIndex={item.description || item.ingredients ? 0 : undefined}
          onKeyDown={(e) => {
            if (
              (item.description || item.ingredients) &&
              (e.key === "Enter" || e.key === " ")
            ) {
              setShowDetailsPopup(true);
            }
          }}
        >
          {item.description && item.ingredients ? (
            <>
              {item.description} | {item.ingredients}
              <button
                type="button"
                className="menu-slide-more-link"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetailsPopup(true);
                }}
              >
                more
              </button>
            </>
          ) : item.description ? (
            <>
              {item.description}
              <button
                type="button"
                className="menu-slide-more-link"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetailsPopup(true);
                }}
              >
                more
              </button>
            </>
          ) : item.ingredients ? (
            <>
              {item.ingredients}
              <button
                type="button"
                className="menu-slide-more-link"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetailsPopup(true);
                }}
              >
                more
              </button>
            </>
          ) : null}
        </p>

        <div className="menu-slide-meta">
          {item.discountPrice != null && item.discountPrice < item.price ? (
            <>
              <span className="menu-slide-discounted-price">
                {formatRupees.format(item.discountPrice)}
              </span>
              <span className="menu-slide-price menu-slide-price--strikethrough">
                {formatRupees.format(item.price)}
              </span>
            </>
          ) : (
            <span className="menu-slide-price">
              {formatRupees.format(item.price)}
            </span>
          )}
          {item.rating != null ? (
            <span className="menu-slide-rating">
              ★ {item.rating.toFixed(1)}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          className="primary-btn menu-slide-cta"
          onClick={onAdd}
        >
          Add to cart
        </button>
      </div>

      {showDetailsPopup && (
        <div
          className="menu-slide-popup-overlay"
          onClick={() => setShowDetailsPopup(false)}
        >
          <div
            className="menu-slide-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="menu-slide-popup-close"
              onClick={() => setShowDetailsPopup(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <h3>{item.name}</h3>
            {item.description && (
              <div className="menu-slide-popup-section">
                <h4>Description</h4>
                <p>{item.description}</p>
              </div>
            )}
            {item.ingredients && (
              <div className="menu-slide-popup-section">
                <h4>Ingredients</h4>
                <p>{item.ingredients}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
