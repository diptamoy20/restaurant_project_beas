import { useState } from "react";

const formatRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function MenuSlideCard({
  item,
  onAdd,
  subtitle,
  onToggleFavorite,
  isFavorite = false,
  isTogglingFavorite = false,
}) {
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);

  const badge = item.foodType === "NON_VEG" ? "Non-veg" : "Veg";

  return (
    <article className="menu-slide-card">
      <div className="menu-slide-media">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="menu-slide-placeholder" aria-hidden />
        )}

        {/* Food type badge — top-left */}
        <span
          className={`menu-slide-badge menu-slide-badge--${item.foodType === "NON_VEG" ? "nv" : "veg"}`}
        >
          {badge}
        </span>

        {/* Heart / favorite button — top-right, only when handler is provided */}
        {onToggleFavorite ? (
          <button
            type="button"
            className={`menu-slide-fav-btn${isFavorite ? " is-favorite" : ""}`}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
            disabled={isTogglingFavorite}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              fill={isFavorite ? "currentColor" : "none"}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </button>
        ) : null}
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
            <span className="menu-slide-rating">★ {item.rating.toFixed(1)}</span>
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
