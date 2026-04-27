import type { AdminOrder, Language, ProductSize, StoryData, Page } from '../types';

// @ts-ignore
const getHtml2Canvas = () => typeof window !== 'undefined' ? (window as any).html2canvas : null;

/**
 * The main orchestrator for stitching a single image. It creates an off-screen container,
 * sets the base image as the background, positions the overlay elements on top,
 * and then uses html2canvas to render the composite into a new canvas.
 * @param baseImageElement The loaded <img> element of the high-resolution image.
 * @param overlayElements An array of objects, each containing an HTMLElement to overlay and its CSS styles.
 * @returns A Promise that resolves with a high-quality JPEG Blob of the stitched image.
 */
export async function stitchImageWithOverlays(
    baseImageElement: HTMLImageElement,
    overlayElements: { element: HTMLElement, styles: Partial<CSSStyleDeclaration> }[],
    targetWidth?: number,
    targetHeight?: number
): Promise<Blob> {

    const container = document.createElement('div');
    // Position it off-screen
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0px';
    container.style.overflow = 'hidden';

    // Set dimensions to match the hi-res image or target size
    const width = targetWidth || baseImageElement.naturalWidth;
    const height = targetHeight || baseImageElement.naturalHeight;
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    // Set the base image as the background
    // If target size is larger (e.g. for whitespace strip), we should position the base image correctly.
    // Default to top-left (0,0) with no repeat.
    container.style.background = `url(${baseImageElement.src}) no-repeat left top / ${baseImageElement.naturalWidth}px ${baseImageElement.naturalHeight}px`;
    // If there is extra space (e.g. whitespace), we can set a background color for the container if needed.
    container.style.backgroundColor = 'white';

    // Add overlay elements
    overlayElements.forEach(({ element, styles }) => {
        // Apply styles to the element before appending
        Object.assign(element.style, styles);
        container.appendChild(element);
    });

    // Append to DOM to allow html2canvas to render it
    document.body.appendChild(container);

    const html2canvas = getHtml2Canvas();
    if (!html2canvas) throw new Error("html2canvas not loaded");
    const canvas = await html2canvas(container, {
        width: width,
        height: height,
        scale: 1, // Use native resolution
        backgroundColor: '#ffffff', // Ensure white background
        logging: false,
    });

    // Clean up the off-screen element
    document.body.removeChild(container);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob: Blob | null) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to create blob from canvas.'));
            }
        }, 'image/jpeg', 1.0); // High quality JPEG
    });
}
