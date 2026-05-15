'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, ChevronRight, Flame, Calendar, Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WorkoutSession, Exercise, WorkoutTemplate } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';

type TemplateCard = WorkoutTemplate & { exercises: Exercise[] };
type WeightLog = { weight: number; logged_at: string };

const PPL_ORDER = ['Push Day', 'Pull Day', 'Legs Day'];

const DAY = {
  'Push Day': {
    gradient: 'from-orange-500/20 to-orange-500/0',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    btn: 'bg-orange-500 active:bg-orange-600',
    chip: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
    bar: 'bg-orange-500',
  },
  'Pull Day': {
    gradient: 'from-blue-500/20 to-blue-500/0',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    btn: 'bg-blue-500 active:bg-blue-600',
    chip: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
    bar: 'bg-blue-500',
  },
  'Legs Day': {
    gradient: 'from-green-500/20 to-green-500/0',
    border: 'border-green-500/30',
    text: 'text-green-400',
    btn: 'bg-green-500 active:bg-green-600',
    chip: 'bg-green-500/10 text-green-300 border-green-500/25',
    bar: 'bg-green-500',
  },
} as const;

const FALLBACK = {
  gradient: 'from-slate-600/20 to-slate-600/0',
  border: 'border-slate-600/30',
  text: 'text-slate-400',
  btn: 'bg-slate-600 active:bg-slate-700',
  chip: 'bg-slate-600/10 text-slate-300 border-slate-600/25',
  bar: 'bg-slate-600',
};

function style(name: string) {
  return DAY[name as keyof typeof DAY] ?? FALLBACK;
}

