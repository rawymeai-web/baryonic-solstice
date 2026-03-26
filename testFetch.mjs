import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('orders').select('created_at').eq('order_number', 'RWY-EJNNZZYHE').single();
  if (error) console.error(error);
  else {
    console.log("Created At:", data.created_at);
  }
}
run();
