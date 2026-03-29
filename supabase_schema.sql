-- Run this in your Supabase SQL editor

-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users primary key,
  full_name text,
  email text,
  preferences jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  destination text not null,
  departure_date date,
  return_date date,
  num_travelers integer default 1,
  budget_total numeric,
  budget_breakdown jsonb default '{}',
  status text default 'planning',
  state_json jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.trips enable row level security;
create policy "Users can CRUD own trips" on public.trips for all using (auth.uid() = user_id);

-- Bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  type text not null,
  status text default 'pending',
  provider text,
  details jsonb default '{}',
  estimated_cost numeric,
  actual_cost numeric,
  booking_url text,
  confirmation_number text,
  created_at timestamptz default now()
);

alter table public.bookings enable row level security;
create policy "Users can CRUD own bookings" on public.bookings for all
  using (exists (select 1 from public.trips where trips.id = bookings.trip_id and trips.user_id = auth.uid()));

-- Calendar Events
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  booking_id uuid references public.bookings(id),
  type text not null,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  gcal_event_id text,
  color text,
  metadata jsonb default '{}'
);

alter table public.calendar_events enable row level security;
create policy "Users can CRUD own calendar events" on public.calendar_events for all
  using (exists (select 1 from public.trips where trips.id = calendar_events.trip_id and trips.user_id = auth.uid()));

-- Budget Items
create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  category text not null,
  label text,
  estimated_cost numeric default 0,
  actual_cost numeric,
  status text default 'estimated'
);

alter table public.budget_items enable row level security;
create policy "Users can CRUD own budget items" on public.budget_items for all
  using (exists (select 1 from public.trips where trips.id = budget_items.trip_id and trips.user_id = auth.uid()));

-- Conversation History
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
create policy "Users can CRUD own messages" on public.messages for all
  using (exists (select 1 from public.trips where trips.id = messages.trip_id and trips.user_id = auth.uid()));
