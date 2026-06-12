import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
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

  const setSelectedRestaurantId = useCallback((id) => {
    setSelectedRestaurantIdState(id);

    if (typeof window !== 'undefined') {
      if (id == null) {
        window.sessionStorage.removeItem('restaurant-web-active-restaurant');
      } else {
        persistRestaurantId(id);
      }
    }
  }, []);

  useEffect(() => {
    const fromUrl = resolveRestaurantId(location.search);

    if (fromUrl) {
      const parsed = Number(fromUrl);

      if (!Number.isNaN(parsed) && parsed !== selectedRestaurantId) {
        setSelectedRestaurantId(parsed);
      }
    }
  }, [location.search, selectedRestaurantId, setSelectedRestaurantId]);

  const value = useMemo(
    () => ({
      selectedRestaurantId,
      setSelectedRestaurantId,
    }),
    [selectedRestaurantId, setSelectedRestaurantId],
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
