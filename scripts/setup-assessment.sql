-- ============================================================================
-- Class Bridge — Assessment Engine Schema Setup
-- ============================================================================
-- Run this SQL in the Supabase SQL Editor to add the assessment engine tables,
-- RLS policies, and the auto-grading RPC function.
-- ============================================================================

-- 1. Alter existing quizzes table to add new columns --------------------------
alter table public.quizzes
  add column if not exists mode text not null default 'standard'
    check (mode in ('standard', 'timed', 'gamified')),
  add column if not exists time_limit_seconds int,
  add column if not exists due_at timestamptz;

-- Update the status check constraint to include 'closed'
alter table public.quizzes
  drop constraint if exists quizzes_status_check;

alter table public.quizzes
  add constraint quizzes_status_check
    check (status in ('draft', 'published', 'closed'));

-- Add updated_at trigger if not already present
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists quizzes_updated_at on public.quizzes;
create trigger quizzes_updated_at
  before update on public.quizzes
  for each row execute function public.set_updated_at();

-- 2. Questions table ----------------------------------------------------------
create table if not exists public.questions (
  id                uuid primary key default gen_random_uuid(),
  quiz_id           uuid not null references public.quizzes(id) on delete cascade,
  order_index       int not null default 0,
  type              text not null check (type in ('mcq', 'true_false', 'short_answer')),
  prompt            text not null,
  options           jsonb,
  correct_answer    jsonb not null,
  points            int not null default 1,
  time_limit_seconds int
);

-- 3. Quiz attempts table ------------------------------------------------------
create table if not exists public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  score         numeric,
  max_score     numeric,
  status        text not null default 'in_progress'
                check (status in ('in_progress', 'submitted', 'graded')),
  mode          text not null default 'standard'
                check (mode in ('standard', 'timed', 'gamified')),
  unique(quiz_id, student_id)
);

-- 4. Answers table ------------------------------------------------------------
create table if not exists public.answers (
  id             uuid primary key default gen_random_uuid(),
  attempt_id     uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete cascade,
  response       jsonb,
  is_correct     boolean,
  points_awarded numeric,
  needs_review   boolean default false,
  time_taken_ms  int,
  answered_at    timestamptz not null default now(),
  unique(attempt_id, question_id)
);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.answers enable row level security;

-- ============================================================================
-- RLS Policies: questions
-- ============================================================================

