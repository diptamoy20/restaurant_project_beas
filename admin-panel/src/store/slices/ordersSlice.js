import { createSlice } from '@reduxjs/toolkit';

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    liveOrders: [
      { id: 'ORD-1001', status: 'Preparing', table: 'T1' },
      { id: 'ORD-1002', status: 'Ready', table: 'T4' },
      { id: 'ORD-1003', status: 'Placed', table: 'T7' }
    ],
  },
  reducers: {},
});

export default ordersSlice.reducer;

