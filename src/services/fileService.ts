
import type { StoryData, ShippingDetails, Language, ProductSize, Page } from '@/types';
import { getProductSizeById } from './adminService';
import * as imageStore from './imageStore';
import QRCode from 'qrcode';

// Access globals lazily to avoid "undefined" errors on early module execution
const getJsPDF = async () => {
    // @ts-ignore
    const jspdf = typeof window !== 'undefined' ? (window as any).jspdf : null;
    if (jspdf && jspdf.jsPDF) return jspdf.jsPDF;
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).jsPDF) return (window as any).jsPDF;

    try {
        const mod = await import('jspdf') as any;
        const jsPDF = mod.jsPDF || (mod.default && mod.default.jsPDF) || mod.default;
        if (jsPDF) return jsPDF;
    } catch (e) {
        console.error("Failed to dynamically import jspdf:", e);
    }

    console.error("jsPDF library not found.");
    return null;
};

import { toPng } from 'html-to-image';
import JSZip from 'jszip';

// SAFE RENDERING WORKAROUND for "SecurityError: Failed to read the 'cssRules' property"
// This happens when html-to-image tries to scan cross-origin stylesheets (like Google Fonts).
export async function safeToPng(node: HTMLElement, options: any = {}): Promise<string> {
    const disabledSheets: CSSStyleSheet[] = [];
    for (let i = 0; i < document.styleSheets.length; i++) {
        try {
            // If we can't read cssRules, it's a cross-origin sheet that will crash toPng
            const rules = document.styleSheets[i].cssRules;
        } catch (e) {
            const sheet = document.styleSheets[i] as CSSStyleSheet;
            sheet.disabled = true;
            disabledSheets.push(sheet);
        }
    }

    try {
        return await toPng(node, {
            pixelRatio: 2,
            backgroundColor: 'transparent',
            ...options
        });
    } finally {
        // Always re-enable stylesheets
        disabledSheets.forEach(s => s.disabled = false);
    }
}

const blobBorderRadii = [
    '47% 53% 70% 30% / 30% 43% 57% 70%',
    '36% 64% 64% 36% / 64% 42% 58% 36%',
    '65% 35% 38% 62% / 61% 63% 37% 39%',
    '58% 42% 43% 57% / 41% 54% 46% 59%',
];

// Helper: Flip Image Horizontally (Mirror)
const flipImageHorizontal = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(base64);

            // Flip Context
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0);

            try {
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            } catch (e) {
                console.error("Flip Export Failed", e);
                resolve(base64);
            }
        };
        img.onerror = () => {
            console.warn("Flip Image Load Failed");
            resolve(base64);
        };
        // Ensure data URI format
        img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    });
};

/**
 * Calculates dimensions to fit an image into a target area using "cover" logic (crop excess).
 */
function getCoverDimensions(imgW: number, imgH: number, targetW: number, targetH: number) {
    const imgRatio = imgW / imgH;
    const targetRatio = targetW / targetH;

    let renderW, renderH, renderX, renderY;

    if (imgRatio > targetRatio) {
        // Image is wider than target: Match Height, Crop Width
        renderH = targetH;
        renderW = renderH * imgRatio;
        renderX = (targetW - renderW) / 2; // Center horizontally (will be negative)
        renderY = 0;
    } else {
        // Image is taller than target: Match Width, Crop Height
        renderW = targetW;
        renderH = renderW / imgRatio;
        renderX = 0;
        renderY = (targetH - renderH) / 2; // Center vertically (will be negative)
    }

    return { x: renderX, y: renderY, w: renderW, h: renderH };
}

/**
 * Gets the natural dimensions of a base64 image.
 */
const getImageDimensions = async (base64: string): Promise<{ w: number, h: number }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.onerror = () => resolve({ w: 1600, h: 900 }); // fallback
        img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    });
};

/**
 * Creates a high-res image of a text blob to be inserted into the PDF.
 * This ensures the PDF blobs look exactly like the UI blobs.
 */
async function renderTextBlobToImage(
    text: string,
    widthPx: number,
    heightPx: number,
    blobIndex: number,
    language: Language,
    fontSize: number = 42,
    childName: string = '',
    style: 'clean' | 'box' = 'clean'
): Promise<{ dataUrl: string; width: number; height: number }> {

    const container = document.createElement('div');
    const isAr = language === 'ar';
    container.dir = isAr ? 'rtl' : 'ltr';

    // HIGHLIGHTING LOGIC
    let finalHtml = text.split('\n\n').map(p => `<p style="margin-bottom: 24px; line-height: 1.6;">${p.trim()}</p>`).join('');

    if (childName) {
        const childFirstName = childName.trim().split(/\s+/)[0];
        const escapedName = childFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
        finalHtml = finalHtml.replace(nameRegex, `<span style="font-weight: 900; color: ${style === 'clean' && !isAr ? 'white' : 'black'}; font-size: 1.1em;">$1</span>`);
    }

    // BASE CSS
    let css = `
        width: ${widthPx}px;
        min-height: 200px;
        font-family: ${isAr ? 'Tajawal, sans-serif' : 'Nunito, sans-serif'};
        font-weight: 700;
        font-size: ${fontSize}px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: ${style === 'clean' ? (isAr ? 'right' : 'left') : 'center'};
        box-sizing: border-box;
        padding: 40px;
    `;

    // STYLE SPECIFIC CSS
    if (style === 'box') {
        css += `
            background-color: rgba(255, 255, 255, 0.6);
            border-radius: 50px;
            color: #000000;
            border: 4px solid rgba(255,255,255,0.8);
            box-shadow: 0 8px 16px rgba(0,0,0,0.1); 
        `;
    } else {
        // CLEAN STYLE
        css += `
            background-color: transparent;
            color: ${isAr ? '#000000' : '#FFFFFF'};
            text-shadow: ${isAr ? 'none' : '2px 2px 4px rgba(0,0,0,0.8)'};
        `;
    }

    container.style.cssText = css;
    container.innerHTML = finalHtml;

    document.body.appendChild(container);
    // Use html-to-image for native text shaping (fixes Arabic)
    const dataUrl = await safeToPng(container, { pixelRatio: 3 });
    const canvasObj = new Image();
    await new Promise(r => { canvasObj.onload = r; canvasObj.src = dataUrl; });
    document.body.removeChild(container);
    return { dataUrl, width: canvasObj.naturalWidth, height: canvasObj.naturalHeight };
}

