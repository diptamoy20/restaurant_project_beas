import { api } from '../lib/api';

function unwrapAddressResponse(response) {
  return response?.addresses ?? response?.address ?? response?.addressDeletion ?? response;
}

export const addressApi = {
  async getAddresses() {
    return unwrapAddressResponse(await api.get('/users/me/addresses'));
  },

  async createAddress(payload) {
    return unwrapAddressResponse(await api.post('/users/me/addresses', payload));
  },

  async updateAddress(addressId, payload) {
    return unwrapAddressResponse(await api.patch(`/users/me/addresses/${addressId}`, payload));
  },

  async deleteAddress(addressId) {
    return unwrapAddressResponse(
      await api.request(`/users/me/addresses/${addressId}`, {
        method: 'DELETE',
      }),
    );
  },

  async setDefaultAddress(addressId) {
    return unwrapAddressResponse(await api.patch(`/users/me/addresses/${addressId}/default`, {}));
  },
};
