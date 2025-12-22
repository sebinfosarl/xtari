'use client';

import { Order, Product } from '@/lib/db';
import styles from '../app/(admin)/admin/Admin.module.css';

interface PickingLabelProps {
    orders: Order[];
    products: Product[];
}

export default function PickingLabel({ orders, products }: PickingLabelProps) {
    // Aggregates products from all selected orders
    const pickingList = orders.reduce((acc, order) => {
        order.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return;

            const existing = acc.find(i => i.productId === item.productId);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                acc.push({
                    productId: item.productId,
                    title: product.title,
                    quantity: item.quantity,
                    image: product.image
                });
            }
        });
        return acc;
    }, [] as { productId: string; title: string; quantity: number; image: string }[]);

    return (
        <div className="p-8 bg-white text-slate-900 print:p-0">
            <div className="flex justify-between items-center mb-8 border-b-2 border-slate-900 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Picking List</h1>
                    <p className="text-slate-500 font-bold">{orders.length} Orders Included</p>
                </div>
                <div className="text-right">
                    <p className="font-bold">{new Date().toLocaleDateString()}</p>
                    <p className="text-xs text-slate-400">XTARI FULFILLMENT SYSTEM</p>
                </div>
            </div>

            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-900">
                        <th className="py-3 text-left font-black uppercase text-sm">Product</th>
                        <th className="py-3 text-center font-black uppercase text-sm w-24">Qty</th>
                        <th className="py-3 text-right font-black uppercase text-sm w-24">Picked</th>
                    </tr>
                </thead>
                <tbody>
                    {pickingList.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-200">
                            <td className="py-4">
                                <div className="flex items-center gap-4">
                                    {item.image && <img src={item.image} alt="" className="w-12 h-12 object-cover rounded shadow-sm" />}
                                    <div>
                                        <div className="font-bold text-lg">{item.title}</div>
                                        <div className="text-xs text-slate-400 font-mono">ID: {item.productId}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-4 text-center">
                                <div className="text-2xl font-black bg-slate-100 rounded-lg py-2">
                                    x{item.quantity}
                                </div>
                            </td>
                            <td className="py-4 text-right">
                                <div className="w-8 h-8 border-4 border-slate-900 rounded inline-block"></div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-300">
                <h3 className="font-black uppercase text-xs text-slate-400 mb-4">Included Orders</h3>
                <div className="grid grid-cols-4 gap-2">
                    {orders.map(o => (
                        <div key={o.id} className="text-[10px] font-bold py-1 px-2 bg-slate-50 rounded border border-slate-100">
                            #{o.id}
                        </div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; background: white; }
                }
            `}</style>
        </div>
    );
}
