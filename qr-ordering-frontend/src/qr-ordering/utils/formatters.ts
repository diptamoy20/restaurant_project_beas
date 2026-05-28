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

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDate(value: string | Date | number | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return dateFormatter.format(date);
}
