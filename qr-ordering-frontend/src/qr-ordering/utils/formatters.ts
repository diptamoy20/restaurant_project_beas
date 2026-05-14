import { currencyFormatter } from '../constants/ui';

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatCompactPrice(amount: number): string {
  return currencyFormatter.format(amount).replace('₹', '₹');
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
