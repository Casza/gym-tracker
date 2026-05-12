'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Dumbbell, Play } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { WorkoutTemplate, TemplateExercise } from '@/lib/types';

const TEMPLATE_STYLES: Record<
  string,
  { light: string; text: string; border: string; btn: string }
> = {
  'Push Day': {
    light: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    btn: 'bg-orange-500 active:bg-orange-600',
  },
  'Pull Day': {
    light: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    btn: 'bg-blue-500 active:bg-blue-600',
  },
  'Legs Day': {
    light: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/30',
    btn: 'bg-green-500 active:bg-green-600',
  },
};

const defaultStyle = {
  light: 'bg-slate-500/10',
  text: 'text-slate-400',
  border: 'border-slate-500/30',
  btn: 'bg-slate-500',
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
      loadTemplate(templateId);
    } else {
      loadAllTemplates();
    }
  }, [templateId]);

  async function loadTemplate(id: string) {
    const [tRes, eRes] = await Promise.all([
      supabase.from('workout_templates').select('*').eq('id', id).single(),
      supabase
        .from('template_exercises')
        .select('*, exercises(*)')
        .eq('template_id', id)
        .order('order_index'),
    ]);
    if (tRes.data) setTemplate(tRes.data);
    if (eRes.data) setExercises(eRes.data as unknown as TemplateExercise[]);
    setLoading(false);
  }

  async function loadAllTemplates() {
    const { data } = await supabase.from('workout_templates').select('*').order('name');
    if (data) setAllTemplates(data);
    setLoading(false);
  }

  async function startWorkout() {
    if (!template) return;
    setStarting(true);
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({ template_id: template.id, name: template.name })
      .select()
      .single();
    if (data && !error) {
      router.push(`/workout/${data.id}`);
    } else {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </div>
    );
  }

  const style = template
    ? (TEMPLATE_STYLES[template.name] ?? defaultStyle)
    : defaultStyle;

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 rounded-xl bg-slate-800 text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">
          {template ? template.name : 'Start Workout'}
        </h1>
      </div>

      {/* No template selected — show picker */}
      {!template && (
        <div className="space-y-3">
          {allTemplates.map((t) => {
            const s = TEMPLATE_STYLES[t.name] ?? defaultStyle;
            return (
              <Link
                key={t.id}
                href={`/workout/new?template=${t.id}`}
                className={`${s.light} ${s.border} border rounded-2xl p-5 flex items-center gap-4 active:scale-95 transition-transform`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${s.light} ${s.border} border flex items-center justify-center`}
                >
                  <Dumbbell className={`w-6 h-6 ${s.text}`} />
                </div>
                <div>
                  <p className={`font-bold text-lg ${s.text}`}>{t.name}</p>
                  <p className="text-slate-400 text-sm">{t.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Template selected */}
      {template && (
        <>
          <div className={`${style.light} ${style.border} border rounded-2xl p-4 mb-5`}>
            <p className={`text-sm ${style.text} font-medium`}>{template.description}</p>
          </div>

          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Exercises ({exercises.length})
          </h2>

          <div className="bg-slate-800 rounded-2xl divide-y divide-slate-700 mb-6">
            {exercises.map((te, i) => (
              <div key={te.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-slate-600 text-sm w-5 font-mono text-right">{i + 1}</span>
                <div>
                  <p className="text-white font-medium">{te.exercises.name}</p>
                  <p className="text-slate-500 text-xs">{te.exercises.muscle_group}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={startWorkout}
            disabled={starting}
            className={`w-full ${style.btn} text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50`}
          >
            {starting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start {template.name}
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

export default function NewWorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
        </div>
      }
    >
      <NewWorkoutContent />
    </Suspense>
  );
}
