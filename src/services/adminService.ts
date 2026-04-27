
import { supabase } from '../utils/supabaseClient';
import type { AdminOrder, AdminCustomer, OrderStatus, StoryData, ShippingDetails, ProductSize, StoryTheme, AppSettings } from '../types';
import { INITIAL_THEMES, ART_STYLE_OPTIONS } from '../constants';
import * as imageStore from './imageStore';

// --- DB Interfaces ---
// These match the Supabase table columns
interface DBOrder {
  order_number: string;
  customer_id: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  story_data: any; // JSONB
  shipping_details: any; // JSONB
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
interface DBSettings {
  id: number;
  default_method: string;
  default_spread_count: number;
  enable_debug_view: boolean;
  generation_delay: number;
  unit_production_cost: number;
  unit_ai_cost: number;
  unit_shipping_cost: number;
  target_model: string;
}

// --- Converters ---
const mapDBOrderList = (o: DBOrder): AdminOrder => ({
  orderNumber: o.order_number,
  customerName: o.customer_name,
  orderDate: o.created_at,
  status: o.status as OrderStatus,
  total: o.total,
  productionCost: o.production_cost || 0,
  aiCost: o.ai_cost || 0,
  shippingCost: o.shipping_cost || 0,
  storyData: o.story_data || {} as any, // Might be empty in list view
  shippingDetails: o.shipping_details || {} as any, // Might be empty in list view
  packageUrl: o.package_url
});

const mapDBOrderFull = (o: DBOrder): AdminOrder => ({
  orderNumber: o.order_number,
  customerName: o.customer_name,
  orderDate: o.created_at,
  status: o.status as OrderStatus,
  total: o.total,
  productionCost: o.production_cost || 0,
  aiCost: o.ai_cost || 0,
  shippingCost: o.shipping_cost || 0,
  storyData: o.story_data,
  shippingDetails: o.shipping_details,
  packageUrl: o.package_url
});

export async function updateOrderPackageUrl(orderNumber: string, packageUrl: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ package_url: packageUrl })
    .eq('order_number', orderNumber);
  if (error) throw error;
}

// --- Services ---

// 1. Settings
export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('settings').select('*').single();
  if (error || !data) {
    console.warn('Could not fetch settings, returning defaults', error);
    return {
      defaultMethod: 'method4',
      defaultSpreadCount: 8,
      enableDebugView: false,
      generationDelay: 0,
      unitProductionCost: 13.250,
      unitAiCost: 0.600,
      unitShippingCost: 1.500,
      targetModel: 'gemini-1.5-flash'
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

export async function saveSettings(s: AppSettings): Promise<void> {
  const { error } = await supabase.from('settings').upsert({
    id: 1, // Single row
    default_method: s.defaultMethod,
    default_spread_count: s.defaultSpreadCount,
    enable_debug_view: s.enableDebugView,
    generation_delay: s.generationDelay,
    unit_production_cost: s.unitProductionCost,
    unit_ai_cost: s.unitAiCost,
    unit_shipping_cost: s.unitShippingCost,
    target_model: s.targetModel
  });
  if (error) throw error;
}

// --- Connection Check (lightweight HTTP ping — no SQL needed) ---
export async function checkConnection(): Promise<{ connected: boolean; reason?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { connected: false, reason: 'Missing API Keys (.env)' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000); // 4s hard abort

  try {
    // Ping the REST root — returns 200 immediately without any SQL or RLS check
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { 'apikey': supabaseKey },
      signal: controller.signal
    });
    clearTimeout(timer);
    // 200 or 400 both mean the server responded — we're reachable
    return { connected: res.status < 500 };
  } catch (e: any) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      return { connected: false, reason: 'Network timeout — is Supabase paused?' };
    }
    return { connected: false, reason: e?.message || 'Unreachable' };
  }
}


// --- Local Storage Fallback Helpers ---
const LOCAL_ORDERS_KEY = 'rawy_local_orders';

