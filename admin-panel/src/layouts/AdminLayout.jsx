import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { Loader } from '../components/ui/Loader';
import { hydrateProfile } from '../features/auth/authSlice';
import { useGetMeQuery } from '../services/authApi';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AdminLayout() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const currentUserId = useSelector((state) => state.auth.user?.id);
  const { data, isFetching } = useGetMeQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (data && (!currentUserId || data.id === currentUserId)) {
      dispatch(hydrateProfile(data));
    }
  }, [currentUserId, data, dispatch]);

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-slate-900">
      <div className="relative lg:grid lg:min-h-screen lg:grid-cols-[18rem_1fr]">
        <Sidebar />
        <div className="min-w-0">
          <Navbar />
          <main className="space-y-6 px-4 py-6 lg:px-8">
            {isFetching ? <Loader label="Refreshing your session..." /> : null}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
