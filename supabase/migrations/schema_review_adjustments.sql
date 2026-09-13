-- =============================================================
-- Strain - ajustes tras revision del esquema
-- =============================================================
-- Refuerza ownership y RLS, y evita que personal_records pierda
-- acceso cuando el set origen se elimina y el FK queda en null.

set check_function_bodies = off;

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

alter table public.exercises
  alter column user_id set default auth.uid();

alter table public.routines
  alter column user_id set default auth.uid();

alter table public.workout_sessions
  alter column user_id set default auth.uid();

alter table public.personal_records
  add column if not exists user_id uuid;

alter table public.personal_records
  alter column user_id set default auth.uid();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'personal_records_user_id_fkey'
  ) then
    alter table public.personal_records
      add constraint personal_records_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end
$$;

update public.personal_records pr
set user_id = ws.user_id
from public.sets s
join public.session_exercises se on se.id = s.session_exercise_id
join public.workout_sessions ws on ws.id = se.session_id
where pr.set_id = s.id
  and pr.user_id is null;

alter table public.personal_records
  alter column user_id set not null;

create index if not exists personal_records_user_idx on public.personal_records (user_id);

drop trigger if exists personal_records_set_user_id on public.personal_records;

create trigger personal_records_set_user_id
before insert or update on public.personal_records
for each row
execute function public.sincronizar_personal_record_user_id();

drop policy if exists "routine_exercises_all_by_parent_routine" on public.routine_exercises;
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

drop policy if exists "workout_sessions_all_own" on public.workout_sessions;
create policy "workout_sessions_all_own"
on public.workout_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.es_rutina_del_usuario(workout_sessions.routine_id, auth.uid())
);

drop policy if exists "session_exercises_all_by_parent_session" on public.session_exercises;
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

drop policy if exists "personal_records_all_by_related_set" on public.personal_records;
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