function timeAgo(d: string) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function dur(start: string, end: string | null) {
  if (!end) return null;
  const m = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function WeightSparkline({ logs }: { logs: WeightLog[] }) {
  if (logs.length < 2) return null;
  const W = 120, H = 36, pad = 4;
  const weights = logs.map(l => l.weight);
  const minW = Math.min(...weights), maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const cw = W - pad * 2, ch = H - pad * 2;
  const cx = (i: number) => pad + (i / (logs.length - 1)) * cw;
  const cy = (w: number) => pad + (1 - (w - minW) / range) * ch;
  const pathD = logs.map((l, i) => `${i === 0 ? 'M' : 'L'}${cx(i)},${cy(l.weight)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-9 shrink-0">
      <path d={pathD} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={cx(logs.length - 1)} cy={cy(logs[logs.length - 1].weight)} r="2.5" fill="#60a5fa" />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplateCard[]>([]);
  const [recent, setRecent] = useState<WorkoutSession[]>([]);
  const [weekCount, setWeekCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);

  useEffect(() => {
    (async () => {
      const [tRes, teRes, sRes, wRes] = await Promise.all([
        supabase.from('workout_templates').select('*'),
        supabase.from('template_exercises').select('template_id, exercises(*), order_index').order('order_index'),
        supabase.from('workout_sessions').select('*, workout_templates(name)').order('started_at', { ascending: false }).limit(3),
        supabase.from('body_weight_logs').select('weight, logged_at').order('logged_at', { ascending: false }).limit(10),
      ]);

      if (tRes.data && teRes.data) {
        const map: Record<string, Exercise[]> = {};
        for (const te of teRes.data as any[]) {
          if (!map[te.template_id]) map[te.template_id] = [];
          if (te.exercises) map[te.template_id].push(te.exercises);
        }
        setTemplates(
          tRes.data
            .map(t => ({ ...t, exercises: map[t.id] ?? [] }))
            .sort((a, b) => PPL_ORDER.indexOf(a.name) - PPL_ORDER.indexOf(b.name))
        );
      }

      if (sRes.data) {
        setRecent(sRes.data as WorkoutSession[]);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        setWeekCount(sRes.data.filter(s => s.completed_at && new Date(s.completed_at) >= weekAgo).length);
      }

      if (wRes.data) {
        setWeightLogs([...wRes.data].reverse());
      }

      setLoading(false);
    })();
  }, []);

  async function logWeight() {
    const val = parseFloat(weightInput);
    if (!val || val < 20 || val > 300) return;
    setSavingWeight(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from('body_weight_logs').upsert(
      { weight: val, logged_at: today, user_id: user?.id },
      { onConflict: 'user_id,logged_at' }
    ).select('weight, logged_at').single();
    if (data) {
      setWeightLogs(prev => {
        const filtered = prev.filter(l => l.logged_at !== today);
        return [...filtered, data].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
      });
      setWeightInput('');
    }
    setSavingWeight(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
    </div>
  );

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const prevWeight = weightLogs.length > 1 ? weightLogs[weightLogs.length - 2] : null;
  const weightDiff = latestWeight && prevWeight ? latestWeight.weight - prevWeight.weight : null;

  return (
    <div className="px-4 pt-8 pb-6 max-w-lg mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">PPL Program</p>
          <h1 className="text-3xl font-black text-white tracking-tight mt-0.5">Gym Tracker</h1>
        </div>
        {weekCount > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/25 rounded-2xl px-3 py-2 mt-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-bold text-sm">{weekCount} this week</span>
          </div>
        )}
      </div>

      {/* Body Weight Widget */}
      <section>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Body Weight</p>
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Scale className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-white font-black text-xl leading-none">
                  {latestWeight ? `${latestWeight.weight} kg` : '—'}
                </p>
                {weightDiff !== null && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {weightDiff > 0
                      ? <TrendingUp className="w-3 h-3 text-red-400" />
                      : weightDiff < 0
                        ? <TrendingDown className="w-3 h-3 text-green-400" />
                        : <Minus className="w-3 h-3 text-slate-500" />}
                    <span className={`text-xs font-bold ${weightDiff > 0 ? 'text-red-400' : weightDiff < 0 ? 'text-green-400' : 'text-slate-500'}`}>
                      {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} kg
                    </span>
                  </div>
                )}
              </div>
            </div>
            <WeightSparkline logs={weightLogs} />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Today's weight (kg)"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && logWeight()}
              className="flex-1 bg-slate-700 border border-slate-600/50 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
            <button
              onClick={logWeight}
              disabled={savingWeight || !weightInput}
              className="bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-40"
            >
              {savingWeight ? '…' : 'Log'}
            </button>
          </div>
        </div>
      </section>

      {/* PPL Day Cards */}
      <section>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Start a Session</p>
        {templates.length === 0 ? (
          <div className="bg-slate-800 rounded-3xl p-6 text-center border border-slate-700">
            <p className="text-slate-400 text-sm">No templates found — make sure you ran the seed SQL in Supabase.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(t => {
              const s = style(t.name);
              return (
                <div key={t.id} className={`bg-gradient-to-br ${s.gradient} border ${s.border} rounded-3xl p-5`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t.name}</p>
                      <h2 className={`text-3xl font-black tracking-tight ${s.text}`}>
                        {t.name.replace(' Day', '')}
                      </h2>
                      <p className="text-slate-400 text-sm mt-1">{t.description}</p>
                    </div>
                    <Link
                      href={`/workout/new?template=${t.id}`}
                      className={`${s.btn} text-white font-bold text-sm px-5 py-3 rounded-2xl flex items-center gap-2 transition-transform active:scale-95 shrink-0 ml-4 mt-1`}
                    >
                      <Play className="w-4 h-4" fill="white" strokeWidth={0} />
                      Start
                    </Link>
                  </div>
                  {t.exercises.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {t.exercises.slice(0, 5).map(ex => (
                        <span key={ex.id} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${s.chip}`}>
                          {ex.name}
                        </span>
                      ))}
                      {t.exercises.length > 5 && (
                        <span className="text-xs text-slate-600 self-center">+{t.exercises.length - 5} more</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Sessions */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent</p>
            <Link href="/history" className="text-orange-400 text-sm font-semibold">See all →</Link>
          </div>
          <div className="space-y-2">
            {recent.map(session => {
              const s = style((session as any).workout_templates?.name ?? '');
              const d = dur(session.started_at, session.completed_at);
              return (
                <Link
                  key={session.id}
                  href={session.completed_at ? `/history/${session.id}` : `/workout/${session.id}`}
                  className="bg-slate-800 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between active:bg-slate-700/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-10 rounded-full ${s.bar}`} />
                    <div>
                      <p className="font-bold text-white text-sm">{session.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {timeAgo(session.started_at)}{d ? ` · ${d}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!session.completed_at && (
                      <span className="text-xs font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/25 px-2.5 py-1 rounded-full">Active</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {recent.length === 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No workouts yet — tap Start above to begin</p>
        </div>
      )}
    </div>
  );
}
