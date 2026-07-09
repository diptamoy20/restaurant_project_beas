export function getCartRestaurant(cartItems = []) {
  const cartItem = cartItems.find((item) => item.restaurantId);

  if (!cartItem) {
    return null;
  }

  return {
    id: cartItem.restaurantId,
    name:
      cartItem.restaurantName ||
      cartItem.restaurant?.name ||
      cartItem.menuItem?.restaurant?.name ||
      'your current restaurant',
  };
}

export function resolveItemRestaurant(
  item,
  { menuRestaurantId, menuRestaurant, menuRestaurantSlug } = {},
  { selectedRestaurantId, selectedRestaurantSlug } = {},
) {
  const id =
    item?.restaurantId ??
    item?.menuItem?.restaurantId ??
    item?.restaurant?.id ??
    menuRestaurantId ??
    selectedRestaurantId ??
    null;

  const name =
    item?.restaurantName ??
    item?.restaurant?.name ??
    item?.menuItem?.restaurant?.name ??
    menuRestaurant?.name ??
    'this restaurant';

  const slug =
    item?.restaurant?.slug ??
    item?.restaurantSlug ??
    menuRestaurant?.slug ??
    menuRestaurantSlug ??
    selectedRestaurantSlug ??
    null;

  return { id, name, slug };
}

export function isCrossRestaurantConflict(cartItems, targetRestaurantId) {
  if (!targetRestaurantId) {
    return false;
  }

  const cartRestaurant = getCartRestaurant(cartItems);

  if (!cartRestaurant?.id) {
    return false;
  }

  return String(cartRestaurant.id) !== String(targetRestaurantId);
}

export function isCrossRestaurantError(message = '') {
  const cleaned = String(message).replace(/\s*\(requestId:.*?\)/, '');

  return (
    cleaned.includes('different restaurant') ||
    cleaned.includes('Please clear your cart first') ||
    cleaned.includes('Please clear the cart before adding new items')
  );
}

export function enrichItemWithRestaurant(item, restaurant) {
  if (!restaurant?.id) {
    return item;
  }

  return {
    ...item,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug ?? item?.restaurant?.slug ?? null,
    },
  };
}
