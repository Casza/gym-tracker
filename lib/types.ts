export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  weight_increment: number | null;
  created_by: string | null;
  category: string | null;
  created_at: string;
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  exercises: Exercise;
}

export interface WorkoutSession {
  id: string;
  template_id: string | null;
  name: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  workout_templates?: WorkoutTemplate;
}

export interface WorkoutSet {
  id?: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  completed: boolean;
  created_at?: string;
  exercises?: Exercise;
}

export interface PersonalBest {
  id: string;
  exercise_id: string;
  weight: number | null;
  reps: number | null;
  achieved_at: string;
  session_id: string | null;
  exercises?: Exercise;
}
