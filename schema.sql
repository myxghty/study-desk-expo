-- Study Desk: classes, posts, marks, shared snapshots.
-- Paste into Supabase -> SQL Editor -> Run. Safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student','teacher')),
  name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  share_marks boolean not null default true,
  share_hours boolean not null default true,
  share_tasks boolean not null default true,
  share_done boolean not null default true,
  share_flags boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  kind text not null check (kind in ('assignment','exam','announcement')),
  title text not null check (char_length(title) between 1 and 120),
  notes text not null default '' check (char_length(notes) <= 2000),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_marks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  score numeric not null,
  max_score numeric not null check (max_score > 0),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

-- The student's own shared snapshot (the app only puts in what they chose to share)
create table if not exists public.snapshots (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.members enable row level security;
alter table public.posts enable row level security;
alter table public.teacher_marks enable row level security;
alter table public.snapshots enable row level security;

-- Helpers (security definer so policies don't recurse into each other)
create or replace function public.is_class_teacher(cid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from classes where id = cid and teacher_id = auth.uid()) $$;

create or replace function public.is_class_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from members where class_id = cid and student_id = auth.uid()) $$;

create or replace function public.teaches_student(sid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from members m join classes c on c.id = m.class_id
                  where m.student_id = sid and c.teacher_id = auth.uid()) $$;

-- Profile is created automatically on sign-up from the chosen role
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, name)
  values (new.id,
          case when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher' else 'student' end,
          left(coalesce(new.raw_user_meta_data->>'name',''), 80));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Student joins a class by code (students can't list classes, so this is a function)
create or replace function public.join_class(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'student') then
    raise exception 'only students can join a class';
  end if;
  select id into cid from classes where code = upper(trim(p_code));
  if cid is null then raise exception 'class code not found'; end if;
  insert into members (class_id, student_id) values (cid, auth.uid()) on conflict do nothing;
  return cid;
end $$;

-- Teacher creates a class with a random 6-char code
create or replace function public.create_class(p_name text) returns public.classes
language plpgsql security definer set search_path = public as $$
declare c public.classes; try_code text; n int := 0;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'teacher') then
    raise exception 'only teachers can create classes';
  end if;
  loop
    try_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from classes where code = try_code);
    n := n + 1; if n > 20 then raise exception 'try again'; end if;
  end loop;
  insert into classes (teacher_id, name, code) values (auth.uid(), left(p_name,80), try_code) returning * into c;
  return c;
end $$;

-- ===== Policies =====
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select to authenticated
  using (id = auth.uid() or teaches_student(id));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

drop policy if exists classes_read on public.classes;
create policy classes_read on public.classes for select to authenticated
  using (teacher_id = auth.uid() or is_class_member(id));
drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes for delete to authenticated using (teacher_id = auth.uid());

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated
  using (student_id = auth.uid() or is_class_teacher(class_id));
drop policy if exists members_update_own on public.members;
create policy members_update_own on public.members for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists members_leave on public.members;
create policy members_leave on public.members for delete to authenticated using (student_id = auth.uid());

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select to authenticated
  using (is_class_teacher(class_id) or is_class_member(class_id));
drop policy if exists posts_write on public.posts;
create policy posts_write on public.posts for insert to authenticated with check (is_class_teacher(class_id));
drop policy if exists posts_edit on public.posts;
create policy posts_edit on public.posts for update to authenticated
  using (is_class_teacher(class_id)) with check (is_class_teacher(class_id));
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated using (is_class_teacher(class_id));

drop policy if exists tm_read on public.teacher_marks;
create policy tm_read on public.teacher_marks for select to authenticated
  using (student_id = auth.uid() or is_class_teacher(class_id));
drop policy if exists tm_write on public.teacher_marks;
create policy tm_write on public.teacher_marks for insert to authenticated
  with check (is_class_teacher(class_id)
    and exists (select 1 from members where class_id = teacher_marks.class_id and student_id = teacher_marks.student_id));
drop policy if exists tm_delete on public.teacher_marks;
create policy tm_delete on public.teacher_marks for delete to authenticated using (is_class_teacher(class_id));

drop policy if exists snap_own on public.snapshots;
create policy snap_own on public.snapshots for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists snap_teacher on public.snapshots;
create policy snap_teacher on public.snapshots for select to authenticated using (teaches_student(student_id));

-- ===== Explicit grants (nothing is auto-exposed) =====
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, delete on public.classes to authenticated;
grant select, update, delete on public.members to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.teacher_marks to authenticated;
grant select, insert, update, delete on public.snapshots to authenticated;
grant execute on function public.join_class(text), public.create_class(text) to authenticated;
grant execute on function public.is_class_teacher(uuid), public.is_class_member(uuid), public.teaches_student(uuid) to authenticated;


-- ===== AI coach: per-user daily question limit =====
create table if not exists public.coach_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default ((now() at time zone 'utc')::date),
  n int not null default 0,
  primary key (user_id, day)
);
alter table public.coach_usage enable row level security;   -- no policies: only the function below can touch it

create or replace function public.coach_take(p_limit int default 30) returns boolean
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into coach_usage (user_id, n) values (auth.uid(), 1)
  on conflict (user_id, day) do update set n = coach_usage.n + 1
  returning n into c;
  return c <= p_limit;
end $$;
revoke all on public.coach_usage from anon, authenticated;
revoke execute on function public.coach_take(int) from anon, public;
grant execute on function public.coach_take(int) to authenticated;
