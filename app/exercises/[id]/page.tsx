'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Exercise, PersonalBest } from '@/lib/types';

type SetRow = { weight: number | null; reps: number | null; session_id: string };
type SessionGroup = {
  session_id: string;
  name: string;
  date: string;
  sets: SetRow[];
  maxWeight: number;
};

function epley(weight: number, reps: number) {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

const GROUP_COLOR: Record<string, string> = {
  Chest: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
  Shoulders: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
  Triceps: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
  Back: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  Biceps: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  'Rear Delts': 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  Quads: 'bg-green-500/15 text-green-300 border-green-500/25',
  Hamstrings: 'bg-green-500/15 text-green-300 border-green-500/25',
  Glutes: 'bg-green-500/15 text-green-300 border-green-500/25',
  Calves: 'bg-green-500/15 text-green-300 border-green-500/25',
};

function LineChart({ points, color }: { points: { date: string; weight: number }[]; color: string }) {
  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-28 text-slate-500 text-sm">
        Log at least 2 sessions to see progress
      </div>
    );
  }
  const W = 320, H = 120, pad = { top: 12, bottom: 28, left: 42, right: 8 };
  const weights = points.map(p => p.weight);
  const minW = Math.min(...weights), maxW = Math.max(...weights);
  const range = maxW - minW || 10;
  const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;
  const cx = (i: number) => pad.left + (i / (points.length - 1)) * cw;
  const cy = (w: number) => pad.top + (1 - (w - minW) / range) * ch;
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i)},${cy(p.weight)}`).join(' ');
  const fillD = `${pathD} L${cx(points.length - 1)},${H - pad.bottom} L${cx(0)},${H - pad.bottom} Z`;
  const labelIdxs = points.length <= 3
    ? points.map((_, i) => i)
    : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[minW, maxW].map(val => (
        <g key={val}>
          <line x1={pad.left} y1={cy(val)} x2={W - pad.right} y2={cy(val)} stroke="#1e293b" strokeWidth="1" />
          <text x={pad.left - 4} y={cy(val) + 4} fontSize="9" fill="#64748b" textAnchor="end">{val}kg</text>
        </g>
      ))}
      <path d={fillD} fill="url(#exGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={cx(i)} cy={cy(p.weight)} r="3" fill={color} />)}
      {labelIdxs.map(i => (
        <text key={i} x={cx(i)} y={H - 6} fontSize="8" fill="#64748b" textAnchor="middle">
          {new Date(points[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>
      ))}
    </svg>
  );
}

export default function ExerciseDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [pb, setPb] = useState<PersonalBest | null>(null);
  const [groups, setGroups] = useState<SessionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [exRes, pbRes, setsRes] = await Promise.all([
        supabase.from('exercises').select('*').eq('id', id).single(),
        supabase.from('personal_bests').select('*').eq('exercise_id', id).maybeSingle(),
        supabase.from('workout_sets')
          .select('weight, reps, session_id, workout_sessions(started_at, name)')
          .eq('exercise_id', id)
          .eq('completed', true)
          .order('session_id'),
      ]);
      if (!exRes.data) { router.push('/exercises'); return; }
      setExercise(exRes.data);
      if (pbRes.data) setPb(pbRes.data);
      if (setsRes.data) {
        const map: Record<string, SessionGroup> = {};
        for (const s of setsRes.data as any[]) {
          if (!s.workout_sessions) continue;
          if (!map[s.session_id]) map[s.session_id] = {
            session_id: s.session_id,
            name: s.workout_sessions.name,
            date: s.workout_sessions.started_at,
            sets: [],
            maxWeight: 0,
          };
          map[s.session_id].sets.push(s);
          if (s.weight && s.weight > map[s.session_id].maxWeight) map[s.session_id].maxWeight = s.weight;
        }
        setGroups(Object.values(map).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" /></div>;
  if (!exercise) return null;

  const badgeColor = GROUP_COLOR[exercise.muscle_group ?? ''] ?? 'bg-slate-700 text-slate-400 border-slate-600';
  const chartColor = exercise.category === 'Push Day' ? '#f97316' : exercise.category === 'Pull Day' ? '#3b82f6' : '#22c55e';
  const chartPoints = groups.filter(g => g.maxWeight > 0).map(g => ({ date: g.date, weight: g.maxWeight }));

  let best1RM = 0;
  for (const g of groups) {
    for (const s of g.sets) {
      if (s.weight && s.reps) {
        const est = epley(s.weight, s.reps);
        if (est > best1RM) best1RM = est;
      }
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      <div className="px-4 pt-8 mb-6">
        <Link href="/exercises" className="inline-flex items-center gap-2 text-slate-400 mb-5">
          <ArrowLeft className="w-4 h-4" /> Exercises
        </Link>
        <h1 className="text-3xl font-black text-white tracking-tight">{exercise.name}</h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {exercise.muscle_group && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeColor}`}>
              {exercise.muscle_group}
            </span>
          )}
          {exercise.category && <span className="text-xs text-slate-500">{exercise.category}</span>}
          <span className="text-xs text-slate-600">±{exercise.weight_increment ?? 2.5}kg increment</span>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-center">
          <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1.5" />
          <p className="text-white font-black text-lg leading-none">{pb?.weight ? `${pb.weight}kg` : '—'}</p>
          <p className="text-slate-500 text-xs mt-1">{pb?.reps ? `× ${pb.reps} reps` : 'No PR yet'}</p>
          <p className="text-slate-600 text-xs mt-0.5">Best Set</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-center">
          <TrendingUp className="w-4 h-4 text-orange-400 mx-auto mb-1.5" />
          <p className="text-white font-black text-lg leading-none">{best1RM > 0 ? `${best1RM}kg` : '—'}</p>
          <p className="text-slate-500 text-xs mt-1">Epley formula</p>
          <p className="text-slate-600 text-xs mt-0.5">Est. 1RM</p>
        </div>
      </div>

      <div className="px-4 mb-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Progress</p>
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
          <p className="text-white font-bold text-sm mb-3">Max weight per session</p>
          <LineChart points={chartPoints} color={chartColor} />
        </div>
      </div>

      <div className="px-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          History · {groups.length} session{groups.length !== 1 ? 's' : ''}
        </p>
        {groups.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-6 text-center">
            <p className="text-slate-400 text-sm">No history yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...groups].reverse().map(g => {
              const bestSet = g.sets.reduce((best, s) =>
                (s.weight ?? 0) > (best.weight ?? 0) ? s : best, g.sets[0]);
              return (
                <Link key={g.session_id} href={`/history/${g.session_id}`}
                  className="block bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden active:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
                    <p className="font-bold text-white text-sm">{g.name}</p>
                    <p className="text-slate-500 text-xs">
                      {new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="divide-y divide-slate-700/30">
                    {g.sets.map((s, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-slate-500 text-xs">Set {i + 1}</span>
                        <span className="text-white text-sm font-bold">
                          {s.weight ? `${s.weight}kg × ${s.reps}` : `${s.reps} reps`}
                        </span>
                      </div>
                    ))}
                  </div>
                  {g.maxWeight > 0 && bestSet?.reps && (
                    <div className="px-4 py-2.5 bg-slate-700/20 border-t border-slate-700/40 flex justify-between text-xs text-slate-500">
                      <span>Best: {g.maxWeight}kg</span>
                      <span>Est. 1RM: {epley(g.maxWeight, bestSet.reps)}kg</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
