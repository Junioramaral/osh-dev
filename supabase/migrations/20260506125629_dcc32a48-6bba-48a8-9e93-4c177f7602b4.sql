create or replace function public.get_user_email(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email::text from auth.users where id = _user_id
$$;

grant execute on function public.get_user_email(uuid) to authenticated;