import { createSlice } from '@reduxjs/toolkit';

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    metrics: {
      totalOrders: 128,
      revenue: 3640,
      activeTables: 11,
      members: 482,
    },
  },
  reducers: {},
});

export default dashboardSlice.reducer;

