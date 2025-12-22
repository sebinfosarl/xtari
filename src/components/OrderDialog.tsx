
'use client';

import { useState, useEffect } from 'react';
import { Order, Product, Category } from '@/lib/db';
import { updateOrderAction } from '@/app/actions';
import { X, Save, Trash2, Plus, Phone, MapPin, User as UserIcon, ShoppingCart } from 'lucide-react';
import styles from '../app/(admin)/admin/Admin.module.css';

interface OrderDialogProps {
    order: Order;
    products: Product[];
    onClose: () => void;
}

export default function OrderDialog({ order: initialOrder, products, onClose }: OrderDialogProps) {
    const [order, setOrder] = useState<Order>(initialOrder);
    const [isSaving, setIsSaving] = useState(false);

    const updateStatus = (status: Order['status']) => {
        setOrder({ ...order, status });
    };

    const updateCallResult = (callResult: Order['callResult']) => {
        setOrder({ ...order, callResult });
    };

    const updateCancellation = (motif: Order['cancellationMotif']) => {
        setOrder({ ...order, cancellationMotif: motif });
    };

    const updateItem = (productId: string, quantity: number, price: number) => {
        const newItems = order.items.map(item =>
            item.productId === productId ? { ...item, quantity, price } : item
        );
        const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        setOrder({ ...order, items: newItems, total: newTotal });
    };

    const removeItem = (productId: string) => {
        const newItems = order.items.filter(item => item.productId !== productId);
        const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        setOrder({ ...order, items: newItems, total: newTotal });
    };

    const addItem = (productId: string) => {
        if (order.items.find(i => i.productId === productId)) return;
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const newItems = [...order.items, { productId, quantity: 1, price: product.price }];
        const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        setOrder({ ...order, items: newItems, total: newTotal });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateOrderAction(order);
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
                        <h2 className={styles.modalTitle}>Order #{order.id}</h2>
                        <span className={styles.modalSubtitle}>Placed on {new Date(order.date).toLocaleString()}</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
                </header>

                <div className={styles.modalBody}>
                    <div className={styles.modalGrid}>
                        {/* Customer Section */}
                        <section className={styles.infoSection}>
                            <h3 className={styles.sectionTitle}><UserIcon size={18} /> Customer Information</h3>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoField}>
                                    <label>Name</label>
                                    <input value={order.customer.name} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, name: e.target.value } })} className={styles.input} />
                                </div>
                                <div className={styles.infoField}>
                                    <label><Phone size={14} /> Phone</label>
                                    <input value={order.customer.phone} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, phone: e.target.value } })} className={styles.input} />
                                </div>
                                <div className={styles.infoField} style={{ gridColumn: 'span 2' }}>
                                    <label><MapPin size={14} /> Address</label>
                                    <textarea value={order.customer.address} onChange={(e) => setOrder({ ...order, customer: { ...order.customer, address: e.target.value } })} className={styles.textarea} rows={2} />
                                </div>
                            </div>
                        </section>

                        {/* Call Center Section */}
                        <section className={styles.infoSection}>
                            <h3 className={styles.sectionTitle}><Phone size={18} /> Call Management</h3>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoField}>
                                    <label>Order Status</label>
                                    <select value={order.status} onChange={(e) => updateStatus(e.target.value as Order['status'])} className={styles.input}>
                                        <option value="pending">Pending (Orange)</option>
                                        <option value="sales_order">Sales Order (Green)</option>
                                        <option value="canceled">Canceled (Red)</option>
                                        <option value="no_reply">No Reply (Purple)</option>
                                    </select>
                                </div>
                                <div className={styles.infoField}>
                                    <label>Call Result</label>
                                    <select value={order.callResult || ''} onChange={(e) => updateCallResult(e.target.value as Order['callResult'])} className={styles.input}>
                                        <option value="">Select Result</option>
                                        <option value="Ligne Occupe">Ligne Occupé</option>
                                        <option value="Appel coupe">Appel coupé</option>
                                        <option value="Pas de reponse">Pas de réponse</option>
                                        <option value="Rappel demande">Rappel demandé</option>
                                        <option value="Boite vocal">Boite vocal</option>
                                    </select>
                                </div>

                                {order.status === 'canceled' && (
                                    <>
                                        <div className={styles.infoField} style={{ gridColumn: 'span 2' }}>
                                            <label>Cancellation Reason</label>
                                            <select value={order.cancellationMotif || ''} onChange={(e) => updateCancellation(e.target.value as Order['cancellationMotif'])} className={styles.input}>
                                                <option value="">Select Motif</option>
                                                <option value="Mauvais numero">Mauvais numéro</option>
                                                <option value="Appel rejete">Appel rejeté</option>
                                                <option value="commande en double">Commande en double</option>
                                                <option value="Rupture de stock">Rupture de stock</option>
                                                <option value="Pas de reponse">Pas de réponse</option>
                                                <option value="Commande frauduleuse">Commande frauduleuse</option>
                                                <option value="Annule sans reponse">Annulé sans réponse</option>
                                            </select>
                                        </div>
                                        <div className={styles.infoField} style={{ gridColumn: 'span 2' }}>
                                            <label>Cancellation Comment</label>
                                            <textarea value={order.cancellationComment || ''} onChange={(e) => setOrder({ ...order, cancellationComment: e.target.value })} className={styles.textarea} rows={2} placeholder="Add detailed comment..." />
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Items Section */}
                        <section className={`${styles.infoSection} ${styles.fullWidth}`}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}><ShoppingCart size={18} /> Order Items</h3>
                                <div className={styles.addItemPanel}>
                                    <select onChange={(e) => addItem(e.target.value)} className={styles.input} style={{ width: '200px' }} value="">
                                        <option value="">Add Product...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.title} (${p.price})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.tableWrapper}>
                                <table className={styles.managementTable}>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Price ($)</th>
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
                                                    <td className={styles.bold}>{product?.title || 'Unknown Product'}</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.price}
                                                            onChange={(e) => updateItem(item.productId, item.quantity, parseFloat(e.target.value))}
                                                            className={styles.inlineInput}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(item.productId, parseInt(e.target.value), item.price)}
                                                            className={styles.inlineInput}
                                                            style={{ width: '60px' }}
                                                        />
                                                    </td>
                                                    <td>${(item.price * item.quantity).toFixed(2)}</td>
                                                    <td>
                                                        <button onClick={() => removeItem(item.productId)} className={styles.deleteBtn}><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3} className={styles.totalLabel}>Total</td>
                                            <td colSpan={2} className={styles.totalValue}>${order.total.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>

                <footer className={styles.modalFooter}>
                    <button onClick={onClose} className="btn btn-outline">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
                        {isSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                    </button>
                </footer>
            </div>
        </div>
    );
}
