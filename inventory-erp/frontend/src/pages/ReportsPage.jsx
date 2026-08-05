import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';

export function ReportsPage() {
  const [valuation, setValuation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchValuation = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('reporting/reports/valuation');
      setValuation(res);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load valuation report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValuation();
  }, []);

  const reportCards = [
    { title: 'Stock Movement Report', description: 'Track all inventory movements across locations with date range filtering.', color: 'border-blue-500' },
    { title: 'Inventory Valuation Report', description: 'Current stock value based on supplier mapped costs.', color: 'border-emerald-500', data: valuation },
    { title: 'Food Cost Report', description: 'Cost per menu item based on recipe BOM and current ingredient prices.', color: 'border-purple-500' },
    { title: 'Waste Analysis Report', description: 'Breakdown of wastage by type, ingredient, and time period.', color: 'border-rose-500' },
    { title: 'Fast & Slow Moving', description: 'Identify high-demand and low-demand ingredients for optimal stocking.', color: 'border-amber-500' },
    { title: 'Requisition Analytics', description: 'Frequency and fulfillment rates of store room replenishment requests.', color: 'border-cyan-500' },
  ];

  if (loading) return <Loader label="Loading reports..." />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Analytics and reporting for inventory operations.</p>
        </div>
        <Button onClick={fetchValuation} variant="secondary">Refresh</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => (
          <Card key={report.title} title={report.title} eyebrow={report.description}>
            {report.data ? (
              <div className="mt-3 space-y-2">
                {report.data.totalItems !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Items:</span>
                    <span className="font-semibold text-slate-900">{report.data.totalItems}</span>
                  </div>
                )}
                {report.data.totalValue !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Value:</span>
                    <span className="font-semibold text-emerald-600">Rs. {report.data.totalValue?.toFixed(2)}</span>
                  </div>
                )}
                {report.data.items && report.data.items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {report.data.items.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-600">
                        <span>{item.name || item.ingredientName || 'Item'}</span>
                        <span>Rs. {(item.value || item.totalValue || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-3">Click &quot;Refresh&quot; to load data.</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