export const generatePreviewPdf = async (storyData: StoryData, language: Language, highResImages?: imageStore.OrderImages, orderNumber?: string): Promise<Blob> => {
    const jsPDF = await getJsPDF();
    if (!jsPDF) throw new Error("jsPDF not loaded");

    const sizeConfig = await getProductSizeById(storyData.size) || { page: { widthCm: 20, heightCm: 20 } };

    const pdf = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: [sizeConfig.page.widthCm * 20, sizeConfig.page.heightCm * 10]
    });

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    // Helper to normalize image data (Base64 or URL)
    const normalizeImage = async (input: string | undefined): Promise<string> => {
        if (!input) return "";
        if (input.startsWith('http')) {
            // It's a URL, fetch it
            try {
                const resp = await fetch(input);
                const blob = await resp.blob();
                return await blobToBase64(blob);
            } catch (e) {
                console.error("Failed to fetch image for PDF:", input, e);
                return "";
            }
        }
        return input;
    };

    // 1. Handle the Cover First
    let coverData = storyData.coverImageUrl;
    if (highResImages?.cover) {
        coverData = await blobToBase64(highResImages.cover);
    } else {
        coverData = await normalizeImage(coverData);
    }

    const coverEdits = storyData.spreads?.[0] || {};

    if (coverData && coverData.length > 50) {
        let cleanB64 = coverData.includes(',') ? coverData.split(',')[1] : coverData;

        // Use dynamic dimensions to prevent stretching
        const imgDim = await getImageDimensions(cleanB64);
        const dim = getCoverDimensions(imgDim.w, imgDim.h, pdfW, pdfH);
        const isPng = cleanB64.startsWith('iVBOR');
        const imgFmt = isPng ? 'PNG' : 'JPEG';
        const dataPrefix = isPng ? 'data:image/png;base64,' : 'data:image/jpeg;base64,';

        try {
            const scale = (coverEdits.imageScale ?? 100) / 100;
            const scaledW = dim.w * scale;
            const scaledH = dim.h * scale;
            const centerShiftX = (scaledW - dim.w) / 2;
            const centerShiftY = (scaledH - dim.h) / 2;
            const imgShiftX = coverEdits.imageOffsetX ? (coverEdits.imageOffsetX / 100) * pdfW : 0;
            const imgShiftY = coverEdits.imageOffsetY ? (coverEdits.imageOffsetY / 100) * pdfH : 0;

            // Fill white background before drawing scaled down image
            if (scale < 1) {
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, pdfW, pdfH, 'F');
            }

            pdf.addImage(`${dataPrefix}${cleanB64}`, imgFmt, dim.x - centerShiftX + imgShiftX, dim.y - centerShiftY + imgShiftY, scaledW, scaledH);
        } catch (e) { console.warn("PDF Cover Add Failed", e); }

        // Add Title Overlay to Cover
        // LOGIC: Center title on the FRONT COVER half.
        // EN: Front is RIGHT half (50% to 100%)
        // AR: Front is LEFT half (0% to 50%)
        const isAr = language === 'ar';
        // Smart subtitle: double hero vs single hero (coverSubtitle = manual override)
        const subtitle = storyData.coverSubtitle || (
            storyData.useSecondCharacter && storyData.secondCharacter?.name
                ? `${storyData.childName} ${isAr ? 'و' : '&'} ${storyData.secondCharacter.name}`
                : isAr
                    ? `قصة ${storyData.childName}`
                    : `A Story for ${storyData.childName}`
        );
        const coverTitle = storyData.title || storyData.blueprint?.foundation?.title || storyData.childName || 'My Story';
        const titleB64 = await createTextImage({ title: coverTitle, subtitle }, language);

        // Title Width: 40% of full PDF (80% of front cover)
        const tw = pdfW * 0.4;
        const titleAspect = 1000 / 200; // From createTextImage dimensions
        const th = tw / titleAspect;

        let tx;
        const side = storyData.coverTextSide || (isAr ? 'left' : 'right');
        if (side === 'left') {
            tx = (pdfW * 0.25) - (tw / 2);
        } else {
            // Front is RIGHT (Standard). Title centered on Right side (0.75).
            tx = (pdfW * 0.75) - (tw / 2);
        }

        const ty = pdfH * 0.08; // Moved UP from 0.15 to 0.08 to avoid covering Hero
        
        // Apply manual layout overrides if they exist in the DB
        const finalTx = coverEdits.textOffsetX !== undefined ? coverEdits.textOffsetX : tx;
        const finalTy = coverEdits.textOffsetY !== undefined ? coverEdits.textOffsetY : ty;

        pdf.addImage(titleB64, 'PNG', finalTx, finalTy, tw, th);

        // METADATA STRIP (COVER)
        if (orderNumber) {
            const stripWidthMm = 3; // FIXED: 3mm strictly as requested
            const stripHeightMm = pdfH;

            // Canvas Dimensions (300 DPI calculation)
            // 3mm = 0.118 inch. 0.118 * 300 = ~35 pixels.
            // Let's use 50px for sharpness, but keep it narrow.
            const stripPxW = 50;
            const stripPxH = 5000; // High enough for vertical text

            const metaContainer = createMetadataStripElement(orderNumber, 0, stripPxW, stripPxH);
            document.body.appendChild(metaContainer);
            const metaImg = await safeToPng(metaContainer);
            document.body.removeChild(metaContainer);

            pdf.addImage(metaImg, 'PNG', pdfW - stripWidthMm, 0, stripWidthMm, stripHeightMm);

            // 2. BACK COVER ELEMENTS
            // Dimensions
            const barcodeW = 50; // 5cm
            const barcodeH = 3;  // 3mm

            const logoW = 30; // 3cm width for Logo
            const logoH = 15; // 1.5cm height

            // Y Position: Both at bottom, aligned center-Y
            // Let's place them 15mm from bottom
            const bottomMargin = 15;
            const logoY = pdfH - bottomMargin - logoH;
            // Center barcode on the Logo's Y-midpoint
            // Logo Mid: logoY + logoH/2
            // Barcode Y: (logoY + logoH/2) - (barcodeH/2)
            const barcodeY = (logoY + (logoH / 2)) - (barcodeH / 2);

            let barcodeX, logoX;

            // Spacing from edges of the Back Cover page
            const sideMargin = 20;

            if (isAr) {
                // ARABIC (Back Cover = RIGHT Page: 50% to 100%)
                // Barcode: Right Side (Outer) -> pdfW - sideMargin - barcodeW
                // Logo: Left Side (Spine) -> (pdfW/2) + sideMargin
                barcodeX = pdfW - sideMargin - barcodeW;
                logoX = (pdfW / 2) + sideMargin;
            } else {
                // ENGLISH (Back Cover = LEFT Page: 0% to 50%)
                // Barcode: Left Side (Outer) -> sideMargin
                // Logo: Right Side (Spine) -> (pdfW/2) - sideMargin - logoW
                barcodeX = sideMargin;
                logoX = (pdfW / 2) - sideMargin - logoW;
            }

            // A. RENDER BARCODE
            const bcPxW = 600; // High res
            const bcPxH = 36;  // Proportionalish (actually just needs to be distinct)
            const bcEl = createBarcodeStripElement(orderNumber, bcPxW, bcPxH);
            document.body.appendChild(bcEl);
            const bcImg = await safeToPng(bcEl);
            document.body.removeChild(bcEl);
            pdf.addImage(bcImg, 'PNG', barcodeX, barcodeY, barcodeW, barcodeH);

            // B. RENDER LOGO
            const logoPxW = 400;
            const logoPxH = 200;
            const logoEl = await createRawyLogoElement(logoPxW, logoPxH);
            document.body.appendChild(logoEl);
            const logoImg = await safeToPng(logoEl);
            document.body.removeChild(logoEl);
            pdf.addImage(logoImg, 'PNG', logoX, logoY, logoW, logoH);
        }
    }

    // 2. Spreads — one object per spread, direct indexing (no i*2)
    const spreadsData = storyData.spreads || [];
    const spreadCount = storyData.spreadCount || Math.max(0, spreadsData.length - 1); // exclude cover

    for (let i = 1; i <= spreadCount; i++) {
        pdf.addPage();
        const spread = spreadsData[i];
        if (!spread) continue;

        // Get image source
        let illustration = spread.illustrationUrl;
        if (highResImages?.spreads[i]) {
            illustration = await blobToBase64(highResImages.spreads[i]);
        } else {
            illustration = await normalizeImage(illustration);
        }

        if (illustration && illustration.length > 50) {
            const cleanB64 = illustration.includes(',') ? illustration.split(',')[1] : illustration;
            // Use Cover Logic with dynamic dimensions
            const imgDim = await getImageDimensions(cleanB64);
            const dim = getCoverDimensions(imgDim.w, imgDim.h, pdfW, pdfH);
            const isPng = cleanB64.startsWith('iVBOR');
            const imgFmt = isPng ? 'PNG' : 'JPEG';
            const dataPrefix = isPng ? 'data:image/png;base64,' : 'data:image/jpeg;base64,';
            // Apply scaling and offsets
            const scale = (spread.imageScale ?? 100) / 100;
            const scaledW = dim.w * scale;
            const scaledH = dim.h * scale;
            const centerShiftX = (scaledW - dim.w) / 2;
            const centerShiftY = (scaledH - dim.h) / 2;
            const imgShiftX = spread.imageOffsetX ? (spread.imageOffsetX / 100) * pdfW : 0;
            const imgShiftY = spread.imageOffsetY ? (spread.imageOffsetY / 100) * pdfH : 0;

            try {
                // Fill white background before drawing scaled down image
                if (scale < 1) {
                    pdf.setFillColor(255, 255, 255);
                    pdf.rect(0, 0, pdfW, pdfH, 'F');
                }
                pdf.addImage(`${dataPrefix}${cleanB64}`, imgFmt, dim.x - centerShiftX + imgShiftX, dim.y - centerShiftY + imgShiftY, scaledW, scaledH);
            } catch (e) { console.warn("PDF Spread Add Failed", e); }
        }

        // Draw Text — ONE combined text box, placed on the side OPPOSITE the image
        const fullText = [spread.leftText, spread.rightText].filter(Boolean).join(' ') || (spread as any).text || '';
        if (fullText) {
            const ageNum = parseInt(storyData.childAge, 10) || 6;
            let fontSize = 48;
            if (ageNum >= 10) fontSize = 32;
            else if (ageNum >= 7) fontSize = 40;
            else if (ageNum >= 4) fontSize = 48;

            const blobImg = await renderTextBlobToImage(
                fullText, 800, 600, 0, language, fontSize, storyData.childName, 'box'
            );

            const rectW = pdfW * 0.40;
            let rectH = rectW * 0.6;
            if (blobImg && blobImg.width > 0) { rectH = rectW * (blobImg.height / blobImg.width); }

            // Determine which side the text block should appear on.
            const isAr = language === 'ar';
            let textOnLeft: boolean;
            if (spread.textSide === 'left') {
                textOnLeft = true;
            } else if (spread.textSide === 'right') {
                textOnLeft = false;
            } else {
                const promptText = (spread.actualPrompt || '').toLowerCase();
                const rightEmptyMatch = /(?:the\s+)?right\s+(?:side|half)[^.]*empty/i.test(promptText);
                const leftEmptyMatch = /(?:the\s+)?left\s+(?:side|half)[^.]*empty/i.test(promptText);
                if (rightEmptyMatch) textOnLeft = false;
                else if (leftEmptyMatch) textOnLeft = true;
                else textOnLeft = true;
            }
            // Apply per-spread X/Y overrides from the editor, fall back to auto calculations
            const defaultRectX = textOnLeft ? pdfW * 0.05 : pdfW * 0.55;
            const defaultRectY = (pdfH / 2) - (rectH / 2);
            const rectX = spread.textOffsetX !== undefined ? spread.textOffsetX : defaultRectX;
            const rectY = spread.textOffsetY !== undefined ? spread.textOffsetY : defaultRectY;

            if (blobImg && blobImg.dataUrl) {
                pdf.addImage(blobImg.dataUrl, 'PNG', rectX, rectY, rectW, rectH);
            }
        }

        // METADATA STRIP (SPREADS)
        if (orderNumber) {
            const stripWidthMm = 3; // FIXED: Consistent 3mm
            const stripHeightMm = pdfH;
            const stripPxW = 50;
            const stripPxH = 5000;


            const metaContainer = createMetadataStripElement(orderNumber, i + 1, stripPxW, stripPxH);
            document.body.appendChild(metaContainer);
            const metaImg = await safeToPng(metaContainer);
            document.body.removeChild(metaContainer);

            pdf.addImage(metaImg, 'PNG', pdfW - stripWidthMm, 0, stripWidthMm, stripHeightMm);
        }
    }

    return pdf.output('blob');
};

