'use client';

import { useEffect, useState } from 'react';
import { Trophy, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Exercise, PersonalBest } from '@/lib/types';

type ExWithPB = Exercise & {
  pb: { weight: number | null; reps: number | null } | null;
};

const GROUPS = ['All', 'Chest', 'Shoulders', 'Triceps', 'Back', 'Biceps', 'Rear Delts', 'Quads', 'Hamstrings', 'Glutes', 'Calves'];

const GROUP_COLOR: Record<string, string> = {
  Chest: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
  Shoulders: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
  Triceps: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
  Back: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
  Biceps: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
  'Rear Delts': 'bg-blue-500/10 text-blue-300 border-blue-500/25',
  Quads: 'bg-green-500/10 text-green-300 border-green-500/25',
  Hamstrings: 'bg-green-500/10 text-green-300 border-green-500/25',
  Glutes: 'bg-green-500/10 text-green-300 border-green-500/25',
  Calves: 'bg-green-500/10 text-green-300 border-green-500/25',
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<ExWithPB[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');

  useEffect(() => {
    Promise.all([
      supabase.from('exercises').select('*').order('name'),
      supabase.from('personal_bests').select('exercise_id, weight, reps'),
    ]).then(([eRes, pbRes]) => {
      const pbMap: Record<string, ExWithPB['pb']> = {};
      for (const p of pbRes.data ?? []) pbMap[p.exercise_id] = { weight: p.weight, reps: p.reps };
      if (eRes.data) setExercises(eRes.data.map(e => ({ ...e, pb: pbMap[e.id] ?? null })));
      setLoading(false);
    });
  }, []);

  const filtered = exercises.filter(e =>
    (group === 'All' || e.muscle_group === group) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const hasPR = filtered.filter(e => e.pb).length;
  const activeGroups = GROUPS.filter(g => g === 'All' || exercises.some(e => e.muscle_group === g));

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" /></div>;

  return (
    <div className="pt-8 pb-6 max-w-lg mx-auto">
      <div className="px-4 mb-5">
        <h1 className="text-3xl font-black text-white tracking-tight mb-1">Exercises</h1>
        <p className="text-slate-400 text-sm">{exercises.length} exercises · {hasPR} PRs set</p>

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text" placeholder="Search exercises…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700/60 text-white pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Group filter */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
        {activeGroups.map(g => (
          <button key={g} onClick={() => setGroup(g)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
              group === g ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400">No exercises found</p>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl divide-y divide-slate-700/50 overflow-hidden">
            {filtered.map(ex => (
              <div key={ex.id} className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-bold text-white">{ex.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border mt-1 inline-block ${
                      GROUP_COLOR[ex.muscle_group ?? ''] ?? 'bg-slate-700 text-slate-400 border-slate-600'
                    }`}>
                      {ex.muscle_group}
                    </span>
                  </div>
                </div>
                {ex.pb ? (
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                      <p className="text-yellow-400 font-black text-sm">
                        {ex.pb.weight ? `${ex.pb.weight} kg` : `${ex.pb.reps} reps`}
                      </p>
                    </div>
                    {ex.pb.weight && ex.pb.reps && (
                      <p className="text-slate-500 text-xs mt-0.5">× {ex.pb.reps} reps</p>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-600 text-xs font-medium">No PR yet</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
