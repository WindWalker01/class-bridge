-- ============================================================================
-- Class Bridge — Grade Engine Schema Setup
-- ============================================================================
-- Run this SQL in the Supabase SQL Editor to add the grade engine tables,
-- functions, triggers, and RLS policies.
-- ============================================================================

-- 0. Drop legacy grades table and its policies --------------------------------
drop policy if exists "Teachers can view grades in own classes" on public.grades;
drop policy if exists "Students can view own grades" on public.grades;
drop policy if exists "Teachers can insert grades in own classes" on public.grades;
drop policy if exists "Teachers can update grades in own classes" on public.grades;

drop table if exists public.grades cascade;

-- 1. Grade Categories table ---------------------------------------------------
create table if not exists public.grade_categories (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  name       text not null,
  weight     numeric not null default 0 check (weight >= 0 and weight <= 100),
  created_at timestamptz not null default now(),
  unique(class_id, name)
);

-- 2. Graded Items table -------------------------------------------------------
create table if not exists public.graded_items (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  category_id uuid not null references public.grade_categories(id) on delete cascade,
  source_type text not null check (source_type in ('quiz', 'manual')),
  source_id   uuid,
  title       text not null,
  max_score   numeric not null default 100,
  created_at  timestamptz not null default now()
);

-- 3. Grades table (new) -------------------------------------------------------
create table if not exists public.grades (
  id             uuid primary key default gen_random_uuid(),
  graded_item_id uuid not null references public.graded_items(id) on delete cascade,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  score          numeric not null default 0,
  graded_at      timestamptz not null default now(),
  unique(graded_item_id, student_id)
);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================
alter table public.grade_categories enable row level security;
alter table public.graded_items enable row level security;
alter table public.grades enable row level security;

-- ============================================================================
-- RLS Policies: grade_categories
-- ============================================================================

