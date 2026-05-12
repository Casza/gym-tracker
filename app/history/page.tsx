'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dumbbell, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WorkoutSession } from '@/lib/types';

const TEMPLATE_STYLES: Record<string, { light: string; text: string; border: string }> = {
  'Push Day': { light: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  'Pull Day': { light: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  'Legs Day': { light: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
};

function getStyle(name: string) {
  return TEMPLATE_STYLES[name] ?? { light: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const mins = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, thisMonth: 0 });

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('workout_sessions')
        .select('*, workout_templates(name)')
        .order('started_at', { ascending: false });
      if (data) {
        setSessions(data as WorkoutSession[]);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const done = data.filter((s) => s.completed_at);
        setStats({
          total: done.length,
          thisWeek: done.filter((s) => new Date(s.completed_at!) >= weekAgo).length,
          thisMonth: done.filter((s) => new Date(s.completed_at!) >= monthStart).length,
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">History</h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'This Week', value: stats.thisWeek, color: 'text-orange-400' },
          { label: 'This Month', value: stats.thisMonth, color: 'text-white' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-10 text-center">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No workouts logged yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const s = getStyle((session as any).workout_templates?.name ?? '');
            return (
              <Link
                key={session.id}
                href={session.completed_at ? `/history/${session.id}` : `/workout/${session.id}`}
                className="bg-slate-800 rounded-2xl p-4 flex items-center justify-between active:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${s.light} ${s.border} border flex items-center justify-center`}
                  >
                    <Dumbbell className={`w-5 h-5 ${s.text}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{session.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-slate-400 text-sm">{formatDate(session.started_at)}</p>
                      <span className="text-slate-600">·</span>
                      <p className="text-slate-500 text-sm">
                        {formatDuration(session.started_at, session.completed_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!session.completed_at && (
                    <span className="bg-orange-500/10 text-orange-400 text-xs px-2 py-1 rounded-full border border-orange-500/30">
                      Active
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
