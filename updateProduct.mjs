import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { error } = await supabase.from('products').update({ price: 18.000 }).eq('id', 'standard');
  if (error) console.error(error);
  else console.log("Standard product price updated to 18.000 KD");
}
run();
