
import type { StoryData, ShippingDetails, Language, ProductSize, Page } from '../types';
import { getProductSizeById } from './adminService';
import * as imageStore from './imageStore';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';

// jsPDF is now imported via npm — shim keeps existing call sites unchanged
const getJsPDF = () => jsPDF;

// JSZip is now imported via npm — shim keeps existing call sites unchanged
const getJSZip = () => JSZip;

const getHtml2Canvas = () => html2canvas;

const blobBorderRadii = [
    '47% 53% 70% 30% / 30% 43% 57% 70%',
    '36% 64% 64% 36% / 64% 42% 58% 36%',
    '65% 35% 38% 62% / 61% 63% 37% 39%',
    '58% 42% 43% 57% / 41% 54% 46% 59%',
];

export const flipImageHorizontal = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(base64);
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0);
            try {
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            } catch (e) {
                resolve(base64);
            }
        };
        img.onerror = () => resolve(base64);
        img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    });
};

const getImageDimensions = async (base64: string): Promise<{ w: number, h: number }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.onerror = () => resolve({ w: 1600, h: 900 }); // Fallback
        img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    });
};

function getCoverDimensions(imgW: number, imgH: number, targetW: number, targetH: number) {
    const imgRatio = imgW / imgH;
    const targetRatio = targetW / targetH;

    let renderW, renderH, renderX, renderY;

    // Use "contain" logic for panoramas so we don't lose the scenery. 
    // Wait, the PDF spreads are 2-page wide (e.g., orientation: 'l' with format [widthCm*2, height]). 
    // They are effectively 16:9 natively. We should just scale to cover but prioritize width if it's panoramic.
    if (imgRatio > targetRatio) {
        // Image is wider than target. Scale to fit height, crop sides.
        renderH = targetH;
        renderW = renderH * imgRatio;
        renderX = (targetW - renderW) / 2;
        renderY = 0;
    } else {
        // Image is taller than target. Scale to fit width, crop top/bottom.
        renderW = targetW;
        renderH = renderW / imgRatio;
        renderX = 0;
        renderY = (targetH - renderH) / 2;
    }

    // Fallback: if the ratio is close to 16:9 and target is also wide, we just map it.
    // Actually, "cover" logic is standard here. The problem isn't the cropping math; 
    // The problem was we were generating 1:1 boxes and stretching them to 16:9! 
    // Since we fixed the AI to output 16:9, the math here will perfectly align imgRatio with targetRatio!
    return { x: renderX, y: renderY, w: renderW, h: renderH };
}

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
    const html2canvas = getHtml2Canvas();
    const container = document.createElement('div');
    const isAr = language === 'ar';
    container.dir = isAr ? 'rtl' : 'ltr';

    let finalHtml = text.split('\n\n').map(p => `<p style="margin-bottom: 24px; line-height: 1.6;">${p.trim()}</p>`).join('');

    if (childName) {
        const childFirstName = childName.trim().split(/\s+/)[0];
        const escapedName = childFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
        finalHtml = finalHtml.replace(nameRegex, `<span style="font-weight: 900; color: ${style === 'clean' && !isAr ? 'white' : 'black'}; font-size: 1.1em;">$1</span>`);
    }

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

    if (style === 'box') {
        css += `
            background-color: rgba(255, 255, 255, 0.6);
            border-radius: 50px;
            color: #000000;
            border: 4px solid rgba(255,255,255,0.8);
            box-shadow: 0 8px 16px rgba(0,0,0,0.1); 
        `;
    } else {
        css += `
            background-color: transparent;
            color: ${isAr ? '#000000' : '#FFFFFF'};
            text-shadow: ${isAr ? 'none' : '2px 2px 4px rgba(0,0,0,0.8)'};
        `;
    }

    container.style.cssText = css;
    container.innerHTML = finalHtml;
    document.body.appendChild(container);
    const canvas = await html2canvas(container, { backgroundColor: null, scale: 3 });
    document.body.removeChild(container);
    return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
};

