'use client';

import { useEffect, useState } from 'react';
import { Trophy, Search, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Exercise } from '@/lib/types';

type ExWithPB = Exercise & { pb: { weight: number | null; reps: number | null } | null };

const GROUPS = ['All', 'Chest', 'Shoulders', 'Triceps', 'Back', 'Biceps', 'Rear Delts', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body'];
const MUSCLE_GROUPS = GROUPS.slice(1);

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
  Core: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
  'Full Body': 'bg-slate-500/10 text-slate-300 border-slate-500/25',
};

const CATEGORIES = ['Push Day', 'Pull Day', 'Legs Day'];
const INCREMENT_OPTIONS = [0.5, 1, 1.25, 2.5, 5, 10, 20];

export default function ExercisesPage() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<ExWithPB[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [newCategory, setNewCategory] = useState('Push Day');
  const [newIncrement, setNewIncrement] = useState(2.5);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadExercises(); }, []);

  async function loadExercises() {
    const [eRes, pbRes] = await Promise.all([
      supabase.from('exercises').select('*').order('name'),
      supabase.from('personal_bests').select('exercise_id, weight, reps'),
    ]);
    const pbMap: Record<string, ExWithPB['pb']> = {};
    for (const p of pbRes.data ?? []) pbMap[p.exercise_id] = { weight: p.weight, reps: p.reps };
    if (eRes.data) setExercises(eRes.data.map(e => ({ ...e, pb: pbMap[e.id] ?? null })));
    setLoading(false);
  }

  async function addExercise() {
    if (!newName.trim()) return;
    setSaving(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    const { data } = await supabase.from('exercises').insert({
      name: newName.trim(),
      muscle_group: newMuscle || null,
      category: newCategory,
      weight_increment: newIncrement,
      created_by: u?.id,
    }).select().single();
    if (data) {
      setExercises(prev => [...prev, { ...data, pb: null }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName(''); setNewMuscle(''); setNewCategory('Push Day'); setNewIncrement(2.5);
      setShowForm(false);
    }
    setSaving(false);
  }

  async function deleteExercise(id: string) {
    setDeleting(id);
    await supabase.from('exercises').delete().eq('id', id);
    setExercises(prev => prev.filter(e => e.id !== id));
    setDeleting(null);
  }

  const filtered = exercises.filter(e =>
    (group === 'All' || e.muscle_group === group) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const myExerciseIds = new Set(exercises.filter(e => e.created_by === user?.id).map(e => e.id));
  const hasPR = filtered.filter(e => e.pb).length;
  const activeGroups = GROUPS.filter(g => g === 'All' || exercises.some(e => e.muscle_group === g));

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" /></div>;

  return (
    <div className="pt-8 pb-6 max-w-lg mx-auto">
      <div className="px-4 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">Exercises</h1>
            <p className="text-slate-400 text-sm">{exercises.length} exercises · {hasPR} PRs set</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-orange-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform mt-1">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'New'}
          </button>
        </div>

        {showForm && (
          <div className="mt-4 bg-slate-800 border border-slate-700/60 rounded-2xl p-4 space-y-3">
            <input type="text" placeholder="Exercise name *"
              value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <select value={newMuscle} onChange={e => setNewMuscle(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">Muscle group (optional)</option>
              {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <div>
              <p className="text-xs text-slate-500 mb-2">Category</p>
              <div className="flex gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setNewCategory(cat)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                      newCategory === cat
                        ? cat === 'Push Day' ? 'bg-orange-500 text-white'
                          : cat === 'Pull Day' ? 'bg-blue-500 text-white'
                          : 'bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                    {cat.replace(' Day', '')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">Weight increment</p>
              <div className="flex flex-wrap gap-2">
                {INCREMENT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setNewIncrement(opt)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                      newIncrement === opt ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'
                    }`}>{opt}kg</button>
                ))}
              </div>
            </div>
            <button onClick={addExercise} disabled={!newName.trim() || saving}
              className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-transform">
              {saving ? 'Saving…' : 'Add Exercise'}
            </button>
          </div>
        )}

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search exercises…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700/60 text-white pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
        {activeGroups.map(g => (
          <button key={g} onClick={() => setGroup(g)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
              group === g ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>{g}</button>
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
              <div key={ex.id} className="flex items-center gap-3 px-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white">{ex.name}</p>
                    {myExerciseIds.has(ex.id) && (
                      <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-md font-medium">Mine</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {ex.muscle_group && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        GROUP_COLOR[ex.muscle_group ?? ''] ?? 'bg-slate-700 text-slate-400 border-slate-600'
                      }`}>{ex.muscle_group}</span>
                    )}
                    <span className="text-xs text-slate-600">±{ex.weight_increment ?? 2.5}kg</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {ex.pb ? (
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        <p className="text-yellow-400 font-black text-sm">{ex.pb.weight ? `${ex.pb.weight} kg` : `${ex.pb.reps} reps`}</p>
                      </div>
                      {ex.pb.weight && ex.pb.reps && (
                        <p className="text-slate-500 text-xs mt-0.5">× {ex.pb.reps} reps</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-600 text-xs font-medium">No PR</span>
                  )}
                  {myExerciseIds.has(ex.id) && (
                    <button onClick={() => deleteExercise(ex.id)} disabled={deleting === ex.id}
                      className="p-2 text-slate-600 active:text-red-400 transition-colors disabled:opacity-40">
                      {deleting === ex.id
                        ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-slate-400" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