function getLocalOrders(): AdminOrder[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveLocalOrder(order: AdminOrder) {
  let current = getLocalOrders();
  const index = current.findIndex(o => o.orderNumber === order.orderNumber);
  
  if (index !== -1) {
    current[index] = order;
  } else {
    current = [order, ...current];
  }

  try {
    window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(current));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      console.warn("Local storage full, purging old orders...");
      // Remove the last 5 oldest orders
      const trimmed = current.slice(0, Math.max(1, current.length - 5));
      try {
        window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(trimmed));
      } catch (e2) {
        console.error("Local storage still full after purge.");
      }
    }
  }
}

function updateLocalOrderStatus(orderNumber: string, status: OrderStatus) {
  const current = getLocalOrders();
  const index = current.findIndex(o => o.orderNumber === orderNumber);
  if (index !== -1) {
    current[index].status = status;
    try {
      window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(current));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        console.warn("Local storage full on status update, purging old orders...");
        const trimmed = current.slice(0, Math.max(1, current.length - 5));
        try {
          window.localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(trimmed));
        } catch (e2) {}
      }
    }
  }
}

// 2. Orders
export async function getOrders(): Promise<{ orders: AdminOrder[]; dbConnected: boolean; dbError?: string }> {
  // 1. Fetch Remote - OMIT story_data to prevent statement timeouts on older massive DB entries
  let remoteOrders: AdminOrder[] = [];
  let dbConnected = false;
  let dbError: string | undefined;

  try {
    const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase request timed out after 5s. Is the project paused?')), 5000)
    );

    const queryPromise = supabase
      .from('orders')
      .select('order_number, customer_id, customer_name, total, status, created_at, production_cost, ai_cost, shipping_cost')
      .order('created_at', { ascending: false });

    // Race the query against the timeout
    const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

    if (!error && data) {
      remoteOrders = data.map(mapDBOrderList);
      dbConnected = true;
    } else {
      dbError = error?.message || 'Supabase fetch failed';
      console.warn('Supabase fetch failed, using local orders only.', error);
    }
  } catch (err: any) {
    dbError = err.message || 'Supabase connection timed out';
    console.warn('Supabase fetch failed or timed out, using local orders only.', err);
  }

  // 2. Fetch Local
  const localOrders = getLocalOrders();

  // 3. Merge (Prefer Remote if duplicate)
  const remoteIds = new Set(remoteOrders.map(o => o.orderNumber));
  const uniqueLocal = localOrders.filter(o => !remoteIds.has(o.orderNumber));

  const orders = [...remoteOrders, ...uniqueLocal].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  return { orders, dbConnected, dbError };
}

export async function getOrderById(orderNumber: string): Promise<AdminOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (!error && data) {
    return mapDBOrderFull(data);
  }

  // Fallback to local storage if not found in DB
  const localItems = getLocalOrders();
  const localMatch = localItems.find(o => o.orderNumber === orderNumber);
  if (localMatch) return localMatch;

  return null;
}

export async function getOrderStatus(orderNumber: string): Promise<{ status: OrderStatus; error_message?: string } | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('status, error_message')
    .eq('order_number', orderNumber)
    .single();

  if (error || !data) return null;
  return data as any;
}