export const generateStitchedPdf = async (
    coverBlob: Blob,
    spreadBlobs: Blob[],
    sizeConfig: ProductSize,
    storyDetails: { title: string, childName: string, childAge: string, secondCharacterName?: string, coverSubtitle?: string, coverTextSide?: 'left'|'right' },
    pages: { text: string }[],
    language: any = 'en',
    orderNumber?: string
): Promise<Blob> => {
    const jsPDF = await getJsPDF();
    if (!jsPDF) throw new Error("jsPDF not loaded");

    const pdf = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: [sizeConfig.page.widthCm * 20, sizeConfig.page.heightCm * 10]
    });

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    // 1. Cover
    const coverB64 = await blobToBase64(coverBlob);
    let cleanCover = '';
    if (typeof coverB64 === 'string') {
        cleanCover = coverB64.includes(',') ? coverB64.split(',')[1] : coverB64;
    }

    if (cleanCover) {
        // ARABIC FIX: REMOVED (Stitched Version).
        // promptEngineer.ts now perfectly aligns Arabic cover orientation natively.

        const imgDim = await getImageDimensions(cleanCover);
        const dim = getCoverDimensions(imgDim.w, imgDim.h, pdfW, pdfH);
        const isPng = cleanCover.startsWith('iVBOR');
        const imgFmt = isPng ? 'PNG' : 'JPEG';
        const dataPrefix = isPng ? 'data:image/png;base64,' : 'data:image/jpeg;base64,';
        try {
            pdf.addImage(`${dataPrefix}${cleanCover}`, imgFmt, dim.x, dim.y, dim.w, dim.h);
        } catch (e) { console.warn("PDF Cover Add Failed", e); }

        // Add Title Overlay to Cover
        const isAr = language === 'ar';
        // Smart subtitle: double hero vs single hero (coverSubtitle = manual override)
        const subtitle = storyDetails.coverSubtitle || (
            storyDetails.secondCharacterName
                ? `${storyDetails.childName} ${isAr ? 'و' : '&'} ${storyDetails.secondCharacterName}`
                : isAr
                    ? `قصة ${storyDetails.childName}`
                    : `A Story for ${storyDetails.childName}`
        );
        const titleB64 = await createTextImage({ title: storyDetails.title, subtitle }, language);

        const tw = pdfW * 0.4;
        const titleAspect = 1000 / 200;
        const th = tw / titleAspect;
        let tx;
        const side = storyDetails.coverTextSide || (isAr ? 'left' : 'right');
        if (side === 'left') {
            tx = (pdfW * 0.25) - (tw / 2);
        } else {
            tx = (pdfW * 0.75) - (tw / 2);
        }
        const ty = pdfH * 0.08;
        pdf.addImage(titleB64, 'PNG', tx, ty, tw, th);

        // LOGO & BARCODE (COVER ONLY)
        if (orderNumber) {
            // METADATA STRIP (COVER)
            const stripWidthMm = 3;
            const stripHeightMm = pdfH;
            const stripPxW = 50;
            const stripPxH = 5000;

            // Strip
            const metaContainer = createMetadataStripElement(orderNumber, 0, stripPxW, stripPxH);
            document.body.appendChild(metaContainer);
            const metaImg = await safeToPng(metaContainer);
            document.body.removeChild(metaContainer);
            pdf.addImage(metaImg, 'PNG', pdfW - stripWidthMm, 0, stripWidthMm, stripHeightMm);

            // BACK COVER ELEMENTS (Barcode + Logo)
            const backCoverW = pdfW / 2;
            const barcodeW = 50;
            const barcodeH = 15; // UPDATED to 15mm
            const logoW = 30;
            const logoH = 15;
            const bottomMargin = 15;
            const logoY = pdfH - bottomMargin - logoH;
            const barcodeY = (logoY + (logoH / 2)) - (barcodeH / 2);

            let barcodeX, logoX;
            const sideMargin = 20;

            if (isAr) {
                // ARABIC (Back Cover = RIGHT Page 50-100%)
                // Barcode: Right Edge
                barcodeX = pdfW - sideMargin - barcodeW;
                // Logo: Spine (Left of Right Page)
                logoX = (pdfW / 2) + sideMargin;
            } else {
                // ENGLISH (Back Cover = LEFT Page 0-50%)
                // Barcode: Left Edge
                barcodeX = sideMargin;
                // Logo: Spine (Right of Left Page)
                logoX = (pdfW / 2) - sideMargin - logoW;
            }

            // Render Barcode
            const bcPxW = 600;
            const bcPxH = 180; // Proportional for 15mm
            const bcEl = createBarcodeStripElement(orderNumber, bcPxW, bcPxH);
            document.body.appendChild(bcEl);
            const bcImg = await safeToPng(bcEl);
            document.body.removeChild(bcEl);
            pdf.addImage(bcImg, 'PNG', barcodeX, barcodeY, barcodeW, barcodeH);

            // Render Logo
            const logoPxW = 400;
            const logoPxH = 200;
            const logoEl = await createRawyLogoElement(logoPxW, logoPxH); // ADDED AWAIT
            document.body.appendChild(logoEl);
            const logoImg = await safeToPng(logoEl);
            document.body.removeChild(logoEl);
            pdf.addImage(logoImg, 'PNG', logoX, logoY, logoW, logoH);
        }
    }

    // 2. Spreads
    for (let i = 0; i < spreadBlobs.length; i++) {
        pdf.addPage();
        const spreadB64 = await blobToBase64(spreadBlobs[i]);
        let cleanSpread = '';
        if (typeof spreadB64 === 'string') {
            cleanSpread = spreadB64.includes(',') ? spreadB64.split(',')[1] : spreadB64;
        }

        if (cleanSpread) {
            const isPng = cleanSpread.startsWith('iVBOR');
            const imgFmt = isPng ? 'PNG' : 'JPEG';
            const dataPrefix = isPng ? 'data:image/png;base64,' : 'data:image/jpeg;base64,';
            try {
                pdf.addImage(`${dataPrefix}${cleanSpread}`, imgFmt, 0, 0, pdfW, pdfH);
            } catch (e) {
                console.error(`Failed to add spread ${i} to PDF`, e);
            }
        }

        // TEXT OVERLAY
        if (pages && pages[i] && pages[i].text) {
            const text = pages[i].text;
            const fontSize = 42;
            const blobImg = await renderTextBlobToImage(
                text,
                800,
                600,
                i,
                language,
                fontSize,
                storyDetails.childName,
                'box' // CHANGED: 'clean' -> 'box' for black text on white box
            );

            // Positioning (Same as before)
            const txtW = pdfW * 0.35;
            const ratio = blobImg.width / blobImg.height;
            const txtH = txtW / ratio;
            const marginX = pdfW * 0.05;
            const marginY = pdfH * 0.08;
            let isLeft: boolean;
            if (pages[i] && (pages[i] as any).textSide === 'left') {
                isLeft = true;
            } else if (pages[i] && (pages[i] as any).textSide === 'right') {
                isLeft = false;
            } else {
                // Default fallback: text goes on the left side.
                // The prompt convention keeps the RIGHT side empty for text overlay (hero is on left).
                // So for inner spread pages without an explicit textSide, text always goes left.
                isLeft = true;
            }

            const txtX = isLeft ? marginX : (pdfW - txtW - marginX);
            const txtY = pdfH - txtH - marginY;

            const cleanData = blobImg.dataUrl.includes(',') ? blobImg.dataUrl.split(',')[1] : blobImg.dataUrl;
            try {
                pdf.addImage(`data:image/png;base64,${cleanData}`, 'PNG', txtX, txtY, txtW, txtH);
            } catch (e) { console.warn("Text Add Failed", e); }
        }

        // METADATA STRIP (SPREADS)
        if (orderNumber) {
            const stripWidthMm = 3;
            const stripHeightMm = pdfH;
            const stripPxW = 50;
            const stripPxH = 5000;

            const metaContainer = createMetadataStripElement(orderNumber, i + 1, stripPxW, stripPxH);
            document.body.appendChild(metaContainer);
            const metaImg = await safeToPng(metaContainer);
            document.body.removeChild(metaContainer);
            pdf.addImage(metaImg, 'PNG', pdfW - stripWidthMm, 0, stripWidthMm, stripHeightMm);
        }
    }

    return pdf.output('blob');
};

