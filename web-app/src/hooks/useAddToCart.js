import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLoginRequired } from '../context/LoginRequiredContext.jsx';
import { addToCartAsync, clearError } from '../store/slices/cartSlice';

export function useAddToCart() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const { promptLoginRequired } = useLoginRequired();

  const addItemToCart = useCallback(
    async (item, variant = null, addOns = [], quantity = 1) => {
      dispatch(clearError());

      if (!isAuthenticated) {
        promptLoginRequired();
        return false;
      }

      try {
        await dispatch(
          addToCartAsync({
            item,
            variant,
            addOns,
            quantity,
          }),
        ).unwrap();
        return true;
      } catch {
        return false;
      }
    },
    [dispatch, isAuthenticated, promptLoginRequired],
  );

  return { addItemToCart, isAuthenticated };
}
