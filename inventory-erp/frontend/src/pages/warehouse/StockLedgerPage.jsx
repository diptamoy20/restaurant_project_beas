import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { SelectField } from '../../components/ui/SelectField';

const REF_TYPE_STYLES = {
  GOODS_RECEIPT: 'bg-blue-100 text-blue-800',
  TRANSFER: 'bg-indigo-100 text-indigo-800',
  RECIPE_CONSUMPTION: 'bg-rose-100 text-rose-800',
  MATERIAL_RETURN: 'bg-cyan-100 text-cyan-800',
  WASTE: 'bg-rose-100 text-rose-800',
  ADJUSTMENT: 'bg-amber-100 text-amber-800',
  PURCHASE: 'bg-emerald-100 text-emerald-800',
  OPENING_STOCK: 'bg-slate-100 text-slate-800',
};

const LOCATION_STYLES = {
  WAREHOUSE: 'bg-slate-100 text-slate-700',
  STORE: 'bg-violet-100 text-violet-700',
  KITCHEN: 'bg-orange-100 text-orange-700',
};

const MOVEMENT_STYLES = {
  IN: 'bg-emerald-100 text-emerald-800',
  OUT: 'bg-rose-100 text-rose-800',
  ADJUSTMENT: 'bg-amber-100 text-amber-800',
};

const MOVEMENT_ROW_BORDER = {
  IN: 'border-l-emerald-500',
  OUT: 'border-l-rose-500',
  BLUE: 'border-l-blue-500',
  ORANGE: 'border-l-amber-500',
};

const REF_TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Goods Receipt (GRN)', value: 'GOODS_RECEIPT' },
  { label: 'Transfer', value: 'TRANSFER' },
  { label: 'Recipe Consumption', value: 'RECIPE_CONSUMPTION' },
  { label: 'Material Return', value: 'MATERIAL_RETURN' },
  { label: 'Waste', value: 'WASTE' },
  { label: 'Stock Adjustment', value: 'ADJUSTMENT' },
  { label: 'Purchase', value: 'PURCHASE' },
  { label: 'Opening Stock', value: 'OPENING_STOCK' },
];

