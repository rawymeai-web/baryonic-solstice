'use client'

import { useActionState } from 'react'
import { createOrder } from '@/app/orders/actions'

interface PurchaseFormProps {
    image: {
        id: string
        image_url: string
        prompt: string
    }
}

const initialState = {
    success: false,
    message: '',
}

export function PurchaseForm({ image }: PurchaseFormProps) {
    const [state, action, isPending] = useActionState(createOrder, initialState)

    return (
        <form action={action} className="w-full">
            <input type="hidden" name="image_id" value={image.id} />
            <input type="hidden" name="image_url" value={image.image_url} />
            <input type="hidden" name="prompt" value={image.prompt} />

            <div className="flex flex-col gap-2 items-end">
                <button
                    disabled={isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isPending ? 'Processing...' : 'Buy Print ($19)'}
                </button>

                {state?.message && !state.success && (
                    <p className="text-red-400 text-xs bg-red-900/20 px-2 py-1 rounded">
                        {state.message}
                    </p>
                )}
            </div>
        </form>
    )
}
