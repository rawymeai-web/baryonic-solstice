
import { supabase } from '../utils/supabaseClient';

export interface OrderImages {
    cover: File;
    spreads: File[];
}

export interface UploadedImageUrls {
    cover: string;
    spreads: string[];
}

export async function saveImagesForOrder(orderNumber: string, images: OrderImages): Promise<UploadedImageUrls> {
    const bucket = 'images';
    const folder = `${orderNumber}`;

    const uploadFile = async (file: File, name: string): Promise<string> => {
        const path = `${folder}/${name}`;
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: true });

        if (error) {
            console.error(`Error uploading ${name}:`, error);
            throw error;
        }

        const { data: publicData } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return publicData.publicUrl;
    };

    const coverUrl = await uploadFile(images.cover, 'cover.jpg');

    const spreadUrls = await Promise.all(
        images.spreads.map((file, index) => uploadFile(file, `spread_${index + 1}.jpg`))
    );

    return {
        cover: coverUrl,
        spreads: spreadUrls
    };
}

export async function uploadBase64Image(orderNumber: string, base64Data: string, fileName: string): Promise<string> {
    const bucket = 'images';
    const folder = `${orderNumber}`;
    const path = `${folder}/${fileName}`;

    // Remove data:image/...;base64, prefix if present
    const base64Content = base64Data.includes(';base64,')
        ? base64Data.split(';base64,')[1]
        : base64Data;

    const buffer = Buffer.from(base64Content, 'base64');

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, buffer, {
            upsert: true,
            contentType: 'image/jpeg'
        });

    if (error) {
        console.error(`Error uploading base64 ${fileName}:`, error);
        throw error;
    }

    const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return publicData.publicUrl;
}

export async function downloadImageAsBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
    return await response.blob();
}
