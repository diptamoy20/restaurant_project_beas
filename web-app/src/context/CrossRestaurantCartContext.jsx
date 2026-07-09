import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { useDispatch } from 'react-redux';
import { CrossRestaurantCartModal } from '../components/CrossRestaurantCartModal.jsx';
import { useSelectedRestaurant } from './SelectedRestaurantContext.jsx';
import {
  addToCartAsync,
  clearCartAsync,
  clearError,
} from '../store/slices/cartSlice';
import { enrichItemWithRestaurant } from '../utils/cartRestaurant';

const initialModalState = {
  open: false,
  currentRestaurantName: '',
  newRestaurantName: '',
  newRestaurantId: null,
  newRestaurantSlug: null,
  pendingAdd: null,
  confirming: false,
};

const CrossRestaurantCartContext = createContext(null);

export function CrossRestaurantCartProvider({ children }) {
  const dispatch = useDispatch();
  const { setSelectedRestaurant } = useSelectedRestaurant();
  const [modalState, setModalState] = useState(initialModalState);
  const resolverRef = useRef(null);

  const closeModal = useCallback((result = false) => {
    setModalState(initialModalState);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  const promptCrossRestaurant = useCallback((details) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        open: true,
        currentRestaurantName: details.currentRestaurantName,
        newRestaurantName: details.newRestaurantName,
        newRestaurantId: details.newRestaurantId,
        newRestaurantSlug: details.newRestaurantSlug ?? null,
        pendingAdd: details.pendingAdd,
        confirming: false,
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (modalState.confirming) {
      return;
    }

    closeModal(false);
  }, [closeModal, modalState.confirming]);

  const handleConfirm = useCallback(async () => {
    const {
      pendingAdd,
      newRestaurantId,
      newRestaurantSlug,
      newRestaurantName,
      confirming,
    } = modalState;

    if (confirming || !pendingAdd || !newRestaurantId) {
      return;
    }

    setModalState((current) => ({ ...current, confirming: true }));
    dispatch(clearError());

    try {
      await dispatch(clearCartAsync()).unwrap();

      setSelectedRestaurant({
        id: newRestaurantId,
        slug: newRestaurantSlug,
      });

      const { item, variant, addOns, quantity } = pendingAdd;
      const enrichedItem = enrichItemWithRestaurant(item, {
        id: newRestaurantId,
        name: newRestaurantName,
        slug: newRestaurantSlug,
      });

      await dispatch(
        addToCartAsync({
          item: enrichedItem,
          variant,
          addOns,
          quantity,
        }),
      ).unwrap();

      closeModal(true);
    } catch {
      setModalState((current) => ({ ...current, confirming: false }));
      closeModal(false);
    }
  }, [closeModal, dispatch, modalState, setSelectedRestaurant]);

  return (
    <CrossRestaurantCartContext.Provider value={{ promptCrossRestaurant }}>
      {children}
      <CrossRestaurantCartModal
        open={modalState.open}
        currentRestaurantName={modalState.currentRestaurantName}
        newRestaurantName={modalState.newRestaurantName}
        confirming={modalState.confirming}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </CrossRestaurantCartContext.Provider>
  );
}

export function useCrossRestaurantCart() {
  const context = useContext(CrossRestaurantCartContext);

  if (!context) {
    throw new Error(
      'useCrossRestaurantCart must be used within CrossRestaurantCartProvider',
    );
  }

  return context;
}
