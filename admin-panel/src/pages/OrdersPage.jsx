import { useSelector } from 'react-redux';

export function OrdersPage() {
  const liveOrders = useSelector((state) => state.orders.liveOrders);

  return (
    <section>
      <p className="eyebrow">Live Orders</p>
      <h2>Kitchen and service tracking</h2>
      <div className="panel-card">
        {liveOrders.map((order) => (
          <div key={order.id} className="list-row">
            <div>
              <strong>{order.id}</strong>
              <p>Table {order.table}</p>
            </div>
            <span className="status-badge">{order.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

