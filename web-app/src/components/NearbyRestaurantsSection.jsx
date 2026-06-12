import { Link } from "react-router-dom";

const formatRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function getEstimatedDeliveryLabel(restaurant) {
  return Number(restaurant.deliveryFee ?? 0) === 0
    ? "Est. delivery: Free"
    : `Est. delivery from ${formatRupees.format(restaurant.deliveryFee)}`;
}

export function NearbyRestaurantsSection({
  location,
  restaurants,
  loading,
  error,
  onChangeLocation,
  onRetry,
}) {
  return (
    <section className="content-section nearby-section">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">Delivering near you</p>
          <h2>Restaurants matched to your location</h2>
          {/* <p className="copy">
            {location
              ? `${location.lat}, ${location.lng}`
              : "Choose a location to see restaurants that serve your area."}
          </p> */}
        </div>
        <div className="nearby-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={onChangeLocation}
          >
            Change Location
          </button>
          {location ? (
            <button type="button" className="ghost-button" onClick={onRetry}>
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Finding restaurants near you...</div>
      ) : null}
      {error ? <div className="order-status-banner error">{error}</div> : null}

      {!loading && !error && location && restaurants.length === 0 ? (
        <div className="empty-state">
          No restaurants currently deliver to this location.
        </div>
      ) : null}

      {!loading && restaurants.length > 0 ? (
        <div className="nearby-grid">
          {restaurants.map((restaurant) => (
            <article key={restaurant.id} className="restaurant-card-modern">
              <div className="restaurant-card-image">
                <img
                  src={
                    restaurant.imageUrl ||
                    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"
                  }
                  alt={restaurant.name}
                />

                <div className="restaurant-card-overlay">
                  <span
                    className={
                      restaurant.deliveryAvailable
                        ? "restaurant-status available"
                        : "restaurant-status unavailable"
                    }
                  >
                    {restaurant.deliveryAvailable
                      ? "● Delivering"
                      : "● Unavailable"}
                  </span>
                </div>
              </div>

              <div className="restaurant-card-content">
                <div className="restaurant-card-top">
                  <h3>{restaurant.name}</h3>

                  <div className="restaurant-rating">
                    ★ {restaurant.rating ?? "4.5"}
                  </div>
                </div>

                <p className="restaurant-address">{restaurant.address}</p>

                <div className="restaurant-stats">
                  <span>📍 {restaurant.distanceKm?.toFixed?.(1)} km</span>

                  <span>
                    🕒 {restaurant.estimatedDeliveryTimeMinutes ?? "-"} min
                  </span>

                  <span>
                    {getEstimatedDeliveryLabel(restaurant)}
                  </span>
                </div>

                <p className="restaurant-card-note">
                  Final delivery fee, GST, packaging, coupons, and minimum order are confirmed at
                  checkout for selected address and cart value.
                </p>

                <div className="restaurant-card-footer">
                  <span className="available-items">
                    {restaurant.availableMenuItemsCount ??
                      restaurant.menuItems?.length ??
                      0}{" "}
                    dishes available
                  </span>

                  <Link
                    className="view-menu-btn"
                    to={`/menu?restaurantId=${restaurant.id}`}
                  >
                    View Menu →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
