'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PurchaseOrder, Product, Supplier } from '@/lib/db';
import { savePurchaseOrderAction, deletePurchaseOrderAction } from '@/app/actions';
import { X, Calendar, ShoppingBag, User, CheckCircle2, AlertCircle, Trash2, Printer, Save } from 'lucide-react';
import styles from '../app/(admin)/admin/Admin.module.css';

interface PurchaseOrderDialogProps {
    po: PurchaseOrder;
    products: Product[];
    suppliers: Supplier[];
    onClose: () => void;
}

export default function PurchaseOrderDialog({ po, products, suppliers, onClose }: PurchaseOrderDialogProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [status, setStatus] = useState(po.status);
    const [notes, setNotes] = useState(po.notes || '');

    const supplier = suppliers.find(s => s.id === po.supplierId);

    const handleUpdate = async () => {
        setIsSaving(true);
        try {
            await savePurchaseOrderAction({
                ...po,
                status,
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
            default: return <ShoppingBag size={20} className="text-blue-500" />;
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
                        <span className={styles.modalSubtitle}>Placed on {new Date(po.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => window.print()} className="btn btn-sm btn-outline"><Printer size={16} /> Print</button>
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

                        {/* STATUS AND NOTES */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Order Status</h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {(['draft', 'sent', 'received', 'canceled'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatus(s)}
                                        className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline'}`}
                                        style={{ textTransform: 'capitalize' }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Internal Notes</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className={styles.inlineInput}
                                style={{ height: '60px', marginTop: '4px' }}
                                placeholder="Add notes here..."
                            />
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
                                            <td>${item.buyPrice.toFixed(2)}</td>
                                            <td>{item.quantity}</td>
                                            <td className="text-right font-bold">${(item.buyPrice * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} className="text-right p-4 font-bold text-slate-500">Total Purchase Amount</td>
                                    <td className="text-right p-4 font-extrabold text-blue-600 text-xl">${(po.total || 0).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <footer className={styles.modalFooter}>
                    <button
                        onClick={handleDelete}
                        className="btn btn-outline text-red-500 hover:bg-red-50"
                        disabled={isDeleting}
                    >
                        <Trash2 size={18} /> {isDeleting ? 'Deleting...' : 'Delete PO'}
                    </button>
                    <div className="flex gap-2 ml-auto">
                        <button onClick={onClose} className="btn btn-outline">Close</button>
                        <button
                            onClick={handleUpdate}
                            className="btn btn-primary"
                            disabled={isSaving}
                        >
                            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
