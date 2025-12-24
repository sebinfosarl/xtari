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
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'in_progress' | 'received' | 'canceled'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredPOs = purchaseOrders.filter(po => {
        const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
        const supplier = suppliers.find(s => s.id === po.supplierId);
        const matchesSearch = po.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (supplier?.name.toLowerCase().includes(searchQuery.toLowerCase()));

        // Date range filter
        let matchesDate = true;
        if (startDate || endDate) {
            const poDate = new Date(po.date).setHours(0, 0, 0, 0);
            if (startDate) {
                const start = new Date(startDate).setHours(0, 0, 0, 0);
                if (poDate < start) matchesDate = false;
            }
            if (endDate && matchesDate) {
                const end = new Date(endDate).setHours(23, 59, 59, 999);
                if (poDate > end) matchesDate = false;
            }
        }

        return matchesStatus && matchesSearch && matchesDate;
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
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
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

                    <div className="flex items-center gap-2">
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>From:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                padding: '0.6rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>To:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{
                                padding: '0.6rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    <div className="flex gap-2">
                        {(['all', 'draft', 'in_progress', 'received', 'canceled'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                                style={{ textTransform: 'capitalize' }}
                            >
                                {status.replace('_', ' ')}
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
                                            {po.status.replace('_', ' ').toUpperCase()}
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

            {/* Floating Action Button for New PO */}

            {/* Floating Action Button for New PO */}
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
                onClick={() => setShowNewPODialog(true)}
                title="Create New Order"
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: 'white',
                    border: 'none',
                    // boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.5), 0 8px 10px -6px rgba(37, 99, 235, 0.1)', // Replaced by animation
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    transition: 'transform 0.3s ease',
                    animation: 'pulse-blue 2s infinite'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <Plus size={28} strokeWidth={2.5} />
            </button>
        </div>
    );
}
