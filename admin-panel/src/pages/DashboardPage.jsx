import { useMemo, useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import { SelectField } from '../components/ui/SelectField';
import { useGetDashboardOverviewQuery } from '../services/analyticsApi';
import { usePrepareBomMutation } from '../services/inventoryApi';
import { useGetAdminRestaurantMenuQuery } from '../services/menuApi';

const rangeOptions = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

function formatCurrency(value = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value = 0) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value);
}

function formatLabel(value) {
  return String(value || '-')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function KpiCard({ label, value, helper }) {
  return (
    <Card className="min-h-32">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </Card>
  );
}

function EmptyPanel({ message }) {
  return <div className="rounded-2xl bg-slate-50 px-4 py-8 text-sm text-slate-500">{message}</div>;
}

function LineChart({ data }) {
  const width = 720;
  const height = 220;
  const padding = 28;
  const max = Math.max(...data.map((point) => point.value), 0);

  if (!data.length || max <= 0) {
    return <EmptyPanel message="No revenue data for this filter." />;
  }

  const points = data.map((point, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (point.value / max) * (height - padding * 2);
    return { ...point, x, y };
  });
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="overflow-x-auto">
      <svg className="min-w-[640px]" viewBox={`0 0 ${width} ${height}`} role="img">
        <path d={path} fill="none" stroke="#0f172a" strokeWidth="3" />
        {points.map((point) => (
          <circle cx={point.x} cy={point.y} fill="#0f172a" key={point.label} r="4" />
        ))}
        {points.map((point, index) =>
          index % Math.ceil(points.length / 6) === 0 ? (
            <text
              fill="#64748b"
              fontSize="12"
              key={point.label}
              textAnchor="middle"
              x={point.x}
              y={height - 6}
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map((point) => point.orders), 0);

  if (!data.length || max <= 0) {
    return <EmptyPanel message="No order volume for this filter." />;
  }

  return (
    <div className="flex h-64 items-end gap-2 overflow-x-auto rounded-2xl bg-slate-50 p-4">
      {data.map((point) => (
        <div
          className="flex min-w-10 flex-1 flex-col items-center justify-end gap-2"
          key={point.label}
        >
          <div className="flex h-44 w-full items-end overflow-hidden rounded-t-xl bg-slate-200">
            <div
              className="w-full rounded-t-xl bg-slate-950"
              style={{ height: `${Math.max(6, (point.orders / max) * 100)}%` }}
              title={`${point.orders} orders`}
            />
          </div>
          <span className="max-w-14 truncate text-xs text-slate-500">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBars({ data, valueKey, labelKey, formatValue, emptyMessage }) {
  const max = Math.max(...data.map((item) => item[valueKey]), 0);

  if (!data.length || max <= 0) {
    return <EmptyPanel message={emptyMessage} />;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item[labelKey]}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700">{item[labelKey]}</span>
            <span className="font-semibold text-slate-950">{formatValue(item[valueKey])}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950"
              style={{ width: `${Math.max(4, (item[valueKey] / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SplitList({ data, labelKey, valueKey, valueFormatter = formatNumber, emptyMessage }) {
  const total = data.reduce((sum, item) => sum + item[valueKey], 0);

  if (!data.length || total <= 0) {
    return <EmptyPanel message={emptyMessage} />;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const percent = Math.round((item[valueKey] / total) * 100);
        return (
          <div key={item[labelKey]}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{formatLabel(item[labelKey])}</span>
              <span className="text-slate-500">
                {valueFormatter(item[valueKey])} · {percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const [filters, setFilters] = useState({
  restaurantId: '',
  range: 'today',
});

const queryParams = useMemo(
  () =>
    Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined,
      ),
    ),
  [filters],
);

const [selectedMenuItem, setSelectedMenuItem] = useState('');
const [preparationQuantity, setPreparationQuantity] = useState(''); 

const [prepareBom, { data: bomData, isLoading: isBomLoading, error: bomError }] =
  usePrepareBomMutation();
  
const { data: menuData, isLoading: isMenuLoading } =
  useGetAdminRestaurantMenuQuery(filters.restaurantId, {
    skip: !filters.restaurantId,
  });

const menuItems = menuData?.items ?? [];

console.log('MENU DATA:', menuData);
console.log('MENU ITEMS:', menuItems);

const handlePrepareBom = async () => {
  console.log('CHECK PREPARATION CLICKED');

  if (!filters.restaurantId || !selectedMenuItem || !preparationQuantity) {
    console.log('Missing values');
    return;
  }

  try {
    const result = await prepareBom({
      restaurantId: Number(filters.restaurantId),
      items: [
        {
          menuItemId: Number(selectedMenuItem),
          quantity: Number(preparationQuantity),
        },
      ],
    }).unwrap();

    console.log('BOM RESULT:', result);
  } catch (error) {
    console.error('BOM ERROR:', error);
  }
};

  const { data, isLoading, isFetching, error } =
    useGetDashboardOverviewQuery(queryParams, {
    pollingInterval: 30000,
  });

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

  const restaurantOptions = [
    { value: '', label: 'All Restaurants' },
    ...(data.restaurants ?? []).map((restaurant) => ({
      value: String(restaurant.id),
      label: restaurant.name,
    })),
  ];
  const kpis = data.kpis ?? {};
  const kpiCards = [
    { label: 'Revenue', value: formatCurrency(kpis.revenue), helper: 'Non-cancelled order value' },
    { label: 'Orders', value: formatNumber(kpis.orders), helper: 'Orders in selected range' },
    {
      label: 'Average Order Value',
      value: formatCurrency(kpis.averageOrderValue),
      helper: 'Revenue divided by orders',
    },
    {
      label: 'Pending Orders',
      value: formatNumber(kpis.pendingOrders),
      helper: 'Needs admin action',
    },
    {
      label: 'Completed Orders',
      value: formatNumber(kpis.completedOrders),
      helper: 'Delivered or served',
    },
    {
      label: 'Cancelled Orders',
      value: formatNumber(kpis.cancelledOrders),
      helper: 'Cancelled in range',
    },
    {
      label: 'Active Restaurants',
      value: formatNumber(kpis.activeRestaurants),
      helper: 'Currently active locations',
    },
    {
      label: 'Available Delivery Boys',
      value: formatNumber(kpis.availableDeliveryBoys),
      helper: 'Online and available',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Business Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Multi-restaurant overview</h1>
        </div>
        {isFetching ? <Loader label="Refreshing..." /> : null}
      </section>

      <Card>
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,320px)_1fr] lg:items-end">
          <SelectField
            label="Restaurant"
            onChange={(event) =>
              setFilters((current) => ({ ...current, restaurantId: event.target.value }))
            }
            options={restaurantOptions}
            value={filters.restaurantId}
          />
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Date range</p>
            <div className="flex flex-wrap gap-2">
              {rangeOptions.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => setFilters((current) => ({ ...current, range: option.value }))}
                  variant={filters.range === option.value ? 'primary' : 'secondary'}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>
                    <Card eyebrow="Inventory" title="Preparation / BOM Status">
        {!filters.restaurantId ? (
          <p className="text-sm text-slate-500">
            Select a restaurant to check preparation requirements.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Menu Item
                </label>

                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={selectedMenuItem}
                  onChange={(event) => setSelectedMenuItem(event.target.value)}
                  disabled={isMenuLoading}
                >
                  <option value="">
                    {isMenuLoading ? 'Loading menu...' : 'Select menu item'}
                  </option>

                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Quantity to Prepare
                </label>

                <input
                  type="number"
                  min="1"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={preparationQuantity}
                  onChange={(event) =>
                    setPreparationQuantity(event.target.value)
                  }
                  placeholder="Enter quantity"
                />
              </div>
            </div>

            <Button
              onClick={handlePrepareBom}
              disabled={
                !selectedMenuItem ||
                !preparationQuantity ||
                isBomLoading
              }
            >
              {isBomLoading ? 'Checking...' : 'Check Preparation'}
            </Button>

            {bomError ? (
              <p className="text-sm text-red-600">
                Failed to check preparation requirements.
              </p>
            ) : null}

            {bomData ? (
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-950">
                    Preparation Status
                  </h3>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      bomData.available
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {bomData.available ? 'Available' : 'Shortage'}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {(bomData.checks ?? []).map((item) => (
                    <div
                      key={item.itemId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.name}
                        </p>

                        <p className="text-sm text-slate-500">
                          Required: {item.required} {item.unit} · Current:{' '}
                          {item.current} {item.unit}
                        </p>
                      </div>

                      {item.shortage > 0 ? (
                        <span className="text-sm font-semibold text-red-600">
                          Shortage: {item.shortage} {item.unit}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-emerald-600">
                          Sufficient
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"></section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card eyebrow="Revenue" title="Revenue Trend">
          <LineChart data={data.revenueTrend ?? []} />
        </Card>

        <Card eyebrow="Orders" title="Order Type Split">
          <SplitList
            data={data.orderTypeSplit ?? []}
            labelKey="type"
            valueKey="count"
            emptyMessage="No order type data for this filter."
          />
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card eyebrow="Orders" title="Orders Trend">
          <BarChart data={data.ordersTrend ?? []} />
        </Card>

        <Card eyebrow="Payments" title="Payment Method Split">
          <SplitList
            data={data.paymentMethodSplit ?? []}
            labelKey="method"
            valueKey="amount"
            valueFormatter={formatCurrency}
            emptyMessage="No payment method data for this filter."
          />
        </Card>
      </section>

      <Card eyebrow="Restaurants" title="Revenue by Restaurant">
        <HorizontalBars
          data={data.revenueByRestaurant ?? []}
          emptyMessage="No restaurant revenue for this filter."
          formatValue={formatCurrency}
          labelKey="restaurantName"
          valueKey="revenue"
        />
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card eyebrow="Performance" title="Restaurant Performance">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Restaurant</th>
                  <th className="py-3 pr-4 font-semibold">Orders</th>
                  <th className="py-3 pr-4 font-semibold">Revenue</th>
                  <th className="py-3 pr-4 font-semibold">Avg Order</th>
                  <th className="py-3 pr-4 font-semibold">Pending</th>
                  <th className="py-3 pr-4 font-semibold">Cancelled</th>
                  <th className="py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.restaurantPerformance ?? []).map((restaurant) => (
                  <tr key={restaurant.restaurantId}>
                    <td className="py-3 pr-4 font-medium text-slate-950">
                      {restaurant.restaurantName}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{restaurant.orders}</td>
                    <td className="py-3 pr-4 text-slate-700">
                      {formatCurrency(restaurant.revenue)}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {formatCurrency(restaurant.averageOrderValue)}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{restaurant.pending}</td>
                    <td className="py-3 pr-4 text-slate-700">{restaurant.cancelled}</td>
                    <td className="py-3 text-slate-700">{restaurant.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card eyebrow="Attention" title="Orders Needing Attention">
          {data.ordersNeedingAttention?.length ? (
            <div className="space-y-3">
              {data.ordersNeedingAttention.map((order) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  key={order.orderId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{order.orderNumber}</p>
                      <p className="text-sm text-slate-500">{order.restaurantName}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      {order.ageMinutes} min
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{order.issue}</p>
                  <p className="text-sm text-slate-500">{order.customerName || 'Guest customer'}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel message="No operational alerts for this filter." />
          )}
        </Card>
      </section>

      <Card eyebrow="Menu" title="Top Selling Items">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-3 pr-4 font-semibold">Item</th>
                <th className="py-3 pr-4 font-semibold">Restaurant</th>
                <th className="py-3 pr-4 font-semibold">Quantity Sold</th>
                <th className="py-3 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.topSellingItems ?? []).map((item) => (
                <tr key={`${item.itemId}-${item.restaurantName}`}>
                  <td className="py-3 pr-4 font-medium text-slate-950">{item.itemName}</td>
                  <td className="py-3 pr-4 text-slate-700">{item.restaurantName}</td>
                  <td className="py-3 pr-4 text-slate-700">{item.quantitySold}</td>
                  <td className="py-3 text-slate-700">{formatCurrency(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.topSellingItems?.length ? (
            <div className="pt-4">
              <EmptyPanel message="No item sales for this filter." />
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