async function createCoverWithText(coverBase64: string, titleBase64: string, coverTextSide?: 'left'|'right', isAr?: boolean): Promise<string> {
    return new Promise((resolve) => {
        const coverImg = new Image();
        coverImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = coverImg.width;
            canvas.height = coverImg.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(coverBase64.includes(',') ? coverBase64.split(',')[1] : coverBase64);
            
            ctx.drawImage(coverImg, 0, 0, canvas.width, canvas.height);
            
            const titleImg = new Image();
            titleImg.onload = () => {
                const tw = canvas.width * 0.4;
                const titleAspect = titleImg.width / titleImg.height;
                const th = tw / titleAspect;
                let tx;
                const side = coverTextSide || (isAr ? 'left' : 'right');
                if (side === 'left') {
                    tx = (canvas.width * 0.25) - (tw / 2);
                } else {
                    tx = (canvas.width * 0.75) - (tw / 2);
                }
                const ty = canvas.height * 0.08;
                
                ctx.drawImage(titleImg, tx, ty, tw, th);
                const finalUrl = canvas.toDataURL('image/jpeg', 0.95);
                resolve(finalUrl.includes(',') ? finalUrl.split(',')[1] : finalUrl);
            };
            titleImg.onerror = () => resolve(coverBase64.includes(',') ? coverBase64.split(',')[1] : coverBase64);
            titleImg.src = titleBase64;
        };
        coverImg.onerror = () => resolve(coverBase64.includes(',') ? coverBase64.split(',')[1] : coverBase64);
        coverImg.src = coverBase64.startsWith('data:') ? coverBase64 : `data:image/jpeg;base64,${coverBase64}`;
    });
}

