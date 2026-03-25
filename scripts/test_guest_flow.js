
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = envConfig.SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function fixFlow() {
        console.log('--- ATTEMPTING GUEST CUSTOMER + ORDER FLOW ---');

        // 1. Create Guest Customer
        const guestEmail = 'guest_' + Math.random().toString(36).substr(2, 5) + '@rawy.ai';
        const { data: customer, error: custError } = await supabase.from('customers').insert({
            id: guestEmail,
            email: guestEmail,
            name: 'Guest User'
        }).select().single();

        if (custError) {
            console.error('Customer Creation Failed:', custError.message);
            return;
        }
        console.log('Customer Created:', customer.id);

        // 2. Create Order
        const orderNumber = 'FIX-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        const { data: order, error: ordError } = await supabase.from('orders').insert({
            order_number: orderNumber,
            customer_id: customer.id,
            customer_name: 'Guest User',
            total: 0,
            status: 'draft',
            created_at: new Date().toISOString(),
            story_data: { test: true },
            production_cost: 0,
            ai_cost: 0,
            shipping_cost: 0
        }).select().single();

        if (ordError) {
            console.error('Order Creation Failed:', ordError.message);
            console.log('Details:', ordError.details);
        } else {
            console.log('Order Created Successfully:', order.order_number);
        }
    }
    fixFlow();
} catch (e) { console.error(e); }
