'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PurchaseOrder, Product, Supplier } from '@/lib/db';
import { savePurchaseOrderAction, deletePurchaseOrderAction } from '@/app/actions';
import { X, Calendar, ShoppingBag, User, CheckCircle2, AlertCircle, Trash2, Printer, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import styles from '../app/(admin)/admin/Admin.module.css';

interface PurchaseOrderDialogProps {
    po: PurchaseOrder;
    products: Product[];
    suppliers: Supplier[];
    onClose: () => void;
    context?: 'purchase' | 'fulfillment';
}

export default function PurchaseOrderDialog({ po, products, suppliers, onClose, context = 'purchase' }: PurchaseOrderDialogProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [status, setStatus] = useState(po.status);
    const [notes, setNotes] = useState(po.notes || '');

    const supplier = (suppliers || []).find(s => s.id === po.supplierId);

    const isLocked = po.status !== 'draft';

    const handleUpdate = async (newStatus?: PurchaseOrder['status']) => {
        setIsSaving(true);
        try {
            await savePurchaseOrderAction({
                ...po,
                status: newStatus || status,
                notes
            });
            router.refresh();
            onClose();
        } catch (err) {
            alert('Failed to update purchase order');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel this order? This cannot be undone.')) return;

        setIsDeleting(true);
        try {
            await savePurchaseOrderAction({
                ...po,
                status: 'canceled'
            });
            router.refresh();
            onClose();
        } catch (err) {
            alert('Failed to delete purchase order');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this purchase order?')) return;
        setIsDeleting(true);
        try {
            await deletePurchaseOrderAction(po.id);
            router.refresh();
            onClose();
        } catch (err) {
            alert('Failed to delete purchase order');
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusIcon = (s: string) => {
        switch (s) {
            case 'received': return <CheckCircle2 size={20} className="text-emerald-500" />;
            case 'canceled': return <AlertCircle size={20} className="text-red-500" />;
            case 'in_progress': return <ShoppingBag size={20} className="text-blue-500" />;
            default: return <ShoppingBag size={20} className="text-slate-400" />;
        }
    };

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1500 }}>
            <div className={styles.orderModal} style={{ maxWidth: '800px' }}>
                <header className={styles.modalHeader}>
                    <div className={styles.headerInfo}>
                        <div className="flex items-center gap-2">
                            {getStatusIcon(status)}
                            <h2 className={styles.modalTitle}>Purchase Order #{po.id}</h2>
                        </div>
                        <span className={styles.modalSubtitle}>Placed on {po.date ? new Date(po.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown Date'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
                    </div>
                </header>

                <div className={styles.modalBody}>
                    <div className="grid grid-cols-2 gap-8">
                        {/* SUPPLIER INFO */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <User size={14} /> Supplier
                            </h3>
                            <div className="font-extrabold text-lg text-slate-800">{supplier?.name || 'Unknown'}</div>
                            <div className="text-slate-600 space-y-1 mt-2">
                                <p>{supplier?.contactPerson}</p>
                                <p>{supplier?.email}</p>
                                <p>{supplier?.phone}</p>
                                <p className="text-xs italic">{supplier?.address}</p>
                            </div>
                        </div>


                    </div>

                    {/* ITEMS TABLE */}
                    <div className="mt-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <ShoppingBag size={14} /> Order Items
                        </h3>
                        <table className={styles.managementTable}>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Buy Price</th>
                                    <th>Quantity</th>
                                    <th className="text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {po.items?.map(item => {
                                    const product = products.find(p => p.id === item.productId);
                                    return (
                                        <tr key={item.productId}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    {product?.image && <img src={product.image} className={styles.imageCell} alt="" />}
                                                    <div className="font-bold">{product?.title || 'Unknown Product'}</div>
                                                </div>
                                            </td>
                                            <td>{formatCurrency(item.buyPrice)}</td>
                                            <td>{item.quantity}</td>
                                            <td className="text-right font-bold">{formatCurrency(item.buyPrice * item.quantity)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} className="text-right p-4 font-bold text-slate-500">Total Purchase Amount</td>
                                    <td className="text-right p-4 font-extrabold text-blue-600 text-xl">{formatCurrency(po.total || 0)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <footer className={styles.modalFooter} style={{ justifyContent: 'space-between' }}>
                    {/* LEFT SIDE: CANCEL BUTTON (Always bottom left) */}
                    <div>
                        {/* Only show Cancel button if NOT canceled and NOT received */}
                        {status !== 'canceled' && status !== 'received' && (
                            <button
                                onClick={handleCancel}
                                className="btn btn-outline text-red-500 hover:bg-red-50"
                                disabled={isDeleting}
                            >
                                <Trash2 size={18} /> {isDeleting ? 'Canceling...' : (context === 'fulfillment' ? 'Cancel Shipment' : 'Cancel Order')}
                            </button>
                        )}
                        {/* Hidden Delete Button */}
                        <button
                            onClick={handleDelete}
                            className="btn btn-outline text-red-500 hover:bg-red-50"
                            disabled={isDeleting}
                            style={{ display: 'none' }}
                        >
                            <Trash2 size={18} /> Delete PO
                        </button>
                    </div>

                    {/* RIGHT SIDE: ACTIONS */}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="btn btn-outline">Close</button>

                        {po.status === 'draft' && (
                            <>
                                {/* Hide Save Changes in Draft mode as requested?
                                    Wait, "when status is Draft order... Remove order status and internal note and 'Save changes' button"
                                    So in Draft, we hide Save Changes. But we KEEP Confirm Order.
                                */}
                                <button
                                    onClick={() => handleUpdate('in_progress')}
                                    className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                                    disabled={isSaving}
                                >
                                    <CheckCircle2 size={18} /> {isSaving ? 'Confirming...' : 'Confirm Order'}
                                </button>
                            </>
                        )}

                        {/* Save Changes: Hidden in Draft (as per request), Hidden if Locked (standard logic) 
                            "when status is Draft order... Remove ... 'Save changes' button"
                            "when order is IN_Progress ... remove ... internal notes and status"
                            It seems 'Save Changes' essentially saves notes/status. If those are gone, Save Changes is useless.
                            So we probably hide Save Changes in almost all these refined states if there's nothing to edit.
                        */}
                        {!isLocked && status !== 'draft' && (
                            <button
                                onClick={() => handleUpdate()}
                                className="btn btn-primary"
                                disabled={isSaving}
                            >
                                <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}

                        {/* "when order is IN_Progress ... remove the Mark as received button" 
                             So we HIDE this button. 
                        */}
                        {/* "Mark as Received": Hidden for PO context in 'in_progress', but REQUIRED for Fulfillment context as "Receive Shipment" */}
                        {status === 'in_progress' && context === 'fulfillment' && (
                            <button
                                onClick={() => handleUpdate('received')}
                                className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                                disabled={isSaving}
                            >
                                <CheckCircle2 size={18} /> {isSaving ? 'Receiving...' : 'Receive Shipment'}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
}
