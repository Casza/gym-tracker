'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dumbbell, ChevronRight, Flame, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WorkoutSession, PersonalBest, Exercise, WorkoutTemplate } from '@/lib/types';

const TEMPLATE_STYLES: Record<string, { light: string; text: string; border: string }> = {
  'Push Day': { light: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  'Pull Day': { light: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  'Legs Day': { light: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
};

function getStyle(name: string) {
  return TEMPLATE_STYLES[name] ?? { light: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [pbs, setPbs] = useState<(PersonalBest & { exercises: Exercise })[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [tRes, sRes, pbRes] = await Promise.all([
        supabase.from('workout_templates').select('*').order('name'),
        supabase
          .from('workout_sessions')
          .select('*, workout_templates(name)')
          .order('started_at', { ascending: false })
          .limit(3),
        supabase
          .from('personal_bests')
          .select('*, exercises(name, muscle_group)')
          .order('achieved_at', { ascending: false })
          .limit(5),
      ]);
      if (tRes.data) setTemplates(tRes.data);
      if (sRes.data) {
        setRecentSessions(sRes.data as WorkoutSession[]);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        setWeeklyCount(
          sRes.data.filter(
            (s) => s.completed_at && new Date(s.completed_at) >= weekAgo,
          ).length,
        );
      }
      if (pbRes.data) setPbs(pbRes.data as (PersonalBest & { exercises: Exercise })[]);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white">Gym Tracker</h1>
          <p className="text-slate-400 text-sm mt-0.5">PPL Program</p>
        </div>
        {weeklyCount > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-bold text-sm">{weeklyCount} this week</span>
          </div>
        )}
      </div>

      {/* Quick Start */}
      <section className="mb-7">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Start</h2>
        <div className="grid grid-cols-3 gap-3">
          {templates.map((t) => {
            const s = getStyle(t.name);
            return (
              <Link
                key={t.id}
                href={`/workout/new?template=${t.id}`}
                className={`${s.light} ${s.border} border rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform`}
              >
                <Dumbbell className={`w-6 h-6 ${s.text}`} />
                <span className={`text-xs font-bold ${s.text} text-center leading-tight`}>
                  {t.name.replace(' Day', '')}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Workouts */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent</h2>
          <Link href="/history" className="text-orange-400 text-sm">
            See all
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-8 text-center">
            <Dumbbell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No workouts yet — start your first session!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => {
              const s = getStyle((session as any).workout_templates?.name ?? '');
              return (
                <Link
                  key={session.id}
                  href={
                    session.completed_at ? `/history/${session.id}` : `/workout/${session.id}`
                  }
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
                      <p className="text-slate-400 text-sm">{formatDate(session.started_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!session.completed_at && (
                      <span className="bg-orange-500/10 text-orange-400 text-xs px-2 py-1 rounded-full border border-orange-500/30">
                        In Progress
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Personal Bests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Bests</h2>
          <Link href="/exercises" className="text-orange-400 text-sm">
            All PRs
          </Link>
        </div>
        {pbs.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-8 text-center">
            <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Complete workouts to track personal bests</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/70">
            {pbs.map((pb) => (
              <div key={pb.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-white font-medium text-sm">{pb.exercises?.name}</p>
                  <p className="text-slate-500 text-xs">{pb.exercises?.muscle_group}</p>
                </div>
                <div className="text-right">
                  <p className="text-orange-400 font-bold text-sm">
                    {pb.weight ? `${pb.weight} kg` : `${pb.reps} reps`}
                  </p>
                  {pb.weight && pb.reps && (
                    <p className="text-slate-500 text-xs">× {pb.reps} reps</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
