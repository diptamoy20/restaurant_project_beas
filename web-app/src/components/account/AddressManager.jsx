import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearAddressStatus,
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from '../../store/slices/addressSlice';
import { AddressForm } from './AddressForm';

function formatAddressMeta(address) {
  return [address.city, address.state].filter(Boolean).join(', ');
}

export function AddressManager() {
  const dispatch = useDispatch();
  const { items, loading, saving, deletingId, error, message } = useSelector(
    (state) => state.addresses,
  );
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      dispatch(clearAddressStatus());
    };
  }, [dispatch]);

  const filteredAddresses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((address) =>
      [address.label, address.address, address.city, address.state]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [items, search]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingAddress(null);
  };

  const handleSubmit = async (payload) => {
    const result = editingAddress
      ? await dispatch(updateAddress({ id: editingAddress.id, payload }))
      : await dispatch(createAddress(payload));

    if (
      updateAddress.fulfilled.match(result) ||
      createAddress.fulfilled.match(result)
    ) {
      closeForm();
    }
  };

  const handleDelete = (address) => {
    const confirmed = window.confirm(`Delete ${address.label} address?`);

    if (confirmed) {
      dispatch(deleteAddress(address.id));
    }
  };

  return (
    <section className="address-manager" aria-labelledby="address-manager-title">
      <div className="address-manager-header">
        <div>
          <h3 id="address-manager-title">Saved addresses</h3>
          <p>Manage delivery locations for faster checkout.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingAddress(null);
            setFormOpen((current) => !current);
          }}
        >
          {formOpen && !editingAddress ? 'Close form' : 'Add address'}
        </button>
      </div>

      <label className="address-search">
        <span>Search addresses</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by type, city, or address"
        />
      </label>

      {formOpen || editingAddress ? (
        <div className="address-form-panel">
          <AddressForm
            initialAddress={editingAddress}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            submitting={saving}
            submitLabel={editingAddress ? 'Update address' : 'Save address'}
          />
        </div>
      ) : null}

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {loading ? <div className="empty-state">Loading addresses...</div> : null}

      {!loading && filteredAddresses.length === 0 ? (
        <div className="empty-state">
          {items.length === 0 ? 'No saved addresses yet.' : 'No addresses match your search.'}
        </div>
      ) : null}

      <div className="address-list">
        {filteredAddresses.map((address) => (
          <article key={address.id} className="address-card">
            <div className="address-card-main">
              <div className="address-card-title">
                <strong>{address.label}</strong>
                {address.isDefault ? <span className="address-badge">Default</span> : null}
              </div>
              <p>{address.address}</p>
              {formatAddressMeta(address) ? <span>{formatAddressMeta(address)}</span> : null}
            </div>
            <div className="address-card-actions">
              {!address.isDefault ? (
                <button
                  type="button"
                  className="ghost-button"
                  disabled={saving}
                  onClick={() => dispatch(setDefaultAddress(address.id))}
                >
                  Make default
                </button>
              ) : null}
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setEditingAddress(address);
                  setFormOpen(false);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="ghost-button danger-button"
                disabled={deletingId === address.id}
                onClick={() => handleDelete(address)}
              >
                {deletingId === address.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
