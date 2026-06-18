-- =============================================================
-- Strain — esquema de Supabase para sincronización opcional
-- =============================================================
-- Ejecutar en Supabase SQL Editor.
-- Crea un esquema paralelo al de SQLite, con RLS activado.

-- Crear tipos enumerados (opcional; se puede usar TEXT con check)
create type muscle_group as enum ('chest','back','legs','shoulders','arms','core','cardio','other');
create type equipment as enum ('barbell','dumbbell','machine','cable','bodyweight','kettlebell','other');
create type mechanic as enum ('compound','isolation');
create type set_type as enum ('warmup','working','failure','dropset');
create type session_status as enum ('active','completed','discarded');
create type record_type as enum ('one_rm','max_volume','max_reps','max_weight');

-- Tabla espejo de exercises
create table public.exercises (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  muscle_group muscle_group not null,
  secondary_muscles jsonb default '[]'::jsonb,
  equipment equipment not null default 'other',
  mechanic mechanic not null default 'compound',
  instructions text,
  is_custom boolean not null default false,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.routines (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  tags jsonb default '[]'::jsonb,
  color text default '#3b82f6',
  is_archived boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.routine_exercises (
  id text primary key,
  routine_id text references public.routines(id) on delete cascade,
  exercise_id text references public.exercises(id) on delete restrict,
  order_index integer not null,
  target_sets integer not null default 3,
  target_reps text not null default '8-12',
  target_weight real,
  rest_seconds integer not null default 90,
  notes text,
  unique (routine_id, order_index)
);

create table public.workout_sessions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  routine_id text references public.routines(id) on delete set null,
  name text not null,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone,
  duration_seconds integer,
  notes text,
  total_volume real not null default 0,
  total_sets integer not null default 0,
  status session_status not null default 'active',
  created_at timestamp with time zone default now()
);

create table public.session_exercises (
  id text primary key,
  session_id text references public.workout_sessions(id) on delete cascade,
  exercise_id text references public.exercises(id) on delete restrict,
  order_index integer not null,
  notes text
);

create table public.sets (
  id text primary key,
  session_exercise_id text references public.session_exercises(id) on delete cascade,
  set_index integer not null,
  set_type set_type not null default 'working',
  weight real not null default 0,
  reps integer not null default 0,
  is_completed boolean not null default false,
  rpe real,
  actual_rest_seconds integer,
  notes text,
  completed_at timestamp with time zone
);

create table public.personal_records (
  id text primary key,
  exercise_id text references public.exercises(id) on delete cascade,
  record_type record_type not null,
  value real not null,
  reps integer,
  weight real,
  set_id text references public.sets(id) on delete set null,
  achieved_at timestamp with time zone not null,
  unique (exercise_id, record_type)
);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.sets enable row level security;
alter table public.personal_records enable row level security;

-- Política: cada user solo ve/edita sus filas
create policy "Users see own exercises" on public.exercises
  for all using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id);

create policy "Users see own routines" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users see own sessions" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Para routine_exercises / session_exercises / sets / prs,
-- crea políticas equivalentes comprobando la pertenencia al padre.

-- =============================================================
-- Función para evitar conflicto de IDs entre users
-- =============================================================
-- Si quieres nombres globales de ejercicios predefinidos, mantenlos con user_id=NULL
-- y permite lectura pública. Los custom (user_id=uuid) son privados.
