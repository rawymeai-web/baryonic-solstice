'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type ActionState = {
    success: boolean
    message: string
    error?: any
}

export async function createOrder(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const supabase = await createClient()

    // 1. Get User
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        console.error('Auth Error:', userError)
        return { success: false, message: 'User not authenticated', error: userError }
    }

    const imageId = formData.get('image_id') as string
    const imageUrl = formData.get('image_url') as string
    const prompt = formData.get('prompt') as string

    // 2. Create Order (Parent)
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'paid', // Simulating instant payment
            total_amount: 19.99,
            currency: 'USD'
        })
        .select()
        .single()

    if (orderError) {
        console.error('Order Creation Error:', orderError)
        return { success: false, message: 'Failed to create order', error: orderError }
    }

    // 3. Create Order Item (Child)
    const { error: itemError } = await supabase
        .from('order_items')
        .insert({
            order_id: order.id,
            product_name: 'Framed Print: ' + prompt,
            quantity: 1,
            price_at_purchase: 19.99,
            metadata: { image_id: imageId, image_url: imageUrl }
        })

    if (itemError) {
        console.error('Order Item Creation Error:', itemError)
        // Optional: Could delete the orphaned order here if strict atomicity is needed
        return { success: false, message: 'Failed to create order item', error: itemError }
    }

    redirect('/orders?new_order=true')
}
