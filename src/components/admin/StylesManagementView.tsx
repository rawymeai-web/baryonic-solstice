import React, { useState, useEffect } from 'react';
import { Spinner } from '../ui/Spinner';

interface ArtStyleItem {
  id: string;
  name: string;
  prompt: string;
  preview_url: string;
  raw_preview_url?: string;
  is_active: boolean;
  badge: string | null;
}

const BADGE_OPTIONS = [
  { value: '', label: 'No Badge (Standard)', color: 'bg-slate-100 text-slate-700' },
  { value: 'limited_time', label: '🔥 Limited Time (Seasonal)', color: 'bg-amber-500 text-white' },
  { value: 'new', label: '✨ New Release', color: 'bg-teal-500 text-white' },
  { value: 'leaving_soon', label: '⏳ Leaving Soon (FOMO)', color: 'bg-red-500 text-white' },
  { value: 'fan_favorite', label: '⭐ Fan Favorite', color: 'bg-indigo-500 text-white' },
  { value: 'exclusive', label: '💎 Exclusive VIP', color: 'bg-purple-500 text-white' }
];

export const StylesManagementView: React.FC = () => {
  const [styles, setStyles] = useState<ArtStyleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchStyles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/styles');
      const data = await res.json();
      if (data.styles) {
        setStyles(data.styles);
      }
    } catch (err) {
      console.error('Failed to load styles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStyles();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleActive = async (style: ArtStyleItem) => {
    const nextActive = !style.is_active;
    setSavingId(style.id);
    try {
      const res = await fetch('/api/admin/styles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: style.id,
          name: style.name,
          is_active: nextActive,
          badge: style.badge,
          preview_url: style.preview_url,
          prompt: style.prompt
        })
      });
      if (res.ok) {
        setStyles(prev => prev.map(s => s.id === style.id ? { ...s, is_active: nextActive } : s));
        showToast(`"${style.name}" is now ${nextActive ? 'Active (Visible)' : 'Inactive (Hidden)'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update style status');
    } finally {
      setSavingId(null);
    }
  };

  const handleBadgeChange = async (style: ArtStyleItem, newBadge: string) => {
    const badgeVal = newBadge || null;
    setSavingId(style.id);
    try {
      const res = await fetch('/api/admin/styles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: style.id,
          name: style.name,
          badge: badgeVal,
          preview_url: style.preview_url,
          is_active: style.is_active,
          prompt: style.prompt
        })
      });
      if (res.ok) {
        setStyles(prev => prev.map(s => s.id === style.id ? { ...s, badge: badgeVal } : s));
        showToast(`Badge updated for "${style.name}"`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update badge');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Spinner />
        <p className="text-xs font-bold text-brand-navy/50 uppercase tracking-widest mt-4">Loading Art Styles...</p>
      </div>
    );
  }

  const activeCount = styles.filter(s => s.is_active).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-[2.5rem] border border-white/60 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-brand-orange/10 text-brand-orange text-xs font-black uppercase tracking-wider rounded-full">
              Theme Selection Engine
            </span>
            <span className="px-3 py-1 bg-brand-teal/10 text-brand-teal text-xs font-bold rounded-full">
              {activeCount} Active Styles Live
            </span>
          </div>
          <h2 className="text-3xl font-black text-brand-navy tracking-tight">Art Styles & Marketing Badges</h2>
          <p className="text-sm text-brand-navy/60 mt-1 max-w-2xl">
            Enable or disable styles for the customer journey, rotate seasonal aesthetics, or attach high-converting marketing badges (Limited Time, Leaving Soon, New Release).
          </p>
        </div>

        <button 
          onClick={fetchStyles}
          className="px-5 py-3 rounded-2xl bg-white text-brand-navy border border-brand-navy/10 font-bold hover:bg-brand-navy/5 transition-all text-sm flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Refresh Catalog
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-brand-navy text-white px-6 py-4 rounded-2xl shadow-2xl border border-brand-orange/40 flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-brand-orange">check_circle</span>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Grid of Styles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {styles.map(style => {
          const isSaving = savingId === style.id;
          const currentBadgeObj = BADGE_OPTIONS.find(b => b.value === (style.badge || '')) || BADGE_OPTIONS[0];

          return (
            <div 
              key={style.id || style.name}
              className={`glass-panel rounded-[2rem] overflow-hidden border transition-all duration-300 flex flex-col ${
                style.is_active 
                  ? 'border-brand-orange/30 shadow-lg bg-white/90 ring-1 ring-brand-orange/10' 
                  : 'border-slate-200 shadow-sm opacity-60 bg-white/40 grayscale-[40%]'
              }`}
            >
              {/* Card Image Header */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                <img 
                  src={style.preview_url} 
                  alt={style.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Active Indicator Chip */}
                <div className="absolute top-4 left-4 z-10">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md ${
                    style.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white/80'
                  }`}>
                    {style.is_active ? '● Active Live' : '○ Hidden'}
                  </span>
                </div>

                {/* Badge Chip if attached */}
                {style.badge && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-lg ${currentBadgeObj.color}`}>
                      {currentBadgeObj.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Details & Controls */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-black text-brand-navy tracking-tight">{style.name}</h3>
                  </div>
                  <p className="text-xs text-brand-navy/70 line-clamp-3 leading-relaxed bg-brand-navy/5 p-3 rounded-xl">
                    {style.prompt}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-brand-navy/5">
                  {/* Badge Dropdown */}
                  <div>
                    <label className="text-[10px] font-black text-brand-navy/50 uppercase tracking-wider block mb-1.5">
                      Marketing Badge / Highlight
                    </label>
                    <select
                      value={style.badge || ''}
                      onChange={(e) => handleBadgeChange(style, e.target.value)}
                      disabled={isSaving}
                      className="w-full text-xs font-bold text-brand-navy bg-white border border-brand-navy/15 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-orange/30"
                    >
                      {BADGE_OPTIONS.map(b => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Toggle Active Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-navy/70">
                      {style.is_active ? 'Visible in Story Creator' : 'Hidden from Creator'}
                    </span>
                    <button
                      onClick={() => handleToggleActive(style)}
                      disabled={isSaving}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 ${
                        style.is_active 
                          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {isSaving ? (
                        <span className="text-[10px]">Saving...</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">
                            {style.is_active ? 'visibility_off' : 'visibility'}
                          </span>
                          {style.is_active ? 'Disable' : 'Enable'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
