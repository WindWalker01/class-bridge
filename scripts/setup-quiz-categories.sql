-- ============================================================================
-- Class Bridge — Quiz Category Assignment Migration
-- ============================================================================
-- Run this SQL in the Supabase SQL Editor AFTER setup-grades.sql and
-- setup-assessment.sql have been run. It adds a category_id column to the
-- quizzes table so each quiz can be assigned to a weighted grade category,
-- and ensures graded_items are automatically created for published quizzes.
-- ============================================================================

-- 1. Add category_id to quizzes -----------------------------------------------
alter table public.quizzes
  add column if not exists category_id uuid
    references public.grade_categories(id) on delete set null;

-- 2. Add unique partial index on graded_items for quiz sources -----------------
-- This lets us use ON CONFLICT for quiz-sourced graded_items.
create unique index if not exists idx_graded_items_quiz_source
  on public.graded_items (source_type, source_id)
  where source_type = 'quiz';

-- ============================================================================
-- Done. The app code now handles graded_item creation/update when a quiz is
-- published (in useQuizBuilder.ts -> togglePublish).
-- ============================================================================