export async function generatePreviewPdf(storyData: StoryData, language: Language, highResImages?: imageStore.OrderImages, orderNumber?: string): Promise<Blob> {
    const jsPDF = getJsPDF();
    if (!jsPDF) throw new Error("jsPDF not loaded");

    const sizeConfig = await getProductSizeById(storyData.size) || { page: { widthCm: 20, heightCm: 20 } };

    const pdf = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: [sizeConfig.page.widthCm * 20, sizeConfig.page.heightCm * 10]
    });

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    const normalizeImage = async (input: string | undefined): Promise<string> => {
        if (!input) return "";
        if (input.startsWith('http')) {
            try {
                // Use a longer timeout for asset fetching
                const resp = await fetch(input, { signal: AbortSignal.timeout(30000) }); 
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const blob = await resp.blob();
                return await blobToBase64(blob);
            } catch (e) {
                console.error("[normalizeImage] Failed to fetch:", input, e);
                return "";
            }
        }
        return input;
    };

    let coverData = storyData.coverImageUrl;
    if (highResImages?.cover) {
        coverData = await blobToBase64(highResImages.cover);
    } else {
        coverData = await normalizeImage(coverData);
    }

    if (coverData && coverData.length > 50) {
        let cleanB64 = coverData.includes(',') ? coverData.split(',')[1] : coverData;

        // --- READ ALL COVER LAYOUT FROM EDITOR (spreads[0]) ---
        // The editor writes all layout overrides to spreads[0].
        // We read them here so the PDF exactly mirrors what the admin set.
        const coverSpread = (storyData.spreads && storyData.spreads.length > 0)
            ? storyData.spreads.find((s: any) => s.spreadNumber === 0) || storyData.spreads[0]
            : null;
        const coverImgOffsetX: number = coverSpread?.imageOffsetX ?? 0;   // % horizontal pan
        const coverImgOffsetY: number = coverSpread?.imageOffsetY ?? 0;   // % vertical pan
        const coverImgScale: number  = coverSpread?.imageScale ?? 100;    // 100 = normal
        const coverTxtOffsetX: number | undefined = coverSpread?.textOffsetX; // mm, if set
        const coverTxtOffsetY: number | undefined = coverSpread?.textOffsetY; // mm, if set

        // COVER FLIP: Removed!
        // The PDF should render the image EXACTLY as the editor does. 
        // The editor handles the 'flip' conceptually by moving the text to the other side.
        // It does not flip the actual image pixels. Therefore, the PDF should not flip the image.


        // --- COVER IMAGE PLACEMENT with pan + zoom from editor ---
        const imgDim = await getImageDimensions(cleanB64);
        const baseDim = getCoverDimensions(imgDim.w, imgDim.h, pdfW, pdfH);

        // Apply scale: grow the image around its center
        const scale = coverImgScale / 100;
        const scaledW = baseDim.w * scale;
        const scaledH = baseDim.h * scale;
        const baseCenterX = baseDim.x + baseDim.w / 2;
        const baseCenterY = baseDim.y + baseDim.h / 2;
        // Apply pan: offset is a % of the PDF dimensions
        const panX = pdfW * (coverImgOffsetX / 100);
        const panY = pdfH * (coverImgOffsetY / 100);
        const finalImgX = baseCenterX - scaledW / 2 + panX;
        const finalImgY = baseCenterY - scaledH / 2 + panY;

        try {
            pdf.addImage(`data:image/jpeg;base64,${cleanB64}`, 'JPEG', finalImgX, finalImgY, scaledW, scaledH);
        } catch (e) { console.warn("PDF Cover Add Failed", e); }

        const isAr = language === 'ar';
        // Front half center X — where title and hero names should be centered
        const coverSide = storyData.coverTextSide || (language === 'ar' ? 'left' : 'right');
        const frontCenterX = coverSide === 'left' ? pdfW * 0.25 : pdfW * 0.75;

        // --- TITLE & SUBTITLE PLACEMENT ---
        // If the editor set a manual textOffsetX/Y, respect them exactly (mm).
        // Otherwise use auto position on the front half.
        if (storyData.title && storyData.title.trim()) {
            const heroNames = (storyData as any).coverSubtitle || storyData.childName || '';
            const titleB64 = await createTextImage({ title: storyData.title, subtitle: heroNames }, language);
            const tw = pdfW * 0.4;
            const titleAspect = 1000 / 200;
            const th = tw / titleAspect;
            // Manual offset from editor takes priority
            const tx = coverTxtOffsetX !== undefined ? coverTxtOffsetX : frontCenterX - (tw / 2);
            const ty = coverTxtOffsetY !== undefined ? coverTxtOffsetY : pdfH * 0.08;
            pdf.addImage(titleB64, 'PNG', tx, ty, tw, th);
        }


        if (orderNumber) {
            const stripWidthMm = 3;
            const stripHeightMm = pdfH;
            const stripPxW = 50;
            const stripPxH = 5000;
            const html2canvas = getHtml2Canvas();
            const metaContainer = createMetadataStripElement(orderNumber, 0, stripPxW, stripPxH);
            document.body.appendChild(metaContainer);
            const metaCanvas = await html2canvas(metaContainer, { backgroundColor: null, scale: 2 });
            document.body.removeChild(metaContainer);
            const metaImg = metaCanvas.toDataURL('image/png');
            pdf.addImage(metaImg, 'PNG', pdfW - stripWidthMm, 0, stripWidthMm, stripHeightMm);

            // Barcode: 30mm × 5mm compact, vertically aligned to logo center
            const barcodeW = 30;
            const barcodeH = 5;
            const barcodeMargin = 5;
            const barcodeX = isAr ? pdfW - barcodeMargin - barcodeW : barcodeMargin;

            const bcPxW = 600;
            const bcPxH = 100;
            const bcEl = createBarcodeStripElement(orderNumber, bcPxW, bcPxH);
            document.body.appendChild(bcEl);
            const bcCanvas = await html2canvas(bcEl, { backgroundColor: '#ffffff', scale: 2, width: bcPxW, height: bcPxH });
            document.body.removeChild(bcEl);
            const bcImg = bcCanvas.toDataURL('image/png');

            // Logo: fetch directly, preserve aspect ratio, inward from spine
            const logoB64 = await getRawyLogoBase64();
            if (logoB64 && logoB64.length > 100) {
                const logoDim = await getImageDimensions(logoB64.includes(',') ? logoB64.split(',')[1] : logoB64);
                const logoW = 22;
                const logoH = logoDim.w > 0 ? logoW * (logoDim.h / logoDim.w) : logoW;
                const logoX = isAr ? (pdfW / 2) + 20 : (pdfW / 2) - 20 - logoW;
                const logoY = pdfH - 6 - logoH;
                pdf.addImage(logoB64, 'PNG', logoX, logoY, logoW, logoH);
                // Barcode vertically centered with logo
                const barY = logoY + logoH / 2 - barcodeH / 2;
                pdf.addImage(bcImg, 'PNG', barcodeX, barY, barcodeW, barcodeH);
            } else {
                pdf.addImage(bcImg, 'PNG', barcodeX, pdfH - barcodeMargin - barcodeH, barcodeW, barcodeH);
            }
        }
    }

    // Filter out the cover spread (spreadNumber 0) to avoid rendering it twice
    // since the cover is already added above from storyData.coverImageUrl
    const allSpreads = (storyData.spreads && storyData.spreads.length > 0) ? storyData.spreads : (storyData.pages ?? []);
    const spreads = allSpreads.filter((s: any) => {
        // Skip spread 0 (cover) — it has no story text and its image is the cover
        if (s.spreadNumber === 0) return false;
        // Also skip if its illustrationUrl matches the cover (safety net)
        if (s.illustrationUrl && storyData.coverImageUrl && s.illustrationUrl === storyData.coverImageUrl) return false;
        return true;
    });
    console.log(`[generatePreviewPdf] Found ${spreads.length} story spreads to process (${allSpreads.length} total, cover excluded).`);

    for (let i = 0; i < spreads.length; i++) {
        pdf.addPage();
        const spread = spreads[i];
        let illustration = spread.illustrationUrl;
        if (highResImages?.spreads[i]) {
            illustration = await blobToBase64(highResImages.spreads[i]);
        } else {
            illustration = await normalizeImage(illustration);
        }

        if (illustration && illustration.length > 50) {
            console.log(`[generatePreviewPdf] Adding illustration for spread ${i}...`);
            const cleanB64 = illustration.includes(',') ? illustration.split(',')[1] : illustration;
            const imgDim = await getImageDimensions(cleanB64);
            const dim = getCoverDimensions(imgDim.w, imgDim.h, pdfW, pdfH);
            try {
                pdf.addImage(`data:image/jpeg;base64,${cleanB64}`, 'JPEG', dim.x, dim.y, dim.w, dim.h);
            } catch (e) { console.warn(`[generatePreviewPdf] Spread ${i} Add Failed`, e); }
        } else {
            console.warn(`[generatePreviewPdf] No illustration found or fetch failed for spread ${i}. URL: ${spread.illustrationUrl}`);
        }

        // Combine leftText + rightText for the full spread story text.
        // Use || chain only for fallbacks (textBlocks, text field).
        const leftPart = spread.leftText || '';
        const rightPart = spread.rightText || '';
        const combinedText = [leftPart, rightPart].filter(Boolean).join(' ');
        const spreadText = combinedText
            || (spread.textBlocks?.map((b: any) => b.text).join(' '))
            || spread.text
            || '';

        if (spreadText.trim()) {
            // Determine which side the text sits on (use saved textSide, else language default)
            const textSide = spread.textSide || ((language === 'ar') ? 'right' : 'left');

            const ageNum = parseInt(storyData.childAge, 10) || 6;
            let fontSize = 48;
            if (ageNum >= 10) fontSize = 32;
            else if (ageNum >= 7) fontSize = 40;
            else if (ageNum >= 4) fontSize = 48;

            const blobImg = await renderTextBlobToImage(
                spreadText,
                800,
                600,
                i,
                language,
                fontSize,
                storyData.childName,
                'box'
            );

            const rectW = pdfW * 0.35;
            let rectH = rectW * 0.6;
            if (blobImg && blobImg.width > 0) {
                rectH = rectW * (blobImg.height / blobImg.width);
            }

            // --- COORDINATE RESOLUTION ---
            // SpreadLayoutPanel saves textOffsetX/Y as absolute mm in PDF_W=400 space.
            // The actual PDF uses the same mm unit, so we use them directly.
            // Only fall back to side-based default when no manual offset is set.
            let rectX: number;
            let rectY: number;

            if (spread.textOffsetX !== undefined && spread.textOffsetY !== undefined) {
                // Manual editor coordinates (absolute mm) — use directly
                rectX = spread.textOffsetX;
                rectY = spread.textOffsetY;
            } else {
                // Auto-position based on text side
                rectX = (textSide === 'left') ? pdfW * 0.03 : pdfW * 0.62;
                rectY = (pdfH / 2) - (rectH / 2);
            }

            if (blobImg && blobImg.dataUrl) {
                pdf.addImage(blobImg.dataUrl, 'PNG', rectX, rectY, rectW, rectH);
            }
        }

        if (orderNumber) {
            const stripWidthMm = 3;
            const stripHeightMm = pdfH;
            const stripPxW = 50;
            const stripPxH = 5000;
            const html2canvas = getHtml2Canvas();
            const metaContainer = createMetadataStripElement(orderNumber, i + 1, stripPxW, stripPxH);
            document.body.appendChild(metaContainer);
            const metaCanvas = await html2canvas(metaContainer, { backgroundColor: null, scale: 2 });
            document.body.removeChild(metaContainer);
            const metaImg = metaCanvas.toDataURL('image/png');
            pdf.addImage(metaImg, 'PNG', pdfW - stripWidthMm, 0, stripWidthMm, stripHeightMm);
        }
    }

    // append DNA Verification page
    const visualDNA = storyData.styleReferenceImageBase64 || (storyData.mainCharacter?.imageBases64 && storyData.mainCharacter.imageBases64[0]);
    const secondDNA = storyData.secondCharacterImageBase64 || storyData.secondCharacter?.imageBases64?.[0];

    if (visualDNA || secondDNA) {
        pdf.addPage();
        try {
            if (visualDNA && secondDNA) {
                const b64_1 = visualDNA.includes(',') ? visualDNA.split(',')[1] : visualDNA;
                const b64_2 = secondDNA.includes(',') ? secondDNA.split(',')[1] : secondDNA;

                const boxW = pdfW * 0.4;
                const gap = pdfW * 0.05;
                const startX = (pdfW - (boxW * 2 + gap)) / 2;

                const imgDim1 = await getImageDimensions(b64_1);
                const rectH1 = boxW * (imgDim1.h / imgDim1.w);
                const rectY1 = (pdfH - rectH1) / 2;

                const imgDim2 = await getImageDimensions(b64_2);
                const rectH2 = boxW * (imgDim2.h / imgDim2.w);
                const rectY2 = (pdfH - rectH2) / 2;

                pdf.addImage(`data:image/jpeg;base64,${b64_1}`, 'JPEG', startX, rectY1, boxW, rectH1);
                pdf.addImage(`data:image/jpeg;base64,${b64_2}`, 'JPEG', startX + boxW + gap, rectY2, boxW, rectH2);
            } else if (visualDNA) {
                const b64 = visualDNA.includes(',') ? visualDNA.split(',')[1] : visualDNA;
                const imgDim = await getImageDimensions(b64);
                const dim = getCoverDimensions(imgDim.w, imgDim.h, pdfW, pdfH);
                pdf.addImage(`data:image/jpeg;base64,${b64}`, 'JPEG', dim.x, dim.y, dim.w, dim.h);
            }

            // Add title over it
            const verifyTitleB64 = await createTextImage({ title: "REFERENCE DNA VERIFICATION" }, language);
            const titleAspect = 1000 / 200;
            const tw = pdfW * 0.6;
            const th = tw / titleAspect;
            const tx = (pdfW - tw) / 2;
            const ty = pdfH * 0.1;
            pdf.addImage(verifyTitleB64, 'PNG', tx, ty, tw, th);
        } catch (e) {
            console.warn("Failed to add DNA Verification page", e);
        }
    }

    return pdf.output('blob');
}

