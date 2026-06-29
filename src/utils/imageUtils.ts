/**
 * Takes an image data URL, target dimensions, and performs a "center-crop" (aspect fill).
 * It creates a canvas of the target size, calculates the best portion of the source image
 * to draw to fill that canvas without distortion, and returns the result as a new data URL.
 * @param dataUrl The source image as a data URL.
 * @param targetWidth The desired width of the output image in pixels.
 * @param targetHeight The desired height of the output image in pixels.
 * @returns A Promise that resolves with the data URL of the cropped image.
 */
export function cropImageToSize(dataUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous'; // In case of CORS issues with data URLs (unlikely but safe)
        image.onload = () => {
            const sourceWidth = image.naturalWidth;
            const sourceHeight = image.naturalHeight;
            const targetAspectRatio = targetWidth / targetHeight;
            const sourceAspectRatio = sourceWidth / sourceHeight;

            let sx = 0, sy = 0, sWidth = sourceWidth, sHeight = sourceHeight;

            // Calculate the source crop area (sx, sy, sWidth, sHeight)
            if (sourceAspectRatio > targetAspectRatio) {
                // Source is wider than target -> crop the sides
                sWidth = sourceHeight * targetAspectRatio;
                sx = (sourceWidth - sWidth) / 2;
            } else {
                // Source is taller than target -> crop the top/bottom
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

            // Draw the calculated portion of the source image onto the canvas
            ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
            
            // Return the new image as a high-quality JPEG data URL
            resolve(canvas.toDataURL('image/jpeg', 1.0));
        };
        image.onerror = (error) => {
            reject(new Error('Failed to load image for cropping.'));
        };
        image.src = dataUrl;
    });
}

/**
 * Compresses and downscales a base64 image to ensure it fits within API payload limits.
 * Default max dimension is 1024px.
 */
export function compressBase64Image(base64Str: string, maxDimension: number = 1024, quality: number = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!base64Str) return resolve("");

        // If it's a URL (http/https), skip compression
        if (base64Str.startsWith('http')) {
            return resolve(base64Str);
        }

        let imageSrc = base64Str;
        
        // If it's raw base64 (doesn't start with data:), we prepend a generic MIME type so Canvas can read it
        if (!base64Str.startsWith('data:')) {
            imageSrc = `data:image/jpeg;base64,${base64Str}`;
        }

        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error("No 2d context"));

            // Fill white background for transparent PNGs before converting to JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

            ctx.drawImage(img, 0, 0, width, height);
            
            // Output as JPEG to drastically reduce base64 size
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            // Gemini API expects raw base64 without the data URI prefix. Strip it before resolving!
            const rawCompressed = compressedDataUrl.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
            
            resolve(rawCompressed);
        };
        img.onerror = () => reject(new Error("Failed to load image for compression"));
        img.src = imageSrc;
    });
}

/**
 * Flips a base64 image horizontally.
 * @param base64 The base64 string or data URL of the image.
 * @returns A Promise that resolves with the flipped base64 string.
 */
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
                const flippedBase64 = canvas.toDataURL('image/jpeg', 0.95);
                resolve(flippedBase64.split(',')[1]); // return just the raw base64 data
            } catch (e) {
                resolve(base64);
            }
        };
        img.onerror = () => resolve(base64);
        img.src = base64.startsWith('data:') || base64.startsWith('http') ? base64 : `data:image/jpeg;base64,${base64}`;
    });
};
