import { useEffect, useMemo, useState } from "react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Loader } from "../components/ui/Loader";
import { SelectField } from "../components/ui/SelectField";
import { Table } from "../components/ui/Table";
import { TextField } from "../components/ui/TextField";
import { PermissionGate } from "../components/PermissionGate";
import {
  useAcceptOrderMutation,
  useGetOrderByIdQuery,
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
} from "../services/orderApi";

const statusClasses = {
  PLACED: "bg-amber-100 text-amber-800",
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-orange-100 text-orange-900",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-900",
  ON_THE_WAY: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-900",
  SERVED: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-rose-100 text-rose-700",
};

const timeOptions = [
  { value: "recent", label: "Recent" },
  { value: "last_1_hour", label: "Last 1 Hour" },
  { value: "last_3_hours", label: "Last 3 Hours" },
];

const typeOptions = [
  { value: "", label: "Type" },
  { value: "DINE_IN", label: "Dine In" },
  { value: "DELIVERY", label: "Delivery" },
];

const paymentOptions = [
  { value: "", label: "Payment" },
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
];

const statusOptions = [
  { value: "", label: "Status" },
  { value: "PREPARING", label: "Preparing" },
  { value: "OUT_FOR_DELIVERY", label: "Out For Delivery" },
  { value: "ON_THE_WAY", label: "On The Way" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "SERVED", label: "Served" },
];

const actionOptions = [
  { value: "", label: "Actions" },
  { value: "ACCEPT", label: "Accept" },
  { value: "REJECT", label: "Reject" },
];

function formatCurrency(value) {
  return `₹${Number(value ?? 0).toFixed(2)}`;
}

