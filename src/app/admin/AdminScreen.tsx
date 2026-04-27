
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { Spinner } from '../../components/ui/Spinner';
import * as adminService from '../../services/adminService';
import * as promptService from '../../services/promptService';
import * as fileService from '../../services/fileService';
import * as imageStore from '../../services/imageStore';
import * as storageCleanup from '../../services/storageCleanupService';
import type { Language, AdminOrder, AdminCustomer, OrderStatus, ProductSize, StoryTheme, AppSettings } from '../../types';
import { OrderPreviewModal } from '../../components/admin/OrderPreviewModal';
import { ProductEditorModal } from '../../components/admin/ProductEditorModal';
import { ThemeEditorModal } from '../../components/admin/ThemeEditorModal';
import { ThemePreviewView } from '../../components/admin/ThemePreviewView';
import { StitchingScreen } from '../../components/admin/StitchingScreen';
import { LegacyProcessModal } from '../../components/admin/LegacyProcessModal';

interface AdminScreenProps {
    onExit: () => void;
    onEditOrder?: (order: AdminOrder, isLegacy?: boolean, isRestart?: boolean) => void;
    language: Language;
}

type AdminView = 'orders' | 'customers' | 'subscriptions' | 'products' | 'themes' | 'bible' | 'prompts' | 'settings' | 'themePreview' | 'stitching' | 'metadata' | 'storage';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color?: string }> = ({ title, value, icon, color = 'bg-brand-navy/5' }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 rtl:space-x-reverse">
        <div className={`${color} text-brand-navy rounded-xl p-3`}>{icon}</div>
        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p><p className="text-2xl font-black text-brand-navy leading-none mt-1">{value}</p></div>
    </div>
);
// ...
// ...


const GuidelinesView: React.FC = () => {
    const [bible, setBible] = useState<adminService.SeriesBible | null>(null);

    useEffect(() => {
        adminService.getSeriesBible().then(setBible);
    }, []);

    const handleSave = async () => {
        if (bible) {
            await adminService.saveSeriesBible(bible);
            alert('System Guidelines Updated!');
        }
    };

    if (!bible) return <Spinner />;

    return (
        <div className="space-y-6 animate-enter-forward">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight">Production Guidelines</h2>
                    <p className="text-sm text-gray-500">Master logic injected into Junior Writers, Art Directors, and Illustrators.</p>
                </div>
                <Button onClick={handleSave} className="shadow-lg shadow-brand-orange/20">Save Guidelines</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-orange uppercase tracking-widest px-1">1. Master Production Rules</label>
                    <textarea
                        value={bible.masterGuardrails}
                        onChange={e => setBible({ ...bible, masterGuardrails: e.target.value })}
                        className="w-full h-[550px] p-5 font-mono text-[11px] bg-white border border-gray-200 rounded-2xl shadow-inner leading-relaxed focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-teal uppercase tracking-widest px-1">2. Story Flow Logic</label>
                    <textarea
                        value={bible.storyFlowLogic}
                        onChange={e => setBible({ ...bible, storyFlowLogic: e.target.value })}
                        className="w-full h-[550px] p-5 font-mono text-[11px] bg-white border border-gray-200 rounded-2xl shadow-inner leading-relaxed focus:ring-2 focus:ring-brand-teal/20 outline-none transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-navy uppercase tracking-widest px-1">3. Visual Composition</label>
                    <textarea
                        value={bible.compositionMandates}
                        onChange={e => setBible({ ...bible, compositionMandates: e.target.value })}
                        className="w-full h-[550px] p-5 font-mono text-[11px] bg-white border border-gray-200 rounded-2xl shadow-inner leading-relaxed focus:ring-2 focus:ring-brand-navy/20 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="bg-brand-navy text-white p-6 rounded-3xl flex items-center gap-6 border-4 border-brand-orange/20">
                <div className="text-4xl">💡</div>
                <div className="text-sm font-medium leading-relaxed opacity-90">
                    <p className="font-black text-brand-orange uppercase text-xs mb-1">Expert Note:</p>
                    These guidelines define the "Soul" of Rawy. Use them to enforce cultural nuances, prevent AI hallucinations like rainbows, and ensure every story has a meaningful failure and growth arc.
                </div>
            </div>
        </div>
    );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; isActive: boolean; }> = ({ icon, label, onClick, isActive }) => (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 rtl:space-x-reverse px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30 translate-x-1' : 'text-gray-500 hover:bg-gray-50 hover:text-brand-navy'}`}>
        <div className={isActive ? 'text-white' : 'text-brand-navy/40'}>{icon}</div>
        <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-white' : ''}`}>{label}</span>
    </button>
);

