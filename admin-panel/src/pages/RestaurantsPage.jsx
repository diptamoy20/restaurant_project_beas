import { useState, useRef } from 'react';

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
  useGetAllRestaurantsQuery,
  useCreateRestaurantMutation,
  useUpdateRestaurantMutation,
  useDeleteRestaurantMutation,
} from '../services/restaurantApi';
import { RestaurantMenuModal } from '../components/RestaurantMenuModal.jsx';

const initialFormState = {
  name: '',
  address: '',
  city: '',
  latitude: '',
  longitude: '',
  cuisineType: '',
  description: '',
  imageUrl: '',
  deliveryRadiusKm: '8',
  gstin: '',
  gstRate: '5',
  gstEnabled: true,
  isLocationEnabled: true,
  isActive: true,
};

export function RestaurantsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [menuRestaurant, setMenuRestaurant] = useState(null);
  const [menuMode, setMenuMode] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const { data, isLoading, error } = useGetAllRestaurantsQuery();
  const [createRestaurant, createState] = useCreateRestaurantMutation();
  const [updateRestaurant, updateState] = useUpdateRestaurantMutation();
  const [deleteRestaurant, deleteState] = useDeleteRestaurantMutation();

  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error ||
    deleteState.error?.data?.message ||
    deleteState.error?.error;

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'Restaurant name is required';
    }

    if (!form.address.trim()) {
      newErrors.address = 'Address is required';
    }

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);

    if (!form.latitude || isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.latitude = 'Valid latitude is required (-90 to 90)';
    }

    if (!form.longitude || isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.longitude = 'Valid longitude is required (-180 to 180)';
    }

    const radius = parseFloat(form.deliveryRadiusKm);
    if (!form.deliveryRadiusKm || isNaN(radius) || radius < 0.1) {
      newErrors.deliveryRadiusKm = 'Delivery radius must be at least 0.1 km';
    }

    const gstRate = parseFloat(form.gstRate);
    if (form.gstEnabled && (form.gstRate === '' || isNaN(gstRate) || gstRate < 0 || gstRate > 28)) {
      newErrors.gstRate = 'GST rate must be between 0 and 28';
    }

    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin.trim().toUpperCase())) {
      newErrors.gstin = 'GSTIN must be 15 uppercase letters/numbers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddNew = () => {
    setEditingId(null);
    setForm(initialFormState);
    setErrors({});
    setModalOpen(true);
  };

  const handleEdit = (restaurant) => {
    setEditingId(restaurant.id);
    setForm({
      name: restaurant.name || '',
      address: restaurant.address || '',
      city: restaurant.city || '',
      latitude: restaurant.latitude.toString(),
      longitude: restaurant.longitude.toString(),
      cuisineType: restaurant.cuisineType || '',
      description: restaurant.description || '',
      imageUrl: restaurant.imageUrl || '',
      deliveryRadiusKm: (restaurant.deliveryRadiusKm || 8).toString(),
      gstin: restaurant.gstin || '',
      gstRate: (restaurant.gstRate ?? 5).toString(),
      gstEnabled: restaurant.gstEnabled !== false,
      isLocationEnabled: restaurant.isLocationEnabled !== false,
      isActive: restaurant.isActive !== false,
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting || submittingRef.current) {
      console.log('[DEBUG] Form submission already in progress, ignoring');
      return;
    }

    if (!validateForm()) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    const payload = {
      name: form.name,
      address: form.address,
      city: form.city || undefined,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      cuisineType: form.cuisineType || undefined,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      deliveryRadiusKm: parseFloat(form.deliveryRadiusKm),
      gstin: form.gstin.trim() ? form.gstin.trim().toUpperCase() : undefined,
      gstRate: parseFloat(form.gstRate || '0'),
      gstEnabled: form.gstEnabled,
      isLocationEnabled: form.isLocationEnabled,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await updateRestaurant({ id: editingId, ...payload }).unwrap();
      } else {
        console.log('[DEBUG] Calling createRestaurant API');
        await createRestaurant(payload).unwrap();
        console.log('[DEBUG] createRestaurant API call completed');
      }
      setModalOpen(false);
      setForm(initialFormState);
      setErrors({});
    } catch (err) {
      console.error('Failed to save restaurant:', err);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this restaurant?')) {
      return;
    }

    try {
      await deleteRestaurant(id).unwrap();
    } catch (err) {
      console.error('Failed to delete restaurant:', err);
    }
  };

  const openMenu = (restaurant, mode) => {
    setMenuRestaurant(restaurant);
    setMenuMode(mode);
  };

  return (
    <div className="space-y-6">
      <Card
        eyebrow="Restaurant Management"
        title="Manage Restaurants"
        actions={
          <PermissionGate module="restaurants" action="create">
            <Button onClick={handleAddNew}>Add Restaurant</Button>
          </PermissionGate>
        }
      >
        {isLoading ? <Loader label="Loading restaurants..." /> : null}
        {error ? (
          <ErrorState message={error?.data?.message || error?.error || 'Failed to load restaurants.'} />
        ) : null}
        {!isLoading && !error && !(data?.length > 0) ? (
          <EmptyState
            description="No restaurants added yet. Start by adding your first restaurant."
            title="No restaurants"
          />
        ) : null}

        {data?.length ? (
          <div className="overflow-x-auto">
            <Table
              columns={[
                {
                  key: 'name',
                  header: 'Restaurant',
                  render: (row) => (
                    <div className="flex items-center gap-3">
                      {row.imageUrl ? (
                        <img
                          src={row.imageUrl}
                          alt={row.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-slate-100" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-500">{row.cuisineType || 'Cuisine not specified'}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'address',
                  header: 'Location',
                  render: (row) => (
                    <div>
                      <p className="text-sm text-slate-900">{row.address}</p>
                      <p className="text-xs text-slate-500">
                        {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'deliveryRadiusKm',
                  header: 'Delivery Radius',
                  render: (row) => <span className="text-sm text-slate-700">{row.deliveryRadiusKm} km</span>,
                },
                {
                  key: 'gst',
                  header: 'GST',
                  render: (row) => (
                    <span className="text-sm text-slate-700">
                      {row.gstEnabled === false ? 'Off' : `${row.gstRate ?? 5}%`}
                    </span>
                  ),
                },
                {
                  key: 'isActive',
                  header: 'Status',
                  render: (row) => (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <PermissionGate
                      fallback={<span className="text-xs text-slate-400">Read only</span>}
                      module="restaurants"
                      action="edit"
                    >
                      <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button onClick={() => openMenu(row, 'list')} variant="secondary">
                          All Menu
                        </Button>
                        <Button onClick={() => openMenu(row, 'create')} variant="secondary">
                          Add Menu
                        </Button>
                        <Button onClick={() => handleEdit(row)} variant="secondary">
                          Edit
                        </Button>
                        <PermissionGate module="restaurants" action="delete">
                          <Button onClick={() => handleDelete(row.id)} variant="danger">
                            Delete
                          </Button>
                        </PermissionGate>
                      </div>
                    </PermissionGate>
                  ),
                },
              ]}
              data={data}
            />
          </div>
        ) : null}

        {mutationError ? <ErrorState message={mutationError} /> : null}
      </Card>

      <RestaurantMenuModal
        open={Boolean(menuRestaurant)}
        restaurant={menuRestaurant}
        mode={menuMode}
        onModeChange={setMenuMode}
        onClose={() => setMenuRestaurant(null)}
      />

      <Modal
        footer={
          <div className="flex gap-3">
            <Button onClick={() => setModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || createState.isLoading || updateState.isLoading}
            >
              {isSubmitting || createState.isLoading || updateState.isLoading ? 'Saving...' : 'Save Restaurant'}
            </Button>
          </div>
        }
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        title={editingId ? 'Edit Restaurant' : 'Add New Restaurant'}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <TextField
            error={errors.name}
            label="Restaurant Name *"
            name="name"
            onChange={handleInputChange}
            placeholder="e.g., Downtown Spice Hub"
            value={form.name}
          />

          <TextField
            error={errors.address}
            label="Address *"
            name="address"
            onChange={handleInputChange}
            placeholder="e.g., 45 Residency Road"
            value={form.address}
          />

          <TextField
            label="City"
            name="city"
            onChange={handleInputChange}
            placeholder="e.g., Bangalore"
            value={form.city}
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField
              error={errors.latitude}
              label="Latitude *"
              name="latitude"
              onChange={handleInputChange}
              placeholder="e.g., 12.9663"
              step="any"
              type="number"
              value={form.latitude}
            />

            <TextField
              error={errors.longitude}
              label="Longitude *"
              name="longitude"
              onChange={handleInputChange}
              placeholder="e.g., 77.6012"
              step="any"
              type="number"
              value={form.longitude}
            />
          </div>

          <TextField
            label="Cuisine Type"
            name="cuisineType"
            onChange={handleInputChange}
            placeholder="e.g., North Indian, Chinese"
            value={form.cuisineType}
          />

          <TextField
            label="Description"
            name="description"
            onChange={handleInputChange}
            placeholder="Brief description of the restaurant"
            value={form.description}
          />

          <TextField
            label="Image URL"
            name="imageUrl"
            onChange={handleInputChange}
            placeholder="https://example.com/restaurant-image.jpg"
            type="url"
            value={form.imageUrl}
          />

          <TextField
            error={errors.deliveryRadiusKm}
            label="Delivery Radius (km) *"
            min="0.1"
            name="deliveryRadiusKm"
            onChange={handleInputChange}
            placeholder="e.g., 10"
            step="0.1"
            type="number"
            value={form.deliveryRadiusKm}
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField
              error={errors.gstin}
              label="GSTIN"
              name="gstin"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, gstin: event.target.value.toUpperCase() }))
              }
              placeholder="29ABCDE1234F1Z5"
              value={form.gstin}
            />

            <TextField
              error={errors.gstRate}
              label="GST Rate (%)"
              min="0"
              max="28"
              name="gstRate"
              onChange={handleInputChange}
              step="0.01"
              type="number"
              value={form.gstRate}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                checked={form.gstEnabled}
                className="h-4 w-4 rounded border-slate-300"
                name="gstEnabled"
                onChange={handleInputChange}
                type="checkbox"
              />
              <span className="text-sm font-medium text-slate-700">Enable GST billing</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                checked={form.isLocationEnabled}
                className="h-4 w-4 rounded border-slate-300"
                name="isLocationEnabled"
                onChange={handleInputChange}
                type="checkbox"
              />
              <span className="text-sm font-medium text-slate-700">Enable location-based delivery</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                checked={form.isActive}
                className="h-4 w-4 rounded border-slate-300"
                name="isActive"
                onChange={handleInputChange}
                type="checkbox"
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