function formatLabel(value) {
  return String(value || "-")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function OrderDetailsModal({ orderId, onClose }) {
  const { data, isFetching, error } = useGetOrderByIdQuery(orderId, {
    skip: !orderId,
    pollingInterval: 15000,
  });

  if (!orderId) {
    return null;
  }

  const subtotal = data?.totalAmount ?? 0;
  const discount = data?.discountAmount ?? 0;
  const total = data?.finalAmount ?? subtotal;
  const deliveryCharge =
    data?.orderType === "DELIVERY"
      ? Math.max(0, total - subtotal + discount)
      : 0;
  const platformFee = 0;
  const etaStart = data?.createdAt
    ? new Date(
        new Date(data.createdAt).getTime() +
          Math.max(15, (data.estimatedDeliveryMinutes ?? 30) - 5) * 60000,
      )
    : null;
  const etaEnd = data?.createdAt
    ? new Date(
        new Date(data.createdAt).getTime() +
          (data.estimatedDeliveryMinutes ?? 30) * 60000,
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex justify-end">
          <button
            className="grid h-9 w-9 place-items-center rounded-full text-xl text-slate-700 hover:bg-slate-100"
            onClick={onClose}
            type="button"
            aria-label="Close order details"
          >
            ×
          </button>
        </div>

        {isFetching ? <Loader label="Loading order details..." /> : null}
        {error ? (
          <ErrorState
            message={
              error?.data?.message ||
              error?.error ||
              "Unable to load order details."
            }
          />
        ) : null}

        {data ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[1fr_320px]">
              <div className="flex items-center gap-4">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-blue-50 text-blue-600">
                  <svg
                    fill="none"
                    height="36"
                    viewBox="0 0 24 24"
                    width="36"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM19 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                    <path d="M7 18h8V6H4v8h3m8 4h2m-2-8h3l2 4v4" />
                  </svg>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-slate-950">
                      Order ID <span className="text-blue-600">#{data.id}</span>
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[data.status] ?? "bg-slate-200 text-slate-700"}`}
                    >
                      {formatLabel(data.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Placed on {formatDateTime(data.createdAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">
                  Estimated Delivery Time
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {data.estimatedDeliveryMinutes ?? 30} min
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Expected by{" "}
                  <span className="font-semibold text-blue-600">
                    {etaStart && etaEnd
                      ? `${etaStart.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} - ${etaEnd.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                      : "-"}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
              <section className="overflow-hidden rounded-2xl border border-slate-200">
                <h4 className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-950">
                  Order Items
                </h4>
                <div className="space-y-4 p-5">
                  {(data.items ?? []).map((item) => (
                    <div className="space-y-2" key={item.id}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">
                            {item.menuItem?.name ?? "Menu Item"}
                          </p>
                          <p className="text-sm text-slate-500">
                            Qty: {item.quantity}
                          </p>
                          {item.addons?.length ? (
                            <div className="mt-2 space-y-1 text-sm text-slate-500">
                              {item.addons.map((addon) => (
                                <div key={addon.id}>
                                  <span className="font-medium text-slate-700">
                                    {addon.addonGroupName}:
                                  </span>{" "}
                                  {addon.addonOptionName}
                                  {addon.quantity > 1
                                    ? ` x${addon.quantity}`
                                    : ""}
                                  <span className="ml-2 text-slate-500">
                                    +{formatCurrency(addon.addonOptionPrice)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <p className="font-semibold text-slate-950">
                          {formatCurrency(item.totalPrice)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Charge</span>
                      <span>{formatCurrency(deliveryCharge)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Platform Fee</span>
                      <span>{formatCurrency(platformFee)}</span>
                    </div>
                    {discount ? (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount</span>
                        <span>-{formatCurrency(discount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-base font-bold text-slate-950">
                      <span>Total Amount</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200">
                <h4 className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-950">
                  Order Details
                </h4>
                <div className="grid gap-4 p-5 text-sm">
                  <DetailRow
                    label="Customer Name"
                    value={
                      data.customer?.name || `Customer #${data.userId ?? "-"}`
                    }
                  />
                  <DetailRow
                    label="Phone Number"
                    value={data.customer?.phone || "-"}
                  />
                  <DetailRow
                    label="Delivery Address"
                    value={
                      data.address
                        ? [
                            data.address.address,
                            data.address.city,
                            data.address.state,
                          ]
                            .filter(Boolean)
                            .join(", ")
                        : data.table
                          ? `Table ${data.table.tableNumber}`
                          : "-"
                    }
                  />
                  <DetailRow
                    label="Payment Method"
                    value={formatLabel(data.paymentMethod)}
                  />
                  <DetailRow
                    label="Restaurant"
                    value={data.restaurant?.name || "-"}
                  />
                  <DetailRow
                    label="Order Type"
                    value={formatLabel(data.orderType)}
                  />
                  <DetailRow
                    label="Payment"
                    value={formatLabel(data.paymentMethod)}
                  />
                  <DetailRow
                    label="Status"
                    value={
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[data.status] ?? "bg-slate-200 text-slate-700"}`}
                      >
                        {formatLabel(data.status)}
                      </span>
                    }
                  />
                </div>
              </section>
            </div>

            <Timeline order={data} />

            <div className="flex justify-center">
              <Button onClick={onClose} variant="secondary">
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-950">{value}</span>
    </div>
  );
}

function Timeline({ order }) {
  const deliveredLabel = order.orderType === "DINE_IN" ? "Served" : "Delivered";
  const steps = [
    {
      label: "Order Placed",
      statuses: ["PENDING", "PLACED"],
      at: order.createdAt,
    },
    { label: "Accepted", statuses: ["ACCEPTED"], at: order.acceptedAt },
    {
      label: order.orderType === "DINE_IN" ? "Preparing" : "On The Way",
      statuses: ["PREPARING", "OUT_FOR_DELIVERY", "ON_THE_WAY"],
      at: order.preparedAt,
    },
    {
      label: deliveredLabel,
      statuses: ["DELIVERED", "SERVED"],
      at: order.deliveredAt,
    },
  ];
  const completedIndex = steps.findLastIndex((step) =>
    step.statuses.includes(order.status),
  );

  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <div className="grid gap-4 sm:grid-cols-4">
        {steps.map((step, index) => {
          const done = index <= completedIndex && order.status !== "CANCELLED";
          return (
            <div
              className="relative flex flex-col items-center text-center"
              key={step.label}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}
              >
                {done ? "✓" : "•"}
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {step.label}
              </p>
              <p className="text-xs text-slate-500">
                {step.at
                  ? new Date(step.at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function OrdersPage() {
  const [filters, setFilters] = useState({
    timeRange: "recent",
    type: "",
    payment: "",
    status: "",
    action: "",
    search: "",
    limit: 10,
    offset: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [acceptOrder, acceptState] = useAcceptOrderMutation();
  const [updateOrderStatus, { error: actionError, isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({
        ...current,
        search: searchText.trim(),
        offset: 0,
      }));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  const queryParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value !== "" && value !== null && value !== undefined,
        ),
      ),
    [filters],
  );

  const { data, isFetching, error } = useListOrdersQuery(queryParams, {
    pollingInterval: 15000,
  });

  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const offset = data?.offset ?? filters.offset;
  const limit = data?.limit ?? filters.limit;
  const showingFrom = total > 0 ? offset + 1 : 0;
  const showingTo = Math.min(offset + limit, total);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, offset: 0 }));
  };

  const handleAccept = async (order) => {
    await acceptOrder(order.id).unwrap();
  };

  const handleReject = async (order) => {
    await updateOrderStatus({
      orderId: order.id,
      status: "CANCELLED",
    }).unwrap();
  };

  return (
    <div className="space-y-6">
      <Card eyebrow="Operations" title="Order Management">
        <div className="mb-6 grid gap-4 lg:grid-cols-[220px_1fr]">
          <SelectField
            label="Time"
            value={filters.timeRange}
            onChange={(event) => updateFilter("timeRange", event.target.value)}
            options={timeOptions}
          />
          <TextField
            label="Search"
            placeholder="Search by customer name, order ID, or restaurant name"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        {isFetching ? <Loader label="Refreshing order data..." /> : null}
        {error ? (
          <ErrorState
            message={
              error?.data?.message ||
              error?.error ||
              "Order data could not be loaded."
            }
          />
        ) : null}

        <Table
          columns={[
            {
              key: "id",
              header: "ID",
              render: (row) => (
                <button
                  className="font-semibold text-blue-600 underline"
                  onClick={() => setSelectedOrderId(row.id)}
                  type="button"
                >
                  #{row.id}
                </button>
              ),
            },
            {
              key: "name",
              header: "Name",
              render: (row) =>
                row.customer?.name || `Customer #${row.userId ?? "-"}`,
            },
            {
              key: "restaurant",
              header: "Restaurant",
              render: (row) => row.restaurant?.name || "-",
            },
            {
              key: "type",
              header: (
                <select
                  className="w-full bg-transparent font-semibold outline-none"
                  value={filters.type}
                  onChange={(event) => updateFilter("type", event.target.value)}
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ),
              render: (row) => formatLabel(row.orderType),
            },
            {
              key: "payment",
              header: (
                <select
                  className="w-full bg-transparent font-semibold outline-none"
                  value={filters.payment}
                  onChange={(event) =>
                    updateFilter("payment", event.target.value)
                  }
                >
                  {paymentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ),
              render: (row) => formatLabel(row.paymentMethod),
            },
            {
              key: "status",
              header: (
                <select
                  className="w-full bg-transparent font-semibold outline-none"
                  value={filters.status}
                  onChange={(event) =>
                    updateFilter("status", event.target.value)
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ),
              render: (row) => (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[row.status] ?? "bg-slate-200 text-slate-700"}`}
                >
                  {formatLabel(row.status)}
                </span>
              ),
            },
            {
              key: "finalAmount",
              header: "Total Price",
              render: (row) => formatCurrency(row.finalAmount),
            },
            {
              key: "orderDetails",
              header: "Order Details",
              render: (row) => (
                <Button
                  className="h-10 w-10 rounded-full px-0"
                  onClick={() => setSelectedOrderId(row.id)}
                  variant="secondary"
                  aria-label={`View order ${row.id}`}
                >
                  <svg
                    fill="none"
                    height="18"
                    viewBox="0 0 24 24"
                    width="18"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </Button>
              ),
            },
            {
              key: "actions",
              header: (
                <select
                  className="w-full bg-transparent font-semibold outline-none"
                  value={filters.action}
                  onChange={(event) =>
                    updateFilter("action", event.target.value)
                  }
                >
                  {actionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ),
              render: (row) => (
                <PermissionGate
                  fallback={
                    <span className="text-xs text-slate-400">Read only</span>
                  }
                  module="orders"
                  action="accept"
                >
                  <div className="flex gap-2">
                    <Button
                      className="border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                      disabled={
                        acceptState.isLoading ||
                        isUpdating ||
                        !["PENDING", "PLACED"].includes(row.status)
                      }
                      onClick={() => handleAccept(row)}
                    >
                      Accept
                    </Button>
                    <PermissionGate module="orders" action="reject">
                      <Button
                        className="border border-rose-300 bg-white text-rose-600 hover:bg-rose-50"
                        disabled={
                          isUpdating ||
                          ["DELIVERED", "SERVED", "CANCELLED"].includes(
                            row.status,
                          )
                        }
                        onClick={() => handleReject(row)}
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                    </PermissionGate>
                  </div>
                </PermissionGate>
              ),
            },
          ]}
          data={orders}
          emptyMessage="No orders match the selected filters."
        />

        {!isFetching && !error && !orders.length ? (
          <EmptyState
            description="Try changing the filters or search term."
            title="No orders found"
          />
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Showing {showingFrom}-{showingTo} of {total} orders
          </p>
          <div className="flex gap-2">
            <Button
              disabled={offset <= 0}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  offset: Math.max(0, current.offset - current.limit),
                }))
              }
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={offset + limit >= total}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  offset: current.offset + current.limit,
                }))
              }
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </div>

        {actionError ? (
          <ErrorState
            message={
              actionError?.data?.message ||
              actionError?.error ||
              "Order action failed."
            }
          />
        ) : null}
      </Card>

      <OrderDetailsModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}