export async function saveOrder(orderNumber: string, storyData: StoryData, shippingDetails: ShippingDetails, total?: number): Promise<void> {
  const settings = await getSettings();
  const product = await getProductSizeById(storyData.size);
  
  const standardBase = product ? product.price : 17.000;
  const premiumAddon = storyData.useSecondCharacter ? 5.000 : 0;

  let calculatedTotal = total;
  if (calculatedTotal === undefined) {
    if ((storyData as any).planType === 'monthly') {
      calculatedTotal = 16.000;
    } else if ((storyData as any).planType === 'yearly') {
      calculatedTotal = 12.500; // Note: For single order record, we might store the cycle price
    } else {
      calculatedTotal = 18.000 + premiumAddon + 1.500;
    }
  }

  const totalPrice = calculatedTotal;

  // OPTIMIZATION: Create a "Light" version of storyData for Fallback/Storage immediately
  // We MUST remove the massive Base64 strings to prevent "Invalid String Length" crashes in JSON.stringify
  const heavyStoryData = storyData;
  const lightSpreads = ((heavyStoryData as any).spreads || []).map((p: any) => ({
    ...p,
    illustrationUrl: p.illustrationUrl?.substring(0, 50) + '...' // Truncate for safety in logs/fallback
  }));

  const lightStoryData = {
    ...heavyStoryData,
    coverImageUrl: heavyStoryData.coverImageUrl?.substring(0, 50) + '...',
    spreads: lightSpreads,
    // Remove character base64s and DNA for local storage fallback to save quota
    mainCharacter: { ...heavyStoryData.mainCharacter, imageBases64: [], images: [], imageDNA: [] },
    secondCharacter: heavyStoryData.secondCharacter ? { ...heavyStoryData.secondCharacter, imageBases64: [], images: [], imageDNA: [] } : undefined
  };

  const fallbackOrder: AdminOrder = {
    orderNumber,
    customerName: shippingDetails.name,
    orderDate: new Date().toISOString(),
    status: 'paid_confirmed',
    total: totalPrice,
    productionCost: settings.unitProductionCost,
    aiCost: settings.unitAiCost,
    shippingCost: settings.unitShippingCost,
    storyData: lightStoryData, // STORE SAFE VERSION
    shippingDetails: shippingDetails
  };

  try {
    // 1. Upload Images to Bucket
    const imageFiles: any = {
      cover: heavyStoryData.coverImageUrl && heavyStoryData.coverImageUrl.length > 500 && !heavyStoryData.coverImageUrl.startsWith('http')
        ? new File([await (await fetch(`data:image/jpeg;base64,${heavyStoryData.coverImageUrl}`)).blob()], 'cover.jpeg', { type: 'image/jpeg' }) 
        : undefined,
      spreads: await Promise.all(((heavyStoryData as any).spreads || []).map(async (p: any, i: number) => {
        if (!p.illustrationUrl || p.illustrationUrl.length < 500 || p.illustrationUrl.startsWith('http')) return undefined;
        return new File([await (await fetch(`data:image/jpeg;base64,${p.illustrationUrl}`)).blob()], `page_${i + 1}.jpeg`, { type: 'image/jpeg' });
      }))
    };

    const imageUrls = await imageStore.saveImagesForOrder(orderNumber, imageFiles);

    // 2. Prepare Final Data with URLs (No Base64)
    const finalStoryData = {
      ...lightStoryData,
      coverImageUrl: imageUrls.cover || heavyStoryData.coverImageUrl, // Replace truncated with URL
      spreads: ((heavyStoryData as any).spreads || []).map((spread: any, i: number) => {
        return {
          ...spread,
          illustrationUrl: imageUrls.spreads[i] || spread.illustrationUrl || ''
        };
      }),
      // REQUIRED FOR LEGACY PIPELINE: Do NOT strip the original user portraits (Selfies) from the Cloud Database.
      mainCharacter: { 
        ...lightStoryData.mainCharacter, 
        imageBases64: heavyStoryData.mainCharacter?.imageBases64 || [] 
      },
      secondCharacter: heavyStoryData.secondCharacter ? { 
        ...lightStoryData.secondCharacter, 
        imageBases64: heavyStoryData.secondCharacter.imageBases64 || [] 
      } : undefined
    };

    // 3. Upsert Customer
    const customerId = shippingDetails.email.toLowerCase();
    await supabase.from('customers').upsert({
      id: customerId,
      email: shippingDetails.email,
      name: shippingDetails.name,
      phone: shippingDetails.phone,
      last_order_date: new Date().toISOString(),
    }, { onConflict: 'id' });

    // 4. Upsert Order
    const { error: orderError } = await supabase.from('orders').upsert({
      order_number: orderNumber,
      customer_id: customerId,
      customer_name: shippingDetails.name,
      total: totalPrice,
      status: 'New Order',
      story_data: {
        ...finalStoryData,
        // CRITICAL: Re-merge character detail fields that might have been stripped in lightStoryData but are present in heavyStoryData
        mainCharacter: {
            ...finalStoryData.mainCharacter,
            imageDNA: (heavyStoryData.mainCharacter as any)?.imageDNA || [],
            imageBases64: (heavyStoryData.mainCharacter as any)?.imageBases64 || [],
            images: (heavyStoryData.mainCharacter as any)?.images || []
        },
        secondCharacter: heavyStoryData.secondCharacter ? {
            ...finalStoryData.secondCharacter,
            imageDNA: (heavyStoryData.secondCharacter as any)?.imageDNA || [],
            imageBases64: (heavyStoryData.secondCharacter as any)?.imageBases64 || [],
            images: (heavyStoryData.secondCharacter as any)?.images || []
        } : undefined
      },
      shipping_details: shippingDetails,
      production_cost: settings.unitProductionCost,
      ai_cost: settings.unitAiCost,
      shipping_cost: settings.unitShippingCost
    }, { onConflict: 'order_number' });

    if (orderError) throw orderError;

  } catch (error: any) {
    console.warn("Supabase Save Failed. Falling back to Local Storage.", error);
    if (error?.message) console.error("Supabase Error Message:", error.message);

    // Fallback is SAFE now because it uses lightStoryData
    saveLocalOrder(fallbackOrder);
  }
}

