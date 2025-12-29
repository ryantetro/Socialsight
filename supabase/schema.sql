
-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  tier text default 'free',
  stripe_customer_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
  
-- Create projects table (monitored URLs)
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  title text,
  hostname text,
  score integer,
  last_scanned_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for projects
alter table public.projects enable row level security;

create policy "Users can CRUD own projects" on projects
  for all using (auth.uid() = user_id);

-- Create analytics_events table (impressions)
create table public.analytics_events (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  event_type text not null, -- 'impression', 'click'
  user_agent text,
  referer text,
  country text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Allow public insert for analytics (for proxied images), ideally restricted via edge function or server key
-- For simplicity in MVP, we might keep RLS off or allow anon insert with conditions.
alter table public.analytics_events enable row level security;
create policy "Enable insert for authenticated users only" on analytics_events for insert to authenticated with check (true);
create policy "Enable insert for anon (needed for public tracking)" on analytics_events for insert to anon with check (true);

create policy "Users can view own analytics" on analytics_events
  for select using (
    exists (
      select 1 from public.projects
      where projects.id = analytics_events.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
