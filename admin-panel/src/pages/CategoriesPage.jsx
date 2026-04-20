import { useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { TextField } from '../components/ui/TextField';
import { PermissionGate } from '../components/PermissionGate';
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetMenuByRestaurantQuery,
  useUpdateCategoryMutation,
} from '../services/menuApi';

export function CategoriesPage() {
  const [restaurantId, setRestaurantId] = useState('1');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const { data } = useGetMenuByRestaurantQuery(restaurantId);
  const [createCategory, createState] = useCreateCategoryMutation();
  const [updateCategory, updateState] = useUpdateCategoryMutation();
  const [deleteCategory, deleteState] = useDeleteCategoryMutation();

  const categoryMap = new Map();
  (data?.items ?? []).forEach((item) => {
    if (item.category?.id) {
      categoryMap.set(item.category.id, {
        id: item.category.id,
        name: item.category.name,
        items: (categoryMap.get(item.category.id)?.items ?? 0) + 1,
      });
    }
  });
  const categories = Array.from(categoryMap.values());

  const mutationError =
    createState.error?.error ||
    updateState.error?.error ||
    deleteState.error?.error ||
    createState.error?.data?.message ||
    updateState.error?.data?.message ||
    deleteState.error?.data?.message;

  return (
    <div className="space-y-6">
      <Card
        eyebrow="Category Management"
        title="Categories"
        actions={
          <div className="flex flex-wrap gap-3">
            <TextField
              className="min-w-[180px]"
              label="Restaurant ID"
              onChange={(event) => setRestaurantId(event.target.value)}
              value={restaurantId}
            />
            <PermissionGate module="categories" action="create">
              <Button className="self-end" onClick={() => setOpen(true)}>
                Create category
              </Button>
            </PermissionGate>
          </div>
        }
      >
        {categories.length ? (
          <Table
            columns={[
              { key: 'name', header: 'Category' },
              { key: 'items', header: 'Active Items' },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <PermissionGate fallback={<span className="text-xs text-slate-400">Read only</span>} module="categories" action="edit">
                    <div className="flex gap-2">
                      <Button onClick={() => updateCategory(row)} variant="secondary">
                        Edit
                      </Button>
                      <Button onClick={() => deleteCategory(row.id)} variant="danger">
                        Delete
                      </Button>
                    </div>
                  </PermissionGate>
                ),
              },
            ]}
            data={categories}
          />
        ) : (
          <EmptyState
            description="Categories are inferred from the menu payload until dedicated category APIs are available."
            title="No categories"
          />
        )}

        {mutationError ? <ErrorState message={mutationError} /> : null}
      </Card>

      <Modal
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button form="create-category-form" type="submit">
              Save category
            </Button>
          </>
        }
        onClose={() => setOpen(false)}
        open={open}
        title="Create category"
      >
        <form
          id="create-category-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await createCategory({ restaurantId, name });
          }}
        >
          <TextField label="Category name" onChange={(event) => setName(event.target.value)} value={name} />
        </form>
      </Modal>
    </div>
  );
}

