import { Link } from "react-router-dom";

const formatRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
          <p className="copy">
            {location
              ? `${location.lat}, ${location.lng}`
              : "Choose a location to see restaurants that serve your area."}
          </p>
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
            <article key={restaurant.id} className="restaurant-card">
              <div>
                <span
                  className={
                    restaurant.deliveryAvailable
                      ? "pill"
                      : "pill unavailable-pill"
                  }
                >
                  {restaurant.deliveryAvailable ? "Delivering" : "Unavailable"}
                </span>
                <h3>{restaurant.name}</h3>
                <p>{restaurant.address}</p>
              </div>
              <dl className="restaurant-meta">
                <div>
                  <dt>Distance</dt>
                  <dd>
                    {restaurant.distanceKm?.toFixed?.(2) ??
                      restaurant.distanceKm}{" "}
                    km
                  </dd>
                </div>
                <div>
                  <dt>ETA</dt>
                  <dd>{restaurant.estimatedDeliveryTimeMinutes ?? "-"} min</dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>
                    {Number(restaurant.deliveryFee ?? 0) === 0
                      ? "Free"
                      : formatRupees.format(restaurant.deliveryFee)}
                  </dd>
                </div>
              </dl>
              <div className="restaurant-card-footer">
                <span>
                  {restaurant.availableMenuItemsCount ??
                    restaurant.menuItems?.length ??
                    0}{" "}
                  items available
                </span>
                <Link
                  className="cta-button cta-button-primary"
                  to={`/menu?restaurantId=${restaurant.id}`}
                >
                  View Menu
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
