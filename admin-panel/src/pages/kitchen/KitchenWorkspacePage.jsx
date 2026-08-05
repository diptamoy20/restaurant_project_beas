import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useGetAllRestaurantsQuery } from '../../services/restaurantApi';
import { useGetInventoryDashboardQuery } from '../../services/kitchenApi';
import { setSelectedRestaurant } from '../../features/kitchen/kitchenSlice';

function KitchenWorkspaceCard({ restaurant }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data: dashboard, isLoading: metricsLoading } = useGetInventoryDashboardQuery(restaurant.id);

  const metrics = dashboard || {};
  const lowStockItems = metrics.lowStockItems || 0;
  const outOfStockItems = metrics.outOfStockItems || 0;
  const pendingTransfers = metrics.pendingKitchenTransfers || 0;
  const todayConsumption = metrics.todayIngredientConsumption || 0;

  const totalStockIssues = lowStockItems + outOfStockItems;
  const kitchenStatus = totalStockIssues === 0 ? 'Healthy' : totalStockIssues <= 2 ? 'Attention' : 'Critical';
  const statusColor = {
    Healthy: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    Attention: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    Critical: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  }[kitchenStatus];

  const handleOpenKitchen = () => {
    dispatch(setSelectedRestaurant({
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
    }));
    navigate(`/restaurants/${restaurant.slug}/kitchen/dashboard`);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {restaurant.imageUrl ? (
              <img src={restaurant.imageUrl} alt={restaurant.name} className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-xl">
                R
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{restaurant.name}</h3>
              <p className="text-xs text-slate-500">{restaurant.address}</p>
            </div>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColor}`}>
            {kitchenStatus}
          </span>
        </div>

        {metricsLoading ? (
          <div className="flex h-20 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 text-center">
              <p className="text-lg font-bold text-indigo-500">{todayConsumption}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Consumed Today</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 text-center">
              <p className="text-lg font-bold text-amber-500">{pendingTransfers}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Pending Requests</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 text-center">
              <p className="text-lg font-bold text-rose-500">{totalStockIssues}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Low Stock</p>
            </div>
          </div>
        )}

        <button
          onClick={handleOpenKitchen}
          className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-colors"
        >
          Open Kitchen
        </button>
      </div>
    </div>
  );
}

export function KitchenWorkspacePage() {
  const { data: restaurants = [], isLoading, error } = useGetAllRestaurantsQuery();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kitchen</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose a restaurant to manage its kitchen operations
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">
          Failed to load restaurants. Please check your connection.
        </div>
      ) : restaurants.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <p className="text-4xl mb-4">No Restaurants</p>
          <p className="text-slate-500">Create a restaurant first to manage its kitchen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {restaurants.filter((r) => r.isActive !== false).map((restaurant) => (
            <KitchenWorkspaceCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  );
}
