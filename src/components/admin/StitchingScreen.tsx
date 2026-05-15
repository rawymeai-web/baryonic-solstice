
import React, { useState, useEffect } from 'react';
import type { Language, ProductSize } from '@/types';
import * as adminService from '@/services/adminService';
import * as stitchingService from '@/services/stitchingService';
import * as fileService from '@/services/fileService';
import { cropImageToSize } from '@/utils/imageUtils';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

// @ts-ignore
const JSZip = typeof window !== 'undefined' ? (window as any).JSZip : null;

interface LoadedImage {
    file: File;
    dataUrl: string;
    width: number;
    height: number;
}

interface StitchedResults {
    coverUrl: string;
    spreadUrls: string[];
    coverBlob: Blob;
    spreadBlobs: Blob[];
    pdfBlob: Blob;
}

const GlassSection: React.FC<{ title: string; icon: string; children: React.ReactNode; color?: string }> = ({ title, icon, children, color = 'text-brand-navy' }) => (
    <div className="glass-panel p-10 rounded-[3.5rem] border-white/60 bg-white/40 shadow-xl space-y-8 relative overflow-hidden">
        <div className="flex items-center gap-4 border-b border-brand-navy/5 pb-6">
            <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center ${color} shadow-sm border border-white/60`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-brand-navy">{title}</h3>
        </div>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

export const StitchingScreen: React.FC<{ onExit: () => void; language: Language; }> = ({ onExit, language }) => {
    const [orderNumber, setOrderNumber] = useState('');
    const [bookTitle, setBookTitle] = useState('');
    const [childAge, setChildAge] = useState('');
    const [childName, setChildName] = useState('');
    const [secondCharacterName, setSecondCharacterName] = useState<string | undefined>(undefined);
    const [selectedSizeId, setSelectedSizeId] = useState<string>('');
    const [allSizes, setAllSizes] = useState<ProductSize[]>([]);

    const [spreadImages, setSpreadImages] = useState<LoadedImage[]>([]);
    const [storyTexts, setStoryTexts] = useState<string[]>([]);
    const [spreadLayouts, setSpreadLayouts] = useState<any[]>([]); // New state for full metadata

    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [error, setError] = useState('');
    const [stitchedResults, setStitchedResults] = useState<StitchedResults | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);

    useEffect(() => {
        setSelectedLanguage(language);
    }, [language]);

    useEffect(() => {
        adminService.getProductSizes().then(sizes => {
            setAllSizes(sizes);
            if (sizes.length > 0) setSelectedSizeId(sizes[0].id);
        });
    }, []);

    useEffect(() => {
        return () => {
            if (stitchedResults) {
                URL.revokeObjectURL(stitchedResults.coverUrl);
                stitchedResults.spreadUrls.forEach(url => URL.revokeObjectURL(url));
            }
        };
    }, [stitchedResults]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const id = e.target.id;
        setError('');
        try {
            if (id === 'cover-upload' && files[0]) {
                const img = await loadImage(files[0]);
                setCoverImage(img);
            } else if (id === 'spreads-upload') {
                const loaded = await Promise.all(Array.from(files).map(loadImage));
                loaded.sort((a, b) => a.file.name.localeCompare(b.file.name));
                setSpreadImages(loaded);
            } else if (id === 'manifest-upload' && files[0]) {
                const file = files[0];
                const content = await file.text();
                try {
                    const manifest = JSON.parse(content);
                    if (manifest.orderNumber) setOrderNumber(manifest.orderNumber);
                    if (manifest.storySummary) {
                        if (manifest.storySummary.title) setBookTitle(manifest.storySummary.title);
                        if (manifest.storySummary.childName) setChildName(manifest.storySummary.childName);
                        if (manifest.storySummary.childAge) setChildAge(manifest.storySummary.childAge);
                        if (manifest.storySummary.secondCharacterName) setSecondCharacterName(manifest.storySummary.secondCharacterName);
                        if (manifest.storySummary.size) {
                            const sid = manifest.storySummary.size;
                            if (allSizes.some(s => s.id === sid)) setSelectedSizeId(sid);
                        }
                    }
                    if (manifest.pages && Array.isArray(manifest.pages)) {
                        setStoryTexts(manifest.pages.map((p: any) => p.text));
                        setSpreadLayouts(manifest.pages);
                    } else if (manifest.storyData?.spreads) {
                        setStoryTexts(manifest.storyData.spreads.map((s: any) => s.text || (s.leftText + " " + (s.rightText || "")).trim()));
                        setSpreadLayouts(manifest.storyData.spreads);
                    }
                } catch (e) { console.error("Invalid Manifest JSON", e); setError("Invalid JSON Manifest"); }

            } else if (id === 'story-upload' && files[0]) {
                const file = files[0];
                const content = await file.text();
                const cleanPages = content.split(/\[Page \d+\]/).slice(1).map(p => p.trim()).filter(Boolean);
                if (cleanPages.length > 0) {
                    setStoryTexts(cleanPages);
                } else {
                    setStoryTexts(content.split(/\n\s*\n/).filter(line => line.length > 20));
                }
            }
        } catch (err) { setError(`Error loading file.`); }
        e.target.value = '';
    };

    const fetchOrderFromCloud = async () => {
        if (!orderNumber) {
            setError("Please enter an Order Number first.");
            return;
        }
        setIsProcessing(true);
        setError('');
        setProcessingStatus(`Fetching order ${orderNumber} from cloud...`);
        try {
            const order = await adminService.getOrderById(orderNumber);
            if (!order || !order.storyData) {
                throw new Error("Order not found or has no story data.");
            }

            const sd = order.storyData;
            setBookTitle(sd.title || '');
            setChildName(sd.childName || '');
            setChildAge(sd.childAge?.toString() || '');
            setSecondCharacterName(sd.secondCharacterName);
            if (sd.size && allSizes.some(s => s.id === sd.size)) {
                setSelectedSizeId(sd.size);
            }

            // Extract text from pages
            if (sd.spreads && Array.isArray(sd.spreads)) {
                setStoryTexts(sd.spreads.map((s: any) => s.text || (s.leftText + " " + (s.rightText || "")).trim()));
                setSpreadLayouts(sd.spreads);
            } else if (sd.pages && Array.isArray(sd.pages)) {
                setStoryTexts(sd.pages.map((p: any) => p.text));
            }

            // Fetch Cover
            if (sd.coverImageUrl) {
                setProcessingStatus("Loading cover asset...");
                const img = await fetchCloudImage(sd.coverImageUrl, "cover.jpg");
                setCoverImage(img);
            }

            // Fetch Spreads
            const spreadUrls = (sd.spreads || [])
                .filter((s: any) => s.illustrationUrl)
                .map((s: any) => s.illustrationUrl);
            
            if (spreadUrls.length > 0) {
                setProcessingStatus(`Loading ${spreadUrls.length} spreads...`);
                const loadedSpreads = await Promise.all(
                    spreadUrls.map((url: string, i: number) => fetchCloudImage(url, `spread_${i+1}.jpg`))
                );
                setSpreadImages(loadedSpreads);
            }

            setProcessingStatus("Ready to execute factory sequence.");
        } catch (err: any) {
            console.error(err);
            setError(`Cloud Fetch Failed: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const fetchCloudImage = async (url: string, filename: string): Promise<LoadedImage> => {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch ${filename}`);
        const blob = await resp.blob();
        const file = new File([blob], filename, { type: 'image/jpeg' });
        return await loadImage(file);
    };

    const loadImage = (file: File): Promise<LoadedImage> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                const img = new Image();
                img.onload = () => resolve({ file, dataUrl, width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = () => reject(new Error(`Failed to decode image ${file.name}`));
                img.src = dataUrl;
            };
            reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
            reader.readAsDataURL(file);
        });
    };

    const handleGenerate = async () => {
        const sizeConfig = allSizes.find(s => s.id === selectedSizeId); if (!sizeConfig) throw new Error('Size not found');

        const missing = [];
        if (!coverImage) missing.push("Cover Image");
        if (spreadImages.length === 0) missing.push("Spread Images");
        if (storyTexts.length === 0) missing.push("Story Text");
        if (!orderNumber) missing.push("Order Number");
        if (!bookTitle) missing.push("Book Title");
        if (!childAge) missing.push("Child Age");

        if (missing.length > 0) {
            setError(`Missing Sequence Nodes: ${missing.join(', ')}`);
            return;
        }

        setIsProcessing(true);
        const DPI = 300;
        const PX_PER_CM = DPI / 2.54;

        try {
            setProcessingStatus("Stitching cover architecture...");
            const cw = Math.round(sizeConfig.cover.totalWidthCm * PX_PER_CM);
            const ch = Math.round(sizeConfig.cover.totalHeightCm * PX_PER_CM);
            let coverData = coverImage!.dataUrl;
            // For English books, we need to flip the cover image so the heroes (generated on the left) 
            // appear on the front cover (which is the right side in LTR layouts).
            if (language !== 'ar') {
                try {
                    coverData = await fileService.flipImageHorizontal(coverData);
                } catch (e) {
                    console.error("Failed to flip cover for factory sequence", e);
                }
            }
            const croppedCover = await cropImageToSize(coverData, cw, ch);
            const coverBase = await new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = croppedCover; });

            const { cover, coverContent } = sizeConfig;
            const overlays: any[] = [];

            const titleB64 = await fileService.createTextImage({ title: bookTitle }, language);
            const titleImg = await new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = titleB64; });
            const scw = (cover.totalWidthCm - cover.spineWidthCm) / 2 * PX_PER_CM;
            const spw = cover.spineWidthCm * PX_PER_CM;
            const ttop = coverContent.title.fromTopCm * PX_PER_CM;
            const tw = coverContent.title.widthCm * PX_PER_CM;
            const th = titleImg.naturalHeight * (tw / titleImg.naturalWidth);
            const tx = language === 'ar' ? (scw - tw) / 2 : scw + spw + (scw - tw) / 2;
            overlays.push({ element: titleImg, styles: { position: 'absolute', top: `${ttop}px`, left: `${tx}px`, width: `${tw}px`, height: `${th}px` } });

            const bcl = language === 'ar' ? (sizeConfig.cover.totalWidthCm * PX_PER_CM) - (coverContent.barcode.fromRightCm * PX_PER_CM) - (coverContent.barcode.widthCm * PX_PER_CM) : scw - (coverContent.barcode.fromRightCm * PX_PER_CM) - (coverContent.barcode.widthCm * PX_PER_CM);
            overlays.push({ element: fileService.createBarcodeHtmlElement(orderNumber, coverContent.barcode.widthCm * PX_PER_CM, coverContent.barcode.heightCm * PX_PER_CM), styles: { position: 'absolute', top: `${coverContent.barcode.fromTopCm * PX_PER_CM}px`, left: `${bcl}px` } });

            const backCoverX = language === 'ar' ? scw + spw : 0;
            const backCoverWidth = scw;
            const qrSize = 2.5 * PX_PER_CM;
            const qrX = backCoverX + (backCoverWidth - qrSize) / 2;
            const qrY = ch * 0.8;

            const qrImg = await fileService.createQrCodeElement(orderNumber, qrSize, qrSize);
            overlays.push({ element: qrImg, styles: { position: 'absolute', top: `${qrY}px`, left: `${qrX}px`, width: `${qrSize}px`, height: `${qrSize}px` } });

            const coverBlob = await stitchingService.stitchImageWithOverlays(coverBase, overlays);

            const spreadBlobs: Blob[] = [];
            const pw = Math.round(sizeConfig.page.widthCm * 2 * PX_PER_CM);
            const ph = Math.round(sizeConfig.page.heightCm * PX_PER_CM);
            const stripWidthCm = 2.5; 
            const stripWidthPx = Math.round(stripWidthCm * PX_PER_CM);
            const totalSpreadWidthPx = pw + stripWidthPx;

            for (let i = 0; i < spreadImages.length; i++) {
                setProcessingStatus(`Injecting spread ${i + 1} logic...`);
                const cropped = await cropImageToSize(spreadImages[i].dataUrl, pw, ph);
                const sbase = await new Promise<HTMLImageElement>((res) => { const img = new Image(); img.onload = () => res(img); img.src = cropped; });
                
                const layout = spreadLayouts[i] || {};
                const txt = storyTexts[i] || "";
                const overlays: any[] = [];

                if (txt) {
                    const el = fileService.createPrintableTextBlockElement(txt, language, i, childAge, childName, true);
                    
                    // Respect layout offsets from Editor
                    const side = layout.textSide || (language === 'ar' ? 'right' : 'left');
                    const xPerc = layout.textOffsetX !== undefined ? layout.textOffsetX : (side === 'left' ? 25 : 75);
                    const yPerc = layout.textOffsetY !== undefined ? layout.textOffsetY : 50;
                    const scale = (layout.textScale || 100) / 100;

                    overlays.push({ 
                        element: el, 
                        styles: { 
                            position: 'absolute', 
                            top: `${yPerc}%`, 
                            left: `${xPerc}%`, 
                            transform: `translate(-50%, -50%) scale(${scale})`, 
                            maxWidth: '35%',
                            transformOrigin: 'center center'
                        } 
                    });
                }

                const stripEl = fileService.createMetadataStripElement(orderNumber, i, stripWidthPx, ph);
                overlays.push({ element: stripEl, styles: { position: 'absolute', top: '0', right: '0' } });

                spreadBlobs.push(await stitchingService.stitchImageWithOverlays(sbase, overlays, totalSpreadWidthPx, ph));
            }

            setProcessingStatus("Compiling Master PDF...");
            const pdfSizeConfig = {
                ...sizeConfig,
                page: {
                    ...sizeConfig.page,
                    widthCm: (sizeConfig.page.widthCm * 2) + stripWidthCm
                }
            };

            const pages = storyTexts.map((text, i) => ({ text, pageNumber: i + 1 }));

            const pdfBlob = await fileService.generateStitchedPdf(
                coverBlob,
                spreadBlobs,
                pdfSizeConfig,
                { title: bookTitle, childName, childAge, secondCharacterName },
                pages,
                selectedLanguage,
                orderNumber,
                true // skipTextOverlay: spreads are already stitched with text
            );

            setStitchedResults({
                coverUrl: URL.createObjectURL(coverBlob),
                spreadUrls: spreadBlobs.map(b => URL.createObjectURL(b)),
                coverBlob, spreadBlobs, pdfBlob
            });
        } catch (err: any) {
            console.error(err);
            setError(`Stitching Failed: ${err?.message || err}`);
        } finally { setIsProcessing(false); setProcessingStatus(''); }
    };

    const handleDownloadPackage = async () => {
        if (!stitchedResults) return;
        setIsProcessing(true);
        setProcessingStatus("Zipping...");
        try {
            const zip = new JSZip();
            zip.file(`${orderNumber}_cover.jpg`, stitchedResults.coverBlob);
            stitchedResults.spreadBlobs.forEach((b, i) => zip.file(`${orderNumber}_spread_${i + 1}.jpg`, b));
            zip.file(`${orderNumber}_production.pdf`, stitchedResults.pdfBlob);
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            const url = URL.createObjectURL(content);
            link.href = url;
            link.download = `${orderNumber}_Rawy_Production.zip`;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (err) { setError('Failed to create ZIP.'); } finally { setIsProcessing(false); setProcessingStatus(''); }
    };

    const handleUploadToCloud = async () => {
        if (!stitchedResults || !orderNumber) return;
        setIsProcessing(true);
        setProcessingStatus("Syncing to Cloud Reservoir...");
        try {
            const zip = new JSZip();
            zip.file(`${orderNumber}_cover.jpg`, stitchedResults.coverBlob);
            stitchedResults.spreadBlobs.forEach((b, i) => zip.file(`${orderNumber}_spread_${i + 1}.jpg`, b));
            zip.file(`${orderNumber}_production.pdf`, stitchedResults.pdfBlob);
            const content = await zip.generateAsync({ type: "blob" });

            const url = await fileService.uploadOrderFiles(orderNumber, content);
            if (url) {
                await adminService.updateOrderPackageUrl(orderNumber, url);
                alert(`Cloud Sync Success: ${orderNumber}`);
            } else {
                alert("Cloud Sync failed. Check registry.");
            }
        } catch (err: any) {
            setError('Cloud Upload Failed: ' + err.message);
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };

    if (stitchedResults) return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-2">
                <span className="material-symbols-outlined text-brand-teal text-6xl">verified</span>
                <h2 className="text-4xl font-black text-brand-navy uppercase tracking-tighter">Production Ready</h2>
                <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Master assets compiled for Order: {orderNumber}</p>
            </div>

            <div className="glass-panel p-10 rounded-[4rem] border-white/60 bg-white/40 shadow-2xl space-y-8">
                {(() => {
                    const selectedSize = allSizes.find(s => s.id === selectedSizeId);
                    const ratio = selectedSize ? `${selectedSize.cover.totalWidthCm} / ${selectedSize.cover.totalHeightCm}` : '2/1';
                    return (
                        <div 
                            className="rounded-[2.5rem] overflow-hidden border-4 border-white shadow-inner relative group"
                            style={{ aspectRatio: ratio }}
                        >
                            <img src={stitchedResults.coverUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    );
                })()}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <button 
                        onClick={() => setStitchedResults(null)} 
                        className="px-8 py-5 rounded-3xl border-4 border-white glass-panel text-brand-navy/40 font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-brand-navy transition-all"
                    >
                        Back to Editor
                    </button>
                    <button 
                        onClick={handleDownloadPackage} 
                        className="px-8 py-5 rounded-3xl bg-brand-navy text-white font-black uppercase text-[10px] tracking-widest shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                        disabled={isProcessing}
                    >
                        <span className="material-symbols-outlined">{isProcessing ? 'sync' : 'download'}</span>
                        {isProcessing ? 'Compiling...' : 'Export Local ZIP'}
                    </button>
                    <button 
                        onClick={handleUploadToCloud} 
                        className="px-8 py-5 rounded-3xl bg-brand-orange text-white font-black uppercase text-[10px] tracking-widest shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                        disabled={isProcessing}
                    >
                        <span className="material-symbols-outlined">cloud_upload</span>
                        {isProcessing ? 'Syncing...' : 'Sync to Reservoir'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-brand-navy text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                    <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
                    Production Terminal
                </div>
                <h2 className="text-5xl font-black text-brand-navy uppercase tracking-tighter">Manual Stitching Engine</h2>
                <p className="text-[11px] font-black text-brand-navy/30 uppercase tracking-[0.4em]">Construct high-fidelity print packages from raw assets</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-8">
                    <GlassSection title="Order Intelligence" icon="dataset" color="text-brand-orange">
                        <div className="grid grid-cols-1 gap-5">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Order Identity</label>
                                    <input 
                                        type="text" 
                                        placeholder="RWY-XXXXX" 
                                        value={orderNumber} 
                                        onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                                        className="w-full px-6 py-4 bg-white/60 border-2 border-white/80 rounded-2xl outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/5 transition-all text-sm font-black text-brand-navy" 
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button 
                                        onClick={fetchOrderFromCloud}
                                        disabled={isProcessing || !orderNumber}
                                        className="h-[54px] px-6 rounded-2xl bg-brand-navy text-white hover:bg-brand-navy/90 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg"
                                    >
                                        <span className="material-symbols-outlined text-sm">cloud_download</span>
                                        Fetch
                                    </Button>
                                </div>
                            </div>
                            {[
                                { label: 'Story Title', value: bookTitle, set: setBookTitle, placeholder: 'The Magical Journey' },
                                { label: 'Hero Name', value: childName, set: setChildName, placeholder: 'Child Name' },
                                { label: 'Target Age', value: childAge, set: setChildAge, placeholder: 'Age' }
                            ].map((field, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <label className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">{field.label}</label>
                                    <input 
                                        type="text" 
                                        value={field.value} 
                                        onChange={e => field.set(e.target.value)} 
                                        className="w-full px-6 py-4 bg-white/60 border-2 border-white/80 rounded-2xl outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/5 transition-all text-sm font-black text-brand-navy" 
                                        placeholder={field.placeholder} 
                                    />
                                </div>
                            ))}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Architectural Format</label>
                                <select 
                                    value={selectedSizeId} 
                                    onChange={e => setSelectedSizeId(e.target.value)} 
                                    className="w-full px-6 py-4 bg-white/60 border-2 border-white/80 rounded-2xl outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/5 transition-all text-sm font-black text-brand-navy appearance-none"
                                >
                                    {allSizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </GlassSection>
                </div>

                <div className="lg:col-span-7 space-y-8">
                    <GlassSection title="Asset Injection" icon="upload_file" color="text-brand-teal">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="flex flex-col items-center justify-center w-full h-48 border-4 border-dashed border-white/80 rounded-[2.5rem] bg-white/40 hover:bg-white/60 transition-all cursor-pointer group relative overflow-hidden">
                                    {coverImage ? (
                                        <img src={coverImage.dataUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                    ) : (
                                        <div className="text-center p-6">
                                            <span className="material-symbols-outlined text-4xl text-brand-teal/40 mb-2">image</span>
                                            <p className="text-[9px] font-black text-brand-navy/60 uppercase tracking-widest">Master Cover</p>
                                        </div>
                                    )}
                                    <input id="cover-upload" type="file" onChange={handleFileUpload} className="hidden" />
                                    <div className="absolute inset-0 bg-brand-teal/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </label>
                            </div>

                            <div className="space-y-4">
                                <label className="flex flex-col items-center justify-center w-full h-48 border-4 border-dashed border-white/80 rounded-[2.5rem] bg-white/40 hover:bg-white/60 transition-all cursor-pointer group relative overflow-hidden">
                                    <div className="text-center p-6 relative z-10">
                                        <span className="material-symbols-outlined text-4xl text-brand-teal/40 mb-2">collections</span>
                                        <p className="text-[9px] font-black text-brand-navy/60 uppercase tracking-widest">Gallery Spreads ({spreadImages.length})</p>
                                    </div>
                                    <input id="spreads-upload" type="file" multiple onChange={handleFileUpload} className="hidden" />
                                    <div className="absolute inset-0 bg-brand-teal/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="glass-panel p-6 rounded-3xl border-white/60 bg-white/40 relative group">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-[9px] font-black text-brand-navy uppercase tracking-widest">JSON Manifest</p>
                                    {orderNumber && <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse"></span>}
                                </div>
                                <input id="manifest-upload" type="file" onChange={handleFileUpload} className="text-[10px] w-full text-brand-navy/40" accept=".json" />
                            </div>

                            <div className="glass-panel p-6 rounded-3xl border-white/60 bg-white/40 relative group">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-[9px] font-black text-brand-navy uppercase tracking-widest">Narrative Script</p>
                                    {storyTexts.length > 0 && <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse"></span>}
                                </div>
                                <input id="story-upload" type="file" onChange={handleFileUpload} className="text-[10px] w-full text-brand-navy/40" accept=".txt" />
                            </div>
                        </div>
                    </GlassSection>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isProcessing}
                        className="w-full py-8 bg-brand-navy text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-2xl shadow-brand-navy/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-6 group"
                    >
                        {isProcessing ? (
                            <><Spinner /> <span className="animate-pulse">{processingStatus}</span></>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-3xl group-hover:rotate-180 transition-transform duration-700">settings_suggest</span>
                                Execute Factory Sequence
                            </>
                        )}
                    </button>
                    {error && <p className="text-brand-orange text-center text-[10px] font-black uppercase tracking-widest animate-bounce">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default StitchingScreen;
