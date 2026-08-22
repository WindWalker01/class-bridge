-- ============================================================================
-- Class Bridge — Profile Cross-User Read Policies Migration
-- ============================================================================
-- Run this SQL in the Supabase SQL Editor AFTER setup-auth.sql.
--
-- The existing "Users can view own profile" policy restricts SELECT on the
-- profiles table to only the row matching auth.uid(). This is correct for
-- direct reads, but breaks foreign-key joins that need to resolve related
-- users' names (e.g. student views teacher name, teacher views student name).
--
-- This migration adds two additional SELECT policies that allow the minimal
-- cross-user reads needed by the application while preserving privacy.
-- ============================================================================

-- 1. Students can view teacher profiles ---------------------------------------
-- A student enrolled in a class may read the profile of that class's teacher.
-- This is needed for the student "My Classes" screen to display teacher names.
-- ============================================================================

drop policy if exists "Students can view teacher profiles" on public.profiles;

create policy "Students can view teacher profiles"
  on public.profiles
  for select
  using (
    -- The profile being read belongs to a teacher who owns a class
    -- that the current user (student) is enrolled in.
    exists (
      select 1
      from public.classes c
      inner join public.class_members cm on cm.class_id = c.id
      where c.teacher_id = profiles.id
        and cm.student_id = auth.uid()
    )
  );

-- 2. Teachers can view student profiles ---------------------------------------
-- A teacher may read the profile of any student enrolled in one of their
-- classes. This is needed for the gradebook, class roster, and leaderboard.
-- ============================================================================

drop policy if exists "Teachers can view student profiles" on public.profiles;

create policy "Teachers can view student profiles"
  on public.profiles
  for select
  using (
    -- The profile being read belongs to a student who is a member of a class
    -- that the current user (teacher) owns.
    exists (
      select 1
      from public.classes c
      inner join public.class_members cm on cm.class_id = c.id
      where cm.student_id = profiles.id
        and c.teacher_id = auth.uid()
    )
  );