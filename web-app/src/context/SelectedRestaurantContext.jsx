import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  getRestaurantSlugFromPath,
  persistRestaurantSlug,
} from '../lib/restaurantPaths';
import { getRestaurantIdFromUrl } from '../lib/restaurantSelection';
import { persistRestaurantId, resolveRestaurantId } from '../lib/tableSession';

const SelectedRestaurantContext = createContext(null);

export function SelectedRestaurantProvider({ children }) {
  const location = useLocation();
  const [selectedRestaurantId, setSelectedRestaurantIdState] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = resolveRestaurantId(window.location.search);

    return raw ? Number(raw) : null;
  });
  const [selectedRestaurantSlug, setSelectedRestaurantSlugState] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return getRestaurantSlugFromPath(window.location.pathname) || null;
  });

  const setSelectedRestaurant = useCallback(({ id, slug }) => {
    setSelectedRestaurantIdState(id ?? null);
    setSelectedRestaurantSlugState(slug ?? null);

    if (typeof window === 'undefined') {
      return;
    }

    if (id == null) {
      window.sessionStorage.removeItem('restaurant-web-active-restaurant');
    } else {
      persistRestaurantId(id);
    }

    if (!slug) {
      window.sessionStorage.removeItem('restaurant-web-active-restaurant-slug');
    } else {
      persistRestaurantSlug(slug);
    }
  }, []);

  const setSelectedRestaurantId = useCallback(
    (id) => {
      setSelectedRestaurant({ id, slug: selectedRestaurantSlug });
    },
    [selectedRestaurantSlug, setSelectedRestaurant],
  );

  const setSelectedRestaurantSlug = useCallback(
    (slug) => {
      setSelectedRestaurant({ id: selectedRestaurantId, slug });
    },
    [selectedRestaurantId, setSelectedRestaurant],
  );

  useEffect(() => {
    const slugFromPath = getRestaurantSlugFromPath(location.pathname);

    if (slugFromPath && slugFromPath !== selectedRestaurantSlug) {
      setSelectedRestaurantSlugState(slugFromPath);
      persistRestaurantSlug(slugFromPath);
    }
  }, [location.pathname, selectedRestaurantSlug]);

  useEffect(() => {
    const legacyRestaurantId = getRestaurantIdFromUrl(location.search);

    if (legacyRestaurantId) {
      const parsed = Number(legacyRestaurantId);

      if (!Number.isNaN(parsed) && parsed !== selectedRestaurantId) {
        setSelectedRestaurantIdState(parsed);
        persistRestaurantId(parsed);
      }
    }
  }, [location.search, selectedRestaurantId]);

  const value = useMemo(
    () => ({
      selectedRestaurantId,
      selectedRestaurantSlug,
      setSelectedRestaurant,
      setSelectedRestaurantId,
      setSelectedRestaurantSlug,
    }),
    [
      selectedRestaurantId,
      selectedRestaurantSlug,
      setSelectedRestaurant,
      setSelectedRestaurantId,
      setSelectedRestaurantSlug,
    ],
  );

  return (
    <SelectedRestaurantContext.Provider value={value}>
      {children}
    </SelectedRestaurantContext.Provider>
  );
}

export function useSelectedRestaurant() {
  const ctx = useContext(SelectedRestaurantContext);

  if (!ctx) {
    throw new Error('useSelectedRestaurant must be used within SelectedRestaurantProvider');
  }

  return ctx;
}
