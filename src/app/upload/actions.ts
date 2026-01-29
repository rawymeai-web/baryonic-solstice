'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function uploadImage(formData: FormData) {
    const supabase = await createClient()

    // 1. Get the file and user
    const file = formData.get('file') as File
    const prompt = (formData.get('prompt') as string) || 'User Upload'

    if (!file) {
        throw new Error('No file provided')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // 2. Upload to Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

    if (uploadError) {
        console.error('Upload Error:', uploadError)
        throw new Error('Failed to upload image')
    }

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

    // 4. Save to Database (generated_images)
    const { error: dbError } = await supabase
        .from('generated_images')
        .insert({
            user_id: user.id,
            image_url: publicUrl,
            prompt: prompt,
        })

    if (dbError) {
        console.error('DB Error:', dbError)
        throw new Error('Failed to save image record')
    }

    redirect('/upload?success=true')
}
