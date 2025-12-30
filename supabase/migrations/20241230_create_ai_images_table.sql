-- Create ai_images table for tracking and saving AI generations
create table public.ai_images (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  url text not null,
  prompt text,
  image_data text not null, -- base64 or data URI
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.ai_images enable row level security;

-- Create policies
create policy "Users can view their own AI images"
  on public.ai_images for select
  using (auth.uid() = user_id);

create policy "Users can insert their own AI images"
  on public.ai_images for insert
  with check (auth.uid() = user_id);

-- Create help index for counting/analytics
create index ai_images_user_id_created_at_idx on public.ai_images (user_id, created_at desc);
