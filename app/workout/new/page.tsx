'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Plus, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { WorkoutTemplate, Exercise } from '@/lib/types';

const DAY = {
  'Push Day': { gradient: 'from-orange-500/20 to-orange-900/10', border: 'border-orange-500/30', text: 'text-orange-400', btn: 'bg-orange-500 active:bg-orange-600', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/25', check: 'bg-orange-500 border-orange-500', ring: 'focus:ring-orange-500' },
  'Pull Day': { gradient: 'from-blue-500/20 to-blue-900/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   btn: 'bg-blue-500 active:bg-blue-600',   badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',   check: 'bg-blue-500 border-blue-500',   ring: 'focus:ring-blue-500' },
  'Legs Day': { gradient: 'from-green-500/20 to-green-900/10', border: 'border-green-500/30', text: 'text-green-400', btn: 'bg-green-500 active:bg-green-600', badge: 'bg-green-500/15 text-green-300 border-green-500/25', check: 'bg-green-500 border-green-500', ring: 'focus:ring-green-500' },
} as const;
const FALLBACK = { gradient: 'from-slate-700/30 to-slate-900/10', border: 'border-slate-600/30', text: 'text-slate-400', btn: 'bg-slate-600 active:bg-slate-700', badge: 'bg-slate-600/15 text-slate-300 border-slate-600/25', check: 'bg-slate-500 border-slate-500', ring: 'focus:ring-slate-500' };

const INCREMENT_OPTIONS = [0.5, 1, 1.25, 2.5, 5, 10, 20];

function ExerciseRow({ exercise, selected, onToggle, s }: {
  exercise: Exercise;
  selected: boolean;
  onToggle: () => void;
  s: typeof FALLBACK;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
        selected ? 'bg-slate-800 border-slate-600' : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
        selected ? s.check : 'border-slate-600'
      }`}>
        {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`font-bold text-sm ${selected ? 'text-white' : 'text-slate-400'}`}>{exercise.name}</p>
        {exercise.muscle_group && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border mt-0.5 inline-block ${s.badge}`}>
            {exercise.muscle_group}
          </span>
        )}
      </div>
      <span className="text-xs text-slate-600 shrink-0">±{exercise.weight_increment ?? 2.5}kg</span>
    </button>
  );
}

