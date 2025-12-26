'use client';

import { Order, Product } from '@/lib/db';

interface PickingLabelProps {
    orders: Order[];
    products: Product[];
}

export default function PickingLabel({ orders, products }: PickingLabelProps) {

    const dateStr = new Date().toLocaleDateString('fr-FR');

    // --- BATCH MODE DATA PREP ---
    const batchList = orders.reduce((acc, order) => {
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
                    location: product.location || 'N/A',
                    quantity: item.quantity,
                    image: product.image,
                    sku: (product as any).sku || item.productId
                });
            }
        });
        return acc;
    }, [] as { productId: string; title: string; location: string; quantity: number; image: string; sku: string }[]);

    const totalBatchUnits = batchList.reduce((acc, item) => acc + item.quantity, 0);

    // --- VISUAL ORDER CODING (COLORS + LABELS) ---
    const COLORS = [
        '#EF4444', // Red
        '#3B82F6', // Blue
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#8B5CF6', // Violet
        '#EC4899', // Pink
        '#06B6D4', // Cyan
        '#84CC16', // Lime
        '#F43F5E', // Rose
        '#6366F1', // Indigo
    ];

    // Map each order to a color and a letter (A, B, C...)
    const orderVisuals = orders.reduce((acc, order, index) => {
        acc[order.id] = {
            color: COLORS[index % COLORS.length],
            label: String.fromCharCode(65 + (index % 26)) + (Math.floor(index / 26) || ''), // A, B, ... Z, A1...
            index: index + 1
        };
        return acc;
    }, {} as Record<string, { color: string; label: string; index: number }>);

    // --- BARCODE HELPER ---
    const Barcode = ({ text, scale = 2, height = 10, showText = true }: { text: string, scale?: number, height?: number, showText?: boolean }) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <img
                src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${text}&scale=${scale}&height=${height}&includetext=false`}
                alt={text}
                style={{ height: `${height}mm`, maxWidth: '100%' }}
            />
            {showText && <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '2px' }}>{text}</span>}
        </div>
    );

    return (
        <div className="picking-container">
            <style dangerouslySetInnerHTML={{
                __html: `
                @page { size: A4; margin: 10mm; }
                .picking-container { 
                    font-family: 'Inter', Arial, sans-serif; 
                    color: black; 
                    background: white; 
                    width: 100%; 
                    max-width: 190mm; /* Reduced slightly to prevent clipping */
                    margin: 0 auto; 
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                /* UTILS */
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-center { align-items: center; }
                .items-end { align-items: flex-end; }
                .border-b-4 { border-bottom: 4px solid black; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-8 { margin-bottom: 2rem; }
                .pb-4 { padding-bottom: 1rem; }
                .text-right { text-align: right; }
                /* FIX: Corrected syntax and added print-specific forcing */
                .font-black { font-weight: 900 !important; }
                .uppercase { text-transform: uppercase; }

                /* HEADER */
                .doc-title { font-size: 28px; font-weight: 900; line-height: 1; letter-spacing: -1px; }
                .doc-subtitle { font-size: 12px; font-weight: bold; color: #555; margin-top: 4px; }
                .meta-table td { padding: 2px 8px; font-size: 12px; border-left: 1px solid #ccc; }
                .meta-table td:first-child { border-left: none; }
                .meta-label { font-weight: bold; color: #666; font-size: 10px; display: block; }
                .meta-value { font-weight: bold; font-size: 14px; }

                /* TABLES */
                .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .print-table th { border-bottom: 2px solid black; text-align: left; padding: 8px 4px; font-size: 11px; font-weight: 900; text-transform: uppercase; }
                .print-table td { border-bottom: 1px solid #ddd; padding: 10px 4px; vertical-align: middle; }

                .prod-img { width: 16mm; height: 16mm; object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #eee; }
                .prod-title { font-size: 14px; font-weight: 800; margin-bottom: 4px; }
                .prod-sku { font-size: 11px; font-family: monospace; color: #555; }
                .qty-box { 
                    font-size: 22px; 
                    font-weight: 900; 
                    background: #f0f0f0; 
                    padding: 4px 10px; 
                    border-radius: 4px; 
                    display: inline-block;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important; 
                }
                .checkbox { width: 8mm; height: 8mm; border: 3px solid #333; display: inline-block; border-radius: 2px; }

                /* SINGLE ORDER SPECIFICS */
                .customer-box { border: 2px solid #000; padding: 15px; margin-bottom: 20px; border-radius: 6px; display: flex; gap: 20px; }
                .customer-section { flex: 1; }
                .section-label { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #666; margin-bottom: 4px; border-bottom: 1px solid #eee; padding-bottom: 2px; }
                .info-line { font-size: 12px; margin-bottom: 2px; font-weight: 600; }
                .large-text { font-size: 14px; font-weight: 800; }

                /* ORDER TAGS */
                .order-tags { display: flex; flex-wrap: wrap; gap: 6px; }
                .tag { font-size: 11px; font-weight: bold; border: 1px solid #ccc; padding: 3px 6px; border-radius: 3px; background: #fff; }

                /* VISUAL LABELS */
                .visual-tag { 
                    display: inline-flex; 
                    align-items: center; 
                    justify-content: center; 
                    width: 32px; 
                    height: 32px; 
                    border-radius: 50%; 
                    color: white !important; /* Force white text */
                    font-weight: 900; 
                    font-size: 16px;
                    border: 2px solid rgba(0,0,0,0.1);
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                @media print {
                    .no-print { display: none !important; }
                    body { 
                        background: white !important; 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Ensure the container takes full width of the print area */
                    .picking-container { width: 100%; }
                }
            `}} />


            {/* ================= UNIFIED PICKING LAYOUT (VISUAL) ================= */}
            <div className="batch-view">
                <div className="header flex justify-between items-end border-b-4 pb-4 mb-8">
                    <div>
                        <div className="doc-title">PICKING LIST</div>
                        <div className="doc-subtitle">{orders.length} ORDER{orders.length > 1 ? 'S' : ''} • SORT BY PRODUCT</div>
                    </div>
                    <div className="text-right">
                        <table className="meta-table">
                            <tbody>
                                <tr>
                                    <td><span className="meta-label">DATE</span><span className="meta-value">{dateStr}</span></td>
                                    <td><span className="meta-label">TOTAL UNITS</span><span className="meta-value">{totalBatchUnits}</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ORDER COLOR KEY */}
                <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded">
                    <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#666', marginBottom: '8px' }}>
                        Order Bins / Color Key
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {orders.map(o => {
                            const visual = orderVisuals[o.id];
                            return (
                                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #ddd', padding: '4px 8px', borderRadius: '4px', background: 'white' }}>
                                    <div className="visual-tag" style={{ background: visual.color, width: '24px', height: '24px', fontSize: '12px' }}>{visual.label}</div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Order #{o.id}</div>
                                        <div style={{ fontSize: '9px', color: '#666' }}>{o.customer.name.substring(0, 15)}</div>
                                    </div>
                                    <Barcode text={o.id} scale={1.5} height={8} showText={false} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="products-list">
                    {batchList.map((productGroup, idx) => {
                        // Find which orders include this product
                        const contributingOrders = orders.reduce((acc, o) => {
                            const item = o.items.find(i => i.productId === productGroup.productId);
                            if (item) {
                                acc.push({ orderId: o.id, quantity: item.quantity });
                            }
                            return acc;
                        }, [] as { orderId: string, quantity: number }[]);

                        return (
                            <div key={idx} className="product-group mb-8 pb-4 border-b-2 border-slate-300" style={{ pageBreakInside: 'avoid' }}>
                                {/* Product Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <img src={productGroup.image || '/placeholder.png'} alt="" className="prod-img" style={{ width: '20mm', height: '20mm' }} />
                                        <div>
                                            <div className="prod-title" style={{ fontSize: '18px' }}>{productGroup.title}</div>
                                            <Barcode text={productGroup.sku} scale={1.5} height={8} />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Total to Pick</div>
                                        <div className="qty-box" style={{ fontSize: '28px', padding: '6px 16px', background: '#222', color: 'white' }}>x{productGroup.quantity}</div>
                                    </div>
                                </div>

                                {/* Distribution List */}
                                <div style={{ background: '#f9f9f9', borderRadius: '4px', padding: '10px', border: '1px solid #eee' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#888', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                                        Distribute to Orders
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                                        {contributingOrders.map((co, cIdx) => {
                                            const visual = orderVisuals[co.orderId];
                                            return (
                                                <div key={cIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '8px', borderRadius: '4px', border: `2px solid ${visual.color}` }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div className="visual-tag" style={{ background: visual.color }}>{visual.label}</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '9px', lineHeight: '1', fontWeight: 'bold', color: visual.color }}>BIN {visual.label}</span>
                                                            <span style={{ fontSize: '9px', fontFamily: 'monospace' }}>#{co.orderId}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'black' }}>x{co.quantity}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
