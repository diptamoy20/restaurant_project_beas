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
import {
  useCreateAdminMenuItemMutation,
  useDeleteAdminMenuItemMutation,
  useGetAdminRestaurantMenuQuery,
  useUpdateAdminMenuItemMutation,
} from '../services/menuApi';

const initialItemForm = {
  name: '',
  description: '',
  price: '',
  discountPrice: '',
  category: '',
  isAvailable: true,
};
const formatCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function MenuPage() {
  const [restaurantId, setRestaurantId] = useState('1');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialItemForm);
  const { data, isLoading, error } = useGetAdminRestaurantMenuQuery(restaurantId);
  const [createMenuItem, createState] = useCreateAdminMenuItemMutation();
  const [updateMenuItem, updateState] = useUpdateAdminMenuItemMutation();
  const [deleteMenuItem, deleteState] = useDeleteAdminMenuItemMutation();

  const categories = useMemo(() => {
    const items = data?.items ?? [];
    return Array.from(new Map(items.map((item) => [item.category?.id, item.category?.name])).entries()).map(
      ([id, name]) => ({
        id,
        name,
      }),
    );
  }, [data?.items]);

  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error ||
    deleteState.error?.data?.message ||
    deleteState.error?.error;

  const handleSubmit = async (event) => {
    event.preventDefault();

    await createMenuItem({
      restaurantId: Number(restaurantId),
      body: {
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
        categoryName: form.category,
        foodType: 'VEG',
        isAvailable: form.isAvailable,
      },
    }).unwrap();
  };

  return (
    <div className="space-y-6">
      <Card
        eyebrow="Menu Management"
        title="Menu items"
        actions={
          <div className="flex flex-wrap gap-3">
            <TextField
              className="min-w-[180px]"
              label="Restaurant ID"
              onChange={(event) => setRestaurantId(event.target.value)}
              value={restaurantId}
            />
            <PermissionGate module="menu" action="create">
              <Button className="self-end" onClick={() => setModalOpen(true)}>
                Add item
              </Button>
            </PermissionGate>
          </div>
        }
      >
        {isLoading ? <Loader label="Loading menu items..." /> : null}
        {error ? <ErrorState message={error?.data?.message || error?.error || 'Menu request failed.'} /> : null}
        {!isLoading && !error && !(data?.items?.length > 0) ? (
          <EmptyState
            description="The selected restaurant returned no available items from the menu API."
            title="No menu items"
          />
        ) : null}

        {data?.items?.length ? (
          <Table
            columns={[
              {
                key: 'name',
                header: 'Item',
                render: (row) => (
                  <div>
                    <p className="font-medium text-slate-900">{row.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.description ?? 'No description available'}</p>
                  </div>
                ),
              },
              { key: 'category', header: 'Category', render: (row) => row.category?.name ?? 'Unassigned' },
              { key: 'price', header: 'Price', render: (row) => formatCurrency.format(row.price) },
              {
                key: 'discountPrice',
                header: 'Discount Price',
                render: (row) => (row.discountPrice != null ? formatCurrency.format(row.discountPrice) : '-'),
              },
              {
                key: 'isAvailable',
                header: 'Availability',
                render: (row) => (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                    {row.isAvailable ? 'Available' : 'Hidden'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <PermissionGate
                    fallback={<span className="text-xs text-slate-400">Read only</span>}
                    module="menu"
                    action="edit"
                  >
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          updateMenuItem({
                            id: row.id,
                            restaurantId: Number(restaurantId),
                            body: {
                              name: row.name,
                              description: row.description ?? undefined,
                              price: row.price,
                              discountPrice: row.discountPrice ?? undefined,
                              categoryName: row.category?.name,
                              foodType: row.foodType ?? 'VEG',
                              isAvailable: row.isAvailable,
                            },
                          })
                        }
                        variant="secondary"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() =>
                          deleteMenuItem({ id: row.id, restaurantId: Number(restaurantId) })
                        }
                        variant="danger"
                      >
                        Delete
                      </Button>
                    </div>
                  </PermissionGate>
                ),
              },
            ]}
            data={data.items}
          />
        ) : null}

        {mutationError ? <ErrorState message={mutationError} /> : null}
      </Card>

      <Card eyebrow="Overview" title="Category distribution">
        {categories.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <div className="rounded-[24px] bg-slate-50 p-4" key={category.id}>
                <p className="font-semibold text-slate-900">{category.name}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {(data.items ?? []).filter((item) => item.category?.id === category.id).length} active items
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Categories are derived from the currently returned menu items."
            title="No category data"
          />
        )}
      </Card>

      <Modal
        footer={
          <>
            <Button onClick={() => setModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={createState.isLoading} form="menu-item-form" type="submit">
              Save item
            </Button>
          </>
        }
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        title="Create menu item"
      >
        <form className="grid gap-4 md:grid-cols-2" id="menu-item-form" onSubmit={handleSubmit}>
          <TextField
            label="Name"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            value={form.name}
          />
          <TextField
            label="Category"
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            value={form.category}
          />
          <TextField
            label="Price (₹)"
            onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            type="number"
            value={form.price}
          />
          <TextField
            label="Discount Price (₹)"
            onChange={(event) => setForm((current) => ({ ...current, discountPrice: event.target.value }))}
            type="number"
            value={form.discountPrice}
          />
          <TextField
            label="Availability"
            onChange={(event) =>
              setForm((current) => ({ ...current, isAvailable: event.target.value === 'true' }))
            }
            value={String(form.isAvailable)}
          />
          <TextField
            className="md:col-span-2"
            label="Description"
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            value={form.description}
          />
        </form>
      </Modal>
    </div>
  );
}

