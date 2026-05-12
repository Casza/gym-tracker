'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Dumbbell, Zap, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WorkoutSession, WorkoutSet, Exercise } from '@/lib/types';

type Group = { exercise: Exercise; sets: WorkoutSet[] };

const BAR: Record<string, string> = {
  'Push Day': 'bg-orange-500',
  'Pull Day': 'bg-blue-500',
  'Legs Day': 'bg-green-500',
};

const BTN: Record<string, string> = {
  'Push Day': 'bg-orange-500 active:bg-orange-600',
  'Pull Day': 'bg-blue-500 active:bg-blue-600',
  'Legs Day': 'bg-green-500 active:bg-green-600',
};

function dur(start: string, end: string | null) {
  if (!end) return 'In progress';
  const m = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function SessionDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.from('workout_sessions').select('*, workout_templates(name)').eq('id', id).single();
      if (!sess) { router.push('/history'); return; }
      setSession(sess);

      const { data: sets } = await supabase.from('workout_sets').select('*, exercises(*)')
        .eq('session_id', id).eq('completed', true).order('set_number');

      if (sets) {
        const map: Record<string, Group> = {};
        for (const s of sets) {
          if (!map[s.exercise_id]) map[s.exercise_id] = { exercise: s.exercises as Exercise, sets: [] };
          map[s.exercise_id].sets.push(s);
        }
        setGroups(Object.values(map));
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleDelete() {
    if (!confirm('Delete this workout? This cannot be undone.')) return;
    setDeleting(true);
    // Delete PRs set in this session, then the session (sets cascade automatically).
    await supabase.from('personal_bests').delete().eq('session_id', id);
    await supabase.from('workout_sessions').delete().eq('id', id);
    router.push('/history');
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" /></div>;

  const totalSets = groups.reduce((a, g) => a + g.sets.length, 0);
  const totalVol = groups.reduce((a, g) => a + g.sets.reduce((b, s) => b + (s.weight ?? 0) * (s.reps ?? 0), 0), 0);
  const templateName = (session as any)?.workout_templates?.name ?? '';
  const bar = BAR[templateName] ?? 'bg-slate-500';
  const btn = BTN[templateName] ?? 'bg-slate-600';

  return (
    <div className="px-4 pt-8 pb-8 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/history" className="p-2 rounded-xl bg-slate-800 text-slate-400"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-xl font-black text-white">{session?.name}</h1>
            <p className="text-slate-400 text-sm">
              {new Date(session?.started_at ?? '').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2.5 rounded-xl bg-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
        >
          {deleting
            ? <div className="w-4 h-4 border-t border-red-400 rounded-full animate-spin" />
            : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Clock, label: 'Duration', val: dur(session!.started_at, session!.completed_at) },
          { icon: Dumbbell, label: 'Sets', val: String(totalSets) },
          { icon: Zap, label: 'Volume', val: totalVol > 0 ? (totalVol >= 1000 ? `${(totalVol/1000).toFixed(1)}t` : `${Math.round(totalVol)}kg`) : '—' },
        ].map(({ icon: Icon, label, val }) => (
          <div key={label} className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-center">
            <Icon className="w-4 h-4 text-slate-500 mx-auto mb-1.5" />
            <p className="text-white font-black text-base">{val}</p>
            <p className="text-slate-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-6 text-center">
          <p className="text-slate-400">No sets logged for this workout</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ exercise, sets }) => {
            const best = Math.max(...sets.map(s => s.weight ?? 0).filter(Boolean));
            const vol = sets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0);
            return (
              <div key={exercise.id} className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-700/50">
                  <div className={`w-1 h-9 rounded-full shrink-0 ${bar}`} />
                  <div className="flex-1">
                    <p className="font-black text-white">{exercise.name}</p>
                    <p className="text-slate-500 text-xs">{exercise.muscle_group}</p>
                  </div>
                  <span className="text-slate-500 text-sm">{sets.length} sets</span>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {sets.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3">
                      <span className="text-slate-500 text-sm">Set {i + 1}</span>
                      <span className="text-white font-bold text-sm">
                        {s.weight ? `${s.weight} kg × ${s.reps}` : `${s.reps} reps`}
                      </span>
                    </div>
                  ))}
                </div>
                {(best > 0 || vol > 0) && (
                  <div className="px-4 py-2.5 bg-slate-700/20 border-t border-slate-700/40 flex justify-between text-xs text-slate-500 font-medium">
                    {best > 0 && <span>Best set: {best} kg</span>}
                    {vol > 0 && <span>Volume: {Math.round(vol)} kg</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {session?.template_id && (
        <Link href={`/workout/new?template=${session.template_id}`}
          className={`w-full ${btn} text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-base active:scale-95 transition-transform`}>
          <RotateCcw className="w-5 h-5" /> Repeat This Workout
        </Link>
      )}
    </div>
  );
}
