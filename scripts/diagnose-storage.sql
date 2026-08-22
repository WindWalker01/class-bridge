-- ============================================================================
-- Diagnostic queries: class-attachments storage RLS
-- Run these in the Supabase SQL editor and compare the results.
-- ============================================================================

-- 1. Do the policies exist on storage.objects?
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 2. Does the bucket exist and is it private?
select id, name, public, file_size_limit
from storage.buckets
where id = 'class-attachments';

-- 3. Replace <CLASS_ID> (from the "[composer] uploading:" log line) and
--    <USER_ID> (the user.id from the same log line) to confirm the uploader
--    is the teacher of record for that class:
select c.id, c.name, c.teacher_id,
       (c.teacher_id::text = 'c67a7767-b6c8-45c8-8a70-b435288a7ef5') as is_current_user_teacher
from public.classes c
where c.id = 'fa8a60ae-6ffd-4d2b-8a72-5752dc91de05';