function TemplatePicker() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  useEffect(() => {
    supabase.from('workout_templates').select('*').order('name').then(({ data }) => {
      if (data) {
        const ORDER = ['Push Day', 'Pull Day', 'Legs Day'];
        setTemplates(data.sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name)));
      }
    });
  }, []);
  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-8">
      <Link href="/" className="inline-flex items-center gap-2 text-slate-400 mb-6"><ArrowLeft className="w-4 h-4" /> Back</Link>
      <h1 className="text-2xl font-black text-white mb-4">Choose a day</h1>
      <div className="space-y-3">
        {templates.map(t => {
          const ds = DAY[t.name as keyof typeof DAY] ?? FALLBACK;
          return (
            <Link key={t.id} href={`/workout/new?template=${t.id}`}
              className={`bg-gradient-to-br ${ds.gradient} border ${ds.border} rounded-2xl p-5 flex items-center gap-4 active:scale-95 transition-transform`}>
              <div className={`w-12 h-12 rounded-xl ${ds.btn} flex items-center justify-center`}>
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className={`font-black text-xl ${ds.text}`}>{t.name.replace(' Day', '')}</p>
                <p className="text-slate-400 text-sm">{t.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ExercisePickerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get('template');

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateExercises, setTemplateExercises] = useState<Exercise[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [newIncrement, setNewIncrement] = useState(2.5);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (templateId) loadData(); else setLoading(false); }, [templateId]);

  async function loadData() {
    const [tRes, teRes] = await Promise.all([
      supabase.from('workout_templates').select('*').eq('id', templateId!).single(),
      supabase.from('template_exercises').select('*, exercises(*)').eq('template_id', templateId!).order('order_index'),
    ]);
    if (!tRes.data) { setLoading(false); return; }
    setTemplate(tRes.data);

    const tmplExs: Exercise[] = (teRes.data ?? []).map((te: any) => te.exercises);
    setTemplateExercises(tmplExs);
    setSelected(new Set(tmplExs.map(e => e.id)));

    const tmplIdSet = new Set(tmplExs.map(e => e.id));
    const { data: allCat } = await supabase
      .from('exercises').select('*').eq('category', tRes.data.name).order('name');
    setCustomExercises((allCat ?? []).filter(e => !tmplIdSet.has(e.id)));
    setLoading(false);
  }

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function addCustom() {
    if (!newName.trim() || !template) return;
    setSaving(true);
    const { data } = await supabase.from('exercises').insert({
      name: newName.trim(),
      muscle_group: newMuscle.trim() || null,
      weight_increment: newIncrement,
      category: template.name,
    }).select().single();
    if (data) {
      const ex = data as Exercise;
      setCustomExercises(prev => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name)));
      setSelected(prev => new Set(Array.from(prev).concat(ex.id)));
      setNewName(''); setNewMuscle(''); setNewIncrement(2.5); setShowAddForm(false);
    }
    setSaving(false);
  }

  async function startWorkout() {
    if (!template || selected.size === 0) return;
    setStarting(true);
    const { data: session } = await supabase
      .from('workout_sessions').insert({ template_id: template.id, name: template.name })
      .select().single();
    if (!session) { setStarting(false); return; }
    const allExs = [...templateExercises, ...customExercises];
    const ordered = allExs.filter(e => selected.has(e.id));
    await supabase.from('session_exercises').insert(
      ordered.map((e, i) => ({ session_id: session.id, exercise_id: e.id, order_index: i }))
    );
    router.push(`/workout/${session.id}`);
  }

  if (!templateId) return <TemplatePicker />;
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" /></div>;

  const s = template ? (DAY[template.name as keyof typeof DAY] ?? FALLBACK) : FALLBACK;

  return (
    <div className="max-w-lg mx-auto">
      <div className={`bg-gradient-to-br ${s.gradient} px-4 pt-8 pb-6`}>
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{template?.name}</p>
        <h1 className={`text-4xl font-black tracking-tight ${s.text}`}>
          {template?.name.replace(' Day', '')}
        </h1>
        <p className="text-slate-400 mt-1">Select exercises for today</p>
      </div>

      <div className="px-4 pb-36">
        {templateExercises.length > 0 && (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-5 mb-3">Default</p>
            <div className="space-y-2">
              {templateExercises.map(ex => (
                <ExerciseRow key={ex.id} exercise={ex} selected={selected.has(ex.id)} onToggle={() => toggle(ex.id)} s={s} />
              ))}
            </div>
          </>
        )}

        {customExercises.length > 0 && (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-5 mb-3">My Exercises</p>
            <div className="space-y-2">
              {customExercises.map(ex => (
                <ExerciseRow key={ex.id} exercise={ex} selected={selected.has(ex.id)} onToggle={() => toggle(ex.id)} s={s} />
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full mt-4 flex items-center justify-center gap-2 border border-dashed border-slate-600 text-slate-400 text-sm font-bold py-3.5 rounded-2xl active:bg-slate-800/50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add a custom exercise
        </button>

        {showAddForm && (
          <div className="mt-3 bg-slate-800 border border-slate-700/60 rounded-2xl p-4 space-y-3">
            <input
              type="text" placeholder="Exercise name *"
              value={newName} onChange={e => setNewName(e.target.value)}
              className={`w-full bg-slate-700 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${s.ring}`}
            />
            <input
              type="text" placeholder="Muscle group (e.g. Chest)"
              value={newMuscle} onChange={e => setNewMuscle(e.target.value)}
              className={`w-full bg-slate-700 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${s.ring}`}
            />
            <div>
              <p className="text-xs text-slate-500 mb-2">Weight increment</p>
              <div className="flex flex-wrap gap-2">
                {INCREMENT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setNewIncrement(opt)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                      newIncrement === opt ? `${s.btn} text-white` : 'bg-slate-700 text-slate-400'
                    }`}>{opt}kg</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddForm(false)} className="flex-1 bg-slate-700 text-slate-400 font-bold py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={addCustom} disabled={!newName.trim() || saving}
                className={`flex-1 ${s.btn} text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50`}>
                {saving ? '...' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 z-30">
        <div className="max-w-lg mx-auto">
          <button
            onClick={startWorkout}
            disabled={starting || selected.size === 0}
            className={`w-full ${s.btn} text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-base active:scale-95 transition-transform disabled:opacity-50 shadow-xl`}
          >
            {starting
              ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
              : `Start Workout · ${selected.size} exercise${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewWorkoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" /></div>}>
      <ExercisePickerContent />
    </Suspense>
  );
}
