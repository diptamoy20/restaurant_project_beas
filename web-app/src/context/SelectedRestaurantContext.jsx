import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'foodyply_selected_restaurant_id';

const SelectedRestaurantContext = createContext(null);

export function SelectedRestaurantProvider({ children }) {
  const [selectedRestaurantId, setSelectedRestaurantIdState] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    return raw ? Number(raw) : null;
  });

  const setSelectedRestaurantId = useCallback((id) => {
    setSelectedRestaurantIdState(id);

    if (typeof window !== 'undefined') {
      if (id == null) {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(STORAGE_KEY, String(id));
      }
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('restaurantId');

    if (fromUrl) {
      const n = Number(fromUrl);

      if (!Number.isNaN(n)) {
        setSelectedRestaurantId(n);
      }
    }
  }, [setSelectedRestaurantId]);

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
