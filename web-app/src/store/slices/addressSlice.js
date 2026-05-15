import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { addressApi } from '../../services/addressApi';

function sortAddresses(addresses) {
  return [...addresses].sort((left, right) => {
    if (left.isDefault !== right.isDefault) {
      return left.isDefault ? -1 : 1;
    }

    return right.id - left.id;
  });
}

export const fetchAddresses = createAsyncThunk(
  'addresses/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      return await addressApi.getAddresses();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const createAddress = createAsyncThunk(
  'addresses/createAddress',
  async (payload, { rejectWithValue }) => {
    try {
      return await addressApi.createAddress(payload);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const updateAddress = createAsyncThunk(
  'addresses/updateAddress',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await addressApi.updateAddress(id, payload);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const deleteAddress = createAsyncThunk(
  'addresses/deleteAddress',
  async (id, { rejectWithValue }) => {
    try {
      await addressApi.deleteAddress(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const setDefaultAddress = createAsyncThunk(
  'addresses/setDefaultAddress',
  async (id, { rejectWithValue }) => {
    try {
      return await addressApi.setDefaultAddress(id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const initialState = {
  items: [],
  loading: false,
  saving: false,
  deletingId: null,
  error: null,
  message: null,
};

const addressSlice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {
    clearAddressStatus(state) {
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = sortAddresses(Array.isArray(action.payload) ? action.payload : []);
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Unable to load addresses';
      })
      .addCase(createAddress.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.message = null;
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        state.saving = false;
        state.items = sortAddresses([
          ...state.items.map((address) =>
            action.payload.isDefault ? { ...address, isDefault: false } : address,
          ),
          action.payload,
        ]);
        state.message = 'Address saved';
      })
      .addCase(createAddress.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Unable to save address';
      })
      .addCase(updateAddress.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.message = null;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        state.saving = false;
        state.items = sortAddresses(
          state.items.map((address) => {
            if (address.id === action.payload.id) {
              return action.payload;
            }

            return action.payload.isDefault ? { ...address, isDefault: false } : address;
          }),
        );
        state.message = 'Address updated';
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Unable to update address';
      })
      .addCase(deleteAddress.pending, (state, action) => {
        state.deletingId = action.meta.arg;
        state.error = null;
        state.message = null;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.deletingId = null;
        state.items = state.items.filter((address) => address.id !== action.payload);
        state.message = 'Address deleted';
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.deletingId = null;
        state.error = action.payload || 'Unable to delete address';
      })
      .addCase(setDefaultAddress.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.message = null;
      })
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.saving = false;
        state.items = sortAddresses(
          state.items.map((address) => ({
            ...address,
            isDefault: address.id === action.payload.id,
          })),
        );
        state.message = 'Default address updated';
      })
      .addCase(setDefaultAddress.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Unable to update default address';
      });
  },
});

export const { clearAddressStatus } = addressSlice.actions;
export default addressSlice.reducer;
