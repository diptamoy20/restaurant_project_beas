import { useSelector } from 'react-redux';

export function DashboardPage() {
  const metrics = useSelector((state) => state.dashboard.metrics);

  return (
    <section>
      <p className="eyebrow">Overview</p>
      <h2>Restaurant performance snapshot</h2>
      <div className="metric-grid">
        <div className="metric-card">
          <span>Total Orders</span>
          <strong>{metrics.totalOrders}</strong>
        </div>
        <div className="metric-card">
          <span>Revenue</span>
          <strong>${metrics.revenue}</strong>
        </div>
        <div className="metric-card">
          <span>Active Tables</span>
          <strong>{metrics.activeTables}</strong>
        </div>
        <div className="metric-card">
          <span>Members</span>
          <strong>{metrics.members}</strong>
        </div>
      </div>
    </section>
  );
}

