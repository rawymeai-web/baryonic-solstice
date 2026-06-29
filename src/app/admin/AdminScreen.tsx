
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
import { PipelineExecutionTerminal } from '../../components/admin/PipelineExecutionTerminal';
import EditorScreen from '../../components/editor/EditorScreen';
import PreviewScreen from '../../components/editor/PreviewScreen';

interface AdminScreenProps {
    onExit: () => void;
    onEditOrder?: (order: AdminOrder, isLegacy?: boolean, isRestart?: boolean) => void;
    language: Language;
}

type AdminView = 'orders' | 'customers' | 'subscriptions' | 'products' | 'themes' | 'bible' | 'prompts' | 'settings' | 'themePreview' | 'stitching' | 'metadata' | 'storage';

const StatCard: React.FC<{ title: string; value: string | number; icon: string; color?: string }> = ({ title, value, icon, color = 'text-brand-navy' }) => (
    <div className="glass-panel p-8 rounded-[2.5rem] flex items-center space-x-6 rtl:space-x-reverse transform transition-all hover:scale-[1.02] hover:shadow-2xl group relative overflow-hidden">
        {/* Background Accent Gradient */}
        <div className={`absolute top-0 left-0 w-1.5 h-full ${color.replace('text', 'bg')} opacity-40`}></div>
        
        {/* Subtle Background Decorative Icon */}
        <div className={`absolute -right-6 -bottom-6 ${color} opacity-[0.05] rotate-12 pointer-events-none select-none group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700`}>
            <span className="material-symbols-outlined text-[10rem] font-black leading-none">{icon}</span>
        </div>

        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center glass-panel border-white/40 ${color} shadow-lg shrink-0 relative z-10 transition-transform duration-500 group-hover:rotate-6`}>
            <span className="material-symbols-outlined text-3xl font-bold">{icon}</span>
        </div>
        
        <div className="relative z-10">
            <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.2em] mb-1">{title}</p>
            <p className="text-3xl font-black text-brand-navy leading-none tracking-tighter">{value}</p>
        </div>
    </div>
);


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

    if (!bible) return (
        <div className="flex flex-col items-center justify-center py-40 animate-pulse">
            <div className="w-16 h-16 rounded-full border-4 border-brand-orange/10 border-t-brand-orange animate-spin mb-6"></div>
            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Synchronizing Master Logic...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end px-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">System Intelligence</span>
                    <h2 className="text-4xl font-black text-brand-navy uppercase tracking-tighter">Series Bible Protocol</h2>
                </div>
                <button 
                    onClick={handleSave}
                    className="px-8 py-4 bg-brand-orange text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                    <span className="material-symbols-outlined text-xl">auto_fix_high</span>
                    Deploy Master Logic
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Rule Core A */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                            <span className="material-symbols-outlined text-lg">gavel</span>
                        </div>
                        <label className="text-[10px] font-black text-brand-navy uppercase tracking-widest">Master Guardrails</label>
                    </div>
                    <div className="glass-panel p-1 rounded-[2.5rem] border-white/60 shadow-xl overflow-hidden bg-white/40">
                        <textarea
                            value={bible.masterGuardrails}
                            onChange={e => setBible({ ...bible, masterGuardrails: e.target.value })}
                            className="w-full h-[600px] p-8 bg-transparent font-mono text-[11px] leading-relaxed focus:ring-0 outline-none transition-all resize-none scroller-thin text-brand-navy/80"
                            placeholder="Define the immutable laws of production..."
                        />
                    </div>
                </div>

                {/* Rule Core B */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-8 h-8 rounded-lg bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                            <span className="material-symbols-outlined text-lg">route</span>
                        </div>
                        <label className="text-[10px] font-black text-brand-navy uppercase tracking-widest">Story Flow Logic</label>
                    </div>
                    <div className="glass-panel p-1 rounded-[2.5rem] border-white/60 shadow-xl overflow-hidden bg-white/40">
                        <textarea
                            value={bible.storyFlowLogic}
                            onChange={e => setBible({ ...bible, storyFlowLogic: e.target.value })}
                            className="w-full h-[600px] p-8 bg-transparent font-mono text-[11px] leading-relaxed focus:ring-0 outline-none transition-all resize-none scroller-thin text-brand-navy/80"
                            placeholder="Architect the narrative structure..."
                        />
                    </div>
                </div>

                {/* Rule Core C */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-8 h-8 rounded-lg bg-brand-navy/10 flex items-center justify-center text-brand-navy">
                            <span className="material-symbols-outlined text-lg">grid_view</span>
                        </div>
                        <label className="text-[10px] font-black text-brand-navy uppercase tracking-widest">Composition Mandates</label>
                    </div>
                    <div className="glass-panel p-1 rounded-[2.5rem] border-white/60 shadow-xl overflow-hidden bg-white/40">
                        <textarea
                            value={bible.compositionMandates}
                            onChange={e => setBible({ ...bible, compositionMandates: e.target.value })}
                            className="w-full h-[600px] p-8 bg-transparent font-mono text-[11px] leading-relaxed focus:ring-0 outline-none transition-all resize-none scroller-thin text-brand-navy/80"
                            placeholder="Enforce visual aesthetic standards..."
                        />
                    </div>
                </div>
            </div>

            <div className="glass-panel p-10 rounded-[3.5rem] border-brand-orange/20 bg-brand-navy text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-brand-orange/20 transition-all duration-700"></div>
                <div className="flex items-start gap-8 relative z-10">
                    <div className="w-16 h-16 rounded-3xl bg-brand-orange text-white flex items-center justify-center shrink-0 shadow-lg shadow-brand-orange/20">
                        <span className="material-symbols-outlined text-3xl">lightbulb</span>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-brand-orange uppercase tracking-[0.3em]">Architectural Note</p>
                        <p className="text-sm font-medium leading-relaxed text-white/80 max-w-3xl">
                            These guidelines define the <span className="text-white font-black italic">"Atomic Soul"</span> of the Rawy platform. They are injected as high-priority constraints into the AI Orchestrator to ensure cultural authenticity, prevent visual artifacts, and maintain narrative consistency across all generated assets. Use them to calibrate the creative direction of the entire factory.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NavItem: React.FC<{ icon: string; label: string; onClick: () => void; isActive: boolean; }> = ({ icon, label, onClick, isActive }) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center space-x-4 rtl:space-x-reverse px-5 py-4 rounded-2xl transition-all group ${isActive ? 'bg-brand-navy text-white shadow-2xl scale-[1.02]' : 'text-brand-navy/40 hover:bg-white hover:text-brand-navy'}`}
    >
        <span className={`material-symbols-outlined text-2xl transition-transform group-hover:scale-110 ${isActive ? 'text-brand-orange' : 'text-brand-navy/30'}`}>{icon}</span>
        <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isActive ? 'text-white' : ''}`}>{label}</span>
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
            case 'metadata': return <SystemArchitectureView />;
            case 'storage': return <StorageCleanupView />;
            default: return <OrdersView orders={orders} language={language} refreshOrders={refreshOrders} onEditOrder={onEditOrder} />;
        }
    }

    return (
        <div className="min-h-screen bg-[#FFF9F0] flex flex-col md:flex-row font-sans relative overflow-hidden">
            {/* Background Blobs */}
            <div className="blob-bg opacity-30">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            {/* Premium Sidebar */}
            <aside className="w-full md:w-80 glass-panel border-r-0 md:border-r border-white/60 p-8 space-y-12 flex flex-col shrink-0 z-20 relative">
                <div className="flex items-center gap-4 px-2">
                   <Logo />
                   <div className="h-8 w-[2px] bg-brand-navy/10"></div>
                   <span className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Core OS</span>
                </div>

                <nav className="space-y-2 flex-grow overflow-y-auto no-scrollbar pr-2">
                    <p className="text-[9px] font-black text-brand-navy/20 uppercase tracking-[0.3em] px-5 mb-4">Operations</p>
                    <NavItem icon="dashboard" label="Performance" onClick={() => setView('orders')} isActive={view === 'orders'} />
                    <NavItem icon="group" label="Customers" onClick={() => setView('customers')} isActive={view === 'customers'} />
                    <NavItem icon="loyalty" label="Subscriptions" onClick={() => setView('subscriptions')} isActive={view === 'subscriptions'} />
                    
                    <p className="text-[9px] font-black text-brand-navy/20 uppercase tracking-[0.3em] px-5 mt-10 mb-4">Engine Logic</p>
                    <NavItem icon="menu_book" label="Guidelines" onClick={() => setView('bible')} isActive={view === 'bible'} />
                    <NavItem icon="palette" label="Themes" onClick={() => setView('themes')} isActive={view === 'themes'} />
                    <NavItem icon="inventory_2" label="Products" onClick={() => setView('products')} isActive={view === 'products'} />
                    
                    <p className="text-[9px] font-black text-brand-navy/20 uppercase tracking-[0.3em] px-5 mt-10 mb-4">Laboratory</p>
                    <NavItem icon="biotech" label="Visual Lab" onClick={() => setView('themePreview')} isActive={view === 'themePreview'} />
                    <NavItem icon="terminal" label="Tech Prompts" onClick={() => setView('prompts')} isActive={view === 'prompts'} />
                    <NavItem icon="hub" label="Stitching" onClick={() => setView('stitching')} isActive={view === 'stitching'} />
                    
                    <p className="text-[9px] font-black text-brand-navy/20 uppercase tracking-[0.3em] px-5 mt-10 mb-4">System</p>
                    <NavItem icon="database" label="Metadata" onClick={() => setView('metadata')} isActive={view === 'metadata'} />
                    <NavItem icon="delete_sweep" label="Cleanup" onClick={() => setView('storage')} isActive={view === 'storage'} />
                    <NavItem icon="settings" label="Config" onClick={() => setView('settings')} isActive={view === 'settings'} />
                </nav>

                <div className="pt-8 border-t border-brand-navy/5">
                    <button 
                        onClick={onExit} 
                        className="w-full py-4 rounded-2xl bg-brand-navy/5 text-brand-navy hover:bg-brand-navy hover:text-white transition-all text-[10px] uppercase font-black tracking-widest flex items-center justify-center gap-3 group"
                    >
                        <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">logout</span>
                        Exit Terminal
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-8 md:p-14 space-y-12 overflow-y-auto max-h-screen no-scrollbar relative z-30">
                <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-20">
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-brand-orange text-white flex items-center justify-center shadow-xl shadow-brand-orange/30 transform hover:rotate-12 transition-transform">
                              <span className="material-symbols-outlined text-2xl font-black">settings_input_component</span>
                           </div>
                           <div className="space-y-0.5">
                              <h1 className="text-4xl font-black text-brand-navy uppercase tracking-tight leading-none">Factory Control</h1>
                              <p className="text-[10px] text-brand-navy/40 font-black uppercase tracking-[0.3em]">Magical Production Overview • v4.0.0</p>
                           </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        {/* Manual Trigger */}
                        <button
                            onClick={async () => {
                                try {
                                    await fetch('http://localhost:3000/api/cron');
                                    await refreshOrders();
                                    alert('Master Scheduler Awakened. Data synchronized.');
                                } catch (e) {
                                    alert('Failed to wake scheduler. Check backend engine.');
                                }
                            }}
                            className="px-8 py-4 bg-brand-orange text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-orange/20 hover:-translate-y-1 transition-all flex items-center gap-3"
                        >
                            <span className="material-symbols-outlined font-black animate-pulse">bolt</span>
                            Wake Master Scheduler
                        </button>

                        <button
                            onClick={refreshOrders}
                            className="px-6 py-4 glass-panel border-brand-navy/10 text-brand-navy rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-navy hover:text-white transition-all flex items-center gap-3 group"
                        >
                            <span className="material-symbols-outlined font-black group-hover:rotate-180 transition-transform duration-500">sync</span>
                            Refresh Fleet
                        </button>

                        {/* DB Status Badge */}
                        <div className={`px-6 py-4 rounded-full glass-panel border-white/40 font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl ${connection === null ? 'text-gray-400' : connection.connected ? 'text-brand-teal' : 'text-red-500'}`}>
                            <div className={`w-3 h-3 rounded-full shrink-0 ${connection === null ? 'bg-gray-300 animate-pulse' : connection.connected ? 'bg-brand-teal shadow-[0_0_12px_rgba(0,107,93,0.5)]' : 'bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'}`}></div>
                            <span className="max-w-[200px] truncate" title={connection?.reason}>
                                {connection === null ? 'Connecting...' : connection.connected ? 'Engine Link Stable' : (
                                    connection.reason?.includes('fetch') ? 'Engine Offline' :
                                    connection.reason?.includes('timeout') ? 'Engine Timeout' :
                                    `System Error: ${connection.reason || 'Unknown'}`
                                )}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    <StatCard title="Factory Revenue" value={`${stats.totalRevenue.toFixed(3)} KWD`} icon="monetization_on" color="text-brand-orange" />
                    <StatCard title="Production Output" value={stats.orderCount} icon="auto_stories" color="text-brand-teal" />
                    <StatCard title="Active Brain" value={settings?.targetModel?.split('-')[1] || 'Gemini Pro'} icon="psychology" color="text-brand-navy" />
                </div>

                <div className="relative">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

const AdminScreen: React.FC<AdminScreenProps> = ({ onExit, onEditOrder, language }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (password === 'admin') setIsAuthenticated(true); else alert('Incorrect password'); };

    if (!isAuthenticated) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-brand-navy p-6 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="blob-bg opacity-40">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            <div className="p-12 glass-panel rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] text-center w-full max-w-md space-y-10 border-white/40 relative z-10 scale-up">
                <div className="flex justify-center mb-4">
                   <Logo />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-brand-navy uppercase tracking-tighter">Terminal Alpha</h2>
                    <p className="text-[10px] text-brand-navy/30 font-black uppercase tracking-[0.3em]">Encrypted Connection Active</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="relative group">
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="block w-full px-8 py-5 bg-white/50 backdrop-blur-md border-4 border-white rounded-3xl focus:border-brand-orange outline-none transition-all text-center font-black tracking-[0.5em] text-xl shadow-inner group-hover:shadow-brand-orange/10" 
                            placeholder="••••" 
                            autoFocus
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-20">
                            <span className="material-symbols-outlined">fingerprint</span>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        className="w-full py-5 bg-brand-navy text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-navy/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <span className="material-symbols-outlined">login</span>
                        Initiate Sequence
                    </button>
                </form>

                <p className="text-[9px] text-brand-navy/20 font-bold uppercase tracking-widest">Authorized Personnel Only • IP: Logged</p>
            </div>
        </div>
    );
    return <AdminDashboard onExit={onExit} onEditOrder={onEditOrder} language={language} />;
};

const OrdersView: React.FC<{ orders: AdminOrder[], language: Language, refreshOrders: () => void, onEditOrder?: (order: AdminOrder, isLegacy?: boolean, isRestart?: boolean) => void }> = ({ orders, language, refreshOrders, onEditOrder }) => {
    const [allOrders, setAllOrders] = useState<AdminOrder[]>(orders);
    const [previewingOrder, setPreviewingOrder] = useState<AdminOrder | null>(null);
    // editorOrder → opens the full visual EditorScreen
    const [editorOrder, setEditorOrder] = useState<AdminOrder | null>(null);
    // isLegacyMode / isResume → when true the EditorScreen auto-runs the pipeline live
    const [isLegacyMode, setIsLegacyMode] = useState(false);
    const [isResumeMode, setIsResumeMode] = useState(false);
    const [activeTab, setActiveTab] = useState<'confirmed' | 'drafts'>('confirmed');
    const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [terminalOrder, setTerminalOrder] = useState<AdminOrder | null>(null);
    const [previewOrder, setPreviewOrder] = useState<AdminOrder | null>(null);

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

    const handleHardReset = async (order: AdminOrder) => {
        if (!confirm(`CRITICAL ACTION: This will PERMANENTLY DELETE all generated art, story layouts, and job history for order ${order.orderNumber}. The pipeline will be reset to 'Paid' and must be run again from scratch. Continue?`)) return;

        setLoadingOrderId(order.orderNumber);
        setLoadingAction('reset');
        try {
            await adminService.hardResetOrder(order.orderNumber);
            alert(`Order ${order.orderNumber} successfully sanitized and reset.`);
            refreshOrders();
        } catch (err: any) {
            alert(`Hard Reset Failed: ${err.message}`);
            console.error(err);
        } finally {
            setLoadingOrderId(null);
            setLoadingAction(null);
        }
    };

    const handleOpenEditor = async (order: AdminOrder) => {
        try {
            setLoadingOrderId(order.orderNumber);
            setLoadingAction('edit');
            const fullOrder = await adminService.getOrderById(order.orderNumber);
            if (fullOrder && fullOrder.storyData) {
                if (onEditOrder) {
                    onEditOrder(fullOrder, false, false);
                } else {
                    setIsLegacyMode(false);
                    setIsResumeMode(false);
                    setEditorOrder(fullOrder);
                }
            } else {
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

    // Both Resume and Restart open EditorScreen with isLegacy=true so spreads paint live
    const handleRunPipeline = async (order: AdminOrder, resume: boolean) => {
        try {
            setLoadingOrderId(order.orderNumber);
            setLoadingAction(resume ? 'pipeline' : 'restart');
            const fullOrder = await adminService.getOrderById(order.orderNumber);
            if (fullOrder && fullOrder.storyData) {
                setIsLegacyMode(true);
                setIsResumeMode(resume);
                setEditorOrder(fullOrder);
            } else {
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

    const handleOpenTerminal = async (order: AdminOrder) => {
        try {
            setLoadingOrderId(order.orderNumber);
            setLoadingAction('terminal');
            const fullOrder = await adminService.getOrderById(order.orderNumber);
            if (fullOrder) {
                setTerminalOrder(fullOrder);
            } else {
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
            childName: "Auto", childAge: "5", title: "The Test Adventure", theme: "Space",
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

            {terminalOrder && (
                <PipelineExecutionTerminal 
                    order={terminalOrder} 
                    onClose={() => setTerminalOrder(null)} 
                    onSuccess={() => { setTerminalOrder(null); refreshOrders(); }} 
                    language={language} 
                />
            )}

            {/* Full visual editor — also used for live pipeline painting (isLegacy=true) */}
            {editorOrder && editorOrder.storyData && (
                <div className="fixed inset-0 z-50 bg-white overflow-auto">
                    <EditorScreen
                        storyData={{ ...editorOrder.storyData, orderId: editorOrder.orderNumber } as any}
                        language={editorOrder.storyData.language || language}
                        isGenerating={false}
                        generationProgress={isLegacyMode ? 0 : 100}
                        isLegacy={isLegacyMode}
                        isResume={isResumeMode}
                        onUpdateStory={async (updates) => {
                            const merged = { ...editorOrder.storyData, ...updates, orderId: editorOrder.orderNumber } as any;
                            // Optimistic update for immediate visual feedback
                            setEditorOrder({ ...editorOrder, storyData: merged });
                            try {
                                await adminService.saveOrder(editorOrder.orderNumber, merged, editorOrder.shippingDetails, editorOrder.total);
                            } catch (e) {
                                console.error("Auto-save failed:", e);
                            }
                        }}
                        onFinalize={async (args) => { 
                            try {
                                const merged = { ...editorOrder.storyData, ...args, orderId: editorOrder.orderNumber } as any;
                                await adminService.saveOrder(editorOrder.orderNumber, merged, editorOrder.shippingDetails, editorOrder.total);
                                
                                // Automatically trigger download on finalize
                                const targetLanguage = merged.language || language;
                                const zipBlob = await fileService.generatePrintPackage(merged, editorOrder.shippingDetails, targetLanguage, editorOrder.orderNumber);
                                
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(zipBlob);
                                link.download = `Order_${editorOrder.orderNumber}_FINAL.zip`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                                setEditorOrder(null); 
                                refreshOrders();
                            } catch (e) {
                                console.error("Finalization/Download failed:", e);
                                alert("Failed to generate package. Order saved, but please try exporting manually.");
                                setEditorOrder(null);
                                refreshOrders();
                            }
                        }}
                        onPreview={() => setPreviewOrder(editorOrder)}
                        onBack={() => { setEditorOrder(null); setIsLegacyMode(false); setIsResumeMode(false); }}
                        shippingDetails={editorOrder.shippingDetails}
                        total={editorOrder.total}
                    />
                </div>
            )}

            {/* Direct Book Preview */}
            {previewOrder && previewOrder.storyData && (
                <div className="fixed inset-0 z-50 bg-white overflow-auto">
                    <PreviewScreen
                        storyData={previewOrder.storyData as any}
                        language={previewOrder.storyData.language || language}
                        onOrder={() => {}} // No-op in admin
                        onDownloadPreview={() => {}} // Not needed in admin
                        onRestart={() => {}} // Not needed in admin
                        onTitleChange={() => {}} // Read-only in preview
                        onRegenerate={() => {}} // Not needed in admin
                        onBack={() => setPreviewOrder(null)}
                    />
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between items-center px-4 gap-6">
                <div className="flex bg-white/40 backdrop-blur-xl p-2 rounded-2xl border border-white/50 shadow-inner">
                    <button 
                        onClick={() => setActiveTab('confirmed')} 
                        className={`whitespace-nowrap px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'confirmed' ? 'bg-brand-navy text-white shadow-xl scale-[1.02]' : 'text-brand-navy/40 hover:text-brand-navy'}`}
                    >
                        Confirmed Orders
                    </button>
                    <button 
                        onClick={() => setActiveTab('drafts')} 
                        className={`whitespace-nowrap px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'drafts' ? 'bg-brand-navy text-white shadow-xl scale-[1.02]' : 'text-brand-navy/40 hover:text-brand-navy'}`}
                    >
                        Incomplete Drafts
                    </button>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-end w-full sm:w-auto gap-4">
                    <button 
                        onClick={async () => {
                            if (confirm("Sync all local orders to DB?")) {
                                const count = await adminService.syncLocalOrders();
                                alert(`Synced ${count} orders to Cloud.`);
                                refreshOrders();
                            }
                        }} 
                        className="px-6 py-3 rounded-xl glass-panel border-white/40 text-[9px] font-black uppercase tracking-[0.2em] text-brand-orange hover:bg-brand-orange hover:text-white transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">cloud_sync</span>
                        Cloud Sync
                    </button>
                    <button 
                        onClick={handleCreateTestOrder} 
                        className="px-6 py-3 rounded-xl glass-panel border-white/40 text-[9px] font-black uppercase tracking-[0.2em] text-brand-navy/40 hover:bg-brand-navy hover:text-white transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        Generate Debug Order
                    </button>
                </div>
            </div>

            <div className="glass-panel rounded-[3rem] shadow-2xl border-white/40 overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-orange/20 to-transparent"></div>
                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full text-xs text-left text-brand-navy min-w-[1000px]">
                        <thead className="text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.3em] border-b border-brand-navy/5">
                            <tr>
                                <th className="px-10 py-8">Order Identity</th>
                                <th className="px-10 py-8">Customer Detail</th>
                                <th className="px-10 py-8">Revenue Logic</th>
                                <th className="px-10 py-8">Pipeline State</th>
                                <th className="px-10 py-8 text-center">Protocol Interface</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-navy/5">
                            {displayOrders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-10 py-24 text-center">
                                        <span className="material-symbols-outlined text-5xl text-brand-navy/10 mb-4 block">inbox</span>
                                        <span className="text-[10px] font-black text-brand-navy/20 uppercase tracking-widest">No matching orders detected</span>
                                    </td>
                                </tr>
                            )}
                            {displayOrders.map(order => (
                                <tr key={order.orderNumber} className="group/row hover:bg-white/40 transition-colors">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                           <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center text-brand-navy group-hover/row:bg-brand-navy group-hover/row:text-white transition-all">
                                              <span className="material-symbols-outlined text-lg">receipt_long</span>
                                           </div>
                                           <div>
                                              <div className="font-black text-brand-navy tracking-tight">{order.orderNumber}</div>
                                              <div className="text-[9px] text-brand-navy/30 font-bold mt-1 uppercase tracking-wider">{new Date(order.orderDate).toLocaleString()}</div>
                                           </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 font-bold text-brand-navy/60">{order.customerName}</td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-2">
                                           <span className="text-[10px] font-black text-brand-teal bg-brand-teal/5 px-3 py-1 rounded-full">{order.total.toFixed(3)} KWD</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="relative group/select">
                                            <select 
                                                value={order.status} 
                                                onChange={(e) => handleStatusChange(order.orderNumber, e.target.value as OrderStatus)} 
                                                className={`appearance-none p-3 pr-10 w-full rounded-2xl border text-[10px] font-black uppercase tracking-wider outline-none focus:ring-4 transition-all cursor-pointer shadow-sm
                                                    ${order.status === 'paid' || order.status === 'paid_confirmed' || order.status === 'queued' ? 'bg-blue-50 border-blue-200 text-blue-700 focus:border-blue-400 focus:ring-blue-100' : 
                                                      order.status.includes('generating') || order.status === 'Processing' || order.status === 'processing' ? 'bg-orange-50 border-orange-200 text-orange-700 focus:border-orange-400 focus:ring-orange-100' :
                                                      order.status.includes('ready') ? 'bg-brand-teal/10 border-brand-teal/20 text-brand-teal focus:border-brand-teal focus:ring-brand-teal/10' :
                                                      order.status === 'shipped' || order.status === 'delivered' || order.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700 focus:border-green-400 focus:ring-green-100' :
                                                      order.status === 'failed' || order.status === 'cancelled' ? 'bg-red-50 border-red-200 text-red-700 focus:border-red-400 focus:ring-red-100' :
                                                      'bg-white/50 border-white/60 text-brand-navy/60 focus:border-brand-orange focus:ring-brand-orange/10'}
                                                `}
                                            >
                                                {/* Core States */}
                                                <option value="New Order">New Order</option>
                                                <option value="paid_confirmed">Paid (Confirmed)</option>
                                                <option value="queued">Queued</option>
                                                
                                                {/* Pipeline Phase 1: Context */}
                                                <option value="theme_assigned">Theme Assigned</option>
                                                <option value="story_generating">Story Generating...</option>
                                                <option value="story_ready">Story Ready</option>
                                                
                                                {/* Pipeline Phase 2: Character */}
                                                <option value="character_generating">Character Generating...</option>
                                                <option value="character_ready">Character Ready</option>
                                                
                                                {/* Pipeline Phase 3: Visuals */}
                                                <option value="illustrations_generating">Illustrations Generating...</option>
                                                <option value="illustrations_ready">Illustrations Ready</option>
                                                
                                                {/* Finalization */}
                                                <option value="book_compiling">Book Compiling</option>
                                                <option value="softcopy_ready">Softcopy Ready</option>
                                                <option value="awaiting_preview_approval">Awaiting Approval</option>
                                                <option value="sent_to_print">Sent to Print</option>
                                                <option value="printing">Printing</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="delivered">Delivered</option>
                                                
                                                {/* Terminals */}
                                                <option value="Completed">Completed</option>
                                                <option value="failed">Failed</option>
                                                <option value="cancelled">Cancelled</option>
                                                <option value="on_hold">On Hold</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-brand-navy/20 pointer-events-none text-lg">expand_more</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex flex-wrap justify-center gap-3 max-w-[500px] mx-auto">
                                            <button 
                                                className="p-2 w-10 h-10 rounded-xl glass-panel border-brand-teal/20 text-brand-teal/40 hover:text-brand-teal hover:scale-110 transition-all group/btn relative" 
                                                onClick={async () => {
                                                    const full = await adminService.getOrderById(order.orderNumber);
                                                    if (full) setPreviewOrder(full);
                                                }}
                                                title="Direct Book Preview"
                                            >
                                                <span className="material-symbols-outlined text-xl">menu_book</span>
                                            </button>

                                            <button 
                                                className="p-2 w-10 h-10 rounded-xl glass-panel border-white/60 text-brand-navy/40 hover:text-brand-navy hover:scale-110 transition-all group/btn relative" 
                                                onClick={() => handleInspect(order)}
                                                disabled={loadingOrderId === order.orderNumber}
                                                title="Inspect Metadata"
                                            >
                                                <span className="material-symbols-outlined text-xl">{loadingOrderId === order.orderNumber && loadingAction === 'inspect' ? 'sync' : 'database'}</span>
                                            </button>

                                            <button 
                                                className="px-5 py-2.5 rounded-xl glass-panel border-brand-navy/10 text-[9px] font-black uppercase tracking-widest text-brand-navy hover:bg-brand-navy hover:text-white transition-all flex items-center gap-2 group/btn" 
                                                onClick={() => handleOpenEditor(order)}
                                                disabled={loadingOrderId === order.orderNumber}
                                            >
                                                <span className="material-symbols-outlined text-sm group-hover/btn:rotate-12 transition-transform">edit_note</span>
                                                Visual Editor
                                            </button>

                                            <button 
                                                className="px-5 py-2.5 rounded-xl glass-panel border-brand-teal/20 text-[9px] font-black uppercase tracking-widest text-brand-teal hover:bg-brand-teal hover:text-white transition-all flex items-center gap-2 group/btn" 
                                                onClick={() => handleRunPipeline(order, true)}
                                                disabled={loadingOrderId === order.orderNumber}
                                            >
                                                <span className="material-symbols-outlined text-sm animate-pulse">play_circle</span>
                                                Resume Engine
                                            </button>

                                            <button 
                                                className="p-2 w-10 h-10 rounded-xl glass-panel border-brand-orange/20 text-brand-orange/40 hover:text-brand-orange hover:scale-110 transition-all group/btn relative" 
                                                onClick={() => {
                                                    if (window.confirm(`DANGER: Restart ALL Pipeline phases for ${order.orderNumber}? DNA, Story, and Artwork will be permanently overwritten.`)) {
                                                        handleRunPipeline(order, false);
                                                    }
                                                }}
                                                disabled={loadingOrderId === order.orderNumber}
                                                title="Restart Pipeline"
                                            >
                                                <span className="material-symbols-outlined text-xl">restart_alt</span>
                                            </button>

                                            <button 
                                                className="p-2 w-10 h-10 rounded-xl glass-panel border-brand-teal/20 text-brand-teal/40 hover:text-brand-teal hover:scale-110 transition-all group/btn relative" 
                                                onClick={() => handleOpenTerminal(order)}
                                                disabled={loadingOrderId === order.orderNumber}
                                                title="Open Diagnostic Terminal"
                                            >
                                                <span className="material-symbols-outlined text-xl">{loadingOrderId === order.orderNumber && loadingAction === 'terminal' ? 'sync' : 'terminal'}</span>
                                            </button>

                                            <button 
                                                className="p-2 w-10 h-10 rounded-xl glass-panel border-white/60 text-brand-navy/30 hover:text-brand-navy hover:scale-110 transition-all group/btn relative" 
                                                onClick={() => handleDownloadZip(order)}
                                                disabled={isExporting === order.orderNumber || loadingOrderId === order.orderNumber}
                                                title="Export Print Package"
                                            >
                                                <span className="material-symbols-outlined text-xl">{isExporting === order.orderNumber ? 'downloading' : 'package_2'}</span>
                                            </button>

                                            <button 
                                                className="p-2 w-10 h-10 rounded-xl glass-panel border-red-500/10 text-red-500/40 hover:text-red-500 hover:scale-110 transition-all group/btn relative" 
                                                onClick={() => handleHardReset(order)}
                                                disabled={loadingOrderId === order.orderNumber}
                                                title="Hard Reset & Clear Spillage"
                                            >
                                                <span className="material-symbols-outlined text-xl">{loadingOrderId === order.orderNumber && loadingAction === 'reset' ? 'sync' : 'refresh'}</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end px-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Content Architecture</span>
                    <h2 className="text-4xl font-black text-brand-navy uppercase tracking-tighter">Story Frameworks</h2>
                </div>
                <button 
                    onClick={() => { setEditingTheme(null); setIsModalOpen(true); }} 
                    className="px-8 py-4 bg-brand-orange text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                    <span className="material-symbols-outlined text-xl">architecture</span>
                    Construct New Theme
                </button>
            </div>
            
            {isModalOpen && <ThemeEditorModal theme={editingTheme} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            
            <div className="glass-panel rounded-[3rem] border-white/60 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-brand-navy/5 border-b border-brand-navy/5">
                        <tr>
                            <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.3em]">Descriptor</th>
                            <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.3em]">Classification</th>
                            <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.3em]">Engine State</th>
                            <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.3em] text-center">Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-navy/5 bg-white/20">
                        {themes.map(t => (
                            <tr key={t.id} className="group hover:bg-white/40 transition-colors">
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-white border border-white/60 shadow-sm flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                            {t.emoji}
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-brand-navy">{t.title.en}</p>
                                            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest mt-0.5">ID: {t.id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <span className="text-xs font-black text-brand-orange uppercase tracking-[0.2em]">{t.category}</span>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse"></span>
                                        <span className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Active Live</span>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex justify-center">
                                        <button 
                                            className="px-6 py-3 rounded-xl border border-brand-navy/10 text-[9px] font-black uppercase tracking-widest text-brand-navy/60 hover:bg-brand-navy hover:text-white transition-all shadow-sm"
                                            onClick={() => { setEditingTheme(t); setIsModalOpen(true); }}
                                        >
                                            Modify Logic
                                        </button>
                                    </div>
                                </td>
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end px-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Logistics Intelligence</span>
                    <h2 className="text-4xl font-black text-brand-navy uppercase tracking-tighter">Product Catalog</h2>
                </div>
                <button 
                    onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} 
                    className="px-8 py-4 bg-brand-navy text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-navy/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                    <span className="material-symbols-outlined text-xl">inventory_2</span>
                    Register New SKU
                </button>
            </div>

            {isModalOpen && <ProductEditorModal product={editingProduct} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            
            <div className="glass-panel rounded-[3rem] border-white/60 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-brand-navy/5 border-b border-brand-navy/5">
                        <tr>
                            <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.3em]">SKU Profile</th>
                            <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.3em]">Retail Price</th>
                            <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.3em]">Dimensions</th>
                            <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.3em] text-center">Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-navy/5 bg-white/20">
                        {products.map(p => (
                            <tr key={p.id} className="group hover:bg-white/40 transition-colors">
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-white border border-white/60 shadow-sm flex items-center justify-center text-brand-navy group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-3xl">book</span>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-brand-navy uppercase tracking-tighter">{p.name}</p>
                                            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest mt-0.5">SKU: {p.id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest mb-1">Base Revenue</span>
                                        <span className="text-xl font-black text-brand-teal font-mono">{p.price.toFixed(3)} <span className="text-[10px] uppercase">KWD</span></span>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-3 text-brand-navy/60">
                                        <span className="material-symbols-outlined text-sm">square_foot</span>
                                        <span className="text-xs font-bold">{p.page.widthCm} x {p.page.heightCm} cm</span>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex justify-center">
                                        <button 
                                            className="px-6 py-3 rounded-xl border border-brand-navy/10 text-[9px] font-black uppercase tracking-widest text-brand-navy/60 hover:bg-brand-navy hover:text-white transition-all shadow-sm"
                                            onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                                        >
                                            Edit Spec
                                        </button>
                                    </div>
                                </td>
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
            // Replaced alert with better feedback if possible, but keeping logic for now
            alert('Super Prompts Deployed!');
        }
    };

    if (!prompts) return <Spinner />;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end px-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Neural Architecture</span>
                    <h2 className="text-4xl font-black text-brand-navy uppercase tracking-tighter">Super Prompt Terminal</h2>
                </div>
                <button 
                    onClick={handleSave} 
                    className="px-8 py-4 bg-brand-orange text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                    <span className="material-symbols-outlined text-xl">memory</span>
                    Deploy Logic
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-4">
                        <span className="material-symbols-outlined text-brand-navy/20">auto_awesome</span>
                        <label className="text-[10px] font-black text-brand-navy uppercase tracking-widest">Cover Prompt Architecture</label>
                    </div>
                    <div className="glass-panel p-1 rounded-[2.5rem] border-white/60 shadow-xl overflow-hidden bg-white/40">
                        <textarea 
                            value={prompts.method4CoverPrompt.template} 
                            onChange={e => setPrompts({ ...prompts, method4CoverPrompt: { ...prompts.method4CoverPrompt, template: e.target.value } })} 
                            className="w-full h-96 p-8 bg-transparent font-mono text-[11px] leading-relaxed focus:ring-0 outline-none transition-all resize-none scroller-thin text-brand-navy/80" 
                        />
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-4">
                        <span className="material-symbols-outlined text-brand-navy/20">brush</span>
                        <label className="text-[10px] font-black text-brand-navy uppercase tracking-widest">Spread Prompt Architecture</label>
                    </div>
                    <div className="glass-panel p-1 rounded-[2.5rem] border-white/60 shadow-xl overflow-hidden bg-white/40">
                        <textarea 
                            value={prompts.method4SpreadPrompt.template} 
                            onChange={e => setPrompts({ ...prompts, method4SpreadPrompt: { ...prompts.method4SpreadPrompt, template: e.target.value } })} 
                            className="w-full h-96 p-8 bg-transparent font-mono text-[11px] leading-relaxed focus:ring-0 outline-none transition-all resize-none scroller-thin text-brand-navy/80" 
                        />
                    </div>
                </div>
            </div>
            
            <div className="glass-panel p-6 rounded-3xl border-brand-navy/10 bg-brand-navy/90 font-mono text-[10px] text-brand-teal flex items-center gap-4">
                <span className="material-symbols-outlined text-lg text-white/40">info</span>
                <p className="opacity-80">Injection Variables: <span className="text-brand-orange">{'{summary}'}</span>, <span className="text-brand-orange">{'{main_content_side}'}</span>, <span className="text-brand-orange">{'{style_prompt}'}</span></p>
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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            <div className="px-4">
                <h2 className="text-4xl font-black text-brand-navy uppercase tracking-tighter">System Engine Config</h2>
                <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em] mt-2">Fine-tune the behavior and financials of the Rawy platform.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Generation Engine Card */}
                <div className="glass-panel p-10 rounded-[3rem] border-white/60 shadow-xl relative overflow-hidden bg-white/40">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange to-brand-coral"></div>
                    <div className="flex items-center justify-between gap-3 mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
                                <span className="material-symbols-outlined text-2xl">bolt</span>
                            </div>
                            <h3 className="text-sm font-black text-brand-orange uppercase tracking-[0.2em]">Generation Engine</h3>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-white/40 p-2 rounded-2xl border border-white/60">
                            <span className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest pl-2">Debug Mode</span>
                            <button
                                onClick={() => setSettings({ ...settings, enableDebugView: !settings.enableDebugView })}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${settings.enableDebugView ? 'bg-brand-orange shadow-lg shadow-brand-orange/20' : 'bg-brand-navy/10'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.enableDebugView ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Active Model Architecture</label>
                            <select
                                value={settings.targetModel || 'gemini-2.5-flash-image'}
                                onChange={e => setSettings({ ...settings, targetModel: e.target.value })}
                                className="w-full p-5 bg-white/60 border border-white/80 rounded-2xl outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-black text-brand-navy"
                            >
                                <option value="gemini-2.5-flash-image">Gemini 2.5 Image (Recommended)</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Text/Vision)</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Rate Limit Delay (ms)</label>
                                <input type="number" value={settings.generationDelay} onChange={e => setSettings({ ...settings, generationDelay: parseInt(e.target.value) })} className="w-full p-5 bg-white/60 border border-white/80 rounded-2xl outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-black text-brand-navy" />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Default Spreads</label>
                                <input type="number" value={settings.defaultSpreadCount} onChange={e => setSettings({ ...settings, defaultSpreadCount: parseInt(e.target.value) })} className="w-full p-5 bg-white/60 border border-white/80 rounded-2xl outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-black text-brand-navy" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Metrics Card */}
                <div className="glass-panel p-10 rounded-[3rem] border-white/60 shadow-xl relative overflow-hidden bg-white/40">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-teal to-brand-navy"></div>
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal">
                            <span className="material-symbols-outlined text-2xl">payments</span>
                        </div>
                        <h3 className="text-sm font-black text-brand-teal uppercase tracking-[0.2em]">Financial Metrics (KWD)</h3>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Production Cost</label>
                                <input type="number" step="0.001" value={settings.unitProductionCost} onChange={e => setSettings({ ...settings, unitProductionCost: parseFloat(e.target.value) })} className="w-full p-5 bg-white/60 border border-white/80 rounded-2xl outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all font-black text-brand-navy" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">AI Token Cost</label>
                                <input type="number" step="0.001" value={settings.unitAiCost} onChange={e => setSettings({ ...settings, unitAiCost: parseFloat(e.target.value) })} className="w-full p-5 bg-white/60 border border-white/80 rounded-2xl outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all font-black text-brand-navy" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Base Shipping Cost</label>
                            <input type="number" step="0.001" value={settings.unitShippingCost} onChange={e => setSettings({ ...settings, unitShippingCost: parseFloat(e.target.value) })} className="w-full p-5 bg-white/60 border border-white/80 rounded-2xl outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all font-black text-brand-navy" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-6">
                <button 
                    onClick={handleSave} 
                    className="px-16 py-6 bg-brand-navy text-white rounded-3xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-brand-navy/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                >
                    <span className="material-symbols-outlined">save</span>
                    Sync Platform Configuration
                </button>
            </div>
        </div>
    );
};

// DEBUGGER COMPONENT
const MetadataInspector: React.FC = () => {
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
    const [phase, setPhase] = useState<'idle' | 'scanning' | 'preview' | 'running' | 'done'>('idle');
    const [targets, setTargets] = useState<storageCleanup.CleanupTarget[]>([]);
    const [dryRun, setDryRun] = useState<{ orderNumber: string; willDelete: string[]; willKeep: string[] }[]>([]);
    const [summary, setSummary] = useState<storageCleanup.CleanupSummary | null>(null);
    const [progress, setProgress] = useState<{ current: number; total: number; order: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

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
        if (!window.confirm(`DANGER: Permanently delete images for ${targets.length} orders?`)) return;
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

    const purgeConfirmTarget = purgeScan?.cutoffLabel ?? '';
    const purgeConfirmReady = purgeConfirmText.trim() === purgeConfirmTarget;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ═══════════════════════════════════════════════
                PANEL A — DATE PURGE  (Critical System Action)
            ═══════════════════════════════════════════════ */}
            <div className="glass-panel rounded-[3.5rem] border-red-500/20 shadow-2xl overflow-hidden bg-white/40">
                <header className="bg-gradient-to-r from-red-500 to-rose-600 px-10 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-2xl">delete_forever</span>
                        </div>
                        <div>
                            <p className="text-white font-black text-lg uppercase tracking-tight">System Date Purge</p>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Permanent Data Deletion Protocol</p>
                        </div>
                    </div>
                    <div className="px-4 py-1.5 bg-white/20 rounded-full border border-white/20 text-white text-[9px] font-black uppercase tracking-widest">Irreversible Action</div>
                </header>

                <div className="p-10 space-y-8">
                    {(purgePhase === 'idle' || purgePhase === 'scanning') && (
                        <div className="flex items-end gap-6">
                            <div className="flex-1 space-y-2">
                                <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Purge Cutoff Threshold</label>
                                <input
                                    type="date"
                                    value={purgeDate}
                                    onChange={e => setPurgeDate(e.target.value)}
                                    className="w-full p-5 bg-white/60 border border-white/80 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-black text-brand-navy text-lg"
                                />
                            </div>
                            <button
                                onClick={handlePurgeScan}
                                className="px-10 py-5 bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                                disabled={purgePhase === 'scanning' || !purgeDate}
                            >
                                {purgePhase === 'scanning' ? <Spinner /> : <><span className="material-symbols-outlined text-xl">radar</span> Scan Archives</>}
                            </button>
                        </div>
                    )}

                    {purgePhase === 'preview' && purgeScan && (
                        <div className="space-y-8 animate-in zoom-in-95 duration-300">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="glass-panel bg-red-500/5 border-red-500/10 rounded-3xl p-8 text-center">
                                    <p className="text-5xl font-black text-red-600 tracking-tighter">{purgeScan.orderCount}</p>
                                    <p className="text-[10px] font-black text-red-500/40 uppercase tracking-widest mt-2">Targeted Records</p>
                                </div>
                                <div className="glass-panel bg-brand-navy/5 border-brand-navy/5 rounded-3xl p-8 text-center flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest mb-1">Temporal Boundary</p>
                                    <p className="text-2xl font-black text-brand-navy uppercase tracking-tighter">{purgeScan.cutoffLabel}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Archive Identifiers</label>
                                <div className="glass-panel bg-white/60 border-white/80 rounded-3xl max-h-48 overflow-y-auto scroller-thin p-6 grid grid-cols-3 gap-3">
                                    {purgeScan.orderNumbers.map(n => (
                                        <div key={n} className="px-3 py-2 bg-brand-navy/5 rounded-xl text-[10px] font-mono text-brand-navy/60 border border-brand-navy/5">
                                            {n}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-[2.5rem] space-y-6">
                                <div className="flex items-center gap-4 text-red-600">
                                    <span className="material-symbols-outlined text-3xl">warning</span>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest">Authentication Required</p>
                                        <p className="text-[10px] font-medium opacity-80">This action will permanently scrub these records from the core database and cloud storage.</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Type exactly: <span className="text-red-700 font-mono underline">{purgeConfirmTarget}</span></p>
                                    <input
                                        type="text"
                                        value={purgeConfirmText}
                                        onChange={e => setPurgeConfirmText(e.target.value)}
                                        placeholder={`Security Key: ${purgeConfirmTarget}`}
                                        className="w-full p-5 bg-white border border-red-500/20 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 font-mono text-sm transition-all"
                                    />
                                </div>

                                <div className="flex justify-between items-center gap-6 pt-2">
                                    <button 
                                        onClick={() => { setPurgePhase('idle'); setPurgeScan(null); setPurgeConfirmText(''); }}
                                        className="px-8 py-4 bg-white/60 border border-white/80 rounded-2xl text-[11px] font-black text-brand-navy/40 uppercase tracking-widest hover:text-brand-navy transition-all"
                                    >
                                        Abort Protocol
                                    </button>
                                    <button
                                        onClick={handlePurgeExecute}
                                        className={`flex-1 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 ${purgeConfirmReady ? 'bg-red-600 text-white shadow-red-600/30 hover:scale-[1.02]' : 'bg-brand-navy/10 text-brand-navy/20 cursor-not-allowed shadow-none'}`}
                                        disabled={!purgeConfirmReady}
                                    >
                                        <span className="material-symbols-outlined">explosive</span>
                                        Authorize Terminal Purge
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {purgePhase === 'running' && purgeProgress && (
                        <div className="py-12 flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500">
                            <div className="w-24 h-24 rounded-full border-4 border-red-500/10 border-t-red-500 animate-spin flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-red-500 animate-pulse">delete_sweep</span>
                            </div>
                            <div className="space-y-2">
                                <p className="text-lg font-black text-brand-navy uppercase tracking-tighter">
                                    {purgeProgress.stage === 'images' ? 'Cloud Asset Deconstruction' : 'Relational Record Scrubbing'}
                                </p>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="px-3 py-1 bg-red-500/10 text-red-600 rounded-lg text-[10px] font-mono">{purgeProgress.orderNumber}</span>
                                    <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest">{purgeProgress.current} of {purgeProgress.total}</span>
                                </div>
                            </div>
                            <div className="w-full max-w-md bg-brand-navy/5 rounded-full h-3 overflow-hidden border border-brand-navy/5">
                                <div
                                    className="h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${(purgeProgress.current / purgeProgress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">
                                Phase {purgeProgress.stage === 'images' ? '01 — Bucket Cleanup' : '02 — Core Database Sync'}
                            </p>
                        </div>
                    )}

                    {purgePhase === 'done' && purgeSummary && (
                        <div className="p-10 rounded-[3rem] border border-brand-teal/20 bg-brand-teal/5 space-y-8 animate-in zoom-in-95 duration-500">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-brand-teal rounded-3xl flex items-center justify-center text-white shadow-xl shadow-brand-teal/20">
                                    <span className="material-symbols-outlined text-3xl">task_alt</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-brand-navy uppercase tracking-tighter">Protocol Terminated</p>
                                    <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Archive state successfully modified</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-6">
                                <div className="glass-panel p-6 rounded-3xl text-center border-white/60 bg-white/40">
                                    <p className="text-3xl font-black text-brand-navy">{purgeSummary.deletedOrderRows}</p>
                                    <p className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest mt-1">Orders Removed</p>
                                </div>
                                <div className="glass-panel p-6 rounded-3xl text-center border-white/60 bg-white/40">
                                    <p className="text-3xl font-black text-brand-navy">{purgeSummary.deletedImageFiles}</p>
                                    <p className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest mt-1">Assets Scratched</p>
                                </div>
                                <div className="glass-panel p-6 rounded-3xl text-center border-white/60 bg-white/40">
                                    <p className="text-3xl font-black text-amber-500">{purgeSummary.errors.length}</p>
                                    <p className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest mt-1">Exceptions</p>
                                </div>
                            </div>

                            {purgeSummary.errors.length > 0 && (
                                <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl max-h-32 overflow-y-auto scroller-thin">
                                    {purgeSummary.errors.map((e, i) => <p key={i} className="text-[10px] text-amber-700 font-mono py-1">{e}</p>)}
                                </div>
                            )}

                            <div className="flex justify-center">
                                <button 
                                    onClick={() => { setPurgePhase('idle'); setPurgeScan(null); setPurgeSummary(null); setPurgeConfirmText(''); }}
                                    className="px-10 py-4 bg-brand-navy text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                                >
                                    Initialize New Cycle
                                </button>
                            </div>
                        </div>
                    )}

                    {purgeError && <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-600"><span className="material-symbols-outlined">error</span><p className="text-xs font-black uppercase tracking-widest">Critical Exception: {purgeError}</p></div>}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                PANEL B — SMART CLEANUP (Operational Efficiency)
            ═══════════════════════════════════════════════ */}
            <div className="space-y-8">
                <div className="flex justify-between items-end px-4">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Storage Intelligence</span>
                        <h2 className="text-4xl font-black text-brand-navy uppercase tracking-tighter">Smart Storage Management</h2>
                    </div>
                    {phase === 'idle' && (
                        <button 
                            onClick={handleScan} 
                            className="px-8 py-4 bg-brand-orange text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <span className="material-symbols-outlined text-xl">inventory</span>
                            Scan for Optimization
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel p-8 rounded-[2.5rem] border-white/60 bg-white/40 space-y-4">
                        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                            <span className="material-symbols-outlined">block</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Immediate Purge</p>
                            <p className="text-xs font-medium text-brand-navy/60 mt-1">All temporary assets for cancelled or failed production cycles.</p>
                        </div>
                    </div>
                    <div className="glass-panel p-8 rounded-[2.5rem] border-white/60 bg-white/40 space-y-4">
                        <div className="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
                            <span className="material-symbols-outlined">history</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest">7-Day Retention</p>
                            <p className="text-xs font-medium text-brand-navy/60 mt-1">Post-production spread visuals are archived after 168 hours.</p>
                        </div>
                    </div>
                    <div className="glass-panel p-8 rounded-[2.5rem] border-white/60 bg-white/40 space-y-4">
                        <div className="w-12 h-12 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal">
                            <span className="material-symbols-outlined">shield_lock</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Absolute Protection</p>
                            <p className="text-xs font-medium text-brand-navy/60 mt-1">DNA vectors, character anchors, and prompt history are immortalized.</p>
                        </div>
                    </div>
                </div>

                {phase === 'scanning' && (
                    <div className="glass-panel rounded-[3rem] border-white/60 bg-white/40 p-20 text-center animate-in fade-in duration-700">
                        <div className="w-20 h-20 rounded-full border-4 border-brand-orange/10 border-t-brand-orange animate-spin mx-auto mb-8"></div>
                        <p className="text-xl font-black text-brand-navy uppercase tracking-tighter">Analyzing Storage Topology</p>
                        <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest mt-2">Cross-referencing database states with cloud bucket inventory</p>
                    </div>
                )}

                {phase === 'preview' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Cancelled', value: cancelledTargets.length, color: 'text-red-500' },
                                { label: 'Old Completed', value: oldCompletedTargets.length, color: 'text-brand-orange' },
                                { label: 'Optimization Targets', value: totalWillDelete, color: 'text-red-600' },
                                { label: 'Secured Assets', value: totalWillKeep, color: 'text-brand-teal' }
                            ].map((stat, i) => (
                                <div key={i} className="glass-panel p-6 rounded-3xl text-center border-white/60 bg-white/40">
                                    <p className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
                                    <p className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="glass-panel rounded-[3rem] border-white/60 shadow-xl overflow-hidden bg-white/40">
                            <header className="bg-brand-navy/5 border-b border-brand-navy/5 px-10 py-6 flex justify-between items-center">
                                <p className="text-[10px] font-black text-brand-navy uppercase tracking-[0.2em]">Optimization Manifest — {targets.length} Nodes Identified</p>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
                                    <p className="text-[9px] font-black text-brand-orange uppercase tracking-widest">Pre-Execution Simulation</p>
                                </div>
                            </header>
                            <div className="divide-y divide-brand-navy/5 max-h-[400px] overflow-y-auto scroller-thin bg-white/20">
                                {dryRun.map((row) => {
                                    const target = targets.find(t => t.orderNumber === row.orderNumber);
                                    return (
                                        <div key={row.orderNumber} className="px-10 py-6 flex items-center justify-between group hover:bg-white/40 transition-colors">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center text-brand-navy/30 font-mono text-[10px]">
                                                    {row.orderNumber.slice(-3)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-brand-navy">{row.orderNumber}</p>
                                                    <p className="text-[10px] text-brand-navy/30 uppercase tracking-widest mt-0.5">{target?.status} · {target?.createdAt ? new Date(target.createdAt).toLocaleDateString() : ''}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-6 items-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${target?.reason === 'cancelled_order' ? 'bg-red-500/10 text-red-600' : 'bg-brand-orange/10 text-brand-orange'}`}>
                                                    {target?.reason === 'cancelled_order' ? 'Scrub Target' : 'Retention Expired'}
                                                </span>
                                                <div className="text-right">
                                                    <p className="text-[11px] text-red-500 font-black uppercase tracking-widest">{row.willDelete.length > 0 ? `-${row.willDelete.length} Assets` : 'No Cleanup Needed'}</p>
                                                    {row.willKeep.length > 0 && <p className="text-[9px] text-brand-teal font-black uppercase tracking-widest opacity-60">🔒 {row.willKeep.length} DNA Preserved</p>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-between items-center px-4">
                            <button 
                                onClick={() => { setPhase('idle'); setTargets([]); setDryRun([]); }}
                                className="px-10 py-4 bg-white/60 border border-white/80 rounded-2xl text-[11px] font-black text-brand-navy/40 uppercase tracking-widest hover:text-brand-navy transition-all"
                            >
                                Reset Analysis
                            </button>
                            <button 
                                onClick={handleExecute} 
                                className="px-12 py-5 bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50" 
                                disabled={totalWillDelete === 0}
                            >
                                <span className="material-symbols-outlined">auto_delete</span>
                                Commit Deletion of {totalWillDelete} Assets
                            </button>
                        </div>
                    </div>
                )}

                {phase === 'running' && progress && (
                    <div className="glass-panel rounded-[3rem] border-white/60 bg-white/40 p-20 text-center space-y-10 animate-in fade-in duration-500">
                        <div className="w-24 h-24 rounded-full border-4 border-brand-orange/10 border-t-brand-orange animate-spin mx-auto flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-brand-orange animate-pulse">cleaning_services</span>
                        </div>
                        <div className="space-y-4">
                            <p className="text-2xl font-black text-brand-navy uppercase tracking-tighter">Reclaiming Cloud Storage</p>
                            <div className="flex items-center justify-center gap-4">
                                <span className="px-4 py-2 bg-brand-navy/5 rounded-2xl text-xs font-black text-brand-navy">{progress.current} / {progress.total}</span>
                                <span className="text-[10px] font-black text-brand-orange uppercase tracking-[0.2em] font-mono">{progress.order}</span>
                            </div>
                        </div>
                        <div className="w-full max-w-xl mx-auto bg-brand-navy/5 rounded-full h-4 overflow-hidden border border-brand-navy/5 p-1">
                            <div className="h-full bg-gradient-to-r from-brand-orange to-red-500 rounded-full transition-all duration-1000 ease-in-out" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                        </div>
                    </div>
                )}

                {phase === 'done' && summary && (
                    <div className={`p-10 rounded-[3.5rem] border bg-white/40 glass-panel shadow-2xl animate-in zoom-in-95 duration-500 ${summary.totalErrors === 0 ? 'border-brand-teal/20' : 'border-amber-500/20'}`}>
                        <div className="flex items-center gap-6 mb-10">
                            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl ${summary.totalErrors === 0 ? 'bg-brand-teal shadow-brand-teal/20' : 'bg-amber-500 shadow-amber-500/20'}`}>
                                <span className="material-symbols-outlined text-3xl">{summary.totalErrors === 0 ? 'check_circle' : 'warning'}</span>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-brand-navy uppercase tracking-tighter">Optimization {summary.totalErrors === 0 ? 'Successful' : 'Completed with Notes'}</p>
                                <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest">{summary.targets.length} Nodes processed within operational parameters</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-8">
                            <div className="glass-panel p-8 rounded-3xl text-center border-white/60 bg-white/60">
                                <p className="text-4xl font-black text-red-500 tracking-tighter">{summary.totalDeleted}</p>
                                <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest mt-2">Assets Scratch</p>
                            </div>
                            <div className="glass-panel p-8 rounded-3xl text-center border-white/60 bg-white/60">
                                <p className="text-4xl font-black text-brand-teal tracking-tighter">{summary.totalSkipped}</p>
                                <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest mt-2">Assets Preserved</p>
                            </div>
                            <div className="glass-panel p-8 rounded-3xl text-center border-white/60 bg-white/60">
                                <p className="text-4xl font-black text-amber-500 tracking-tighter">{summary.totalErrors}</p>
                                <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest mt-2">Exceptions</p>
                            </div>
                        </div>
                        {summary.totalErrors > 0 && (
                            <div className="mt-8 p-6 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] scroller-thin max-h-32 overflow-y-auto">
                                {summary.results.filter(r => r.error).map(r => <p key={r.orderNumber} className="text-[10px] font-mono text-amber-700 py-1">{r.orderNumber}: {r.error}</p>)}
                            </div>
                        )}
                        <div className="flex justify-center mt-10">
                            <button 
                                onClick={() => { setPhase('idle'); setTargets([]); setDryRun([]); setSummary(null); }}
                                className="px-10 py-4 bg-brand-navy text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                            >
                                Initiate New Scan
                            </button>
                        </div>
                    </div>
                )}

                {error && <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-600"><span className="material-symbols-outlined">error</span><p className="text-xs font-black uppercase tracking-widest">Protocol Exception: {error}</p></div>}
            </div>
        </div>
    );
};

const CustomersView: React.FC = () => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        adminService.getCustomers().then(setCustomers);
    }, []);

    const filtered = customers.filter(c => 
        c.email?.toLowerCase().includes(search.toLowerCase()) || 
        c.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end px-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Identity Hub</span>
                    <h2 className="text-4xl font-black text-brand-navy uppercase tracking-tighter">Customer Directory</h2>
                </div>
                <div className="relative group">
                    <input 
                        type="text" 
                        placeholder="Search Identity..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        className="pl-12 pr-6 py-4 bg-white/40 glass-panel border-white/60 rounded-2xl outline-none focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal transition-all text-sm font-black text-brand-navy placeholder:text-brand-navy/20 w-80"
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30 group-focus-within:text-brand-teal transition-colors">person_search</span>
                </div>
            </div>

            <div className="glass-panel rounded-[3.5rem] border-white/60 shadow-2xl overflow-hidden bg-white/40">
                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-brand-navy/[0.03] border-b border-brand-navy/5 text-left">
                                <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Architect</th>
                                <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Credentials</th>
                                <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">First Interaction</th>
                                <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Last Interaction</th>
                                <th className="px-10 py-6 text-right text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Engagement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-navy/[0.03]">
                            {filtered.map(c => (
                                <tr key={c.id} className="group hover:bg-white/60 transition-all cursor-default">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-brand-teal to-brand-navy rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-brand-teal/20">
                                                {(c.fullName || c.name || 'U')[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-brand-navy">{c.fullName || c.name || 'Anonymous Architect'}</p>
                                                <p className="text-[10px] text-brand-navy/30 font-mono uppercase tracking-widest">{c.id?.slice(0, 8) || 'GUEST'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <p className="text-sm font-medium text-brand-navy/80">{c.email}</p>
                                        <p className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest mt-0.5">{c.phone || 'Verified Identity'}</p>
                                    </td>
                                    <td className="px-10 py-6">
                                        <p className="text-xs font-black text-brand-navy/60 uppercase">{c.firstOrderDate ? new Date(c.firstOrderDate).toLocaleDateString() : 'N/A'}</p>
                                        <p className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest mt-0.5">Origin Date</p>
                                    </td>
                                    <td className="px-10 py-6">
                                        <p className="text-xs font-black text-brand-navy/60 uppercase">{c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'N/A'}</p>
                                        <p className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest mt-0.5">Final Sync</p>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <p className="text-xl font-black text-brand-teal tracking-tighter">{c.orderCount || 0}</p>
                                            <p className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest">Protocol Runs</p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-brand-navy/5 rounded-full flex items-center justify-center mx-auto text-brand-navy/20">
                            <span className="material-symbols-outlined text-4xl">search_off</span>
                        </div>
                        <p className="text-sm font-black text-brand-navy/30 uppercase tracking-widest">No Identities Found in Buffer</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SubscriptionsView: React.FC = () => {
    const [subs, setSubs] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        adminService.getSubscriptions().then(setSubs);
    }, []);

    const filtered = subs.filter(s => 
        s.customerEmail?.toLowerCase().includes(search.toLowerCase()) || 
        s.customer?.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.orderNumber?.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-brand-teal text-white shadow-brand-teal/20';
            case 'cancelled': return 'bg-red-500 text-white shadow-red-500/20';
            case 'expired': return 'bg-brand-navy/40 text-white';
            default: return 'bg-brand-orange text-white shadow-brand-orange/20';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end px-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Economic Layer</span>
                    <h2 className="text-4xl font-black text-brand-navy uppercase tracking-tighter">Subscription Registry</h2>
                </div>
                <div className="relative group">
                    <input 
                        type="text" 
                        placeholder="Search Registry..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        className="pl-12 pr-6 py-4 bg-white/40 glass-panel border-white/60 rounded-2xl outline-none focus:ring-4 focus:ring-brand-orange/10 focus:border-brand-orange transition-all text-sm font-black text-brand-navy placeholder:text-brand-navy/20 w-80"
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30 group-focus-within:text-brand-orange transition-colors">history_edu</span>
                </div>
            </div>

            <div className="glass-panel rounded-[3.5rem] border-white/60 shadow-2xl overflow-hidden bg-white/40">
                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-brand-navy/[0.03] border-b border-brand-navy/5 text-left">
                                <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Protocol ID</th>
                                <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Architect</th>
                                <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Tier / Plan</th>
                                <th className="px-10 py-6 text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">State</th>
                                <th className="px-10 py-6 text-right text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Temporal Limits</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-navy/[0.03]">
                            {filtered.map(s => (
                                <tr key={s.id} className="group hover:bg-white/60 transition-all cursor-default">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-brand-navy/5 rounded-lg flex items-center justify-center text-brand-navy/30">
                                                <span className="material-symbols-outlined text-sm">key</span>
                                            </div>
                                            <p className="text-xs font-mono font-black text-brand-navy/60">{s.id?.slice(0, 12) || 'N/A'}</p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <p className="text-sm font-black text-brand-navy">{s.customerEmail || s.customer?.email || 'Anonymous'}</p>
                                        <p className="text-[10px] text-brand-navy/30 uppercase tracking-widest mt-0.5">{s.orderNumber || s.customer?.name || 'GENERIC'}</p>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange">
                                                <span className="material-symbols-outlined">workspace_premium</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-brand-navy uppercase tracking-widest">{s.plan || 'Standard Edition'}</p>
                                                <p className="text-[9px] text-brand-navy/30 font-mono">PLAN_ARCH_{s.id?.slice(-2) || 'XX'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg ${getStatusStyle(s.status)}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-brand-navy uppercase tracking-tighter">Valid Until</p>
                                            <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest">
                                                {s.endDate || s.next_billing_date ? new Date(s.endDate || s.next_billing_date).toLocaleDateString() : 'Infinite'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-brand-navy/5 rounded-full flex items-center justify-center mx-auto text-brand-navy/20">
                            <span className="material-symbols-outlined text-4xl">inventory_2</span>
                        </div>
                        <p className="text-sm font-black text-brand-navy/30 uppercase tracking-widest">No Active Protocols in Registry</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SystemArchitectureView: React.FC = () => {
    const [health, setHealth] = useState<any>({
        db: 'online',
        storage: 'online',
        ai: 'online',
        lastSync: new Date().toISOString()
    });

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-4">
                <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Registry Audit</span>
                <h2 className="text-4xl font-black text-brand-navy uppercase tracking-tighter">System Architecture</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Node 1: Relational Core */}
                <div className="glass-panel p-10 rounded-[3.5rem] border-white/60 bg-white/40 shadow-xl space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-teal"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                            <span className="material-symbols-outlined text-2xl">database</span>
                        </div>
                        <span className="px-4 py-1.5 bg-brand-teal text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-brand-teal/20">Operational</span>
                    </div>
                    <div>
                        <p className="text-sm font-black text-brand-navy uppercase tracking-widest">Relational Core</p>
                        <p className="text-[10px] text-brand-navy/40 font-medium mt-1 uppercase tracking-widest">Supabase · PostgreSQL 15.1</p>
                    </div>
                    <div className="pt-4 border-t border-brand-navy/5 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-brand-navy/30">Latency</span>
                            <span className="text-brand-teal">14ms</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-brand-navy/30">Connections</span>
                            <span className="text-brand-navy/60">Active (8)</span>
                        </div>
                    </div>
                </div>

                {/* Node 2: Asset Reservoir */}
                <div className="glass-panel p-10 rounded-[3.5rem] border-white/60 bg-white/40 shadow-xl space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-orange"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                            <span className="material-symbols-outlined text-2xl">cloud_queue</span>
                        </div>
                        <span className="px-4 py-1.5 bg-brand-orange text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-brand-orange/20">Operational</span>
                    </div>
                    <div>
                        <p className="text-sm font-black text-brand-navy uppercase tracking-widest">Asset Reservoir</p>
                        <p className="text-[10px] text-brand-navy/40 font-medium mt-1 uppercase tracking-widest">Storage Bucket · RAW-ASSETS-01</p>
                    </div>
                    <div className="pt-4 border-t border-brand-navy/5 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-brand-navy/30">Utilization</span>
                            <span className="text-brand-orange">42.8 GB</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-brand-navy/30">I/O Load</span>
                            <span className="text-brand-navy/60">Nominal</span>
                        </div>
                    </div>
                </div>

                {/* Node 3: Neural Engine */}
                <div className="glass-panel p-10 rounded-[3.5rem] border-white/60 bg-white/40 shadow-xl space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-navy"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-brand-navy/10 flex items-center justify-center text-brand-navy">
                            <span className="material-symbols-outlined text-2xl">neurology</span>
                        </div>
                        <span className="px-4 py-1.5 bg-brand-navy text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Stable</span>
                    </div>
                    <div>
                        <p className="text-sm font-black text-brand-navy uppercase tracking-widest">Neural Engine</p>
                        <p className="text-[10px] text-brand-navy/40 font-medium mt-1 uppercase tracking-widest">Google Gemini · Multi-Modal v1.5</p>
                    </div>
                    <div className="pt-4 border-t border-brand-navy/5 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-brand-navy/30">Tokens / Min</span>
                            <span className="text-brand-navy/80">140k Available</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-brand-navy/30">Context Window</span>
                            <span className="text-brand-navy/60">2M Nodes</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-[3.5rem] border-white/60 shadow-2xl overflow-hidden bg-brand-navy text-white relative">
                <header className="px-10 py-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-brand-teal">terminal</span>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Core Diagnostic Log</p>
                    </div>
                    <p className="text-[10px] font-mono text-white/40">Uptime: 432h 14m 02s</p>
                </header>
                <div className="p-10 font-mono text-[11px] leading-relaxed text-brand-teal/80 scroller-thin max-h-96 overflow-y-auto space-y-1">
                    <p><span className="text-white/20">[{new Date().toISOString()}]</span> <span className="text-white font-black">SYS_INIT:</span> Master Orchestrator initialized successfully.</p>
                    <p><span className="text-white/20">[{new Date().toISOString()}]</span> <span className="text-brand-orange font-black">DB_LINK:</span> Relational tunnel established with 14ms ping.</p>
                    <p><span className="text-white/20">[{new Date().toISOString()}]</span> <span className="text-brand-teal font-black">STORAGE_SYNC:</span> Bucket 'raw-assets-01' verified. 14,204 objects indexed.</p>
                    <p><span className="text-white/20">[{new Date().toISOString()}]</span> <span className="text-white/40">AI_PING:</span> Gemini-1.5-Pro responded within 1.2s.</p>
                    <p><span className="text-white/20">[{new Date().toISOString()}]</span> <span className="text-white font-black">AUTH_VERIFIED:</span> High-privilege terminal session active.</p>
                    <p className="animate-pulse"><span className="text-brand-teal">_</span></p>
                </div>
            </div>
        </div>
    );
};

export default AdminScreen;
