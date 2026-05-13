import { useMemo, useState } from 'react';

import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { Modal } from './ui/Modal';
import { Table } from './ui/Table';
import { TextField } from './ui/TextField';
import { SelectField } from './ui/SelectField';
import { ErrorState } from './ui/ErrorState';
import {
  useCreateAdminMenuItemMutation,
  useDeleteAdminMenuItemMutation,
  useGetAdminRestaurantMenuQuery,
  useUpdateAdminMenuItemMutation,
} from '../services/menuApi';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  discountPrice: '',
  categoryName: '',
  foodType: 'VEG',
  preparationTime: '',
  imageUrl: '',
  isAvailable: true,
  isBestSelling: false,
  spicyLevel: '',
  ingredients: '',
};

export function RestaurantMenuModal({ restaurant, open, onClose }) {
  const restaurantId = restaurant?.id;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingItem, setEditingItem] = useState(null);

  const { data, isLoading, error, refetch } = useGetAdminRestaurantMenuQuery(restaurantId, {
    skip: !open || !restaurantId,
  });

  const [createItem, createState] = useCreateAdminMenuItemMutation();
  const [updateItem, updateState] = useUpdateAdminMenuItemMutation();
  const [deleteItem, deleteState] = useDeleteAdminMenuItemMutation();

  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error ||
    deleteState.error?.data?.message ||
    deleteState.error?.error;

  const menuItems = data?.items ?? [];

  const categoriesHint = useMemo(() => {
    const names = Array.from(
      new Set(menuItems.map((item) => item.category?.name).filter(Boolean)),
    );

    return names.join(', ') || 'Starters, Main Course, Beverages…';
  }, [menuItems]);

  const validate = () => {
    const next = {};

    if (!form.name.trim()) {
      next.name = 'Menu name is required';
    }

    const price = Number(form.price);

    if (!form.price || Number.isNaN(price) || price <= 0) {
      next.price = 'Enter a valid price';
    }

    if (!form.categoryName.trim()) {
      next.categoryName = 'Category is required';
    }

    const discount = form.discountPrice ? Number(form.discountPrice) : null;

    if (form.discountPrice && (Number.isNaN(discount) || discount < 0)) {
      next.discountPrice = 'Invalid discount price';
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
      categoryName: form.categoryName.trim(),
      foodType: form.foodType,
      preparationTime: form.preparationTime ? Number(form.preparationTime) : undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      isAvailable: Boolean(form.isAvailable),
      isBestSelling: Boolean(form.isBestSelling),
      spicyLevel: form.spicyLevel === '' ? undefined : Number(form.spicyLevel),
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
      refetch();
    } catch {
      /* surfaced via mutationError */
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name ?? '',
      description: item.description ?? '',
      price: String(item.price ?? ''),
      discountPrice: item.discountPrice != null ? String(item.discountPrice) : '',
      categoryName: item.category?.name ?? '',
      foodType: item.foodType ?? 'VEG',
      preparationTime: item.preparationTime != null ? String(item.preparationTime) : '',
      imageUrl: item.imageUrl ?? '',
      isAvailable: item.isAvailable !== false,
      isBestSelling: Boolean(item.isBestSelling),
      spicyLevel: item.spicyLevel != null ? String(item.spicyLevel) : '',
      ingredients: item.ingredients ?? '',
    });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) {
      return;
    }

    try {
      await deleteItem({ id: item.id, restaurantId }).unwrap();
      refetch();
    } catch {
      /* mutation error */
    }
  };

  return (
    <Modal
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            type="submit"
            form="restaurant-menu-item-form"
            disabled={createState.isLoading || updateState.isLoading}
          >
            {editingItem ? 'Save changes' : 'Create dish'}
          </Button>
        </div>
      }
      onClose={onClose}
      open={open}
      title={restaurant ? `Menu · ${restaurant.name}` : 'Menu management'}
    >
      <div className="space-y-6">
        {isLoading ? <Loader label="Loading dishes…" /> : null}
        {error ? (
          <ErrorState message={error?.data?.message || error?.error || 'Unable to load dishes.'} />
        ) : null}

        {mutationError ? <ErrorState message={mutationError} /> : null}

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Existing dishes</p>
          <div className="mt-3 overflow-x-auto">
            <Table
              columns={[
                {
                  key: 'name',
                  header: 'Item',
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.category?.name}</p>
                    </div>
                  ),
                },
                {
                  key: 'price',
                  header: 'Price',
                  render: (row) => `Rs. ${row.price}`,
                },
                {
                  key: 'flags',
                  header: 'Highlights',
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      {row.isBestSelling ? (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">
                          Best seller
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          row.isAvailable
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {row.isAvailable ? 'Available' : 'Hidden'}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="px-3 py-1.5 text-xs"
                        variant="secondary"
                        onClick={() => handleEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        className="px-3 py-1.5 text-xs"
                        variant="danger"
                        onClick={() => handleDelete(row)}
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={menuItems}
              emptyMessage="No dishes yet — create your first item below."
            />
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-2" id="restaurant-menu-item-form" onSubmit={handleSubmit}>
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                {editingItem ? 'Edit dish' : 'Add dish'}
              </p>
              <p className="text-sm text-slate-500">Existing categories: {categoriesHint}</p>
            </div>
            {editingItem ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingItem(null);
                  setForm(emptyForm);
                  setErrors({});
                }}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>

          <TextField
            required
            error={errors.name}
            label="Menu name *"
            name="name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />

          <TextField
            required
            error={errors.categoryName}
            label="Category *"
            name="categoryName"
            placeholder="e.g., Pizza"
            value={form.categoryName}
            onChange={(event) => setForm((prev) => ({ ...prev, categoryName: event.target.value }))}
          />

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
            label="Discount price"
            min="0"
            name="discountPrice"
            step="0.01"
            type="number"
            value={form.discountPrice}
            onChange={(event) => setForm((prev) => ({ ...prev, discountPrice: event.target.value }))}
          />

          <SelectField
            label="Food type"
            name="foodType"
            value={form.foodType}
            onChange={(event) => setForm((prev) => ({ ...prev, foodType: event.target.value }))}
            options={[
              { value: 'VEG', label: 'Vegetarian' },
              { value: 'NON_VEG', label: 'Non-vegetarian' },
            ]}
          />

          <TextField
            label="Preparation time (minutes)"
            min="1"
            name="preparationTime"
            type="number"
            value={form.preparationTime}
            onChange={(event) => setForm((prev) => ({ ...prev, preparationTime: event.target.value }))}
          />

          <TextField
            label="Image URL"
            name="imageUrl"
            type="url"
            value={form.imageUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
          />

          <TextField
            label="Spicy level (0-5)"
            max="5"
            min="0"
            name="spicyLevel"
            type="number"
            value={form.spicyLevel}
            onChange={(event) => setForm((prev) => ({ ...prev, spicyLevel: event.target.value }))}
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
            <span className="text-sm font-medium text-slate-700">Available for ordering</span>
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
            <span className="text-sm font-medium text-slate-700">Mark as best selling</span>
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
      </div>
    </Modal>
  );
}