// NEW: Sync Local Orders to Supabase (for recovery)
export async function syncLocalOrders(): Promise<number> {
  const localOrders = getLocalOrders();
  let syncedCount = 0;

  for (const order of localOrders) {
    // Check if exists in Supabase
    const { data } = await supabase.from('orders').select('order_number').eq('order_number', order.orderNumber).single();

    if (!data) {
      // It's missing! Push it.
      // We need to reconstruct the DB payload (reverse of mapDBOrder + basic assumptions)
      // Note: We might be missing the full resolution images if they were reduced for local storage

      const settings = await getSettings(); // get costs for historical accuracy or use current

      const { error } = await supabase.from('orders').insert({
        order_number: order.orderNumber,
        customer_id: order.shippingDetails.email.toLowerCase(), // Assumption
        customer_name: order.customerName,
        total: order.total,
        status: order.status,
        created_at: order.orderDate, // Keep original date
        story_data: order.storyData,
        shipping_details: order.shippingDetails,
        production_cost: order.productionCost || settings.unitProductionCost,
        ai_cost: order.aiCost || settings.unitAiCost,
        shipping_cost: order.shippingCost || settings.unitShippingCost,
        package_url: order.packageUrl
      });

      if (!error) syncedCount++;
      else console.error(`Failed to sync order ${order.orderNumber}`, error);
    }
  }

  return syncedCount;
}

export async function updateOrderStatus(orderNumber: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase.from('orders').update({ status }).eq('order_number', orderNumber);
  if (error) {
    console.warn("Supabase update failed, trying local.");
    updateLocalOrderStatus(orderNumber, status);
  }
}

export async function dispatchJob(orderId: string, jobType: 'story' | 'illustration' | 'compilation' | 'print_handoff'): Promise<void> {
  // Simple insertion from admin client
  const { error } = await supabase.from('order_jobs').insert({
    order_id: orderId,
    job_type: jobType,
    status: 'queued',
    attempts: 0
  });
  if (error) {
    console.error(`Failed to dispatch job ${jobType} for ${orderId}`, error);
    throw new Error(`Queue dispatch failed: ${error.message}`);
  }
}

