import { useMemo, useState, useEffect } from 'react';
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
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetUsersQuery,
  useUpdatePasswordMutation,
  useUpdateStatusMutation,
  useUpdateUserMutation,
  useUploadStaffProfileImageMutation,
} from '../services/userApi';
import { defaultPermissionsByRole, roleLabelMap } from '../utils/auth';
import { IMAGE_UPLOAD_ACCEPT, validateImageFile } from '../utils/imageUpload';

const roleOptions = [
  { value: 'manager', label: 'Manager' },
  { value: 'delivery_boy', label: 'Delivery boy' },
  { value: 'admin', label: 'Admin' },
];

const capabilityModules = [
  { key: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { key: 'orders', label: 'Orders', actions: ['view', 'accept', 'reject', 'complete'] },
  { key: 'restaurants', label: 'Restaurants', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'categories', label: 'Categories', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'coupons', label: 'Coupons', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'customers', label: 'Customers', actions: ['view'] },
  { key: 'payments', label: 'Payments', actions: ['view', 'filter'] },
  { key: 'staff', label: 'Staff', actions: ['view', 'create', 'edit', 'delete', 'assign'] },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[1-9]\d{7,14}$/;
const phoneHelpText = 'Use 8 to 15 digits, with optional + country code.';
const vehicleNumberPattern = /^[A-Za-z0-9 -]{4,20}$/;

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const vehicleTypeOptions = [
  { value: '', label: 'Select vehicle type' },
  { value: 'BIKE', label: 'Bike' },
  { value: 'SCOOTER', label: 'Scooter' },
  { value: 'CYCLE', label: 'Cycle' },
  { value: 'CAR', label: 'Car' },
  { value: 'OTHER', label: 'Other' },
];

function normalizePhoneInput(value) {
  const trimmed = value.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '').slice(0, 15);

  return `${hasLeadingPlus ? '+' : ''}${digits}`;
}

function roleDefaults(role) {
  return JSON.parse(JSON.stringify(defaultPermissionsByRole[role] ?? {}));
}

function createFormState(role = 'manager') {
  return {
    name: '',
    email: '',
    phone: '',
    profileImageUrl: '',
    password: '',
    role,
    permissions: roleDefaults(role),
    deliveryAgent: {
      isVerified: false,
      address: '',
      dateOfBirth: '',
      gender: '',
      emergencyContact: '',
      vehicleType: '',
      vehicleNumber: '',
      vehicleBrand: '',
      vehicleColor: '',
    },
  };
}

function getPrimaryRole(user) {
  return user?.role ?? 'manager';
}

function getCapabilitySummary(permissions = {}) {
  return capabilityModules
    .filter((module) => permissions[module.key]?.length)
    .map((module) => module.label)
    .join(', ');
}

function permissionsMatch(left = {}, right = {}) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    const leftActions = [...(left[key] ?? [])].sort();
    const rightActions = [...(right[key] ?? [])].sort();

    if (leftActions.length !== rightActions.length) {
      return false;
    }

    if (leftActions.some((action, index) => action !== rightActions[index])) {
      return false;
    }
  }

  return true;
}

