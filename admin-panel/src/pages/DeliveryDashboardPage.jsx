import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import {
  useGetMyDeliveryDashboardQuery,
  useUpdateMyAvailabilityMutation,
} from '../services/deliveryApi';
import { DeliveryOrderList } from './DeliveryOrderList';

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value ?? 0}</p>
    </div>
  );
}

export function DeliveryDashboardPage() {
  const { data, isFetching, error } = useGetMyDeliveryDashboardQuery(undefined, {
    pollingInterval: 15000,
  });
  const [updateAvailability, availabilityState] = useUpdateMyAvailabilityMutation();
  const profile = data?.profile;
  const stats = data?.stats ?? {};
  const activeOrders = data?.assignedOrders ?? [];

  const toggleAvailability = async () => {
    await updateAvailability({ isAvailable: !profile?.isAvailable }).unwrap();
  };

  return (
    <div className="space-y-6">
      <Card
        eyebrow="Delivery"
        title="Dashboard"
        actions={
          profile ? (
            <Button
              disabled={availabilityState.isLoading}
              onClick={toggleAvailability}
              variant={profile.isAvailable ? 'secondary' : 'primary'}
            >
              {profile.isAvailable ? 'Available' : 'Unavailable'}
            </Button>
          ) : null
        }
      >
        {isFetching ? <Loader label="Refreshing delivery summary..." /> : null}
        {error ? (
          <ErrorState
            message={
              error?.data?.message || error?.error || 'Unable to load your delivery dashboard.'
            }
          />
        ) : null}
        {availabilityState.error ? (
          <div className="mb-4">
            <ErrorState
              message={
                availabilityState.error?.data?.message ||
                availabilityState.error?.error ||
                'Unable to update availability.'
              }
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Assigned" value={stats.assigned} />
          <StatCard label="On the way" value={stats.onTheWay} />
          <StatCard label="Delivered" value={stats.delivered} />
        </div>
      </Card>

      <Card eyebrow="Active" title="Orders for you">
        <DeliveryOrderList
          orders={activeOrders}
          emptyMessage="No active delivery orders. Ask admin to assign a delivery order."
        />
      </Card>
    </div>
  );
}