const AdminDashboard: React.FC<AdminScreenProps> = ({ onExit, onEditOrder, language }) => {
    const [view, setView] = useState<AdminView>('orders');
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [connection, setConnection] = useState<{ connected: boolean; reason?: string } | null>(null);

    const refreshOrders = React.useCallback(async () => {
        const result = await adminService.getOrders();
        setOrders(result.orders);
        // Derive DB connection status from whether the real DB returned data
        setConnection({ connected: result.dbConnected, reason: result.dbError });
    }, []);

    useEffect(() => {
        // Initial Fetch — connection status derived from getOrders, no extra ping needed
        refreshOrders();
        adminService.getSettings().then(setSettings);
    }, []);

    // Auto-retry every 15s while DB is unhealthy (e.g. Supabase restoring after pause)
    useEffect(() => {
        if (connection === null || connection.connected) return; // Only retry when disconnected
        const timer = setTimeout(() => {
            setConnection(null); // Show "Checking..." while retrying
            refreshOrders();
        }, 15000);
        return () => clearTimeout(timer);
    }, [connection, refreshOrders]);

    const stats = React.useMemo(() => {
        const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
        return { totalRevenue, orderCount: orders.length };
    }, [orders]);

    const renderView = () => {
        switch (view) {
            case 'orders': return <OrdersView orders={orders} language={language} refreshOrders={refreshOrders} onEditOrder={onEditOrder} />;
            case 'customers': return <CustomersView />;
            case 'subscriptions': return <SubscriptionsView />;
            case 'bible': return <GuidelinesView />;
            case 'themes': return <ThemesView language={language} />;
            case 'products': return <ProductsView />;
            case 'prompts': return <PromptsView />;
            case 'settings': return <SettingsView />;
            case 'themePreview': return <ThemePreviewView language={language} />;
            case 'stitching': return <StitchingScreen onExit={() => setView('orders')} language={language} />;
            case 'metadata': return <MetadataView />;
            case 'storage': return <StorageCleanupView />;
            default: return <OrdersView orders={orders} language={language} refreshOrders={refreshOrders} onEditOrder={onEditOrder} />;
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
            {/* Extended Sidebar with all Tabs */}
            <aside className="w-full md:w-72 bg-white p-6 space-y-8 border-r border-gray-100 flex flex-col shrink-0 z-20">
                <Logo />
                <nav className="space-y-1.5 flex-grow overflow-y-auto no-scrollbar">
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} label="Performance" onClick={() => setView('orders')} isActive={view === 'orders'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>} label="Customers" onClick={() => setView('customers')} isActive={view === 'customers'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>} label="Subscriptions" onClick={() => setView('subscriptions')} isActive={view === 'subscriptions'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 6.253v11.494m-9-5.747h18" /></svg>} label="Guidelines" onClick={() => setView('bible')} isActive={view === 'bible'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} label="Themes" onClick={() => setView('themes')} isActive={view === 'themes'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16m-7 6h7" /></svg>} label="Products" onClick={() => setView('products')} isActive={view === 'products'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14 10h4.757a2 2 0 110 4H14M4 10h4.757a2 2 0 110 4H4M9 5h6v14H9z" /></svg>} label="Visual Lab" onClick={() => setView('themePreview')} isActive={view === 'themePreview'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} label="Tech Prompts" onClick={() => setView('prompts')} isActive={view === 'prompts'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>} label="Stitching" onClick={() => setView('stitching')} isActive={view === 'stitching'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>} label="Metadata" onClick={() => setView('metadata')} isActive={view === 'metadata'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>} label="Storage Cleanup" onClick={() => setView('storage')} isActive={view === 'storage'} />
                    <NavItem icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} label="Config" onClick={() => setView('settings')} isActive={view === 'settings'} />
                </nav>
                <div className="pt-4 border-t">
                    <Button onClick={onExit} variant="outline" className="w-full !px-2 !py-2 text-[10px] uppercase font-black">Exit Terminal</Button>
                </div>
            </aside>

            <main className="flex-1 p-6 md:p-10 space-y-10 overflow-y-auto max-h-screen no-scrollbar bg-[#fcfcfc]">
                {/* Header */}
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-brand-navy uppercase tracking-tight">Command Center</h1>
                        <p className="text-sm text-gray-400 font-medium">System Overview & Controls</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Manual Trigger */}
                        <Button
                            onClick={async () => {
                                try {
                                    // Pinging baryonic-solstice chron
                                    await fetch('http://localhost:3000/api/cron');
                                    alert('Master Scheduler Awakened. Check backend terminal for processing logs.');
                                } catch (e) {
                                    alert('Failed to wake scheduler. Make sure backend is running on :3000');
                                }
                            }}
                            variant="primary"
                            className="!py-2 !px-4 text-[11px] font-black uppercase tracking-widest shadow-md shadow-brand-orange/20"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Wake Master Scheduler
                            </span>
                        </Button>

                        {/* DB Status Badge */}
                        <div className={`px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${connection === null ? 'bg-gray-100 text-gray-400' : connection.connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            <div className={`w-2 h-2 rounded-full shrink-0 ${connection === null ? 'bg-gray-300 animate-pulse' : connection.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                            <span className="max-w-[160px] truncate" title={connection?.reason}>
                                {connection === null ? 'Checking DB...' : connection.connected ? 'DB Connected' : (
                                    connection.reason?.includes('fetch') ? 'DB Offline — Restoring...' :
                                    connection.reason?.includes('timeout') ? 'DB Timeout — Waking up...' :
                                    `DB Error: ${connection.reason || 'Unknown'}`
                                )}
                            </span>
                            {connection !== null && !connection.connected && (
                                <button
                                    onClick={() => { setConnection(null); refreshOrders(); }}
                                    className="ml-1 text-red-400 hover:text-red-600 transition-colors shrink-0"
                                    title="Retry connection"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <StatCard title="Global Revenue" value={`${stats.totalRevenue.toFixed(3)} ${t('د.ك', 'KWD')}`} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0-2.08.402-2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="bg-brand-orange/10" />
                    <StatCard title="Books Printed" value={stats.orderCount} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6.253v11.494m-9-5.747h18" /></svg>} color="bg-brand-teal/10" />
                    <StatCard title="Active Systems" value={settings?.targetModel?.replace('gemini-', '').replace('-preview', '').replace('-exp', '') || '3 Pro'} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} color="bg-purple-100" />
                </div>
                {renderView()}
            </main>
        </div>
    );
};

const AdminScreen: React.FC<AdminScreenProps> = ({ onExit, onEditOrder, language }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (password === 'admin') setIsAuthenticated(true); else alert('Incorrect password'); };

    if (!isAuthenticated) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-brand-navy p-4">
            <div className="p-10 bg-white rounded-[3rem] shadow-2xl text-center w-full max-w-sm space-y-6">
                <Logo />
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tighter">Terminal Alpha</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Biometric Access Required</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-orange outline-none transition-all text-center font-black tracking-[0.5em]" placeholder="••••" />
                    <Button type="submit" className="w-full !py-4 shadow-xl shadow-brand-orange/20">Initiate Sequence</Button>
                </form>
            </div>
        </div>
    );
    return <AdminDashboard onExit={onExit} onEditOrder={onEditOrder} language={language} />;
};