drop policy if exists "Teachers can view grade categories in own classes" on public.grade_categories;
-- Teachers can view grade categories for their own classes
create policy "Teachers can view grade categories in own classes"
  on public.grade_categories
  for select
  using (
    exists (
      select 1 from public.classes
      where classes.id = grade_categories.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view grade categories for enrolled classes
drop policy if exists "Students can view grade categories in enrolled classes" on public.grade_categories;
create policy "Students can view grade categories in enrolled classes"
  on public.grade_categories
  for select
  using (
    exists (
      select 1 from public.class_members
      where class_members.class_id = grade_categories.class_id
        and class_members.student_id = auth.uid()
    )
  );

-- Teachers can insert grade categories for their own classes
drop policy if exists "Teachers can insert grade categories in own classes" on public.grade_categories;
create policy "Teachers can insert grade categories in own classes"
  on public.grade_categories
  for insert
  with check (
    exists (
      select 1 from public.classes
      where classes.id = grade_categories.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update grade categories for their own classes
drop policy if exists "Teachers can update grade categories in own classes" on public.grade_categories;
create policy "Teachers can update grade categories in own classes"
  on public.grade_categories
  for update
  using (
    exists (
      select 1 from public.classes
      where classes.id = grade_categories.class_id
        and classes.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes
      where classes.id = grade_categories.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can delete grade categories for their own classes
drop policy if exists "Teachers can delete grade categories in own classes" on public.grade_categories;
create policy "Teachers can delete grade categories in own classes"
  on public.grade_categories
  for delete
  using (
    exists (
      select 1 from public.classes
      where classes.id = grade_categories.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies: graded_items
-- ============================================================================

-- Teachers can view graded items for their own classes
drop policy if exists "Teachers can view graded items in own classes" on public.graded_items;
create policy "Teachers can view graded items in own classes"
  on public.graded_items
  for select
  using (
    exists (
      select 1 from public.classes
      where classes.id = graded_items.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view graded items for enrolled classes
drop policy if exists "Students can view graded items in enrolled classes" on public.graded_items;
create policy "Students can view graded items in enrolled classes"
  on public.graded_items
  for select
  using (
    exists (
      select 1 from public.class_members
      where class_members.class_id = graded_items.class_id
        and class_members.student_id = auth.uid()
    )
  );

-- Teachers can insert graded items for their own classes
drop policy if exists "Teachers can insert graded items in own classes" on public.graded_items;
create policy "Teachers can insert graded items in own classes"
  on public.graded_items
  for insert
  with check (
    exists (
      select 1 from public.classes
      where classes.id = graded_items.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update graded items for their own classes
drop policy if exists "Teachers can update graded items in own classes" on public.graded_items;
create policy "Teachers can update graded items in own classes"
  on public.graded_items
  for update
  using (
    exists (
      select 1 from public.classes
      where classes.id = graded_items.class_id
        and classes.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes
      where classes.id = graded_items.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can delete graded items for their own classes
drop policy if exists "Teachers can delete graded items in own classes" on public.graded_items;
create policy "Teachers can delete graded items in own classes"
  on public.graded_items
  for delete
  using (
    exists (
      select 1 from public.classes
      where classes.id = graded_items.class_id
        and classes.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies: grades
-- ============================================================================

-- Teachers can view grades for their own classes
drop policy if exists "Teachers can view grades in own classes" on public.grades;
create policy "Teachers can view grades in own classes"
  on public.grades
  for select
  using (
    exists (
      select 1 from public.graded_items
      join public.classes on classes.id = graded_items.class_id
      where graded_items.id = grades.graded_item_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view their own grades
drop policy if exists "Students can view own grades" on public.grades;
create policy "Students can view own grades"
  on public.grades
  for select
  using (student_id = auth.uid());

-- Teachers can insert grades for their own classes
drop policy if exists "Teachers can insert grades in own classes" on public.grades;
create policy "Teachers can insert grades in own classes"
  on public.grades
  for insert
  with check (
    exists (
      select 1 from public.graded_items
      join public.classes on classes.id = graded_items.class_id
      where graded_items.id = grades.graded_item_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update grades for their own classes
drop policy if exists "Teachers can update grades in own classes" on public.grades;
create policy "Teachers can update grades in own classes"
  on public.grades
  for update
  using (
    exists (
      select 1 from public.graded_items
      join public.classes on classes.id = graded_items.class_id
      where graded_items.id = grades.graded_item_id
        and classes.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.graded_items
      join public.classes on classes.id = graded_items.class_id
      where graded_items.id = grades.graded_item_id
        and classes.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- Helper: letter grade from percentage
-- ============================================================================

create or replace function public.get_letter_grade(pct numeric)
returns text as $$
begin
  if pct >= 90 then return 'A';
  elsif pct >= 80 then return 'B';
  elsif pct >= 70 then return 'C';
  elsif pct >= 60 then return 'D';
  else return 'F';
  end if;
end;
$$ language plpgsql immutable;

-- ============================================================================
-- Helper: ensure a graded_item exists for a quiz
-- ============================================================================

create or replace function public.ensure_quiz_graded_item(
  p_quiz_id   uuid,
  p_class_id  uuid,
  p_title     text
)
returns void as $$
declare
  v_category_id uuid;
  v_total_points numeric;
begin
  -- Find or create a default "Quizzes" category for this class
  select id into v_category_id
  from public.grade_categories
  where class_id = p_class_id and name = 'Quizzes';

  if not found then
    insert into public.grade_categories (class_id, name, weight)
    values (p_class_id, 'Quizzes', 100)
    returning id into v_category_id;
  end if;

  -- Sum total points for this quiz
  select coalesce(sum(points), 0) into v_total_points
  from public.questions
  where quiz_id = p_quiz_id;

  if v_total_points = 0 then
    v_total_points := 100;
  end if;

  -- Insert graded_item (skip if already exists for this quiz)
  if not exists (
    select 1 from public.graded_items
    where source_type = 'quiz' and source_id = p_quiz_id
  ) then
    insert into public.graded_items (class_id, category_id, source_type, source_id, title, max_score)
    values (p_class_id, v_category_id, 'quiz', p_quiz_id, p_title, v_total_points);
  end if;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- Trigger: auto-create graded_item when a quiz is published (update)
-- ============================================================================

create or replace function public.trg_quiz_published()
returns trigger as $$
begin
  -- Only fire when status transitions TO 'published'
  if new.status = 'published' and (old.status is distinct from 'published') then
    perform public.ensure_quiz_graded_item(new.id, new.class_id, new.title);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists quizzes_after_publish on public.quizzes;
create trigger quizzes_after_publish
  after update on public.quizzes
  for each row execute function public.trg_quiz_published();

-- Also fire on insert (in case a quiz is created as published)
create or replace function public.trg_quiz_inserted()
returns trigger as $$
begin
  if new.status = 'published' then
    perform public.ensure_quiz_graded_item(new.id, new.class_id, new.title);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists quizzes_after_insert on public.quizzes;
create trigger quizzes_after_insert
  after insert on public.quizzes
  for each row execute function public.trg_quiz_inserted();

-- ============================================================================
-- Quiz Feed Post: auto create/delete a quiz_link post on publish/unpublish
-- ============================================================================

-- Add quiz_id column to posts (safe for existing installs)
alter table public.posts
  add column if not exists quiz_id uuid references public.quizzes(id) on delete cascade;

-- ============================================================================
-- Helper: create a quiz_link post for a published quiz
-- ============================================================================

create or replace function public.ensure_quiz_feed_post(
  p_quiz_id      uuid,
  p_class_id     uuid,
  p_title        text,
  p_description  text
)
returns void as $$
declare
  v_teacher_id uuid;
begin
  -- Get the teacher who owns this class
  select teacher_id into v_teacher_id
  from public.classes
  where id = p_class_id;

  -- Insert a quiz_link post (skip if one already exists for this quiz)
  if not exists (
    select 1 from public.posts
    where quiz_id = p_quiz_id
  ) then
    insert into public.posts (class_id, author_id, type, content, quiz_id)
    values (
      p_class_id,
      v_teacher_id,
      'quiz_link',
      case
        when p_description is not null and p_description != ''
          then '📝 A new quiz "' || p_title || '" is now available: ' || p_description
        else '📝 A new quiz "' || p_title || '" is now available!'
      end,
      p_quiz_id
    );
  end if;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- Trigger: manage feed post on quiz publish/unpublish (update)
-- ============================================================================

create or replace function public.trg_quiz_feed_post()
returns trigger as $$
begin
  -- Published → create a quiz_link post in the class feed
  if new.status = 'published' and (old.status is distinct from 'published') then
    perform public.ensure_quiz_feed_post(new.id, new.class_id, new.title, new.description);

  -- Unpublished → remove the quiz_link post from the feed
  elsif old.status = 'published' and new.status is distinct from 'published' then
    delete from public.posts
    where quiz_id = new.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Fire on update (publish/unpublish toggle)
drop trigger if exists quizzes_after_publish_feed on public.quizzes;
create trigger quizzes_after_publish_feed
  after update on public.quizzes
  for each row execute function public.trg_quiz_feed_post();

-- Also fire on insert (quiz created as published)
create or replace function public.trg_quiz_inserted_feed()
returns trigger as $$
begin
  if new.status = 'published' then
    perform public.ensure_quiz_feed_post(new.id, new.class_id, new.title, new.description);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists quizzes_after_insert_feed on public.quizzes;
create trigger quizzes_after_insert_feed
  after insert on public.quizzes
  for each row execute function public.trg_quiz_inserted_feed();

-- ============================================================================
-- RPC: final_grades(class_id) — weighted final grade calculation
-- ============================================================================

create or replace function public.final_grades(p_class_id uuid)
returns table(
  student_id          uuid,
  student_name        text,
  category_breakdown  jsonb,
  final_percentage    numeric,
  letter_grade        text
) as $$
declare
  v_cat record;
  v_student record;
  v_cat_pct numeric;
  v_final_pct numeric;
  v_breakdown jsonb[];
  v_cat_score numeric;
  v_cat_max numeric;
begin
  -- Loop over each enrolled student
  for v_student in
    select p.id, p.full_name
    from public.class_members cm
    join public.profiles p on p.id = cm.student_id
    where cm.class_id = p_class_id
  loop
    v_final_pct := 0;
    v_breakdown := array[]::jsonb[];

    -- Loop over each grade category for this class
    for v_cat in
      select gc.id, gc.name, gc.weight
      from public.grade_categories gc
      where gc.class_id = p_class_id
      order by gc.created_at
    loop
      -- Sum scores and max_scores for this student in this category
      select
        coalesce(sum(g.score), 0),
        coalesce(sum(gi.max_score), 0)
      into v_cat_score, v_cat_max
      from public.graded_items gi
      left join public.grades g on g.graded_item_id = gi.id and g.student_id = v_student.id
      where gi.category_id = v_cat.id;

      -- Category percentage (0 if no items or max is 0)
      if v_cat_max > 0 then
        v_cat_pct := round((v_cat_score / v_cat_max) * 100, 2);
      else
        v_cat_pct := 0;
      end if;

      -- Accumulate weighted contribution
      v_final_pct := v_final_pct + (v_cat_pct * v_cat.weight / 100);

      -- Build breakdown entry
      v_breakdown := array_append(v_breakdown, jsonb_build_object(
        'categoryName', v_cat.name,
        'weight', v_cat.weight,
        'percentage', v_cat_pct,
        'score', v_cat_score,
        'maxScore', v_cat_max
      ));
    end loop;

    -- Round final percentage
    v_final_pct := round(v_final_pct, 2);

    return query
    select
      v_student.id,
      v_student.full_name,
      array_to_json(v_breakdown)::jsonb,
      v_final_pct,
      public.get_letter_grade(v_final_pct);
  end loop;
end;
$$ language plpgsql stable security definer;

-- ============================================================================
-- RPC: student_final_grade(class_id, student_id) — single student variant
-- ============================================================================

create or replace function public.student_final_grade(p_class_id uuid, p_student_id uuid)
returns table(
  student_id          uuid,
  student_name        text,
  category_breakdown  jsonb,
  final_percentage    numeric,
  letter_grade        text
) as $$
begin
  return query
  select * from public.final_grades(p_class_id) fg
  where fg.student_id = p_student_id;
end;
$$ language plpgsql stable security definer;

-- ============================================================================
-- RPC: upsert_grade — used by teachers to set manual grades
-- ============================================================================

create or replace function public.upsert_grade(
  p_graded_item_id uuid,
  p_student_id     uuid,
  p_score          numeric
)
returns void as $$
begin
  insert into public.grades (graded_item_id, student_id, score)
  values (p_graded_item_id, p_student_id, p_score)
  on conflict (graded_item_id, student_id)
  do update set score = excluded.score, graded_at = now();
end;
$$ language plpgsql security definer;

-- ============================================================================
-- Indexes
-- ============================================================================
create index if not exists idx_grade_categories_class_id on public.grade_categories(class_id);
create index if not exists idx_graded_items_class_id on public.graded_items(class_id);
create index if not exists idx_graded_items_category_id on public.graded_items(category_id);
create index if not exists idx_graded_items_source on public.graded_items(source_type, source_id);
create index if not exists idx_grades_graded_item_id on public.grades(graded_item_id);
create index if not exists idx_grades_student_id on public.grades(student_id);