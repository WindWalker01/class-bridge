-- ============================================================================
-- Storage Bucket & Policies: class-attachments
-- ============================================================================
-- Fixes: StorageApiError "new row violates row-level security policy" when a
-- teacher uploads a post attachment.
--
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor). It is
-- idempotent and safe to re-run. The bucket is private (not public).
--
-- Upload path convention used by the app:
--   `${classId}/${postId}/${fileName}`
-- so the first folder segment is the class id, matched against public.classes.

-- 1. Create the storage bucket if it doesn't exist yet
insert into storage.buckets (id, name, public)
values ('class-attachments', 'class-attachments', false)
on conflict (id) do nothing;

-- 2. Teachers can upload/read/update/delete files for their own classes
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

-- 3. Students can read files for classes they are enrolled in
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
