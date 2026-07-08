import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelectedRestaurant } from "../context/SelectedRestaurantContext.jsx";
import { useNearbyRestaurants } from "../hooks/useNearbyRestaurants";
import { useUserLocation } from "../hooks/useUserLocation";
import { distanceKm } from "../lib/restaurantSelection";
import { buildMenuPath, persistRestaurantSlug } from "../lib/restaurantPaths";
import { persistRestaurantId, resolveTableId } from "../lib/tableSession";
import { searchRestaurants } from "../services/locationApi";

export function NavbarRestaurantSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationFlow = useUserLocation();
  const nearby = useNearbyRestaurants(locationFlow.location, { limit: 16 });
  const {
    selectedRestaurantId,
    selectedRestaurantSlug,
    setSelectedRestaurant,
  } = useSelectedRestaurant();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setRemoteResults([]);
      setSearching(false);

      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);

      try {
        const results = await searchRestaurants({
          q: query.trim(),
          lat: locationFlow.location?.lat,
          lng: locationFlow.location?.lng,
          signal: controller.signal,
        });

        setRemoteResults(
          Array.isArray(results) ? results : (results?.items ?? []),
        );
      } catch {
        setRemoteResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query, locationFlow.location]);

  const nearbySorted = useMemo(() => {
    const list = [...(nearby.restaurants ?? [])];

    if (
      locationFlow.location?.lat != null &&
      locationFlow.location?.lng != null
    ) {
      list.sort(
        (a, b) =>
          distanceKm(locationFlow.location, a) -
          distanceKm(locationFlow.location, b),
      );
    }

    return list;
  }, [nearby.restaurants, locationFlow.location]);

  const displayList = useMemo(() => {
    const q = query.trim();

    if (q.length >= 2) {
      return remoteResults;
    }

    return nearbySorted;
  }, [query, remoteResults, nearbySorted]);

  const selectedLabel =
    nearbySorted.find((row) => row.slug === selectedRestaurantSlug)?.name ??
    nearbySorted.find((row) => row.id === selectedRestaurantId)?.name ??
    remoteResults.find((row) => row.slug === selectedRestaurantSlug)?.name ??
    remoteResults.find((row) => row.id === selectedRestaurantId)?.name ??
    (selectedRestaurantSlug
      ? selectedRestaurantSlug.replace(/-/g, " ")
      : selectedRestaurantId
        ? `Restaurant #${selectedRestaurantId}`
        : null);

  return (
    <div className="navbar-restaurant-search" ref={wrapRef}>
      <button
        type="button"
        className="navbar-restaurant-trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="navbar-restaurant-trigger-label">
          {selectedLabel ? selectedLabel : "Choose restaurant"}
        </span>
        <span className="navbar-restaurant-chevron" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className="navbar-restaurant-panel" role="listbox">
          <input
            autoFocus
            className="navbar-restaurant-input"
            placeholder="Search restaurants…"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {nearby.loading ? (
            <p className="navbar-restaurant-hint">Finding nearby spots…</p>
          ) : null}

          {nearby.error ? (
            <p className="navbar-restaurant-error">{nearby.error}</p>
          ) : null}

          {searching ? (
            <p className="navbar-restaurant-hint">Searching…</p>
          ) : null}

          <ul className="navbar-restaurant-list">
            {displayList.map((restaurant) => (
              <li key={restaurant.id}>
                <button
                  type="button"
                  className={
                    restaurant.slug === selectedRestaurantSlug ||
                    restaurant.id === selectedRestaurantId
                      ? "navbar-restaurant-option is-active"
                      : "navbar-restaurant-option"
                  }
                  onClick={() => {
                    setSelectedRestaurant({
                      id: restaurant.id,
                      slug: restaurant.slug,
                    });
                    persistRestaurantId(restaurant.id);
                    persistRestaurantSlug(restaurant.slug);
                    navigate(
                      buildMenuPath(restaurant.slug, {
                        tableId: resolveTableId(location.search),
                      }),
                      { replace: location.pathname.startsWith("/menu") },
                    );

                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span>{restaurant.name}</span>
                  <span className="navbar-restaurant-meta">
                    {restaurant.city ?? restaurant.address}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {!displayList.length && !nearby.loading ? (
            <p className="navbar-restaurant-hint">
              {query.trim().length >= 2
                ? "No matches for that search."
                : "Enable location or type at least two letters to search farther away."}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
