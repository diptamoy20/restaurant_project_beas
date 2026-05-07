import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../lib/api';

const initialState = {
  payments: [],
  loading: false,
  error: null,
};

export const initiatePayment = createAsyncThunk(
  'payments/initiate',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/payments/initiate', payload);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearPaymentError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initiatePayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiatePayment.fulfilled, (state, action) => {
        state.loading = false;
        state.payments.push(action.payload);
      })
      .addCase(initiatePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to initiate payment';
      });
  },
});

export const { clearPaymentError } = paymentSlice.actions;
export default paymentSlice.reducer;
