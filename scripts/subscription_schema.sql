-- ==========================================
-- SUBSCRIPTION & BACKEND PIPELINE SCHEMA V3
-- ==========================================

-- 1. EXPAND ORDER STATUS ENUM
-- Note: 'draft', 'pending_payment', 'paid' (legacy), 'processing', 'shipped', 'cancelled', 'failed' exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'draft', 'pending_payment', 'paid', 'processing', 'shipped', 'cancelled', 'failed',
            'paid_confirmed', 'queued', 'theme_assigned', 'story_generating', 'story_ready',
            'illustrations_generating', 'illustrations_ready', 'book_compiling', 'softcopy_ready',
            'awaiting_preview_approval', 'sent_to_print', 'printing', 'delivered', 'on_hold'
        );
    ELSE
        BEGIN
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'paid_confirmed';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'queued';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'theme_assigned';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'story_generating';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'story_ready';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'illustrations_generating';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'illustrations_ready';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'book_compiling';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'softcopy_ready';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_preview_approval';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'sent_to_print';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'printing';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivered';
            ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'on_hold';
        EXCEPTION WHEN duplicate_object THEN null;
        END;
    END IF;
END$$;

-- 2. CREATE NEW ENUMS
DO $$
BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'payment_retry', 'paused', 'cancelled', 'expired');
    CREATE TYPE subscription_plan AS ENUM ('monthly', 'yearly');
    CREATE TYPE job_status AS ENUM ('queued', 'running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END$$;

-- 3. HEROES TABLE
CREATE TABLE IF NOT EXISTS heroes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    dna_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. HERO PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS hero_preferences (
    hero_id UUID PRIMARY KEY REFERENCES heroes(id) ON DELETE CASCADE,
    preferred_theme_tags TEXT[] DEFAULT '{}',
    blocked_theme_tags TEXT[] DEFAULT '{}',
    style_mode TEXT DEFAULT 'fixed', -- 'fixed' or 'rotate'
    style_reference_image_base64 TEXT, -- Snapshotted latest style
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. THEMES TABLE
CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    visual_dna_prompt TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    active_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if the table was already present
ALTER TABLE themes 
    ADD COLUMN IF NOT EXISTS visual_dna_prompt TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS active_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS active_to TIMESTAMP WITH TIME ZONE;

-- 6. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id TEXT NOT NULL,
    hero_id UUID NOT NULL REFERENCES heroes(id) ON DELETE RESTRICT,
    plan subscription_plan NOT NULL,
    status subscription_status DEFAULT 'active',
    stripe_subscription_id TEXT UNIQUE,
    shipping_address_id UUID, -- References an addresses table (can be added later)
    next_billing_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. HERO THEME HISTORY (Constraint Enforcement)
CREATE TABLE IF NOT EXISTS hero_theme_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hero_id UUID NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
    theme_id TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    order_id TEXT, -- Soft references orders(order_number)
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hero_id, theme_id) -- CRITICAL: Prevents theme repetition
);

-- 8. MODIFY ORDERS TABLE
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS billing_cycle_date DATE,
    ADD COLUMN IF NOT EXISTS shipping_snapshot JSONB, -- Stores the frozen address
    ADD COLUMN IF NOT EXISTS generation_snapshot JSONB; -- Stores stable hero ID, preferences, theme_id, and age
    
-- Add Idempotency Duplicate Constraint
-- Only enforce this for subscription orders, one-time have null billing cycle
DO $$
BEGIN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_sub_cycle;
    ALTER TABLE orders ADD CONSTRAINT unique_sub_cycle UNIQUE (subscription_id, billing_cycle_date);
EXCEPTION WHEN duplicate_object THEN null;
END$$;

-- 9. ORDER JOBS (PRODUCTION PIPELINE)
CREATE TABLE IF NOT EXISTS order_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL, -- Soft references orders(order_number)
    job_type TEXT NOT NULL, -- 'story', 'illustration', 'compilation', 'print_handoff'
    status job_status DEFAULT 'queued',
    attempts INT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    worker_name TEXT,
    artifact_refs JSONB, -- Logs what it generated (S3 links, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. EVENT AUDIT LOG
CREATE TABLE IF NOT EXISTS event_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- 'payment_succeeded', 'theme_assigned', 'manual_override', etc
    order_id TEXT, -- Soft references orders(order_number)
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    admin_id TEXT, -- Null if system generated
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ARTIFACTS LOGGING TABLE
-- Tracks the permanent storage locations of generated assets for debugging and versioning.
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL, -- Soft references orders(order_number)
    artifact_type TEXT NOT NULL, -- 'preview_pdf', 'final_pdf', 'illustration_image'
    version INT DEFAULT 1,
    storage_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. WEBHOOK IDEMPOTENCY TRACKING
-- Ensures provider webhooks (Stripe, etc.) do not double-fire across the system.
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_event_id TEXT UNIQUE NOT NULL, -- The Stripe or vendor ID
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'success',
    payload JSONB
);

-- 13. DISTRIBUTED SCHEDULER LOCKS
-- Prevents multiple cron instances from acting simultaneously.
CREATE TABLE IF NOT EXISTS system_locks (
    lock_name TEXT PRIMARY KEY,
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL
);
