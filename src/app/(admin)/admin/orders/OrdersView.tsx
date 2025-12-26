'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Product, SalesPerson, Kit, getOrderById } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Eye, Clock, CheckCircle2, Phone, Calendar, DollarSign, Ban, MessageSquare, Plus, Truck, RefreshCw, Trash2, Edit, Printer } from 'lucide-react';
import { requestPickupAction, refreshShipmentStatusAction, updateOrderAction } from '@/app/actions';
import styles from '../Admin.module.css';
import OrderDialog from '@/components/OrderDialog';
import NewOrderDialog from '@/components/NewOrderDialog';
import ImportOrdersDialog from '@/components/ImportOrdersDialog';
import { formatCurrency } from '@/lib/format';


interface OrdersViewProps {
    initialOrders: Order[];
    products: Product[];
    salesPeople: SalesPerson[];
    isWooCommerceConnected?: boolean;
    kits?: Kit[];
}

export default function OrdersView({ initialOrders, products, salesPeople, isWooCommerceConnected, kits }: OrdersViewProps) {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'sales_order' | 'no_reply' | 'canceled'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
    const [isRequestingPickup, setIsRequestingPickup] = useState(false);
    const [isSyncingShipping, setIsSyncingShipping] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [printFrameUrl, setPrintFrameUrl] = useState<string | null>(null);

    // Sync initialOrders prop to state if it changes (revalidation etc)
    useEffect(() => {
        setOrders(initialOrders);
    }, [initialOrders]);

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('orders-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'Order'
                },
                async (payload) => {
                    console.log('Realtime change received:', payload);

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        // Fetch full order details (including items which might be inserted shortly after)
                        // We wait a brief moment for items to be inserted if it's a new order
                        if (payload.eventType === 'INSERT') {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }

                        const newOrder = await getOrderById(payload.new.id);
                        if (newOrder) {
                            setOrders(prev => {
                                const exists = prev.find(o => o.id === newOrder.id);
                                if (exists) {
                                    // Update existing
                                    return prev.map(o => o.id === newOrder.id ? newOrder : o);
                                } else {
                                    // Add new (prepend)
                                    return [newOrder, ...prev];
                                }
                            });
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Removed old handleImportWoocommerce logic as it's now in the dialog

    // Handle direct invoice printing
    const handlePrintInvoice = async (order: Order) => {
        if (order.status !== 'sales_order' || !order.salesPerson) return;

        const now = new Date().toISOString();
        const updatedOrder = {
            ...order,
            invoiceDownloaded: true,
            invoiceDate: order.invoiceDate || now,
        };

        // Update local state immediately for instant UI feedback
        setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));

        try {
            await updateOrderAction(updatedOrder);
            // Don't call router.refresh() - let the realtime subscription handle the update
            // to avoid race condition where refresh pulls old data before DB update completes
        } catch (err) {
            console.error('Failed to auto-save invoice status', err);
            // Revert on error
            setOrders(prev => prev.map(o => o.id === order.id ? order : o));
        }

        // Trigger print via hidden iframe
        setPrintFrameUrl(`/print/invoice/${order.id}?t=${Date.now()}`);
    };

    // Helper function to get filtered count for a specific status
    const getFilteredCount = (statusFilter: 'all' | 'pending' | 'sales_order' | 'no_reply' | 'canceled') => {
        return orders.filter(o => {
            // Status filter
            if (statusFilter !== 'all' && o.status !== statusFilter) return false;

            // Search query filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchesId = o.id.toLowerCase().includes(q);
                const matchesName = o.customer.name.toLowerCase().includes(q);
                const matchesPhone = o.customer.phone.toLowerCase().includes(q);
                if (!matchesId && !matchesName && !matchesPhone) return false;
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
        }).length;
    };

    const filteredOrders = orders.filter(o => {
        // Status filter
        if (filter !== 'all' && o.status !== filter) return false;

        // Search query filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesId = o.id.toLowerCase().includes(q);
            const matchesName = o.customer.name.toLowerCase().includes(q);
            const matchesPhone = o.customer.phone.toLowerCase().includes(q);
            if (!matchesId && !matchesName && !matchesPhone) return false;
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className={styles.sectionTitle}>Call Center Dashboard</h2>
                        <div className={styles.statTrend}>{filteredOrders.length} {filter.replace('_', ' ')} orders</div>
                    </div>


                    {isWooCommerceConnected && (
                        <button
                            onClick={() => setIsImporting(true)}
                            className={styles.wooImportBtn}
                        >
                            Import from WooCommerce
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    {(['pending', 'sales_order', 'no_reply', 'canceled', 'all'] as const).map(f => {
                        const count = getFilteredCount(f);

                        return (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <span>{f.replace('_', ' ').toUpperCase()}</span>
                                <span style={{
                                    background: filter === f ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.08)',
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    minWidth: '1.5rem',
                                    textAlign: 'center'
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ADVANCED FILTER BAR */}
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
                            placeholder="Search by ID, Name or Phone..."
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
                            <MessageSquare size={16} />
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
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Call Result</th>
                            {filter === 'no_reply' && <th>Call Activity</th>}
                            {filter === 'sales_order' && <th>Invoice</th>}
                            <th>{(filter === 'canceled' || filter === 'sales_order') ? 'View' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td className={styles.bold}>#{order.id}</td>
                                <td>
                                    <div className={styles.resultBadge}><Calendar size={12} /> {new Date(order.date).toLocaleDateString()}</div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{order.customer.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        <Phone size={10} style={{ display: 'inline', marginRight: '2px' }} />
                                        {(() => {
                                            const p = order.customer.phone;
                                            if (!p) return 'No phone';
                                            let displayPhone = p.replace(/\s/g, '');
                                            if (displayPhone.startsWith('+212')) {
                                                displayPhone = '0' + displayPhone.substring(4);
                                            } else if (displayPhone.length === 9 && ['5', '6', '7'].includes(displayPhone[0])) {
                                                displayPhone = '0' + displayPhone;
                                            }
                                            return displayPhone;
                                        })()}
                                    </div>
                                </td>
                                <td className={styles.bold}>{formatCurrency(order.total)}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${styles[order.status]}`}>
                                        {order.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    {order.callResult ? (
                                        <div className="flex flex-col gap-1">
                                            <span className={styles.resultBadge}>{order.callResult}</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-muted text-xs italic">Not called</span>
                                        </div>
                                    )}
                                </td>
                                {filter === 'no_reply' && (
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {[1, 2, 3].map(day => {
                                                const attempts = (order.callHistory || {})[day] || 0;
                                                if (attempts === 0) return null;
                                                return (
                                                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', minWidth: '35px' }}>DAY {day}</span>
                                                        <div style={{ display: 'flex', gap: '3px' }}>
                                                            {[1, 2, 3, 4, 5].map(attempt => {
                                                                const isActive = attempt <= attempts;
                                                                return (
                                                                    <div
                                                                        key={attempt}
                                                                        style={{
                                                                            width: '10px',
                                                                            height: '10px',
                                                                            borderRadius: '50%',
                                                                            background: isActive ? '#10b981' : '#f1f5f9',
                                                                            border: isActive ? 'none' : '1px solid #e2e8f0',
                                                                            boxShadow: isActive ? '0 0 6px rgba(16, 185, 129, 0.5)' : 'none'
                                                                        }}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {!order.callHistory || Object.keys(order.callHistory).length === 0 && (
                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>No calls logged</span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {filter === 'sales_order' && (
                                    <td>
                                        <button
                                            onClick={() => handlePrintInvoice(order)}
                                            disabled={!order.salesPerson}
                                            className={styles.eyeBtn}
                                            title={order.invoiceDownloaded ? 'Print Invoice (Already Printed)' : 'Print Invoice'}
                                            style={{
                                                background: order.invoiceDownloaded
                                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                    : '#ffffff',
                                                border: order.invoiceDownloaded ? 'none' : '2px solid #e2e8f0',
                                                color: order.invoiceDownloaded ? '#ffffff' : '#64748b',
                                                opacity: !order.salesPerson ? 0.5 : 1,
                                                cursor: !order.salesPerson ? 'not-allowed' : 'pointer',
                                                boxShadow: order.invoiceDownloaded
                                                    ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                                                    : '0 2px 8px rgba(0, 0, 0, 0.05)',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <Printer size={20} />
                                        </button>
                                    </td>
                                )}
                                <td className="flex gap-2 items-center">
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className={styles.eyeBtn}
                                        title={(filter === 'canceled' || filter === 'sales_order') ? 'View Order (Read-Only)' : 'View Details'}
                                    >
                                        <Eye size={20} />
                                    </button>

                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {
                selectedOrder && (
                    <OrderDialog
                        order={selectedOrder}
                        products={products}
                        salesPeople={salesPeople}
                        onClose={() => setSelectedOrder(null)}
                        kits={kits}
                        readOnly={selectedOrder.status === 'canceled' || selectedOrder.status === 'sales_order'}
                    />
                )
            }
            {
                showNewOrderDialog && (
                    <NewOrderDialog
                        products={products}
                        salesPeople={salesPeople}
                        onClose={() => setShowNewOrderDialog(false)}
                        kits={kits}
                    />
                )
            }

            {/* IMPORT DIALOG */}
            {
                isImporting && (
                    <ImportOrdersDialog
                        onClose={() => setIsImporting(false)}
                        onSuccess={() => {
                            // The dialog closes itself or provides a way to close & refresh.
                            // If we want to keep dialog open to show success result, handle that in dialog.
                            // Here we just toggle visibility.
                        }}
                    />
                )
            }

            {/* FLOATING ACTION BUTTON */}
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
                onClick={() => setShowNewOrderDialog(true)}
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

            {/* Hidden iframe for invoice printing */}
            {printFrameUrl && (
                <iframe
                    src={printFrameUrl}
                    style={{ display: 'none' }}
                    onLoad={() => {
                        // Clear the URL after the iframe has loaded to allow re-triggering
                        setTimeout(() => setPrintFrameUrl(null), 1000);
                    }}
                />
            )}
        </div>
    );
}
