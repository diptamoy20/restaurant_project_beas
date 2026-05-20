import { useEffect, useMemo, useState } from 'react';

import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { ErrorState } from './ui/ErrorState';
import { Loader } from './ui/Loader';
import { Modal } from './ui/Modal';
import { SelectField } from './ui/SelectField';
import { Table } from './ui/Table';
import { TextField } from './ui/TextField';
import {
  useCreateAdminMenuItemMutation,
  useDeleteAdminMenuItemMutation,
  useGetAdminRestaurantMenuQuery,
  useGetRestaurantCategoriesQuery,
  useUpdateAdminMenuItemMutation,
} from '../services/menuApi';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  discountPrice: '',
  categoryId: '',
  foodType: 'VEG',
  imageUrl: '',
  isAvailable: true,
  isBestSelling: false,
  ingredients: '',
};

function toForm(item) {
  return {
    name: item.name ?? '',
    description: item.description ?? '',
    price: String(item.price ?? ''),
    discountPrice: item.discountPrice != null ? String(item.discountPrice) : '',
    categoryId: item.categoryId != null ? String(item.categoryId) : '',
    foodType: item.foodType ?? 'VEG',
    imageUrl: item.imageUrl ?? '',
    isAvailable: item.isAvailable !== false,
    isBestSelling: Boolean(item.isBestSelling),
    ingredients: item.ingredients ?? '',
  };
}

