
import type { AdminOrder, Language, ProductSize, StoryData, Page } from '../types';

/**
 * The main orchestrator for stitching a single image. It creates an off-screen container,
 * sets the base image as the background, positions the overlay elements on top,
 * and then uses html2canvas to render the composite into a new canvas.
 */
export async function stitchImageWithOverlays(
    baseImageElement: HTMLImageElement,
    overlayElements: { element: HTMLElement, styles: Partial<CSSStyleDeclaration> }[],
    targetWidth?: number,
    targetHeight?: number
): Promise<Blob> {
    // @ts-ignore
    const html2canvas = window.html2canvas;
    if (!html2canvas) throw new Error("html2canvas not found");

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0px';
    container.style.overflow = 'hidden';

    const width = targetWidth || baseImageElement.naturalWidth;
    const height = targetHeight || baseImageElement.naturalHeight;
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    container.style.background = `url(${baseImageElement.src}) no-repeat left top / ${baseImageElement.naturalWidth}px ${baseImageElement.naturalHeight}px`;
    container.style.backgroundColor = 'white';

    overlayElements.forEach(({ element, styles }) => {
        Object.assign(element.style, styles);
        container.appendChild(element);
    });

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
        width: width,
        height: height,
        scale: 1,
        backgroundColor: '#ffffff',
        logging: false,
    });

    document.body.removeChild(container);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob: Blob | null) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to create blob from canvas.'));
            }
        }, 'image/jpeg', 1.0);
    });
}
