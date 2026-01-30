-- 1. Settings Table
create table if not exists settings (
    id int primary key default 1, -- Single row
    default_method text,
    default_spread_count int,
    enable_debug_view boolean DEFAULT false,
    generation_delay int,
    unit_production_cost float,
    unit_ai_cost float,
    unit_shipping_cost float,
    target_model text,
    updated_at timestamp with time zone default now()
);

alter table settings enable row level security;
create policy "Public read settings" on settings for select to anon, authenticated using (true);
create policy "Admin update settings" on settings for all to authenticated using (true) with check (true);

-- Insert Default Settings if empty
insert into settings (id, default_method, default_spread_count, unit_production_cost, unit_ai_cost, unit_shipping_cost, target_model)
values (1, 'method4', 8, 13.250, 0.600, 1.500, 'gemini-3-pro-preview')
on conflict (id) do nothing;

-- 2. Products Table
create table if not exists products (
    id text primary key, -- e.g. "20x20"
    name text,
    price float,
    preview_image_url text,
    is_available boolean default true,
    dimensions jsonb, -- { cover: {...}, page: {...}, margins: {...} }
    created_at timestamp with time zone default now()
);

alter table products enable row level security;
create policy "Public read products" on products for select to anon, authenticated using (true);
create policy "Admin manage products" on products for all to authenticated using (true) with check (true);

-- Insert Default Product
insert into products (id, name, price, preview_image_url, dimensions)
values ('20x20', 'Square', 29.900, 'https://i.imgur.com/KCXTGBh.png', 
 '{"cover": {"totalWidthCm": 46.2, "totalHeightCm": 23.4, "spineWidthCm": 1}, "page": {"widthCm": 20, "heightCm": 20}, "margins": {"topCm": 0.5, "bottomCm": 0.5, "outerCm": 2, "innerCm": 1}}')
on conflict (id) do nothing;

-- 3. Themes Table
create table if not exists themes (
    id text primary key,
    title jsonb, -- {ar: "...", en: "..."}
    description jsonb,
    emoji text,
    category text, 
    visual_dna text,
    skeleton jsonb, -- {storyCores: [], ...}
    created_at timestamp with time zone default now()
);

alter table themes enable row level security;
create policy "Public read themes" on themes for select to anon, authenticated using (true);
create policy "Admin manage themes" on themes for all to authenticated using (true) with check (true);

-- 4. Admin Users (Optional, to control who can edit)
-- For now, we assume ALL authenticated users are Admins (simple mode).

-- 5. Customers Table
create table if not exists customers (
    id text primary key, -- Email address
    name text,
    email text,
    phone text,
    first_order_date timestamp with time zone,
    last_order_date timestamp with time zone,
    order_count int default 0,
    created_at timestamp with time zone default now()
);

alter table customers enable row level security;
create policy "Admin manage customers" on customers for all to authenticated using (true) with check (true);

-- 6. Update Orders Table
alter table orders add column if not exists story_data jsonb;
alter table orders add column if not exists customer_id text references customers(id);
alter table orders add column if not exists shipping_details jsonb; -- Backup

-- Fix Order Policies (Already done in previous step, but ensuring update access)
drop policy if exists "Users check their own orders" on orders;
create policy "Users manage orders" on orders for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. Art Styles Table (New Requirement)
create table if not exists art_styles (
    id uuid default gen_random_uuid() primary key,
    name text unique,
    prompt_template text,
    preview_url text,
    is_active boolean default true
);
alter table art_styles enable row level security;
create policy "Public read styles" on art_styles for select to anon, authenticated using (true);
create policy "Admin manage styles" on art_styles for all to authenticated using (true) with check (true);
