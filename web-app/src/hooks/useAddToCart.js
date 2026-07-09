import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCrossRestaurantCart } from '../context/CrossRestaurantCartContext.jsx';
import { useLoginRequired } from '../context/LoginRequiredContext.jsx';
import { useSelectedRestaurant } from '../context/SelectedRestaurantContext.jsx';
import { addToCartAsync, clearError } from '../store/slices/cartSlice';
import {
  enrichItemWithRestaurant,
  getCartRestaurant,
  isCrossRestaurantConflict,
  isCrossRestaurantError,
  resolveItemRestaurant,
} from '../utils/cartRestaurant';

export function useAddToCart() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const cartItems = useSelector((state) => state.cart.items);
  const menuRestaurantId = useSelector((state) => state.menu.restaurantId);
  const menuRestaurant = useSelector((state) => state.menu.restaurant);
  const menuRestaurantSlug = useSelector((state) => state.menu.restaurantSlug);
  const { selectedRestaurantId, selectedRestaurantSlug } =
    useSelectedRestaurant();
  const { promptLoginRequired } = useLoginRequired();
  const { promptCrossRestaurant } = useCrossRestaurantCart();

  const addItemToCart = useCallback(
    async (item, variant = null, addOns = [], quantity = 1) => {
      dispatch(clearError());

      if (!isAuthenticated) {
        promptLoginRequired();
        return false;
      }

      const targetRestaurant = resolveItemRestaurant(
        item,
        {
          menuRestaurantId,
          menuRestaurant,
          menuRestaurantSlug,
        },
        {
          selectedRestaurantId,
          selectedRestaurantSlug,
        },
      );

      const pendingAdd = {
        item: enrichItemWithRestaurant(item, targetRestaurant),
        variant,
        addOns,
        quantity,
      };

      if (
        isCrossRestaurantConflict(cartItems, targetRestaurant.id)
      ) {
        const cartRestaurant = getCartRestaurant(cartItems);

        return promptCrossRestaurant({
          currentRestaurantName: cartRestaurant?.name || 'your current restaurant',
          newRestaurantName: targetRestaurant.name,
          newRestaurantId: targetRestaurant.id,
          newRestaurantSlug: targetRestaurant.slug,
          pendingAdd,
        });
      }

      try {
        await dispatch(
          addToCartAsync({
            item: pendingAdd.item,
            variant,
            addOns,
            quantity,
          }),
        ).unwrap();
        return true;
      } catch (error) {
        if (isCrossRestaurantError(error)) {
          const cartRestaurant = getCartRestaurant(cartItems);

          dispatch(clearError());

          return promptCrossRestaurant({
            currentRestaurantName:
              cartRestaurant?.name || 'your current restaurant',
            newRestaurantName: targetRestaurant.name,
            newRestaurantId: targetRestaurant.id,
            newRestaurantSlug: targetRestaurant.slug,
            pendingAdd,
          });
        }

        return false;
      }
    },
    [
      cartItems,
      dispatch,
      isAuthenticated,
      menuRestaurant,
      menuRestaurantId,
      menuRestaurantSlug,
      promptCrossRestaurant,
      promptLoginRequired,
      selectedRestaurantId,
      selectedRestaurantSlug,
    ],
  );

  return { addItemToCart, isAuthenticated };
}
