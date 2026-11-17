-- Soft delete for public.users.
-- Replaces the hard delete in UserController.deleteUser, which failed on FK
-- constraints while historical sales/entrepreneurships still referenced the user.
-- Deactivated users stay in the table for history joins and are hidden from the
-- IT dashboard and consumer selection lists.
--
-- Deploy this migration before the backend code that filters on is_active,
-- otherwise the list queries fail.
--
-- Rollback (lossy):
--   alter table public.users drop column if exists is_active;
-- Dropping the column makes every soft-deleted user active again, and their
-- Auth accounts remain banned. Unban them explicitly if that is intended.

alter table public.users
  add column if not exists is_active boolean default true;

-- Defensive: an earlier/manual version of the column could be nullable.
update public.users set is_active = true where is_active is null;

alter table public.users alter column is_active set default true;
alter table public.users alter column is_active set not null;

comment on column public.users.is_active is
  'false = soft-deleted: hidden from dashboards/consumer pickers and banned in Supabase Auth.';