const OrdersView: React.FC<{ orders: AdminOrder[], language: Language, refreshOrders: () => void, onEditOrder?: (order: AdminOrder, isLegacy?: boolean, isRestart?: boolean) => void }> = ({ orders, language, refreshOrders, onEditOrder }) => {
    const [allOrders, setAllOrders] = useState<AdminOrder[]>(orders);
    const [previewingOrder, setPreviewingOrder] = useState<AdminOrder | null>(null);
    const [editingOrder, setEditingOrder] = useState<AdminOrder | null>(null);
    const [editIsLegacy, setEditIsLegacy] = useState(false);
    const [editIsRestart, setEditIsRestart] = useState(false);
    const [activeTab, setActiveTab] = useState<'confirmed' | 'drafts'>('confirmed');
    const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState<string | null>(null);

    useEffect(() => {
        // Ensure sorted by date descending globally
        const sorted = [...orders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
        setAllOrders(sorted);
    }, [orders]);

    const handleStatusChange = async (orderNumber: string, status: OrderStatus) => {
        await adminService.updateOrderStatus(orderNumber, status);
        refreshOrders();
    };

    const handleDownloadZip = async (order: AdminOrder) => {
        setIsExporting(order.orderNumber);
        try {
            // Fetch full order data because list view omits story_data to save bandwidth
            const fullOrder = await adminService.getOrderById(order.orderNumber);
            if (!fullOrder) throw new Error("Could not fetch full order data.");

            // FIX: Use the Order's Language if available, otherwise fallback to Admin UI language
            const targetLanguage = fullOrder.storyData.language || language;
            const zipBlob = await fileService.generatePrintPackage(fullOrder.storyData as any, fullOrder.shippingDetails, targetLanguage, fullOrder.orderNumber);

            // Trigger Download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `Order_${fullOrder.orderNumber}_RECOVERED.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            alert('Extraction failed. See console.');
            console.error(e);
        } finally {
            setIsExporting(null);
        }
    };

    const handleInspect = async (order: AdminOrder) => {
        try {
            setLoadingOrderId(order.orderNumber);
            setLoadingAction('inspect');
            const full = await adminService.getOrderById(order.orderNumber);
            if (full) setPreviewingOrder(full);
            else alert("Could not fetch full order details.");
        } finally {
            setLoadingOrderId(null);
            setLoadingAction(null);
        }
    }

    const handleEdit = async (order: AdminOrder, isLegacy: boolean = false, isRestart: boolean = false) => {
        console.log("AdminScreen: handleEdit called", { orderNumber: order.orderNumber, isLegacy, isRestart });
        try {
            setLoadingOrderId(order.orderNumber);
            setLoadingAction('edit');
            const fullOrder = await adminService.getOrderById(order.orderNumber);
            if (fullOrder && fullOrder.storyData) {
                console.log("AdminScreen: Order fetched, calling onEditOrder", { isLegacy, isRestart });
                if (onEditOrder) {
                    onEditOrder(fullOrder, isLegacy, isRestart);
                } else {
                    // Backend mode: open LegacyProcessModal inline
                    setEditIsLegacy(isLegacy);
                    setEditIsRestart(isRestart);
                    setEditingOrder(fullOrder);
                }
            } else {
                console.warn("AdminScreen: Order or storyData missing", { fullOrder });
                alert("Could not load order data.");
            }
        } catch (error) {
            console.error("Error fetching order:", error);
            alert("Failed to load order details.");
        } finally {
            setLoadingOrderId(null);
            setLoadingAction(null);
        }
    };

    const handleCreateTestOrder = async () => {
        const confirm = window.confirm("Create a fake test order for debugging?");
        if (!confirm) return;

        const dummyId = `RWY-TEST-${Math.floor(Math.random() * 10000)}`;
        const dummyShipping = { name: "Debug User", email: "debug@rawy.com", phone: "12345678", address: "123 Test St", city: "Kuwait City" };
        // Minimal valid story data structure
        const dummyStory: any = {
            childName: "Test Child", childAge: "5", title: "The Test Adventure", theme: "Space",
            size: "A4", coverImageUrl: "", spreads: [], mainCharacter: { description: "Test" }
        };

        try {
            await adminService.saveOrder(dummyId, dummyStory, dummyShipping, 18.500);
            alert(`Test Order ${dummyId} created! Refreshing list...`);
            refreshOrders();
        } catch (e) {
            alert("Failed to create test order. Check console.");
            console.error(e);
        }
    };

    const displayOrders = allOrders.filter(o =>
        activeTab === 'confirmed' ? o.status !== 'Draft Intent' : o.status === 'Draft Intent'
    );

    return (
        <div className="space-y-4 animate-enter-forward">
            {previewingOrder && <OrderPreviewModal order={previewingOrder} onClose={() => setPreviewingOrder(null)} language={language} />}
            {editingOrder && (
                <LegacyProcessModal
                    order={editingOrder}
                    language={language}
                    onSuccess={() => { setEditingOrder(null); refreshOrders(); }}
                    onClose={() => { setEditingOrder(null); refreshOrders(); }}
                />
            )}
            
            <div className="flex flex-col sm:flex-row justify-between items-center px-2 gap-4">
                <div className="flex overflow-x-auto w-full sm:w-auto bg-gray-100 p-1 rounded-xl no-scrollbar">
                    <button onClick={() => setActiveTab('confirmed')} className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'confirmed' ? 'bg-white shadow-sm text-brand-navy' : 'text-gray-500 hover:text-gray-700'}`}>Confirmed Orders</button>
                    <button onClick={() => setActiveTab('drafts')} className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'drafts' ? 'bg-white shadow-sm text-brand-navy' : 'text-gray-500 hover:text-gray-700'}`}>Incomplete Drafts</button>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-end w-full sm:w-auto gap-2">
                    <Button onClick={async () => {
                        if (confirm("Sync all local orders to DB?")) {
                            const count = await adminService.syncLocalOrders();
                            alert(`Synced ${count} orders to Cloud.`);
                            refreshOrders();
                        }
                    }} variant="outline" className="!px-4 !py-2 text-[10px] font-black uppercase border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white">
                        Cloud Sync
                    </Button>
                    <Button onClick={handleCreateTestOrder} variant="secondary" className="!px-4 !py-2 text-[10px] font-black uppercase bg-gray-200 text-gray-600 hover:bg-gray-300">
                        + Generate Debug Order
                    </Button>
                </div>
            </div>

            <div className="sm:hidden text-[10px] text-brand-orange font-black mb-2 flex items-center justify-end px-2 uppercase tracking-widest animate-pulse">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                Swipe Table Left for Editor & Actions
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-x-auto pb-4">
                <table className="w-full text-xs text-left text-gray-500 min-w-[900px]">
                    <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b">
                        <tr><th className="px-6 py-4">Order Identity</th><th className="px-6 py-4">Customer</th><th className="px-6 py-4">Revenue</th><th className="px-6 py-4">Pipeline Status</th><th className="px-6 py-4 text-center">Protocol</th></tr>
                    </thead>
                    <tbody>
                        {displayOrders.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">No orders found in this view.</td></tr>
                        )}
                        {displayOrders.map(order => (
                            <tr key={order.orderNumber} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-5 align-top">
                                    <div className="font-black text-brand-navy">{order.orderNumber}</div>
                                    <div className="text-[9px] text-gray-400 mt-0.5">{new Date(order.orderDate).toLocaleString()}</div>
                                </td>
                                <td className="px-6 py-5 font-medium align-top">{order.customerName}</td>
                                <td className="px-6 py-5 font-mono font-bold text-brand-teal align-top">{order.total.toFixed(3)}</td>
                                <td className="px-6 py-5 align-top">
                                    <select value={order.status} onChange={(e) => handleStatusChange(order.orderNumber, e.target.value as OrderStatus)} className="p-2 w-full rounded-xl bg-white border border-gray-200 text-[10px] font-bold outline-none focus:ring-2 focus:ring-brand-orange/20">
                                        <option>Draft Intent</option><option>New Order</option><option>Processing</option><option>Shipping</option><option>Completed</option>
                                    </select>
                                </td>
                                <td className="px-6 py-5 align-top">
                                    <div className="flex flex-wrap justify-center gap-2 max-w-[350px] mx-auto">
                                        <Button variant="outline" className="!px-2 !py-1 text-[9px] font-black uppercase flex-1 whitespace-nowrap min-w-[100px]" onClick={() => handleInspect(order)} disabled={loadingOrderId === order.orderNumber}>
                                            {loadingOrderId === order.orderNumber && loadingAction === 'inspect' ? 'Loading...' : 'Inspect'}
                                        </Button>
                                        <Button variant="outline" className="!px-2 !py-1 text-[9px] font-black uppercase border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white flex-1 whitespace-nowrap min-w-[100px]" onClick={() => handleEdit(order)} disabled={loadingOrderId === order.orderNumber}>
                                            {loadingOrderId === order.orderNumber && loadingAction === 'edit' ? 'Loading...' : 'Open Editor'}
                                        </Button>
                                        <Button variant="secondary" className="!px-2 !py-1 text-[9px] font-black uppercase text-brand-teal hover:bg-brand-teal hover:text-white border-brand-teal flex-1 whitespace-nowrap min-w-[100px]" onClick={() => handleEdit(order, true, false)} disabled={loadingOrderId === order.orderNumber}>
                                            Resume Pipeline
                                        </Button>
                                        <Button variant="outline" className="text-pink-500 border-pink-500 hover:bg-pink-50 !px-2 !py-1 text-[9px] font-black uppercase flex-1 whitespace-nowrap min-w-[100px]" onClick={() => {
                                            if (window.confirm(`DANGER: Restart ALL Pipeline phases for ${order.orderNumber}? DNA, Story, and Artwork will be permanently overwritten.`)) {
                                                handleEdit(order, true, true);
                                            }
                                        }} disabled={loadingOrderId === order.orderNumber}>
                                            Restart Pipeline
                                        </Button>
                                        <Button variant="secondary" className="!px-2 !py-1 text-[9px] font-black uppercase flex-1 whitespace-nowrap min-w-[100px]" onClick={() => handleDownloadZip(order)} disabled={isExporting === order.orderNumber || loadingOrderId === order.orderNumber}>
                                            {isExporting === order.orderNumber ? 'Extracting...' : 'Export ZIP'}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const ThemesView: React.FC<{ language: Language }> = ({ language }) => {
    const [themes, setThemes] = useState<StoryTheme[]>([]);
    const [editingTheme, setEditingTheme] = useState<StoryTheme | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => { adminService.getThemes().then(setThemes); }, []);

    const handleSave = async (theme: StoryTheme) => {
        await adminService.saveTheme(theme);
        adminService.getThemes().then(setThemes);
        setIsModalOpen(false);
    };
    return (
        <div className="space-y-4 animate-enter-forward">
            <div className="flex justify-between items-center px-2"><div><h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight">Story Themes</h2></div><Button onClick={() => { setEditingTheme(null); setIsModalOpen(true); }} className="shadow-lg shadow-brand-orange/20">Construct New Theme</Button></div>
            {isModalOpen && <ThemeEditorModal theme={editingTheme} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-xs text-left text-gray-500">
                    <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest"><tr><th className="px-6 py-4">Descriptor</th><th className="px-6 py-4">Classification</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-center">Actions</th></tr></thead>
                    <tbody>
                        {themes.map(t => (
                            <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="px-6 py-5 font-bold text-brand-navy"><span className="text-xl mr-3">{t.emoji}</span> {t.title.en}</td>
                                <td className="px-6 py-5 font-medium uppercase tracking-tighter text-brand-orange">{t.category}</td>
                                <td className="px-6 py-5"><span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase">Live</span></td>
                                <td className="px-6 py-5 flex justify-center gap-2"><Button variant="outline" className="!px-4 !py-1.5 text-[9px] font-black uppercase" onClick={() => { setEditingTheme(t); setIsModalOpen(true); }}>Modify</Button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ProductsView: React.FC = () => {
    const [products, setProducts] = useState<ProductSize[]>([]);
    const [editingProduct, setEditingProduct] = useState<ProductSize | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => { adminService.getProductSizes().then(setProducts); }, []);

    const handleSave = async (p: ProductSize) => {
        await adminService.saveProductSize(p);
        adminService.getProductSizes().then(setProducts);
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-4 animate-enter-forward">
            <div className="flex justify-between items-center px-2"><div><h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight">Product Catalog</h2></div><Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="shadow-lg shadow-brand-orange/20">New SKU</Button></div>
            {isModalOpen && <ProductEditorModal product={editingProduct} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-xs text-left text-gray-500">
                    <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest"><tr><th className="px-6 py-4">SKU Name</th><th className="px-6 py-4">Retail Price</th><th className="px-6 py-4">Dimensions</th><th className="px-6 py-4 text-center">Actions</th></tr></thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="px-6 py-5 font-black text-brand-navy">{p.name}</td>
                                <td className="px-6 py-5 font-mono font-bold text-brand-teal">{p.price.toFixed(3)}</td>
                                <td className="px-6 py-5 text-gray-400 font-medium">{p.page.widthCm} x {p.page.heightCm} cm</td>
                                <td className="px-6 py-5 flex justify-center gap-2"><Button variant="outline" className="!px-4 !py-1.5 text-[9px] font-black uppercase" onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}>Edit Spec</Button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PromptsView: React.FC = () => {
    const [prompts, setPrompts] = useState<promptService.PromptTemplates | null>(null);

    useEffect(() => {
        promptService.fetchPrompts().then(setPrompts);
    }, []);

    const handleSave = async () => {
        if (prompts) {
            await promptService.savePrompts(prompts);
            alert('Super Prompts Deployed!');
        }
    };

    if (!prompts) return <Spinner />;

    return (
        <div className="space-y-6 animate-enter-forward">
            <div className="flex justify-between items-center px-2"><div><h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight">Super Prompt Terminal</h2></div><Button onClick={handleSave} className="shadow-lg shadow-brand-orange/20">Deploy Logic</Button></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-navy uppercase tracking-widest px-1">Cover Prompt Architecture</label>
                    <textarea value={prompts.method4CoverPrompt.template} onChange={e => setPrompts({ ...prompts, method4CoverPrompt: { ...prompts.method4CoverPrompt, template: e.target.value } })} className="w-full h-96 p-5 border-2 border-gray-100 rounded-3xl font-mono text-[11px] leading-relaxed focus:border-brand-orange outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-navy uppercase tracking-widest px-1">Spread Prompt Architecture</label>
                    <textarea value={prompts.method4SpreadPrompt.template} onChange={e => setPrompts({ ...prompts, method4SpreadPrompt: { ...prompts.method4SpreadPrompt, template: e.target.value } })} className="w-full h-96 p-5 border-2 border-gray-100 rounded-3xl font-mono text-[11px] leading-relaxed focus:border-brand-orange outline-none transition-all shadow-inner" />
                </div>
            </div>
            <div className="p-5 bg-gray-900 rounded-2xl font-mono text-[10px] text-green-400">
                // Variables available: {'{summary}'}, {'{main_content_side}'}, {'{style_prompt}'}
            </div>
        </div>
    );
};

const SettingsView: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings | null>(null);

    useEffect(() => {
        adminService.getSettings().then(setSettings);
    }, []);

    const handleSave = async () => {
        if (settings) {
            await adminService.saveSettings(settings);
            alert('Global Configuration Updated!');
        }
    };

    if (!settings) return <Spinner />;

    return (
        <div className="animate-enter-forward space-y-8">
            <div>
                <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight">System Engine Config</h2>
                <p className="text-sm text-gray-500 font-medium">Fine-tune the behavior and financials of the Rawy platform.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Generation Engine Card */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-brand-orange/10 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange to-brand-coral"></div>
                    <div className="flex items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-orange/10 rounded-xl text-brand-orange">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h3 className="text-sm font-black text-brand-orange uppercase tracking-widest">Generation Engine</h3>
                        </div>
                        {/* Debug Toggle */}
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Debug Mode</label>
                            <button
                                onClick={() => setSettings({ ...settings, enableDebugView: !settings.enableDebugView })}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.enableDebugView ? 'bg-brand-orange' : 'bg-gray-200'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.enableDebugView ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Model Architecture</label>
                            <select
                                value={settings.targetModel || 'gemini-3-pro-preview'}
                                onChange={e => setSettings({ ...settings, targetModel: e.target.value })}
                                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-brand-orange transition-all font-black text-brand-navy"
                            >
                                <option value="gemini-3-pro-preview">Gemini 3 Pro (Preview)</option>
                                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (High Speed)</option>
                                <option value="gemini-1.5-pro-002">Gemini 1.5 Pro (Legacy Stable)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Rate Limit Delay (ms)</label>
                            <input type="number" value={settings.generationDelay} onChange={e => setSettings({ ...settings, generationDelay: parseInt(e.target.value) })} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-brand-orange transition-all font-black text-brand-navy" />
                            <p className="text-[10px] text-gray-400 italic">Time between parallel API calls. Lower = faster but riskier (429 errors).</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Default Volume (Spreads)</label>
                            <input type="number" value={settings.defaultSpreadCount} onChange={e => setSettings({ ...settings, defaultSpreadCount: parseInt(e.target.value) })} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-brand-orange transition-all font-black text-brand-navy" />
                            <p className="text-[10px] text-gray-400 italic">Default book length in 2-page spreads. 8 spreads = 16 pages.</p>
                        </div>
                    </div>
                </div>

                {/* Financial Metrics Card */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-green-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-50 rounded-xl text-green-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-sm font-black text-green-600 uppercase tracking-widest">Financial Metrics (KWD)</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Production Cost</label>
                            <input type="number" step="0.001" value={settings.unitProductionCost} onChange={e => setSettings({ ...settings, unitProductionCost: parseFloat(e.target.value) })} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-green-500 transition-all font-black text-brand-navy" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Token Cost</label>
                            <input type="number" step="0.001" value={settings.unitAiCost} onChange={e => setSettings({ ...settings, unitAiCost: parseFloat(e.target.value) })} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-green-500 transition-all font-black text-brand-navy" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Shipping Cost</label>
                        <input type="number" step="0.001" value={settings.unitShippingCost} onChange={e => setSettings({ ...settings, unitShippingCost: parseFloat(e.target.value) })} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-green-500 transition-all font-black text-brand-navy" />
                        <p className="text-[10px] text-gray-400 italic">Used for internal ROI calculations. Retail price is managed in the Products tab.</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-4">
                <Button onClick={handleSave} className="shadow-xl shadow-brand-orange/30 !px-12 !py-4 text-lg rounded-2xl">Save Platform Configuration</Button>
            </div>
        </div>
    );
};

// DEBUGGER COMPONENT
const MetadataView: React.FC = () => {
    const canvasRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!canvasRef.current) return;

        // Clear previous
        canvasRef.current.innerHTML = '';

        // CREATE STRIP using the actual function
        // We simulate a high-res environment by scaling it down with CSS for viewing
        const strip = fileService.createMetadataStripElement('RWY-DEBUG-1234', 1, 300, 5000); // Actual Dimensions from fileService.ts

        // CSS transform to fit in screen
        strip.style.transformOrigin = 'top left';
        strip.style.transform = 'scale(0.1)'; // Scale down to see it
        strip.style.marginBottom = '-4400px'; // Compensate for scale layout

        canvasRef.current.appendChild(strip);

    }, []);

    return (
        <div className="space-y-6 animate-enter-forward">
            <div><h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight">Metadata Inspector</h2></div>
            <div className="flex gap-10">
                <div className="w-[350px] bg-gray-200 p-4 rounded-xl overflow-hidden border border-gray-300">
                    <p className="text-xs font-bold mb-2 text-gray-500">Rendered Strip (Scaled 0.1x)</p>
                    <div ref={canvasRef} className="bg-white shadow-lg origin-top-left"></div>
                </div>
                <div className="flex-1 space-y-4">
                    <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-xs font-mono">
                        <p className="font-bold">Specs:</p>
                        <p>DPI Width: 300px</p>
                        <p>DPI Height: 5000px</p>
                        <p>CSS Width: ~12mm</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Add to AdminView Type
// Check line 22 for AdminView type definition update, or casting

// -----------------------------------------------------------------
// Storage Cleanup View
// -----------------------------------------------------------------
const StorageCleanupView: React.FC = () => {
    // ── Smart cleanup (status-based) ──
    const [phase, setPhase] = useState<'idle' | 'scanning' | 'preview' | 'running' | 'done'>('idle');
    const [targets, setTargets] = useState<storageCleanup.CleanupTarget[]>([]);
    const [dryRun, setDryRun] = useState<{ orderNumber: string; willDelete: string[]; willKeep: string[] }[]>([]);
    const [summary, setSummary] = useState<storageCleanup.CleanupSummary | null>(null);
    const [progress, setProgress] = useState<{ current: number; total: number; order: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // ── Date Purge ──
    const [purgeDate, setPurgeDate] = useState('2026-03-26');
    const [purgePhase, setPurgePhase] = useState<'idle' | 'scanning' | 'preview' | 'confirm' | 'running' | 'done'>('idle');
    const [purgeScan, setPurgeScan] = useState<storageCleanup.DatePurgeScanResult | null>(null);
    const [purgeConfirmText, setPurgeConfirmText] = useState('');
    const [purgeProgress, setPurgeProgress] = useState<storageCleanup.DatePurgeProgress | null>(null);
    const [purgeSummary, setPurgeSummary] = useState<storageCleanup.DatePurgeSummary | null>(null);
    const [purgeError, setPurgeError] = useState<string | null>(null);

    const handleScan = async () => {
        setPhase('scanning'); setError(null);
        try {
            const found = await storageCleanup.scanForCleanup();
            setTargets(found);
            if (found.length === 0) { setPhase('done'); setSummary({ targets: [], results: [], totalDeleted: 0, totalSkipped: 0, totalErrors: 0 }); }
            else { const preview = await storageCleanup.dryRunCleanup(found); setDryRun(preview); setPhase('preview'); }
        } catch (e: any) { setError(e.message); setPhase('idle'); }
    };

    const handleExecute = async () => {
        if (!window.confirm(`This will permanently delete images for ${targets.length} orders. DNA/character reference files will be kept. Proceed?`)) return;
        setPhase('running'); setProgress({ current: 0, total: targets.length, order: '' });
        try {
            const result = await storageCleanup.executeCleanup(targets, (current, total, order) => setProgress({ current, total, order }));
            setSummary(result); setPhase('done');
        } catch (e: any) { setError(e.message); setPhase('preview'); }
    };

    const handlePurgeScan = async () => {
        setPurgePhase('scanning'); setPurgeError(null); setPurgeScan(null); setPurgeConfirmText('');
        try {
            const cutoff = new Date(purgeDate + 'T00:00:00');
            const result = await storageCleanup.scanDatePurge(cutoff);
            setPurgeScan(result);
            setPurgePhase(result.orderCount === 0 ? 'done' : 'preview');
            if (result.orderCount === 0) setPurgeSummary({ deletedImageFiles: 0, deletedOrderRows: 0, errors: [] });
        } catch (e: any) { setPurgeError(e.message); setPurgePhase('idle'); }
    };

    const handlePurgeExecute = async () => {
        if (!purgeScan) return;
        setPurgePhase('running');
        try {
            const result = await storageCleanup.executeDatePurge(purgeScan, (p) => setPurgeProgress(p));
            setPurgeSummary(result); setPurgePhase('done');
        } catch (e: any) { setPurgeError(e.message); setPurgePhase('preview'); }
    };

    const cancelledTargets = targets.filter(t => t.reason === 'cancelled_order');
    const oldCompletedTargets = targets.filter(t => t.reason === 'completed_old');
    const totalWillDelete = dryRun.reduce((sum, r) => sum + r.willDelete.length, 0);
    const totalWillKeep = dryRun.reduce((sum, r) => sum + r.willKeep.length, 0);

    // The user must type the date string to confirm (e.g. "26 Mar 2026")
    const purgeConfirmTarget = purgeScan?.cutoffLabel ?? '';
    const purgeConfirmReady = purgeConfirmText.trim() === purgeConfirmTarget;

    return (
        <div className="space-y-10 animate-enter-forward">

            {/* ═══════════════════════════════════════════════
                PANEL A — DATE PURGE  (full delete)
            ═══════════════════════════════════════════════ */}
            <div className="bg-white rounded-[2.5rem] border-2 border-red-100 shadow-sm overflow-hidden">
                {/* Panel Header */}
                <div className="bg-gradient-to-r from-red-500 to-rose-600 px-8 py-5 flex items-center gap-4">
                    <div className="text-3xl">🗑️</div>
                    <div>
                        <p className="text-white font-black text-lg uppercase tracking-wide">Date Purge</p>
                        <p className="text-white/75 text-xs font-medium">Permanently deletes ALL orders + images before a chosen date. Irreversible.</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {/* Date Picker Row */}
                    {(purgePhase === 'idle' || purgePhase === 'scanning') && (
                        <div className="flex items-end gap-4">
                            <div className="flex-1 space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Delete all orders created BEFORE</label>
                                <input
                                    type="date"
                                    value={purgeDate}
                                    onChange={e => setPurgeDate(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-red-400 transition-all font-black text-brand-navy text-lg"
                                />
                            </div>
                            <Button
                                onClick={handlePurgeScan}
                                className="!bg-red-100 !text-red-600 hover:!bg-red-500 hover:!text-white !px-6 !py-4 shadow-none"
                                disabled={purgePhase === 'scanning' || !purgeDate}
                            >
                                {purgePhase === 'scanning' ? <Spinner /> : 'Scan'}
                            </Button>
                        </div>
                    )}

                    {/* Preview */}
                    {purgePhase === 'preview' && purgeScan && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-50 rounded-2xl p-5 text-center">
                                    <p className="text-4xl font-black text-red-600">{purgeScan.orderCount}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-1">Orders to Delete</p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-5 text-center">
                                    <p className="text-lg font-black text-brand-navy">Before</p>
                                    <p className="text-2xl font-black text-red-500">{purgeScan.cutoffLabel}</p>
                                </div>
                            </div>

                            {/* Scrollable order list */}
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 max-h-48 overflow-y-auto no-scrollbar px-4 py-3 space-y-1">
                                {purgeScan.orderNumbers.map(n => (
                                    <p key={n} className="text-[11px] font-mono text-gray-500">{n}</p>
                                ))}
                            </div>

                            {/* Confirm by typing */}
                            <div className="space-y-2 p-5 bg-red-50 rounded-2xl border border-red-200">
                                <p className="text-xs font-black text-red-700 uppercase tracking-wider">⚠️ Type the date to confirm — this cannot be undone</p>
                                <p className="text-[11px] text-red-600 font-mono">→ Type exactly: <strong>{purgeConfirmTarget}</strong></p>
                                <input
                                    type="text"
                                    value={purgeConfirmText}
                                    onChange={e => setPurgeConfirmText(e.target.value)}
                                    placeholder={`Type "${purgeConfirmTarget}" to unlock`}
                                    className="w-full p-3 bg-white border-2 border-red-200 rounded-xl outline-none focus:border-red-500 font-mono text-sm transition-all"
                                />
                            </div>

                            <div className="flex justify-between items-center">
                                <Button variant="outline" onClick={() => { setPurgePhase('idle'); setPurgeScan(null); setPurgeConfirmText(''); }}>Cancel</Button>
                                <Button
                                    onClick={handlePurgeExecute}
                                    className={`!px-8 shadow-lg transition-all ${purgeConfirmReady ? '!bg-red-600 hover:!bg-red-700 shadow-red-200' : '!bg-gray-200 !text-gray-400 cursor-not-allowed'}`}
                                    disabled={!purgeConfirmReady}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Permanently Delete {purgeScan.orderCount} Orders
                                    </span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Running */}
                    {purgePhase === 'running' && purgeProgress && (
                        <div className="text-center space-y-4 py-6">
                            <Spinner />
                            <div>
                                <p className="text-sm font-black text-brand-navy">
                                    {purgeProgress.stage === 'images' ? '🗂️ Deleting images...' : '📋 Removing DB records...'}
                                </p>
                                <p className="text-xs text-brand-orange font-mono mt-1">{purgeProgress.orderNumber}</p>
                                <p className="text-xs text-gray-400 mt-1">{purgeProgress.current} / {purgeProgress.total}</p>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-3 bg-gradient-to-r from-red-400 to-rose-600 rounded-full transition-all duration-300"
                                    style={{ width: `${(purgeProgress.current / purgeProgress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                                Stage: {purgeProgress.stage === 'images' ? '1/2 — Bucket Cleanup' : '2/2 — Database Cleanup'}
                            </p>
                        </div>
                    )}

                    {/* Done */}
                    {purgePhase === 'done' && purgeSummary && (
                        <div className={`p-6 rounded-2xl border ${purgeSummary.errors.length === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                            <p className="font-black text-brand-navy text-lg mb-4">
                                {purgeSummary.errors.length === 0 ? '✅ Purge Complete' : '⚠️ Done with Errors'}
                            </p>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-3xl font-black text-red-500">{purgeSummary.deletedOrderRows}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Orders Deleted</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-orange-500">{purgeSummary.deletedImageFiles}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Image Files Deleted</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-amber-500">{purgeSummary.errors.length}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Errors</p>
                                </div>
                            </div>
                            {purgeSummary.errors.length > 0 && (
                                <div className="mt-4 max-h-32 overflow-y-auto space-y-1">
                                    {purgeSummary.errors.map((e, i) => <p key={i} className="text-[10px] text-red-600 font-mono">{e}</p>)}
                                </div>
                            )}
                            <div className="mt-4 flex justify-center">
                                <Button variant="outline" onClick={() => { setPurgePhase('idle'); setPurgeScan(null); setPurgeSummary(null); setPurgeConfirmText(''); }}>
                                    New Purge
                                </Button>
                            </div>
                        </div>
                    )}

                    {purgeError && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl"><p className="text-xs font-bold text-red-600">Error: {purgeError}</p></div>}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                PANEL B — SMART CLEANUP (status/age based)
            ═══════════════════════════════════════════════ */}
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight">Smart Cleanup</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">Removes spread images from cancelled & old completed orders only. DNA and character reference files are always preserved.</p>
                    </div>
                    {phase === 'idle' && (
                        <Button onClick={handleScan} className="shadow-lg shadow-brand-orange/20">
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                Scan Storage
                            </span>
                        </Button>
                    )}
                </div>

                {/* Policy Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                        <div className="text-2xl mb-2">🗑️</div>
                        <p className="text-xs font-black text-red-700 uppercase tracking-wider">Purge Immediately</p>
                        <p className="text-[11px] text-red-600 mt-1">All images for cancelled, failed, and draft orders.</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                        <div className="text-2xl mb-2">📅</div>
                        <p className="text-xs font-black text-amber-700 uppercase tracking-wider">7-Day Retention</p>
                        <p className="text-[11px] text-amber-600 mt-1">Spread images for completed orders deleted after 7 days.</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                        <div className="text-2xl mb-2">🔒</div>
                        <p className="text-xs font-black text-green-700 uppercase tracking-wider">Always Protected</p>
                        <p className="text-[11px] text-green-600 mt-1">DNA images, character references, and all text prompts.</p>
                    </div>
                </div>

                {phase === 'scanning' && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
                        <Spinner />
                        <p className="text-sm font-black text-brand-navy mt-4">Scanning orders and storage bucket...</p>
                    </div>
                )}

                {phase === 'preview' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                <p className="text-3xl font-black text-red-500">{cancelledTargets.length}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-1">Cancelled Orders</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                <p className="text-3xl font-black text-amber-500">{oldCompletedTargets.length}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-1">Old Completed</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                <p className="text-3xl font-black text-brand-orange">{totalWillDelete}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-1">Files to Delete</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                <p className="text-3xl font-black text-green-500">{totalWillKeep}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-1">Files Protected</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b px-6 py-4 flex justify-between items-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cleanup Preview — {targets.length} Orders</p>
                                <p className="text-[10px] text-gray-400">Dry run — nothing deleted yet</p>
                            </div>
                            <div className="divide-y max-h-[400px] overflow-y-auto no-scrollbar">
                                {dryRun.map((row) => {
                                    const target = targets.find(t => t.orderNumber === row.orderNumber);
                                    return (
                                        <div key={row.orderNumber} className="px-6 py-4 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-black text-brand-navy">{row.orderNumber}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{target?.status} · {target?.createdAt ? new Date(target.createdAt).toLocaleDateString() : ''}</p>
                                            </div>
                                            <div className="flex gap-3 items-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${target?.reason === 'cancelled_order' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {target?.reason === 'cancelled_order' ? 'Cancelled' : '7-Day'}
                                                </span>
                                                <span className="text-[10px] text-red-500 font-bold">{row.willDelete.length > 0 ? `🗑 ${row.willDelete.length} files` : 'No files'}</span>
                                                {row.willKeep.length > 0 && <span className="text-[10px] text-green-500 font-bold">🔒 {row.willKeep.length} kept</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <Button variant="outline" onClick={() => { setPhase('idle'); setTargets([]); setDryRun([]); }}>Cancel</Button>
                            <Button onClick={handleExecute} className="!bg-red-500 hover:!bg-red-700 shadow-lg shadow-red-200 !px-8" disabled={totalWillDelete === 0}>
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete {totalWillDelete} Files
                                </span>
                            </Button>
                        </div>
                    </div>
                )}

                {phase === 'running' && progress && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
                        <Spinner />
                        <p className="text-sm font-black text-brand-navy">Deleting... {progress.current}/{progress.total}</p>
                        <p className="text-xs text-brand-orange font-mono">{progress.order}</p>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="h-2 bg-gradient-to-r from-brand-orange to-red-500 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                        </div>
                    </div>
                )}

                {phase === 'done' && summary && (
                    <div className={`p-6 rounded-3xl border ${summary.totalErrors === 0 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="text-3xl">{summary.totalErrors === 0 ? '✅' : '⚠️'}</div>
                            <div>
                                <p className="font-black text-brand-navy text-lg">Cleanup {summary.totalErrors === 0 ? 'Complete' : 'Finished with Errors'}</p>
                                <p className="text-sm text-gray-500">{summary.targets.length} orders processed</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center"><p className="text-3xl font-black text-red-500">{summary.totalDeleted}</p><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Files Deleted</p></div>
                            <div className="text-center"><p className="text-3xl font-black text-green-500">{summary.totalSkipped}</p><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Files Protected</p></div>
                            <div className="text-center"><p className="text-3xl font-black text-amber-500">{summary.totalErrors}</p><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Errors</p></div>
                        </div>
                        {summary.totalErrors > 0 && (
                            <div className="mt-4 space-y-1">{summary.results.filter(r => r.error).map(r => <p key={r.orderNumber} className="text-[10px] text-red-600 font-mono">{r.orderNumber}: {r.error}</p>)}</div>
                        )}
                        <div className="flex justify-center mt-4">
                            <Button variant="outline" onClick={() => { setPhase('idle'); setTargets([]); setDryRun([]); setSummary(null); }}>Run Another Scan</Button>
                        </div>
                    </div>
                )}

                {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl"><p className="text-xs font-bold text-red-600">Error: {error}</p></div>}
            </div>
        </div>
    );
};




const CustomersView: React.FC = () => {
    const [customers, setCustomers] = useState<AdminCustomer[]>([]);

    useEffect(() => {
        adminService.getCustomers().then(c => {
            // Sort by most recent order
            const sorted = c.sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());
            setCustomers(sorted);
        });
    }, []);

    return (
        <div className="space-y-4 animate-enter-forward">
            <div className="flex justify-between items-center px-2">
                <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight">Customer Intelligence</h2>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-xs text-left text-gray-500">
                    <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4">Customer identity</th>
                            <th className="px-6 py-4">Contact Vector</th>
                            <th className="px-6 py-4">First Interaction</th>
                            <th className="px-6 py-4">Last Interaction</th>
                            <th className="px-6 py-4 text-center">Protocol Executions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">No records found.</td></tr>
                        )}
                        {customers.map(c => (
                            <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-5 font-black text-brand-navy">{c.name}</td>
                                <td className="px-6 py-5">
                                    <div className="font-medium text-gray-700">{c.email}</div>
                                    <div className="text-[10px] text-gray-400 mt-1">{c.phone}</div>
                                </td>
                                <td className="px-6 py-5 font-mono text-[10px]">{c.firstOrderDate ? new Date(c.firstOrderDate).toLocaleDateString() : 'Unknown'}</td>
                                <td className="px-6 py-5 font-mono text-[10px]">{c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'Unknown'}</td>
                                <td className="px-6 py-5 text-center font-black text-brand-teal text-lg">{c.orderCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// -----------------------------------------------------------------
// Subscriptions View
// -----------------------------------------------------------------
const SubscriptionsView: React.FC = () => {
    const [subscriptions, setSubscriptions] = useState<any[]>([]);

    useEffect(() => {
        adminService.getSubscriptions().then(setSubscriptions);
    }, []);

    return (
        <div className="space-y-4 animate-enter-forward">
            <div className="flex justify-between items-center px-2">
                <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight">Active Subscriptions</h2>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-xs text-left text-gray-500">
                    <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4">Hero Identity</th>
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Plan / Status</th>
                            <th className="px-6 py-4">Next Billing</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subscriptions.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">No active subscriptions found.</td></tr>
                        )}
                        {subscriptions.map(s => (
                            <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-5 font-black text-brand-navy">{s.hero?.name || 'Unknown'}</td>
                                <td className="px-6 py-5">
                                    <div className="font-medium text-gray-700">{s.customer?.name || 'No Name'}</div>
                                    <div className="text-[10px] text-gray-400 mt-1">{s.customer?.email || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${s.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {s.plan} | {s.status}
                                    </span>
                                </td>
                                <td className="px-6 py-5 font-mono text-[10px]">{s.next_billing_date ? new Date(s.next_billing_date).toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-5 text-center flex justify-center gap-2">
                                    <Button variant="outline" className="!px-3 !py-1 text-[9px] font-black uppercase">Assign Theme</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminScreen;
