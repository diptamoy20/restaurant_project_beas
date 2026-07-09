import { useMemo, useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { TextField } from '../components/ui/TextField';
import { PermissionGate } from '../components/PermissionGate';
import { useGetAllRestaurantsQuery } from '../services/restaurantApi';
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetRestaurantCategoriesQuery,
  useUpdateCategoryMutation,
} from '../services/menuApi';

const emptyForm = {
  name: '',
  description: '',
};

export function CategoriesPage() {
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const {
    data: restaurants = [],
    isLoading: isRestaurantsLoading,
    error: restaurantsError,
  } = useGetAllRestaurantsQuery();

  const selectedRestaurant = restaurants.find(
    (restaurant) => String(restaurant.id) === String(selectedRestaurantId),
  );

  const filteredRestaurants = useMemo(() => {
    const query = restaurantSearch.trim().toLowerCase();

    if (!query) {
      return restaurants;
    }

    return restaurants.filter((restaurant) =>
      `${restaurant.name} ${restaurant.city ?? ''}`.toLowerCase().includes(query),
    );
  }, [restaurantSearch, restaurants]);

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useGetRestaurantCategoriesQuery(selectedRestaurantId, {
    skip: !selectedRestaurantId,
  });

  const [createCategory, createState] = useCreateCategoryMutation();
  const [updateCategory, updateState] = useUpdateCategoryMutation();
  const [deleteCategory, deleteState] = useDeleteCategoryMutation();

  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error ||
    deleteState.error?.data?.message ||
    deleteState.error?.error;

  const validate = () => {
    const next = {};

    if (!selectedRestaurantId) {
      next.restaurant = 'Select a restaurant first';
    }

    if (!form.name.trim()) {
      next.name = 'Category name is required';
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const handleSelectRestaurant = (restaurant) => {
    setSelectedRestaurantId(String(restaurant.id));
    setRestaurantSearch(restaurant.name);
    setErrors({});
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name ?? '',
      description: category.description ?? '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
    };

    try {
      if (editingCategory) {
        await updateCategory({
          id: editingCategory.id,
          restaurantId: selectedRestaurantId,
          body,
        }).unwrap();
      } else {
        await createCategory({ restaurantId: selectedRestaurantId, body }).unwrap();
      }

      setOpen(false);
      setEditingCategory(null);
      setForm(emptyForm);
    } catch {
      /* surfaced via mutationError */
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete ${category.name}? Categories with menu items cannot be deleted.`)) {
      return;
    }

    try {
      await deleteCategory({ id: category.id, restaurantId: selectedRestaurantId }).unwrap();
    } catch {
      /* surfaced via mutationError */
    }
  };

  return (
    <div className="space-y-6">
      <Card
        eyebrow="Master Category"
        title="Restaurant Categories"
        actions={
          <PermissionGate module="categories" action="create">
            <Button className="self-end" disabled={!selectedRestaurantId} onClick={handleOpenCreate}>
              Add New Category
            </Button>
          </PermissionGate>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <div>
            <TextField
              error={errors.restaurant}
              label="Search or select restaurant"
              list="category-restaurant-options"
              required
              onChange={(event) => {
                const value = event.target.value;
                setRestaurantSearch(value);

                const exactMatch = restaurants.find(
                  (restaurant) => restaurant.name.toLowerCase() === value.trim().toLowerCase(),
                );

                setSelectedRestaurantId(exactMatch ? String(exactMatch.id) : '');
              }}
              placeholder="Type restaurant name"
              value={restaurantSearch}
            />
            <datalist id="category-restaurant-options">
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.name} />
              ))}
            </datalist>

            {isRestaurantsLoading ? <Loader label="Loading restaurants..." /> : null}
            {restaurantsError ? (
              <ErrorState
                message={
                  restaurantsError?.data?.message ||
                  restaurantsError?.error ||
                  'Failed to load restaurants.'
                }
              />
            ) : null}

            {!selectedRestaurantId && filteredRestaurants.length ? (
              <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                {filteredRestaurants.slice(0, 8).map((restaurant) => (
                  <button
                    className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-slate-50"
                    key={restaurant.id}
                    onClick={() => handleSelectRestaurant(restaurant)}
                    type="button"
                  >
                    <span className="block font-medium text-slate-900">{restaurant.name}</span>
                    <span className="text-xs text-slate-500">{restaurant.city || restaurant.address}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            {selectedRestaurant ? (
              <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">{selectedRestaurant.name}</p>
                <p className="text-sm text-slate-500">{selectedRestaurant.address}</p>
              </div>
            ) : null}

            {isCategoriesLoading ? <Loader label="Loading categories..." /> : null}
            {categoriesError ? (
              <ErrorState
                message={
                  categoriesError?.data?.message ||
                  categoriesError?.error ||
                  'Failed to load categories.'
                }
              />
            ) : null}

            {!selectedRestaurantId ? (
              <EmptyState
                description="Search and select a restaurant to manage its categories."
                title="Select a restaurant"
              />
            ) : null}

            {selectedRestaurantId && !isCategoriesLoading && !categories.length ? (
              <EmptyState
                description="Create the first category for this restaurant."
                title="No categories"
              />
            ) : null}

            {categories.length ? (
              <Table
                columns={[
                  { key: 'name', header: 'Category Name' },
                  { key: 'activeItemCount', header: 'Active Item Count' },
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (row) => (
                      <PermissionGate
                        fallback={<span className="text-xs text-slate-400">Read only</span>}
                        module="categories"
                        action="edit"
                      >
                        <div className="flex gap-2">
                          <Button onClick={() => handleOpenEdit(row)} variant="secondary">
                            Edit
                          </Button>
                          <PermissionGate module="categories" action="delete">
                            <Button onClick={() => handleDelete(row)} variant="danger">
                              Delete
                            </Button>
                          </PermissionGate>
                        </div>
                      </PermissionGate>
                    ),
                  },
                ]}
                data={categories}
              />
            ) : null}

            {mutationError ? <ErrorState message={mutationError} /> : null}
          </div>
        </div>
      </Card>

      <Modal
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={createState.isLoading || updateState.isLoading}
              form="category-form"
              type="submit"
            >
              {editingCategory ? 'Save Category' : 'Create Category'}
            </Button>
          </>
        }
        onClose={() => setOpen(false)}
        open={open}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
      >
        <form className="space-y-4" id="category-form" onSubmit={handleSubmit}>
          <TextField
            disabled
            label="Restaurant"
            value={selectedRestaurant?.name || ''}
            onChange={() => {}}
          />
          <TextField
            error={errors.name}
            label="Category Name"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
            value={form.name}
          />
          <TextField
            label="Description"
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            value={form.description}
          />
        </form>
      </Modal>
    </div>
  );
}
