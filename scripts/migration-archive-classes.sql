-- ============================================================================
-- Class Bridge — Class Archiving Migration
-- ============================================================================
-- Add soft-archive support to the `classes` table and prevent students from
-- joining archived classes by their class code.
--
-- Run this in the Supabase SQL Editor (or apply via your migration tooling).
-- ============================================================================

-- 1. Add archive columns to the classes table --------------------------------
alter table public.classes
  add column if not exists is_archived boolean not null default false;

alter table public.classes
  add column if not exists archived_at timestamptz;

-- 2. Re-create get_class_by_code to exclude archived classes -----------------
-- Students should no longer be able to join a class once its teacher has
-- archived it. We also surface `is_archived` so consumers can be explicit.
drop function if exists public.get_class_by_code(p_class_code text);

create or replace function public.get_class_by_code(p_class_code text)
returns table(
  id            uuid,
  name          text,
  subject       text,
  section       text,
  class_code    text,
  teacher_id    uuid,
  created_at    timestamptz,
  is_archived   boolean,
  teacher_name  text
)
language sql
stable
security definer set search_path = ''
as $$
  select
    c.id,
    c.name,
    c.subject,
    c.section,
    c.class_code,
    c.teacher_id,
    c.created_at,
    c.is_archived,
    p.full_name as teacher_name
  from public.classes c
  left join public.profiles p on p.id = c.teacher_id
  where c.class_code = p_class_code
    and c.is_archived = false
  limit 1;
$$;

-- 3. Indexes for archive queries --------------------------------------------
-- Common teacher "active classes" and "archived classes" lookups:
create index if not exists idx_classes_teacher_active
  on public.classes(teacher_id) where not is_archived;

create index if not exists idx_classes_teacher_archived
  on public.classes(teacher_id) where is_archived;