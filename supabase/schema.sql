-- Einmal im Supabase SQL Editor ausführen (SQL Editor › New query › einfügen › Run).
-- Termine werden pro Kalender-Schlüssel ("space") gespeichert. Wer den Schlüssel
-- aus dem Einladungslink nicht kennt, kommt an nichts heran: Die Tabelle selbst ist
-- gesperrt, Zugriff gibt es nur über die drei Funktionen unten.

create table if not exists public.events (
  id uuid primary key,
  space text not null check (length(space) >= 24),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists events_space_idx on public.events (space);

alter table public.events enable row level security;
-- Absichtlich keine Policies: direkter Zugriff auf die Tabelle ist für alle gesperrt.
revoke all on public.events from anon, authenticated;

create or replace function public.list_events(p_space text)
returns setof public.events
language sql
security definer
set search_path = public
as $$
  select * from public.events where space = p_space and length(p_space) >= 24;
$$;

create or replace function public.upsert_events(p_space text, p_events jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(p_space) < 24 then raise exception 'invalid space'; end if;
  if jsonb_array_length(p_events) > 500 then raise exception 'too many events'; end if;
  insert into public.events (id, space, data, updated_at)
  select (e->>'id')::uuid, p_space, e, now()
  from jsonb_array_elements(p_events) as e
  on conflict (id) do update
    set data = excluded.data, updated_at = now()
    where public.events.space = p_space;
end;
$$;

create or replace function public.delete_event(p_space text, p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.events where space = p_space and id = p_id and length(p_space) >= 24;
$$;

revoke all on function public.list_events(text) from public;
revoke all on function public.upsert_events(text, jsonb) from public;
revoke all on function public.delete_event(text, uuid) from public;
grant execute on function public.list_events(text) to anon;
grant execute on function public.upsert_events(text, jsonb) to anon;
grant execute on function public.delete_event(text, uuid) to anon;
