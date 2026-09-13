-- =============================================================
-- Strain - esquema inicial de Supabase
-- =============================================================
-- Replica el modelo de datos usado por la app sin tocar el codigo
-- cliente. Incluye tablas base, indices, triggers de updated_at
-- y politicas RLS para aislar los datos de cada usuario.

set check_function_bodies = off;

do $$
begin
  create type public.muscle_group as enum ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.equipment as enum ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'other');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.mechanic as enum ('compound', 'isolation');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.set_type as enum ('warmup', 'working', 'failure', 'dropset');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.session_status as enum ('active', 'completed', 'discarded');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.record_type as enum ('one_rm', 'max_volume', 'max_reps', 'max_weight');
exception
  when duplicate_object then null;
end
$$;

create or replace function public.establecer_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.es_ejercicio_visible_para_usuario(_exercise_id text, _user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.exercises e
    where e.id = _exercise_id
      and (e.user_id is null or e.user_id = _user_id)
  );
$$;

create or replace function public.es_rutina_del_usuario(_routine_id text, _user_id uuid)
returns boolean
language sql
stable
as $$
  select _routine_id is null or exists (
    select 1
    from public.routines r
    where r.id = _routine_id
      and r.user_id = _user_id
  );
$$;

create or replace function public.es_sesion_del_usuario(_session_id text, _user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workout_sessions ws
    where ws.id = _session_id
      and ws.user_id = _user_id
  );
$$;

create or replace function public.es_set_del_usuario(_set_id text, _user_id uuid)
returns boolean
language sql
stable
as $$
  select _set_id is null or exists (
    select 1
    from public.sets s
    join public.session_exercises se on se.id = s.session_exercise_id
    join public.workout_sessions ws on ws.id = se.session_id
    where s.id = _set_id
      and ws.user_id = _user_id
  );
$$;

create or replace function public.sincronizar_personal_record_user_id()
returns trigger
language plpgsql
as $$
declare
  v_user_id uuid;
  v_exercise_id text;
begin
  if new.set_id is not null then
    select ws.user_id, se.exercise_id
      into v_user_id, v_exercise_id
    from public.sets s
    join public.session_exercises se on se.id = s.session_exercise_id
    join public.workout_sessions ws on ws.id = se.session_id
    where s.id = new.set_id;

    if v_user_id is null then
      raise exception 'No se pudo resolver el propietario del set %', new.set_id;
    end if;

    if new.exercise_id <> v_exercise_id then
      raise exception 'El exercise_id del record no coincide con el set origen';
    end if;

    new.user_id = v_user_id;
  end if;

  return new;
end;
$$;