export function RestaurantMenuModal({ restaurant, open, mode = 'list', onModeChange, onClose }) {
  const restaurantId = restaurant?.id;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingItem, setEditingItem] = useState(null);

  const showForm = mode === 'create' || Boolean(editingItem);

  const {
    data,
    isLoading: isMenuLoading,
    error: menuError,
    refetch,
  } = useGetAdminRestaurantMenuQuery(restaurantId, {
    skip: !open || !restaurantId,
  });

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useGetRestaurantCategoriesQuery(restaurantId, {
    skip: !open || !restaurantId,
  });

  const [createItem, createState] = useCreateAdminMenuItemMutation();
  const [updateItem, updateState] = useUpdateAdminMenuItemMutation();
  const [deleteItem, deleteState] = useDeleteAdminMenuItemMutation();

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setErrors({});
      setEditingItem(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && mode === 'create') {
      setEditingItem(null);
      setForm(emptyForm);
      setErrors({});
    }
  }, [mode, open]);

  const categoryOptions = useMemo(
    () => [
      { value: '', label: categories.length ? 'Select category' : 'Create a category first' },
      ...categories.map((category) => ({
        value: String(category.id),
        label: category.name,
      })),
    ],
    [categories],
  );

  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error ||
    deleteState.error?.data?.message ||
    deleteState.error?.error;

  const menuItems = data?.items ?? [];

  const validate = () => {
    const next = {};

    if (!form.name.trim()) {
      next.name = 'Menu name is required';
    }

    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0) {
      next.price = 'Enter a valid price';
    }

    if (!form.categoryId) {
      next.categoryId = 'Select a category';
    }

    const discount = form.discountPrice ? Number(form.discountPrice) : null;
    if (form.discountPrice && (Number.isNaN(discount) || discount < 0)) {
      next.discountPrice = 'Invalid discount price';
    }

    if (discount !== null && !Number.isNaN(discount) && discount > price) {
      next.discountPrice = 'Discount price cannot exceed price';
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate() || !restaurantId) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
      categoryId: Number(form.categoryId),
      foodType: form.foodType,
      imageUrl: form.imageUrl.trim() || undefined,
      isAvailable: Boolean(form.isAvailable),
      isBestSelling: Boolean(form.isBestSelling),
      ingredients: form.ingredients.trim() || undefined,
    };

    try {
      if (editingItem) {
        await updateItem({
          id: editingItem.id,
          restaurantId,
          body: payload,
        }).unwrap();
      } else {
        await createItem({ restaurantId, body: payload }).unwrap();
      }

      setForm(emptyForm);
      setEditingItem(null);
      onModeChange?.('list');
      refetch();
    } catch {
      /* surfaced via mutationError */
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm(toForm(item));
    setErrors({});
    onModeChange?.('list');
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) {
      return;
    }

    try {
      await deleteItem({ id: item.id, restaurantId }).unwrap();
      refetch();
    } catch {
      /* surfaced via mutationError */
    }
  };

  const title = restaurant
    ? `${showForm ? (editingItem ? 'Edit Menu' : 'Add Menu') : 'All Menu'} - ${restaurant.name}`
    : 'Menu management';

  return (
    <Modal
      footer={
        <div className="flex flex-wrap gap-3">
          {showForm ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingItem(null);
                setForm(emptyForm);
                setErrors({});
                onModeChange?.('list');
              }}
            >
              All Menu
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => onModeChange?.('create')}>
              Add Menu
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {showForm ? (
            <Button
              type="submit"
              form="restaurant-menu-item-form"
              disabled={createState.isLoading || updateState.isLoading || !categories.length}
            >
              {editingItem ? 'Save Changes' : 'Create Menu'}
            </Button>
          ) : null}
        </div>
      }
      onClose={onClose}
      open={open}
      title={title}
      maxWidth="max-w-6xl"
    >
      <div className="space-y-6">
        {isMenuLoading || isCategoriesLoading ? <Loader label="Loading menu data..." /> : null}
        {menuError ? (
          <ErrorState message={menuError?.data?.message || menuError?.error || 'Unable to load menu.'} />
        ) : null}
        {categoriesError ? (
          <ErrorState
            message={
              categoriesError?.data?.message ||
              categoriesError?.error ||
              'Unable to load categories.'
            }
          />
        ) : null}
        {mutationError ? <ErrorState message={mutationError} /> : null}

        {!showForm ? (
          <div className="overflow-x-auto">
            <Table
              columns={[
                { key: 'name', header: 'Menu Item Name' },
                {
                  key: 'category',
                  header: 'Category',
                  render: (row) => row.category?.name ?? 'Unassigned',
                },
                { key: 'price', header: 'Price', render: (row) => `Rs. ${row.price}` },
                {
                  key: 'discountPrice',
                  header: 'Discount Price',
                  render: (row) => (row.discountPrice != null ? `Rs. ${row.discountPrice}` : '-'),
                },
                { key: 'foodType', header: 'Food Type', render: (row) => row.foodType ?? '-' },
                {
                  key: 'isAvailable',
                  header: 'Availability Status',
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
                {
                  key: 'isBestSelling',
                  header: 'Best Seller Status',
                  render: (row) => (row.isBestSelling ? 'Best Seller' : '-'),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <div className="flex gap-2">
                      <Button className="px-3 py-1.5 text-xs" onClick={() => handleEdit(row)} variant="secondary">
                        Edit
                      </Button>
                      <Button className="px-3 py-1.5 text-xs" onClick={() => handleDelete(row)} variant="danger">
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={menuItems}
              emptyMessage="No menu items found for this restaurant."
            />
          </div>
        ) : null}

        {showForm ? (
          <form className="grid gap-4 md:grid-cols-2" id="restaurant-menu-item-form" onSubmit={handleSubmit}>
            {!categories.length && !isCategoriesLoading ? (
              <div className="md:col-span-2">
                <EmptyState
                  description="Create a category in Master Category before adding menu items."
                  title="No categories available"
                />
              </div>
            ) : null}

            <TextField
              required
              error={errors.name}
              label="Menu Name *"
              name="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />

            <SelectField
              required
              className={errors.categoryId ? 'text-rose-600' : ''}
              label="Category *"
              name="categoryId"
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              options={categoryOptions}
            />
            {errors.categoryId ? (
              <span className="-mt-3 text-xs text-rose-600 md:col-start-2">{errors.categoryId}</span>
            ) : null}

            <TextField
              required
              error={errors.price}
              label="Price *"
              min="0"
              name="price"
              step="0.01"
              type="number"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            />

            <TextField
              error={errors.discountPrice}
              label="Discount Price"
              min="0"
              name="discountPrice"
              step="0.01"
              type="number"
              value={form.discountPrice}
              onChange={(event) => setForm((prev) => ({ ...prev, discountPrice: event.target.value }))}
            />

            <SelectField
              label="Food Type"
              name="foodType"
              value={form.foodType}
              onChange={(event) => setForm((prev) => ({ ...prev, foodType: event.target.value }))}
              options={[
                { value: 'VEG', label: 'Vegetarian' },
                { value: 'NON_VEG', label: 'Non-vegetarian' },
              ]}
            />

            <TextField
              label="Image URL"
              name="imageUrl"
              type="url"
              value={form.imageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            />

            <label className="flex items-center gap-3 md:col-span-2">
              <input
                checked={form.isAvailable}
                name="isAvailable"
                type="checkbox"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isAvailable: event.target.checked }))
                }
              />
              <span className="text-sm font-medium text-slate-700">Available for Ordering</span>
            </label>

            <label className="flex items-center gap-3 md:col-span-2">
              <input
                checked={form.isBestSelling}
                name="isBestSelling"
                type="checkbox"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isBestSelling: event.target.checked }))
                }
              />
              <span className="text-sm font-medium text-slate-700">Mark as Best Selling</span>
            </label>

            <TextField
              className="md:col-span-2"
              label="Ingredients"
              name="ingredients"
              value={form.ingredients}
              onChange={(event) => setForm((prev) => ({ ...prev, ingredients: event.target.value }))}
            />

            <TextField
              className="md:col-span-2"
              label="Description"
              name="description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </form>
        ) : null}
      </div>
    </Modal>
  );
}
