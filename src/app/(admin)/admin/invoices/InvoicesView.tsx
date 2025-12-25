
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Order, Product, SalesPerson } from '@/lib/db';
import { Eye, FileText, Search, Calendar, Briefcase, Phone, User as UserIcon } from 'lucide-react';
import styles from '../Admin.module.css';
import OrderDialog from '@/components/OrderDialog';

interface InvoicesViewProps {
    initialOrders: Order[];
    products: Product[];
    salesPeople: SalesPerson[];
}

export default function InvoicesView({ initialOrders: orders, products, salesPeople }: InvoicesViewProps) {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('q') || '';

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) setSearchQuery(q);
    }, [searchParams]);

    // Only show orders where invoices were downloaded AND status is still sales_order
    const invoicedOrders = orders.filter(o => o.invoiceDownloaded && o.status === 'sales_order');

    const filteredInvoices = invoicedOrders.filter(o => {
        // Search query filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesId = o.id.toLowerCase().includes(q);
            const matchesName = o.customer.name.toLowerCase().includes(q);
            const matchesPhone = o.customer.phone.toLowerCase().includes(q);
            const matchesCompany = (o.companyName || '').toLowerCase().includes(q);
            if (!matchesId && !matchesName && !matchesPhone && !matchesCompany) return false;
        }

        // Date range filter
        if (startDate || endDate) {
            const orderDate = new Date(o.date).setHours(0, 0, 0, 0);
            if (startDate) {
                const start = new Date(startDate).setHours(0, 0, 0, 0);
                if (orderDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate).setHours(23, 59, 59, 999);
                if (orderDate > end) return false;
            }
        }

        return true;
    });

    return (
        <div className={styles.tableSection}>
            <div className={styles.sectionHeader} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className={styles.sectionTitle}>Invoice Ledger</h2>
                        <div className={styles.statTrend}>{filteredInvoices.length} finalized invoices found</div>
                    </div>
                </div>

                {/* SEARCH & AUDIT BAR */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
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
                            placeholder="Search by ID, Company or Customer..."
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
                            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>To:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Invoice ID</th>
                            <th>Issue Date</th>
                            <th>Recipient Type</th>
                            <th>Name / Company</th>
                            <th>Total</th>
                            <th>Print Status</th>
                            <th>View</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInvoices.map(order => {
                            const isBusiness = !!order.companyName;
                            const displayDate = order.invoiceDate || order.date;
                            return (
                                <tr key={order.id}>
                                    <td className={styles.bold}>#{order.id}</td>
                                    <td>
                                        <div className={styles.resultBadge}><Calendar size={12} /> {new Date(displayDate).toLocaleDateString()}</div>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 'full',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            background: isBusiness ? 'rgba(59, 130, 246, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                            color: isBusiness ? '#2563eb' : '#64748b',
                                            border: isBusiness ? '1px solid #2563eb' : '1px solid #94a3b8',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            {isBusiness ? <Briefcase size={10} /> : <UserIcon size={10} />}
                                            {isBusiness ? 'BUSINESS' : 'PERSONAL'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{isBusiness ? order.companyName : order.customer.name}</div>
                                        {isBusiness && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ICE: {order.ice}</div>}
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}><Phone size={10} style={{ display: 'inline', marginRight: '2px' }} /> {order.customer.phone}</div>
                                    </td>
                                    <td className={styles.bold}>${order.total.toFixed(2)}</td>
                                    <td>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 italic">
                                            DOCUMENT ISSUED
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className={styles.eyeBtn}
                                                title="View / Reprint"
                                            >
                                                <Eye size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredInvoices.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 border-t border-slate-100">
                        <FileText size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                        <h3 className="text-slate-900 font-bold">No Invoices Found</h3>
                        <p className="text-slate-500 text-sm">Download an invoice from the Orders dashboard to see it here.</p>
                    </div>
                )}
            </div>

            {selectedOrder && (
                <OrderDialog
                    order={selectedOrder}
                    products={products}
                    salesPeople={salesPeople}
                    onClose={() => setSelectedOrder(null)}
                    readOnly={true}
                />
            )}
        </div>
    );
}
