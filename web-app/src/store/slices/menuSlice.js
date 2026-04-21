import { createSlice } from '@reduxjs/toolkit';

const menuSlice = createSlice({
  name: 'menu',
  initialState: {
    items: [
      {
        id: 1,
        name: 'Classic Burger',
        price: 8.99,
        category: 'Burgers',
        description: 'Flame-grilled patty, cheddar, pickles, and signature house sauce.',
        image:
          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
      },
      {
        id: 2,
        name: 'Farmhouse Pizza',
        price: 12.49,
        category: 'Pizza',
        description: 'Wood-fired base layered with basil pesto and roasted garden vegetables.',
        image:
          'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80',
      },
      {
        id: 3,
        name: 'Cold Coffee',
        price: 3.99,
        category: 'Beverages',
        description: 'Chilled espresso blend topped with silky foam and cocoa dust.',
        image:
          'https://images.unsplash.com/photo-1517701550927-30cf4ba1f9d2?auto=format&fit=crop&w=900&q=80',
      },
      {
        id: 4,
        name: 'Truffle Pasta',
        price: 11.75,
        category: 'Pasta',
        description: 'Creamy parmesan ribbons with mushroom duxelles and truffle oil.',
        image:
          'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80',
      },
    ],
  },
  reducers: {},
});

export default menuSlice.reducer;
