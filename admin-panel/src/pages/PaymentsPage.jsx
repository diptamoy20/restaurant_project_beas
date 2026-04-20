import { useMemo, useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { Table } from '../components/ui/Table';
import { TextField } from '../components/ui/TextField';
import { useInitiatePaymentMutation } from '../services/paymentApi';

export function PaymentsPage() {
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState({ date: '', status: '' });
  const [form, setForm] = useState({
    orderId: '1',
    userId: '3',
    transactionId: `TXN-${Date.now()}`,
    amount: '299',
    status: 'SUCCESS',
    method: 'UPI',
  });
  const [initiatePayment, { isLoading, error }] = useInitiatePaymentMutation();

  const filteredHistory = useMemo(
    () =>
      history.filter((item) => {
        const matchesStatus = !filters.status || item.status === filters.status;
        const matchesDate = !filters.date || item.createdDate === filters.date;
        return matchesStatus && matchesDate;
      }),
    [filters.date, filters.status, history],
  );

  return (
    <div className="space-y-6">
      <Card eyebrow="Payments" title="Transactions">
        <form
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const payload = {
              ...form,
              orderId: Number(form.orderId),
              userId: Number(form.userId),
              amount: Number(form.amount),
            };
            const response = await initiatePayment(payload).unwrap();
            setHistory((current) => [
              {
                ...payload,
                id: response.id ?? `${payload.transactionId}-${current.length + 1}`,
                createdDate: new Date().toISOString().slice(0, 10),
              },
              ...current,
            ]);
          }}
        >
          <TextField label="Order ID" onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))} value={form.orderId} />
          <TextField label="User ID" onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))} value={form.userId} />
          <TextField
            label="Transaction ID"
            onChange={(event) => setForm((current) => ({ ...current, transactionId: event.target.value }))}
            value={form.transactionId}
          />
          <TextField label="Amount" onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} value={form.amount} />
          <TextField label="Status" onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} value={form.status} />
          <TextField label="Method" onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))} value={form.method} />
          <Button className="md:col-span-2 xl:col-span-3" disabled={isLoading} type="submit">
            {isLoading ? 'Submitting payment...' : 'Initiate payment'}
          </Button>
        </form>

        {error ? <ErrorState message={error?.data?.message || error?.error || 'Payment initiation failed.'} /> : null}
      </Card>

      <Card eyebrow="History" title="Transaction filters">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Filter by date"
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
            type="date"
            value={filters.date}
          />
          <TextField
            label="Filter by status"
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            placeholder="SUCCESS"
            value={filters.status}
          />
        </div>

        <div className="mt-6">
          <Table
            columns={[
              { key: 'transactionId', header: 'Transaction' },
              { key: 'orderId', header: 'Order ID' },
              { key: 'amount', header: 'Amount', render: (row) => `Rs. ${row.amount}` },
              { key: 'status', header: 'Status' },
              { key: 'createdDate', header: 'Date' },
            ]}
            data={filteredHistory}
            emptyMessage="Submitted payments will appear here. The current backend does not expose a payment history endpoint yet."
          />
        </div>
      </Card>
    </div>
  );
}

