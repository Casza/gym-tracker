'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Dumbbell, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/history', icon: History, label: 'History' },
  { href: '/exercises', icon: Dumbbell, label: 'Exercises' },
];

export default function BottomNav() {
  const pathname = usePathname();

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-colors ${
                isActive ? 'text-orange-400' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}

        <button
          onClick={signOut}
          className="flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-colors text-slate-500 active:text-red-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
