import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OrdersPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch orders with their items
    const { data: orders } = await supabase
        .from('orders')
        .select(`
      *,
      order_items (*)
    `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold">Order History</h1>
                    <div className="space-x-4">
                        <Link href="/upload" className="text-gray-400 hover:text-white transition">Gallery</Link>
                        <Link href="/" className="text-gray-400 hover:text-white transition">Home</Link>
                    </div>
                </div>

                {/* Orders List */}
                <div className="space-y-6">
                    {orders?.map((order) => (
                        <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden p-6">

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-gray-400">Order ID: <span className="font-mono text-gray-300">{order.id}</span></p>
                                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-green-400">${order.total_amount}</p>
                                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-900 text-green-200 rounded-full capitalize">
                                        {order.status}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-gray-800 pt-4">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {order.order_items.map((item: any) => (
                                    <div key={item.id} className="flex gap-4">
                                        {item.metadata?.image_url && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.metadata.image_url} alt="Product" className="w-16 h-16 object-cover rounded bg-gray-800" />
                                        )}
                                        <div>
                                            <p className="font-medium">{item.product_name}</p>
                                            <p className="text-sm text-gray-400">Qty: {item.quantity} × ${item.price_at_purchase}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    ))}

                    {(!orders || orders.length === 0) && (
                        <div className="text-center py-12 bg-gray-900 rounded-xl">
                            <p className="text-gray-400 mb-4">No orders found.</p>
                            <Link href="/upload" className="bg-indigo-600 px-4 py-2 rounded text-white hover:bg-indigo-700">
                                Buy something!
                            </Link>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
