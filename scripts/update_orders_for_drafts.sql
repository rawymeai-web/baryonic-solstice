
-- Update Orders Table for Drafts System
-- We need to support 'draft' status and partial data

-- 1. Update Status Enum safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('draft', 'pending_payment', 'paid', 'processing', 'shipped', 'cancelled', 'failed');
    ELSE
        -- Add 'draft' if missing
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'paid';
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_payment' BEFORE 'paid';
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'failed';
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled';
    END IF;
END$$;

-- 2. Alter Table Columns
ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS status order_status DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS step_progress INT DEFAULT 0, -- 0=Init, 1=HeroApproved, 2=Checkout, 3=Generating...
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure shipping_details is nullable for drafts
ALTER TABLE orders ALTER COLUMN shipping_details DROP NOT NULL;

-- 3. Update Policies to allow users to insert their *own* drafts
-- (Assuming authenticated users)
create policy "Users can create their own orders" 
on orders for insert 
to authenticated 
with check (auth.uid() = user_id);

-- Allow users to update their own drafts
create policy "Users can update their own orders" 
on orders for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
