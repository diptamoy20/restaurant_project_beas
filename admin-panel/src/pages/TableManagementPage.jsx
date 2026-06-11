import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import { Modal } from '../components/ui/Modal';
import { SelectField } from '../components/ui/SelectField';
import { Table } from '../components/ui/Table';
import { TextField } from '../components/ui/TextField';
import {
  useCreateRestaurantTableMutation,
  useDeleteRestaurantTableMutation,
  useGetAllRestaurantsQuery,
  useGetRestaurantTablesQuery,
  useUpdateRestaurantTableMutation,
} from '../services/restaurantApi';
import { loadPersistedAuth } from '../utils/auth';

const tableStatusOptions = [
  { label: 'ACTIVE', value: 'ACTIVE' },
  { label: 'INACTIVE', value: 'INACTIVE' },
];

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api').replace(/\/$/, '');

function getAuthToken() {
  const auth = loadPersistedAuth();
  return auth?.token ?? auth?.accessToken ?? null;
}

function buildQrDownloadFilename(table) {
  const normalized = table.tableNumber?.replace(/[^a-zA-Z0-9-_]/g, '-') || String(table.id);
  return `table-${normalized}.svg`;
}

async function fetchQrUrl(restaurantId, tableId) {
  const token = getAuthToken();
  const response = await fetch(`${apiBaseUrl}/restaurants/${restaurantId}/tables/${tableId}/qr`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-client-type': 'web',
    },
  });
  const payload = await response.json();
  return payload?.data?.qrUrl ?? payload?.qrUrl;
}

