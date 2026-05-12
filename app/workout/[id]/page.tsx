'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Plus, Trophy, Trash2, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WorkoutSession, Exercise } from '@/lib/types';

type LocalSet = { id?: string; weight: string; reps: string; completed: boolean };
type PrevSet = { set_number: number; weight: number | null; reps: number | null };
type ExData = {
  exercise: Exercise;
  sets: LocalSet[];
  prev: PrevSet[];
  pb: { weight: number | null; reps: number | null } | null;
  collapsed: boolean;
};

const DAY_COLOR: Record<string, { text: string; bar: string; ring: string; btn: string; badge: string }> = {
  'Push Day': { text: 'text-orange-400', bar: 'bg-orange-500', ring: 'focus:ring-orange-500', btn: 'bg-orange-500', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/25' },
  'Pull Day': { text: 'text-blue-400',   bar: 'bg-blue-500',   ring: 'focus:ring-blue-500',   btn: 'bg-blue-500',   badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  'Legs Day': { text: 'text-green-400',  bar: 'bg-green-500',  ring: 'focus:ring-green-500',  btn: 'bg-green-500',  badge: 'bg-green-500/15 text-green-300 border-green-500/25' },
};
const FALLBACK_COLOR = { text: 'text-orange-400', bar: 'bg-orange-500', ring: 'focus:ring-orange-500', btn: 'bg-orange-500', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/25' };

export default function ActiveWorkoutPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exData, setExData] = useState<ExData[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => { loadWorkout(); }, [id]);

  useEffect(() => {
    if (!session) return;
    const start = new Date(session.started_at).getTime();
    const iv = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      setElapsed(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [session]);

  async function loadWorkout() {
    const { data: sess } = await supabase
      .from('workout_sessions').select('*, workout_templates(*)')
      .eq('id', id).single();
    if (!sess) { router.push('/'); return; }
    if (sess.completed_at) { router.push(`/history/${id}`); return; }
    setSession(sess);

    const [teRes, savedRes, prevSessRes] = await Promise.all([
      supabase.from('template_exercises').select('*, exercises(*)').eq('template_id', sess.template_id).order('order_index'),
      supabase.from('workout_sets').select('*').eq('session_id', id).order('set_number'),
      supabase.from('workout_sessions').select('id')
        .eq('template_id', sess.template_id).neq('id', id)
        .not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1),
    ]);

    const exercises: Exercise[] = (teRes.data ?? []).map((te: any) => te.exercises);
    const saved = savedRes.data ?? [];

    const prevMap: Record<string, PrevSet[]> = {};
    if (prevSessRes.data?.length) {
      const { data: ps } = await supabase.from('workout_sets')
        .select('exercise_id, set_number, weight, reps').eq('session_id', prevSessRes.data[0].id);
      for (const p of ps ?? []) {
        if (!prevMap[p.exercise_id]) prevMap[p.exercise_id] = [];
        prevMap[p.exercise_id].push(p);
      }
    }

    const ids = exercises.map(e => e.id);
    const { data: pbs } = await supabase.from('personal_bests').select('exercise_id, weight, reps').in('exercise_id', ids);
    const pbMap: Record<string, { weight: number | null; reps: number | null }> = {};
    for (const p of pbs ?? []) pbMap[p.exercise_id] = { weight: p.weight, reps: p.reps };

    setExData(exercises.map(ex => {
      const s = saved.filter(x => x.exercise_id === ex.id);
      return {
        exercise: ex,
        sets: s.length > 0
          ? s.map(x => ({ id: x.id, weight: x.weight?.toString() ?? '', reps: x.reps?.toString() ?? '', completed: x.completed }))
          : [{ weight: '', reps: '', completed: false }],
        prev: prevMap[ex.id] ?? [],
        pb: pbMap[ex.id] ?? null,
        collapsed: false,
      };
    }));
    setLoading(false);
  }

  function upd(ei: number, si: number, f: 'weight' | 'reps', v: string) {
    setExData(prev => {
      const n = [...prev];
      n[ei] = { ...n[ei], sets: n[ei].sets.map((s, i) => i === si ? { ...s, [f]: v } : s) };
      return n;
    });
  }

  function addSet(ei: number) {
    setExData(prev => {
      const n = [...prev];
      n[ei] = { ...n[ei], sets: [...n[ei].sets, { weight: '', reps: '', completed: false }] };
      return n;
    });
  }

  function removeLastSet(ei: number) {
    setExData(prev => {
      const n = [...prev];
      const sets = [...n[ei].sets];
      const removed = sets.pop();
      if (removed?.id) supabase.from('workout_sets').delete().eq('id', removed.id);
      n[ei] = { ...n[ei], sets: sets.length ? sets : [{ weight: '', reps: '', completed: false }] };
      return n;
    });
  }

  function toggleCollapse(ei: number) {
    setExData(prev => prev.map((e, i) => i === ei ? { ...e, collapsed: !e.collapsed } : e));
  }

  async function toggleComplete(ei: number, si: number) {
    const ex = exData[ei];
    const set = ex.sets[si];
    const weight = parseFloat(set.weight) || 0;
    const reps = parseInt(set.reps) || 0;
    if (!set.completed && weight === 0 && reps === 0) return;

    const newDone = !set.completed;
    const payload = { session_id: id, exercise_id: ex.exercise.id, set_number: si + 1, weight: weight || null, reps: reps || null, completed: newDone };

    let savedId = set.id;
    if (set.id) {
      await supabase.from('workout_sets').update(payload).eq('id', set.id);
    } else {
      const { data } = await supabase.from('workout_sets').insert(payload).select().single();
      if (data) savedId = data.id;
    }

    setExData(prev => {
      const n = [...prev];
      n[ei] = { ...n[ei], sets: n[ei].sets.map((s, i) => i === si ? { ...s, completed: newDone, id: savedId } : s) };
      return n;
    });

    if (newDone && weight > 0) {
      const pb = ex.pb;
      const isNewPR = !pb?.weight || weight > pb.weight || (weight === pb.weight && reps > (pb.reps ?? 0));
      if (isNewPR) {
        await supabase.from('personal_bests').upsert(
          { exercise_id: ex.exercise.id, weight, reps: reps || null, achieved_at: new Date().toISOString(), session_id: id },
          { onConflict: 'exercise_id' }
        );
        setNewPRs(prev => Array.from(new Set([...prev, ex.exercise.name])));
        setExData(prev => prev.map((e, i) => i === ei ? { ...e, pb: { weight, reps: reps || null } } : e));
      }
    }
  }

  async function finish() {
    setFinishing(true);
    await supabase.from('workout_sessions').update({ completed_at: new Date().toISOString() }).eq('id', id);
    router.push(`/history/${id}`);
  }

  function prevLabel(ei: number, si: number) {
    const ps = exData[ei]?.prev ?? [];
    const p = ps.find(x => x.set_number === si + 1) ?? ps[si];
    if (!p) return null;
    if (p.weight && p.reps) return `${p.weight}kg × ${p.reps}`;
    if (p.reps) return `${p.reps} reps`;
    return null;
  }

  const completedSets = exData.reduce((a, e) => a + e.sets.filter(s => s.completed).length, 0);
  const totalSets = exData.reduce((a, e) => a + e.sets.length, 0);
  const totalVolume = exData.reduce((a, e) =>
    a + e.sets.filter(s => s.completed).reduce((b, s) => b + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0
  );

  const templateName = (session as any)?.workout_templates?.name ?? '';
  const dc = DAY_COLOR[templateName] ?? FALLBACK_COLOR;

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-slate-900/96 backdrop-blur-md border-b border-slate-800 px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="p-2 -ml-1 rounded-xl text-slate-400"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="text-center">
            <p className={`font-black text-base ${dc.text}`}>{session?.name}</p>
            <p className="text-slate-500 text-xs font-mono">{elapsed}</p>
          </div>
          <button onClick={finish} disabled={finishing}
            className="bg-green-500 text-white text-sm font-black px-4 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-40">
            {finishing ? '...' : 'Finish'}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 text-center">
            <p className="text-white font-bold text-lg leading-none">{completedSets}<span className="text-slate-500 font-normal text-sm">/{totalSets}</span></p>
            <p className="text-slate-500 text-xs mt-0.5">sets done</p>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="flex-1 text-center">
            <p className="text-white font-bold text-lg leading-none">
              {totalVolume >= 1000 ? `${(totalVolume/1000).toFixed(1)}t` : `${Math.round(totalVolume)}kg`}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">volume</p>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="flex-1 text-center">
            <p className="text-white font-bold text-lg leading-none">{exData.length}</p>
            <p className="text-slate-500 text-xs mt-0.5">exercises</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${dc.bar} rounded-full transition-all duration-500`}
            style={{ width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' }} />
        </div>
      </div>

      {/* PR banner */}
      {newPRs.length > 0 && (
        <div className="mx-4 mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3.5 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
          <p className="text-yellow-300 text-sm font-bold">
            New PR{newPRs.length > 1 ? 's' : ''}! {newPRs.join(', ')}
          </p>
        </div>
      )}

      {/* Exercise cards */}
      <div className="px-4 mt-4 pb-8 space-y-3">
        {exData.map((ex, ei) => {
          const allDone = ex.sets.length > 0 && ex.sets.every(s => s.completed);
          return (
            <div key={ex.exercise.id}
              className={`rounded-2xl overflow-hidden border transition-all ${
                allDone ? 'bg-slate-800/40 border-green-500/20' : 'bg-slate-800 border-slate-700/50'
              }`}
            >
              {/* Exercise header */}
              <button onClick={() => toggleCollapse(ei)} className="w-full text-left">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className={`w-1 h-10 rounded-full shrink-0 ${allDone ? 'bg-green-500' : dc.bar}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-black text-base ${allDone ? 'text-slate-400' : 'text-white'}`}>
                        {ex.exercise.name}
                      </h3>
                      {allDone && <span className="text-green-400 text-xs font-bold">✓ Done</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${dc.badge}`}>
                        {ex.exercise.muscle_group}
                      </span>
                      {ex.pb?.weight != null && (
                        <span className="text-xs text-yellow-400 font-bold flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> {ex.pb.weight}kg×{ex.pb.reps}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-slate-600 shrink-0">
                    {ex.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>
              </button>

              {!ex.collapsed && (
                <>
                  {/* Column headers */}
                  <div className="grid grid-cols-[2rem_1fr_5rem_5rem_2.5rem] gap-2 px-4 py-2 bg-slate-900/40 text-slate-500 text-xs font-semibold border-t border-slate-700/50">
                    <span className="text-center">#</span>
                    <span>Previous</span>
                    <span className="text-center">kg</span>
                    <span className="text-center">Reps</span>
                    <span />
                  </div>

                  {/* Set rows */}
                  <div className="divide-y divide-slate-700/30">
                    {ex.sets.map((set, si) => {
                      const prev = prevLabel(ei, si);
                      return (
                        <div key={si}
                          className={`grid grid-cols-[2rem_1fr_5rem_5rem_2.5rem] gap-2 px-4 py-3 items-center ${
                            set.completed ? 'bg-green-500/5' : ''
                          }`}
                        >
                          <span className={`text-sm font-black text-center ${
                            set.completed ? 'text-green-400' : 'text-slate-500'
                          }`}>{si + 1}</span>

                          <span className="text-slate-500 text-xs truncate">{prev ?? '—'}</span>

                          <input
                            type="number" inputMode="decimal" placeholder="0"
                            value={set.weight}
                            onChange={e => upd(ei, si, 'weight', e.target.value)}
                            className={`bg-slate-700 border border-slate-600/50 text-white text-center rounded-xl py-2.5 text-sm font-bold w-full focus:outline-none focus:ring-2 ${dc.ring} ${set.completed ? 'opacity-50' : ''}`}
                          />

                          <input
                            type="number" inputMode="numeric" placeholder="0"
                            value={set.reps}
                            onChange={e => upd(ei, si, 'reps', e.target.value)}
                            className={`bg-slate-700 border border-slate-600/50 text-white text-center rounded-xl py-2.5 text-sm font-bold w-full focus:outline-none focus:ring-2 ${dc.ring} ${set.completed ? 'opacity-50' : ''}`}
                          />

                          <button
                            onClick={() => toggleComplete(ei, si)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                              set.completed ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-slate-700 border border-slate-600'
                            }`}
                          >
                            <Check className={`w-4 h-4 ${set.completed ? 'text-white' : 'text-slate-500'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add / remove set */}
                  <div className="flex gap-2 px-4 py-3 border-t border-slate-700/40">
                    <button onClick={() => addSet(ei)}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-700/80 text-slate-300 text-sm font-bold py-2.5 rounded-xl active:bg-slate-600 transition-colors">
                      <Plus className="w-4 h-4" /> Add Set
                    </button>
                    {ex.sets.length > 1 && (
                      <button onClick={() => removeLastSet(ei)}
                        className="px-3 bg-slate-700/80 text-slate-500 rounded-xl active:bg-slate-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Finish button */}
        <button onClick={finish} disabled={finishing}
          className="w-full bg-green-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-base active:scale-95 transition-transform disabled:opacity-40 shadow-lg shadow-green-500/20">
          <Flag className="w-5 h-5" />
          {finishing ? 'Saving...' : 'Finish Workout'}
        </button>
      </div>
    </div>
  );
}
