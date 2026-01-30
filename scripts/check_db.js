
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- Checking Supabase Data ---');
  console.log(`URL: ${supabaseUrl}`);

  // Check Orders
  const { data: orders, error: ordersError } = await supabase.from('orders').select('*');
  if (ordersError) console.error('Error fetching orders:', ordersError.message);
  else console.log(`Orders count: ${orders.length}`);

  // Check Order Items
  const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*');
  if (itemsError) console.error('Error fetching order_items:', itemsError.message);
  else console.log(`Order Items count: ${orderItems.length}`);

  // Check Generated Images
  const { data: images, error: imagesError } = await supabase.from('generated_images').select('*');
  if (imagesError) console.error('Error fetching generated_images:', imagesError.message);
  else console.log(`Generated Images count: ${images.length}`);

  // Check Storage
  const { data: files, error: storageError } = await supabase.storage.from('images').list();
  if (storageError) console.error('Error fetching storage/images:', storageError.message);
  else console.log(`Storage 'images' file count: ${files.length}`);

  // Check Users (Note: Anon key often cannot list users, but let's try or infer from table data)
  console.log('\nNote: Cannot list all users with Anon key, checking unique user_ids in orders...');
  if (orders && orders.length > 0) {
     const userIds = [...new Set(orders.map(o => o.user_id))];
     console.log(`Unique User IDs in orders: ${userIds.join(', ')}`);
  }
}

checkData();
