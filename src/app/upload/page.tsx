import { createClient } from '@/utils/supabase/server'
import { uploadImage } from './actions'
import { PurchaseForm } from './purchase-form'
import { redirect } from 'next/navigation'

export default async function UploadPage() {
    const supabase = await createClient()

    // Check Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch previous images
    const { data: images } = await supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                        Image Studio
                    </h1>
                    <a href="/" className="text-gray-400 hover:text-white transition">Home</a>
                </div>

                {/* Upload Form */}
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                    <h2 className="text-xl font-semibold mb-4">Upload New Image</h2>
                    <form action={uploadImage} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Image Prompt / Title</label>
                            <input
                                type="text"
                                name="prompt"
                                placeholder="e.g. A futuristic city..."
                                className="w-full bg-black border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Select File</label>
                            <input
                                type="file"
                                name="file"
                                accept="image/*"
                                required
                                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition"
                        >
                            Upload & Save
                        </button>
                    </form>
                </div>

                {/* Gallery */}
                <div>
                    <h2 className="text-xl font-semibold mb-6">Your Gallery</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {images?.map((img) => (
                            <div key={img.id} className="group relative aspect-square bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={img.image_url}
                                    alt={img.prompt}
                                    className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-3 translate-y-full group-hover:translate-y-0 transition">
                                    <p className="text-sm truncate">{img.prompt}</p>

                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-xs text-gray-400">{new Date(img.created_at).toLocaleDateString()}</p>

                                        <PurchaseForm image={img} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!images || images.length === 0) && (
                            <p className="text-gray-500 col-span-full text-center py-12">No images yet. Upload one above!</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
