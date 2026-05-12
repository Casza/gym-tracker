'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WorkoutSession } from '@/lib/types';

const BAR: Record<string, string> = {
  'Push Day': 'bg-orange-500',
  'Pull Day': 'bg-blue-500',
  'Legs Day': 'bg-green-500',
};

function dur(start: string, end: string | null) {
  if (!end) return null;
  const m = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtDate(d: string) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

async function deleteSession(id: string) {
  await supabase.from('personal_bests').update({ session_id: null }).eq('session_id', id);
  await supabase.from('workout_sessions').delete().eq('id', id);
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, week: 0, month: 0 });

  useEffect(() => {
    supabase.from('workout_sessions').select('*, workout_templates(name)').order('started_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSessions(data as WorkoutSession[]);
          const now = new Date();
          const wk = new Date(now.getTime() - 7 * 864e5);
          const mo = new Date(now.getFullYear(), now.getMonth(), 1);
          const done = data.filter(s => s.completed_at);
          setStats({ total: done.length, week: done.filter(s => new Date(s.completed_at!) >= wk).length, month: done.filter(s => new Date(s.completed_at!) >= mo).length });
        }
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm('Delete this workout? This cannot be undone.')) return;
    setDeleting(id);
    await deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    setDeleting(null);
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" /></div>;

  return (
    <div className="px-4 pt-8 pb-6 max-w-lg mx-auto space-y-7">
      <h1 className="text-3xl font-black text-white tracking-tight">History</h1>

      <div className="grid grid-cols-3 gap-3">
        {[['Total', stats.total, 'text-white'], ['This Week', stats.week, 'text-orange-400'], ['This Month', stats.month, 'text-white']].map(
          ([label, val, color]) => (
            <div key={label as string} className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-center">
              <p className={`text-3xl font-black ${color}`}>{val}</p>
              <p className="text-slate-500 text-xs mt-1 font-medium">{label}</p>
            </div>
          )
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-10 text-center">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No workouts logged yet</p>
          <Link href="/" className="text-orange-400 text-sm font-semibold mt-2 inline-block">Start a session →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => {
            const bar = BAR[(s as any).workout_templates?.name ?? ''] ?? 'bg-slate-600';
            const d = dur(s.started_at, s.completed_at);
            return (
              <div key={s.id} className="relative">
                <Link
                  href={s.completed_at ? `/history/${s.id}` : `/workout/${s.id}`}
                  className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between active:bg-slate-700/80 transition-colors pr-14"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-11 rounded-full shrink-0 ${bar}`} />
                    <div>
                      <p className="font-bold text-white">{s.name}</p>
                      <p className="text-slate-500 text-sm mt-0.5">
                        {fmtDate(s.started_at)}{d ? ` · ${d}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.completed_at && (
                      <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/25 px-2.5 py-1 rounded-full">Active</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </Link>
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  disabled={deleting === s.id}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  {deleting === s.id
                    ? <div className="w-3.5 h-3.5 border-t border-red-400 rounded-full animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
