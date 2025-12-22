
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Product, SalesPerson } from '@/lib/db';
import {
    X, Save, Phone, MapPin,
    User as UserIcon, ShoppingCart, Truck, Package, RefreshCw, Download, ChevronDown, ChevronUp, Printer
} from 'lucide-react';
import { updateOrderAction, createShipmentAction, refreshShipmentStatusAction, getCathedisCitiesAction } from '@/app/actions';
import styles from '../app/(admin)/admin/Admin.module.css';

interface DeliveryDialogProps {
    order: Order;
    products: Product[];
    onClose: () => void;
}

export default function DeliveryDialog({ order: initialOrder, products, onClose }: DeliveryDialogProps) {
    const router = useRouter();
    const [order, setOrder] = useState<Order>(initialOrder);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingShipment, setIsCreatingShipment] = useState(false);
    const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
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
                                <input value={order.customer.name} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, name: e.target.value } })} className={styles.inlineInput} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Phone Number</label>
                                <input value={order.customer.phone} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, phone: e.target.value } })} className={styles.inlineInput} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>City</label>
                                <select
                                    disabled={isLoadingCities}
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
                                    disabled={!order.customer.city}
                                    value={order.customer.sector || ''}
                                    onChange={(e) => setOrder({ ...order, customer: { ...order.customer, sector: e.target.value } })}
                                    className={styles.inlineInput}
                                >
                                    <option value="">Select Sector...</option>
                                    {cathedisCities.find(c => c.name === order.customer.city)?.sectors?.map((s: any) => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                <label>Exact Shipping Address</label>
                                <textarea value={order.customer.address} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, address: e.target.value } })} className={styles.inlineInput} rows={2} />
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
                                            <td>${item.price.toFixed(2)}</td>
                                            <td className="font-bold">${(item.price * item.quantity).toFixed(2)}</td>
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
                    <section className={styles.infoSection} style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                        <h3 className={styles.sectionTitle} style={{ color: '#15803d' }}><Truck size={16} /> Cathedis Shipping Interface</h3>

                        {!order.shippingId ? (
                            <div style={{ padding: '1rem' }}>
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
                                        <input type="number" value={order.insuranceValue || Math.round(order.total)} onChange={(e) => setOrder({ ...order, insuranceValue: parseFloat(e.target.value) })} className={styles.inlineInput} />
                                    </div>
                                </div>

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
                                        if (result.success) {
                                            alert('Shipment created successfully!');
                                            router.refresh();
                                        } else {
                                            alert(`Error: ${result.error}`);
                                        }
                                    }}
                                    disabled={isCreatingShipment}
                                    className="btn btn-primary"
                                    style={{ background: '#15803d', borderColor: '#15803d', width: '100%' }}
                                >
                                    {isCreatingShipment ? 'Creating shipment...' : (
                                        <>
                                            <Truck size={18} />
                                            EXPORT TO CATHEDIS
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Cathedis Shipment ID</div>
                                        <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#15803d' }}>{order.shippingId}</div>
                                    </div>
                                    <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Current Status</div>
                                        <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#15803d' }}>{order.shippingStatus || 'Pending'}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={async () => {
                                            setIsRefreshingStatus(true);
                                            const result = await refreshShipmentStatusAction(order.id);
                                            setIsRefreshingStatus(false);
                                            if (result.success) {
                                                router.refresh();
                                            } else {
                                                alert(`Error: ${result.error}`);
                                            }
                                        }}
                                        disabled={isRefreshingStatus}
                                        className="btn btn-outline btn-sm"
                                        title="Pull latest status logs from Cathedis"
                                    >
                                        <RefreshCw size={16} className={isRefreshingStatus ? 'animate-spin' : ''} />
                                        Refresh Status
                                    </button>

                                    <button
                                        onClick={async () => {
                                            if (!confirm('This will push your local modifications (Recipient, Address, Items) to Cathedis. Continue?')) return;
                                            setIsCreatingShipment(true);
                                            const result = await createShipmentAction(order);
                                            setIsCreatingShipment(false);
                                            if (result.success) {
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

                                    {order.shippingId && (
                                        <a
                                            href={`/print/delivery/${order.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm"
                                            style={{ background: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
                                            title="Print Delivery Note"
                                        >
                                            <Printer size={16} />
                                            Delivery Note
                                        </a>
                                    )}

                                    {order.shippingLabelUrl && (
                                        <a
                                            href={order.shippingLabelUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary btn-sm"
                                            style={{ background: '#15803d', borderColor: '#15803d' }}
                                            title="Download/Print Physical Shipping Label"
                                        >
                                            <Download size={16} />
                                            Download Label
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                <footer className={styles.modalFooter}>
                    <button onClick={onClose} className="btn btn-outline">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ minWidth: '160px' }}>
                        {isSaving ? 'Updating...' : <><Save size={18} /> Update Recipient Details</>}
                    </button>
                </footer>
            </div>
        </div>
    );
}
