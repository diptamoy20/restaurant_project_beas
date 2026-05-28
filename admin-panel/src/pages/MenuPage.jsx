import { useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import { Table } from '../components/ui/Table';
import { TextField } from '../components/ui/TextField';
import { PermissionGate } from '../components/PermissionGate';
import { RestaurantMenuModal } from '../components/RestaurantMenuModal.jsx';
import { useGetAdminRestaurantMenuQuery } from '../services/menuApi';
import { useGetAllRestaurantsQuery } from '../services/restaurantApi';

const formatCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function MenuPage() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [menuRestaurant, setMenuRestaurant] = useState(null);
  const [menuMode, setMenuMode] = useState('list');

  const {
    data: restaurants = [],
    isLoading: isRestaurantsLoading,
    error: restaurantsError,
  } = useGetAllRestaurantsQuery();

  const selectedRestaurant = restaurants.find(
    (restaurant) => String(restaurant.id) === String(selectedRestaurantId),
  );

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [restaurant.name, restaurant.city, restaurant.cuisineType]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const {
    data: menuData,
    isLoading: isMenuLoading,
    error: menuError,
  } = useGetAdminRestaurantMenuQuery(selectedRestaurantId, {
    skip: !selectedRestaurantId,
  });

  const menuItems = menuData?.items ?? [];
  const addMenuDisabled = !selectedRestaurant || isRestaurantsLoading;

  const openMenu = (restaurant, mode) => {
    setMenuRestaurant(restaurant);
    setMenuMode(mode);
  };

  return (
    <div className="space-y-6">
      <Card
        eyebrow="Master Menu"
        title="Manage Menu"
        actions={
          <PermissionGate module="menu" action="create">
            <Button
              disabled={addMenuDisabled}
              onClick={() => selectedRestaurant && openMenu(selectedRestaurant, 'create')}
            >
              Add Menu
            </Button>
          </PermissionGate>
        }
      >
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-3">
            <TextField
              aria-label="Search or select restaurant"
              label="Search or select restaurant"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Type restaurant name"
              value={searchTerm}
            />

            <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
              {isRestaurantsLoading ? (
                <div className="px-4 py-5">
                  <Loader label="Loading restaurants..." />
                </div>
              ) : null}

              {restaurantsError ? (
                <div className="p-3">
                  <ErrorState
                    message={
                      restaurantsError?.data?.message ||
                      restaurantsError?.error ||
                      'Failed to load restaurants.'
                    }
                  />
                </div>
              ) : null}

              {!isRestaurantsLoading && !restaurantsError && filteredRestaurants.length === 0 ? (
                <div className="px-4 py-5 text-sm text-slate-500">No restaurants match your search.</div>
              ) : null}

              {filteredRestaurants.map((restaurant) => {
                const isSelected = String(restaurant.id) === String(selectedRestaurantId);

                return (
                  <button
                    className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 ${
                      isSelected ? 'bg-slate-950 text-white' : 'bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                    key={restaurant.id}
                    onClick={() => setSelectedRestaurantId(String(restaurant.id))}
                    type="button"
                  >
                    <span className="block text-sm font-semibold">{restaurant.name}</span>
                    <span className={`mt-1 block text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                      {restaurant.city || restaurant.cuisineType || 'Location not specified'}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-h-[190px] rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5">
            {!selectedRestaurant ? (
              <div className="flex min-h-[150px] flex-col items-center justify-center text-center">
                <h3 className="text-base font-semibold text-slate-900">Select a restaurant</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Search and select a restaurant to manage its menu.
                </p>
              </div>
            ) : null}

            {selectedRestaurant ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">{selectedRestaurant.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedRestaurant.address}
                      {selectedRestaurant.city ? `, ${selectedRestaurant.city}` : ''}
                    </p>
                  </div>
                  <Button onClick={() => openMenu(selectedRestaurant, 'list')} variant="secondary">
                    Open Full Menu
                  </Button>
                </div>

                {isMenuLoading ? <Loader label="Loading menu items..." /> : null}
                {menuError ? (
                  <ErrorState
                    message={menuError?.data?.message || menuError?.error || 'Unable to load menu items.'}
                  />
                ) : null}

                {!isMenuLoading && !menuError && menuItems.length === 0 ? (
                  <EmptyState
                    description="No menu items are linked to this restaurant yet."
                    title="No menu items"
                  />
                ) : null}

                {menuItems.length ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <Table
                      columns={[
                        {
                          key: 'name',
                          header: 'Menu Item',
                          render: (row) => (
                            <div>
                              <p className="font-medium text-slate-900">{row.name}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {row.description || 'No description available'}
                              </p>
                            </div>
                          ),
                        },
                        {
                          key: 'category',
                          header: 'Category',
                          render: (row) => row.category?.name ?? 'Unassigned',
                        },
                        {
                          key: 'price',
                          header: 'Price',
                          render: (row) => formatCurrency.format(row.price),
                        },
                        {
                          key: 'isAvailable',
                          header: 'Status',
                          render: (row) => (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                row.isAvailable
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {row.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          ),
                        },
                      ]}
                      data={menuItems}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </Card>

      <RestaurantMenuModal
        open={Boolean(menuRestaurant)}
        restaurant={menuRestaurant}
        mode={menuMode}
        onModeChange={setMenuMode}
        onClose={() => setMenuRestaurant(null)}
      />
    </div>
  );
}
