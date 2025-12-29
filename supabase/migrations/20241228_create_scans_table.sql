-- Create scans table
create table public.scans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  result jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.scans enable row level security;

-- Create policies
create policy "Users can view their own scans"
  on public.scans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

-- Optional: Create index for faster sorting/filtering
create index scans_user_id_created_at_idx on public.scans (user_id, created_at desc);
