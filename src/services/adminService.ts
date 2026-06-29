import { supabase } from '../utils/supabaseClient';
import type { AdminOrder, OrderStatus, StoryData, ShippingDetails, ProductSize, StoryTheme, AppSettings } from '@/types';

// --- DB Interfaces ---
interface DBOrder {
  order_number: string;
  customer_id: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  story_data: any;
  shipping_details: any;
  production_cost: number;
  ai_cost: number;
  shipping_cost: number;
  package_url?: string;
}

interface DBTheme {
  id: string;
  title: any;
  description: any;
  emoji: string;
  category: string;
  visual_dna: string;
  skeleton: any;
}

interface DBProduct {
  id: string;
  name: string;
  price: number;
  preview_image_url: string;
  dimensions: any;
}

// --- Mappers ---
const mapDBOrder = (o: DBOrder): AdminOrder => ({
  orderNumber: o.order_number,
  customerName: o.customer_name,
  orderDate: o.created_at,
  status: o.status as OrderStatus,
  total: o.total,
  productionCost: o.production_cost || 0,
  aiCost: o.ai_cost || 0,
  shippingCost: o.shipping_cost || 0,
  storyData: o.story_data || {},
  shippingDetails: o.shipping_details || {},
  packageUrl: o.package_url
});

const mapDBProduct = (p: DBProduct): ProductSize => {
  const defaults = {
    coverContent: {
      barcode: { fromRightCm: 2, fromTopCm: 2, widthCm: 4, heightCm: 2.5 },
      format: { fromTopCm: 2, widthCm: 10, heightCm: 2 },
      title: { fromTopCm: 2, widthCm: 10, heightCm: 3 }
    }
  };
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    previewImageUrl: p.preview_image_url,
    isAvailable: true,
    ...p.dimensions,
    coverContent: {
      ...defaults.coverContent,
      ...(p.dimensions?.coverContent || {}),
      title: {
        ...defaults.coverContent.title,
        ...(p.dimensions?.coverContent?.title || {})
      }
    }
  };
};

const mapDBTheme = (t: DBTheme): StoryTheme => ({
  id: t.id,
  title: t.title,
  description: t.description,
  emoji: t.emoji,
  category: t.category as any,
  visualDNA: t.visual_dna,
  skeleton: t.skeleton
});

// --- Services ---

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('settings').select('*').single();
  if (error || !data) {
    return {
      defaultMethod: 'method4',
      defaultSpreadCount: 8,
      enableDebugView: false,
      generationDelay: 0,
      unitProductionCost: 13.250,
      unitAiCost: 0.600,
      unitShippingCost: 1.500,
      targetModel: 'gemini-2.5-flash'
    };
  }
  return {
    defaultMethod: data.default_method,
    defaultSpreadCount: data.default_spread_count,
    enableDebugView: data.enable_debug_view,
    generationDelay: data.generation_delay,
    unitProductionCost: data.unit_production_cost,
    unitAiCost: data.unit_ai_cost,
    unitShippingCost: data.unit_shipping_cost,
    targetModel: data.target_model
  };
}

export async function getThemes(): Promise<StoryTheme[]> {
  const { data, error } = await supabase.from('themes').select('*');
  if (error || !data) return [];
  return data.map(mapDBTheme);
}

export async function getProductSizes(): Promise<ProductSize[]> {
  const { data, error } = await supabase.from('products').select('*');
  if (error || !data) return [];
  return data.map(mapDBProduct);
}

export async function getProductSizeById(id: string): Promise<ProductSize | undefined> {
  const { data } = await supabase.from('products').select('*').eq('id', id).single();
  if (!data) return undefined;
  return mapDBProduct(data);
}

export async function getOrders(): Promise<{ orders: AdminOrder[]; dbConnected: boolean; dbError?: string }> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/orders');
      if (!res.ok) {
        const errData = await res.json();
        return { orders: [], dbConnected: false, dbError: errData.error || 'Server error' };
      }
      const data = await res.json();
      return { 
        orders: (data.orders || []).map(mapDBOrder), 
        dbConnected: true 
      };
    } catch (e: any) {
      return { orders: [], dbConnected: false, dbError: e.message };
    }
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return { orders: [], dbConnected: false, dbError: error.message };
    return { orders: (data || []).map(mapDBOrder), dbConnected: true };
  } catch (e: any) {
    return { orders: [], dbConnected: false, dbError: e.message };
  }
}

export async function getOrderById(orderNumber: string): Promise<AdminOrder | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.order ? mapDBOrder(data.order) : null;
    } catch (e) {
      return null;
    }
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();
  if (error || !data) return null;
  return mapDBOrder(data);
}

