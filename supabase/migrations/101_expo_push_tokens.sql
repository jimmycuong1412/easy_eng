-- Expo push tokens for the mobile app (separate from web push_subscriptions,
-- which stores web-push endpoint+keys). Expo uses a single token string.

create table if not exists public.expo_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text,                 -- 'ios' | 'android'
  device_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists idx_expo_push_tokens_user on public.expo_push_tokens(user_id);

alter table public.expo_push_tokens enable row level security;

-- Users manage only their own tokens.
drop policy if exists "own_expo_tokens_select" on public.expo_push_tokens;
create policy "own_expo_tokens_select" on public.expo_push_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "own_expo_tokens_insert" on public.expo_push_tokens;
create policy "own_expo_tokens_insert" on public.expo_push_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "own_expo_tokens_delete" on public.expo_push_tokens;
create policy "own_expo_tokens_delete" on public.expo_push_tokens
  for delete using (auth.uid() = user_id);

-- Upsert helper: register/refresh the current user's token. Token is globally
-- unique, so re-registering on a new account reassigns it to that user.
create or replace function public.register_expo_push_token(
  p_token text,
  p_platform text default null,
  p_device_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  insert into expo_push_tokens (user_id, token, platform, device_name, last_used_at)
  values (auth.uid(), p_token, p_platform, p_device_name, now())
  on conflict (token) do update
    set user_id = auth.uid(),
        platform = excluded.platform,
        device_name = excluded.device_name,
        last_used_at = now();
end;
$$;

revoke all on function public.register_expo_push_token(text, text, text) from public;
grant execute on function public.register_expo_push_token(text, text, text) to authenticated;
