
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Product, SalesPerson } from '@/lib/db';
import {
    X, Save, Phone, MapPin,
    User as UserIcon, ShoppingCart, Truck, Package, ChevronDown, ChevronUp, Printer, Trash2, RotateCcw
} from 'lucide-react';
import { updateOrderAction, createShipmentAction, cancelShipmentAction, getCathedisCitiesAction, markDeliveryNotePrintedAction, cancelOrderAction, returnOrderAction, restoreOrderToShipmentAction } from '@/app/actions';
import styles from '../app/(admin)/admin/Admin.module.css';

interface DeliveryDialogProps {
    order: Order;
    products: Product[];
    onClose: () => void;
    showShippingInterface?: boolean;
}

export default function DeliveryDialog({ order: initialOrder, products, onClose, showShippingInterface = true }: DeliveryDialogProps) {
    const router = useRouter();
    const [order, setOrder] = useState<Order>(initialOrder);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingShipment, setIsCreatingShipment] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [showShippingSettings, setShowShippingSettings] = useState(true);
    const [cathedisCities, setCathedisCities] = useState<any[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    useEffect(() => {
        async function fetchCities() {
            setIsLoadingCities(true);
            const cities = await getCathedisCitiesAction();
            setCathedisCities(cities);
            setIsLoadingCities(false);
        }
        fetchCities();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateOrderAction(order);
            router.refresh();
            // Don't close, just update local state
            setIsSaving(false);
            alert('Delivery information updated');
        } catch (err) {
            console.error(err);
            alert('Failed to save changes');
            setIsSaving(false);
        }
    };

    const isReturned = order.fulfillmentStatus === 'returned';

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1500 }}>
            <div className={styles.orderModal}>
                <header className={styles.modalHeader}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.modalTitle}>Manage Delivery for Order #{order.id}</h2>
                        <span className={styles.modalSubtitle}>{order.customer.name} - {order.customer.city}</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
                </header>

                <div className={styles.modalBody}>
                    {/* SECTION 1: CUSTOMER INFO */}
                    <section className={styles.infoSection}>
                        <h3 className={styles.sectionTitle}><UserIcon size={16} /> Recipient Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className={styles.inputGroup}>
                                <label>Full Name</label>
                                <input disabled={isReturned} value={order.customer.name} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, name: e.target.value } })} className={styles.inlineInput} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Phone Number</label>
                                <input disabled={isReturned} value={order.customer.phone} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, phone: e.target.value } })} className={styles.inlineInput} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>City</label>
                                <select
                                    disabled={isLoadingCities || isReturned}
                                    value={order.customer.city || ''}
                                    onChange={(e) => {
                                        const city = cathedisCities.find(c => c.name === e.target.value);
                                        setOrder({
                                            ...order,
                                            customer: {
                                                ...order.customer,
                                                city: e.target.value,
                                                sector: city?.sectors?.[0]?.name || ''
                                            }
                                        });
                                    }}
                                    className={styles.inlineInput}
                                >
                                    <option value="">Select City...</option>
                                    {cathedisCities.map((c: any) => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Sector/Neighborhood</label>
                                <select
                                    disabled={!order.customer.city || isReturned}
                                    value={order.customer.sector || ''}
                                    onChange={(e) => setOrder({ ...order, customer: { ...order.customer, sector: e.target.value } })}
                                    className={styles.inlineInput}
                                    style={{ opacity: isReturned ? 0.6 : 1 }}
                                >
                                    <option value="">Select Sector...</option>
                                    {cathedisCities.find(c => c.name === order.customer.city)?.sectors?.map((s: any) => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                <label>Exact Shipping Address</label>
                                <textarea
                                    disabled={isReturned}
                                    value={order.customer.address}
                                    onChange={(e) => setOrder({ ...order, customer: { ...order.customer, address: e.target.value } })}
                                    className={styles.inlineInput}
                                    rows={2}
                                    style={{ opacity: isReturned ? 0.6 : 1 }}
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: PRODUCTS ORDERED */}
                    <section className={styles.infoSection}>
                        <h3 className={styles.sectionTitle}><ShoppingCart size={16} /> Merchandise Details</h3>
                        <table className={styles.managementTable}>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Price/Unit</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map(item => {
                                    const product = products.find(p => p.id === item.productId);
                                    return (
                                        <tr key={item.productId}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    {product?.image && <img src={product.image} className={styles.imageCell} alt="" />}
                                                    <div className="font-bold">{product?.title || 'Unknown'}</div>
                                                </div>
                                            </td>
                                            <td className="font-bold">{item.quantity}</td>
                                            <td>${(item.price || 0).toFixed(2)}</td>
                                            <td className="font-bold">${((item.price || 0) * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} className="text-right p-4 font-bold">Total Cash on Delivery</td>
                                    <td className="p-4 font-extrabold text-blue-600 text-xl">${order.total.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>

                    {/* SECTION 3: SHIPPING SETTINGS */}
                    {showShippingInterface && (
                        <section className={styles.infoSection} style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                            <h3 className={styles.sectionTitle} style={{ color: '#15803d' }}><Truck size={16} /> Cathedis Shipping Interface</h3>

                            <div style={{ padding: '1rem' }}>
                                {/* Status and ID (only if exists) */}
                                {order.shippingId && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Cathedis Shipment ID</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#15803d' }}>{order.shippingId}</div>
                                        </div>
                                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Current Status</div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#15803d' }}>{order.shippingStatus || 'Pending'}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Inputs always visible and editable */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #d1fae5', marginBottom: '1.5rem' }}>
                                    <div className={styles.inputGroup}>
                                        <label>Payment Type</label>
                                        <select value={order.paymentType || 'ESPECES'} onChange={(e) => setOrder({ ...order, paymentType: e.target.value })} className={styles.inlineInput}>
                                            <option value="ESPECES">ESPECES</option>
                                            <option value="Virement">Virement</option>
                                        </select>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Delivery Type</label>
                                        <select value={order.deliveryType || 'Livraison CRBT'} onChange={(e) => setOrder({ ...order, deliveryType: e.target.value })} className={styles.inlineInput}>
                                            <option value="Livraison CRBT">Livraison CRBT</option>
                                            <option value="Echange">Echange</option>
                                        </select>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Range Weight</label>
                                        <select value={order.rangeWeight || 'Entre 1.2 Kg et 5 Kg'} onChange={(e) => setOrder({ ...order, rangeWeight: e.target.value })} className={styles.inlineInput}>
                                            <option value="Moins de 1 Kg">Moins de 1 Kg</option>
                                            <option value="Entre 1.2 Kg et 5 Kg">Entre 1.2 Kg et 5 Kg</option>
                                            <option value="Entre 5.1 Kg et 10 Kg">Entre 5.1 Kg et 10 Kg</option>
                                            <option value="Plus de 30Kg">Plus de 30Kg</option>
                                        </select>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Weight (Kg)</label>
                                        <input type="number" value={order.weight || 0} onChange={(e) => setOrder({ ...order, weight: parseFloat(e.target.value) })} className={styles.inlineInput} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Package Count</label>
                                        <input type="number" value={order.packageCount || 1} onChange={(e) => setOrder({ ...order, packageCount: parseInt(e.target.value) })} className={styles.inlineInput} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Allow Opening</label>
                                        <select value={order.allowOpening !== undefined ? order.allowOpening : 1} onChange={(e) => setOrder({ ...order, allowOpening: parseInt(e.target.value) })} className={styles.inlineInput}>
                                            <option value={0}>No</option>
                                            <option value={1}>Yes</option>
                                        </select>
                                    </div>
                                    <div className={styles.inputGroup} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ margin: 0 }}>Fragile</label>
                                        <input type="checkbox" checked={order.fragile || false} onChange={(e) => setOrder({ ...order, fragile: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Insurance Value (MAD)</label>
                                        <input type="number" value={order.insuranceValue || Math.round(order.total || 0)} onChange={(e) => setOrder({ ...order, insuranceValue: parseFloat(e.target.value) })} className={styles.inlineInput} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {!order.shippingId ? (
                                        <button
                                            onClick={async () => {
                                                if (!order.customer.city || !order.customer.sector) {
                                                    alert('Please select a City and Sector before shipping.');
                                                    return;
                                                }

                                                const confirmed = confirm(
                                                    `Confirm shipment to:\n\n` +
                                                    `City: ${order.customer.city}\n` +
                                                    `Sector: ${order.customer.sector}\n` +
                                                    `Amount: ${order.total} MAD\n\n` +
                                                    `Is this correct?`
                                                );

                                                if (!confirmed) return;

                                                setIsCreatingShipment(true);
                                                const result = await createShipmentAction(order);
                                                setIsCreatingShipment(false);
                                                if (result.success && result.order) {
                                                    setOrder(result.order);
                                                    alert('Shipment created successfully!');
                                                    router.refresh();
                                                } else {
                                                    alert(`Error: ${result.error}`);
                                                }
                                            }}
                                            disabled={isCreatingShipment}
                                            className="btn btn-primary"
                                            style={{ background: '#15803d', borderColor: '#15803d', flex: 1 }}
                                        >
                                            {isCreatingShipment ? 'Creating shipment...' : (
                                                <>
                                                    <Truck size={18} />
                                                    EXPORT TO CATHEDIS
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('This will push your local modifications (Recipient, Address, Items, Settings) to Cathedis. Continue?')) return;
                                                    setIsCreatingShipment(true);
                                                    const result = await createShipmentAction(order);
                                                    setIsCreatingShipment(false);
                                                    if (result.success && result.order) {
                                                        setOrder(result.order);
                                                        alert('Cathedis shipment updated successfully!');
                                                        router.refresh();
                                                    } else {
                                                        alert(`Error: ${result.error}`);
                                                    }
                                                }}
                                                disabled={isCreatingShipment}
                                                className="btn btn-sm"
                                                style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
                                                title="Push local changes to Cathedis"
                                            >
                                                <Truck size={16} />
                                                Push Data Update
                                            </button>

                                            <button
                                                onClick={async () => {
                                                    const frame = document.getElementById('print-iframe') as HTMLIFrameElement;
                                                    if (frame) {
                                                        frame.src = `/print/delivery/${order.id}`;
                                                        // Track that it was printed
                                                        const res = await markDeliveryNotePrintedAction(order.id);
                                                        if (res.success && res.order) {
                                                            setOrder(res.order);
                                                            router.refresh(); // Sync with parent
                                                        }
                                                    }
                                                }}
                                                className="btn btn-sm"
                                                style={{ background: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
                                                title="Print Delivery Note"
                                            >
                                                <Printer size={16} />
                                                Delivery Note
                                            </button>

                                        </>
                                    )}
                                </div>

                                {/* Hidden Iframe for silent printing */}
                                <iframe
                                    id="print-iframe"
                                    style={{ display: 'none' }}
                                    title="print-frame"
                                />
                            </div>
                        </section>
                    )}
                </div>

                <footer className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Hide Cancel buttons if returned */}
                        {order.fulfillmentStatus !== 'returned' && (
                            showShippingInterface ? (
                                <button
                                    onClick={async () => {
                                        if (!confirm('Are you sure you want to CANCEL this shipment and order? This element will be marked as canceled.')) return;
                                        setIsCanceling(true);
                                        const result = await cancelShipmentAction(order.id);
                                        setIsCanceling(false);
                                        if (result.success && result.order) {
                                            setOrder(result.order);
                                            alert('Order and Shipment canceled.');
                                            onClose();
                                            router.refresh();
                                        } else {
                                            alert(`Error: ${result.error}`);
                                        }
                                    }}
                                    disabled={isCanceling}
                                    className="btn btn-sm"
                                    style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    title="Cancel Shipping"
                                >
                                    <Trash2 size={16} />
                                    Cancel Shipment
                                </button>
                            ) : (
                                <button
                                    onClick={async () => {
                                        if (!confirm('Are you sure you want to CANCEL this picking? The order will be canceled.')) return;
                                        setIsCanceling(true);
                                        const result = await cancelOrderAction(order.id);
                                        setIsCanceling(false);
                                        if (result.success && result.order) {
                                            setOrder(result.order);
                                            alert('Picking canceled.');
                                            onClose();
                                            router.refresh();
                                        } else {
                                            alert(`Error: ${result.error}`);
                                        }
                                    }}
                                    disabled={isCanceling}
                                    className="btn btn-sm"
                                    style={{ background: 'white', color: '#ef4444', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    title="Cancel Picking"
                                >
                                    <Trash2 size={16} />
                                    Cancel Picking
                                </button>
                            )
                        )}

                        {/* Return Action only (Restore removed as per request) */}
                        {order.fulfillmentStatus !== 'returned' && order.shippingId && order.status !== 'canceled' && (
                            <button
                                onClick={async () => {
                                    if (!confirm('Mark this order as RETURNED? It will be CANCELED and moved to the Returns tab.')) return;
                                    setIsSaving(true);
                                    await returnOrderAction(order.id);
                                    setIsSaving(false);
                                    alert('Order marked as returned.');
                                    onClose();
                                    router.refresh();
                                }}
                                className="btn btn-sm"
                                style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '6px' }}
                                title="Return Order"
                            >
                                <RotateCcw size={16} />
                                Mark as Returned
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={onClose} className="btn btn-outline">
                            Close
                        </button>
                        {!isReturned && (
                            <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ minWidth: '160px' }}>
                                {isSaving ? 'Updating...' : <><Save size={18} /> Update Recipient Details</>}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
}
