
export function cropImageToSize(dataUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            const sourceWidth = image.naturalWidth;
            const sourceHeight = image.naturalHeight;
            const targetAspectRatio = targetWidth / targetHeight;
            const sourceAspectRatio = sourceWidth / sourceHeight;

            let sx = 0, sy = 0, sWidth = sourceWidth, sHeight = sourceHeight;

            if (sourceAspectRatio > targetAspectRatio) {
                sWidth = sourceHeight * targetAspectRatio;
                sx = (sourceWidth - sWidth) / 2;
            } else {
                sHeight = sourceWidth / targetAspectRatio;
                sy = (sourceHeight - sHeight) / 2;
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

            resolve(canvas.toDataURL('image/jpeg', 1.0));
        };
        image.onerror = (error) => {
            reject(new Error('Failed to load image for cropping.'));
        };
        image.src = dataUrl;
    });
}