/**
 * Uploads the production ZIP package for an order to Supabase storage.
 * Returns the public URL of the uploaded file, or null on failure.
 */
export const uploadOrderFiles = async (orderNumber: string, content: Blob): Promise<string | null> => {
    try {
        // Dynamic import to avoid circular dependency (fileService → supabase)
        const { supabase } = await import('@/utils/supabaseClient');
        const bucket = 'production-packages';
        const fileName = `${orderNumber}/${orderNumber}_Production_${Date.now()}.zip`;

        const { error: uploadErr } = await supabase.storage.from(bucket).upload(fileName, content, {
            contentType: 'application/zip',
            upsert: true
        });

        if (uploadErr) {
            console.error('[fileService] uploadOrderFiles upload error:', uploadErr);
            return null;
        }

        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return publicData?.publicUrl || null;
    } catch (err) {
        console.error('[fileService] uploadOrderFiles exception:', err);
        return null;
    }
};

export const generatePrintPackage = async (storyData: StoryData, shipping: ShippingDetails, language: Language, orderNumber: string) => {
    try {
        const zip = new JSZip();

        // 1. Generate PDF
        const pdfBlob = await generatePreviewPdf(storyData, language, undefined, orderNumber);
        zip.file(`${orderNumber}_Preview.pdf`, pdfBlob);

        // 2. Full Written Story
        let storyText = `Title: ${storyData.title}\nAuthor: ${storyData.childName}\n\n`;
        (storyData.spreads || []).forEach((s, i) => {
            if (i === 0) return; // skip cover
            const spreadText = [s.leftText, s.rightText].filter(Boolean).join(' ') || (s as any).text || '';
            storyText += `[Spread ${s.spreadNumber}]\n${spreadText}\n\n`;
        });
        zip.file('story_narrative.txt', storyText);

        // 3. Raw Images (High Res)
        // 3. Raw Images (High Res)
        const imagesFolder = zip.folder("raw_images");

        // Helper to get Base64 from URL or Raw String
        const getBase64Data = async (input: string): Promise<string> => {
            // Support both standard HTTP and local Browser Blob URLs
            if (input.startsWith('http') || input.startsWith('blob:')) {
                try {
                    // Try fetching; blob URLs don't need CORS, but standard ones might
                    const fetchOptions: RequestInit = input.startsWith('blob:') ? {} : { mode: 'cors' };
                    const resp = await fetch(input, fetchOptions);

                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const blob = await resp.blob();

                    // Convert blob to base64
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const result = reader.result as string;
                            resolve(result.includes(',') ? result.split(',')[1] : result);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Failed to fetch image for zip. Ensure CORS is open on Supabase bucket:", input, e);
                    return "";
                }
            }
            return input.includes(',') ? input.split(',')[1] : input;
        };

        let coverB64ToUse = "";
        if (storyData.coverImageUrl) {
            const coverB64 = await getBase64Data(storyData.coverImageUrl);
            if (coverB64) {
                imagesFolder?.file("cover_clean.jpg", coverB64, { base64: true });
                coverB64ToUse = coverB64;
            }
        }

        // Generate and add cover text and composite cover
        const isAr = language === 'ar';
        // Smart subtitle: double hero vs single hero (coverSubtitle = manual override)
        const subtitle = storyData.coverSubtitle || (
            storyData.useSecondCharacter && storyData.secondCharacter?.name
                ? `${storyData.childName} ${isAr ? 'و' : '&'} ${storyData.secondCharacter.name}`
                : isAr
                    ? `قصة ${storyData.childName}`
                    : `A Story for ${storyData.childName}`
        );
        const coverTitle = storyData.title || storyData.blueprint?.foundation?.title || storyData.childName || 'My Story';
        const titleB64 = await createTextImage({ title: coverTitle, subtitle }, language);
        
        if (titleB64) {
            const cleanTitleB64 = titleB64.includes(',') ? titleB64.split(',')[1] : titleB64;
            imagesFolder?.file("cover_text_overlay.png", cleanTitleB64, { base64: true });
            
            if (coverB64ToUse) {
                const coverWithTextB64 = await createCoverWithText(coverB64ToUse, titleB64, storyData.coverTextSide, isAr);
                imagesFolder?.file("cover_with_text.jpg", coverWithTextB64, { base64: true });
            }
        }

        // Add Reference Images (Visual DNA) to the raw_images folder
        if (storyData.styleReferenceImageUrl) {
            const ref1UrlB64 = await getBase64Data(storyData.styleReferenceImageUrl);
            if (ref1UrlB64) imagesFolder?.file("reference_main_character.jpg", ref1UrlB64, { base64: true });
        } else if (storyData.styleReferenceImageBase64) {
            const ref1B64 = await getBase64Data(storyData.styleReferenceImageBase64);
            if (ref1B64) imagesFolder?.file("reference_main_character.jpg", ref1B64, { base64: true });
        }

        if (storyData.secondCharacterImageBase64) {
            const ref2B64 = await getBase64Data(storyData.secondCharacterImageBase64);
            if (ref2B64) imagesFolder?.file("reference_secondary_character.jpg", ref2B64, { base64: true });
        }

        // Use Promise.all for parallel fetching with better error handling
        const spreadPromises = (storyData.spreads || []).map(async (s, i) => {
            if (!s.illustrationUrl) return;
            const imgB64 = await getBase64Data(s.illustrationUrl);
            if (imgB64) {
                const filename = i === 0 ? 'cover.jpg' : `spread_${s.spreadNumber}.jpg`;
                imagesFolder?.file(filename, imgB64, { base64: true });
            } else {
                console.warn(`Failed to package image for spread ${s.spreadNumber}`);
            }
        });
        await Promise.all(spreadPromises);

        // 4. Workflow Artifacts (Debug/Re-creation)
        const artifactsFolder = zip.folder("workflow_artifacts");

        // --- 0. Store Visual DNA Prompts used to build Reference Images ---
        let dnaPrompts = `VISUAL DNA PROMPTS\n=================\n\n`;
        dnaPrompts += `--- OVERARCHING ART STYLE ---\n`;
        dnaPrompts += `Selected Style Name: ${storyData.selectedStyleNames?.join(', ') || 'Custom'}\n`;
        dnaPrompts += `Style Prompt: ${storyData.selectedStylePrompt || 'None'}\n`;
        if (storyData.technicalStyleGuide) dnaPrompts += `Technical Guide: ${storyData.technicalStyleGuide}\n`;

        dnaPrompts += `\n--- MAIN CHARACTER DEFINITION ---\n`;
        dnaPrompts += `Name: ${storyData.mainCharacter.name}\n`;
        dnaPrompts += `Raw Description: ${storyData.mainCharacter.description}\n`;
        if (storyData.mainCharacter.refinedDescription) dnaPrompts += `Refined AI Prompt: ${storyData.mainCharacter.refinedDescription}\n`;

        if (storyData.useSecondCharacter && storyData.secondCharacter) {
            dnaPrompts += `\n--- SECONDARY CHARACTER DEFINITION ---\n`;
            dnaPrompts += `Name: ${storyData.secondCharacter.name}\n`;
            dnaPrompts += `Raw Description: ${storyData.secondCharacter.description}\n`;
            if (storyData.secondCharacter.refinedDescription) dnaPrompts += `Refined AI Prompt: ${storyData.secondCharacter.refinedDescription}\n`;
        }

        artifactsFolder?.file("0_visual_dna_prompts.txt", dnaPrompts);
        if (storyData.blueprint) artifactsFolder?.file("1_blueprint.json", JSON.stringify(storyData.blueprint, null, 2));
        if (storyData.rawScript) artifactsFolder?.file("2a_raw_script.json", JSON.stringify(storyData.rawScript, null, 2));
        if (storyData.spreads && storyData.spreads.length > 0) artifactsFolder?.file("2b_edited_script.json", JSON.stringify(storyData.spreads.map(s => ({ spreadNumber: s.spreadNumber, text: [s.leftText, s.rightText].filter(Boolean).join(' ') || (s as any).text || '' })), null, 2));
        if (storyData.spreadPlan) artifactsFolder?.file("3_visual_plan.json", JSON.stringify(storyData.spreadPlan, null, 2));
        if (storyData.finalPrompts) artifactsFolder?.file("5_prompts.json", JSON.stringify(storyData.finalPrompts, null, 2));

        // Also save the raw Story Data for full reconstruction
        artifactsFolder?.file("full_story_data.json", JSON.stringify(storyData, null, 2));

        // 5. Detailed Creation Prompts (Debug)
        let detailedPrompts = `STORY GENERATION LOG\n--------------------------------\n`;

        // Add Cover Prompt
        if (storyData.actualCoverPrompt) {
            const coverPromptString = typeof storyData.actualCoverPrompt === 'string' ? storyData.actualCoverPrompt : JSON.stringify(storyData.actualCoverPrompt, null, 2);
            detailedPrompts += `COVER PROMPT\n`;
            detailedPrompts += `${coverPromptString}\n`;
            detailedPrompts += `--------------------------------\n\n`;

            // Allow separate artifact for easy reading
            artifactsFolder?.file("0_cover_prompt.txt", coverPromptString);
        }

        (storyData.spreads || []).forEach(s => {
            if (s.spreadNumber === 0) return; // skip cover
            detailedPrompts += `SPREAD ${s.spreadNumber}\n`;
            detailedPrompts += `LEFT TEXT: ${s.leftText}\n`;
            detailedPrompts += `RIGHT TEXT: ${s.rightText}\n`;
            const spreadPromptString = typeof s.actualPrompt === 'string' ? s.actualPrompt : (s.actualPrompt ? JSON.stringify(s.actualPrompt, null, 2) : 'N/A');
            detailedPrompts += `PROMPT USED:\n${spreadPromptString}\n`;
            detailedPrompts += `--------------------------------\n\n`;
        });
        artifactsFolder?.file("debug_creation_prompts.txt", detailedPrompts);

        // 5. Order Manifest
        const manifest = {
            orderNumber,
            date: new Date().toISOString(),
            shipping,
            storySummary: {
                title: storyData.title,
                theme: storyData.theme,
                childName: storyData.childName,
                childAge: storyData.childAge, // Added for Stitcher
                secondCharacterName: storyData.useSecondCharacter && storyData.secondCharacter ? storyData.secondCharacter.name : undefined,
                size: storyData.size,         // Added for Stitcher
                spreadCount: storyData.spreadCount || (storyData.spreads?.length ?? 1) - 1
            },
            spreads: (storyData.spreads || []).filter(s => s.spreadNumber > 0).map(s => ({
                spreadNumber: s.spreadNumber,
                leftText: s.leftText,
                rightText: s.rightText
            }))
        };
        zip.file('order_manifest.json', JSON.stringify(manifest, null, 2));

        // 6. Generate Zip
        const content = await zip.generateAsync({ type: 'blob' });

        return content; // Return Blob for upload

    } catch (e) {
        console.error("Error generating print package:", e);
        throw e;
    }
};

