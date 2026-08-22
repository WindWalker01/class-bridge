-- ============================================================================
-- Class Bridge — Teacher Schema Setup
-- ============================================================================
-- Run this SQL in the Supabase SQL Editor to create the tables, RLS policies,
-- and storage bucket needed for the teacher experience.
-- ============================================================================

-- 1. Classes table -------------------------------------------------------------
create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  subject    text not null,
  section    text,
  class_code text not null unique,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  is_archived boolean not null default false,
  archived_at timestamptz
);

-- 2. Class members table -------------------------------------------------------
create table if not exists public.class_members (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique(class_id, student_id)
);

-- 3. Posts table ---------------------------------------------------------------
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('announcement', 'material', 'quiz_link')),
  content    text not null default '',
  quiz_id    uuid references public.quizzes(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 4. Attachments table ---------------------------------------------------------
create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  file_url    text not null,
  file_name   text not null,
  file_type   text not null,
  uploaded_at timestamptz not null default now()
);

-- 5. Quizzes table -------------------------------------------------------------
create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.posts enable row level security;
alter table public.attachments enable row level security;
alter table public.quizzes enable row level security;

-- ============================================================================
-- SECURITY DEFINER helper functions
-- ============================================================================
-- These run as the definer (bypassing RLS) to break the circular policy
-- dependency between `classes` and `class_members`. Without this, querying
-- `classes` (via "Students can view enrolled classes") triggers a SELECT on
-- `class_members`, whose policy ("Teachers can view members of own classes")
-- queries `classes` again, causing:
--   "infinite recursion detected in policy for relation class_members" (42P17)

-- True if the current user is the teacher of the given class.
create or replace function public.is_teacher_of_class(target_class_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classes
    where id = target_class_id
      and teacher_id = auth.uid()
  );
$$;

-- True if the current user is a student enrolled in the given class.
create or replace function public.is_student_enrolled_in(target_class_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.class_members
    where class_id = target_class_id
      and student_id = auth.uid()
  );
$$;

-- Look up a class by its code, including the teacher's name.
-- Uses security definer so unenrolled students can find the class before joining.
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

-- Check if a class exists by ID (bypasses RLS so the join-flow policy can
-- verify the class exists before the student is enrolled).
create or replace function public.class_exists_by_id(p_class_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.classes where id = p_class_id);
$$;

-- ============================================================================
-- RLS Policies: classes
-- ============================================================================

-- Teachers can view their own classes
drop policy if exists "Teachers can view own classes" on public.classes;
create policy "Teachers can view own classes"
  on public.classes
  for select
  using (auth.uid() = teacher_id);

-- Students can view classes they are members of
drop policy if exists "Students can view enrolled classes" on public.classes;
create policy "Students can view enrolled classes"
  on public.classes
  for select
  using (public.is_student_enrolled_in(classes.id));

-- Teachers can insert their own classes
drop policy if exists "Teachers can create classes" on public.classes;
create policy "Teachers can create classes"
  on public.classes
  for insert
  with check (auth.uid() = teacher_id);

-- Teachers can update their own classes
drop policy if exists "Teachers can update own classes" on public.classes;
create policy "Teachers can update own classes"
  on public.classes
  for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Teachers can delete their own classes
drop policy if exists "Teachers can delete own classes" on public.classes;
create policy "Teachers can delete own classes"
  on public.classes
  for delete
  using (auth.uid() = teacher_id);

-- ============================================================================
-- RLS Policies: class_members
-- ============================================================================

-- Teachers can view members of their classes
drop policy if exists "Teachers can view members of own classes" on public.class_members;
create policy "Teachers can view members of own classes"
  on public.class_members
  for select
  using (public.is_teacher_of_class(class_members.class_id));

-- Students can view their own memberships
drop policy if exists "Students can view own memberships" on public.class_members;
create policy "Students can view own memberships"
  on public.class_members
  for select
  using (student_id = auth.uid());

