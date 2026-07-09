import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import { CART_STORAGE_KEY } from '../constants/storage';
import type { AddOnIngredient } from '../types/addOn.types';
import type { CartContextValue, CartItem, CartSnapshot } from '../types/cart.types';
import type { QRMenuItem, QRMenuItemVariant, QRRestaurantInfo } from '../types/menu.types';
import { getMenuItemImage } from '../utils/images';

export const CartContext = createContext<CartContextValue | null>(null);

function getAddOnKey(addOns: AddOnIngredient[] = []): string {
  return addOns
    .map((addOn) => `${addOn.addonGroupId}:${addOn.addonOptionId}`)
    .sort()
    .join(',');
}

function buildCartKey(menuItemId: number, variantId?: number, addOns: AddOnIngredient[] = []): string {
  return `${menuItemId}:${variantId ?? 'base'}:${getAddOnKey(addOns) || 'no-addons'}`;
}

function readStoredCart(): CartSnapshot {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return { items: [] };
    }

    const parsed = JSON.parse(stored) as CartSnapshot;

    return {
      ...parsed,
      items: (parsed.items ?? []).map((item) => ({
        ...item,
        addOns: item.addOns ?? [],
      })),
    };
  } catch {
    return { items: [] };
  }
}

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [snapshot, setSnapshot] = useState<CartSnapshot>(() => readStoredCart());

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(snapshot));
  }, [snapshot]);

  const setOrderContext: CartContextValue['setOrderContext'] = useCallback((context) => {
    setSnapshot((current) => ({
      ...current,
      restaurant: context.restaurant ?? current.restaurant,
      restaurantId: context.restaurantId ?? current.restaurantId,
      tableId: context.tableId ?? current.tableId,
      tableLabel: context.tableLabel ?? current.tableLabel,
      sessionId: context.sessionId ?? current.sessionId,
      sessionToken: context.sessionToken ?? current.sessionToken,
    }));
  }, []);

  const addItem: CartContextValue['addItem'] = useCallback((item, options = {}) => {
    const selectedAddOns = options.addOns ?? [];
    const quantityToAdd = Math.max(1, options.quantity ?? 1);
    const cartKey = buildCartKey(item.id, options.variant?.id, selectedAddOns);

    setSnapshot((current) => {
      const existing = current.items.find((cartItem) => cartItem.cartKey === cartKey);
      const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
      const unitPrice = (options.variant?.price ?? item.price) + addOnsTotal;

      if (existing) {
        return {
          ...current,
          items: current.items.map((cartItem) =>
            cartItem.cartKey === cartKey
              ? { ...cartItem, quantity: cartItem.quantity + quantityToAdd }
              : cartItem,
          ),
        };
      }

      const nextItem: CartItem = {
        cartKey,
        menuItemId: item.id,
        name: item.name,
        description: item.description,
        image: getMenuItemImage(item),
        basePrice: item.price,
        unitPrice,
        quantity: quantityToAdd,
        variant: options.variant,
        addOns: selectedAddOns,
        preparationTime: item.preparationTime,
      };

      return {
        ...current,
        items: [...current.items, nextItem],
      };
    });

    toast.success('Added to cart');
  }, []);

  const removeItem = useCallback((cartKey: string) => {
    setSnapshot((current) => ({
      ...current,
      items: current.items.filter((item) => item.cartKey !== cartKey),
    }));
  }, []);

  const increaseQuantity = useCallback((cartKey: string) => {
    setSnapshot((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    }));
  }, []);

  const decreaseQuantity = useCallback((cartKey: string) => {
    setSnapshot((current) => ({
      ...current,
      items: current.items
        .map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item,
        )
        .filter((item) => item.quantity > 0),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setSnapshot((current) => ({
      restaurant: current.restaurant,
      restaurantId: current.restaurantId,
      tableId: current.tableId,
      tableLabel: current.tableLabel,
      sessionId: current.sessionId,
      sessionToken: current.sessionToken,
      items: [],
    }));
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = snapshot.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const itemCount = snapshot.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      ...snapshot,
      items: snapshot.items,
      itemCount,
      subtotal,
      total: subtotal,
      addItem,
      removeItem,
      increaseQuantity,
      decreaseQuantity,
      clearCart,
      setOrderContext,
      getQuantity: (menuItemId: number, variantId?: number) => {
        return snapshot.items
          .filter((item) => item.menuItemId === menuItemId && (!variantId || item.variant?.id === variantId))
          .reduce((sum, item) => sum + item.quantity, 0);
      },
    };
  }, [
    addItem,
    clearCart,
    decreaseQuantity,
    increaseQuantity,
    removeItem,
    setOrderContext,
    snapshot,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export type { QRRestaurantInfo };