async function downloadQrSvg(restaurantId, tableId, filename) {
  const token = getAuthToken();
  const response = await fetch(
    `${apiBaseUrl}/restaurants/${restaurantId}/tables/${tableId}/qr/download?format=svg`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-client-type': 'web',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Unable to download QR code');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function TableManagementPage() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [formState, setFormState] = useState({ tableNumber: '', status: 'ACTIVE' });
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const {
    data: restaurants = [],
    isLoading: isRestaurantsLoading,
    error: restaurantsError,
  } = useGetAllRestaurantsQuery();

  const {
    data: tables = [],
    isLoading: isTablesLoading,
    error: tablesError,
  } = useGetRestaurantTablesQuery(selectedRestaurantId, {
    skip: !selectedRestaurantId,
  });

  const [createRestaurantTable, { isLoading: isCreating }] = useCreateRestaurantTableMutation();
  const [updateRestaurantTable, { isLoading: isUpdating }] = useUpdateRestaurantTableMutation();
  const [deleteRestaurantTable, { isLoading: isDeleting }] = useDeleteRestaurantTableMutation();

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => String(restaurant.id) === String(selectedRestaurantId)),
    [restaurants, selectedRestaurantId],
  );

  const isBusy = isCreating || isUpdating || isDeleting;

  const resetForm = () => {
    setSelectedTable(null);
    setFormState({ tableNumber: '', status: 'ACTIVE' });
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (table) => {
    setSelectedTable(table);
    setFormState({ tableNumber: table.tableNumber || '', status: table.status || 'ACTIVE' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleFormChange = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSaveTable = async (event) => {
    event.preventDefault();

    if (!selectedRestaurantId || !formState.tableNumber.trim()) {
      return;
    }

    const payload = {
      tableNumber: formState.tableNumber.trim(),
      status: formState.status,
    };

    try {
      if (selectedTable) {
        await updateRestaurantTable({
          restaurantId: Number(selectedRestaurantId),
          tableId: selectedTable.id,
          data: payload,
        }).unwrap();
        setFeedbackMessage('Table updated successfully.');
      } else {
        await createRestaurantTable({
          restaurantId: Number(selectedRestaurantId),
          data: payload,
        }).unwrap();
        setFeedbackMessage('Table created successfully.');
      }

      closeModal();
    } catch (error) {
      setFeedbackMessage('Failed to save table. Please try again.');
    }
  };

  const handleDeleteTable = async (table) => {
    if (!selectedRestaurantId || !window.confirm('Delete this table?')) {
      return;
    }

    try {
      await deleteRestaurantTable({
        restaurantId: Number(selectedRestaurantId),
        tableId: table.id,
      }).unwrap();
      setFeedbackMessage('Table deleted successfully.');
    } catch (error) {
      setFeedbackMessage('Failed to delete table. Please try again.');
    }
  };

  const handleCopyQrLink = async (table) => {
    if (!selectedRestaurantId) {
      return;
    }

    try {
      const qrUrl = await fetchQrUrl(selectedRestaurantId, table.id);
      if (!qrUrl) {
        throw new Error('QR link unavailable');
      }

      await navigator.clipboard.writeText(qrUrl);
      setFeedbackMessage('Table QR link copied.');
    } catch (error) {
      setFeedbackMessage('Unable to copy QR link.');
    }
  };

  const handleDownloadQrCode = async (table) => {
    if (!selectedRestaurantId) {
      return;
    }

    try {
      await downloadQrSvg(selectedRestaurantId, table.id, buildQrDownloadFilename(table));
      setFeedbackMessage('QR code downloaded.');
    } catch (error) {
      setFeedbackMessage('Unable to download QR code.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Table Management</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage restaurant tables, edit statuses, and share QR access for dine-in ordering.
          </p>
        </div>
        <Button disabled={!selectedRestaurantId || isBusy} onClick={openCreateModal}>
          Add new table
        </Button>
      </div>

      <Card eyebrow="Restaurant" title="Select restaurant">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div>
            <SelectField
              label="Restaurant"
              value={selectedRestaurantId}
              options={[
                { value: '', label: 'Select a restaurant' },
                ...restaurants.map((restaurant) => ({
                  value: String(restaurant.id),
                  label: restaurant.name,
                })),
              ]}
              onChange={(event) => {
                setSelectedRestaurantId(event.target.value);
                setFeedbackMessage('');
              }}
            />
          </div>
          <div className="text-sm text-slate-500">
            {selectedRestaurant ? (
              <p>
                Selected restaurant: <strong>{selectedRestaurant.name}</strong>
              </p>
            ) : (
              <p>Select a restaurant to load table management.</p>
            )}
          </div>
        </div>
      </Card>

      <Card eyebrow="Tables" title="Restaurant tables">
        {restaurantsError ? (
          <ErrorState
            message={
              restaurantsError?.data?.message || restaurantsError?.error || 'Unable to load restaurants.'
            }
          />
        ) : null}

        {!selectedRestaurantId ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Select a restaurant from the dropdown above to view and manage tables.
          </div>
        ) : isTablesLoading ? (
          <Loader label="Loading tables..." />
        ) : tablesError ? (
          <ErrorState
            message={tablesError?.data?.message || tablesError?.error || 'Unable to load tables.'}
          />
        ) : tables.length === 0 ? (
          <EmptyState
            title="No tables yet"
            description="Create tables to generate QR ordering links for this restaurant."
          />
        ) : (
          <Table
            data={tables}
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'tableNumber', header: 'Table' },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      row.status === 'INACTIVE'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {row.status || 'ACTIVE'}
                  </span>
                ),
              },
              {
                key: 'qrActions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button className="px-3 py-1.5 text-xs" variant="secondary" onClick={(event) => { event.stopPropagation(); openEditModal(row); }}>
                      Edit
                    </Button>
                    <Button className="px-3 py-1.5 text-xs" variant="secondary" onClick={(event) => { event.stopPropagation(); handleCopyQrLink(row); }}>
                      Copy link
                    </Button>
                    <Button className="px-3 py-1.5 text-xs" variant="secondary" onClick={(event) => { event.stopPropagation(); handleDownloadQrCode(row); }}>
                      Download QR
                    </Button>
                    <Button className="px-3 py-1.5 text-xs" variant="danger" onClick={(event) => { event.stopPropagation(); handleDeleteTable(row); }}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}

        {feedbackMessage ? (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {feedbackMessage}
          </div>
        ) : null}
      </Card>

      <Modal open={isModalOpen} onClose={closeModal} title={selectedTable ? 'Edit table' : 'Create table'}>
        <form onSubmit={handleSaveTable} className="space-y-4">
          <TextField
            label="Table number"
            value={formState.tableNumber}
            onChange={(event) => handleFormChange('tableNumber', event.target.value)}
            placeholder="E.g. T1 or Table 1"
          />

          <SelectField
            label="Status"
            value={formState.status}
            options={tableStatusOptions}
            onChange={(event) => handleFormChange('status', event.target.value)}
          />

          <div className="flex flex-wrap gap-3 pt-4">
            <Button type="submit" disabled={isBusy || !formState.tableNumber.trim()}>
              {selectedTable ? 'Save changes' : 'Create table'}
            </Button>
            <Button variant="secondary" type="button" onClick={closeModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