-- Teachers can view questions for quizzes in their classes
drop policy if exists "Teachers can view questions in own classes" on public.questions;
create policy "Teachers can view questions in own classes"
  on public.questions
  for select
  using (
    exists (
      select 1 from public.quizzes
      join public.classes on classes.id = quizzes.class_id
      where quizzes.id = questions.quiz_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view questions for published quizzes in enrolled classes
drop policy if exists "Students can view questions in enrolled classes" on public.questions;
create policy "Students can view questions in enrolled classes"
  on public.questions
  for select
  using (
    exists (
      select 1 from public.quizzes
      join public.class_members on class_members.class_id = quizzes.class_id
      where quizzes.id = questions.quiz_id
        and quizzes.status = 'published'
        and class_members.student_id = auth.uid()
    )
  );

-- Teachers can insert questions for quizzes in their classes
drop policy if exists "Teachers can insert questions in own classes" on public.questions;
create policy "Teachers can insert questions in own classes"
  on public.questions
  for insert
  with check (
    exists (
      select 1 from public.quizzes
      join public.classes on classes.id = quizzes.class_id
      where quizzes.id = questions.quiz_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can update questions for quizzes in their classes
drop policy if exists "Teachers can update questions in own classes" on public.questions;
create policy "Teachers can update questions in own classes"
  on public.questions
  for update
  using (
    exists (
      select 1 from public.quizzes
      join public.classes on classes.id = quizzes.class_id
      where quizzes.id = questions.quiz_id
        and classes.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quizzes
      join public.classes on classes.id = quizzes.class_id
      where quizzes.id = questions.quiz_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Teachers can delete questions for quizzes in their classes
drop policy if exists "Teachers can delete questions in own classes" on public.questions;
create policy "Teachers can delete questions in own classes"
  on public.questions
  for delete
  using (
    exists (
      select 1 from public.quizzes
      join public.classes on classes.id = quizzes.class_id
      where quizzes.id = questions.quiz_id
        and classes.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies: quiz_attempts
-- ============================================================================

-- Teachers can view attempts for quizzes in their classes
drop policy if exists "Teachers can view attempts in own classes" on public.quiz_attempts;
create policy "Teachers can view attempts in own classes"
  on public.quiz_attempts
  for select
  using (
    exists (
      select 1 from public.quizzes
      join public.classes on classes.id = quizzes.class_id
      where quizzes.id = quiz_attempts.quiz_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view their own attempts
drop policy if exists "Students can view own attempts" on public.quiz_attempts;
create policy "Students can view own attempts"
  on public.quiz_attempts
  for select
  using (student_id = auth.uid());

-- Students can insert their own attempts
drop policy if exists "Students can insert own attempts" on public.quiz_attempts;
create policy "Students can insert own attempts"
  on public.quiz_attempts
  for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.quizzes
      where quizzes.id = quiz_attempts.quiz_id
        and quizzes.status = 'published'
    )
  );

-- Students can update their own attempts (e.g., submit)
drop policy if exists "Students can update own attempts" on public.quiz_attempts;
create policy "Students can update own attempts"
  on public.quiz_attempts
  for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ============================================================================
-- RLS Policies: answers
-- ============================================================================

-- Teachers can view answers for attempts in their classes
drop policy if exists "Teachers can view answers in own classes" on public.answers;
create policy "Teachers can view answers in own classes"
  on public.answers
  for select
  using (
    exists (
      select 1 from public.quiz_attempts
      join public.quizzes on quizzes.id = quiz_attempts.quiz_id
      join public.classes on classes.id = quizzes.class_id
      where quiz_attempts.id = answers.attempt_id
        and classes.teacher_id = auth.uid()
    )
  );

-- Students can view their own answers
drop policy if exists "Students can view own answers" on public.answers;
create policy "Students can view own answers"
  on public.answers
  for select
  using (
    exists (
      select 1 from public.quiz_attempts
      where quiz_attempts.id = answers.attempt_id
        and quiz_attempts.student_id = auth.uid()
    )
  );

-- Students can insert their own answers
drop policy if exists "Students can insert own answers" on public.answers;
create policy "Students can insert own answers"
  on public.answers
  for insert
  with check (
    exists (
      select 1 from public.quiz_attempts
      where quiz_attempts.id = answers.attempt_id
        and quiz_attempts.student_id = auth.uid()
        and quiz_attempts.status = 'in_progress'
    )
  );

-- Students can update their own answers (while attempt is in progress)
drop policy if exists "Students can update own answers" on public.answers;
create policy "Students can update own answers"
  on public.answers
  for update
  using (
    exists (
      select 1 from public.quiz_attempts
      where quiz_attempts.id = answers.attempt_id
        and quiz_attempts.student_id = auth.uid()
        and quiz_attempts.status = 'in_progress'
    )
  )
  with check (
    exists (
      select 1 from public.quiz_attempts
      where quiz_attempts.id = answers.attempt_id
        and quiz_attempts.student_id = auth.uid()
        and quiz_attempts.status = 'in_progress'
    )
  );

-- ============================================================================
-- Auto-Grading RPC Function
-- ============================================================================

create or replace function public.grade_attempt(p_attempt_id uuid)
returns public.quiz_attempts as $$
declare
  v_attempt public.quiz_attempts;
  v_answer record;
  v_question record;
  v_is_correct boolean;
  v_points_awarded numeric;
  v_needs_review boolean;
  v_total_score numeric := 0;
  v_total_max numeric := 0;
  v_speed_multiplier numeric;
  v_time_taken_ms int;
begin
  -- Fetch the attempt
  select * into v_attempt
  from public.quiz_attempts
  where id = p_attempt_id;

  if not found then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.status != 'in_progress' then
    raise exception 'Attempt is not in progress';
  end if;

  -- Process each answer
  for v_answer in
    select a.*, q.type as question_type, q.correct_answer as question_correct_answer,
           q.points as question_points
    from public.answers a
    join public.questions q on q.id = a.question_id
    where a.attempt_id = p_attempt_id
  loop
    v_is_correct := null;
    v_points_awarded := 0;
    v_needs_review := false;
    v_time_taken_ms := v_answer.time_taken_ms;

    -- Grade based on question type
    if v_answer.question_type = 'mcq' then
      -- Compare selected key
      if v_answer.response is not null
         and v_answer.response->>'selectedKey' is not null
         and v_answer.question_correct_answer->>'key' is not null
         and v_answer.response->>'selectedKey' = v_answer.question_correct_answer->>'key' then
        v_is_correct := true;
      else
        v_is_correct := false;
      end if;

    elsif v_answer.question_type = 'true_false' then
      -- Compare boolean/string values
      if v_answer.response is not null
         and lower(trim(v_answer.response::text)) = lower(trim(v_answer.question_correct_answer::text)) then
        v_is_correct := true;
      else
        v_is_correct := false;
      end if;

    elsif v_answer.question_type = 'short_answer' then
      -- Case-insensitive trimmed string match
      if v_answer.response is not null
         and lower(trim(v_answer.response::text)) = lower(trim(v_answer.question_correct_answer::text)) then
        v_is_correct := true;
      else
        v_is_correct := null;
        v_needs_review := true;
      end if;
    end if;

    -- Calculate points
    if v_is_correct = true then
      v_points_awarded := v_answer.question_points;

      -- Gamified mode: speed bonus
      if v_attempt.mode = 'gamified' and v_time_taken_ms is not null then
        if v_time_taken_ms < 5000 then
          v_speed_multiplier := 2.0;
        elsif v_time_taken_ms < 15000 then
          v_speed_multiplier := 1.5;
        elsif v_time_taken_ms < 30000 then
          v_speed_multiplier := 1.25;
        else
          v_speed_multiplier := 1.0;
        end if;
        v_points_awarded := round(v_answer.question_points * v_speed_multiplier, 2);
      end if;
    elsif v_is_correct = false then
      v_points_awarded := 0;
    else
      -- needs_review (short_answer no match)
      v_points_awarded := 0;
    end if;

    -- Update the answer row
    update public.answers
    set is_correct = v_is_correct,
        points_awarded = v_points_awarded,
        needs_review = v_needs_review
    where id = v_answer.id;

    v_total_score := v_total_score + coalesce(v_points_awarded, 0);
    v_total_max := v_total_max + v_answer.question_points;
  end loop;

  -- Update the attempt
  update public.quiz_attempts
  set status = 'graded',
      submitted_at = coalesce(submitted_at, now()),
      score = v_total_score,
      max_score = v_total_max
  where id = p_attempt_id;

  -- Upsert into the new grades table (Grade Engine)
  if not exists (
    select 1 from public.graded_items gi
    where gi.source_type = 'quiz'
      and gi.source_id = v_attempt.quiz_id
  ) then
    raise warning 'No graded_item found for quiz % — skipping grade insert. Ensure the quiz was published while the grade engine was active.', v_attempt.quiz_id;
  else
    insert into public.grades (graded_item_id, student_id, score)
    select gi.id, v_attempt.student_id, v_total_score
    from public.graded_items gi
    where gi.source_type = 'quiz'
      and gi.source_id = v_attempt.quiz_id
    on conflict (graded_item_id, student_id)
    do update set score = excluded.score, graded_at = now();
  end if;

  -- Return the updated attempt
  select * into v_attempt
  from public.quiz_attempts
  where id = p_attempt_id;

  return v_attempt;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- Indexes for common query patterns
-- ============================================================================
create index if not exists idx_questions_quiz_id on public.questions(quiz_id);
create index if not exists idx_questions_order on public.questions(quiz_id, order_index);
create index if not exists idx_quiz_attempts_quiz_id on public.quiz_attempts(quiz_id);
create index if not exists idx_quiz_attempts_student_id on public.quiz_attempts(student_id);
create index if not exists idx_quiz_attempts_status on public.quiz_attempts(status);
create index if not exists idx_answers_attempt_id on public.answers(attempt_id);
create index if not exists idx_answers_question_id on public.answers(question_id);