// 3. Products
const mapDBProduct = (p: DBProduct): ProductSize => {
  const defaults = {
    coverContent: {
      barcode: { fromRightCm: 2, fromTopCm: 2, widthCm: 4, heightCm: 2.5 },
      format: { fromTopCm: 2, widthCm: 10, heightCm: 2 },
      title: { fromTopCm: 2, widthCm: 10, heightCm: 3 } // Default for safety
    }
  };
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    previewImageUrl: p.preview_image_url,
    isAvailable: true,
    ...p.dimensions, // spread cover, page, margins
    // Deep merge / Safety fill
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

export async function getProductSizes(): Promise<ProductSize[]> {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return [];
  return data.map(mapDBProduct);
}
export async function getProductSizeById(id: string): Promise<ProductSize | undefined> {
  const { data } = await supabase.from('products').select('*').eq('id', id).single();
  if (!data) return undefined;
  return mapDBProduct(data);
}
export async function saveProductSize(p: ProductSize): Promise<void> {
  // Extract dimensions
  const { id, name, price, previewImageUrl, isAvailable, ...dimensions } = p;
  const { error } = await supabase.from('products').upsert({
    id,
    name,
    price,
    preview_image_url: previewImageUrl,
    dimensions
  });
  if (error) throw error;
}

// 4. Themes
const mapDBTheme = (t: DBTheme): StoryTheme => ({
  id: t.id,
  title: t.title,
  description: t.description,
  emoji: t.emoji,
  category: t.category as any,
  visualDNA: t.visual_dna,
  skeleton: t.skeleton
});

export async function getThemes(): Promise<StoryTheme[]> {
  const { data, error } = await supabase.from('themes').select('*');
  if (error || !data || data.length === 0) return INITIAL_THEMES;
  return data.map(mapDBTheme);
}

export async function saveTheme(t: StoryTheme): Promise<void> {
  const { error } = await supabase.from('themes').upsert({
    id: t.id,
    title: t.title,
    description: t.description,
    emoji: t.emoji,
    category: t.category,
    visual_dna: t.visualDNA,
    skeleton: t.skeleton
  });
  if (error) throw error;
}

// 5. Bible (Keep Local for now as per plan, or basic store)
// 5. Bible (Supabase Backed)
const BIBLE_ID = 1;
export interface SeriesBible {
  masterGuardrails: string;
  storyFlowLogic: string;
  compositionMandates: string;
}
const defaultBible: SeriesBible = {
  masterGuardrails: `STRICT MASTER PRODUCTION RULES (MANDATORY):... (same as before) ...`,
  storyFlowLogic: `THE 9-POINT NARRATIVE ARC (REQUIRED):...`,
  compositionMandates: `VISUAL COMPOSITION MANDATES:...`
};

export async function getSeriesBible(): Promise<SeriesBible> {
  const { data, error } = await supabase.from('guidebook').select('content').eq('id', BIBLE_ID).single();

  if (error || !data) {
    console.warn("Generating fresh guidebook row...");
    // Attempt init if missing
    await supabase.from('guidebook').insert({ id: BIBLE_ID, content: defaultBible });
    return defaultBible;
  }
  return data.content;
}

export async function saveSeriesBible(bible: SeriesBible): Promise<void> {
  const { error } = await supabase.from('guidebook').upsert({
    id: BIBLE_ID,
    content: bible,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
}

// 6. Prompts (Keep Local or move to Settings?)
// For now, let's assume they are handled by promptService which might use localStorage.
// If prompted, we can move them too.

export async function getCustomers(): Promise<AdminCustomer[]> {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) return [];
  return data.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    firstOrderDate: c.first_order_date || '',
    lastOrderDate: c.last_order_date || '',
    orderCount: c.order_count || 0
  }));
}

export async function getSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
        *,
        hero:heroes(*),
        customer:customers!user_id(*)
    `)
    .order('next_billing_date', { ascending: true });

  if (error) {
    console.error("Failed to fetch subscriptions:", error);
    return [];
  }
  return data;
}

export async function getQualityLogs(orderId: string, spreadIndex: number) {
  const { data, error } = await supabase
    .from('generation_quality_logs')
    .select('*')
    .eq('order_id', orderId)
    .eq('spread_index', spreadIndex)
    .order('iteration', { ascending: true });

  if (error) {
    console.error(`Failed to fetch QA logs for order ${orderId} spread ${spreadIndex}:`, error);
    return [];
  }
  return data;
}
