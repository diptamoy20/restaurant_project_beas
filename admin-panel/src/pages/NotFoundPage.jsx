import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-2xl font-semibold text-slate-950">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The route you requested does not exist in the admin panel.</p>
      <Link className="mt-4 inline-flex text-sm font-semibold text-slate-900 underline" to="/dashboard">
        Go back to dashboard
      </Link>
    </div>
  );
}

