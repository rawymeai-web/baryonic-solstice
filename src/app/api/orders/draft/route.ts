
import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { uploadBase64Image } from '@/services/imageStore';
import { MasterScheduler } from '@/services/workers/scheduler';


export async function POST(req: Request) {
    console.log('--- Draft Order POST Started ---');
    try {
        const body = await req.json();
        console.log('Incoming Body Keys:', Object.keys(body));
        const { storyData, customerEmail, userId, customerName, total } = body;

        // 1. Validate Minimal Data
        if (!storyData) {
            console.error('Validation Error: Missing storyData');
            return NextResponse.json({ error: 'Missing storyData' }, { status: 400 });
        }

        // 2. Generate Draft Order ID
        const orderNumber = 'RWY-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        console.log('Generated Order Number:', orderNumber);

        // 3. Ensure Customer Exists
        let finalCustomerId = 'guest-placeholder';
        if (customerEmail) {
            finalCustomerId = customerEmail;
        } else if (userId) {
            finalCustomerId = userId;
        }

        // Upsert customer record
        const { error: custError } = await supabase
            .from('customers')
            .upsert({
                id: finalCustomerId,
                email: customerEmail || 'guest@placeholder.ai',
                name: customerName || (customerEmail ? customerEmail.split('@')[0] : 'Guest User')
            }, { onConflict: 'id' });

        if (custError) {
            console.error('Supabase Customer Upsert Error:', custError);
            // We continue anyway, the order might still work if the customer already exists
        }

        // 4. Create Draft Order
        console.log('Inserting into Supabase with all mandatory columns...');

        // OFF-LOAD DNA IMAGE IF PRESENT
        if (storyData.styleReferenceImageBase64 && storyData.styleReferenceImageBase64.length > 500) {
            try {
                const imageUrl = await uploadBase64Image(orderNumber, storyData.styleReferenceImageBase64, 'dna_reference.jpg');
                storyData.styleReferenceImageUrl = imageUrl;
                delete storyData.styleReferenceImageBase64;
                console.log('DNA Image Offloaded to Storage:', imageUrl);
            } catch (e) {
                console.error('Failed to offload DNA Image:', e);
            }
        }

        // Ensure we strip out any accidentally carried-over generative artifacts from previous orders
        delete storyData.blueprint;
        delete storyData.rawScript;
        delete storyData.script;
        delete storyData.visualPlan;
        delete storyData.prompts;

        const orderData: any = {
            order_number: orderNumber,
            status: 'New Order',
            customer_id: finalCustomerId,
            customer_name: customerName || (customerEmail ? customerEmail.split('@')[0] : 'Guest User'),
            total: total || 0,
            story_data: storyData,
            shipping_details: null,
            created_at: new Date().toISOString(),
            production_cost: 0,
            ai_cost: 0,
            shipping_cost: 0
        };

        const { data, error } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();

        if (error) {
            console.error('Supabase Draft Creation Error (Detailed):', JSON.stringify(error, null, 2));
            return NextResponse.json({
                error: 'Database error',
                details: error.message,
                hint: error.hint
            }, { status: 500 });
        }
        console.log('Draft Created Successfully:', orderNumber);

        return NextResponse.json({
            success: true,
            orderId: orderNumber,
            message: 'Draft Created'
        });

    } catch (e: any) {
        console.error('Draft API Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { orderId, storyData, stepProgress, status, shippingDetails } = body;

        if (!orderId) {
            return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
        }

        // 1. Fetch Existing Data (to prevent overwrite)
        const { data: existing, error: fetchError } = await supabase
            .from('orders')
            .select('story_data')
            .eq('order_number', orderId)
            .single();

        if (fetchError) {
            console.error('Fetch existing order failed:', fetchError);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Construct Update Object
        const updates: any = {};

        if (storyData) {
            // OFF-LOAD DNA IMAGE IF PRESENT IN UPDATE
            if (storyData.styleReferenceImageBase64 && storyData.styleReferenceImageBase64.length > 500) {
                try {
                    const imageUrl = await uploadBase64Image(orderId, storyData.styleReferenceImageBase64, 'dna_reference.jpg');
                    storyData.styleReferenceImageUrl = imageUrl;
                    delete storyData.styleReferenceImageBase64;
                    console.log('DNA Image Offloaded to Storage (PUT):', imageUrl);
                } catch (e) {
                    console.error('Failed to offload DNA Image (PUT):', e);
                }
            }

            // DEEP MERGE story_data
            const deepMerge = (target: any, source: any) => {
                for (const key of Object.keys(source)) {
                    if (source[key] instanceof Object && key in target) {
                        Object.assign(source[key], deepMerge(target[key], source[key]));
                    }
                }
                Object.assign(target || {}, source);
                return target;
            };

            updates.story_data = deepMerge(existing?.story_data || {}, storyData);
        }
        if (status) {
            updates.status = status;
            // PRD REQUIREMENT: Address Snapshotting
            // When order is paid (queueing for production), freeze the shipping details 
            // so future profile updates don't alter this specific locked order.
            if (status === 'paid_confirmed') {
                updates.status = 'queued'; // Fast-track to Queued for backend chron
                if (shippingDetails) {
                    updates.shipping_snapshot = shippingDetails;
                }
                // TRIGGER SCHEDULER asynchronously since local environment lacks cron
                MasterScheduler.executeTick().catch(e => console.error("Async Scheduler failed:", e));
            }
        }
        if (shippingDetails) updates.shipping_details = shippingDetails;

        const { data, error } = await supabase
            .from('orders')
            .update(updates)
            .eq('order_number', orderId)
            .select();

        if (error) {
            return NextResponse.json({ error: 'Update Failed', details: error.message, hint: error.hint }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Draft Updated' });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