export const downloadCoverImage = async (storyData: StoryData, language: Language) => {
    try {
        const link = document.createElement('a');
        link.href = storyData.coverImageUrl || '';
        link.download = `Rawy_Cover_${storyData.childName}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Error downloading cover:", e);
    }
};

// Updated createMetadataStripElement to be simpler and use vertical layout
export function createMetadataStripElement(orderNumber: string, spreadIndex: number, width: number, height: number): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        background: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 40px 0;
        box-sizing: border-box;
        border-left: 2px solid #ddd;
    `;

    // Top Info (Vertical Text)
    const topText = document.createElement('div');
    topText.style.cssText = `
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font-family: monospace;
        font-size: 92px; /* INCREASED from 74px */
        font-weight: 900;
        color: black;
        letter-spacing: 16px; /* Increased spacing */
    `;
    topText.innerText = `ORDER #${orderNumber}`;
    container.appendChild(topText);

    // Bottom Info (Spread + Barcode)
    const bottomGroup = document.createElement('div');
    bottomGroup.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 100px; /* Increased gap */
        width: 100%;
        padding-bottom: 40px;
    `;

    const spreadText = document.createElement('div');
    spreadText.style.cssText = `
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font-family: monospace;
        font-size: 72px; /* INCREASED from 60px */
        font-weight: bold;
        color: #333; /* Darker gray */
    `;
    spreadText.innerText = `SPREAD ${spreadIndex}`;
    bottomGroup.appendChild(spreadText);

    // Better Barcode Simulation (Fixed Height & High Contrast)
    const bcContainer = document.createElement('div');
    bcContainer.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:16px; width: 100%; padding: 0 10px;"; // Increased gap to 16px

    // Explicit Bars for visibility
    for (let k = 0; k < 14; k++) { // Increased bar count slightly
        const bar = document.createElement('div');
        bar.style.width = Math.random() > 0.5 ? '100%' : '70%'; // Wide bars
        bar.style.height = Math.random() > 0.5 ? '80px' : '40px'; /* MUCH THICKER BARS (was 40/22) */
        bar.style.backgroundColor = 'black';
        bcContainer.appendChild(bar);
    }
    bottomGroup.appendChild(bcContainer);

    container.appendChild(bottomGroup);
    return container;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
};

export async function createTextImage(titleData: { title: string, subtitle?: string }, lang: Language): Promise<string> {
    // Ensure font is loaded for High-Res Capture
    const fontLink = document.createElement('link');
    // Load ALL necessary fonts: Luckiest Guy (En), Tajawal (Ar UI), Amiri (Ar Body)
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Tajawal:wght@400;700;900&family=Amiri:wght@400;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // Wait for fonts to be ready with a robust timeout fallback
    await document.fonts.ready;

    // Extra: Explicitly wait for the specific font needed (fixes timing issues with Google Fonts CDN)
    const targetFont = lang === 'ar' ? 'Tajawal' : 'Luckiest Guy';
    try {
        await Promise.race([
            document.fonts.load(`900 90px '${targetFont}'`),
            new Promise(resolve => setTimeout(resolve, 3000)) // 3s fallback
        ]);
    } catch (e) {
        // Ignore font-load errors; continue with best-effort rendering
        await new Promise(resolve => setTimeout(resolve, 500));
    }


    const clipper = document.createElement('div');
    clipper.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 1px;
        height: 1px;
        overflow: visible;
        z-index: -9999;
        pointer-events: none;
    `;

    const container = document.createElement('div');

    // Typography Logic
    const isEn = lang !== 'ar';
    // Use Tajawal Black for Titles
    const fontFamily = isEn ? "'Luckiest Guy', cursive" : "'Tajawal', sans-serif";
    const letterSpacing = isEn ? '2px' : 'normal'; // standard spacing for Arabic

    // Arabic: Now matching English "Pop" Style
    const color = '#FFFFFF'; // White for both
    // Consistent Shadow/Stroke
    const textShadow = '4px 4px 0 #203A72, -2px -2px 0 #203A72, 2px -2px 0 #203A72, -2px 2px 0 #203A72, 2px 2px 0 #203A72, 0 8px 15px rgba(0,0,0,0.3)';

    // Rotation: English gets tilt, Arabic gets straight (cleaner for script) or slight tilt?
    // Let's keep Arabic straight for readability of connected letters
    const transform = isEn ? 'rotate(-2deg)' : 'none';

    container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        font-family: ${fontFamily};
        color: ${color};
        background: rgba(0,0,0,0.35);
        border-radius: 24px;
        text-shadow: ${textShadow};
        padding: 28px 40px;
        text-align: center;
        width: 1000px;
        text-transform: uppercase;
        letter-spacing: ${letterSpacing};
        transform: ${transform};
        display: flex;
        flex-direction: column;
        align-items: center;
    `;

    container.dir = lang === 'ar' ? 'rtl' : 'ltr';
    container.innerHTML = `
        <div style="font-weight:900;line-height:1.1;font-size:90px;">
            ${titleData.title || '&nbsp;'}
        </div>
        ${titleData.subtitle ? `<div style="font-weight:700;line-height:1.2;font-size:45px;margin-top:20px;opacity:0.95;">
            ${titleData.subtitle}
        </div>` : ''}
    `;

    clipper.appendChild(container);
    document.body.appendChild(clipper);

    // Small delay to let browser layout & paint
    await new Promise(r => setTimeout(r, 100));

    // SAFE RENDERING WORKAROUND for "SecurityError: Failed to read the 'cssRules' property"
    // This happens when html-to-image tries to scan cross-origin stylesheets (like Google Fonts).
    const disabledSheets: CSSStyleSheet[] = [];
    for (let i = 0; i < document.styleSheets.length; i++) {
        try {
            // If we can't read cssRules, it's a cross-origin sheet that will crash toPng
            const rules = document.styleSheets[i].cssRules;
        } catch (e) {
            const sheet = document.styleSheets[i] as CSSStyleSheet;
            sheet.disabled = true;
            disabledSheets.push(sheet);
        }
    }

    try {
        const dataUrl = await safeToPng(container, {
            fontEmbedCSS: undefined,
        });
        return dataUrl;
    } finally {
        document.body.removeChild(clipper);
    }
}

export function createBarcodeHtmlElement(orderNumber: string, width: number, height: number): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `width:${width}px;height:${height}px;background:white;border:1px solid #ccc;display:flex;align-items:stretch;justify-content:space-between;padding:2px;box-sizing:border-box;`;
    for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.style.cssText = `background:black;width:${Math.random() * 4 + 1}%;`;
        container.appendChild(bar);
    }
    return container;
}

