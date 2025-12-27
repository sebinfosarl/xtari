
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Product, SalesPerson } from '@/lib/db';
import {
    X, Save, Phone, MapPin,
    User as UserIcon, ShoppingCart, Truck, Package, ChevronDown, ChevronUp, Printer, Trash2, RotateCcw,
    ClipboardList, CheckCircle
} from 'lucide-react';
import { updateOrderAction, createShipmentAction, cancelShipmentAction, getCathedisCitiesAction, markDeliveryNotePrintedAction, cancelOrderAction, returnOrderAction, restoreOrderToShipmentAction } from '@/app/actions';
import { formatCurrency } from '@/lib/format';
import styles from '../app/(admin)/admin/Admin.module.css';
import SearchableCitySelect from './SearchableCitySelect';
import SearchableSelect from './SearchableSelect';

interface DeliveryDialogProps {
    order: Order;
    products: Product[];
    onClose: () => void;
    showShippingInterface?: boolean;
    readonly?: boolean;
}

export default function DeliveryDialog({ order: initialOrder, products, onClose, showShippingInterface = true, readonly = false }: DeliveryDialogProps) {
    const router = useRouter();
    const [order, setOrder] = useState<Order>(initialOrder);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingShipment, setIsCreatingShipment] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [showShippingSettings, setShowShippingSettings] = useState(true);
    const [cathedisCities, setCathedisCities] = useState<any[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [showPackingView, setShowPackingView] = useState(false);

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

    const s = order.shippingStatus?.toLowerCase() || '';
    const isAwaitingPickup = order.shippingId && !s.includes('livr') && !s.includes('expédi') && !order.shippingStatus?.includes('Pickup:');
    const isPickedUp = order.shippingId && ((s.includes('expédi') || s.includes('pickup done') || order.shippingStatus?.includes('Pickup:')) && !s.includes('livr'));

    const handlePrintDeliveryNote = async () => {
        // First, save the current order to ensure all values are persisted
        try {
            await updateOrderAction(order);
        } catch (err) {
            console.error('Failed to save order before printing:', err);
            alert('Failed to save changes before printing. Please try again.');
            return;
        }

        // Then load the print page with packageCount as URL parameter
        const frame = document.getElementById('print-iframe') as HTMLIFrameElement;
        if (frame) {
            // Pass params as query parameter to avoid database race condition
            const packageCount = order.packageCount || 1;

            // Get allowOpening directly from DOM to ensure we get current value
            const allowOpeningSelect = document.getElementById('allow-opening-select') as HTMLSelectElement;
            const allowOpening = allowOpeningSelect ? allowOpeningSelect.value : (order.allowOpening ?? 0);

            // Get fragile directly from DOM
            const fragileCheckbox = document.getElementById('fragile-checkbox') as HTMLInputElement;
            const fragile = fragileCheckbox ? (fragileCheckbox.checked ? '1' : '0') : (order.fragile ? '1' : '0');

            frame.src = `/print/delivery/${order.id}?packageCount=${packageCount}&allowOpening=${allowOpening}&fragile=${fragile}`;

            // Track that it was printed
            const res = await markDeliveryNotePrintedAction(order.id);
            if (res.success) {
                // Only update the deliveryNotePrinted flag, keep all other local changes
                setOrder({ ...order, deliveryNotePrinted: true });
                router.refresh(); // Sync with parent
            }
        }
    };

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1500 }}>
            <div className={styles.orderModal}>
                <header className={styles.modalHeader}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.modalTitle}>Manage Delivery for Order #{order.id} <span style={{ fontSize: '0.8em', fontWeight: 'normal', opacity: 0.7 }}>({new Date(order.date).toLocaleDateString()})</span></h2>
                        <span className={styles.modalSubtitle}>{order.customer.name} - {order.customer.city}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => setShowPackingView(true)}
                            className="btn btn-sm"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: 'white',
                                border: 'none',
                                fontWeight: 700,
                                boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.2s',
                                padding: '0.5rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 10px -2px rgba(99, 102, 241, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(99, 102, 241, 0.3)';
                            }}
                            title="Open Packing View"
                        >
                            <ClipboardList size={18} strokeWidth={2.5} />
                            PACKING LIST
                        </button>
                        {order.shippingId && (
                            <button
                                onClick={handlePrintDeliveryNote}
                                className={styles.dynamicFlowButton}
                                title="Print Delivery Note"
                            >
                                <Printer size={16} />
                                DELIVERY NOTE
                            </button>
                        )}
                        <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
                    </div>
                </header>

                <div className={styles.modalBody} style={{ padding: 0 }}>
                    {showPackingView ? (
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            background: '#fff',
                            borderRadius: '0 0 16px 16px',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                overflowY: 'auto',
                                padding: '2rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Packing List</h3>
                                    <p style={{ fontSize: '1.25rem', color: '#64748b' }}>Order #{order.id} — {order.customer.name}</p>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: '2rem',
                                    width: '100%',
                                    maxWidth: '1000px',
                                    marginBottom: '3rem'
                                }}>
                                    {order.items.map(item => {
                                        const product = products.find(p => p.id === item.productId);
                                        return (
                                            <div key={item.productId} style={{
                                                position: 'relative',
                                                width: '260px',
                                                height: '260px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '16px',
                                                padding: '1rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: '#fff',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    {product?.image ? (
                                                        <img src={product.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <div style={{ color: '#cbd5e1' }}>
                                                            <Package size={64} />
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '10px',
                                                    right: '10px',
                                                    background: '#2563eb',
                                                    color: 'white',
                                                    width: '60px',
                                                    height: '60px',
                                                    borderRadius: '30px',
                                                    fontSize: '2rem',
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                }}>
                                                    x{item.quantity}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <style jsx>{`
                                @keyframes pulse-blue {
                                    0% {
                                        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
                                    }
                                    70% {
                                        box-shadow: 0 0 0 15px rgba(37, 99, 235, 0);
                                    }
                                    100% {
                                        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
                                    }
                                }
                            `}</style>

                            <button
                                onClick={() => setShowPackingView(false)}
                                style={{
                                    position: 'absolute',
                                    bottom: '2rem',
                                    right: '2rem',
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 50,
                                    transition: 'transform 0.3s ease',
                                    animation: 'pulse-blue 2s infinite'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                title="Done Packing"
                            >
                                <CheckCircle size={32} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ padding: '1.5rem' }}>
                            {/* SECTION 1: CUSTOMER INFO */}
                            <section className={styles.infoSection}>
                                <h3 className={styles.sectionTitle}><UserIcon size={16} /> Recipient Information</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className={styles.inputGroup} style={{ marginRight: '0.75rem' }}>
                                        <label>Full Name</label>
                                        <input disabled={isReturned || readonly} value={order.customer.name} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, name: e.target.value } })} className={styles.inlineInput} />
                                    </div>
                                    <div className={styles.inputGroup} style={{ marginLeft: '0.75rem' }}>
                                        <label>Phone Number</label>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '0.5rem',
                                            overflow: 'hidden',
                                            background: 'white',
                                            transition: 'all 0.2s',
                                            borderColor: (order.customer.phone && (!['5', '6', '7'].includes(order.customer.phone[0]) || order.customer.phone.length !== 9)) ? '#ef4444' : '#e2e8f0',
                                            boxShadow: (order.customer.phone && (!['5', '6', '7'].includes(order.customer.phone[0]) || order.customer.phone.length !== 9)) ? '0 0 0 1px #ef4444' : 'none'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '0.5rem 0.75rem',
                                                background: '#f8fafc',
                                                borderRight: '1px solid #e2e8f0',
                                                color: '#475569',
                                                fontWeight: 600,
                                                fontSize: '0.9rem',
                                                userSelect: 'none'
                                            }}>
                                                <img
                                                    src="https://flagcdn.com/w40/ma.png"
                                                    alt="Morocco"
                                                    style={{ width: '20px', height: 'auto', borderRadius: '2px' }}
                                                />
                                                <span>+212</span>
                                            </div>
                                            <input
                                                disabled={isReturned || readonly}
                                                value={order.customer.phone}
                                                onChange={(e) => {
                                                    // 1. Remove non-digits
                                                    let val = e.target.value.replace(/\D/g, '');

                                                    // 2. Remove leading '0' or '212' if pasted/typed
                                                    if (val.startsWith('0')) val = val.substring(1);
                                                    if (val.startsWith('212')) val = val.substring(3);

                                                    // 3. Limit to 9 digits
                                                    if (val.length > 9) val = val.slice(0, 9);

                                                    setOrder({
                                                        ...order,
                                                        customer: { ...order.customer, phone: val }
                                                    });
                                                }}
                                                className={styles.inlineInput}
                                                style={{ border: 'none', boxShadow: 'none', borderRadius: 0, width: '100%' }}
                                                placeholder="612345678"
                                            />
                                        </div>
                                        {order.customer.phone && (!['5', '6', '7'].includes(order.customer.phone[0]) || order.customer.phone.length !== 9) && (
                                            <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <X size={12} />
                                                <span>Must start with 5, 6, or 7 and be 9 digits</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.inputGroup} style={{ marginRight: '0.75rem' }}>
                                        <label>City</label>
                                        <SearchableCitySelect
                                            cities={cathedisCities}
                                            value={order.customer.city || ''}
                                            onChange={(cityName) => {
                                                const city = cathedisCities.find(c => c.name === cityName);
                                                setOrder({
                                                    ...order,
                                                    customer: {
                                                        ...order.customer,
                                                        city: cityName,
                                                        sector: city?.sectors?.[0]?.name || ''
                                                    }
                                                });
                                            }}
                                            disabled={isLoadingCities || isReturned || readonly}
                                            placeholder="Select City..."
                                        />
                                    </div>
                                    <div className={styles.inputGroup} style={{ marginLeft: '0.75rem' }}>
                                        <label>Sector/Neighborhood</label>
                                        <SearchableSelect
                                            options={cathedisCities.find(c => c.name === order.customer.city)?.sectors || []}
                                            value={order.customer.sector || ''}
                                            onChange={(sectorName) => setOrder({ ...order, customer: { ...order.customer, sector: sectorName } })}
                                            disabled={!order.customer.city || isReturned || readonly}
                                            placeholder="Select Sector..."
                                        />
                                    </div>
                                    <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                        <label>Exact Shipping Address</label>
                                        <textarea
                                            disabled={isReturned || readonly}
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
                                <table
                                    className={styles.managementTable}
                                    style={{
                                        border: '2px solid #cbd5e1',
                                        borderCollapse: 'collapse',
                                        background: 'white'
                                    }}
                                >
                                    <thead>
                                        <tr style={{ background: '#f1f5f9' }}>
                                            <th style={{
                                                border: '1px solid #cbd5e1',
                                                padding: '1rem',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                fontSize: '0.75rem',
                                                color: '#475569',
                                                letterSpacing: '0.05em'
                                            }}>Product</th>
                                            <th style={{
                                                border: '1px solid #cbd5e1',
                                                padding: '1rem',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                fontSize: '0.75rem',
                                                color: '#475569',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center'
                                            }}>Quantity</th>
                                            {/* <th style={{
                                        border: '1px solid #cbd5e1',
                                        padding: '1rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                        letterSpacing: '0.05em',
                                        textAlign: 'center'
                                    }}>Price/Unit</th>
                                    <th style={{
                                        border: '1px solid #cbd5e1',
                                        padding: '1rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                        letterSpacing: '0.05em',
                                        textAlign: 'right'
                                    }}>Subtotal</th> */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map(item => {
                                            const product = products.find(p => p.id === item.productId);
                                            return (
                                                <tr key={item.productId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                                                        <div className="flex items-center gap-8">
                                                            {product?.image && <img src={product.image} className={styles.imageCell} alt="" />}
                                                            <div className="font-bold">{product?.title || 'Unknown'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="font-bold" style={{ padding: '0.75rem 1rem', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{item.quantity}</td>
                                                    {/* <td style={{ padding: '0.75rem 1rem', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(item.price || 0)}</td>
                                            <td className="font-bold" style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{formatCurrency((item.price || 0) * item.quantity)}</td> */}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {/* <tfoot>
                                <tr style={{ background: '#f8fafc' }}>
                                    <td
                                        colSpan={3}
                                        style={{
                                            border: '2px solid #cbd5e1',
                                            padding: '1.25rem',
                                            textAlign: 'right',
                                            fontWeight: '800',
                                            fontSize: '1rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: '#475569'
                                        }}
                                    >
                                        Total Cash on Delivery
                                    </td>
                                    <td
                                        style={{
                                            border: '2px solid #cbd5e1',
                                            padding: '1.25rem',
                                            fontWeight: '800',
                                            fontSize: '1.5rem',
                                            color: '#2563eb',
                                            textAlign: 'right'
                                        }}
                                    >
                                        {formatCurrency(order.total)}
                                    </td>
                                </tr>
                            </tfoot> */}
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
                                                <label>Weight (Kg)</label>
                                                <input type="number" value={order.weight || 1} onChange={(e) => setOrder({ ...order, weight: parseFloat(e.target.value) })} className={styles.inlineInput} />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label>Package Count</label>
                                                <input type="number" value={order.packageCount || 1} onChange={(e) => setOrder({ ...order, packageCount: parseInt(e.target.value) })} className={styles.inlineInput} />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label>Allow Opening</label>
                                                <select id="allow-opening-select" value={order.allowOpening ?? 1} onChange={(e) => setOrder({ ...order, allowOpening: parseInt(e.target.value) })} className={styles.inlineInput}>
                                                    <option value={0}>No</option>
                                                    <option value={1}>Yes</option>
                                                </select>
                                            </div>
                                            <div className={styles.inputGroup} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <label style={{ margin: 0 }}>Fragile</label>
                                                <input id="fragile-checkbox" type="checkbox" checked={order.fragile || false} onChange={(e) => setOrder({ ...order, fragile: e.target.checked })} style={{ width: '20px', height: '20px' }} />
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
                                                        if (!order.customer.city) {
                                                            alert('Please select a City before shipping.');
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

                                                        // First save the order locally to persist UI changes
                                                        try {
                                                            await updateOrderAction(order);
                                                        } catch (err) {
                                                            console.error('Failed to save order before shipping:', err);
                                                            alert('Failed to save changes. Please try again.');
                                                            setIsCreatingShipment(false);
                                                            return;
                                                        }

                                                        // Then create shipment
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

                                                            // First save the order locally to persist UI changes
                                                            try {
                                                                await updateOrderAction(order);
                                                            } catch (err) {
                                                                console.error('Failed to save order before shipping:', err);
                                                                alert('Failed to save changes. Please try again.');
                                                                setIsCreatingShipment(false);
                                                                return;
                                                            }

                                                            // Then push to Cathedis
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
                                                        onClick={handlePrintDeliveryNote}
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


                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
                {/* Footer should be hidden when in Packing View or always visible? 
                    Let's hide standard footer in Packing View to focus on "Done" button. */}
                {!showPackingView && (
                    <footer className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {/* Hide Cancel buttons if returned or readonly */}
                            {order.fulfillmentStatus !== 'returned' && !readonly && (
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
                            {order.fulfillmentStatus !== 'returned' && order.shippingId && order.status !== 'canceled' && !isAwaitingPickup && !isPickedUp && (
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
                            {!isReturned && !readonly && (
                                <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ minWidth: '160px' }}>
                                    {isSaving ? 'Updating...' : <><Save size={18} /> Update Recipient Details</>}
                                </button>
                            )}
                        </div>
                    </footer>
                )}
                {/* Hidden Iframe for silent printing - Always rendered */}
                <iframe
                    id="print-iframe"
                    style={{ display: 'none' }}
                    title="print-frame"
                />
            </div>
        </div>
    );
}
