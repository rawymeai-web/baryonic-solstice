-- 1. Reset: Drop existing policies to avoid "Already Exists" errors
drop policy if exists "Users can insert their own images" on generated_images;
drop policy if exists "Users can see their own images" on generated_images;
drop policy if exists "Users can insert orders" on orders;
drop policy if exists "Users can see their own orders" on orders;
drop policy if exists "Users can insert order items" on order_items;
drop policy if exists "Users can see their own order items" on order_items;

-- 2. Generated Images Policies (Fixes the "Empty DB" bug)
alter table generated_images enable row level security;

create policy "Users can insert their own images"
on generated_images for insert to authenticated
with check ( auth.uid() = user_id );

create policy "Users can see their own images"
on generated_images for select to authenticated
using ( auth.uid() = user_id );

-- 3. Orders Policies
alter table orders enable row level security;

create policy "Users can insert orders"
on orders for insert to authenticated
with check ( auth.uid() = user_id );

create policy "Users can see their own orders"
on orders for select to authenticated
using ( auth.uid() = user_id );

-- 4. Order Items Policies
alter table order_items enable row level security;

create policy "Users can insert order items"
on order_items for insert to authenticated
with check ( 
    -- Ensure the linked order belongs to the user
    exists ( select 1 from orders where id = order_id and user_id = auth.uid() )
);

create policy "Users can see their own order items"
on order_items for select to authenticated
using (
    exists ( select 1 from orders where id = order_id and user_id = auth.uid() )
);