-- Teachers can insert members into their classes
drop policy if exists "Teachers can add members to own classes" on public.class_members;
create policy "Teachers can add members to own classes"
  on public.class_members
  for insert
  with check (public.is_teacher_of_class(class_members.class_id));

-- Teachers can remove members from their classes
drop policy if exists "Teachers can remove members from own classes" on public.class_members;
create policy "Teachers can remove members from own classes"
  on public.class_members
  for delete
  using (public.is_teacher_of_class(class_members.class_id));

-- Students can join a class by inserting their own membership
-- Uses class_exists_by_id (security definer) so the existence check bypasses
-- RLS — the student is not yet enrolled, so the normal "Students can view
-- enrolled classes" policy would otherwise block the check.
drop policy if exists "Students can join classes" on public.class_members;
create policy "Students can join classes"
  on public.class_members
  for insert
  with check (
    student_id = auth.uid()
    and public.class_exists_by_id(class_members.class_id)
  );

-- ============================================================================
-- RLS Policies: posts
-- ============================================================================

-- Teachers can view posts in their classes
drop policy if exists "Teachers can view posts in own classes" on public.posts;
create policy "Teachers can view posts in own classes"
  on public.posts
  for select
  using (
    exists (
      select 1 from public.classes
      where classes.id = posts.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view posts in classes they are members of
drop policy if exists "Students can view posts in enrolled classes" on public.posts;
create policy "Students can view posts in enrolled classes"
  on public.posts
  for select
  using (
    exists (
      select 1 from public.class_members
      where class_members.class_id = posts.class_id
        and class_members.student_id = auth.uid()
    )
  );

-- Teachers can create posts in their classes
drop policy if exists "Teachers can create posts in own classes" on public.posts;
create policy "Teachers can create posts in own classes"
  on public.posts
  for insert
  with check (
    exists (
      select 1 from public.classes
      where classes.id = posts.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update posts in their classes
drop policy if exists "Teachers can update posts in own classes" on public.posts;
create policy "Teachers can update posts in own classes"
  on public.posts
  for update
  using (
    exists (
      select 1 from public.classes
      where classes.id = posts.class_id
        and classes.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes
      where classes.id = posts.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can delete posts in their classes
drop policy if exists "Teachers can delete posts in own classes" on public.posts;
create policy "Teachers can delete posts in own classes"
  on public.posts
  for delete
  using (
    exists (
      select 1 from public.classes
      where classes.id = posts.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies: attachments
-- ============================================================================

-- Teachers can view attachments of posts in their classes
drop policy if exists "Teachers can view attachments in own classes" on public.attachments;
create policy "Teachers can view attachments in own classes"
  on public.attachments
  for select
  using (
    exists (
      select 1 from public.posts
      join public.classes on classes.id = posts.class_id
      where posts.id = attachments.post_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view attachments of posts in enrolled classes
drop policy if exists "Students can view attachments in enrolled classes" on public.attachments;
create policy "Students can view attachments in enrolled classes"
  on public.attachments
  for select
  using (
    exists (
      select 1 from public.posts
      join public.class_members on class_members.class_id = posts.class_id
      where posts.id = attachments.post_id
        and class_members.student_id = auth.uid()
    )
  );

-- Teachers can create attachments for posts in their classes
drop policy if exists "Teachers can create attachments in own classes" on public.attachments;
create policy "Teachers can create attachments in own classes"
  on public.attachments
  for insert
  with check (
    exists (
      select 1 from public.posts
      join public.classes on classes.id = posts.class_id
      where posts.id = attachments.post_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update attachments in their classes
drop policy if exists "Teachers can update attachments in own classes" on public.attachments;
create policy "Teachers can update attachments in own classes"
  on public.attachments
  for update
  using (
    exists (
      select 1 from public.posts
      join public.classes on classes.id = posts.class_id
      where posts.id = attachments.post_id
        and classes.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.posts
      join public.classes on classes.id = posts.class_id
      where posts.id = attachments.post_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can delete attachments in their classes
drop policy if exists "Teachers can delete attachments in own classes" on public.attachments;
create policy "Teachers can delete attachments in own classes"
  on public.attachments
  for delete
  using (
    exists (
      select 1 from public.posts
      join public.classes on classes.id = posts.class_id
      where posts.id = attachments.post_id
        and classes.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies: quizzes
-- ============================================================================

-- Teachers can view quizzes in their classes
drop policy if exists "Teachers can view quizzes in own classes" on public.quizzes;
create policy "Teachers can view quizzes in own classes"
  on public.quizzes
  for select
  using (
    exists (
      select 1 from public.classes
      where classes.id = quizzes.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view published quizzes in enrolled classes
drop policy if exists "Students can view published quizzes in enrolled classes" on public.quizzes;
create policy "Students can view published quizzes in enrolled classes"
  on public.quizzes
  for select
  using (
    status = 'published'
    and exists (
      select 1 from public.class_members
      where class_members.class_id = quizzes.class_id
        and class_members.student_id = auth.uid()
    )
  );

-- Teachers can create quizzes in their classes
drop policy if exists "Teachers can create quizzes in own classes" on public.quizzes;
create policy "Teachers can create quizzes in own classes"
  on public.quizzes
  for insert
  with check (
    exists (
      select 1 from public.classes
      where classes.id = quizzes.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update quizzes in their classes
drop policy if exists "Teachers can update quizzes in own classes" on public.quizzes;
create policy "Teachers can update quizzes in own classes"
  on public.quizzes
  for update
  using (
    exists (
      select 1 from public.classes
      where classes.id = quizzes.class_id
        and classes.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes
      where classes.id = quizzes.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can delete quizzes in their classes
drop policy if exists "Teachers can delete quizzes in own classes" on public.quizzes;
create policy "Teachers can delete quizzes in own classes"
  on public.quizzes
  for delete
  using (
    exists (
      select 1 from public.classes
      where classes.id = quizzes.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- Storage Bucket: class-attachments
-- ============================================================================
-- Run this section in the Supabase SQL editor. The bucket is private (not
-- public). This section is idempotent and can be re-run safely.

-- Create the storage bucket:
insert into storage.buckets (id, name, public)
values ('class-attachments', 'class-attachments', false)
on conflict (id) do nothing;

-- Storage RLS: Teachers can upload/read/update/delete files for their classes
drop policy if exists "Teachers can manage class attachment files" on storage.objects;
create policy "Teachers can manage class attachment files"
  on storage.objects
  for all
  using (
    bucket_id = 'class-attachments'
    and exists (
      select 1 from public.classes
      where classes.id::text = (storage.foldername(storage.objects.name))[1]
        and classes.teacher_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'class-attachments'
    and exists (
      select 1 from public.classes
      where classes.id::text = (storage.foldername(storage.objects.name))[1]
        and classes.teacher_id = auth.uid()
    )
  );

-- Storage RLS: Students can read files for classes they are enrolled in
drop policy if exists "Students can read class attachment files" on storage.objects;
create policy "Students can read class attachment files"
  on storage.objects
  for select
  using (
    bucket_id = 'class-attachments'
    and exists (
      select 1 from public.class_members
      join public.classes on classes.id = class_members.class_id
      where classes.id::text = (storage.foldername(storage.objects.name))[1]
        and class_members.student_id = auth.uid()
    )
  );

-- ============================================================================
-- Indexes for common query patterns
-- ============================================================================
create index if not exists idx_classes_teacher_id on public.classes(teacher_id);
create index if not exists idx_class_members_class_id on public.class_members(class_id);
create index if not exists idx_class_members_student_id on public.class_members(student_id);
create index if not exists idx_posts_class_id on public.posts(class_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_posts_quiz_id on public.posts(quiz_id);
create index if not exists idx_attachments_post_id on public.attachments(post_id);
create index if not exists idx_quizzes_class_id on public.quizzes(class_id);
