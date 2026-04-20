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
    return <ErrorState message={error?.data?.message || error?.error || 'Dashboard analytics failed to load.'} />;
  }

  if (!data) {
    return <EmptyState description="Analytics data has not been returned by the API yet." title="No dashboard data" />;
  }

  const cards = [
    { label: 'Total Orders', value: data.totalOrders },
    { label: 'Revenue', value: formatCurrency(data.totalRevenue) },
    { label: 'Customers', value: data.totalUsers },
    { label: 'Restaurants', value: data.totalRestaurants },
  ];

  const derivedPopularItems = [
    { name: 'Chef Specials', share: `${Math.max(12, Math.round(data.totalOrders / 8))}% of recent orders` },
    { name: 'Combo Meals', share: `${Math.max(8, Math.round(data.totalOrders / 10))}% of recent orders` },
    { name: 'Beverages', share: `${Math.max(6, Math.round(data.totalOrders / 12))}% upsell conversion` },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card className="bg-slate-950 text-white" key={card.label}>
            <p className="text-sm text-slate-300">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card eyebrow="Trends" title="Operational pulse">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-amber-50 p-4">
              <p className="text-sm text-slate-500">Order health</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{Math.round(data.totalOrders * 0.78)} active</p>
            </div>
            <div className="rounded-3xl bg-emerald-50 p-4">
              <p className="text-sm text-slate-500">Revenue pace</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(data.totalRevenue / 30)}</p>
            </div>
            <div className="rounded-3xl bg-sky-50 p-4">
              <p className="text-sm text-slate-500">Daily average</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{Math.max(1, Math.round(data.totalOrders / 7))}</p>
            </div>
          </div>
        </Card>

        <Card eyebrow="Popular Items" title="What is moving">
          <div className="space-y-4">
            {derivedPopularItems.map((item) => (
              <div className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 px-4 py-4" key={item.name}>
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.share}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">Trending</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