export async function updateOrderPackageUrl(orderNumber: string, packageUrl: string): Promise<void> {
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/admin/orders/${orderNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_url: packageUrl })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update package URL');
    }
    return;
  }

  const { error } = await supabase
    .from('orders')
    .update({ package_url: packageUrl })
    .eq('order_number', orderNumber);
  if (error) throw error;
}

export async function updateOrderStatus(orderNumber: string, status: OrderStatus): Promise<void> {
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/admin/orders/${orderNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update order status');
    }
    return;
  }

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('order_number', orderNumber);
  if (error) throw error;
}

export async function saveOrder(orderNumber: string, storyData: StoryData, shippingDetails: ShippingDetails, total?: number): Promise<void> {
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/admin/orders/${orderNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyData, shippingDetails, total })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save order');
    }
    return;
  }

  const settings = await getSettings();
  const totalPrice = total || 18.000;

  // Helper to securely upload Base64 images to Bucket and insert to DB
  const uploadAndLogDNA = async (base64Array: string[] | undefined, heroLabel: string, imageType: string) => {
    if (!base64Array || !base64Array[0]) return;
    try {
      const base64Str = base64Array[0].includes('base64,') ? base64Array[0].split('base64,')[1] : base64Array[0];
      const binaryString = atob(base64Str);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });
      
      const filename = `${orderNumber}/${heroLabel.replace(' ', '_')}_${imageType.replace(' ', '_')}_${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage.from('dna-images').upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });
      
      if (!error) {
        const { data: publicData } = supabase.storage.from('dna-images').getPublicUrl(filename);
        await supabase.from('order_dna').insert({
          order_id: orderNumber,
          hero_label: heroLabel,
          image_type: imageType,
          image_url: publicData.publicUrl
        });
      }
    } catch (err) {
      console.error(`Failed to upload ${imageType} for ${heroLabel}:`, err);
    }
  };

  // Upload to new architecture
  await uploadAndLogDNA(storyData.mainCharacter?.imageBases64, 'Hero A', 'Original Photo');
  await uploadAndLogDNA(storyData.mainCharacter?.imageDNA, 'Hero A', 'Stylized DNA');
  await uploadAndLogDNA(storyData.secondCharacter?.imageBases64, 'Hero B', 'Original Photo');
  await uploadAndLogDNA(storyData.secondCharacter?.imageDNA, 'Hero B', 'Stylized DNA');

  // Stripping ALL massive base64s since they are now in bucket
  const cleanStoryData = JSON.parse(JSON.stringify(storyData));
  if (cleanStoryData.mainCharacter) {
    cleanStoryData.mainCharacter.imageBases64 = [];
    cleanStoryData.mainCharacter.imageDNA = [];
  }
  if (cleanStoryData.secondCharacter) {
    cleanStoryData.secondCharacter.imageBases64 = [];
    cleanStoryData.secondCharacter.imageDNA = [];
  }

  const email = shippingDetails?.email || `guest-${orderNumber}@rawy.com`;
  const customerId = email.toLowerCase();
  const customerName = shippingDetails?.name || 'Guest User';
  const customerPhone = shippingDetails?.phone || '';
  
  // Upsert Customer
  await supabase.from('customers').upsert({
    id: customerId,
    email: email,
    name: customerName,
    phone: customerPhone,
    last_order_date: new Date().toISOString(),
  });

  // Upsert Order
  const { error } = await supabase.from('orders').upsert({
    order_number: orderNumber,
    customer_id: customerId,
    customer_name: customerName,
    total: totalPrice,
    status: 'paid_confirmed',
    story_data: cleanStoryData,
    shipping_details: shippingDetails || {},
    production_cost: settings.unitProductionCost,
    ai_cost: settings.unitAiCost,
    shipping_cost: settings.unitShippingCost
  });

  if (error) throw error;
}

export async function getQualityLogs(orderId: string, spreadNumber: number) {
  const { data, error } = await supabase
    .from('generation_quality_logs')
    .select('*')
    .eq('order_id', orderId)
    .eq('spread_number', spreadNumber)
    .order('iteration_number', { ascending: true });

  if (error) return [];
  return data;
}

// --- DNA Records ---

export async function fetchOrderDNA(orderId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('order_dna')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[adminService] fetchOrderDNA error:', error);
    return [];
  }
  return data || [];
}

// --- Customer Records ---

export async function getCustomers(): Promise<any[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/customers');
      if (!res.ok) return [];
      const data = await res.json();
      return data.customers || [];
    } catch (e) {
      return [];
    }
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('last_order_date', { ascending: false });
  if (error) {
    console.error('[adminService] getCustomers error:', error);
    return [];
  }
  return data || [];
}

// --- Order Status Polling ---

export async function getOrderStatus(orderNumber: string): Promise<{ status: string; error_message?: string } | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('status, error_message')
    .eq('order_number', orderNumber)
    .single();
  if (error || !data) return null;
  return data as { status: string; error_message?: string };
}

// --- Series Bible (Brand Narrative Guidelines) ---

export interface SeriesBible {
  brandVoice?: string;
  characterGuidelines?: string;
  narrativeRules?: string;
  styleRules?: string;
  forbiddenContent?: string;
  [key: string]: any;
}

export async function getSeriesBible(): Promise<SeriesBible | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('series_bible')
    .single();
  if (error || !data) {
    // Return a default empty series bible
    return {
      brandVoice: '',
      characterGuidelines: '',
      narrativeRules: '',
      styleRules: '',
      forbiddenContent: ''
    };
  }
  return (data.series_bible as SeriesBible) || {
    brandVoice: '',
    characterGuidelines: '',
    narrativeRules: '',
    styleRules: '',
    forbiddenContent: ''
  };
}

export async function saveSeriesBible(bible: SeriesBible): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .update({ series_bible: bible })
    .neq('id', '');  // Update the single settings row
  if (error) throw error;
}

export async function getSubscriptions(): Promise<any[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (!res.ok) return [];
      const data = await res.json();
      return data.subscriptions || [];
    } catch (e) {
      return [];
    }
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, customers(*)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[adminService] getSubscriptions error:', error);
    return [];
  }
  return data || [];
}

export async function hardResetOrder(orderNumber: string): Promise<void> {
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/admin/orders/${orderNumber}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset order');
    }
    return;
  }

  const { error: jobErr } = await supabase.from('order_jobs').delete().eq('order_id', orderNumber);
  if (jobErr) throw jobErr;

  const { data: order } = await supabase.from('orders').select('story_data').eq('order_number', orderNumber).single();
  if (order) {
    const cleanStoryData = { ...(order.story_data as any) };
    delete cleanStoryData.pages;
    delete cleanStoryData.spreads;
    delete cleanStoryData.qa_logs;
    delete cleanStoryData.generation_snapshot;
    delete cleanStoryData.coverImageUrl;
    delete cleanStoryData.finalPrompts;
    delete cleanStoryData.spreadPlan;

    const { error: orderErr } = await supabase.from('orders').update({
      status: 'paid',
      story_data: cleanStoryData
    }).eq('order_number', orderNumber);
    if (orderErr) throw orderErr;
  }
}

// --- Product Size CRUD ---

export async function saveProductSize(productSize: Partial<ProductSize>): Promise<void> {
  const payload = {
    id: productSize.id,
    name: productSize.name,
    price: productSize.price,
    preview_image_url: productSize.previewImageUrl,
    dimensions: {
      page: (productSize as any).page,
      cover: (productSize as any).cover,
      coverContent: productSize.coverContent,
    }
  };
  const { error } = await supabase
    .from('products')
    .upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

// --- Settings CRUD ---

export async function saveSettings(settings: AppSettings): Promise<void> {
  const payload = {
    default_method: settings.defaultMethod,
    default_spread_count: settings.defaultSpreadCount,
    enable_debug_view: settings.enableDebugView,
    generation_delay: settings.generationDelay,
    unit_production_cost: settings.unitProductionCost,
    unit_ai_cost: settings.unitAiCost,
    unit_shipping_cost: settings.unitShippingCost,
    target_model: settings.targetModel,
  };
  const { error } = await supabase
    .from('settings')
    .update(payload)
    .neq('id', '');  // Update the single settings row
  if (error) throw error;
}

// --- Theme CRUD ---

export async function saveTheme(theme: Partial<StoryTheme>): Promise<void> {
  const payload = {
    id: theme.id,
    title: theme.title,
    description: theme.description,
    emoji: theme.emoji,
    category: theme.category,
    visual_dna: theme.visualDNA,
    skeleton: (theme as any).skeleton,
  };
  const { error } = await supabase
    .from('themes')
    .upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

// --- Local → Cloud Sync Utility ---

export async function syncLocalOrders(): Promise<number> {
  // This function was historically used to sync orders from localStorage to the DB.
  // In the current architecture all orders are written directly to Supabase,
  // so this is a no-op that returns 0.
  console.log('[adminService] syncLocalOrders: no local orders to sync (all orders live in Supabase).');
  return 0;
}
