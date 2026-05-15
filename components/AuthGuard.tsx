'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

const PUBLIC = ['/login', '/auth'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) router.replace('/login');
    if (user && pathname === '/login') router.replace('/');
  }, [user, loading, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </div>
    );
  }

  if (!user && !isPublic) return null;

  return <>{children}</>;
}