export async function createQrCodeElement(text: string, width: number, height: number): Promise<HTMLImageElement> {
    const dataUrl = await QRCode.toDataURL(text, { width: width, margin: 0 });
    const img = new Image();
    img.src = dataUrl;
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    return img;
}

export function createPrintableTextBlockElement(text: string, language: Language, index: number, age: string, childName: string, isStitched: boolean = false): HTMLElement {
    const container = document.createElement('div');
    container.dir = language === 'ar' ? 'rtl' : 'ltr';

    const childFirstName = childName.split(' ')[0];
    const nameRegex = new RegExp(`(\\b${childFirstName}\\b!?)`, 'gi');
    let formattedText = text.split('\n\n').map(p => `<p style="margin-bottom: 0.75rem;">${p.trim()}</p>`).join('');
    if (childFirstName) {
        formattedText = formattedText.replace(nameRegex, `<span style="font-weight: 900; text-transform: uppercase;">$1</span>`);
    }

    const ageNum = parseInt(age, 10) || 8;
    let fontSize = '24px'; // Default for older/general

    // Updated logic per new word count rules
    if (ageNum <= 3) fontSize = '42px'; // Minimal text (5-10 words) -> Big font
    else if (ageNum <= 6) fontSize = '32px'; // Short text (10-25 words) -> Medium-Big
    else if (ageNum <= 9) fontSize = '28px'; // Medium text (20-35 words) -> Medium
    else fontSize = '24px'; // Longer text (35-45 words) -> Normal

    container.style.cssText = `
        background-color: rgba(255, 255, 255, 0.45);
        border-radius: ${blobBorderRadii[index % blobBorderRadii.length]};
        color: #203A72;
        padding: 60px;
        font-family: sans-serif;
        font-weight: 700;
        font-size: ${fontSize};
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        line-height: 1.4;
        box-sizing: border-box;
        text-shadow: 0 1px 0 rgba(255,255,255,0.5);
    `;

    container.innerHTML = formattedText;
    return container;
}

