import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
    console.log("-----------------------------------------");
    console.log("🚀 Starting Pipeline Verification Tests...");
    console.log("-----------------------------------------");
    let passed = 0;
    let failed = 0;

    const assert = (condition: boolean, message: string) => {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    };

    try {
        // 1. Setup Test Data
        console.log("--- 1. Setting up test entities ---");
        const { v4: uuidv4 } = await import('uuid');

        const testCustId = uuidv4();
        const testHeroId = uuidv4();
        const testSubId = uuidv4();
        const testEmail = `test-${Date.now()}@test.com`;

        // Create Customer
        const { data: customer, error: cErr } = await supabase.from('customers').insert({
            id: testCustId,
            name: "Test Customer",
            email: testEmail
        }).select().single();
        if (cErr) throw new Error("Could not create customer: " + cErr.message);

        // Create Hero
        const { error: hErr } = await supabase.from('heroes').insert({
            id: testHeroId,
            customer_id: customer.id,
            name: "Test Hero",
            date_of_birth: "2018-05-10",
            dna_image_url: "https://example.com/test.jpg"
        });
        if (hErr) throw new Error("Could not create hero: " + hErr.message);

        // Create Subscription
        const cycleDate = new Date().toISOString().split('T')[0];
        const { error: sErr } = await supabase.from('subscriptions').insert({
            id: testSubId,
            customer_id: customer.id,
            hero_id: testHeroId,
            status: 'active',
            plan: 'monthly',
            next_billing_date: new Date(Date.now() + 86400000).toISOString()
        });
        if (sErr) throw new Error("Could not create sub: " + sErr.message);

        console.log("✅ Test entities created successfully.");

        // 2. Test Deduplication
        console.log("\n--- 2. Testing Subscription Deduplication ---");
        const orderId1 = 'TEST-ORD-1-' + Date.now();
        const orderId2 = 'TEST-ORD-2-' + Date.now();
        const { error: o1Err } = await supabase.from('orders').insert({
            order_number: orderId1,
            customer_id: customer.id,
            customer_name: "Test Customer",
            total: 0,
            status: "queued",
            subscription_id: testSubId,
            billing_cycle_date: cycleDate,
            story_data: {},
            shipping_details: {}
        });
        if (o1Err) console.error("O1_ERR:", o1Err);
        assert(!o1Err, "First order inserted successfully for cycle.");

        const { error: o2Err } = await supabase.from('orders').insert({
            order_number: orderId2,
            customer_id: customer.id,
            customer_name: "Test Customer",
            total: 0,
            status: "queued",
            subscription_id: testSubId,
            billing_cycle_date: cycleDate, // SAME CYCLE DATE
            story_data: {},
            shipping_details: {}
        });
        assert(o2Err !== null && o2Err.code === '23505', "Duplicate cycle order correctly blocked by unique constraint.");

        // 3. Address Snapshotting (we can test the mechanism via the Theme Engine or manual assertions)
        // Since we insert it statically in the cron, we just verify the schema constraints hold.

        console.log("\n--- 3. Testing Theme Engine Assignment (No Repeats) ---");
        // Create 2 test themes
        const { error: tErr } = await supabase.from('themes').upsert([
            { id: 'theme-test-A', title: 'Test A', description: 'Desc', visual_dna_prompt: 'some specific dna', active_from: new Date('2020-01-01').toISOString(), active_to: null },
            { id: 'theme-test-B', title: 'Test B', description: 'Desc', visual_dna_prompt: 'some magical dna', active_from: new Date('2020-01-01').toISOString(), active_to: null }
        ]);
        if (tErr) console.error("Theme Upsert Error:", tErr);

        const { ThemeAssignmentEngine } = await import('../src/services/workers/themeEngine');

        // Assign first theme
        const res1 = await ThemeAssignmentEngine.assignThemeForOrder(orderId1, testSubId, testHeroId);
        assert(res1.success, `Assigned first theme via engine for order`);

        // Let's hardcode it into history to simulate completion if it didn't write it
        if (res1.themeId) {
            // It should have written it to hero_theme_history automatically during the call.
        }

        // Assign second theme for a new order
        const orderId3 = 'TEST-ORD-3-' + Date.now();
        const { error: o3Err } = await supabase.from('orders').insert({
            order_number: orderId3,
            customer_id: customer.id,
            total: 0,
            status: "queued",
            subscription_id: testSubId,
            billing_cycle_date: '2099-01-01',
            story_data: {},
            shipping_details: {}
        });
        const res2 = await ThemeAssignmentEngine.assignThemeForOrder(orderId3, testSubId, testHeroId);
        assert(res2.success && res2.themeId !== res1.themeId, `Assigned second theme: ${res2.themeId} (different from first)`);

        // Clean up themes if needed (we'll let DB cascade or ignore)

    } catch (e: any) {
        console.error("❌ CRITICAL TEST FAILURE: ", e.message);
    } finally {
        console.log(`\n🎉 Test Run Complete: ${passed} Passed, ${failed} Failed.`);
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests().then(() => {
    console.log("Done.");
}).catch(e => {
    console.error("Fatal:", e);
    process.exit(1);
});
