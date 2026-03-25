
'use client';

import React, { useState, useEffect } from 'react';
import type { Language, ProductSize } from '../../types';
import * as adminService from '../../services/adminService';
import * as stitchingService from '../../services/stitchingService';
import * as fileService from '../../services/fileService';
import { cropImageToSize } from '../../utils/imageUtils';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

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

const Section: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
        <h3 className="text-xl font-bold text-brand-coral border-b pb-2">{title}</h3>
        {children}
    </div>
);

export const StitchingScreen: React.FC<{ language: Language, onExit: () => void }> = ({ language, onExit }) => {
    const [orderNumber, setOrderNumber] = useState('');
    const [bookTitle, setBookTitle] = useState('');
    const [childAge, setChildAge] = useState('');
    const [childName, setChildName] = useState('');
    const [selectedSizeId, setSelectedSizeId] = useState<string>('');
    const [allSizes, setAllSizes] = useState<ProductSize[]>([]);

    const [coverImage, setCoverImage] = useState<LoadedImage | null>(null);
    const [spreadImages, setSpreadImages] = useState<LoadedImage[]>([]);
    const [storyTexts, setStoryTexts] = useState<string[]>([]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [error, setError] = useState('');
    const [stitchedResults, setStitchedResults] = useState<StitchedResults | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);

    useEffect(() => {
        adminService.getProductSizes().then(sizes => {
            setAllSizes(sizes);
            if (sizes.length > 0) setSelectedSizeId(sizes[0].id);
        });
    }, []);

    const loadImage = (file: File): Promise<LoadedImage> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                const img = new Image();
                img.onload = () => resolve({ file, dataUrl, width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = reject;
                img.src = dataUrl;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const id = e.target.id;
        try {
            if (id === 'cover-upload' && files[0]) {
                setCoverImage(await loadImage(files[0]));
            } else if (id === 'spreads-upload') {
                const loaded = await Promise.all(Array.from(files).map(loadImage));
                loaded.sort((a, b) => a.file.name.localeCompare(b.file.name));
                setSpreadImages(loaded);
            }
        } catch (err) { setError(`Error loading file.`); }
    };

    const handleGenerate = async () => {
        const sizeConfig = allSizes.find(s => s.id === selectedSizeId);
        if (!coverImage || spreadImages.length === 0 || !sizeConfig) {
            setError("Missing assets");
            return;
        }

        setIsProcessing(true);
        try {
            setProcessingStatus("Stitching cover...");
            const DPI = 300;
            const PX_PER_CM = DPI / 2.54;
            const cw = Math.round(sizeConfig.cover.totalWidthCm * PX_PER_CM);
            const ch = Math.round(sizeConfig.cover.totalHeightCm * PX_PER_CM);

            const croppedCover = await cropImageToSize(coverImage.dataUrl, cw, ch);
            const coverBase = await new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = croppedCover; });

            const coverBlob = await stitchingService.stitchImageWithOverlays(coverBase, []);

            setProcessingStatus("Stitching spreads...");
            const spreadBlobs: Blob[] = [];
            const sw = Math.round(sizeConfig.page.widthCm * 2 * PX_PER_CM);
            const sh = Math.round(sizeConfig.page.heightCm * PX_PER_CM);

            for (let i = 0; i < spreadImages.length; i++) {
                const cropped = await cropImageToSize(spreadImages[i].dataUrl, sw, sh);
                const sbase = await new Promise<HTMLImageElement>((res) => { const img = new Image(); img.onload = () => res(img); img.src = cropped; });
                spreadBlobs.push(await stitchingService.stitchImageWithOverlays(sbase, []));
            }

            setProcessingStatus("Generating PDF...");
            const pages = storyTexts.map((text, i) => ({ text, pageNumber: i + 1 }));
            const pdfBlob = await fileService.generateStitchedPdf(
                coverBlob,
                spreadBlobs,
                sizeConfig,
                { title: bookTitle, childName, childAge },
                pages,
                selectedLanguage as 'ar' | 'en',
                orderNumber
            );

            setStitchedResults({
                coverUrl: URL.createObjectURL(coverBlob),
                spreadUrls: spreadBlobs.map(b => URL.createObjectURL(b)),
                coverBlob, spreadBlobs, pdfBlob
            });
        } catch (err: any) {
            setError(`Stitching Failed: ${err.message}`);
        } finally { setIsProcessing(false); }
    };

    if (stitchedResults) return (
        <div className="max-w-4xl mx-auto space-y-8 animate-enter-forward">
            <h2 className="text-3xl font-bold text-brand-navy text-center">✅ Ready!</h2>
            <div className="flex gap-4 justify-center">
                <Button onClick={() => { setStitchedResults(null); }} variant="outline">Back</Button>
                <Button onClick={() => { }} className="px-8 py-4">Download ZIP</Button>
                <Button onClick={onExit} variant="outline" className="px-8 py-4 text-red-500">Exit Admin</Button>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-brand-navy">🧵 Stitching Module</h2>
                <Button onClick={onExit} variant="outline" className="text-sm">Exit Admin</Button>
            </div>
            <Section title="Asset Upload">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold mb-2">Cover</label>
                        <input id="cover-upload" type="file" onChange={handleFileUpload} className="w-full" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-2">Spreads</label>
                        <input id="spreads-upload" type="file" multiple onChange={handleFileUpload} className="w-full" />
                    </div>
                </div>
            </Section>
            <Button onClick={handleGenerate} className="w-full py-4 text-lg" disabled={isProcessing}>
                {isProcessing ? processingStatus : "Process Production Assets"}
            </Button>
            {error && <p className="text-red-500 text-center">{error}</p>}
        </div>
    );
};

export default StitchingScreen;