export async function createRawyLogoElement(width: number, height: number): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.style.cssText = `width:${width}px;height:${height}px;background:transparent;display:flex;align-items:center;justify-content:center;gap:10px;`;

    // Use Image Logo instead of Text
    const logoIcon = new Image();
    logoIcon.src = '/logo-icon.png';
    logoIcon.style.cssText = "height: 70%; max-width: 50%; object-fit: contain;";

    // Improve loading reliability for PDF generation
    await new Promise((resolve) => {
        logoIcon.onload = resolve;
        logoIcon.onerror = resolve; // Continue even if missing to avoid hang
    });

    const logoText = new Image();
    logoText.src = '/logo-text.png';
    logoText.style.cssText = "height: 40%; max-width: 50%; object-fit: contain;";

    await new Promise((resolve) => {
        logoText.onload = resolve;
        logoText.onerror = resolve;
    });

    container.appendChild(logoIcon);
    container.appendChild(logoText);

    return container;
}

export function createBarcodeStripElement(orderNumber: string, width: number, height: number): HTMLElement {
    const container = document.createElement('div');
    // FIXED: 15mm height is much taller, so we want the bars to fill it.
    container.style.cssText = `width:${width}px;height:${height}px;background:white;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;`;

    // Barcode Row
    const barcodeRow = document.createElement('div');
    barcodeRow.style.cssText = "display:flex; align-items:stretch; justify-content:center; gap:2px; height: 80%; width: 100%;";

    // Barcode Lines
    for (let k = 0; k < 60; k++) {
        const bar = document.createElement('div');
        const isThick = Math.random() > 0.6;
        bar.style.width = isThick ? '6px' : '2px';
        bar.style.height = '100%';
        bar.style.backgroundColor = 'black';
        bar.style.marginLeft = Math.random() > 0.5 ? '2px' : '0';
        barcodeRow.appendChild(bar);
    }
    container.appendChild(barcodeRow);

    // Order Number Text
    const textRow = document.createElement('div');
    textRow.style.cssText = "height: 20%; font-family: monospace; font-size: 10px; color: black; font-weight: bold; margin-top: 2px;";
    textRow.innerText = `ORDER #: ${orderNumber}`;
    container.appendChild(textRow);

    return container;
}

// DEPRECATED: Old Back Cover Element (Kept for safety if referenced elsewhere, though unlikely)
export async function createBackCoverElement(orderNumber: string, width: number, height: number): Promise<HTMLElement> {
    return await createRawyLogoElement(width, height);
}
