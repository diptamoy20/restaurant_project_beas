export const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export const categoriesFallback = ['Pizza', 'Burger', 'Dessert', 'Drinks', 'Veg'];
