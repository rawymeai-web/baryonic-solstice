
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
    console.log('Testing Supabase connection...')
    try {
        // 1. Check anonymous access to public tables (if any)
        const { data, error } = await supabase.from('orders').select('count', { count: 'exact', head: true })

        if (error) {
            console.log('Public access check result:', error.message)
            // This is expected to fail if RLS is on and we are anon
        } else {
            console.log('Public access working (unexpected for orders table)')
        }

        // 2. Simulate User (Need a real user token or service role to test properly, 
        // but we can check if the endpoint is reachable)
        console.log('Supabase URL reachable:', supabaseUrl)

    } catch (err) {
        console.error('Connection failed:', err)
    }
}

testConnection()
