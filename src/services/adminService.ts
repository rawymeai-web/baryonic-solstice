
import { supabase } from '../utils/supabaseClient';
import type { AdminOrder, AdminCustomer, OrderStatus, StoryData, ShippingDetails, ProductSize, StoryTheme, AppSettings } from '../types';
import { INITIAL_THEMES, ART_STYLE_OPTIONS } from '../constants';
import * as imageStore from './imageStore';

interface DBOrder {
    id: string;
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

const mapDBOrder = (o: DBOrder): AdminOrder => ({
    id: o.id,
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
        id: 1,
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

export async function getOrders(): Promise<AdminOrder[]> {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(mapDBOrder);
}

export async function updateOrderStatus(orderNumber: string, status: OrderStatus): Promise<void> {
    const { error } = await supabase.from('orders').update({ status }).eq('order_number', orderNumber);
    if (error) throw error;
}

export async function getProductSizes(): Promise<ProductSize[]> {
    const { data, error } = await supabase.from('products').select('*');
    if (error) return [];
    return data.map(mapDBProduct);
}

export async function getProductSizeById(id: string): Promise<ProductSize | null> {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error || !data) return null;
    return mapDBProduct(data);
}

const mapDBProduct = (p: any): ProductSize => {
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

export async function getThemes(): Promise<StoryTheme[]> {
    const { data, error } = await supabase.from('themes').select('*');
    if (error || !data || data.length === 0) return INITIAL_THEMES;
    return data.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        emoji: t.emoji,
        category: t.category as any,
        visualDNA: t.visual_dna,
        skeleton: t.skeleton
    }));
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

// ============================================================================
// TERMINAL ALPHA (PHASE 5): API ROUTE CALLERS FOR RBAC & AUDIT LOGGING
// ============================================================================

const ADMIN_ID = 'terminal_alpha_admin'; // Hardcoded for prototype

async function adminApiCall(endpoint: string, method: string = 'POST', body?: any) {
    const res = await fetch(endpoint, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-id': ADMIN_ID,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Admin API failed');
    return data;
}

export async function putOrderOnHold(orderId: string) {
    return adminApiCall(`/api/admin/orders/${orderId}/hold`);
}

export async function resumeOrder(orderId: string) {
    return adminApiCall(`/api/admin/orders/${orderId}/resume`);
}

export async function pushOrderToPrint(orderId: string) {
    return adminApiCall(`/api/admin/orders/${orderId}/push-book`);
}

export async function regeneratePreview(orderId: string) {
    return adminApiCall(`/api/admin/orders/${orderId}/regenerate-preview`);
}

export async function resendSoftcopy(orderId: string) {
    return adminApiCall(`/api/admin/orders/${orderId}/resend-softcopy`);
}

export async function regeneratePageImage(orderId: string, pageIndex: number) {
    return adminApiCall(`/api/admin/orders/${orderId}/pages/${pageIndex}/regenerate-image`);
}

export async function updatePageText(orderId: string, pageIndex: number, newText: string) {
    return adminApiCall(`/api/admin/orders/${orderId}/pages/${pageIndex}/text`, 'PATCH', { newText });
}

export async function getAuditLog(orderId: string) {
    return adminApiCall(`/api/admin/orders/${orderId}/audit-log`, 'GET');
}