export function StaffPage() {
  const currentUserId = useSelector((state) => state.auth.user?.id);
  const { data: users = [], isLoading, error: listError } = useGetUsersQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [permissionMode, setPermissionMode] = useState('default');
  const [form, setForm] = useState(() => createFormState());
  const [formErrors, setFormErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [createUser, createState] = useCreateUserMutation();
  const [updateUser, updateState] = useUpdateUserMutation();
  const [uploadStaffProfileImage, uploadImageState] = useUploadStaffProfileImageMutation();
  const [updatePassword, passwordState] = useUpdatePasswordMutation();
  const [updateStatus, statusState] = useUpdateStatusMutation();
  const [deleteUser, deleteState] = useDeleteUserMutation();

  const editingUser = users.find((user) => user.id === editingId) ?? null;
  const isEditing = Boolean(editingUser);
  const isBusy =
    createState.isLoading ||
    updateState.isLoading ||
    uploadImageState.isLoading ||
    passwordState.isLoading ||
    statusState.isLoading ||
    deleteState.isLoading;

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.isActive !== false).length,
      delivery: users.filter((user) => user.role === 'delivery_boy').length,
    }),
    [users],
  );

  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error ||
    uploadImageState.error?.data?.message ||
    uploadImageState.error?.error ||
    passwordState.error?.data?.message ||
    passwordState.error?.error ||
    statusState.error?.data?.message ||
    statusState.error?.error ||
    deleteState.error?.data?.message ||
    deleteState.error?.error;

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => {
      const { [name]: _removed, ...next } = current;
      return next;
    });
  };

  const setDeliveryAgentField = (name, value) => {
    setForm((current) => ({
      ...current,
      deliveryAgent: {
        ...current.deliveryAgent,
        [name]: value,
      },
    }));
    setFormErrors((current) => {
      const { [name]: _removed, ...next } = current;
      return next;
    });
  };

  const handleRoleChange = (role) => {
    setForm((current) => ({
      ...current,
      role,
      permissions: roleDefaults(role),
    }));
    setPermissionMode('default');
  };

  const canUseAction = (module, action) => {
    if (form.role === 'admin') {
      return true;
    }

    return Boolean(defaultPermissionsByRole[form.role]?.[module]?.includes(action));
  };

  const toggleCapability = (module, action) => {
    if (!canUseAction(module, action)) {
      return;
    }

    setForm((current) => {
      const currentActions = current.permissions[module] ?? [];
      const nextActions = currentActions.includes(action)
        ? currentActions.filter((item) => item !== action)
        : [...currentActions, action];

      return {
        ...current,
        permissions: {
          ...current.permissions,
          [module]: nextActions,
        },
      };
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setPermissionMode('default');
    setForm(createFormState());
    setImageFile(null);
    setFormErrors({});
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (user) => {
    if (user.id === currentUserId) {
      return;
    }

    const role = getPrimaryRole(user);
    const permissions = user.permissions ?? roleDefaults(role);

    setEditingId(user.id);
    setPermissionMode(permissionsMatch(permissions, roleDefaults(role)) ? 'default' : 'custom');
    setForm({
      name: user.name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      profileImageUrl: user.profileImageUrl ?? '',
      password: '',
      role,
      permissions,
      deliveryAgent: {
        isVerified: user.deliveryAgent?.isVerified ?? false,
        address: user.deliveryAgent?.address ?? '',
        dateOfBirth: user.deliveryAgent?.dateOfBirth ?? '',
        gender: user.deliveryAgent?.gender ?? '',
        emergencyContact: user.deliveryAgent?.emergencyContact ?? '',
        vehicleType: user.deliveryAgent?.vehicleType ?? '',
        vehicleNumber: user.deliveryAgent?.vehicleNumber ?? '',
        vehicleBrand: user.deliveryAgent?.vehicleBrand ?? '',
        vehicleColor: user.deliveryAgent?.vehicleColor ?? '',
      },
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      profileImageUrl: imageFile ? undefined : form.profileImageUrl.trim(),
      role: form.role,
      permissions: form.permissions,
    };

    if (form.role === 'delivery_boy') {
      payload.deliveryAgent = {
        isVerified: form.deliveryAgent.isVerified,
        address: form.deliveryAgent.address.trim(),
        dateOfBirth: form.deliveryAgent.dateOfBirth,
        gender: form.deliveryAgent.gender,
        emergencyContact: form.deliveryAgent.emergencyContact.trim(),
        vehicleType: form.deliveryAgent.vehicleType,
        vehicleNumber: form.deliveryAgent.vehicleNumber.trim(),
        vehicleBrand: form.deliveryAgent.vehicleBrand.trim(),
        vehicleColor: form.deliveryAgent.vehicleColor.trim(),
      };
    }

    return payload;
  };

  const validateForm = () => {
    const errors = {};
    const email = form.email.trim();
    const phone = form.phone.trim();
    const password = form.password.trim();

    if (email && !emailPattern.test(email)) {
      errors.email = 'Enter a valid email address, for example ravi.delivery@example.com.';
    }

    if (phone && !phonePattern.test(phone)) {
      errors.phone = `${phoneHelpText} Example: +919900000005 or 9900000005.`;
    }

    if (!email && !phone) {
      errors.email = 'Email or phone is required.';
    }

    if (form.role === 'delivery_boy' && !phone) {
      errors.phone = `Phone is required for delivery boys. ${phoneHelpText}`;
    }

    if (!isEditing && password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (isEditing && password && password.length < 6) {
      errors.password = 'New password must be at least 6 characters.';
    }

    if (form.role === 'delivery_boy') {
      const emergencyContact = form.deliveryAgent.emergencyContact.trim();
      const vehicleNumber = form.deliveryAgent.vehicleNumber.trim();

      if (emergencyContact && !phonePattern.test(emergencyContact)) {
        errors.emergencyContact = `${phoneHelpText} Example: +919123456789.`;
      }

      if (vehicleNumber && !vehicleNumberPattern.test(vehicleNumber)) {
        errors.vehicleNumber =
          'Use 4 to 20 letters, digits, spaces, or hyphens. Example: WB01AB1234.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    const validationError = file ? validateImageFile(file) : '';

    setFormErrors((current) => ({
      ...current,
      profileImage: validationError,
    }));

    if (validationError) {
      setImageFile(null);
      event.target.value = '';
      return;
    }

    setImageFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditing) {
      await updateUser({ id: editingId, ...buildPayload() }).unwrap();
      if (imageFile) {
        await uploadStaffProfileImage({ id: editingId, file: imageFile }).unwrap();
      }
      if (form.password.trim()) {
        await updatePassword({ id: editingId, password: form.password.trim() }).unwrap();
      }
    } else {
      const created = await createUser({
        ...buildPayload(),
        password: form.password.trim(),
      }).unwrap();
      if (imageFile) {
        await uploadStaffProfileImage({ id: created.id, file: imageFile }).unwrap();
      }
    }

    closeDialog();
  };

  const handleStatusChange = async (user) => {
    const nextStatus = user.isActive === false;
    const label = nextStatus ? 'enable' : 'disable';

    if (!window.confirm(`Are you sure you want to ${label} this staff user?`)) {
      return;
    }

    await updateStatus({ id: user.id, isActive: nextStatus }).unwrap();
  };

  const handleDelete = async (user) => {
    if (
      !window.confirm('Delete this staff user permanently? Disable instead if they have history.')
    ) {
      return;
    }

    await deleteUser(user.id).unwrap();

    if (editingId === user.id) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Staff</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats.total}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.active}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Delivery boys
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats.delivery}</p>
        </Card>
      </div>

      <Card
        eyebrow="Live access"
        title="Staff records"
        actions={<Button onClick={openCreateDialog}>Add staff</Button>}
      >
        {isLoading ? <Loader label="Loading staff..." /> : null}
        {listError ? (
          <ErrorState
            message={listError?.data?.message || listError?.error || 'Unable to load staff.'}
          />
        ) : null}
        {!isLoading && !listError && !users.length ? (
          <EmptyState
            description="Create an admin, manager, or delivery boy account."
            title="No staff users"
          />
        ) : null}
        {!isLoading && !listError && users.length ? (
          <Table
            columns={[
              {
                key: 'person',
                header: 'Staff',
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-950">{row.name || 'Unnamed user'}</p>
                    <p className="text-xs text-slate-500">{row.email || row.phone}</p>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                render: (row) => roleLabelMap[getPrimaryRole(row)] || getPrimaryRole(row),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      row.isActive === false
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {row.isActive === false ? 'Disabled' : 'Active'}
                  </span>
                ),
              },
              {
                key: 'capabilities',
                header: 'Capabilities',
                render: (row) => (
                  <span className="text-sm text-slate-600">
                    {getCapabilitySummary(row.permissions) || 'No access'}
                  </span>
                ),
              },
              {
                key: 'deliveryAgent',
                header: 'Delivery profile',
                render: (row) =>
                  row.deliveryAgent
                    ? `${row.deliveryAgent.name} (${row.deliveryAgent.phone})`
                    : 'Not linked',
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => {
                  const isSelf = row.id === currentUserId;

                  return (
                    <div
                      className="flex flex-wrap gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button disabled={isSelf} onClick={() => handleEdit(row)} variant="secondary">
                        Edit
                      </Button>
                      <Button
                        disabled={isSelf || statusState.isLoading}
                        onClick={() => handleStatusChange(row)}
                        variant="secondary"
                      >
                        {row.isActive === false ? 'Enable' : 'Disable'}
                      </Button>
                      <Button
                        disabled={isSelf || deleteState.isLoading}
                        onClick={() => handleDelete(row)}
                        variant="danger"
                      >
                        Delete
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            data={users}
            emptyMessage="No staff users created yet."
            onRowClick={handleEdit}
          />
        ) : null}
      </Card>

      <Modal
        footer={
          <>
            <Button onClick={closeDialog} variant="secondary">
              Cancel
            </Button>
            <Button disabled={isBusy} form="staff-dialog-form" type="submit">
              {isEditing ? 'Save changes' : 'Create user'}
            </Button>
          </>
        }
        maxWidth="max-w-4xl"
        onClose={closeDialog}
        open={dialogOpen}
        title={isEditing ? `Edit ${editingUser?.name || editingUser?.email}` : 'Add staff'}
      >
        <form className="space-y-4" id="staff-dialog-form" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField
              autoComplete="name"
              label="Name"
              onChange={(event) => setField('name', event.target.value)}
              value={form.name}
            />
            <SelectField
              label="Role"
              onChange={(event) => handleRoleChange(event.target.value)}
              options={roleOptions}
              value={form.role}
            />
            <TextField
              autoComplete="email"
              error={formErrors.email}
              label="Email"
              onChange={(event) => setField('email', event.target.value)}
              value={form.email}
            />
            <TextField
              autoComplete="tel"
              error={formErrors.phone}
              inputMode="tel"
              label="Phone"
              maxLength={16}
              onChange={(event) => setField('phone', normalizePhoneInput(event.target.value))}
              placeholder="+919900000005"
              value={form.phone}
            />
            <TextField
              autoComplete="new-password"
              className="md:col-span-2"
              error={formErrors.password}
              label={isEditing ? 'New password' : 'Password'}
              onChange={(event) => setField('password', event.target.value)}
              type="password"
              value={form.password}
            />
          </div>

          {form.role === 'delivery_boy' ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Profile information</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      checked={form.deliveryAgent.isVerified}
                      className="h-4 w-4 rounded border-slate-300 text-slate-950"
                      onChange={(event) =>
                        setDeliveryAgentField('isVerified', event.target.checked)
                      }
                      type="checkbox"
                    />
                    Verified
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-[120px_1fr]">
                  <div className="flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-400">
                    {imagePreviewUrl || form.profileImageUrl ? (
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={imagePreviewUrl || form.profileImageUrl}
                      />
                    ) : (
                      'No image'
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">
                      <span className="mb-2 block">Upload profile image</span>
                      <input
                        accept={IMAGE_UPLOAD_ACCEPT}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-slate-900"
                        onChange={handleProfileImageChange}
                        type="file"
                      />
                      {formErrors.profileImage ? (
                        <span className="mt-1 block text-xs text-rose-600">
                          {formErrors.profileImage}
                        </span>
                      ) : null}
                      {imageFile ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          Selected: {imageFile.name}
                        </span>
                      ) : null}
                    </label>
                    <TextField
                      label="Profile Image URL"
                      onChange={(event) => setField('profileImageUrl', event.target.value)}
                      placeholder="Cloudinary URL"
                      value={form.profileImageUrl}
                    />
                    <TextField
                      className="md:col-span-2"
                      label="Address"
                      onChange={(event) => setDeliveryAgentField('address', event.target.value)}
                      value={form.deliveryAgent.address}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 text-sm font-semibold text-slate-950">Personal details</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <TextField
                    label="Date Of Birth"
                    onChange={(event) =>
                      setDeliveryAgentField('dateOfBirth', event.target.value)
                    }
                    type="date"
                    value={form.deliveryAgent.dateOfBirth}
                  />
                  <SelectField
                    label="Gender"
                    onChange={(event) => setDeliveryAgentField('gender', event.target.value)}
                    options={genderOptions}
                    value={form.deliveryAgent.gender}
                  />
                  <TextField
                    error={formErrors.emergencyContact}
                    inputMode="tel"
                    label="Emergency Contact"
                    maxLength={16}
                    onChange={(event) =>
                      setDeliveryAgentField(
                        'emergencyContact',
                        normalizePhoneInput(event.target.value),
                      )
                    }
                    placeholder="+919123456789"
                    value={form.deliveryAgent.emergencyContact}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 text-sm font-semibold text-slate-950">Vehicle information</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField
                    label="Vehicle Type"
                    onChange={(event) => setDeliveryAgentField('vehicleType', event.target.value)}
                    options={vehicleTypeOptions}
                    value={form.deliveryAgent.vehicleType}
                  />
                  <TextField
                    error={formErrors.vehicleNumber}
                    label="Vehicle Number"
                    onChange={(event) =>
                      setDeliveryAgentField('vehicleNumber', event.target.value.toUpperCase())
                    }
                    placeholder="WB01AB1234"
                    value={form.deliveryAgent.vehicleNumber}
                  />
                  <TextField
                    label="Vehicle Brand"
                    onChange={(event) => setDeliveryAgentField('vehicleBrand', event.target.value)}
                    placeholder="Honda Shine"
                    value={form.deliveryAgent.vehicleBrand}
                  />
                  <TextField
                    label="Vehicle Color"
                    onChange={(event) => setDeliveryAgentField('vehicleColor', event.target.value)}
                    placeholder="Black"
                    value={form.deliveryAgent.vehicleColor}
                  />
                </div>
              </div>
            </>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {roleLabelMap[form.role]} permissions
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {getCapabilitySummary(form.permissions) || 'No modules selected'}
                </p>
              </div>
              <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
                <button
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    permissionMode === 'default'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setPermissionMode('default');
                    setForm((current) => ({
                      ...current,
                      permissions: roleDefaults(current.role),
                    }));
                  }}
                  type="button"
                >
                  Default
                </button>
                <button
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    permissionMode === 'custom'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() => setPermissionMode('custom')}
                  type="button"
                >
                  Custom
                </button>
              </div>
            </div>

            {permissionMode === 'custom' ? (
              <div className="mt-4 grid max-h-[38vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                {capabilityModules.map((module) => (
                  <div
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                    key={module.key}
                  >
                    <p className="mb-3 text-sm font-semibold text-slate-900">{module.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {module.actions.map((action) => {
                        const checked = form.permissions[module.key]?.includes(action) ?? false;
                        const disabled = !canUseAction(module.key, action);

                        return (
                          <label
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              checked
                                ? 'border-slate-950 bg-slate-950 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-700'
                            } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                            key={action}
                          >
                            <input
                              checked={checked}
                              className="sr-only"
                              disabled={disabled}
                              onChange={() => toggleCapability(module.key, action)}
                              type="checkbox"
                            />
                            {action}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </form>

        {mutationError ? <ErrorState message={mutationError} /> : null}
      </Modal>
    </div>
  );
}
