-- Create the games table
create table if not exists games (
  id text primary key,
  state jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for cleanup of old games
create index if not exists idx_games_updated_at on games (updated_at);

-- Enable RLS but allow all access (game is not sensitive)
alter table games enable row level security;

create policy "Allow all access to games" on games
  for all
  using (true)
  with check (true);

-- Function to auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger games_updated_at
  before update on games
  for each row
  execute function update_updated_at();

-- Optional: clean up games older than 24 hours
-- You can run this periodically via a cron job or Supabase Edge Function
-- delete from games where updated_at < now() - interval '24 hours';
