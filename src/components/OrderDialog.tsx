'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Product, SalesPerson } from '@/lib/db';
import {
    X, Save, Trash2, Plus, Phone, MapPin,
    User as UserIcon, ShoppingCart, History as HistoryIcon,
    CheckCircle2, AlertCircle, MessageSquare, Ban,
    Search, Clock, FileText, IdCard, Briefcase, Eye, Truck, Package, RefreshCw, Download, ChevronDown, ChevronUp
} from 'lucide-react';
import { updateOrderAction, getCathedisCitiesAction } from '@/app/actions';
import styles from '../app/(admin)/admin/Admin.module.css';

interface OrderDialogProps {
    order: Order;
    products: Product[];
    salesPeople: SalesPerson[];
    onClose: () => void;
    readOnly?: boolean;
}

export default function OrderDialog({ order: initialOrder, products, salesPeople, onClose, readOnly = false }: OrderDialogProps) {
    const router = useRouter();
    const [order, setOrder] = useState<Order>(initialOrder);
    const [isSaving, setIsSaving] = useState(false);

    // UI States
    const [pendingStatus, setPendingStatus] = useState<Order['status'] | null>(null);
    const [activeTabDay, setActiveTabDay] = useState<number>(1);
    const [tempCallResult, setTempCallResult] = useState<Order['callResult']>('' as any);
    const [tempReason, setTempReason] = useState<Order['cancellationMotif']>('' as any);

    const [showProductGallery, setShowProductGallery] = useState(false);
    const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
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
        const cats = new Set(products.map(p => p.category));
        return Array.from(cats);
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

    const confirmUpdate = () => {
        if (!pendingStatus) return;

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
            logMsg += ` | Auto-set Call Result: Appel confirmer`;
        }

        setOrder({
            ...order,
            ...updates,
            logs: addLog('status_update', logMsg)
        });

        setPendingStatus(null);
        setTempCallResult('' as any);
        setTempReason('' as any);
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
            logs: addLog('item_update', `Updated ${product?.title}: Qty ${quantity}, Price $${price}`)
        });
    };

    const addItem = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const newItems = [...order.items, { productId, quantity: 1, price: product.price }];
        const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        setOrder({
            ...order,
            items: newItems,
            total: newTotal,
            logs: addLog('item_add', `Added ${product.title} to order`)
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

        window.print();
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
                                onClick={() => {
                                    const isBusiness = !!order.companyName || !!order.ice;
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
                                    background: (order.companyName !== undefined || order.ice !== undefined) ? 'rgba(59, 130, 246, 0.1)' : '#f8fafc',
                                    color: (order.companyName !== undefined || order.ice !== undefined) ? '#2563eb' : '#94a3b8',
                                    border: (order.companyName !== undefined || order.ice !== undefined) ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Briefcase size={14} />
                                {(order.companyName !== undefined || order.ice !== undefined) ? 'BUSINESS MODE ACTIVE' : 'SWITCH TO BUSINESS INVOICE'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className={styles.inputGroup}>
                                <label>Full Name</label>
                                <input disabled={readOnly} value={order.customer.name} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, name: e.target.value } })} className={styles.inlineInput} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Phone Number</label>
                                <input disabled={readOnly} value={order.customer.phone} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, phone: e.target.value } })} className={styles.inlineInput} />
                            </div>

                            {(order.companyName !== undefined || order.ice !== undefined) && (
                                <>
                                    <div className={styles.inputGroup} style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
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
                                    <div className={styles.inputGroup} style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
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

                            <div className={styles.inputGroup}>
                                <label>City</label>
                                <select
                                    disabled={readOnly || isLoadingCities}
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
                                    disabled={readOnly || !order.customer.city}
                                    value={order.customer.sector || ''}
                                    onChange={(e) => setOrder({ ...order, customer: { ...order.customer, sector: e.target.value } })}
                                    className={styles.inlineInput}
                                >
                                    <option value="">Select Sector...</option>
                                    {cathedisCities.find(c => c.name === order.customer.city)?.sectors?.map((s: any) => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                    {!cathedisCities.find(c => c.name === order.customer.city)?.sectors?.length && order.customer.city && (
                                        <option value="Autre">Autre</option>
                                    )}
                                </select>
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
                                    onChange={(e) => setOrder({ ...order, salesPerson: e.target.value, logs: addLog('sales_person_assign', `Assigned to ${e.target.value}`) })}
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
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={styles.sectionTitle} style={{ border: 'none', marginBottom: 0 }}><ShoppingCart size={16} /> Order Content</h3>
                            {!readOnly && (
                                <button onClick={() => setShowProductGallery(true)} className="btn btn-accent btn-sm">
                                    <Plus size={16} /> Add Product
                                </button>
                            )}
                        </div>

                        <table className={styles.managementTable}>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Price</th>
                                    <th>Qty</th>
                                    <th>Subtotal</th>
                                    <th></th>
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
                                            <td>
                                                <input type="number" step="0.01" value={item.price} onChange={(e) => updateItem(item.productId, item.quantity, parseFloat(e.target.value))} className={styles.inlineInput} style={{ width: '90px' }} />
                                            </td>
                                            <td>
                                                <input type="number" value={item.quantity} onChange={(e) => updateItem(item.productId, parseInt(e.target.value), item.price)} className={styles.inlineInput} style={{ width: '60px' }} />
                                            </td>
                                            <td className="font-bold">${(item.price * item.quantity).toFixed(2)}</td>
                                            <td>
                                                <button onClick={() => removeItem(item.productId)} className={styles.deleteBtn}><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} className="text-right p-4 font-bold">Total Amount</td>
                                    <td colSpan={2} className="p-4 font-extrabold text-blue-600 text-xl">${order.total.toFixed(2)}</td>
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
                <div className={styles.invoicePrintArea}>
                    <div className={styles.invoiceHeader}>
                        <div>
                            <h1 style={{ fontSize: '2rem', margin: 0 }}>XTARI INVOICE</h1>
                            <p>Order ID: #{order.id}</p>
                            <p>Issue Date: {order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p><strong>Billed To:</strong></p>
                            {order.companyName ? (
                                <>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0' }}>{order.companyName}</p>
                                    <p>ICE: {order.ice || 'N/A'}</p>
                                    <p>TEL: {order.customer.phone}</p>
                                </>
                            ) : (
                                <>
                                    <p>{order.customer.name}</p>
                                    <p>{order.customer.phone}</p>
                                    <p>{order.customer.address}</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-start mt-4 mb-6 pt-4 border-t border-slate-100">
                        <div>
                            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Sales Person:</strong> {order.salesPerson || 'Unassigned'}</p>
                            {salesPeople.find(p => p.fullName === order.salesPerson) && (
                                <div className="text-[10px] text-slate-500 space-y-1">
                                    <p>CNIE: {salesPeople.find(p => p.fullName === order.salesPerson)?.cnie}</p>
                                    <p>ICE: {salesPeople.find(p => p.fullName === order.salesPerson)?.ice} | IF: {salesPeople.find(p => p.fullName === order.salesPerson)?.if}</p>
                                    <p>TEL: {salesPeople.find(p => p.fullName === order.salesPerson)?.tel}</p>
                                </div>
                            )}
                        </div>
                        {salesPeople.find(p => p.fullName === order.salesPerson) && (
                            <div className="flex gap-6 items-end">
                                {salesPeople.find(p => p.fullName === order.salesPerson)?.signature && (
                                    <div className="text-center">
                                        <p className="text-[8px] uppercase font-bold text-slate-400 mb-1">Signature</p>
                                        <img src={salesPeople.find(p => p.fullName === order.salesPerson)?.signature} alt="Signature" className="h-10 object-contain" />
                                    </div>
                                )}
                                {salesPeople.find(p => p.fullName === order.salesPerson)?.cachet && (
                                    <div className="text-center">
                                        <p className="text-[8px] uppercase font-bold text-slate-400 mb-1">Cachet</p>
                                        <img src={salesPeople.find(p => p.fullName === order.salesPerson)?.cachet} alt="Cachet" className="h-14 object-contain" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <table className={styles.invoiceTable}>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Quantity</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map(item => {
                                const product = products.find(p => p.id === item.productId);
                                return (
                                    <tr key={item.productId}>
                                        <td>{product?.title}</td>
                                        <td>${item.price.toFixed(2)}</td>
                                        <td>{item.quantity}</td>
                                        <td>${(item.price * item.quantity).toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div style={{ textAlign: 'right', marginTop: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem' }}>Total: ${order.total.toFixed(2)}</h2>
                        <p style={{ marginTop: '3rem', fontStyle: 'italic' }}>Thank you for your business!</p>
                    </div>
                </div>

                {/* DYNAMIC POPUPS */}
                {pendingStatus && (
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

                            <div className="flex gap-3 mt-4">
                                <button
                                    disabled={(pendingStatus === 'no_reply' && !tempCallResult) || (pendingStatus === 'canceled' && !tempReason)}
                                    onClick={confirmUpdate}
                                    className="btn btn-primary flex-1"
                                >
                                    Confirm Change
                                </button>
                                <button onClick={() => { setPendingStatus(null); setTempCallResult('' as any); setTempReason('' as any); }} className="btn btn-outline flex-1">Abort</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Product Gallery */}
                {showProductGallery && (
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
                                            <div className={styles.galleryPrice}>${p.price.toFixed(2)}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{p.category}</div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPreviewProduct(p); }}
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
                                                transition: 'all 0.2s',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 5
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
                )}

                {/* IMAGE PREVIEW LIGHTBOX */}
                {previewProduct && (
                    <div className={styles.confirmOverlay} style={{ zIndex: 2000 }} onClick={() => setPreviewProduct(null)}>
                        <div
                            className={styles.confirmCard}
                            style={{
                                maxWidth: '600px',
                                padding: 0,
                                overflow: 'hidden',
                                background: 'white'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ position: 'relative' }}>
                                <img src={previewProduct.image} alt={previewProduct.title} style={{ width: '100%', maxHeight: '450px', objectFit: 'contain' }} />
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
                            <div style={{ padding: '1.5rem', background: 'white' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{previewProduct.title}</h3>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.5rem 0 1rem 0' }}>{previewProduct.description}</p>
                                <div className="flex justify-between items-center">
                                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>${previewProduct.price.toFixed(2)}</span>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => { addItem(previewProduct.id); setPreviewProduct(null); }}
                                    >
                                        Add to Order
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