create table public.exercises (
  id text primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  muscle_group public.muscle_group not null,
  secondary_muscles jsonb not null default '[]'::jsonb,
  equipment public.equipment not null default 'other',
  mechanic public.mechanic not null default 'compound',
  instructions text,
  is_custom boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.routines (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  tags jsonb not null default '[]'::jsonb,
  color text default '#3b82f6',
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.routine_exercises (
  id text primary key,
  routine_id text not null references public.routines(id) on delete cascade,
  exercise_id text not null references public.exercises(id) on delete restrict,
  order_index integer not null,
  target_sets integer not null default 3,
  target_reps text not null default '8-12',
  target_weight real,
  rest_seconds integer not null default 90,
  superset_group text,
  notes text,
  constraint routine_exercises_order_unique unique (routine_id, order_index)
);

create table public.workout_sessions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_id text references public.routines(id) on delete set null,
  name text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  notes text,
  total_volume real not null default 0,
  total_sets integer not null default 0,
  status public.session_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.session_exercises (
  id text primary key,
  session_id text not null references public.workout_sessions(id) on delete cascade,
  exercise_id text not null references public.exercises(id) on delete restrict,
  order_index integer not null,
  superset_group text,
  notes text
);

create table public.sets (
  id text primary key,
  session_exercise_id text not null references public.session_exercises(id) on delete cascade,
  set_index integer not null,
  set_type public.set_type not null default 'working',
  weight real not null default 0,
  reps integer not null default 0,
  is_completed boolean not null default false,
  rpe real,
  actual_rest_seconds integer,
  notes text,
  completed_at timestamptz
);

create table public.personal_records (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id text not null references public.exercises(id) on delete cascade,
  record_type public.record_type not null,
  value real not null,
  reps integer,
  weight real,
  set_id text references public.sets(id) on delete set null,
  achieved_at timestamptz not null,
  constraint personal_records_exercise_type_unique unique (exercise_id, record_type)
);

create index exercises_name_idx on public.exercises (name);
create index exercises_muscle_idx on public.exercises (muscle_group);
create index exercises_user_idx on public.exercises (user_id);
create index routines_name_idx on public.routines (name);
create index routines_user_idx on public.routines (user_id);
create index routine_exercises_routine_idx on public.routine_exercises (routine_id);
create index routine_exercises_exercise_idx on public.routine_exercises (exercise_id);
create index routine_exercises_superset_idx on public.routine_exercises (superset_group);
create index workout_sessions_started_idx on public.workout_sessions (started_at desc);
create index workout_sessions_status_idx on public.workout_sessions (status);
create index workout_sessions_user_idx on public.workout_sessions (user_id);
create index session_exercises_session_idx on public.session_exercises (session_id);
create index session_exercises_exercise_idx on public.session_exercises (exercise_id);
create index session_exercises_superset_idx on public.session_exercises (superset_group);
create index sets_session_exercise_idx on public.sets (session_exercise_id);
create index personal_records_exercise_idx on public.personal_records (exercise_id);
create index personal_records_set_idx on public.personal_records (set_id);
create index personal_records_user_idx on public.personal_records (user_id);

create trigger exercises_set_updated_at
before update on public.exercises
for each row
execute function public.establecer_updated_at();

create trigger routines_set_updated_at
before update on public.routines
for each row
execute function public.establecer_updated_at();

create trigger personal_records_set_user_id
before insert or update on public.personal_records
for each row
execute function public.sincronizar_personal_record_user_id();

alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.sets enable row level security;
alter table public.personal_records enable row level security;

-- Ejercicios globales (user_id null) son legibles por cualquiera autenticado.
-- Los ejercicios custom solo son visibles y editables por su propietario.
create policy "exercises_select_own_or_global"
on public.exercises
for select
to authenticated
using (user_id is null or auth.uid() = user_id);

create policy "exercises_insert_own"
on public.exercises
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "exercises_update_own"
on public.exercises
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "exercises_delete_own"
on public.exercises
for delete
to authenticated
using (auth.uid() = user_id);

create policy "routines_all_own"
on public.routines
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "routine_exercises_all_by_parent_routine"
on public.routine_exercises
for all
to authenticated
using (
  public.es_rutina_del_usuario(routine_exercises.routine_id, auth.uid())
)
with check (
  public.es_rutina_del_usuario(routine_exercises.routine_id, auth.uid())
  and public.es_ejercicio_visible_para_usuario(routine_exercises.exercise_id, auth.uid())
);

create policy "workout_sessions_all_own"
on public.workout_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.es_rutina_del_usuario(workout_sessions.routine_id, auth.uid())
);

create policy "session_exercises_all_by_parent_session"
on public.session_exercises
for all
to authenticated
using (
  public.es_sesion_del_usuario(session_exercises.session_id, auth.uid())
)
with check (
  public.es_sesion_del_usuario(session_exercises.session_id, auth.uid())
  and public.es_ejercicio_visible_para_usuario(session_exercises.exercise_id, auth.uid())
);

create policy "sets_all_by_parent_session"
on public.sets
for all
to authenticated
using (
  exists (
    select 1
    from public.session_exercises se
    join public.workout_sessions ws on ws.id = se.session_id
    where se.id = sets.session_exercise_id
      and ws.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.session_exercises se
    join public.workout_sessions ws on ws.id = se.session_id
    where se.id = sets.session_exercise_id
      and ws.user_id = auth.uid()
  )
);

create policy "personal_records_all_by_related_set"
on public.personal_records
for all
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.es_ejercicio_visible_para_usuario(personal_records.exercise_id, auth.uid())
  and public.es_set_del_usuario(personal_records.set_id, auth.uid())
);

grant usage on schema public to anon, authenticated;
grant select on public.exercises to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.routine_exercises to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.session_exercises to authenticated;
grant select, insert, update, delete on public.sets to authenticated;
grant select, insert, update, delete on public.personal_records to authenticated;
