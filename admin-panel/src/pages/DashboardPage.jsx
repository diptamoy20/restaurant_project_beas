import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import { useGetDashboardAnalyticsQuery } from '../services/analyticsApi';

function formatCurrency(value = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardPage() {
  const { data, isLoading, error } = useGetDashboardAnalyticsQuery();

  if (isLoading) {
    return <Loader label="Loading dashboard analytics..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error?.data?.message || error?.error || 'Dashboard analytics failed to load.'}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        description="Analytics data has not been returned by the API yet."
        title="No dashboard data"
      />
    );
  }

  const cards = [
    {
      label: 'Orders',
      value: data.totalOrders,
      helper: 'All orders recorded',
      tone: 'border-l-blue-500',
    },
    {
      label: 'Revenue',
      value: formatCurrency(data.totalRevenue),
      helper: 'Collected payment value',
      tone: 'border-l-emerald-500',
    },
    {
      label: 'Customers',
      value: data.totalUsers,
      helper: 'Registered accounts',
      tone: 'border-l-amber-500',
    },
    {
      label: 'Restaurants',
      value: data.totalRestaurants,
      helper: 'Managed locations',
      tone: 'border-l-slate-500',
    },
  ];
  const averageOrderValue = data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Admin Overview
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Dashboard</h1>
        </div>
        <p className="max-w-xl text-sm text-slate-500">
          Live summary from orders, users, restaurants, and payments.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card className={`border-l-4 ${card.tone}`} key={card.label}>
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
            <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card eyebrow="Operations" title="Business pulse">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Average order value</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatCurrency(averageOrderValue)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Orders per restaurant</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {data.totalRestaurants > 0
                  ? Math.round(data.totalOrders / data.totalRestaurants)
                  : 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Customer order ratio</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {data.totalUsers > 0
                  ? Math.round((data.totalOrders / data.totalUsers) * 10) / 10
                  : 0}
              </p>
            </div>
          </div>
        </Card>

        <Card eyebrow="Health" title="Setup status">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-slate-600">Restaurants configured</span>
              <span className="font-semibold text-slate-950">{data.totalRestaurants}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-slate-600">Customer base</span>
              <span className="font-semibold text-slate-950">{data.totalUsers}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-slate-600">Payment records</span>
              <span className="font-semibold text-slate-950">
                {data.totalRevenue > 0 ? 'Active' : 'No revenue yet'}
              </span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
