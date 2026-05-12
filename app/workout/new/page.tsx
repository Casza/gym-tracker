'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { WorkoutTemplate, TemplateExercise } from '@/lib/types';

const DAY = {
  'Push Day': {
    gradient: 'from-orange-500/20 to-orange-900/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    btn: 'bg-orange-500 active:bg-orange-600',
    muscleBadge: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
    indexBg: 'bg-orange-500/15 text-orange-300',
  },
  'Pull Day': {
    gradient: 'from-blue-500/20 to-blue-900/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    btn: 'bg-blue-500 active:bg-blue-600',
    muscleBadge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    indexBg: 'bg-blue-500/15 text-blue-300',
  },
  'Legs Day': {
    gradient: 'from-green-500/20 to-green-900/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    btn: 'bg-green-500 active:bg-green-600',
    muscleBadge: 'bg-green-500/15 text-green-300 border-green-500/25',
    indexBg: 'bg-green-500/15 text-green-300',
  },
} as const;

const FALLBACK = {
  gradient: 'from-slate-700/30 to-slate-900/10',
  border: 'border-slate-600/30',
  text: 'text-slate-400',
  btn: 'bg-slate-600 active:bg-slate-700',
  muscleBadge: 'bg-slate-600/15 text-slate-300 border-slate-600/25',
  indexBg: 'bg-slate-700 text-slate-400',
};

function NewWorkoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get('template');

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [allTemplates, setAllTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (templateId) {
      Promise.all([
        supabase.from('workout_templates').select('*').eq('id', templateId).single(),
        supabase.from('template_exercises').select('*, exercises(*)').eq('template_id', templateId).order('order_index'),
      ]).then(([tRes, eRes]) => {
        if (tRes.data) setTemplate(tRes.data);
        if (eRes.data) setExercises(eRes.data as unknown as TemplateExercise[]);
        setLoading(false);
      });
    } else {
      supabase.from('workout_templates').select('*').order('name').then(({ data }) => {
        if (data) setAllTemplates(data);
        setLoading(false);
      });
    }
  }, [templateId]);

  async function startWorkout() {
    if (!template) return;
    setStarting(true);
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({ template_id: template.id, name: template.name })
      .select().single();
    if (data && !error) router.push(`/workout/${data.id}`);
    else setStarting(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
    </div>
  );

  const s = template ? (DAY[template.name as keyof typeof DAY] ?? FALLBACK) : FALLBACK;

  return (
    <div className="max-w-lg mx-auto">
      {/* Colored hero header */}
      {template && (
        <div className={`bg-gradient-to-br ${s.gradient} px-4 pt-8 pb-6`}>
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{template.name}</p>
          <h1 className={`text-4xl font-black tracking-tight ${s.text}`}>
            {template.name.replace(' Day', '')}
          </h1>
          <p className="text-slate-400 mt-1">{template.description}</p>
        </div>
      )}

      {!template && (
        <div className="px-4 pt-8 pb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-black text-white">Choose a day</h1>
        </div>
      )}

      <div className="px-4 pb-8">
        {/* No template: show picker */}
        {!template && (
          <div className="space-y-3 mt-4">
            {allTemplates.map(t => {
              const ds = DAY[t.name as keyof typeof DAY] ?? FALLBACK;
              return (
                <Link key={t.id} href={`/workout/new?template=${t.id}`}
                  className={`bg-gradient-to-br ${ds.gradient} border ${ds.border} rounded-2xl p-5 flex items-center gap-4 active:scale-95 transition-transform`}
                >
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
        )}

        {/* Template selected: show exercise list */}
        {template && (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-6 mb-3">
              {exercises.length} Exercises
            </p>
            <div className="space-y-2 mb-6">
              {exercises.map((te, i) => (
                <div key={te.id} className="bg-slate-800 border border-slate-700/60 rounded-2xl px-4 py-3.5 flex items-center gap-4">
                  <span className={`w-7 h-7 rounded-xl ${s.indexBg} text-xs font-black flex items-center justify-center shrink-0`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{te.exercises.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${s.muscleBadge} mt-0.5 inline-block`}>
                      {te.exercises.muscle_group}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startWorkout}
              disabled={starting}
              className={`w-full ${s.btn} text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 text-lg active:scale-95 transition-transform disabled:opacity-50`}
            >
              {starting
                ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                : <><Play className="w-5 h-5" fill="white" strokeWidth={0} /> Start {template.name}</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function NewWorkoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" /></div>}>
      <NewWorkoutContent />
    </Suspense>
  );
}
