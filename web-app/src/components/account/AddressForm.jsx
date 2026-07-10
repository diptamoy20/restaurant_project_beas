import { useEffect, useState } from 'react';
import { LocationPicker } from '@shared/location';
import '@shared/location/location-picker.css';

const emptyForm = {
  label: 'Home',
  address: '',
  buildingFloor: '',
  nearbyLandmark: '',
  city: '',
  state: '',
  latitude: '',
  longitude: '',
  isDefault: false,
};

const addressTypes = ['Home', 'Work', 'Other'];

export function AddressForm({
  initialAddress,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = 'Save address',
}) {
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setForm({
      label: initialAddress?.label ?? 'Home',
      address: initialAddress?.address ?? '',
      buildingFloor: initialAddress?.buildingFloor ?? '',
      nearbyLandmark: initialAddress?.nearbyLandmark ?? '',
      city: initialAddress?.city ?? '',
      state: initialAddress?.state ?? '',
      latitude: initialAddress?.latitude ?? '',
      longitude: initialAddress?.longitude ?? '',
      isDefault: initialAddress?.isDefault ?? false,
    });
  }, [initialAddress]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleLocationChange = (location) => {
    setForm((current) => ({
      ...current,
      address: location.address ?? current.address,
      buildingFloor: location.buildingFloor ?? current.buildingFloor,
      nearbyLandmark: location.nearbyLandmark ?? current.nearbyLandmark,
      city: location.city ?? current.city,
      state: location.state ?? current.state,
      latitude: location.latitude ?? current.latitude,
      longitude: location.longitude ?? current.longitude,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!form.address.trim()) {
      setFormError('Address is required.');
      return;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setFormError('Select an address from the map before saving.');
      return;
    }

    await onSubmit({
      label: form.label,
      address: form.address.trim(),
      buildingFloor: form.buildingFloor.trim() || undefined,
      nearbyLandmark: form.nearbyLandmark.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      latitude,
      longitude,
      isDefault: form.isDefault,
    });
  };

  return (
    <form className="address-form" onSubmit={handleSubmit}>
      <div className="address-form-grid">
        <div className="address-type-field">
          <span>Address type</span>
          <div className="address-type-segment" role="radiogroup" aria-label="Address type">
            {addressTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={form.label === type ? 'address-type-option active' : 'address-type-option'}
                role="radio"
                aria-checked={form.label === type}
                onClick={() => updateField('label', type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <LocationPicker
          key={`${initialAddress?.id ?? 'new'}-${initialAddress?.latitude ?? ''}-${initialAddress?.longitude ?? ''}`}
          className="address-form-wide"
          value={{
            address: form.address,
            buildingFloor: form.buildingFloor,
            nearbyLandmark: form.nearbyLandmark,
            city: form.city,
            state: form.state,
            latitude: form.latitude,
            longitude: form.longitude,
          }}
          onChange={handleLocationChange}
          showAddressDetails
          requestCurrentLocationOnMount={!initialAddress?.latitude || !initialAddress?.longitude}
        />
      </div>

      <label className="address-default-toggle">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(event) => updateField('isDefault', event.target.checked)}
        />
        <span>Make this my default address</span>
      </label>

      {formError ? <p className="form-error">{formError}</p> : null}

      <div className="address-form-actions">
        {onCancel ? (
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
