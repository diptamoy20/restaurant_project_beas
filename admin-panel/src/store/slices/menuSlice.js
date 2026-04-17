import { createSlice } from '@reduxjs/toolkit';

const menuSlice = createSlice({
  name: 'menu',
  initialState: {
    categories: ['Starters', 'Main Course', 'Desserts', 'Drinks'],
  },
  reducers: {},
});

export default menuSlice.reducer;
