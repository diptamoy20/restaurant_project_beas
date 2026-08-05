import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { apiFetch } from '../utils/api';
import { setRestaurant } from '../app/store';
import { Loader } from '../components/ui/Loader';
import { Button } from '../components/ui/Button';

function StatusDot({ status }) {
  const color =
    status === 'Healthy' ? 'bg-emerald-500' :
    status === 'Out of Stock' ? 'bg-rose-500' :
    status === 'Low Stock' ? 'bg-amber-500' :
    'bg-slate-300';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export function RestaurantWorkspacePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('integration/restaurants');
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (err) {
      setRestaurants([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await fetchRestaurants();
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredRestaurants = useMemo(() => {
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter(
      (r) => r.name?.toLowerCase().includes(q) || r.slug?.toLowerCase().includes(q)
    );
  }, [restaurants, search]);

  const handleOpenRestaurant = (restaurant) => {
    dispatch(setRestaurant({
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
    }));
    navigate(`/operations/${restaurant.slug}/dashboard`);
  };

  if (loading) return <Loader label="Loading restaurants..." />;

  if (error && restaurants.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branch Operations</h1>
          <p className="text-sm text-slate-500">Restaurant Workspaces</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm font-semibold text-rose-800 mb-1">Unable to load restaurants</p>
          <p className="text-xs text-rose-600 mb-4">
            Please verify that the Restaurant Management service is running on port 4000.
          </p>
          <Button onClick={fetchRestaurants}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Branch Operations</h1>
        <p className="text-sm text-slate-500">Restaurant Workspaces — manage branch-specific inventory operations</p>
      </div>

      <div className="max-w-md">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by restaurant name or slug..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
          />
        </div>
      </div>

      {filteredRestaurants.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          {restaurants.length === 0
            ? 'No restaurants found. Make sure the Restaurant Management System (port 4000) is running.'
            : 'No restaurants match your search.'
          }
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRestaurants.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-start gap-3 mb-4">
              {r.imageUrl ? (
                <img src={r.imageUrl} alt={r.name} className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xl">🏪</span>
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{r.name}</h3>
                <p className="text-xs text-slate-500 truncate">{r.address || r.slug}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <StatusDot status={r.kitchenStatus} /> Kitchen
                </span>
                <span className="font-medium text-slate-900">{r.kitchenStatus || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <StatusDot status={r.storeStatus} /> Store
                </span>
                <span className="font-medium text-slate-900">{r.storeStatus || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Pending Requests</span>
                <span className={`font-semibold ${r.pendingRequests > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {r.pendingRequests ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Low Stock</span>
                <span className={`font-semibold ${r.lowStock > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {r.lowStock ?? 0}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleOpenRestaurant(r)}
              className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition"
            >
              Open Workspace →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
