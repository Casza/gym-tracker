'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Plus, Trophy, Trash2, Flag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WorkoutSession, Exercise } from '@/lib/types';

type LocalSet = {
  id?: string;
  weight: string;
  reps: string;
  completed: boolean;
};

type PrevSet = { set_number: number; weight: number | null; reps: number | null };

type ExerciseData = {
  exercise: Exercise;
  sets: LocalSet[];
  previousSets: PrevSet[];
  pb: { weight: number | null; reps: number | null } | null;
};

const HEADER_COLORS: Record<string, string> = {
  'Push Day': 'text-orange-400',
  'Pull Day': 'text-blue-400',
  'Legs Day': 'text-green-400',
};

export default function ActiveWorkoutPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exerciseData, setExerciseData] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    loadWorkout();
  }, [id]);

  useEffect(() => {
    if (!session) return;
    const start = new Date(session.started_at).getTime();
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - start) / 1000);
      setElapsed(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  async function loadWorkout() {
    const { data: sess } = await supabase
      .from('workout_sessions')
      .select('*, workout_templates(*)')
      .eq('id', id)
      .single();

    if (!sess) { router.push('/'); return; }

    // Redirect completed sessions to history view
    if (sess.completed_at) { router.push(`/history/${id}`); return; }

    setSession(sess);

    const [teRes, existingSetsRes, prevSessRes] = await Promise.all([
      supabase
        .from('template_exercises')
        .select('*, exercises(*)')
        .eq('template_id', sess.template_id)
        .order('order_index'),
      supabase.from('workout_sets').select('*').eq('session_id', id).order('set_number'),
      supabase
        .from('workout_sessions')
        .select('id')
        .eq('template_id', sess.template_id)
        .neq('id', id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1),
    ]);

    const exercises: Exercise[] = (teRes.data ?? []).map((te: any) => te.exercises);
    const existingSets = existingSetsRes.data ?? [];

    // Previous session sets for reference
    const prevSetsMap: Record<string, PrevSet[]> = {};
    if (prevSessRes.data && prevSessRes.data.length > 0) {
      const { data: pSets } = await supabase
        .from('workout_sets')
        .select('exercise_id, set_number, weight, reps')
        .eq('session_id', prevSessRes.data[0].id);
      for (const ps of pSets ?? []) {
        if (!prevSetsMap[ps.exercise_id]) prevSetsMap[ps.exercise_id] = [];
        prevSetsMap[ps.exercise_id].push(ps);
      }
    }

    // Personal bests
    const exerciseIds = exercises.map((e) => e.id);
    const { data: pbs } = await supabase
      .from('personal_bests')
      .select('exercise_id, weight, reps')
      .in('exercise_id', exerciseIds);
    const pbMap: Record<string, { weight: number | null; reps: number | null }> = {};
    for (const pb of pbs ?? []) pbMap[pb.exercise_id] = { weight: pb.weight, reps: pb.reps };

    const data: ExerciseData[] = exercises.map((exercise) => {
      const saved = existingSets.filter((s) => s.exercise_id === exercise.id);
      const sets: LocalSet[] =
        saved.length > 0
          ? saved.map((s) => ({
              id: s.id,
              weight: s.weight?.toString() ?? '',
              reps: s.reps?.toString() ?? '',
              completed: s.completed,
            }))
          : [{ weight: '', reps: '', completed: false }];
      return {
        exercise,
        sets,
        previousSets: prevSetsMap[exercise.id] ?? [],
        pb: pbMap[exercise.id] ?? null,
      };
    });

    setExerciseData(data);
    setLoading(false);
  }

  function updateField(
    ei: number,
    si: number,
    field: 'weight' | 'reps',
    value: string,
  ) {
    setExerciseData((prev) => {
      const next = [...prev];
      next[ei] = { ...next[ei], sets: [...next[ei].sets] };
      next[ei].sets[si] = { ...next[ei].sets[si], [field]: value };
      return next;
    });
  }

  function addSet(ei: number) {
    setExerciseData((prev) => {
      const next = [...prev];
      next[ei] = { ...next[ei], sets: [...next[ei].sets, { weight: '', reps: '', completed: false }] };
      return next;
    });
  }

  function removeLastSet(ei: number) {
    setExerciseData((prev) => {
      const next = [...prev];
      const sets = [...next[ei].sets];
      const removed = sets.pop();
      if (removed?.id) {
        supabase.from('workout_sets').delete().eq('id', removed.id);
      }
      next[ei] = { ...next[ei], sets: sets.length > 0 ? sets : [{ weight: '', reps: '', completed: false }] };
      return next;
    });
  }

  async function toggleComplete(ei: number, si: number) {
    const ex = exerciseData[ei];
    const set = ex.sets[si];
    const weight = parseFloat(set.weight) || 0;
    const reps = parseInt(set.reps) || 0;

    if (!set.completed && weight === 0 && reps === 0) return;

    const newCompleted = !set.completed;
    const payload = {
      session_id: id,
      exercise_id: ex.exercise.id,
      set_number: si + 1,
      weight: weight || null,
      reps: reps || null,
      completed: newCompleted,
    };

    let savedId = set.id;
    if (set.id) {
      await supabase.from('workout_sets').update(payload).eq('id', set.id);
    } else {
      const { data } = await supabase.from('workout_sets').insert(payload).select().single();
      if (data) savedId = data.id;
    }

    setExerciseData((prev) => {
      const next = [...prev];
      next[ei] = { ...next[ei], sets: [...next[ei].sets] };
      next[ei].sets[si] = { ...next[ei].sets[si], completed: newCompleted, id: savedId };
      return next;
    });

    // PR check
    if (newCompleted && weight > 0) {
      const pb = ex.pb;
      const isNewPR =
        !pb?.weight || weight > pb.weight || (weight === pb.weight && reps > (pb.reps ?? 0));
      if (isNewPR) {
        await supabase.from('personal_bests').upsert(
          { exercise_id: ex.exercise.id, weight, reps: reps || null, achieved_at: new Date().toISOString(), session_id: id },
          { onConflict: 'exercise_id' },
        );
        setNewPRs((prev) => Array.from(new Set([...prev, ex.exercise.name])));
        setExerciseData((prev) => {
          const next = [...prev];
          next[ei] = { ...next[ei], pb: { weight, reps: reps || null } };
          return next;
        });
      }
    }
  }

  async function finishWorkout() {
    setFinishing(true);
    await supabase
      .from('workout_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', id);
    router.push(`/history/${id}`);
  }

  function prevLabel(ei: number, si: number): string | null {
    const prevSets = exerciseData[ei]?.previousSets ?? [];
    const ps = prevSets.find((s) => s.set_number === si + 1) ?? prevSets[si];
    if (!ps) return null;
    if (ps.weight && ps.reps) return `${ps.weight}kg × ${ps.reps}`;
    if (ps.reps) return `${ps.reps} reps`;
    return null;
  }

  const completedCount = exerciseData.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
  const totalCount = exerciseData.reduce((a, e) => a + e.sets.length, 0);

  const templateName = (session as any)?.workout_templates?.name ?? session?.name ?? '';
  const headerColor = HEADER_COLORS[templateName] ?? 'text-orange-400';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 pt-8 pb-3 z-10">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="p-2 rounded-xl bg-slate-800 text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className={`font-bold text-lg ${headerColor}`}>{session?.name}</h1>
            <p className="text-slate-500 text-xs font-mono">{elapsed}</p>
          </div>
          <button
            onClick={finishWorkout}
            disabled={finishing}
            className="bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {finishing ? '...' : 'Finish'}
          </button>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
        <p className="text-slate-500 text-xs text-right mt-1">
          {completedCount}/{totalCount} sets
        </p>
      </div>

      {/* PR Banner */}
      {newPRs.length > 0 && (
        <div className="mx-4 mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-300 text-sm font-medium">
            New PR{newPRs.length > 1 ? 's' : ''}! {newPRs.join(', ')}
          </p>
        </div>
      )}

      {/* Exercises */}
      <div className="px-4 mt-4 pb-6 space-y-4">
        {exerciseData.map((exData, ei) => (
          <div key={exData.exercise.id} className="bg-slate-800 rounded-2xl overflow-hidden">
            {/* Exercise header */}
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">{exData.exercise.name}</h3>
                <p className="text-slate-500 text-xs">{exData.exercise.muscle_group}</p>
              </div>
              {exData.pb?.weight != null && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Trophy className="w-3 h-3" />
                  <span className="text-xs font-bold">
                    {exData.pb.weight}kg
                    {exData.pb.reps ? ` × ${exData.pb.reps}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-1 px-4 py-2 text-slate-500 text-xs font-medium border-b border-slate-700/40">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Previous</span>
              <span className="col-span-3 text-center">kg</span>
              <span className="col-span-3 text-center">Reps</span>
              <span className="col-span-1" />
            </div>

            {/* Sets */}
            <div className="divide-y divide-slate-700/30">
              {exData.sets.map((set, si) => (
                <div
                  key={si}
                  className={`grid grid-cols-12 gap-1 px-4 py-2.5 items-center ${
                    set.completed ? 'bg-green-500/5' : ''
                  }`}
                >
                  <span
                    className={`col-span-1 text-sm font-bold ${
                      set.completed ? 'text-green-400' : 'text-slate-500'
                    }`}
                  >
                    {si + 1}
                  </span>
                  <span className="col-span-4 text-slate-500 text-xs truncate">
                    {prevLabel(ei, si) ?? '—'}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={set.weight}
                    onChange={(e) => updateField(ei, si, 'weight', e.target.value)}
                    className={`col-span-3 bg-slate-700 text-white text-center rounded-lg py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                      set.completed ? 'opacity-50' : ''
                    }`}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={set.reps}
                    onChange={(e) => updateField(ei, si, 'reps', e.target.value)}
                    className={`col-span-3 bg-slate-700 text-white text-center rounded-lg py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                      set.completed ? 'opacity-50' : ''
                    }`}
                  />
                  <button
                    onClick={() => toggleComplete(ei, si)}
                    className={`col-span-1 w-8 h-8 rounded-lg flex items-center justify-center transition-colors mx-auto ${
                      set.completed ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-500'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add/remove set */}
            <div className="px-4 py-3 border-t border-slate-700/40 flex gap-2">
              <button
                onClick={() => addSet(ei)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-700 text-slate-300 text-sm font-medium py-2 rounded-xl active:bg-slate-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Set
              </button>
              {exData.sets.length > 1 && (
                <button
                  onClick={() => removeLastSet(ei)}
                  className="p-2 bg-slate-700 text-slate-500 rounded-xl active:bg-slate-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Bottom finish button */}
        <button
          onClick={finishWorkout}
          disabled={finishing}
          className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
        >
          <Flag className="w-5 h-5" />
          {finishing ? 'Saving...' : 'Finish Workout'}
        </button>
      </div>
    </div>
  );
}