export const generateStitchedPdf = async (
    coverBlob: Blob,
    spreadBlobs: Blob[],
    sizeConfig: ProductSize,
    storyDetails: { title: string, childName: string, childAge: string, secondCharacterName?: string },
    pages: { text: string }[],
    language: import('../types').Language = 'en',
    orderNumber?: string,
    skipTextOverlay: boolean = false
): Promise<Blob> => {
    const jsPDF = getJsPDF();
    if (!jsPDF) throw new Error("jsPDF not loaded");

    console.log(`[generateStitchedPdf] Starting for order ${orderNumber || 'unknown'}. Spreads: ${spreadBlobs.length}, skipText: ${skipTextOverlay}`);

    const pdf = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: [sizeConfig.page.widthCm * 2, sizeConfig.page.heightCm]
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
        // AI generates covers in Arabic-native layout (heroes on left = front for RTL).
        // For English/LTR books, the front cover is the RIGHT half — so we flip the cover
        // to move the heroes to the correct side. Arabic books need no flip.
        if (language !== 'ar') {
            try {
                const flippedDataUrl = await flipImageHorizontal(cleanCover);
                cleanCover = flippedDataUrl.split(',')[1];
            } catch (e) {
                console.error("Failed to flip English cover (Stitched)", e);
            }
        }

        const imgDim = await getImageDimensions(cleanCover);
        const dim = getCoverDimensions(imgDim.w, imgDim.h, pdfW, pdfH);
        try {
            pdf.addImage(`data:image/jpeg;base64,${cleanCover}`, 'JPEG', dim.x, dim.y, dim.w, dim.h);
        } catch (e) { console.warn("PDF Cover Add Failed", e); }

        const isAr = language === 'ar';
        if (storyDetails.title && storyDetails.title.trim()) {
            const titleB64 = await createTextImage({ title: storyDetails.title }, language);

            const tw = pdfW * 0.4;
            const titleAspect = 1000 / 200;
            const th = tw / titleAspect;
            let tx;
            if (isAr) {
                tx = (pdfW * 0.25) - (tw / 2);
            } else {
                tx = (pdfW * 0.75) - (tw / 2);
            }
            const ty = pdfH * 0.08;
            pdf.addImage(titleB64, 'PNG', tx, ty, tw, th);
        }

        if (orderNumber) {
            const stripWidthMm = 3;
            const stripHeightMm = pdfH;
            const stripPxW = 50;
            const stripPxH = 5000;
            const html2canvas = getHtml2Canvas();

            const metaContainer = createMetadataStripElement(orderNumber, 0, stripPxW, stripPxH);
            document.body.appendChild(metaContainer);
            const metaCanvas = await html2canvas(metaContainer, { backgroundColor: null, scale: 2 });
            document.body.removeChild(metaContainer);
            const metaImg = metaCanvas.toDataURL('image/png');
            pdf.addImage(metaImg, 'PNG', pdfW - stripWidthMm, 0, stripWidthMm, stripHeightMm);

            // Barcode: 30mm × 5mm compact
            const barcodeW = 30;
            const barcodeH = 5;
            const barcodeMargin = 5;
            const barcodeX = isAr ? pdfW - barcodeMargin - barcodeW : barcodeMargin;
            const barcodeY = pdfH - barcodeMargin - barcodeH;

            const bcPxW = 600;
            const bcPxH = 100;
            const bcEl = createBarcodeStripElement(orderNumber, bcPxW, bcPxH);
            document.body.appendChild(bcEl);
            const bcCanvas = await html2canvas(bcEl, { backgroundColor: '#ffffff', scale: 2, width: bcPxW, height: bcPxH });
            document.body.removeChild(bcEl);
            const bcImg = bcCanvas.toDataURL('image/png');
            pdf.addImage(bcImg, 'PNG', barcodeX, barcodeY, barcodeW, barcodeH);

            // Logo: fetch directly, preserve aspect ratio
            const logoB64Stitched = await getRawyLogoBase64();
            if (logoB64Stitched && logoB64Stitched.length > 100) {
                const logoDimS = await getImageDimensions(logoB64Stitched.includes(',') ? logoB64Stitched.split(',')[1] : logoB64Stitched);
                const logoW = 25;
                const logoH = logoDimS.w > 0 ? logoW * (logoDimS.h / logoDimS.w) : logoW;
                const logoX = isAr ? (pdfW / 2) + 5 : (pdfW / 2) - 5 - logoW;
                const logoY = pdfH - 8 - logoH;
                pdf.addImage(logoB64Stitched, 'PNG', logoX, logoY, logoW, logoH);
            }
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
            try {
                const imgDim = await getImageDimensions(cleanSpread);
                const dim = getCoverDimensions(imgDim.w, imgDim.h, pdfW, pdfH);
                pdf.addImage(`data:image/jpeg;base64,${cleanSpread}`, 'JPEG', dim.x, dim.y, dim.w, dim.h);
            } catch (e) {
                console.error(`Failed to add spread ${i} to PDF`, e);
            }
        }

        if (!skipTextOverlay && pages && pages[i] && pages[i].text) {
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
                'box'
            );

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
                isLeft = language !== 'ar'; // Legacy fallback for Stitched: English left page, Arabic right page.
            }

            const txtX = isLeft ? marginX : (pdfW - txtW - marginX);
            const txtY = pdfH - txtH - marginY;

            const cleanData = blobImg.dataUrl.includes(',') ? blobImg.dataUrl.split(',')[1] : blobImg.dataUrl;
            try {
                pdf.addImage(`data:image/png;base64,${cleanData}`, 'PNG', txtX, txtY, txtW, txtH);
            } catch (e) { console.warn("Text Add Failed", e); }
        }

        if (orderNumber) {
            const stripWidthMm = 3;
            const stripHeightMm = pdfH;
            const stripPxW = 50;
            const stripPxH = 5000;
            const html2canvas = getHtml2Canvas();

            const metaContainer = createMetadataStripElement(orderNumber, i + 1, stripPxW, stripPxH);
            document.body.appendChild(metaContainer);
            const metaCanvas = await html2canvas(metaContainer, { backgroundColor: null, scale: 2 });
            document.body.removeChild(metaContainer);
            const metaImg = metaCanvas.toDataURL('image/png');
            pdf.addImage(metaImg, 'PNG', pdfW - stripWidthMm, 0, stripWidthMm, stripHeightMm);
        }
    }

    // append DNA Verification page for stitched PDF
    const dnaReference = (storyDetails as any).styleReferenceImageBase64;
    const secondDnaReference = (storyDetails as any).secondCharacterImageBase64;

    if (dnaReference || secondDnaReference) {
        pdf.addPage();
        try {
            if (dnaReference && secondDnaReference) {
                const b64_1 = dnaReference.includes(',') ? dnaReference.split(',')[1] : dnaReference;
                const b64_2 = secondDnaReference.includes(',') ? secondDnaReference.split(',')[1] : secondDnaReference;

                const boxW = pdfW * 0.4;
                const gap = pdfW * 0.05;
                const startX = (pdfW - (boxW * 2 + gap)) / 2;

                const imgDim1 = await getImageDimensions(b64_1);
                const rectH1 = boxW * (imgDim1.h / imgDim1.w);
                const rectY1 = (pdfH - rectH1) / 2;

                const imgDim2 = await getImageDimensions(b64_2);
                const rectH2 = boxW * (imgDim2.h / imgDim2.w);
                const rectY2 = (pdfH - rectH2) / 2;

                pdf.addImage(`data:image/jpeg;base64,${b64_1}`, 'JPEG', startX, rectY1, boxW, rectH1);
                pdf.addImage(`data:image/jpeg;base64,${b64_2}`, 'JPEG', startX + boxW + gap, rectY2, boxW, rectH2);
            } else if (dnaReference) {
                const b64 = dnaReference.includes(',') ? dnaReference.split(',')[1] : dnaReference;
                const imgDim = await getImageDimensions(b64);
                const dim = getCoverDimensions(imgDim.w, imgDim.h, pdfW, pdfH);
                pdf.addImage(`data:image/jpeg;base64,${b64}`, 'JPEG', dim.x, dim.y, dim.w, dim.h);
            }

            // Add title over it
            const verifyTitleB64 = await createTextImage({ title: "REFERENCE DNA VERIFICATION" }, language);
            const titleAspect = 1000 / 200;
            const tw = pdfW * 0.6;
            const th = tw / titleAspect;
            const tx = (pdfW - tw) / 2;
            const ty = pdfH * 0.1;
            pdf.addImage(verifyTitleB64, 'PNG', tx, ty, tw, th);
        } catch (e) {
            console.warn("Failed to add DNA Verification page", e);
        }
    }

    return pdf.output('blob');
};