const MOVEMENT_OPTIONS = [
  { label: 'All Movements', value: '' },
  { label: 'Stock In', value: 'IN' },
  { label: 'Stock Out', value: 'OUT' },
  { label: 'Adjustment', value: 'ADJUSTMENT' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SORTABLE_HEADERS = {
  timestamp: 'Date & Time',
  referenceId: 'Transaction No.',
  ingredientName: 'Ingredient',
  movementType: 'Movement',
};

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function movementColor(row) {
  if (row.refType === 'TRANSFER') return 'BLUE';
  if (row.refType === 'ADJUSTMENT' || row.movementType === 'ADJUSTMENT') return 'ORANGE';
  if (row.quantity > 0) return 'IN';
  if (row.quantity < 0) return 'OUT';
  return 'BLUE';
}

export function StockLedgerPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({ totalRows: 0, totalIn: 0, totalOut: 0, totalAdjustment: 0, netChange: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    locationType: '',
    warehouseId: '',
    restaurantId: '',
    ingredientId: '',
    refType: '',
    movementType: '',
    dateFrom: '',
    dateTo: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selected, setSelected] = useState(null);

  const [ingredients, setIngredients] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.locationType) params.append('locationType', filters.locationType);
    if (filters.warehouseId) params.append('warehouseId', filters.warehouseId);
    if (filters.restaurantId) params.append('restaurantId', filters.restaurantId);
    if (filters.ingredientId) params.append('ingredientId', filters.ingredientId);
    if (filters.refType) params.append('refType', filters.refType);
    if (filters.movementType) params.append('movementType', filters.movementType);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    setRefreshing(true);
    try {
      const res = await apiFetch(`reporting/ledger?${params.toString()}`);
      setItems(Array.isArray(res.items) ? res.items : []);
      setPagination(res.pagination || { page, pageSize, total: 0, totalPages: 0 });
      setSummary(res.summary || {});
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load stock ledger.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, page, pageSize, sortBy, sortOrder]);

  const fetchOptions = useCallback(async () => {
    try {
      const [ingRes, whRes, restRes] = await Promise.all([
        apiFetch('master/ingredients').catch(() => []),
        apiFetch('warehouse').catch(() => []),
        apiFetch('integration/restaurants').catch(() => []),
      ]);
      setIngredients(Array.isArray(ingRes) ? ingRes : ingRes.items || []);
      setWarehouses(Array.isArray(whRes) ? whRes : []);
      setRestaurants(Array.isArray(restRes) ? restRes : []);
    } catch { /* filters degrade gracefully */ }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setFilters({
      search: '',
      locationType: '',
      warehouseId: '',
      restaurantId: '',
      ingredientId: '',
      refType: '',
      movementType: '',
      dateFrom: '',
      dateTo: '',
    });
    setPage(1);
  };

  const hasActiveFilters =
    filters.search || filters.locationType || filters.warehouseId || filters.restaurantId ||
    filters.ingredientId || filters.refType || filters.movementType || filters.dateFrom || filters.dateTo;

  if (loading && items.length === 0) return <Loader label="Loading stock ledger..." />;

  const renderSortHeader = (key, label) => (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left font-semibold text-slate-600 hover:text-slate-900"
      key={key}
      scope="col"
      onClick={() => handleSort(key)}
    >
      {label}
      {sortBy === key ? (
        <span className="ml-1 text-slate-400">{sortOrder === 'asc' ? '▲' : '▼'}</span>
      ) : null}
    </th>
  );

  const summaryCards = [
    { label: 'Total Entries', value: fmt(summary.totalRows), accent: 'text-slate-900' },
    { label: 'Total Stock In', value: `+${fmt(summary.totalIn)}`, accent: 'text-emerald-600' },
    { label: 'Total Stock Out', value: `−${fmt(summary.totalOut)}`, accent: 'text-rose-600' },
    { label: 'Net Movement', value: fmt(summary.netChange), accent: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Ledger</h1>
          <p className="text-sm text-slate-500">
            Single immutable audit trail of every stock movement across warehouse, store, and kitchen.
          </p>
        </div>
        {hasActiveFilters ? (
          <Button variant="ghost" onClick={resetFilters}>Clear filters</Button>
        ) : null}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.label} className="!p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.accent}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <Card title="Filters" eyebrow="Refine Ledger" className="!p-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Search</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Transaction # or ingredient..."
              />
            </label>
          </div>
          <SelectField
            label="Location"
            value={filters.locationType}
            onChange={(e) => updateFilter('locationType', e.target.value)}
            options={[
              { label: 'All Locations', value: '' },
              { label: 'Warehouse', value: 'WAREHOUSE' },
              { label: 'Store', value: 'STORE' },
              { label: 'Kitchen', value: 'KITCHEN' },
            ]}
          />
          <SelectField
            label="Warehouse"
            value={filters.warehouseId}
            onChange={(e) => updateFilter('warehouseId', e.target.value)}
            options={[
              { label: 'All Warehouses', value: '' },
              ...warehouses.map((w) => ({ label: w.name, value: String(w.id) })),
            ]}
          />
          <SelectField
            label="Restaurant"
            value={filters.restaurantId}
            onChange={(e) => updateFilter('restaurantId', e.target.value)}
            options={[
              { label: 'All Restaurants', value: '' },
              ...restaurants.map((r) => ({ label: r.name, value: String(r.id) })),
            ]}
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
            label="Transaction Type"
            value={filters.refType}
            onChange={(e) => updateFilter('refType', e.target.value)}
            options={REF_TYPE_OPTIONS}
          />
          <SelectField
            label="Movement"
            value={filters.movementType}
            onChange={(e) => updateFilter('movementType', e.target.value)}
            options={MOVEMENT_OPTIONS}
          />
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
            label="Rows / Page"
            value={String(pageSize)}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            options={PAGE_SIZE_OPTIONS.map((n) => ({ label: String(n), value: String(n) }))}
          />
        </div>
      </Card>

      {error ? (
        <ErrorState error={error} />
      ) : items.length === 0 ? (
        <EmptyState message={hasActiveFilters ? 'No ledger entries match the current filters.' : 'No ledger entries found yet. Stock movements will appear here automatically.'} />
      ) : (
        <Card
          title="Stock Movement Ledger"
          eyebrow="Audit Trail"
          actions={
            refreshing ? (
              <span className="text-xs font-medium text-slate-400">Refreshing…</span>
            ) : null
          }
          className="!p-0"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {renderSortHeader('timestamp', 'Date & Time')}
                  {renderSortHeader('referenceId', 'Transaction No.')}
                  <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Transaction Type</th>
                  {renderSortHeader('ingredientName', 'Ingredient')}
                  <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Category</th>
                  {renderSortHeader('movementType', 'Movement')}
                  <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Source → Destination</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600" scope="col">Before</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600" scope="col">Change</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600" scope="col">After</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">Unit</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600" scope="col">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((row) => {
                  const color = movementColor(row);
                  return (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-l-4 align-top transition hover:bg-slate-50/80 ${MOVEMENT_ROW_BORDER[color]}`}
                      onClick={() => setSelected(row)}
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{formatDateTime(row.timestamp)}</td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">{row.referenceId || '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${REF_TYPE_STYLES[row.refType] || 'bg-slate-100 text-slate-800'}`}>
                          {row.transactionType || row.refType}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-slate-900">{row.ingredient?.name || 'N/A'}</span>
                        {row.ingredient?.sku ? <span className="block text-xs text-slate-400">{row.ingredient.sku}</span> : null}
                      </td>
                      <td className="px-4 py-4 text-slate-500">{row.categoryName || '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${MOVEMENT_STYLES[row.movementType] || 'bg-slate-100 text-slate-800'}`}>
                          {row.movementType === 'ADJUSTMENT' ? 'ADJ' : row.movementType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${LOCATION_STYLES[row.locationType] || 'bg-slate-100 text-slate-800'}`}>
                          {row.locationType}
                        </span>
                        <span className="ml-1.5 text-xs text-slate-500">{row.locationName || `#${row.locationId}`}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                        {row.sourceLocation?.name || '—'}
                        <span className="mx-1 text-slate-300">→</span>
                        {row.destinationLocation?.name || '—'}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-500">{fmt(row.beforeQuantity)}</td>
                      <td className={`px-4 py-4 text-right font-semibold ${row.quantity > 0 ? 'text-emerald-600' : row.quantity < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                        {row.quantity > 0 ? '+' : ''}{fmt(row.quantity)}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-slate-900">{fmt(row.afterQuantity)}</td>
                      <td className="px-4 py-4 text-slate-500">{row.unit}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-500">{row.userName || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Showing {items.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0}–
              {Math.min((pagination.page - 1) * pagination.pageSize + items.length, pagination.total)} of {pagination.total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="!px-3 !py-1.5 text-xs" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ← Prev
              </Button>
              <span className="text-xs font-medium text-slate-600">
                Page {pagination.page} of {Math.max(1, pagination.totalPages)}
              </span>
              <Button
                variant="secondary"
                className="!px-3 !py-1.5 text-xs"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} title="Stock Ledger Entry" onClose={() => setSelected(null)} scrollOverlay maxWidth="max-w-3xl">
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-slate-900">{selected.referenceId || `Entry #${selected.id}`}</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${REF_TYPE_STYLES[selected.refType] || 'bg-slate-100 text-slate-800'}`}>
                {selected.transactionType || selected.refType}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${MOVEMENT_STYLES[selected.movementType] || 'bg-slate-100 text-slate-800'}`}>
                {selected.movementType}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {[
                { label: 'Date & Time', value: formatDateTime(selected.timestamp) },
                { label: 'Ingredient', value: `${selected.ingredient?.name || 'N/A'}${selected.ingredient?.sku ? ` (${selected.ingredient.sku})` : ''}` },
                { label: 'Category', value: selected.categoryName || '—' },
                { label: 'Unit', value: selected.unit || '—' },
                { label: 'Location', value: `${selected.locationType} · ${selected.locationName || `#${selected.locationId}`}` },
                { label: 'Source', value: `${selected.sourceLocation?.type || '—'} · ${selected.sourceLocation?.name || '—'}` },
                { label: 'Destination', value: `${selected.destinationLocation?.type || '—'} · ${selected.destinationLocation?.name || '—'}` },
                { label: 'Before Quantity', value: fmt(selected.beforeQuantity) },
                { label: 'Change Quantity', value: `${selected.quantity > 0 ? '+' : ''}${fmt(selected.quantity)}` },
                { label: 'After Quantity', value: fmt(selected.afterQuantity) },
                { label: 'Reference', value: selected.referenceId || '—' },
                { label: 'User', value: `${selected.userName || 'System Integration'}${selected.user?.role ? ` (${selected.user.role})` : ''}` },
                { label: 'Batch Number', value: selected.batchNumber || '—' },
                { label: 'Remarks', value: selected.remarks || '—' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-0.5 border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</span>
                  <span className="text-sm font-medium text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
