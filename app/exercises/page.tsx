'use client';

import { useEffect, useState } from 'react';
import { Trophy, Dumbbell, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Exercise, PersonalBest } from '@/lib/types';

type ExerciseWithPB = Exercise & {
  pb: { weight: number | null; reps: number | null; achieved_at: string } | null;
};

const MUSCLE_GROUPS = [
  'All',
  'Chest',
  'Shoulders',
  'Triceps',
  'Back',
  'Biceps',
  'Rear Delts',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
];

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<ExerciseWithPB[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState('All');

  useEffect(() => {
    async function load() {
      const [eRes, pbRes] = await Promise.all([
        supabase.from('exercises').select('*').order('name'),
        supabase.from('personal_bests').select('exercise_id, weight, reps, achieved_at'),
      ]);
      const pbMap: Record<string, ExerciseWithPB['pb']> = {};
      for (const pb of pbRes.data ?? []) {
        pbMap[pb.exercise_id] = { weight: pb.weight, reps: pb.reps, achieved_at: pb.achieved_at };
      }
      if (eRes.data) {
        setExercises(eRes.data.map((e) => ({ ...e, pb: pbMap[e.id] ?? null })));
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = exercises.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = activeGroup === 'All' || e.muscle_group === activeGroup;
    return matchesSearch && matchesGroup;
  });

  const activeGroups = MUSCLE_GROUPS.filter(
    (g) => g === 'All' || exercises.some((e) => e.muscle_group === g),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="pt-8 pb-4 max-w-lg mx-auto">
      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold text-white mb-4">Exercises &amp; PRs</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Muscle group filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
        {activeGroups.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeGroup === g ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-6 text-center">
            <Dumbbell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No exercises found</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700/70">
            {filtered.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="font-medium text-white">{ex.name}</p>
                  <p className="text-slate-500 text-xs">{ex.muscle_group}</p>
                </div>
                {ex.pb ? (
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Trophy className="w-3 h-3 text-yellow-400" />
                      <p className="text-yellow-400 font-bold text-sm">
                        {ex.pb.weight ? `${ex.pb.weight} kg` : `${ex.pb.reps} reps`}
                      </p>
                    </div>
                    {ex.pb.weight && ex.pb.reps && (
                      <p className="text-slate-500 text-xs">× {ex.pb.reps} reps</p>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-600 text-xs">No PR yet</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
