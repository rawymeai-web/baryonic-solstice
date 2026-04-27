-- Migration: Add generation_quality_logs table for QA Agent

CREATE TABLE IF NOT EXISTS public.generation_quality_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_id TEXT NOT NULL,
    spread_number INTEGER NOT NULL,
    iteration_number INTEGER NOT NULL,
    image_url TEXT,
    
    -- Quality check flags
    character_consistency_status TEXT, -- 'pass' or 'fail'
    character_reasoning TEXT,
    
    style_consistency_status TEXT, -- 'pass' or 'fail'
    style_reasoning TEXT,
    
    text_clearance_status TEXT, -- 'pass' or 'fail'
    text_reasoning TEXT,
    recommended_text_side TEXT, -- 'Right' or 'Left'
    
    overall_decision TEXT NOT NULL -- 'pass', 'fail', or 'flagged'
);

-- Index for querying by order and spread
CREATE INDEX IF NOT EXISTS idx_generation_quality_logs_order_spread 
ON public.generation_quality_logs(order_id, spread_number);

-- RLS policies (assuming authenticated users can select/insert, or service role bypasses)
ALTER TABLE public.generation_quality_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to manage quality logs" 
ON public.generation_quality_logs 
FOR ALL USING (true) WITH CHECK (true);
