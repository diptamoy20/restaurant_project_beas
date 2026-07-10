import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearAddressStatus,
  createAddress,
  fetchAddresses,
} from '../../store/slices/addressSlice';
import { AddressDialog } from '../account/AddressDialog';

function formatAddressMeta(address) {
  return [address.city, address.state].filter(Boolean).join(', ');
}

export function CheckoutAddressPicker({ selectedAddressId, onSelectAddress }) {
  const dispatch = useDispatch();
  const { items, loading, saving, error, message } = useSelector((state) => state.addresses);
  const [formOpen, setFormOpen] = useState(false);
  const normalizedSelectedAddressId = selectedAddressId ? String(selectedAddressId) : '';

  useEffect(() => {
    dispatch(fetchAddresses());

    return () => {
      dispatch(clearAddressStatus());
    };
  }, [dispatch]);

  const selectedAddress = useMemo(
    () => items.find((address) => String(address.id) === normalizedSelectedAddressId),
    [items, normalizedSelectedAddressId],
  );

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    if (!normalizedSelectedAddressId || !selectedAddress) {
      const defaultAddress = items.find((address) => address.isDefault) ?? items[0];
      onSelectAddress(defaultAddress.id);
    }
  }, [items, normalizedSelectedAddressId, onSelectAddress, selectedAddress]);

  const handleCreateAddress = async (payload) => {
    const result = await dispatch(createAddress(payload));

    if (createAddress.fulfilled.match(result)) {
      onSelectAddress(result.payload.id);
      setFormOpen(false);
    }
  };

  return (
    <div className="checkout-address-picker">
      <span className="checkout-address-list-label">Saved addresses</span>

      {loading ? (
        <div className="empty-state">Loading addresses...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">No saved addresses yet. Add one to continue.</div>
      ) : (
        <div className="checkout-address-list" role="radiogroup" aria-label="Saved addresses">
          {items.map((address) => {
            const isSelected = String(address.id) === normalizedSelectedAddressId;

            return (
              <button
                key={address.id}
                type="button"
                className={
                  isSelected
                    ? 'checkout-address-card is-selected'
                    : 'checkout-address-card'
                }
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectAddress(address.id)}
              >
                <span className="checkout-address-card-check" aria-hidden="true">
                  {isSelected ? '✓' : ''}
                </span>
                <span className="checkout-address-card-body">
                  <span className="checkout-address-card-title">
                    <strong>{address.label}</strong>
                    {isSelected ? <span className="address-badge">SELECTED</span> : null}
                    {address.isDefault && !isSelected ? (
                      <span className="address-badge">Default</span>
                    ) : null}
                  </span>
                  <span className="checkout-address-card-line">{address.address}</span>
                  {address.buildingFloor ? (
                    <span className="checkout-address-card-line">
                      {address.buildingFloor}
                    </span>
                  ) : null}
                  {address.nearbyLandmark ? (
                    <span className="checkout-address-card-line checkout-address-card-meta">
                      Landmark: {address.nearbyLandmark}
                    </span>
                  ) : null}
                  {formatAddressMeta(address) ? (
                    <span className="checkout-address-card-line checkout-address-card-meta">
                      {formatAddressMeta(address)}
                    </span>
                  ) : null}
                  {address.recipientName ? (
                    <span className="checkout-address-card-line checkout-address-card-meta">
                      {address.recipientName}
                    </span>
                  ) : null}
                  {address.phone ? (
                    <span className="checkout-address-card-line checkout-address-card-meta">
                      {address.phone}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="ghost-button checkout-add-address-button"
        onClick={() => setFormOpen((value) => !value)}
      >
        {formOpen ? 'Close' : 'Add address'}
      </button>

      {formOpen ? (
        <AddressDialog
          open={formOpen}
          title="Add delivery address"
          onSubmit={handleCreateAddress}
          onClose={() => setFormOpen(false)}
          submitting={saving}
          submitLabel="Save and select"
        />
      ) : null}

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
