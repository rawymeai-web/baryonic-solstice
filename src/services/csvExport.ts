import type { AdminOrder, ProductSize, StoryTheme } from '../types';

/**
 * Escapes a single cell value for CSV formatting:
 * - Wraps in quotes if it contains commas, quotes, or newlines
 * - Replaces single double-quotes with double double-quotes ("" -> ")
 */
function escapeCsvCell(val: any): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Downloads a CSV string as a file in the browser with UTF-8 BOM for Arabic/multilingual Excel support.
 */
export function downloadCsv(filename: string, rows: string[][]): void {
    const csvContent = rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
    // Prepend UTF-8 BOM (\uFEFF) so Excel parses Arabic and UTF-8 characters automatically
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Formats a Date object or ISO string to a clean YYYY-MM-DD string for file names.
 */
function getDateStamp(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Exports Admin Orders to CSV
 */
export function exportOrdersToCsv(orders: AdminOrder[], customFilename?: string): void {
    const headers = [
        'Order Number',
        'Order Date',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Status',
        'Total',
        'Currency',
        'Story Title',
        'Story Theme',
        'Child Name',
        'Child Age',
        'Language',
        'Shipping Name',
        'Shipping Phone',
        'Shipping Address',
        'Shipping City',
        'Shipping Country',
        'Tracking Number',
        'Carrier',
        'Package / Softcopy URL'
    ];

    const rows = orders.map(o => {
        const story = o.storyData || ({} as any);
        const shipping = o.shippingDetails || ({} as any);
        return [
            o.orderNumber || '',
            o.orderDate ? new Date(o.orderDate).toLocaleString() : '',
            o.customerName || shipping.name || '',
            shipping.email || story.parentEmail || '',
            shipping.phone || '',
            o.status || '',
            typeof o.total === 'number' ? o.total.toFixed(3) : String(o.total || 0),
            'KWD',
            story.title || '',
            story.theme || '',
            story.childName || '',
            story.childAge || '',
            story.language || 'en',
            shipping.name || '',
            shipping.phone || '',
            shipping.address || '',
            shipping.city || '',
            shipping.country || '',
            shipping.trackingNumber || '',
            shipping.carrier || '',
            o.packageUrl || ''
        ];
    });

    const filename = customFilename || `Rawy_Orders_${getDateStamp()}.csv`;
    downloadCsv(filename, [headers, ...rows]);
}

/**
 * Exports Customers to CSV
 */
export function exportCustomersToCsv(customers: any[], customFilename?: string): void {
    const headers = [
        'Customer ID',
        'Full Name',
        'Email Address',
        'Phone Number',
        'First Interaction Date',
        'Last Interaction Date',
        'Total Orders (Engagement)'
    ];

    const rows = customers.map(c => [
        c.id || '',
        c.fullName || c.name || '',
        c.email || '',
        c.phone || '',
        c.firstOrderDate ? new Date(c.firstOrderDate).toLocaleDateString() : '',
        c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '',
        String(c.orderCount ?? 0)
    ]);

    const filename = customFilename || `Rawy_Customers_${getDateStamp()}.csv`;
    downloadCsv(filename, [headers, ...rows]);
}

/**
 * Exports Subscriptions to CSV
 */
export function exportSubscriptionsToCsv(subscriptions: any[], customFilename?: string): void {
    const headers = [
        'Subscription ID',
        'Customer Email',
        'Associated Order #',
        'Tier / Plan',
        'Status',
        'Start Date',
        'Valid Until / Next Billing Date'
    ];

    const rows = subscriptions.map(s => [
        s.id || '',
        s.customerEmail || s.customer?.email || '',
        s.orderNumber || s.customer?.name || '',
        s.plan || 'Standard Edition',
        s.status || '',
        s.startDate ? new Date(s.startDate).toLocaleDateString() : '',
        s.endDate || s.next_billing_date ? new Date(s.endDate || s.next_billing_date).toLocaleDateString() : 'Infinite'
    ]);

    const filename = customFilename || `Rawy_Subscriptions_${getDateStamp()}.csv`;
    downloadCsv(filename, [headers, ...rows]);
}

/**
 * Exports Product Catalog (SKUs) to CSV
 */
export function exportProductsToCsv(products: ProductSize[], customFilename?: string): void {
    const headers = [
        'SKU ID',
        'Product Name',
        'Retail Price (KWD)',
        'Width (cm)',
        'Height (cm)',
        'Page Dimensions'
    ];

    const rows = products.map(p => [
        p.id || '',
        p.name || '',
        typeof p.price === 'number' ? p.price.toFixed(3) : String(p.price || 0),
        String(p.page?.widthCm ?? ''),
        String(p.page?.heightCm ?? ''),
        `${p.page?.widthCm ?? ''} x ${p.page?.heightCm ?? ''} cm`
    ]);

    const filename = customFilename || `Rawy_Products_${getDateStamp()}.csv`;
    downloadCsv(filename, [headers, ...rows]);
}

/**
 * Exports Themes to CSV
 */
export function exportThemesToCsv(themes: StoryTheme[], customFilename?: string): void {
    const headers = [
        'Theme ID',
        'Category',
        'Title (EN)',
        'Title (AR)',
        'Emoji Icon',
        'Status'
    ];

    const rows = themes.map(t => [
        t.id || '',
        t.category || '',
        t.title?.en || '',
        t.title?.ar || '',
        t.emoji || '',
        'Active'
    ]);

    const filename = customFilename || `Rawy_Themes_${getDateStamp()}.csv`;
    downloadCsv(filename, [headers, ...rows]);
}
