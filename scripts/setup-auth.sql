-- ============================================================================
-- Class Bridge — Auth & Profiles Setup
-- ============================================================================
-- Run this SQL in the Supabase SQL Editor to create the profiles table,
-- Row Level Security policies, and the auto-create trigger for new users.
-- ============================================================================

-- 1. Create the profiles table ------------------------------------------------
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  full_name  text,
  avatar_url text,
  role       text check (role in ('teacher', 'student')),
  onboarded  boolean default false,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security ------------------------------------------------
alter table public.profiles enable row level security;

-- 3. RLS Policies -------------------------------------------------------------

-- Allow users to read only their own profile
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Students can view teacher profiles (for showing teacher names in "My Classes")
drop policy if exists "Students can view teacher profiles" on public.profiles;
create policy "Students can view teacher profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1
      from public.classes c
      inner join public.class_members cm on cm.class_id = c.id
      where c.teacher_id = profiles.id
        and cm.student_id = auth.uid()
    )
  );

-- Teachers can view student profiles (for gradebook, roster, leaderboard)
drop policy if exists "Teachers can view student profiles" on public.profiles;
create policy "Teachers can view student profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1
      from public.classes c
      inner join public.class_members cm on cm.class_id = c.id
      where cm.student_id = profiles.id
        and c.teacher_id = auth.uid()
    )
  );

-- Allow users to update only their own profile
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow the trigger function to insert a row for new users
create policy "Allow insert for trigger"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- 4. Auto-create profile on sign-up -------------------------------------------

-- Function that runs after a new auth.users row is inserted
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

-- Trigger that fires the function on every auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();