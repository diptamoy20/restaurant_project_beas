import { createSlice } from '@reduxjs/toolkit';

const menuSlice = createSlice({
  name: 'menu',
  initialState: {
    items: [
      { id: 1, name: 'Classic Burger', price: 8.99, category: 'Burgers' },
      { id: 2, name: 'Farmhouse Pizza', price: 12.49, category: 'Pizza' },
      { id: 3, name: 'Cold Coffee', price: 3.99, category: 'Beverages' }
    ],
  },
  reducers: {},
});

export default menuSlice.reducer;
