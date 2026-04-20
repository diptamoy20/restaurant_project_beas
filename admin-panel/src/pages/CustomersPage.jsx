import { useState } from 'react';

import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import { TextField } from '../components/ui/TextField';
import { useGetMembershipByUserIdQuery } from '../services/customerApi';

export function CustomersPage() {
  const [userId, setUserId] = useState('3');
  const { data, isLoading, error } = useGetMembershipByUserIdQuery(userId, {
    skip: !userId,
  });

  return (
    <div className="space-y-6">
      <Card eyebrow="Customers & Membership" title="Membership lookup">
        <div className="max-w-xs">
          <TextField label="Customer user ID" onChange={(event) => setUserId(event.target.value)} value={userId} />
        </div>

        <div className="mt-6">
          {isLoading ? <Loader label="Loading membership details..." /> : null}
          {error ? (
            <ErrorState message={error?.data?.message || error?.error || 'Membership request failed.'} />
          ) : null}
          {!isLoading && !error && !data ? (
            <EmptyState
              description="Enter a user ID to inspect points and tier details returned by the backend."
              title="No membership selected"
            />
          ) : null}
          {data ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Membership ID</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{data.id}</p>
              </div>
              <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">User ID</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{data.userId}</p>
              </div>
              <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">Tier</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{data.tier?.name ?? 'Unknown'}</p>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

