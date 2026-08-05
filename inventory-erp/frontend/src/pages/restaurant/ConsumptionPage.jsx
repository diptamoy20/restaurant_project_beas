import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { SelectField } from '../../components/ui/SelectField';

const REF_TYPE_STYLES = {
  RECIPE_CONSUMPTION: 'bg-rose-100 text-rose-800',
  WASTE: 'bg-amber-100 text-amber-800',
  TRANSFER: 'bg-indigo-100 text-indigo-800',
  MATERIAL_RETURN: 'bg-cyan-100 text-cyan-800',
  ADJUSTMENT: 'bg-orange-100 text-orange-800',
  GOODS_RECEIPT: 'bg-blue-100 text-blue-800',
};

const REF_TYPE_OPTIONS = [
  { label: 'All Reference Types', value: '' },
  { label: 'Recipe Consumption', value: 'RECIPE_CONSUMPTION' },
  { label: 'Waste', value: 'WASTE' },
  { label: 'Transfer', value: 'TRANSFER' },
  { label: 'Material Return', value: 'MATERIAL_RETURN' },
  { label: 'Adjustment', value: 'ADJUSTMENT' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const SORT_OPTIONS = [
  { value: 'timestamp', label: 'Date & Time' },
  { value: 'ingredient', label: 'Ingredient' },
  { value: 'quantity', label: 'Quantity Consumed' },
  { value: 'referenceId', label: 'Reference Number' },
];

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return (
    d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
}

function isToday(ts) {
  return new Date(ts).toDateString() === new Date().toDateString();
}

export function ConsumptionPage() {
  const { slug } = useParams();
  const [logs, setLogs] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    ingredientId: '',
    categoryId: '',
    refType: '',
    search: '',
  });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, ingRes] = await Promise.all([
        apiFetch(`operations/${slug}/consumption`),
        apiFetch('master/ingredients'),
      ]);
      setLogs(Array.isArray(res) ? res : res.logs || []);
      setIngredients(Array.isArray(ingRes) ? ingRes : ingRes.items || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  const categories = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      const cat = log.ingredient?.category;
      if (cat && cat.id != null) map.set(cat.id, cat);
    });
    return [...map.values()];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
    const to = filters.dateTo ? new Date(filters.dateTo).getTime() + 86400000 : null;

    return logs.filter((log) => {
      const ts = new Date(log.timestamp || log.createdAt).getTime();
      if (from && ts < from) return false;
      if (to && ts >= to) return false;
      if (filters.ingredientId && log.ingredientId !== Number(filters.ingredientId)) return false;
      if (filters.categoryId && log.ingredient?.category?.id !== Number(filters.categoryId)) return false;
      if (filters.refType && log.refType !== filters.refType) return false;
      if (searchTerm) {
        const haystack = [
          log.ingredient?.name,
          log.ingredient?.sku,
          log.referenceId,
          log.refType,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchTerm)) return false;
      }
      return true;
    });
  }, [logs, filters]);

  const sortedLogs = useMemo(() => {
    const list = [...filteredLogs];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'timestamp') cmp = new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt);
      else if (sortBy === 'ingredient') cmp = (a.ingredient?.name || '').localeCompare(b.ingredient?.name || '');
      else if (sortBy === 'quantity') cmp = Math.abs(a.quantity || 0) - Math.abs(b.quantity || 0);
      else if (sortBy === 'referenceId') cmp = (a.referenceId || '').localeCompare(b.referenceId || '');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredLogs, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedLogs = sortedLogs.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary = useMemo(() => {
    let todayTotal = 0;
    let todayIngredients = new Set();
    let totalQuantity = 0;
    logs.forEach((log) => {
      const qty = Math.abs(log.quantity || 0);
      totalQuantity += qty;
      if (isToday(log.timestamp || log.createdAt)) {
        todayTotal += qty;
        if (log.ingredientId != null) todayIngredients.add(log.ingredientId);
      }
    });
    return {
      todayTotal,
      totalTransactions: logs.length,
      todayIngredients: todayIngredients.size,
      totalQuantity,
    };
  }, [logs]);

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', ingredientId: '', categoryId: '', refType: '', search: '' });
    setPage(1);
  };

  const handleSort = (value) => {
    if (sortBy === value) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(value);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  if (loading) return <Loader label="Loading consumption history..." />;
  if (error) return <ErrorState error={error} retry={fetchData} />;

  const summaryCards = [
    { label: "Today's Consumption", value: fmt(summary.todayTotal), accent: 'text-rose-600' },
    { label: 'Total Transactions', value: fmt(summary.totalTransactions), accent: 'text-slate-900' },
    { label: 'Ingredients Consumed Today', value: fmt(summary.todayIngredients), accent: 'text-blue-600' },
    { label: 'Total Quantity Consumed', value: fmt(summary.totalQuantity), accent: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{slug}</p>
        <h1 className="text-2xl font-bold text-slate-900">Kitchen Consumption History</h1>
        <p className="text-sm text-slate-500">Recipe ingredients auto-deducted from cost center kitchen when orders are prepared</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.label} className="!p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.accent}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card title="Filters" eyebrow="Refine History" className="!p-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <TextField
            label="From Date"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
          />
          <TextField
            label="To Date"
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
          />
          <SelectField
            label="Ingredient"
            value={filters.ingredientId}
            onChange={(e) => updateFilter('ingredientId', e.target.value)}
            options={[
              { label: 'All Ingredients', value: '' },
              ...ingredients.map((i) => ({ label: `${i.name} (${i.sku})`, value: String(i.id) })),
            ]}
          />
          <SelectField
            label="Category"
            value={filters.categoryId}
            onChange={(e) => updateFilter('categoryId', e.target.value)}
            options={[
              { label: 'All Categories', value: '' },
              ...categories.map((c) => ({ label: c.name, value: String(c.id) })),
            ]}
          />
          <SelectField
            label="Reference Type"
            value={filters.refType}
            onChange={(e) => updateFilter('refType', e.target.value)}
            options={REF_TYPE_OPTIONS}
          />
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Search</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Ingredient, SKU, ref #..."
            />
          </label>
        </div>
        {hasActiveFilters ? (
          <div className="mt-4">
            <Button variant="ghost" onClick={resetFilters}>Clear filters</Button>
          </div>
        ) : null}
      </Card>

      {/* Table */}
      <Card
        title="Consumption Records"
        eyebrow="Audit Trail"
        className="!p-0"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <SelectField
              label="Sort"
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              options={SORT_OPTIONS}
              className="w-44"
            />
            <SelectField
              label="Order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              options={[
                { label: 'Descending', value: 'desc' },
                { label: 'Ascending', value: 'asc' },
              ]}
              className="w-40"
            />
          </div>
        }
      >
        {paginatedLogs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              message={hasActiveFilters ? 'No consumption records match the current filters.' : 'No consumption records found yet. Consumption is logged automatically when recipes are prepared.'}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Date &amp; Time</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Ingredient</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Category</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Reference Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Reference Number</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600" scope="col">Quantity Consumed</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Unit</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600" scope="col">Before</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600" scope="col">After</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Movement</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedLogs.map((row) => (
                    <tr key={row.id} className="align-top transition hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{formatDateTime(row.timestamp || row.createdAt)}</td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-900">{row.ingredient?.name || 'N/A'}</span>
                        {row.ingredient?.sku ? <span className="block text-xs text-slate-400">{row.ingredient.sku}</span> : null}
                      </td>
                      <td className="px-4 py-4 text-slate-500">{row.ingredient?.category?.name || '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${REF_TYPE_STYLES[row.refType] || 'bg-slate-100 text-slate-800'}`}>
                          {row.refType?.replace('_', ' ') || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{row.referenceId || '—'}</td>
                      <td className="px-4 py-4 text-right font-semibold text-rose-600">−{fmt(Math.abs(row.quantity || 0))}</td>
                      <td className="px-4 py-4 text-slate-500">{row.unit || row.ingredient?.unit || '—'}</td>
                      <td className="px-4 py-4 text-right text-slate-500">{fmt(row.beforeQuantity ?? row.before)}</td>
                      <td className="px-4 py-4 text-right font-medium text-slate-900">{fmt(row.afterQuantity ?? row.after)}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">OUT · Consumed</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-500">{row.user?.name || row.userName || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                Showing {paginatedLogs.length > 0 ? (safePage - 1) * pageSize + 1 : 0}–
                {(safePage - 1) * pageSize + paginatedLogs.length} of {sortedLogs.length} records
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" className="!px-3 !py-1.5 text-xs" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ← Prev
                </Button>
                <span className="text-xs font-medium text-slate-600">Page {safePage} of {totalPages}</span>
                <Button variant="secondary" className="!px-3 !py-1.5 text-xs" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next →
                </Button>
              </div>
              <SelectField
                label="Rows / Page"
                value={String(pageSize)}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                options={PAGE_SIZE_OPTIONS.map((n) => ({ label: String(n), value: String(n) }))}
                className="w-36"
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