export const uploadOrderFiles = async (orderNumber: string, zipBlob: Blob): Promise<string | null> => {
    try {
        const { supabase } = await import('../utils/supabaseClient');
        const filename = `${orderNumber}_Package.zip`;
        const { data, error } = await supabase.storage
            .from('order-files')
            .upload(filename, zipBlob, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error("Supabase Storage Upload Error:", error);
            return null;
        }

        const { data: publicData } = supabase.storage.from('order-files').getPublicUrl(filename);
        return publicData.publicUrl;
    } catch (e) {
        console.error("Upload failed exception:", e);
        return null;
    }
};

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

    const topText = document.createElement('div');
    topText.style.cssText = `
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font-family: monospace;
        font-size: 92px;
        font-weight: 900;
        color: black;
        letter-spacing: 16px;
    `;
    topText.innerText = `ORDER #${orderNumber}`;
    container.appendChild(topText);

    const bottomGroup = document.createElement('div');
    bottomGroup.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 100px;
        width: 100%;
        padding-bottom: 40px;
    `;

    const spreadText = document.createElement('div');
    spreadText.style.cssText = `
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font-family: monospace;
        font-size: 72px;
        font-weight: bold;
        color: #333;
    `;
    spreadText.innerText = `SPREAD ${spreadIndex}`;
    bottomGroup.appendChild(spreadText);

    const bcContainer = document.createElement('div');
    bcContainer.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:16px; width: 100%; padding: 0 10px;";

    for (let k = 0; k < 14; k++) {
        const bar = document.createElement('div');
        bar.style.width = Math.random() > 0.5 ? '100%' : '70%';
        bar.style.height = Math.random() > 0.5 ? '80px' : '40px';
        bar.style.backgroundColor = 'black';
        bcContainer.appendChild(bar);
    }
    bottomGroup.appendChild(bcContainer);

    container.appendChild(bottomGroup);
    return container;
}

export async function createTextImage(titleData: { title: string, subtitle?: string }, lang: Language): Promise<string> {
    const html2canvas = getHtml2Canvas();
    const container = document.createElement('div');
    const isAr = lang === 'ar';
    const isEn = lang === 'en';
    const fontFamily = isAr ? "'Tajawal', sans-serif" : (isEn ? "'Luckiest Guy', cursive" : "'Nunito', sans-serif");
    const letterSpacing = isAr ? 'normal' : '2px';
    const color = '#FFFFFF';
    const textShadow = '4px 4px 0 #203A72, -2px -2px 0 #203A72, 2px -2px 0 #203A72, -2px 2px 0 #203A72, 2px 2px 0 #203A72, 0 8px 15px rgba(0,0,0,0.3)';
    const transform = isAr ? 'none' : 'rotate(-2deg)';

    // Use position:fixed (not absolute left:-9999px) so html2canvas can capture the element
    // even when it's rendered off the visible scroll area.
    container.style.cssText = `position:fixed;top:-9999px;left:-9999px;display:flex;flex-direction:column;align-items:center;font-family:${fontFamily};color:${color};background:rgba(0,0,0,0.35);border-radius:24px;font-weight:900;text-shadow:${textShadow};padding:28px 40px;text-align:center;width:1000px;text-transform:uppercase;letter-spacing:${letterSpacing};transform:${transform};`;
    container.dir = lang === 'ar' ? 'rtl' : 'ltr';
    container.innerHTML = `
        <div style="font-weight:900;line-height:1.1;font-size:90px;">${titleData.title || '&nbsp;'}</div>
        ${titleData.subtitle ? `<div style="font-weight:700;line-height:1.2;font-size:45px;margin-top:20px;opacity:0.95;">${titleData.subtitle}</div>` : ''}
    `;
    document.body.appendChild(container);

    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Tajawal:wght@400;700;900&family=Nunito:wght@900&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
    await document.fonts.ready;

    const canvas = await html2canvas(container, { backgroundColor: null, scale: 2 });
    document.body.removeChild(container);
    return canvas.toDataURL('image/png');
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
    const QRCode = typeof window !== 'undefined' ? (window as any).QRCode : null;
    let dataUrl = "";
    if (QRCode && QRCode.toDataURL) {
        dataUrl = await QRCode.toDataURL(text, { width: width, margin: 0 });
    }
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
    let fontSize = '24px';
    if (ageNum <= 3) fontSize = '42px';
    else if (ageNum <= 6) fontSize = '32px';
    else if (ageNum <= 9) fontSize = '28px';
    else fontSize = '24px';

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

/**
 * Fetches the Rawy logo PNG directly and returns a base64 data URL.
 * Uses the single combined logo (icon + "Rawy" text) with transparent background.
 */
export async function getRawyLogoBase64(): Promise<string> {
    try {
        const resp = await fetch('/rawy-logo.png', { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) throw new Error(`Logo fetch failed: ${resp.status}`);
        const blob = await resp.blob();
        return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('[getRawyLogoBase64] Could not fetch /rawy-logo.png, logo will be skipped.', e);
        return '';
    }
}

/** @deprecated — kept for backward compat, use getRawyLogoBase64 instead */
export async function createRawyLogoElement(width: number, height: number): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.style.cssText = `width:${width}px;height:${height}px;background:white;display:flex;align-items:center;justify-content:center;`;
    const img = new Image();
    img.src = '/rawy-logo.png';
    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
    await new Promise((res) => { img.onload = res; img.onerror = res; });
    container.appendChild(img);
    return container;
}

export function createBarcodeStripElement(orderNumber: string, width: number, height: number): HTMLElement {
    const container = document.createElement('div');
    // White background, column layout: bars on top, order text on bottom
    container.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        background: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        padding: 8px;
        box-sizing: border-box;
        overflow: hidden;
    `;

    // Barcode bars row (takes 65% of height)
    const barcodeRow = document.createElement('div');
    barcodeRow.style.cssText = `
        display: flex;
        align-items: stretch;
        justify-content: center;
        gap: 2px;
        width: 100%;
        flex: 0 0 65%;
    `;
    for (let k = 0; k < 55; k++) {
        const bar = document.createElement('div');
        const isThick = Math.random() > 0.65;
        bar.style.cssText = `
            width: ${isThick ? '5' : '2'}px;
            height: 100%;
            background-color: black;
            margin-left: ${Math.random() > 0.5 ? '1' : '0'}px;
            flex-shrink: 0;
        `;
        barcodeRow.appendChild(bar);
    }
    container.appendChild(barcodeRow);

    // Order number label (clearly shown below bars)
    const textRow = document.createElement('div');
    textRow.style.cssText = `
        flex: 0 0 35%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Courier New', Courier, monospace;
        font-size: 14px;
        font-weight: 700;
        color: #000000;
        letter-spacing: 1.5px;
        width: 100%;
        padding-top: 4px;
        white-space: nowrap;
    `;
    textRow.innerText = orderNumber;
    container.appendChild(textRow);

    return container;
}

