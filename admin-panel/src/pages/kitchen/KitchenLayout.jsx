import React, { useEffect } from 'react';
import { Outlet, useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useGetAllRestaurantsQuery } from '../../services/restaurantApi';
import { setSelectedRestaurant, clearSelectedRestaurant } from '../../features/kitchen/kitchenSlice';

export function KitchenLayout() {
  const { restaurantSlug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { restaurantId, restaurantName } = useSelector((state) => state.kitchen);

  const { data: restaurants = [], isLoading } = useGetAllRestaurantsQuery();

  useEffect(() => {
    if (isLoading || restaurants.length === 0) return;

    const restaurant = restaurants.find((r) => r.slug === restaurantSlug);
    if (!restaurant) {
      navigate('/kitchen', { replace: true });
      return;
    }

    if (restaurant.id !== restaurantId) {
      dispatch(setSelectedRestaurant({
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
      }));
    }
  }, [restaurantSlug, restaurants, isLoading, restaurantId, dispatch, navigate]);

  if (isLoading) {
    return (
      <div className="p-6 flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
      </div>
    );
  }

  const currentRestaurant = restaurants.find((r) => r.slug === restaurantSlug);
  if (!currentRestaurant) return null;

  const displayName = currentRestaurant.name;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <Link to="/kitchen" className="hover:text-amber-500 transition-colors">Kitchen</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">{displayName}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{displayName} Kitchen</h1>
        </div>
        <Link
          to="/kitchen"
          className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Switch Restaurant
        </Link>
      </div>

      <Outlet />
    </div>
  );
}
