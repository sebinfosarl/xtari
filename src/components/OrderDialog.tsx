
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Product } from '@/lib/db';
import { updateOrderAction } from '@/app/actions';
import {
    X, Save, Trash2, Plus, Phone, MapPin,
    User as UserIcon, ShoppingCart, History,
    CheckCircle2, AlertCircle, MessageSquare, Ban,
    Search, Clock
} from 'lucide-react';
import styles from '../app/(admin)/admin/Admin.module.css';

interface OrderDialogProps {
    order: Order;
    products: Product[];
    onClose: () => void;
}

export default function OrderDialog({ order: initialOrder, products, onClose }: OrderDialogProps) {
    const router = useRouter();
    const [order, setOrder] = useState<Order>(initialOrder);
    const [isSaving, setIsSaving] = useState(false);

    // UI States
    const [pendingStatus, setPendingStatus] = useState<Order['status'] | null>(null);
    const [tempCallResult, setTempCallResult] = useState<Order['callResult']>('' as any);
    const [tempReason, setTempReason] = useState<Order['cancellationMotif']>('' as any);

    const [showProductGallery, setShowProductGallery] = useState(false);
    const [newComment, setNewComment] = useState('');

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
            logMsg += ` | Call Result: ${tempCallResult}`;
        } else if (pendingStatus === 'canceled') {
            updates.cancellationMotif = tempReason;
            logMsg += ` | Reason: ${tempReason}`;
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

    return (
        <div className={styles.modalOverlay}>
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
                        <h3 className={styles.sectionTitle}><UserIcon size={16} /> Customer Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className={styles.inputGroup}>
                                <label>Full Name</label>
                                <input value={order.customer.name} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, name: e.target.value } })} className={styles.inlineInput} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Phone Number</label>
                                <input value={order.customer.phone} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, phone: e.target.value } })} className={styles.inlineInput} />
                            </div>
                            <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                <label>Shipping Address</label>
                                <textarea value={order.customer.address} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, address: e.target.value } })} className={styles.inlineInput} rows={2} />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: WORK STATUS */}
                    <section className={styles.infoSection}>
                        <h3 className={styles.sectionTitle}><AlertCircle size={16} /> Order Workflow</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className={styles.inputGroup}>
                                <label>Work Status</label>
                                <select
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
                            {(order.status === 'no_reply' || order.status === 'canceled') && (
                                <div className={styles.inputGroup}>
                                    <label>{order.status === 'no_reply' ? 'Current Call Result' : 'Cancellation Reason'}</label>
                                    <div className="flex items-center h-10 font-bold text-blue-600">
                                        {order.status === 'no_reply' ? order.callResult || 'Not set' : order.cancellationMotif || 'Not set'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* SECTION 3: ORDER CONTENT */}
                    <section className={styles.infoSection}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={styles.sectionTitle} style={{ border: 'none', marginBottom: 0 }}><ShoppingCart size={16} /> Order Content</h3>
                            <button onClick={() => setShowProductGallery(true)} className="btn btn-accent btn-sm">
                                <Plus size={16} /> Add Product
                            </button>
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
                        <h3 className={styles.sectionTitle}><History size={16} /> Activity & Comments</h3>
                        <div className="flex gap-2">
                            <input
                                placeholder="Write a log or comment..."
                                className={styles.inlineInput}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                            />
                            <button onClick={addComment} className="btn btn-primary">Post</button>
                        </div>
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
                    <button onClick={onClose} className="btn btn-outline">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ minWidth: '160px' }}>
                        {isSaving ? 'Saving...' : <><Save size={18} /> Update Order</>}
                    </button>
                </footer>

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
                            <button onClick={() => setShowProductGallery(false)} className={styles.closeBtn}><X size={20} /></button>
                        </header>
                        <div className={styles.galleryBody}>
                            {products.map(p => (
                                <div key={p.id} className={styles.galleryItem} onClick={() => addItem(p.id)}>
                                    <img src={p.image} className={styles.galleryThumb} alt="" />
                                    <div>
                                        <div className={styles.galleryTitle}>{p.title}</div>
                                        <div className={styles.galleryPrice}>${p.price}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