export const generatePrintPackage = async (storyData: StoryData, shipping: ShippingDetails, language: Language, orderNumber: string) => {
    try {
        const zip = new JSZip();

        const pdfBlob = await generatePreviewPdf(storyData, language, undefined, orderNumber);
        zip.file(`${orderNumber}_Preview.pdf`, pdfBlob);

        let storyText = `Title: ${storyData.title}\nAuthor: ${storyData.childName}\n\n`;
        (storyData.pages ?? []).forEach(p => {
            storyText += `[Page ${p.pageNumber}]\n${p.text}\n\n`;
        });
        zip.file('story_narrative.txt', storyText);

        const imagesFolder = zip.folder("raw_images");

        const getBase64Data = async (input: string): Promise<string> => {
            if (!input) return "";
            if (input.startsWith('http')) {
                try {
                    console.log(`[generatePrintPackage] Fetching image: ${input}`);
                    const resp = await fetch(input, { signal: AbortSignal.timeout(30000) });
                    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
                    const blob = await resp.blob();
                    const b64 = await blobToBase64(blob);
                    return b64.split(',')[1];
                } catch (e) {
                    console.error("[generatePrintPackage] Failed to fetch image for zip:", input, e);
                    return "";
                }
            }
            return input.includes(',') ? input.split(',')[1] : input;
        };

        if (storyData.coverImageUrl) {
            const coverB64 = await getBase64Data(storyData.coverImageUrl);
            if (coverB64) imagesFolder?.file("cover.jpg", coverB64, { base64: true });
        }

        // Use spreads if available (more reliable for illustration URLs)
        const assetSource = (storyData.spreads && storyData.spreads.length > 0) ? storyData.spreads : (storyData.pages ?? []);
        console.log(`[generatePrintPackage] Processing ${assetSource.length} assets from ${storyData.spreads ? 'spreads' : 'pages'} array.`);
        
        const pagePromises = assetSource.map(async (item: any, idx: number) => {
            if (item.illustrationUrl) {
                try {
                    const imgB64 = await getBase64Data(item.illustrationUrl);
                    if (imgB64 && imgB64.length > 100) {
                        const pageNum = item.spreadNumber ?? item.pageNumber ?? (idx + 1);
                        imagesFolder?.file(`page_${pageNum}.jpg`, imgB64, { base64: true });
                        console.log(`[generatePrintPackage] Successfully added page_${pageNum}.jpg to ZIP.`);
                    } else {
                        console.warn(`[generatePrintPackage] Skipping page ${idx + 1}: empty or invalid base64 data.`);
                    }
                } catch (e) {
                    console.error(`[generatePrintPackage] Critical error processing page ${idx + 1}:`, e);
                }
            } else {
                console.warn(`[generatePrintPackage] Page ${idx + 1} has no illustrationUrl.`);
            }
        });

        await Promise.all(pagePromises);
        
        // Add debugging manifest
        zip.file("generation_manifest.json", JSON.stringify({
            orderNumber,
            timestamp: new Date().toISOString(),
            assetsFound: assetSource.length,
            storyData: {
                ...storyData,
                spreads: (storyData.spreads || []).map((s: any) => ({
                    ...s,
                    // Ensure all layout data is explicitly preserved
                    textSide: s.textSide,
                    textOffsetX: s.textOffsetX,
                    textOffsetY: s.textOffsetY,
                    imageOffsetX: s.imageOffsetX,
                    imageOffsetY: s.imageOffsetY,
                    imageScale: s.imageScale
                }))
            }
        }, null, 2));

        const artifactsFolder = zip.folder("workflow_artifacts");
        if (storyData.blueprint) artifactsFolder?.file("1_blueprint.json", JSON.stringify(storyData.blueprint, null, 2));
        if (storyData.rawScript) artifactsFolder?.file("2a_raw_script.json", JSON.stringify(storyData.rawScript, null, 2));
        if (storyData.pages && storyData.pages.length > 0) artifactsFolder?.file("2b_edited_script.json", JSON.stringify(storyData.pages.map((p: any) => ({ spreadNumber: p.pageNumber, text: p.text })), null, 2));
        if (storyData.spreadPlan) artifactsFolder?.file("3_visual_plan.json", JSON.stringify(storyData.spreadPlan, null, 2));
        if (storyData.finalPrompts) artifactsFolder?.file("5_prompts.json", JSON.stringify(storyData.finalPrompts, null, 2));
        artifactsFolder?.file("full_story_data.json", JSON.stringify(storyData, null, 2));

        let detailedPrompts = `STORY GENERATION LOG — SEED PROMPTS (what you see in the UI textarea)\n--------------------------------\n`;
        let actualGeminiPrompts = `STORY GENERATION LOG — ACTUAL GEMINI PROMPTS (what was sent to the AI)\n--------------------------------\n`;

        if (storyData.actualCoverPrompt) {
            detailedPrompts += `COVER PROMPT (SEED)\n${storyData.actualCoverPrompt}\n--------------------------------\n\n`;
            artifactsFolder?.file("0_cover_prompt_seed.txt", storyData.actualCoverPrompt);
        }
        if ((storyData as any).lastGeminiCoverPrompt) {
            actualGeminiPrompts += `COVER PROMPT (ACTUAL SENT TO GEMINI)\n${(storyData as any).lastGeminiCoverPrompt}\n--------------------------------\n\n`;
            artifactsFolder?.file("0_cover_prompt_actual_gemini.txt", (storyData as any).lastGeminiCoverPrompt);
        }

        (storyData.pages ?? []).forEach(p => {
            detailedPrompts += `PAGE ${p.pageNumber}\nTEXT: ${p.text}\nSEED PROMPT (UI textarea):\n${p.actualPrompt || 'N/A'}\n--------------------------------\n\n`;
            actualGeminiPrompts += `PAGE ${p.pageNumber}\nTEXT: ${p.text}\nACTUAL GEMINI PROMPT:\n${(p as any).lastGeminiPrompt || '(not yet generated — run Paint Spread first)'}\n--------------------------------\n\n`;
        });
        artifactsFolder?.file("debug_seed_prompts.txt", detailedPrompts);
        artifactsFolder?.file("debug_actual_gemini_prompts.txt", actualGeminiPrompts);

        const manifest = {
            orderNumber,
            date: new Date().toISOString(),
            shipping,
            storySummary: {
                title: storyData.title,
                childName: storyData.childName,
                childAge: storyData.childAge,
                size: storyData.size,
                pageCount: (storyData.pages ?? []).length
            },
            pages: (storyData.pages ?? []).map(p => ({
                pageNumber: p.pageNumber,
                text: p.text
            }))
        };
        zip.file('order_manifest.json', JSON.stringify(manifest, null, 2));

        const content = await zip.generateAsync({ type: 'blob' });
        return content;
    } catch (e) {
        console.error("Error generating print package:", e);
        throw e;
    }
};

export const downloadCoverImage = async (storyData: StoryData, language: Language) => {
    try {
        const link = document.createElement('a');
        link.href = storyData.coverImageUrl || '';
        link.download = `Rawy_Cover_\${storyData.childName}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Error downloading cover:", e);
    }
};
