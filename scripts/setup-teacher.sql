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
  created_at timestamptz not null default now()
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

-- 6. Grades table --------------------------------------------------------------
create table if not exists public.grades (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id    uuid not null references public.quizzes(id) on delete cascade,
  score      numeric not null default 0,
  max_score  numeric not null default 100,
  graded_at  timestamptz,
  created_at timestamptz not null default now(),
  unique(student_id, quiz_id)
);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.posts enable row level security;
alter table public.attachments enable row level security;
alter table public.quizzes enable row level security;
alter table public.grades enable row level security;

-- ============================================================================
-- RLS Policies: classes
-- ============================================================================

-- Teachers can view their own classes
create policy "Teachers can view own classes"
  on public.classes
  for select
  using (auth.uid() = teacher_id);

-- Students can view classes they are members of
create policy "Students can view enrolled classes"
  on public.classes
  for select
  using (
    exists (
      select 1 from public.class_members
      where class_members.class_id = classes.id
        and class_members.student_id = auth.uid()
    )
  );

-- Teachers can insert their own classes
create policy "Teachers can create classes"
  on public.classes
  for insert
  with check (auth.uid() = teacher_id);

-- Teachers can update their own classes
create policy "Teachers can update own classes"
  on public.classes
  for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Teachers can delete their own classes
create policy "Teachers can delete own classes"
  on public.classes
  for delete
  using (auth.uid() = teacher_id);

-- ============================================================================
-- RLS Policies: class_members
-- ============================================================================

-- Teachers can view members of their classes
create policy "Teachers can view members of own classes"
  on public.class_members
  for select
  using (
    exists (
      select 1 from public.classes
      where classes.id = class_members.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view their own memberships
create policy "Students can view own memberships"
  on public.class_members
  for select
  using (student_id = auth.uid());

-- Teachers can insert members into their classes
create policy "Teachers can add members to own classes"
  on public.class_members
  for insert
  with check (
    exists (
      select 1 from public.classes
      where classes.id = class_members.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can remove members from their classes
create policy "Teachers can remove members from own classes"
  on public.class_members
  for delete
  using (
    exists (
      select 1 from public.classes
      where classes.id = class_members.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can join a class by inserting their own membership
create policy "Students can join classes"
  on public.class_members
  for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.classes
      where classes.id = class_members.class_id
    )
  );

-- ============================================================================
-- RLS Policies: posts
-- ============================================================================

-- Teachers can view posts in their classes
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
-- RLS Policies: grades
-- ============================================================================

-- Teachers can view grades for quizzes in their classes
create policy "Teachers can view grades in own classes"
  on public.grades
  for select
  using (
    exists (
      select 1 from public.quizzes
      join public.classes on classes.id = quizzes.class_id
      where quizzes.id = grades.quiz_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view their own grades
create policy "Students can view own grades"
  on public.grades
  for select
  using (student_id = auth.uid());

-- Teachers can insert grades for quizzes in their classes
create policy "Teachers can insert grades in own classes"
  on public.grades
  for insert
  with check (
    exists (
      select 1 from public.quizzes
      join public.classes on classes.id = quizzes.class_id
      where quizzes.id = grades.quiz_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update grades for quizzes in their classes
create policy "Teachers can update grades in own classes"
  on public.grades
  for update
  using (
    exists (
      select 1 from public.quizzes
      join public.classes on classes.id = quizzes.class_id
      where quizzes.id = grades.quiz_id
        and classes.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quizzes
      join public.classes on classes.id = quizzes.class_id
      where quizzes.id = grades.quiz_id
        and classes.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- Storage Bucket: class-attachments
-- ============================================================================
-- Run this section separately in the Supabase Storage SQL editor or via the
-- dashboard. The bucket should be private (not public).

-- Create the storage bucket (run via dashboard or SQL):
-- insert into storage.buckets (id, name, public) values ('class-attachments', 'class-attachments', false);

-- Storage RLS: Teachers can upload/read/delete files for their classes
-- create policy "Teachers can manage class attachment files"
--   on storage.objects
--   for all
--   using (
--     bucket_id = 'class-attachments'
--     and exists (
--       select 1 from public.classes
--       where classes.id::text = (storage.foldername(name))[1]
--         and classes.teacher_id = auth.uid()
--     )
--   );

-- Storage RLS: Students can read files for classes they are enrolled in
-- create policy "Students can read class attachment files"
--   on storage.objects
--   for select
--   using (
--     bucket_id = 'class-attachments'
--     and exists (
--       select 1 from public.class_members
--       join public.classes on classes.id = class_members.class_id
--       where classes.id::text = (storage.foldername(name))[1]
--         and class_members.student_id = auth.uid()
--     )
--   );

-- ============================================================================
-- Indexes for common query patterns
-- ============================================================================
create index if not exists idx_classes_teacher_id on public.classes(teacher_id);
create index if not exists idx_class_members_class_id on public.class_members(class_id);
create index if not exists idx_class_members_student_id on public.class_members(student_id);
create index if not exists idx_posts_class_id on public.posts(class_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_attachments_post_id on public.attachments(post_id);
create index if not exists idx_quizzes_class_id on public.quizzes(class_id);
create index if not exists idx_grades_quiz_id on public.grades(quiz_id);
create index if not exists idx_grades_student_id on public.grades(student_id);