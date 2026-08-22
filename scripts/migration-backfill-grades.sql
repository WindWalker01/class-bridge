-- ============================================================================
-- Class Bridge — Retroactive Grade Engine Migration
-- ============================================================================
-- Run this SQL in the Supabase SQL Editor AFTER running setup-grades.sql.
-- It backfills graded_items for any published quizzes that were created
-- before the Grade Engine was deployed, so their auto-grading results
-- will be recorded in the grades table.
-- ============================================================================

do $$
declare
  v_quiz record;
  v_category_id uuid;
  v_total_points numeric;
begin
  for v_quiz in
    select q.id, q.class_id, q.title
    from public.quizzes q
    where q.status = 'published'
      and not exists (
        select 1 from public.graded_items gi
        where gi.source_type = 'quiz'
          and gi.source_id = q.id
      )
  loop
    -- Find or create a default "Quizzes" category for this class
    select id into v_category_id
    from public.grade_categories
    where class_id = v_quiz.class_id and name = 'Quizzes';

    if not found then
      insert into public.grade_categories (class_id, name, weight)
      values (v_quiz.class_id, 'Quizzes', 100)
      returning id into v_category_id;
    end if;

    -- Sum total points for this quiz
    select coalesce(sum(points), 0) into v_total_points
    from public.questions
    where quiz_id = v_quiz.id;

    if v_total_points = 0 then
      v_total_points := 100;
    end if;

    -- Insert graded_item
    insert into public.graded_items (class_id, category_id, source_type, source_id, title, max_score)
    values (v_quiz.class_id, v_category_id, 'quiz', v_quiz.id, v_quiz.title, v_total_points);

    raise notice 'Created graded_item for quiz "%" (id: %)', v_quiz.title, v_quiz.id;
  end loop;
end;
$$;

-- ============================================================================
-- Also backfill grades for existing graded quiz_attempts
-- ============================================================================
-- For any quiz_attempt that is already 'graded' but has no corresponding
-- grade entry in the grades table, insert one now.
-- ============================================================================

insert into public.grades (graded_item_id, student_id, score)
select
  gi.id as graded_item_id,
  qa.student_id,
  qa.score
from public.quiz_attempts qa
join public.graded_items gi on gi.source_type = 'quiz' and gi.source_id = qa.quiz_id
where qa.status = 'graded'
  and qa.score is not null
  and not exists (
    select 1 from public.grades g
    where g.graded_item_id = gi.id
      and g.student_id = qa.student_id
  )
on conflict (graded_item_id, student_id)
do nothing;

raise notice 'Backfill complete.';