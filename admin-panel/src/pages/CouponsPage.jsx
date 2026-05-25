import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

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
  useCreateCouponMutation,
  useCreateCouponsBulkMutation,
  useDeleteCouponMutation,
  useListCouponsQuery,
  useUpdateCouponMutation,
} from '../services/couponApi';
import { useGetAllRestaurantsQuery } from '../services/restaurantApi';
import { canAccess } from '../routes/accessControl';

const emptyForm = {
  code: '',
  description: '',
  restaurantId: '',
  restaurantIds: ['__global__'],
  discountType: 'PERCENTAGE',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '',
  startsAt: '',
  expiresAt: '',
  usageLimitTotal: '',
  usageLimitPerUser: '',
  isActive: true,
};

const formatCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

function toLocalInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function toForm(coupon) {
  return {
    code: coupon.code ?? '',
    description: coupon.description ?? '',
    restaurantId: coupon.restaurantId ? String(coupon.restaurantId) : '',
    restaurantIds: coupon.restaurantId ? [String(coupon.restaurantId)] : [],
    discountType: coupon.discountType ?? 'PERCENTAGE',
    discountValue: String(coupon.discountValue ?? ''),
    maxDiscountAmount: coupon.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : '',
    minOrderAmount: coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : '',
    startsAt: toLocalInputValue(coupon.startsAt),
    expiresAt: toLocalInputValue(coupon.expiresAt),
    usageLimitTotal: coupon.usageLimitTotal != null ? String(coupon.usageLimitTotal) : '',
    usageLimitPerUser: coupon.usageLimitPerUser != null ? String(coupon.usageLimitPerUser) : '',
    isActive: coupon.isActive !== false,
  };
}

