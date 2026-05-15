import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearAddressStatus,
  createAddress,
  fetchAddresses,
} from '../../store/slices/addressSlice';
import { AddressDialog } from '../account/AddressDialog';

function formatAddress(address) {
  return [address.label, address.address, address.city, address.state]
    .filter(Boolean)
    .join(' - ');
}

export function CheckoutAddressPicker({ selectedAddressId, onSelectAddress }) {
  const dispatch = useDispatch();
  const { items, loading, saving, error, message } = useSelector((state) => state.addresses);
  const [formOpen, setFormOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const normalizedSelectedAddressId = selectedAddressId ? String(selectedAddressId) : '';

  useEffect(() => {
    dispatch(fetchAddresses());

    return () => {
      dispatch(clearAddressStatus());
    };
  }, [dispatch]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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

  const handleSelectAddress = (addressId) => {
    onSelectAddress(addressId);
    setDropdownOpen(false);
  };

  return (
    <div className="checkout-address-picker">
      <div className="checkout-address-row">
        <div className="address-dropdown-field" ref={dropdownRef}>
          <span className="address-dropdown-label">Saved addresses</span>
          <button
            type="button"
            className="address-dropdown-trigger"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            disabled={loading || items.length === 0}
            onClick={() => setDropdownOpen((current) => !current)}
          >
            <span>
              {selectedAddress
                ? formatAddress(selectedAddress)
                : loading
                  ? 'Loading addresses...'
                  : 'Select an address'}
            </span>
            <span className="address-dropdown-chevron" aria-hidden="true">⌄</span>
          </button>

          {dropdownOpen ? (
            <div className="address-dropdown-menu" role="listbox" aria-label="Saved addresses">
              {items.map((address) => {
                const isSelected = String(address.id) === normalizedSelectedAddressId;

                return (
                  <button
                    key={address.id}
                    type="button"
                    className={
                      isSelected
                        ? 'address-dropdown-option is-selected'
                        : 'address-dropdown-option'
                    }
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectAddress(address.id)}
                  >
                    <span className="address-dropdown-option-title">
                      <strong>{address.label}</strong>
                      {isSelected ? <span className="address-badge">SELECTED</span> : null}
                      {address.isDefault && !isSelected ? (
                        <span className="address-badge">Default</span>
                      ) : null}
                    </span>
                    <span className="address-dropdown-option-copy">{address.address}</span>
                    {[address.city, address.state].filter(Boolean).join(', ') ? (
                      <small>{[address.city, address.state].filter(Boolean).join(', ')}</small>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <button type="button" className="ghost-button" onClick={() => setFormOpen((value) => !value)}>
          {formOpen ? 'Close' : 'Add address'}
        </button>
      </div>

      {selectedAddress ? (
        <div className="selected-address-preview">
          <span className="address-badge">SELECTED</span>
          <strong>{selectedAddress.label}</strong>
          <p>{selectedAddress.address}</p>
          {[selectedAddress.city, selectedAddress.state].filter(Boolean).join(', ') ? (
            <small>{[selectedAddress.city, selectedAddress.state].filter(Boolean).join(', ')}</small>
          ) : null}
        </div>
      ) : null}

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
