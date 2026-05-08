export function OrdersPage() {
  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Orders</p>
        <h2>Your orders</h2>
      </div>
      <div className="empty-state">
        <h3>No orders yet</h3>
        <p className="copy">Orders you place from this account will appear here.</p>
      </div>
    </section>
  );
}
