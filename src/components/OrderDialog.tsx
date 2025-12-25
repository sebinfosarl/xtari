'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    X, Save, Trash2, Plus, Phone, MapPin,
    User as UserIcon, ShoppingCart, History as HistoryIcon,
    CheckCircle2, AlertCircle, MessageSquare, Ban,
    Search, Clock, FileText, IdCard, Briefcase, Eye, Truck, Package, RefreshCw, Download, ChevronDown, ChevronUp
} from 'lucide-react';
import { updateOrderAction, getCathedisCitiesAction } from '@/app/actions';
import styles from '../app/(admin)/admin/Admin.module.css';
import { Order, Product, SalesPerson, Kit } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import SearchableCitySelect from './SearchableCitySelect';
import SearchableSelect from './SearchableSelect';

interface OrderDialogProps {
    order: Order;
    products: Product[];
    salesPeople: SalesPerson[];
    onClose: () => void;
    readOnly?: boolean;
    kits?: Kit[];
}

export default function OrderDialog({ order: initialOrder, products, salesPeople, onClose, readOnly = false, kits }: OrderDialogProps) {
    const router = useRouter();
    const [order, setOrder] = useState<Order>(initialOrder);
    const [isSaving, setIsSaving] = useState(false);
    const [printFrameUrl, setPrintFrameUrl] = useState<string | null>(null);

    // UI States
    const [pendingStatus, setPendingStatus] = useState<Order['status'] | null>(null);
    const [activeTabDay, setActiveTabDay] = useState<number>(1);
    const [tempCallResult, setTempCallResult] = useState<Order['callResult']>('' as any);
    const [tempReason, setTempReason] = useState<Order['cancellationMotif']>('' as any);

    const [showProductGallery, setShowProductGallery] = useState(false);
    const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
    const [showAddButton, setShowAddButton] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [newComment, setNewComment] = useState('');
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

    const allCategories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return Array.from(cats) as string[];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    const addLog = (type: string, message: string) => {
        const newLog = {
            type,
            message,
            timestamp: new Date().toISOString(),
            user: 'Admin'
        };
        return [newLog, ...(order.logs || [])];
    };

    const handleStatusChange = (status: Order['status']) => {
        if (status === 'pending' && order.status !== 'pending') return; // Cannot return to pending
        if (status === order.status) return;

        setPendingStatus(status);
    };

    const confirmUpdate = async () => {
        if (!pendingStatus) return;

        setIsSaving(true);
        const oldStatus = order.status;
        let logMsg = `Changed status from ${oldStatus} to ${pendingStatus}`;
        const updates: Partial<Order> = { status: pendingStatus };

        if (pendingStatus === 'no_reply') {
            updates.callResult = tempCallResult;
            updates.callHistory = { 1: 1 };
            logMsg += ` | Status: No Reply | Result: ${tempCallResult} | Initiative Day 1`;
        } else if (pendingStatus === 'canceled') {
            updates.callResult = 'Canceled' as any;
            updates.cancellationMotif = tempReason;
            logMsg += ` | Reason: ${tempReason} | Call Result set to Canceled`;
        } else if (pendingStatus === 'sales_order') {
            updates.callResult = 'Appel confirmer' as any;
            if (!order.fulfillmentStatus) {
                updates.fulfillmentStatus = 'to_pick';
            }
            logMsg += ` | Auto-set Call Result: Appel confirmer | Fulfillment initialized to TO_PICK`;
        }

        const updatedOrder = {
            ...order,
            ...updates,
            logs: addLog('status_update', logMsg)
        };

        setOrder(updatedOrder);

        try {
            await updateOrderAction(updatedOrder);
            router.refresh();
        } catch (err) {
            console.error(err);
            alert('Failed to autosave status');
        } finally {
            setIsSaving(false);
            setPendingStatus(null);
            setTempCallResult('' as any);
            setTempReason('' as any);
        }
    };

    const handleSalesPersonChange = async (newPerson: string) => {
        setIsSaving(true);
        const updatedOrder = {
            ...order,
            salesPerson: newPerson,
            logs: addLog('sales_person_assign', `Assigned to ${newPerson}`)
        };
        setOrder(updatedOrder);

        try {
            await updateOrderAction(updatedOrder);
            router.refresh();
        } catch (err) {
            console.error(err);
            alert('Failed to autosave sales person attribution');
        } finally {
            setIsSaving(false);
        }
    };

    const addComment = () => {
        if (!newComment.trim()) return;
        setOrder({
            ...order,
            logs: addLog('comment', newComment)
        });
        setNewComment('');
    };

    const updateItem = (productId: string, quantity: number, price: number) => {
        const product = products.find(p => p.id === productId);
        const newItems = order.items.map(item =>
            item.productId === productId ? { ...item, quantity, price } : item
        );
        const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        setOrder({
            ...order,
            items: newItems,
            total: newTotal,
            logs: addLog('item_update', `Updated ${product?.title}: Qty ${quantity}, Price ${formatCurrency(price)}`)
        });
    };

    const addItem = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        // Check if product already exists in order
        const existingItem = order.items.find(item => item.productId === productId);

        let newItems;
        if (existingItem) {
            // Increase quantity of existing item
            newItems = order.items.map(item =>
                item.productId === productId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            );
        } else {
            // Add as new item
            newItems = [...order.items, { productId, quantity: 1, price: product.price }];
        }

        const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        setOrder({
            ...order,
            items: newItems,
            total: newTotal,
            logs: addLog('item_add', existingItem
                ? `Increased ${product.title} quantity to ${existingItem.quantity + 1}`
                : `Added ${product.title} to order`)
        });
        setShowProductGallery(false);
    };

    const removeItem = (productId: string) => {
        const product = products.find(p => p.id === productId);
        const newItems = order.items.filter(item => item.productId !== productId);
        const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        setOrder({
            ...order,
            items: newItems,
            total: newTotal,
            logs: addLog('item_remove', `Removed ${product?.title} from order`)
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateOrderAction(order);
            router.refresh();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to save order');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintInvoice = async () => {
        if (!readOnly) {
            const now = new Date().toISOString();
            const updatedOrder = {
                ...order,
                invoiceDownloaded: true,
                invoiceDate: order.invoiceDate || now, // Set once, keep for reprints
                logs: addLog('invoice_download', `Downloaded order invoice (Issue Date: ${new Date(now).toLocaleString()})`)
            };
            setOrder(updatedOrder);

            try {
                await updateOrderAction(updatedOrder);
                router.refresh();
            } catch (err) {
                console.error('Failed to auto-save invoice status', err);
            }
        }

        // Silent print via hidden iframe (append timestamp to force reload)
        setPrintFrameUrl(`/print/invoice/${order.id}?t=${Date.now()}`);
    };

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1500 }}>
            <div className={styles.orderModal}>
                <header className={styles.modalHeader}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.modalTitle}>Manage Order #{order.id}</h2>
                        <span className={styles.modalSubtitle}>{new Date(order.date).toLocaleString()}</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
                </header>

                <div className={styles.modalBody}>
                    {/* SECTION 1: CUSTOMER INFO */}
                    <section className={styles.infoSection}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={styles.sectionTitle} style={{ border: 'none', marginBottom: 0 }}><UserIcon size={16} /> Customer Details</h3>
                            <button
                                disabled={readOnly}
                                onClick={() => {
                                    const isBusiness = (order.companyName != null) || (order.ice != null);
                                    if (isBusiness) {
                                        // Disable business mode: clear fields
                                        setOrder({ ...order, companyName: undefined, ice: undefined, logs: addLog('business_mode', 'Disabled Business/Company Info') });
                                    } else {
                                        // Enable business mode: initialize
                                        setOrder({ ...order, companyName: '', ice: '', logs: addLog('business_mode', 'Enabled Business/Company Info') });
                                    }
                                }}
                                style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '6px 14px',
                                    borderRadius: 'full',
                                    background: ((order.companyName != null) || (order.ice != null)) ? 'rgba(59, 130, 246, 0.1)' : '#f8fafc',
                                    color: ((order.companyName != null) || (order.ice != null)) ? '#2563eb' : '#94a3b8',
                                    border: ((order.companyName != null) || (order.ice != null)) ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: readOnly ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: readOnly ? 0.5 : 1
                                }}
                            >
                                <Briefcase size={14} />
                                {((order.companyName != null) || (order.ice != null)) ? 'BUSINESS MODE ACTIVE' : 'SWITCH TO BUSINESS INVOICE'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className={styles.inputGroup} style={{ marginRight: '0.75rem' }}>
                                <label>Full Name</label>
                                <input disabled={readOnly} value={order.customer.name} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, name: e.target.value } })} className={styles.inlineInput} />
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
                                        disabled={readOnly}
                                        value={order.customer.phone}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                            if (val.startsWith('0')) val = val.substring(1); // Remove leading 0
                                            if (val.length > 9) val = val.substring(0, 9); // Max 9 digits

                                            setOrder({ ...order, customer: { ...order.customer, phone: val } });
                                        }}
                                        placeholder="612345678"
                                        className={styles.inlineInput}
                                        style={{
                                            border: 'none',
                                            boxShadow: 'none',
                                            borderRadius: '0',
                                            flex: 1,
                                            padding: '0.5rem 0.75rem',
                                            color: (order.customer.phone && (!['5', '6', '7'].includes(order.customer.phone[0]) || order.customer.phone.length !== 9)) ? '#ef4444' : 'inherit'
                                        }}
                                    />
                                </div>
                                {order.customer.phone && (
                                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#ef4444', height: '1.25rem' }}>
                                        {!['5', '6', '7'].includes(order.customer.phone[0]) && <span>Must start with 5, 6, or 7. </span>}
                                        {order.customer.phone.length !== 9 && <span>Must be 9 digits.</span>}
                                    </div>
                                )}
                            </div>

                            {((order.companyName != null) || (order.ice != null)) && (
                                <>
                                    <div className={styles.inputGroup} style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bae6fd', gridColumn: 'span 1', marginRight: '0.75rem' }}>
                                        <label style={{ color: '#0369a1' }}>Company/Business Name</label>
                                        <input
                                            disabled={readOnly}
                                            value={order.companyName || ''}
                                            onChange={(e) => setOrder({ ...order, companyName: e.target.value })}
                                            className={styles.inlineInput}
                                            placeholder="e.g. Acme Corp"
                                            style={{ background: 'white', borderColor: '#7dd3fc' }}
                                        />
                                    </div>
                                    <div className={styles.inputGroup} style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bae6fd', gridColumn: 'span 1', marginLeft: '0.75rem' }}>
                                        <label style={{ color: '#0369a1' }}>ICE (Tax ID)</label>
                                        <input
                                            disabled={readOnly}
                                            value={order.ice || ''}
                                            onChange={(e) => setOrder({ ...order, ice: e.target.value })}
                                            className={styles.inlineInput}
                                            placeholder="Registration Number"
                                            style={{ background: 'white', borderColor: '#7dd3fc' }}
                                        />
                                    </div>
                                </>
                            )}

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
                                    disabled={readOnly || isLoadingCities}
                                    placeholder="Select City..."
                                />
                            </div>
                            <div className={styles.inputGroup} style={{ marginLeft: '0.75rem' }}>
                                <label>Sector/Neighborhood</label>
                                <SearchableSelect
                                    options={cathedisCities.find(c => c.name === order.customer.city)?.sectors || (order.customer.city ? [{ id: 'autre', name: 'Autre' }] : [])}
                                    value={order.customer.sector || ''}
                                    onChange={(sectorName) => setOrder({ ...order, customer: { ...order.customer, sector: sectorName } })}
                                    disabled={readOnly || !order.customer.city}
                                    placeholder="Select Sector..."
                                />
                            </div>

                            <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                <label>Shipping Address</label>
                                <textarea disabled={readOnly} value={order.customer.address} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, address: e.target.value } })} className={styles.inlineInput} rows={2} />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: WORK STATUS */}
                    <section className={styles.infoSection}>
                        <h3 className={styles.sectionTitle}><AlertCircle size={16} /> Order Workflow & Attribution</h3>
                        <div className={styles.salesGrid}>
                            <div className={styles.inputGroup}>
                                <label>Work Status</label>
                                <select
                                    disabled={readOnly}
                                    className={styles.inlineInput}
                                    value={order.status}
                                    onChange={(e) => handleStatusChange(e.target.value as Order['status'])}
                                >
                                    <option value="pending" disabled={order.status !== 'pending'}>Pending</option>
                                    <option value="sales_order">Sales Order</option>
                                    <option value="no_reply">No Reply</option>
                                    <option value="canceled">Canceled</option>
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Sales Person</label>
                                <select
                                    disabled={readOnly}
                                    className={styles.inlineInput}
                                    value={order.salesPerson || ''}
                                    onChange={(e) => handleSalesPersonChange(e.target.value)}
                                >
                                    <option value="">Select Sales Person...</option>
                                    {salesPeople.map(p => (
                                        <option key={p.id} value={p.fullName}>{p.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            {(order.status === 'no_reply' || order.status === 'canceled') && (
                                <>
                                    <div className={styles.inputGroup}>
                                        <label>{order.status === 'no_reply' ? 'Current Call Result' : 'Cancellation Reason'}</label>
                                        {order.status === 'no_reply' ? (
                                            <select
                                                className={styles.inlineInput}
                                                value={order.callResult || ''}
                                                onChange={(e) => setOrder({ ...order, callResult: e.target.value as any, logs: addLog('status_update', `Updated Call Result to ${e.target.value}`) })}
                                            >
                                                <option value="Ligne Occupé">Ligne Occupé</option>
                                                <option value="Appel coupé">Appel coupé</option>
                                                <option value="Pas de réponse">Pas de réponse</option>
                                                <option value="Rappel demandé">Rappel demandé</option>
                                                <option value="Boite vocal">Boite vocal</option>
                                            </select>
                                        ) : (
                                            <div className="flex items-center h-10 font-bold text-red-600">
                                                {order.cancellationMotif || 'Not set'}
                                            </div>
                                        )}
                                    </div>
                                    {order.status === 'no_reply' && (
                                        <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'block' }}>Call Activity Tracker</label>

                                            <div style={{
                                                background: 'rgba(255, 255, 255, 0.7)',
                                                backdropFilter: 'blur(10px)',
                                                borderRadius: '20px',
                                                border: '1px solid rgba(226, 232, 240, 0.8)',
                                                padding: '1.25rem',
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1.5rem'
                                            }}>
                                                {/* PREMIUM DAY SELECTOR */}
                                                <div style={{
                                                    background: '#f1f5f9',
                                                    padding: '4px',
                                                    borderRadius: '14px',
                                                    display: 'flex',
                                                    gap: '4px'
                                                }}>
                                                    {[1, 2, 3].map(day => {
                                                        const prevDayAttempts = (order.callHistory || {})[day - 1] || 0;
                                                        // Time-based logic: Day 2 requires 24h (1 day), Day 3 requires 48h (2 days)
                                                        const orderDate = new Date(order.date);
                                                        const now = new Date();
                                                        const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

                                                        const isFinishedPrev = day === 1 || prevDayAttempts >= 5;
                                                        const isTimeReady = day === 1 || daysDiff >= (day - 1);

                                                        const isLocked = !isFinishedPrev || !isTimeReady;
                                                        const lockReason = !isFinishedPrev ? 'Complete previous day first' : 'Wait until tomorrow';

                                                        return (
                                                            <button
                                                                key={day}
                                                                disabled={isLocked}
                                                                onClick={(e) => {
                                                                    if (!isLocked) setActiveTabDay(day);
                                                                }}
                                                                title={isLocked ? lockReason : `Switch to Day ${day}`}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '10px 0',
                                                                    borderRadius: '10px',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: '800',
                                                                    letterSpacing: '0.05em',
                                                                    border: 'none',
                                                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                    background: activeTabDay === day
                                                                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                                                        : 'transparent',
                                                                    color: activeTabDay === day ? 'white' : '#64748b',
                                                                    boxShadow: activeTabDay === day ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                                                                    transform: activeTabDay === day ? 'scale(1.02)' : 'scale(1)',
                                                                    opacity: isLocked ? 0.3 : 1,
                                                                    filter: isLocked ? 'grayscale(1)' : 'none'
                                                                }}
                                                            >
                                                                {isLocked ? '🔒 ' : ''}DAY {day}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* LED ATTEMPT DOTS */}
                                                <div style={{
                                                    background: '#ffffff',
                                                    padding: '1.25rem',
                                                    borderRadius: '16px',
                                                    border: '1px solid #f1f5f9',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Daily Attempts</span>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Day {activeTabDay} Status</div>
                                                    </div>

                                                    <div className="flex gap-4">
                                                        {[1, 2, 3, 4, 5].map(attempt => {
                                                            const currentCount = (order.callHistory || {})[activeTabDay] || 0;
                                                            const isActive = attempt <= currentCount;
                                                            return (
                                                                <button
                                                                    key={attempt}
                                                                    onClick={() => {
                                                                        // IMMUTABILITY: Cannot decrease attempts
                                                                        if (attempt <= currentCount) {
                                                                            alert('Attempts are final and cannot be removed.');
                                                                            return;
                                                                        }
                                                                        // SEQUENTIAL: Must log one at a time
                                                                        if (attempt !== currentCount + 1) {
                                                                            alert(`Please log attempt ${currentCount + 1} first.`);
                                                                            return;
                                                                        }

                                                                        // TEMPORAL: 10-minute cooldown
                                                                        const lastCallLog = (order.logs || []).find(l => l.type === 'call_tracking');
                                                                        if (lastCallLog) {
                                                                            const lastTime = new Date(lastCallLog.timestamp).getTime();
                                                                            const now = new Date().getTime();
                                                                            const diffMin = (now - lastTime) / (1000 * 60);
                                                                            if (diffMin < 10) {
                                                                                const wait = Math.ceil(10 - diffMin);
                                                                                alert(`Please wait at least 10 minutes between calls. Wait ${wait} more minute(s).`);
                                                                                return;
                                                                            }
                                                                        }

                                                                        const history = { ...(order.callHistory || {}) };
                                                                        history[activeTabDay] = attempt;
                                                                        const newLogs = addLog('call_tracking', `Logged attempt ${attempt} for Day ${activeTabDay}`);
                                                                        const updatedOrder = { ...order, callHistory: history, logs: newLogs };

                                                                        // PERSIST IMMEDIATELY (Anti-bypass)
                                                                        setOrder(updatedOrder);
                                                                        updateOrderAction(updatedOrder).then(() => {
                                                                            router.refresh();
                                                                        });
                                                                    }}
                                                                    style={{
                                                                        width: '32px',
                                                                        height: '32px',
                                                                        borderRadius: '50%',
                                                                        background: isActive ? '#10b981' : '#f1f5f9',
                                                                        border: isActive ? 'none' : '2px solid #e2e8f0',
                                                                        boxShadow: isActive ? '0 0 15px rgba(16, 185, 129, 0.5)' : 'none',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                        position: 'relative',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.transform = 'scale(1.2) translateY(-2px)';
                                                                        if (isActive) e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.6)';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.transform = 'scale(1) translateY(0)';
                                                                        if (isActive) e.currentTarget.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.5)';
                                                                    }}
                                                                >
                                                                    {isActive && (
                                                                        <div style={{
                                                                            width: '8px',
                                                                            height: '8px',
                                                                            background: 'white',
                                                                            borderRadius: '50%',
                                                                            boxShadow: '0 0 5px white'
                                                                        }} />
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </section>

                    {/* SECTION 3: ORDER CONTENT */}
                    <section className={styles.infoSection}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                            <h3 className={styles.sectionTitle} style={{ border: 'none', marginBottom: 0 }}><ShoppingCart size={16} /> Order Content</h3>
                            {!readOnly && (
                                <button onClick={() => setShowProductGallery(true)} className="btn btn-accent btn-sm">
                                    <Plus size={16} /> Add Product
                                </button>
                            )}
                        </div>

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
                                    }}>Item</th>
                                    <th style={{
                                        border: '1px solid #cbd5e1',
                                        padding: '1rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                        letterSpacing: '0.05em',
                                        textAlign: 'center'
                                    }}>Price</th>
                                    <th style={{
                                        border: '1px solid #cbd5e1',
                                        padding: '1rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                        letterSpacing: '0.05em',
                                        textAlign: 'center'
                                    }}>Qty</th>
                                    <th style={{
                                        border: '1px solid #cbd5e1',
                                        padding: '1rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                        letterSpacing: '0.05em',
                                        textAlign: 'right'
                                    }}>Subtotal</th>
                                    <th style={{
                                        border: '1px solid #cbd5e1',
                                        padding: '1rem',
                                        width: '60px'
                                    }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    // REVERSE KIT RESOLUTION:
                                    // Check if items can be bundled into a Kit for display.
                                    // Make a mutable copy of items to "consume".
                                    let remainingItems = order.items.map(i => ({ ...i }));
                                    const displayItems: { productId: string; quantity: number; price: number; isKit?: boolean; originalPrice?: number }[] = [];

                                    if (kits && kits.length > 0) {
                                        for (const kit of kits) {
                                            // Safety: Ensure kit components exist
                                            if (!kit.components || kit.components.length === 0) continue;

                                            // Check how many full kits we can form
                                            let maxPossibleKits = Infinity;
                                            for (const comp of kit.components) {
                                                const found = remainingItems.find(r => r.productId === comp.productId);
                                                if (!found) {
                                                    maxPossibleKits = 0;
                                                    break;
                                                }
                                                maxPossibleKits = Math.min(maxPossibleKits, Math.floor(found.quantity / comp.quantity));
                                            }

                                            if (maxPossibleKits > 0 && maxPossibleKits !== Infinity) {
                                                // We found 'maxPossibleKits' bundles of this kit.
                                                // Add Kit to display
                                                const kitProduct = products.find(p => p.id === kit.targetProductId);
                                                if (kitProduct) {
                                                    displayItems.push({
                                                        productId: kit.targetProductId,
                                                        quantity: maxPossibleKits,
                                                        price: kitProduct.price, // Use Kit Price
                                                        isKit: true,
                                                        // Note: We might want to sum up component prices if kit price is 0? 
                                                        // But usually Kit Price is authoritative.
                                                    });

                                                    // Consume components
                                                    for (const comp of kit.components) {
                                                        const found = remainingItems.find(r => r.productId === comp.productId);
                                                        if (found) {
                                                            found.quantity -= (comp.quantity * maxPossibleKits);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // Add remaining non-consumed items
                                    remainingItems.forEach(item => {
                                        if (item.quantity > 0) {
                                            displayItems.push(item);
                                        }
                                    });

                                    // Render
                                    return displayItems.map((item, idx) => {
                                        const product = products.find(p => p.id === item.productId);
                                        return (
                                            <tr
                                                key={`${item.productId}-${idx}`}
                                                style={{
                                                    background: item.isKit ? '#eff6ff' : 'white',
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                <td style={{
                                                    border: '1px solid #cbd5e1',
                                                    padding: '1rem'
                                                }}>
                                                    <div className="flex items-center gap-8">
                                                        {product?.image && (
                                                            <img
                                                                src={product.image}
                                                                className={styles.imageCell}
                                                                alt=""
                                                                onClick={() => { setPreviewProduct(product); setShowAddButton(false); }}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        )}
                                                        <div className="flex flex-col">
                                                            <div className="font-bold flex items-center gap-2">
                                                                {product?.title || 'Unknown'}
                                                                {(item.isKit || kits?.some(k => k.targetProductId === item.productId)) && (
                                                                    <span style={{
                                                                        display: 'inline-block',
                                                                        padding: '2px 6px',
                                                                        fontSize: '10px',
                                                                        fontWeight: 'bold',
                                                                        color: 'white',
                                                                        backgroundColor: '#9333ea',
                                                                        borderRadius: '2px',
                                                                        boxShadow: '0 0 5px rgba(147, 51, 234, 0.6)',
                                                                        letterSpacing: '0.05em',
                                                                        textTransform: 'uppercase'
                                                                    }}>
                                                                        KIT
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.isKit && (
                                                                <div className="text-xs text-slate-500 italic">
                                                                    Contains: {kits?.find(k => k.targetProductId === item.productId)?.components.map(c =>
                                                                        `${products.find(p => p.id === c.productId)?.title} (x${c.quantity})`
                                                                    ).join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{
                                                    border: '1px solid #cbd5e1',
                                                    padding: '1rem',
                                                    textAlign: 'center'
                                                }}>
                                                    {item.isKit ? (
                                                        <span className="text-slate-500 italic text-sm">Bundle Price</span>
                                                    ) : (
                                                        <input
                                                            disabled={readOnly}
                                                            type="number"
                                                            step="0.01"
                                                            value={item.price ?? ''}
                                                            onChange={(e) => updateItem(item.productId, item.quantity, parseFloat(e.target.value) || 0)}
                                                            className={styles.inlineInput}
                                                            style={{ width: '90px' }}
                                                        />
                                                    )}
                                                </td>
                                                <td style={{
                                                    border: '1px solid #cbd5e1',
                                                    padding: '1rem',
                                                    textAlign: 'center'
                                                }}>
                                                    {item.isKit ? (
                                                        <span className="font-bold">{item.quantity}</span>
                                                    ) : (
                                                        <input
                                                            disabled={readOnly}
                                                            type="number"
                                                            value={item.quantity ?? ''}
                                                            onChange={(e) => updateItem(item.productId, parseInt(e.target.value) || 1, item.price)}
                                                            className={styles.inlineInput}
                                                            style={{ width: '60px' }}
                                                        />
                                                    )}
                                                </td>
                                                <td style={{
                                                    border: '1px solid #cbd5e1',
                                                    padding: '1rem',
                                                    fontWeight: '700',
                                                    textAlign: 'right',
                                                    color: '#0f172a'
                                                }}>{formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
                                                <td style={{
                                                    border: '1px solid #cbd5e1',
                                                    padding: '1rem',
                                                    textAlign: 'center'
                                                }}>
                                                    {!item.isKit && !readOnly && (
                                                        <button onClick={() => removeItem(item.productId)} className={styles.deleteBtn}><Trash2 size={16} /></button>
                                                    )}
                                                    {item.isKit && (
                                                        <div title="Bundles cannot be edited directly" className="text-slate-300">
                                                            <Ban size={16} />
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                            <tfoot>
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
                                        Total Amount
                                    </td>
                                    <td
                                        colSpan={2}
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
                            </tfoot>
                        </table>
                    </section>


                    {/* SECTION 4: LOGS */}
                    <section className={styles.infoSection}>
                        <h3 className={styles.sectionTitle}><HistoryIcon size={16} /> Activity & Comments</h3>
                        {!readOnly && (
                            <div className="flex gap-2">
                                <input
                                    placeholder="Write a log or comment..."
                                    className={styles.inlineInput}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                                <button onClick={addComment} className="btn btn-primary">Post</button>
                            </div>
                        )}
                        <div className={styles.logContainer}>
                            {order.logs?.map((log, i) => (
                                <div key={i} className={styles.logEntry}>
                                    <div className={styles.logMeta}>
                                        <span className="font-bold text-blue-600">{log.type.replace('_', ' ').toUpperCase()}</span>
                                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className={styles.logMessage}>{log.message}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <footer className={styles.modalFooter}>
                    {(order.status === 'sales_order' && order.salesPerson && order.salesPerson !== '') && (
                        <button
                            onClick={handlePrintInvoice}
                            className="btn btn-outline"
                            style={{ marginRight: 'auto' }}
                        >
                            <FileText size={18} />
                            Download Invoice
                        </button>
                    )}
                    <button onClick={onClose} className="btn btn-outline" style={!(order.status === 'sales_order' && order.salesPerson && order.salesPerson !== '') ? { marginLeft: 'auto' } : {}}>
                        {readOnly ? 'Close' : 'Cancel'}
                    </button>
                    {!readOnly && (
                        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ minWidth: '160px' }}>
                            {isSaving ? 'Saving...' : <><Save size={18} /> Update Order</>}
                        </button>
                    )}
                </footer>

                {/* HIDDEN INVOICE PRINT AREA */}
                {/* HIDDEN PRINT FRAME */}
                {printFrameUrl && (
                    <iframe
                        src={printFrameUrl}
                        style={{ position: 'absolute', width: 0, height: 0, border: 'none', visibility: 'hidden' }}
                        title="print-frame"
                    />
                )}

                {/* DYNAMIC POPUPS */}
                {
                    pendingStatus && (
                        <div className={styles.confirmOverlay}>
                            <div className={styles.confirmCard}>
                                <h3 className={styles.confirmTitle}>Confirm Status: {pendingStatus.replace('_', ' ').toUpperCase()}</h3>
                                <p className={styles.confirmDesc}>Please provide the necessary details to proceed.</p>

                                {pendingStatus === 'no_reply' && (
                                    <div className={styles.inputGroup}>
                                        <label>Call Result</label>
                                        <select className={styles.inlineInput} value={tempCallResult} onChange={(e) => setTempCallResult(e.target.value as any)}>
                                            <option value="">Select Result...</option>
                                            <option value="Ligne Occupé">Ligne Occupé</option>
                                            <option value="Appel coupé">Appel coupé</option>
                                            <option value="Pas de réponse">Pas de réponse</option>
                                            <option value="Rappel demandé">Rappel demandé</option>
                                            <option value="Boite vocal">Boite vocal</option>
                                        </select>
                                    </div>
                                )}

                                {pendingStatus === 'canceled' && (
                                    <div className={styles.inputGroup}>
                                        <label>Reason for Cancellation</label>
                                        <select className={styles.inlineInput} value={tempReason} onChange={(e) => setTempReason(e.target.value as any)}>
                                            <option value="">Select Reason...</option>
                                            <option value="Mauvais numero">Mauvais numéro</option>
                                            <option value="Appel rejete">Appel rejeté</option>
                                            <option value="commande en double">Commande en double</option>
                                            <option value="Rupture de stock">Rupture de stock</option>
                                            <option value="Pas de reponse">Pas de réponse</option>
                                            <option value="Commande frauduleuse">Commande frauduleuse</option>
                                        </select>
                                    </div>
                                )}

                                <div className="flex gap-6 mt-4" style={{ justifyContent: 'center' }}>
                                    <button
                                        disabled={(pendingStatus === 'no_reply' && !tempCallResult) || (pendingStatus === 'canceled' && !tempReason)}
                                        onClick={confirmUpdate}
                                        className="btn btn-primary"
                                        style={{ paddingLeft: '2rem', paddingRight: '2rem', marginRight: '0.75rem' }}
                                    >
                                        Confirm Change
                                    </button>
                                    <button onClick={() => { setPendingStatus(null); setTempCallResult('' as any); setTempReason('' as any); }} className="btn btn-outline" style={{ paddingLeft: '2rem', paddingRight: '2rem', marginLeft: '0.75rem' }}>Abort</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Product Gallery */}
                {
                    showProductGallery && (
                        <div className={styles.productGallery}>
                            <header className={styles.modalHeader}>
                                <h3 className="font-bold">Inventory Selection</h3>
                                <button onClick={() => { setShowProductGallery(false); setSearchQuery(''); setSelectedCategory('all'); }} className={styles.closeBtn}><X size={20} /></button>
                            </header>

                            <div className={styles.gallerySearchWrapper}>
                                <Search size={18} className="text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search products by title..."
                                    className={styles.gallerySearchInput}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.galleryFilters}>
                                <button
                                    className={`${styles.filterPill} ${selectedCategory === 'all' ? styles.active : ''}`}
                                    onClick={() => setSelectedCategory('all')}
                                >
                                    All Products
                                </button>
                                {allCategories.map((cat: string) => (
                                    <button
                                        key={cat}
                                        className={`${styles.filterPill} ${selectedCategory === cat ? styles.active : ''}`}
                                        onClick={() => setSelectedCategory(cat)}
                                    >
                                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                                    </button>
                                ))}
                            </div>

                            <div className={styles.galleryBody}>
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((p: Product) => (
                                        <div key={p.id} className={styles.galleryItem} onClick={() => addItem(p.id)}>
                                            <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                                                <img src={p.image} className={styles.galleryThumb} alt="" />
                                            </div>
                                            <div style={{ flex: 1, paddingRight: '2.5rem' }}>
                                                <div className={styles.galleryTitle}>{p.title}</div>
                                                <div className={styles.galleryPrice}>{formatCurrency(p.price || 0)}</div>
                                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{p.category}</div>
                                            </div>
                                            {kits?.some(k => k.targetProductId === p.id) && (
                                                <span style={{
                                                    position: 'absolute',
                                                    top: '10px',
                                                    right: '12px',
                                                    display: 'inline-block',
                                                    padding: '2px 6px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    color: 'white',
                                                    backgroundColor: '#9333ea',
                                                    borderRadius: '2px',
                                                    boxShadow: '0 0 5px rgba(147, 51, 234, 0.6)',
                                                    letterSpacing: '0.05em',
                                                    textTransform: 'uppercase',
                                                    zIndex: 4
                                                }}>
                                                    KIT
                                                </span>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPreviewProduct(p); setShowAddButton(true); }}
                                                className={styles.previewBtn}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: '12px',
                                                    right: '12px',
                                                    background: 'white',
                                                    borderRadius: '6px',
                                                    padding: '4px',
                                                    border: '1px solid #e2e8f0',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    zIndex: 5
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.15)';
                                                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(37, 99, 235, 0.25)';
                                                    e.currentTarget.style.background = '#eff6ff';
                                                    e.currentTarget.style.borderColor = '#2563eb';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                                    e.currentTarget.style.background = 'white';
                                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                                }}
                                            >
                                                <Eye size={14} color="var(--color-primary)" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 py-12 text-center text-slate-400 italic">
                                        No products found matching your search or category.
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* IMAGE PREVIEW LIGHTBOX */}
                {
                    previewProduct && (
                        <div className={styles.confirmOverlay} style={{ zIndex: 2000 }} onClick={() => setPreviewProduct(null)}>
                            <div
                                className={styles.confirmCard}
                                style={{
                                    maxWidth: '600px',
                                    maxHeight: '90vh',
                                    padding: 0,
                                    overflow: 'auto',
                                    background: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    // Modern scrollbar styling
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#cbd5e1 #f1f5f9'
                                } as React.CSSProperties & { scrollbarWidth?: string; scrollbarColor?: string }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ position: 'relative', flexShrink: 0, width: '100%', aspectRatio: '1/1', overflow: 'hidden' }}>
                                    <img src={previewProduct.image} alt={previewProduct.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                        onClick={() => setPreviewProduct(null)}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '10px',
                                            background: 'rgba(0,0,0,0.5)',
                                            color: 'white',
                                            borderRadius: '50%',
                                            padding: '4px',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div style={{
                                    padding: '1.5rem',
                                    background: 'white'
                                }}>
                                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700' }}>{previewProduct.title}</h3>
                                    <div
                                        style={{
                                            color: '#64748b',
                                            fontSize: '0.9rem',
                                            margin: '0 0 1.5rem 0',
                                            lineHeight: '1.6'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: previewProduct.description }}
                                    />
                                    {showAddButton && (
                                        <div className="flex justify-between items-center" style={{
                                            borderTop: '1px solid #f1f5f9',
                                            paddingTop: '1rem'
                                        }}>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency(previewProduct.price)}</span>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => { addItem(previewProduct.id); setPreviewProduct(null); }}
                                            >
                                                Add to Order
                                            </button>
                                        </div>
                                    )}
                                    {!showAddButton && (
                                        <div style={{
                                            borderTop: '1px solid #f1f5f9',
                                            paddingTop: '1rem',
                                            textAlign: 'center'
                                        }}>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency(previewProduct.price)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
