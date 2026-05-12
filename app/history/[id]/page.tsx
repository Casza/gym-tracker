'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Dumbbell, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WorkoutSession, WorkoutSet, Exercise } from '@/lib/types';

type Group = { exercise: Exercise; sets: WorkoutSet[] };

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const mins = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function WorkoutDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sess } = await supabase
        .from('workout_sessions')
        .select('*, workout_templates(name)')
        .eq('id', id)
        .single();
      if (!sess) { router.push('/history'); return; }
      setSession(sess);

      const { data: sets } = await supabase
        .from('workout_sets')
        .select('*, exercises(*)')
        .eq('session_id', id)
        .eq('completed', true)
        .order('set_number');

      if (sets) {
        const map: Record<string, Group> = {};
        for (const s of sets) {
          if (!map[s.exercise_id]) map[s.exercise_id] = { exercise: s.exercises as Exercise, sets: [] };
          map[s.exercise_id].sets.push(s);
        }
        setGroups(Object.values(map));
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function maxWeight(sets: WorkoutSet[]): number | null {
    const ws = sets.map((s) => s.weight).filter((w): w is number => w != null);
    return ws.length > 0 ? Math.max(...ws) : null;
  }

  function totalVolume(sets: WorkoutSet[]): number {
    return sets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </div>
    );
  }

  const totalSets = groups.reduce((a, g) => a + g.sets.length, 0);
  const grandVolume = groups.reduce((a, g) => a + totalVolume(g.sets), 0);

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/history" className="p-2 rounded-xl bg-slate-800 text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{session?.name}</h1>
          <p className="text-slate-400 text-sm">
            {new Date(session?.started_at ?? '').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-800 rounded-2xl p-4 text-center">
          <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="text-white font-bold text-sm">
            {formatDuration(session!.started_at, session!.completed_at)}
          </p>
          <p className="text-slate-500 text-xs">Duration</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 text-center">
          <Dumbbell className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="text-white font-bold text-sm">{totalSets}</p>
          <p className="text-slate-500 text-xs">Sets</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 text-center">
          <Trophy className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="text-white font-bold text-sm">
            {grandVolume > 0 ? `${(grandVolume / 1000).toFixed(1)}t` : '—'}
          </p>
          <p className="text-slate-500 text-xs">Volume</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-6 text-center">
          <p className="text-slate-400">No sets logged for this workout</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ exercise, sets }) => (
            <div key={exercise.id} className="bg-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">{exercise.name}</h3>
                  <p className="text-slate-500 text-xs">{exercise.muscle_group}</p>
                </div>
                <span className="text-slate-400 text-sm">{sets.length} sets</span>
              </div>
              <div className="divide-y divide-slate-700/30">
                {sets.map((set, i) => (
                  <div key={set.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-slate-500 text-sm">Set {i + 1}</span>
                    <span className="text-white font-medium">
                      {set.weight ? `${set.weight} kg × ${set.reps}` : `${set.reps} reps`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 bg-slate-700/20 border-t border-slate-700/40 flex justify-between text-xs text-slate-500">
                <span>Best: {maxWeight(sets) != null ? `${maxWeight(sets)} kg` : '—'}</span>
                <span>Vol: {totalVolume(sets) > 0 ? `${totalVolume(sets)} kg` : '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
