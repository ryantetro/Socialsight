-- Create table for storing featured spot requests
create table if not exists public.featured_requests (
    id uuid not null default gen_random_uuid(),
    user_id uuid references auth.users(id),
    website_url text not null,
    company_name text not null,
    description text,
    status text not null default 'pending', -- pending, paid, approved, rejected
    amount integer not null default 2500, -- in cents, so $25.00
    stripe_session_id text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    
    constraint featured_requests_pkey primary key (id)
);

-- Enable RLS
alter table public.featured_requests enable row level security;

-- Policies
create policy "Users can view their own requests"
    on public.featured_requests for select
    using (auth.uid() = user_id);

create policy "Users can insert their own requests"
    on public.featured_requests for insert
    with check (auth.uid() = user_id);

-- Only service role can update (e.g. via webhook) for now to prevent users from marking as paid
create policy "Service role can update requests"
    on public.featured_requests for update
    using (true);
