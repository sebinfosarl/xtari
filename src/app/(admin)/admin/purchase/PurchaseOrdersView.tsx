'use client';

import { useState } from 'react';
import { PurchaseOrder, Product, Supplier } from '@/lib/db';
import { Eye, Plus, Search, Calendar, ShoppingBag, Filter, Truck } from 'lucide-react';
import styles from '../Admin.module.css';
import NewPurchaseOrderDialog from '@/components/NewPurchaseOrderDialog';
import PurchaseOrderDialog from '@/components/PurchaseOrderDialog';

interface PurchaseOrdersViewProps {
    initialPurchaseOrders: PurchaseOrder[];
    products: Product[];
    suppliers: Supplier[];
}

export default function PurchaseOrdersView({ initialPurchaseOrders: purchaseOrders, products, suppliers }: PurchaseOrdersViewProps) {
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [showNewPODialog, setShowNewPODialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'received' | 'canceled'>('all');

    const filteredPOs = purchaseOrders.filter(po => {
        const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
        const supplier = suppliers.find(s => s.id === po.supplierId);
        const matchesSearch = po.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (supplier?.name.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesStatus && matchesSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return '#94a3b8';
            case 'sent': return '#3b82f6';
            case 'received': return '#10b981';
            case 'canceled': return '#ef4444';
            default: return '#64748b';
        }
    };

    return (
        <div className={styles.tableSection}>
            <div className={styles.sectionHeader} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className={styles.sectionTitle}>Purchase Orders</h2>
                        <div className={styles.statTrend}>{filteredPOs.length} purchase orders found</div>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowNewPODialog(true)}
                    >
                        <Plus size={18} /> New Purchase Order
                    </button>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '1rem',
                    background: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    alignItems: 'center'
                }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search by PO ID or Supplier..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.9rem',
                                background: 'white'
                            }}
                        />
                        <div style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                            <Search size={16} />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {(['all', 'draft', 'sent', 'received', 'canceled'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                                style={{ textTransform: 'capitalize' }}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>PO ID</th>
                            <th>Date</th>
                            <th>Supplier</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Manage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPOs.length > 0 ? filteredPOs.map(po => {
                            const supplier = suppliers.find(s => s.id === po.supplierId);
                            return (
                                <tr key={po.id}>
                                    <td className={styles.bold}>#{po.id}</td>
                                    <td>
                                        <div className={styles.resultBadge}><Calendar size={12} /> {new Date(po.date).toLocaleDateString()}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{supplier?.name || 'Unknown Supplier'}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{supplier?.contactPerson}</div>
                                    </td>
                                    <td>{po.items?.length || 0} products</td>
                                    <td className={styles.bold}>${(po.total || 0).toFixed(2)}</td>
                                    <td>
                                        <span
                                            className={styles.statusBadge}
                                            style={{ backgroundColor: `${getStatusColor(po.status)}20`, color: getStatusColor(po.status), border: `1px solid ${getStatusColor(po.status)}40` }}
                                        >
                                            {po.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => setSelectedPO(po)}
                                            className={styles.eyeBtn}
                                            title="View Details"
                                        >
                                            <Eye size={20} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-slate-400 italic">
                                    No purchase orders found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedPO && (
                <PurchaseOrderDialog
                    po={selectedPO}
                    products={products}
                    suppliers={suppliers}
                    onClose={() => setSelectedPO(null)}
                />
            )}

            {showNewPODialog && (
                <NewPurchaseOrderDialog
                    products={products}
                    suppliers={suppliers}
                    onClose={() => setShowNewPODialog(false)}
                />
            )}
        </div>
    );
}