export function CouponsPage() {
  const permissions = useSelector((state) => state.auth.permissions);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [filters, setFilters] = useState({ search: '', status: 'active', restaurantId: '' });
  const [deletingCouponId, setDeletingCouponId] = useState(null);
  const [restaurantPickerOpen, setRestaurantPickerOpen] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const query = useMemo(
    () => ({
      status: filters.status,
      search: filters.search || undefined,
      restaurantId: filters.restaurantId || undefined,
      limit: 50,
    }),
    [filters],
  );
  const { data, isLoading, error } = useListCouponsQuery(query);
  const { data: restaurants = [], isLoading: restaurantsLoading } = useGetAllRestaurantsQuery();
  const [createCoupon, createState] = useCreateCouponMutation();
  const [createCouponsBulk, bulkCreateState] = useCreateCouponsBulkMutation();
  const [updateCoupon, updateState] = useUpdateCouponMutation();
  const [deleteCoupon, deleteState] = useDeleteCouponMutation();
  const coupons = data?.items ?? [];
  const canDeleteCoupons = canAccess(permissions, 'coupons', 'delete');
  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    bulkCreateState.error?.data?.message ||
    bulkCreateState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error ||
    deleteState.error?.data?.message ||
    deleteState.error?.error;
  const restaurantOptions = useMemo(
    () => [
      { value: '', label: 'All restaurants' },
      ...restaurants.map((restaurant) => ({
        value: String(restaurant.id),
        label: `${restaurant.name} #${restaurant.id}`,
      })),
    ],
    [restaurants],
  );
  const restaurantNameById = useMemo(
    () => new Map(restaurants.map((restaurant) => [restaurant.id, restaurant.name])),
    [restaurants],
  );
  const restaurantMultiOptions = useMemo(
    () =>
      restaurants.map((restaurant) => ({
        value: String(restaurant.id),
        label: `${restaurant.name} #${restaurant.id}`,
      })),
    [restaurants],
  );
  const filteredRestaurantOptions = useMemo(() => {
    const search = restaurantSearch.trim().toLowerCase();
    if (!search) {
      return restaurantMultiOptions;
    }

    return restaurantMultiOptions.filter((option) => option.label.toLowerCase().includes(search));
  }, [restaurantMultiOptions, restaurantSearch]);

  const openCreate = () => {
    setEditingCoupon(null);
    setForm(emptyForm);
    setFormErrors({});
    setRestaurantSearch('');
    setRestaurantPickerOpen(false);
    setModalOpen(true);
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setForm(toForm(coupon));
    setFormErrors({});
    setRestaurantSearch('');
    setRestaurantPickerOpen(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCoupon(null);
    setRestaurantPickerOpen(false);
    setRestaurantSearch('');
    setFormErrors({});
  };

  const buildPayload = () => {
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      usageLimitTotal: form.usageLimitTotal ? Number(form.usageLimitTotal) : undefined,
      usageLimitPerUser: form.usageLimitPerUser ? Number(form.usageLimitPerUser) : undefined,
      isActive: form.isActive,
    };

    if (editingCoupon) {
      payload.restaurantId = form.restaurantId ? Number(form.restaurantId) : null;
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateCouponForm();

    if (Object.keys(validationErrors).length) {
      setFormErrors(validationErrors);
      return;
    }

    const payload = buildPayload();
    const selectedRestaurantIds = form.restaurantIds.filter((restaurantId) => restaurantId !== '__global__');

    if (editingCoupon) {
      await updateCoupon({ id: editingCoupon.id, ...payload }).unwrap();
    } else if (selectedRestaurantIds.length > 1) {
      await createCouponsBulk({
        ...payload,
        restaurantIds: selectedRestaurantIds.map((restaurantId) => Number(restaurantId)),
      }).unwrap();
    } else if (selectedRestaurantIds.length === 1) {
      await createCoupon({
        ...payload,
        restaurantId: Number(selectedRestaurantIds[0]),
      }).unwrap();
    } else {
      await createCoupon(payload).unwrap();
    }

    setModalOpen(false);
    setEditingCoupon(null);
    setRestaurantPickerOpen(false);
    setRestaurantSearch('');
    setFormErrors({});
    setForm(emptyForm);
  };

  const handleDelete = async (coupon) => {
    const confirmed = window.confirm(
      `Delete coupon ${coupon.code}? Coupons already used by orders will be disabled instead.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingCouponId(coupon.id);
    try {
      await deleteCoupon(coupon.id).unwrap();
    } finally {
      setDeletingCouponId(null);
    }
  };

  const toggleRestaurantSelection = (restaurantId) => {
    setForm((current) => {
      const nextIds = current.restaurantIds.includes(restaurantId)
        ? current.restaurantIds.filter((id) => id !== restaurantId)
        : [...current.restaurantIds.filter((id) => id !== '__global__'), restaurantId];

      return {
        ...current,
        restaurantIds: nextIds.length ? nextIds : ['__global__'],
      };
    });
  };

  const selectedRestaurantIds = form.restaurantIds.filter((restaurantId) => restaurantId !== '__global__');
  const restaurantPickerLabel = selectedRestaurantIds.length
    ? `${selectedRestaurantIds.length} restaurant${selectedRestaurantIds.length > 1 ? 's' : ''} selected`
    : 'All restaurants';
  const selectedRestaurantNames = selectedRestaurantIds
    .map((restaurantId) => restaurantNameById.get(Number(restaurantId)) ?? `Restaurant #${restaurantId}`)
    .slice(0, 4);
  const extraRestaurantCount = Math.max(selectedRestaurantIds.length - selectedRestaurantNames.length, 0);
  const discountValue = Number(form.discountValue);
  const maxDiscountAmount = Number(form.maxDiscountAmount);
  const minOrderAmount = Number(form.minOrderAmount);
  const sampleBaseAmount = Number.isFinite(minOrderAmount) && minOrderAmount > 0 ? minOrderAmount : 500;
  const estimatedDiscount =
    Number.isFinite(discountValue) && discountValue > 0
      ? form.discountType === 'PERCENTAGE'
        ? Math.min(
            (sampleBaseAmount * discountValue) / 100,
            Number.isFinite(maxDiscountAmount) && maxDiscountAmount > 0 ? maxDiscountAmount : Infinity,
          )
        : Math.min(discountValue, sampleBaseAmount)
      : 0;
  const couponSummary = form.code.trim()
    ? `${form.code.trim().toUpperCase()} gives ${
        form.discountType === 'PERCENTAGE'
          ? `${form.discountValue || 0}% off${form.maxDiscountAmount ? ` up to ${formatCurrency.format(Number(form.maxDiscountAmount))}` : ''}`
          : `${formatCurrency.format(Number(form.discountValue || 0))} off`
      }`
    : 'Enter coupon details to preview the offer';
  const isSaving = createState.isLoading || bulkCreateState.isLoading || updateState.isLoading;

  function validateCouponForm() {
    const errors = {};
    const code = form.code.trim();
    const startDate = form.startsAt ? new Date(form.startsAt) : null;
    const endDate = form.expiresAt ? new Date(form.expiresAt) : null;
    const value = Number(form.discountValue);

    if (!code) {
      errors.code = 'Coupon code is required.';
    } else if (!/^[A-Z0-9_-]+$/i.test(code)) {
      errors.code = 'Use only letters, numbers, underscore, or hyphen.';
    }
    if (!form.discountValue || Number.isNaN(value) || value <= 0) {
      errors.discountValue = 'Enter a valid discount value.';
    } else if (form.discountType === 'PERCENTAGE' && value > 100) {
      errors.discountValue = 'Percentage cannot be more than 100.';
    }
    if (form.maxDiscountAmount && (Number.isNaN(Number(form.maxDiscountAmount)) || Number(form.maxDiscountAmount) < 0)) {
      errors.maxDiscountAmount = 'Max discount cannot be negative.';
    }
    if (form.minOrderAmount && (Number.isNaN(Number(form.minOrderAmount)) || Number(form.minOrderAmount) < 0)) {
      errors.minOrderAmount = 'Minimum order cannot be negative.';
    }
    if (form.usageLimitTotal && (Number.isNaN(Number(form.usageLimitTotal)) || Number(form.usageLimitTotal) < 1)) {
      errors.usageLimitTotal = 'Total limit must be at least 1.';
    }
    if (form.usageLimitPerUser && (Number.isNaN(Number(form.usageLimitPerUser)) || Number(form.usageLimitPerUser) < 1)) {
      errors.usageLimitPerUser = 'Per user limit must be at least 1.';
    }
    if (startDate && Number.isNaN(startDate.getTime())) {
      errors.startsAt = 'Start date is invalid.';
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      errors.expiresAt = 'Expiry date is invalid.';
    }
    if (startDate && endDate && endDate <= startDate) {
      errors.expiresAt = 'Expiry must be after start date.';
    }

    return errors;
  }

  const setCouponField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => {
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  };

  return (
    <div className="space-y-6">
      <Card
        eyebrow="Offers"
        title="Coupons"
        actions={<Button onClick={openCreate}>Add Coupon</Button>}
      >
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <TextField
            label="Search"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <SelectField
            label="Restaurant"
            value={filters.restaurantId}
            onChange={(event) => setFilters((current) => ({ ...current, restaurantId: event.target.value }))}
            options={restaurantOptions}
          />
          <SelectField
            label="Status"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>

        {isLoading || restaurantsLoading ? <Loader label="Loading coupons..." /> : null}
        {error ? <ErrorState message={error?.data?.message || error?.error || 'Coupons request failed.'} /> : null}
        {mutationError ? <ErrorState message={mutationError} /> : null}
        {!isLoading && !error && !coupons.length ? (
          <EmptyState title="No coupons" description="Create coupons to offer checkout discounts." />
        ) : null}

        {coupons.length ? (
          <Table
            columns={[
              { key: 'code', header: 'Code' },
              {
                key: 'restaurantId',
                header: 'Restaurant',
                render: (row) =>
                  row.restaurantId ? (restaurantNameById.get(row.restaurantId) ?? `#${row.restaurantId}`) : 'All',
              },
              {
                key: 'discount',
                header: 'Discount',
                render: (row) =>
                  row.discountType === 'PERCENTAGE'
                    ? `${row.discountValue}%${row.maxDiscountAmount ? ` up to ${formatCurrency.format(row.maxDiscountAmount)}` : ''}`
                    : formatCurrency.format(row.discountValue),
              },
              { key: 'minOrderAmount', header: 'Min Order', render: (row) => row.minOrderAmount ? formatCurrency.format(row.minOrderAmount) : '-' },
              { key: 'usageCount', header: 'Used' },
              { key: 'isActive', header: 'Status', render: (row) => (row.isActive ? 'Active' : 'Inactive') },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex gap-2">
                    <Button className="px-3 py-1.5 text-xs" variant="secondary" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    {canDeleteCoupons ? (
                      <Button
                        className="px-3 py-1.5 text-xs"
                        disabled={deletingCouponId === row.id}
                        variant="danger"
                        onClick={() => handleDelete(row)}
                      >
                        {deletingCouponId === row.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            data={coupons}
          />
        ) : null}
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        maxWidth="max-w-4xl"
        title={editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              {editingCoupon ? 'Changes affect this coupon only.' : selectedRestaurantIds.length > 1 ? `${selectedRestaurantIds.length} coupons will be created.` : 'One coupon will be created.'}
            </div>
            <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="coupon-form"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Coupon'}
            </Button>
            </div>
          </div>
        }
      >
        <form id="coupon-form" className="grid gap-5" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview</p>
                <h4 className="mt-1 text-base font-semibold text-slate-950">{couponSummary}</h4>
                <p className="mt-1 text-sm text-slate-500">
                  Estimated discount on {formatCurrency.format(sampleBaseAmount)} order: {formatCurrency.format(estimatedDiscount || 0)}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${form.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <section className="grid gap-4 rounded-2xl border border-slate-200 p-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-950">Offer basics</h4>
              <p className="text-sm text-slate-500">Name the coupon and choose where customers can use it.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                error={formErrors.code}
                label="Coupon Code"
                value={form.code}
                onChange={(event) => setCouponField('code', event.target.value.toUpperCase().replace(/\s+/g, ''))}
                placeholder="WELCOME50"
                required
              />
              {editingCoupon ? (
                <SelectField
                  label="Restaurant Scope"
                  value={form.restaurantId}
                  onChange={(event) => setCouponField('restaurantId', event.target.value)}
                  options={restaurantOptions}
                />
              ) : (
                <div className="relative block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">Restaurant Scope</span>
                  <button
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    type="button"
                    onClick={() => setRestaurantPickerOpen((open) => !open)}
                  >
                    <span>{restaurantPickerLabel}</span>
                    <span className="text-slate-400">v</span>
                  </button>
                  {restaurantPickerOpen ? (
                    <div className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <input
                        className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                        placeholder="Search restaurant"
                        value={restaurantSearch}
                        onChange={(event) => setRestaurantSearch(event.target.value)}
                      />
                      <div className="mb-2 flex gap-2">
                        <button
                          className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 shadow-none"
                          type="button"
                          onClick={() => setCouponField('restaurantIds', ['__global__'])}
                        >
                          All restaurants
                        </button>
                        <button
                          className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 shadow-none"
                          type="button"
                          onClick={() => setCouponField('restaurantIds', filteredRestaurantOptions.map((option) => option.value))}
                        >
                          Select visible
                        </button>
                      </div>
                      {!filteredRestaurantOptions.length ? (
                        <p className="px-3 py-2 text-sm text-slate-500">No restaurants found.</p>
                      ) : null}
                      {filteredRestaurantOptions.map((option) => (
                        <label
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
                          key={option.value}
                        >
                          <input
                            type="checkbox"
                            checked={form.restaurantIds.includes(option.value)}
                            onChange={() => toggleRestaurantSelection(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {selectedRestaurantNames.length ? `${selectedRestaurantNames.join(', ')}${extraRestaurantCount ? ` +${extraRestaurantCount} more` : ''}` : 'Creates one global coupon for all restaurants.'}
                  </p>
                </div>
              )}
              <TextField
                className="md:col-span-2"
                label="Description"
                value={form.description}
                onChange={(event) => setCouponField('description', event.target.value)}
                placeholder="Short note shown internally and useful for offer tracking"
              />
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-slate-200 p-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-950">Discount rules</h4>
              <p className="text-sm text-slate-500">Use a cap for percentage offers to protect margin.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Discount Type"
                value={form.discountType}
                onChange={(event) => setCouponField('discountType', event.target.value)}
                options={[
                  { value: 'PERCENTAGE', label: 'Percentage' },
                  { value: 'FLAT', label: 'Flat amount' },
                ]}
              />
              <TextField
                error={formErrors.discountValue}
                label={form.discountType === 'PERCENTAGE' ? 'Discount Percent' : 'Discount Amount'}
                min="0"
                max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                step="0.01"
                type="number"
                value={form.discountValue}
                onChange={(event) => setCouponField('discountValue', event.target.value)}
                placeholder={form.discountType === 'PERCENTAGE' ? '10' : '100'}
                required
              />
              <TextField
                error={formErrors.maxDiscountAmount}
                label="Max Discount Cap"
                min="0"
                step="0.01"
                type="number"
                value={form.maxDiscountAmount}
                onChange={(event) => setCouponField('maxDiscountAmount', event.target.value)}
                placeholder={form.discountType === 'PERCENTAGE' ? 'Recommended' : 'Optional'}
              />
              <TextField
                error={formErrors.minOrderAmount}
                label="Minimum Order"
                min="0"
                step="0.01"
                type="number"
                value={form.minOrderAmount}
                onChange={(event) => setCouponField('minOrderAmount', event.target.value)}
                placeholder="299"
              />
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-slate-200 p-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-950">Schedule and limits</h4>
              <p className="text-sm text-slate-500">Leave dates or limits empty when the coupon should stay open.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField error={formErrors.startsAt} label="Starts At" type="datetime-local" value={form.startsAt} onChange={(event) => setCouponField('startsAt', event.target.value)} />
              <TextField error={formErrors.expiresAt} label="Expires At" type="datetime-local" value={form.expiresAt} onChange={(event) => setCouponField('expiresAt', event.target.value)} />
              <TextField error={formErrors.usageLimitTotal} label="Total Usage Limit" min="1" type="number" value={form.usageLimitTotal} onChange={(event) => setCouponField('usageLimitTotal', event.target.value)} placeholder="500" />
              <TextField error={formErrors.usageLimitPerUser} label="Per User Limit" min="1" type="number" value={form.usageLimitPerUser} onChange={(event) => setCouponField('usageLimitPerUser', event.target.value)} placeholder="1" />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <label className="flex items-start gap-3">
              <input
                className="mt-1"
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setCouponField('isActive', event.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Make coupon active</span>
                <span className="block text-sm text-slate-500">Inactive coupons are saved but hidden from checkout.</span>
              </span>
            </label>
          </section>
        </form>
      </Modal>
    </div>
  );
}
