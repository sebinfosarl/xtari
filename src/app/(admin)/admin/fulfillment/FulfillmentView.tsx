'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Product, SalesPerson, PurchaseOrder, Supplier, Kit, getOrderById } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Eye, Truck, Calendar, Phone, Search, MapPin, Package, CheckCircle, Circle, X, ClipboardList, Printer, CheckCircle2, Receipt, ArrowDownToLine, XCircle, RotateCcw } from 'lucide-react';
import sc from './SegmentedControl.module.css';
import { createShipmentAction, updateOrderAction, bulkMarkDeliveryNotePrintedAction, requestPickupAction } from '@/app/actions';
import styles from '../Admin.module.css';
import DeliveryDialog from '@/components/DeliveryDialog';
import PickingLabel from '@/components/PickingLabel';
import PurchaseOrderDialog from '@/components/PurchaseOrderDialog';
import PdfDropzone from '@/components/PdfDropzone';

interface FulfillmentViewProps {
    initialOrders: Order[];
    products: Product[];
    salesPeople: SalesPerson[];
    purchaseOrders: PurchaseOrder[];
    suppliers: Supplier[];
    pickupLocationsRaw: string;
    kits: Kit[];
}

export default function FulfillmentView({ initialOrders, products, salesPeople, purchaseOrders, suppliers, pickupLocationsRaw, kits }: FulfillmentViewProps) {
    const router = useRouter();
    // ... existing state ...
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [activeTab, setActiveTab] = useState<'pick' | 'deliveries' | 'receipts' | 'returns'>('pick');
    const [receiptFilter, setReceiptFilter] = useState<'pending' | 'done' | 'canceled'>('pending');
    const [pickFilter, setPickFilter] = useState<'pending' | 'printed'>('pending');
    const [deliveryFilter, setDeliveryFilter] = useState<'awaiting_export' | 'awaiting_pickup' | 'picked_up' | 'done'>('awaiting_export');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [isShippingBulk, setIsShippingBulk] = useState(false);

    const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
    const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);

    // Sync initialOrders prop to state if it changes (revalidation etc)
    useEffect(() => {
        setOrders(initialOrders);
    }, [initialOrders]);

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('fulfillment-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'Order'
                },
                async (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        // Fetch full order details
                        if (payload.eventType === 'INSERT') {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }

                        const newOrder = await getOrderById(payload.new.id);
                        if (newOrder) {
                            setOrders(prev => {
                                const exists = prev.find(o => o.id === newOrder.id);
                                if (exists) {
                                    return prev.map(o => o.id === newOrder.id ? newOrder : o);
                                } else {
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

    // Parse pickup locations
    const pickupLocations = pickupLocationsRaw.split('\n')
        .map(line => {
            const parts = line.split(/[-:]/);
            const id = parts[parts.length - 1]?.trim();
            const label = parts.slice(0, parts.length - 1).join('-').trim();
            // Try to handle user's specific format "Rabat-AAKKARI-6322" where 6322 is potentially the ID?
            // If the user inputs "Label - ID", the above logic works.
            // If user inputs "Rabat-AAKKARI-6322", last part is 6322.

            if (id && label) {
                return { id: parseInt(id), label };
            }
            // Add default fallback if string is valid but simpler?
            return null;
        })
        .filter(x => x !== null && !isNaN(x.id)) as { id: number; label: string }[];

    // Fallback defaults if no locations defined
    const effectivePickupLocations = pickupLocations.length > 0 ? pickupLocations : [
        { id: 26301, label: 'Rabat (Default)' },
        { id: 36407, label: 'Tanger (Default)' },
        { id: 0, label: 'Bureau (Default)' } // ID 0 is placebo/example
    ];

    // ... rest of the file ...
    // ... inside the return statement ...
    // ... inside the sticky bar -> request pickup button logic ...

    // Scroll down to find lines ~810 where the modal is rendered or the button is clicked. 
    // Wait, the modal is rendered at the bottom of the file (I need to view it or just append it).
    // The previous view_file showed up to line 800. I need to see the modal code to replace it.
    // I will execute a view_file for the bottom of FulfillmentView.tsx first.


    // ... handlePickupRequest ...

    // Sync selectedOrder with updated orders prop
    useEffect(() => {
        if (selectedOrder) {
            const fresh = orders.find(o => o.id === selectedOrder.id);
            if (fresh && fresh !== selectedOrder) {
                setSelectedOrder(fresh);
            }
        }
    }, [orders, selectedOrder]);

    // Filters
    const pickOrders = orders.filter(o => o.status === 'sales_order' && (!o.fulfillmentStatus || o.fulfillmentStatus === 'to_pick'));
    const deliveryOrders = orders.filter(o => o.status === 'sales_order' && o.fulfillmentStatus === 'picked');
    const returnedOrders = orders.filter(o => o.fulfillmentStatus === 'returned');
    const receiptOrders = purchaseOrders.filter(p => p.status === 'in_progress');
    const doneOrders = purchaseOrders.filter(p => p.status === 'received');
    const canceledOrders = purchaseOrders.filter(p => p.status === 'canceled');

    const currentOrders = activeTab === 'pick'
        ? pickOrders.filter(o => pickFilter === 'pending' ? !o.deliveryNotePrinted : o.deliveryNotePrinted)
        : (activeTab === 'deliveries' ? deliveryOrders.filter(o => {
            if (deliveryFilter === 'awaiting_export') return !o.shippingId;
            if (deliveryFilter === 'awaiting_pickup') {
                // Has ID and status is NOT one of the 'picked up' indicators
                // We now also exclude 'Pickup:' statuses as the user treats "Pickup Requested" as "Picked Up" (workflow done)
                return !!o.shippingId &&
                    !o.shippingStatus?.toLowerCase().includes('livr') &&
                    !o.shippingStatus?.toLowerCase().includes('expédi') &&
                    !o.shippingStatus?.includes('Pickup:');
            }
            if (deliveryFilter === 'picked_up') {
                return !!o.shippingId && (
                    (o.shippingStatus?.toLowerCase().includes('expédi') ||
                        o.shippingStatus?.toLowerCase().includes('pickup done') ||
                        o.shippingStatus?.includes('Pickup:')) &&
                    !o.shippingStatus?.toLowerCase().includes('livr')
                );
            }
            if (deliveryFilter === 'done') {
                return !!o.shippingId && (
                    o.shippingStatus?.toLowerCase().includes('livr')
                );
            }
            return true;
        }) : (activeTab === 'returns' ? returnedOrders : []));

    // Determine which set of purchase orders to show based on tab and sub-filter
    const currentPurchaseOrders = activeTab === 'receipts' ? (
        receiptFilter === 'pending' ? receiptOrders :
            receiptFilter === 'done' ? doneOrders :
                receiptFilter === 'canceled' ? canceledOrders : []
    ) : [];

    // Receipt/PO filtering
    const filteredReceipts = currentPurchaseOrders.filter(p => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const supplierName = suppliers.find(s => s.id === p.supplierId)?.name.toLowerCase() || '';
            const matchesId = p.id.toLowerCase().includes(q);
            const matchesSupplier = supplierName.includes(q);
            if (!matchesId && !matchesSupplier) return false;
        }
        return true;
    });

    const filteredOrders = currentOrders.filter(o => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesId = o.id.toLowerCase().includes(q);
            const matchesName = o.customer.name.toLowerCase().includes(q);
            const matchesPhone = o.customer.phone.toLowerCase().includes(q);
            const matchesCity = o.customer.city?.toLowerCase().includes(q);
            if (!matchesId && !matchesName && !matchesPhone && !matchesCity) return false;
        }
        return true;
    });

    const handleBulkShip = async () => {
        const selectedOrdersExec = deliveryOrders.filter(o => selectedOrderIds.includes(o.id) && !o.shippingId);
        if (selectedOrdersExec.length === 0) {
            alert('No pending orders found in selection.');
            return;
        }

        if (!confirm(`Export ${selectedOrdersExec.length} selected orders to Cathedis?`)) return;

        setIsShippingBulk(true);
        let successCount = 0;
        let errors = [];

        for (const order of selectedOrdersExec) {
            try {
                const res = await createShipmentAction(order);
                if (res.success) {
                    successCount++;
                } else {
                    errors.push(`${order.id}: ${res.error}`);
                }
            } catch (err: any) {
                errors.push(`${order.id}: ${err.message}`);
            }
        }

        setIsShippingBulk(false);
        alert(`Successfully shipped ${successCount}/${selectedOrdersExec.length} orders.`);
        if (errors.length > 0) {
            console.error('Bulk shipping errors:', errors);
            alert(`Some orders failed to ship. Check console for details.`);
        }
        setSelectedOrderIds([]);
        router.refresh();
    };

    const handlePickupRequest = async (pickupPointId: number) => {
        setIsPickupModalOpen(false);

        // Filter for orders that correspond to the selection AND have a shippingId
        // We need to pass the INTERNAL Order IDs to the server action, not the shipping IDs.
        const ordersToRequest = deliveryOrders.filter(o => selectedOrderIds.includes(o.id) && o.shippingId);

        if (ordersToRequest.length === 0) {
            alert('No shipped orders found in selection.');
            return;
        }

        const orderIdsToProcess = ordersToRequest.map(o => o.id);

        setIsShippingBulk(true);
        try {
            // We pass the list of Order IDs. The server action will look up their shipping IDs.
            const res = await requestPickupAction(orderIdsToProcess, pickupPointId);

            if (res.success) {
                alert(`Pickup requested successfully for ${res.count} orders.`);
                setSelectedOrderIds([]);
                router.refresh();
            } else {
                console.error('Pickup request error:', res.error);
                alert(`Failed to request pickup: ${res.error}`);
            }
        } catch (err: any) {
            console.error('Pickup request exception:', err);
            alert(`An error occurred: ${err.message}`);
        } finally {
            setIsShippingBulk(false);
        }
    };



    const handlePrintPickingLabels = async () => {
        if (selectedOrderIds.length === 0) return;

        // Open the dedicated print route in a new tab
        const url = `/print/picking?ids=${selectedOrderIds.join(',')}`;
        window.open(url, '_blank');

        // Mark as printed in the DB
        try {
            await bulkMarkDeliveryNotePrintedAction(selectedOrderIds);
            router.refresh();
        } catch (err) {
            console.error('Failed to update print status:', err);
        }
    };

    const handleFinishPicking = async () => {
        const selected = pickOrders.filter(o => selectedOrderIds.includes(o.id));
        if (selected.length === 0) return;

        if (!confirm(`Mark ${selected.length} orders as PICKED and move to Deliveries?`)) return;

        setIsUpdatingBulk(true);
        try {
            for (const order of selected) {
                const updatedOrder = {
                    ...order,
                    fulfillmentStatus: 'picked' as const,
                    deliveryNotePrinted: false, // Reset print status for the new stage
                    logs: [
                        { type: 'fulfillment', message: 'Order marked as PICKED', timestamp: new Date().toISOString() },
                        ...(order.logs || [])
                    ]
                };
                await updateOrderAction(updatedOrder);
            }
            alert(`Successfully marked ${selected.length} orders as picked.`);
            setSelectedOrderIds([]);
            router.refresh();
        } catch (err) {
            console.error(err);
            alert('Failed to update orders');
        } finally {
            setIsUpdatingBulk(false);
        }
    };

    return (
        <div className={styles.tableSection}>
            <div className="no-print">
                <div className={styles.sectionHeader} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className={styles.sectionTitle}>Fulfillment Management</h2>
                            <div className={styles.statTrend}>
                                {activeTab === 'receipts' ? filteredReceipts.length : filteredOrders.length} orders to process
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', padding: '6px', borderRadius: '9999px', background: 'rgba(241, 245, 249, 0.8)', border: '1px solid #e2e8f0', backdropFilter: 'blur(4px)' }}>
                            <button
                                onClick={() => { setActiveTab('pick'); setSelectedOrderIds([]); }}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeTab === 'pick' ? '#2563eb' : 'transparent',
                                    color: activeTab === 'pick' ? 'white' : '#64748b',
                                    boxShadow: activeTab === 'pick' ? '0 4px 6px -1px rgba(37, 99, 235, 0.3)' : 'none',
                                    transform: activeTab === 'pick' ? 'scale(1.02)' : 'none'
                                }}
                            >
                                <ClipboardList size={18} strokeWidth={2.5} />
                                <span>Pick</span>
                                <span style={{
                                    marginLeft: '0.25rem',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.625rem',
                                    background: activeTab === 'pick' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                                    color: activeTab === 'pick' ? 'white' : '#475569'
                                }}>
                                    {pickOrders.length}
                                </span>
                            </button>
                            <button
                                onClick={() => { setActiveTab('deliveries'); setSelectedOrderIds([]); }}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeTab === 'deliveries' ? '#10b981' : 'transparent',
                                    color: activeTab === 'deliveries' ? 'white' : '#64748b',
                                    boxShadow: activeTab === 'deliveries' ? '0 4px 6px -1px rgba(16, 185, 129, 0.3)' : 'none',
                                    transform: activeTab === 'deliveries' ? 'scale(1.02)' : 'none'
                                }}
                            >
                                <Truck size={18} strokeWidth={2.5} />
                                <span>Deliveries</span>
                                <span style={{
                                    marginLeft: '0.25rem',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.625rem',
                                    background: activeTab === 'deliveries' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                                    color: activeTab === 'deliveries' ? 'white' : '#475569'
                                }}>
                                    {deliveryOrders.filter(o => !o.shippingId || (!!o.shippingId && !o.shippingStatus?.toLowerCase().includes('livr') && !o.shippingStatus?.toLowerCase().includes('expédi') && !o.shippingStatus?.includes('Pickup:'))).length}
                                </span>
                            </button>
                            <button
                                onClick={() => { setActiveTab('receipts'); setSelectedOrderIds([]); }}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeTab === 'receipts' ? '#8b5cf6' : 'transparent',
                                    color: activeTab === 'receipts' ? 'white' : '#64748b',
                                    boxShadow: activeTab === 'receipts' ? '0 4px 6px -1px rgba(139, 92, 246, 0.3)' : 'none',
                                    transform: activeTab === 'receipts' ? 'scale(1.02)' : 'none'
                                }}
                            >
                                <ArrowDownToLine size={18} strokeWidth={2.5} />
                                <span>Receipts</span>
                                <span style={{
                                    marginLeft: '0.25rem',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.625rem',
                                    background: activeTab === 'receipts' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                                    color: activeTab === 'receipts' ? 'white' : '#475569'
                                }}>
                                    {receiptOrders.filter(p => p.status === 'in_progress').length}
                                </span>
                            </button>
                            <button
                                onClick={() => { setActiveTab('returns'); setSelectedOrderIds([]); }}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeTab === 'returns' ? '#f59e0b' : 'transparent',
                                    color: activeTab === 'returns' ? 'white' : '#64748b',
                                    boxShadow: activeTab === 'returns' ? '0 4px 6px -1px rgba(245, 158, 11, 0.3)' : 'none',
                                    transform: activeTab === 'returns' ? 'scale(1.02)' : 'none'
                                }}
                            >
                                <RotateCcw size={18} strokeWidth={2.5} />
                                <span>Returns</span>
                                <span style={{
                                    marginLeft: '0.25rem',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.625rem',
                                    background: activeTab === 'returns' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                                    color: activeTab === 'returns' ? 'white' : '#475569'
                                }}>
                                    {returnedOrders.length}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1" style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search orders..."
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
                    </div>
                </div>

                {activeTab === 'pick' && (
                    <div className="flex gap-2 mb-6 px-4">
                        <div className={sc.container}>
                            {(['pending', 'printed'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => { setPickFilter(f); setSelectedOrderIds([]); }}
                                    className={`${sc.button} ${pickFilter === f ? sc.active : ''}`}
                                >
                                    {f === 'pending' && <Printer size={16} strokeWidth={2.5} className="opacity-50" />}
                                    {f === 'printed' && <CheckCircle2 size={16} strokeWidth={2.5} />}

                                    <span>{f === 'pending' ? 'To Print' : 'Printed'}</span>

                                    <span className={sc.badge}>
                                        {f === 'pending'
                                            ? pickOrders.filter(o => !o.deliveryNotePrinted).length
                                            : pickOrders.filter(o => o.deliveryNotePrinted).length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'deliveries' && (
                    <div className="flex gap-2 mb-6 px-4">
                        <div className={sc.container}>
                            <button onClick={() => { setDeliveryFilter('awaiting_export'); setSelectedOrderIds([]); }} className={`${sc.button} ${deliveryFilter === 'awaiting_export' ? sc.active : ''}`}>
                                Awaiting Export
                                <span className={sc.badge}>{deliveryOrders.filter(o => !o.shippingId).length}</span>
                            </button>
                            <button onClick={() => { setDeliveryFilter('awaiting_pickup'); setSelectedOrderIds([]); }} className={`${sc.button} ${deliveryFilter === 'awaiting_pickup' ? sc.active : ''}`}>
                                Awaiting Pickup
                                <span className={sc.badge}>{deliveryOrders.filter(o =>
                                    !!o.shippingId &&
                                    !o.shippingStatus?.toLowerCase().includes('livr') &&
                                    !o.shippingStatus?.toLowerCase().includes('expédi') &&
                                    !o.shippingStatus?.includes('Pickup:')
                                ).length}</span>
                            </button>
                            <button onClick={() => { setDeliveryFilter('picked_up'); setSelectedOrderIds([]); }} className={`${sc.button} ${deliveryFilter === 'picked_up' ? sc.active : ''}`}>
                                Picked Up
                                <span className={sc.badge}>{deliveryOrders.filter(o =>
                                    !!o.shippingId && (
                                        (o.shippingStatus?.toLowerCase().includes('expédi') ||
                                            o.shippingStatus?.toLowerCase().includes('pickup done') ||
                                            o.shippingStatus?.includes('Pickup:')) &&
                                        !o.shippingStatus?.toLowerCase().includes('livr')
                                    )
                                ).length}</span>
                            </button>
                            <button onClick={() => { setDeliveryFilter('done'); setSelectedOrderIds([]); }} className={`${sc.button} ${deliveryFilter === 'done' ? sc.active : ''}`}>
                                Done
                                <span className={sc.badge}>{deliveryOrders.filter(o =>
                                    !!o.shippingId && (
                                        o.shippingStatus?.toLowerCase().includes('livr')
                                    )
                                ).length}</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'deliveries' && deliveryFilter === 'picked_up' && (
                    <PdfDropzone orders={deliveryOrders} />
                )}

                {activeTab === 'receipts' && (
                    <div className="flex gap-2 mb-6 px-4">
                        <div className={sc.container}>
                            {(['pending', 'done', 'canceled'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setReceiptFilter(f)}
                                    className={`${sc.button} ${receiptFilter === f ? sc.active : ''}`}
                                >
                                    {f === 'pending' && <Package size={16} strokeWidth={2.5} />}
                                    {f === 'done' && <CheckCircle2 size={16} strokeWidth={2.5} />}
                                    {f === 'canceled' && <XCircle size={16} strokeWidth={2.5} />}

                                    <span>{f.charAt(0).toUpperCase() + f.slice(1)}</span>

                                    <span className={sc.badge}>
                                        {f === 'pending' ? receiptOrders.length :
                                            f === 'done' ? doneOrders.length :
                                                canceledOrders.length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        {activeTab === 'receipts' ? (
                            <>
                                <thead>
                                    <tr>
                                        <th>PO ID</th>
                                        <th>Date</th>
                                        <th>Supplier</th>
                                        <th>Items</th>
                                        <th>Total cost</th>
                                        <th>Status</th>
                                        <th>View</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReceipts.map(po => {
                                        const supplier = suppliers.find(s => s.id === po.supplierId);
                                        const totalItems = po.items.reduce((acc, i) => acc + i.quantity, 0);
                                        return (
                                            <tr key={po.id}>
                                                <td className={styles.bold}>#{po.id}</td>
                                                <td>
                                                    <div className={styles.resultBadge}><Calendar size={12} /> {new Date(po.date).toLocaleDateString()}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{supplier?.name || 'Unknown'}</div>
                                                </td>
                                                <td>
                                                    <div className="font-bold text-slate-600">{totalItems} units</div>
                                                    <div className="text-xs text-slate-400">{po.items.length} SKUs</div>
                                                </td>
                                                <td className="font-bold text-slate-700">
                                                    ${po.total.toFixed(2)}
                                                </td>
                                                <td>
                                                    {receiptFilter === 'pending' && (
                                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase">
                                                            Awaiting Receipt
                                                        </span>
                                                    )}
                                                    {receiptFilter === 'done' && (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase">
                                                            Received
                                                        </span>
                                                    )}
                                                    {receiptFilter === 'canceled' && (
                                                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 uppercase">
                                                            Canceled
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => setSelectedPO(po)}
                                                        className={styles.eyeBtn}
                                                        title="Manage Receipt"
                                                        style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
                                                    >
                                                        <Eye size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredReceipts.length === 0 && (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                                <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                                <p className="font-bold text-lg">
                                                    {receiptFilter === 'pending' ? 'No Pending Receipts' :
                                                        receiptFilter === 'done' ? 'No Completed Receipts' :
                                                            'No Canceled Receipts'}
                                                </p>
                                                <p className="text-sm">
                                                    {receiptFilter === 'pending' ? 'Confirm a purchase order to see it here.' : ''}
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </>
                        ) : (
                            <>
                                <thead>
                                    <tr>
                                        {activeTab !== 'returns' && !(activeTab === 'deliveries' && (deliveryFilter === 'picked_up' || deliveryFilter === 'done')) && (
                                            <th>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedOrderIds(filteredOrders.map(d => d.id));
                                                        } else {
                                                            setSelectedOrderIds([]);
                                                        }
                                                    }}
                                                />
                                            </th>
                                        )}
                                        <th>Order ID</th>
                                        <th>Date</th>
                                        <th>Customer</th>
                                        <th>Destination</th>
                                        <th>{activeTab === 'pick' ? 'Status' : ((deliveryFilter === 'done' || activeTab === 'returns') ? 'Shipping ID' : 'Shipping Status')}</th>
                                        {activeTab !== 'returns' && !(activeTab === 'deliveries' && (deliveryFilter === 'picked_up' || deliveryFilter === 'done')) && <th>{activeTab === 'pick' ? 'Picking List' : 'Label'}</th>}
                                        <th>{activeTab === 'returns' || (activeTab === 'deliveries' && deliveryFilter === 'done') ? 'View' : 'Manage'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map(order => (
                                        <tr key={order.id}>
                                            {activeTab !== 'returns' && !(activeTab === 'deliveries' && (deliveryFilter === 'picked_up' || deliveryFilter === 'done')) && (
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedOrderIds.includes(order.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedOrderIds([...selectedOrderIds, order.id]);
                                                            } else {
                                                                setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            )}
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
                                                        } else if (!displayPhone.startsWith('0')) {
                                                            displayPhone = '0' + displayPhone;
                                                        }
                                                        return displayPhone;
                                                    })()}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}><MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} /> {order.customer.city || 'No City'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.customer.sector || 'No sector'}</div>
                                            </td>
                                            <td>
                                                {activeTab === 'pick' ? (
                                                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase letter-spacing-wider">
                                                        Awaiting Picking
                                                    </span>
                                                ) : (
                                                    order.shippingId ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                                                                ID: {order.shippingId}
                                                            </span>
                                                            {deliveryFilter !== 'done' && activeTab !== 'returns' && (
                                                                order.shippingStatus && order.shippingStatus.startsWith('Pickup:') ? (
                                                                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-tight">
                                                                        {order.shippingStatus}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs font-semibold text-slate-600">
                                                                        {order.shippingStatus || 'SHIPPED'}
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100 uppercase">
                                                            Awaiting Export
                                                        </span>
                                                    )
                                                )}
                                            </td>
                                            {activeTab !== 'returns' && !(activeTab === 'deliveries' && (deliveryFilter === 'picked_up' || deliveryFilter === 'done')) && (
                                                <td>
                                                    <div className="flex flex-col gap-1">
                                                        {order.deliveryNotePrinted ? (
                                                            <div className={`${styles.indicator} ${styles.indicatorPrinted}`} title="Label Printed">
                                                                <CheckCircle size={14} />
                                                                <span className="text-[10px]">PRINTED</span>
                                                            </div>
                                                        ) : (
                                                            <div className={`${styles.indicator} ${styles.indicatorPending}`} title="Not Printed">
                                                                <Circle size={14} className="opacity-50" />
                                                                <span className="text-[10px] italic">PENDING</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            )}

                                            <td>
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className={styles.eyeBtn}
                                                    title="View Details"
                                                    style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
                                                >
                                                    <Eye size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredOrders.length === 0 && (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                                <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                                <p className="font-bold text-lg">Empty Queue</p>
                                                <p className="text-sm">No orders currently match this status.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </>
                        )}
                    </table>
                    {selectedOrderIds.length > 0 && (
                        <div className={styles.tableSpacer} />
                    )}
                </div>

                {
                    selectedOrder && (
                        <DeliveryDialog
                            order={selectedOrder}
                            products={products}
                            onClose={() => setSelectedOrder(null)}
                            showShippingInterface={activeTab === 'deliveries' && deliveryFilter !== 'done'}
                            readonly={activeTab === 'deliveries' && deliveryFilter === 'done'}
                        />
                    )
                }

                {
                    selectedPO && (
                        <PurchaseOrderDialog
                            po={selectedPO}
                            products={products}
                            suppliers={suppliers}
                            onClose={() => setSelectedPO(null)}
                            context="fulfillment"
                        />
                    )
                }

                {/* STICKY BULK ACTION BAR */}
                {
                    selectedOrderIds.length > 0 && (
                        <div className={styles.stickyBar}>
                            <div className="flex items-center gap-4">
                                <div className={styles.selectionBadge}>
                                    {selectedOrderIds.length}
                                </div>
                                <div className="hidden sm:block">
                                    <div className="font-extrabold text-slate-800 leading-tight text-xs uppercase tracking-wider">Orders Selected</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                        {activeTab === 'pick' ? 'Bulk Preparation' : 'Bulk Export'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ height: '24px', width: '2px', background: '#f1f5f9', margin: '0 0.5rem' }} />

                            <div className="flex items-center gap-3">
                                {activeTab === 'pick' ? (
                                    <>
                                        <button
                                            onClick={handlePrintPickingLabels}
                                            className={styles.bulkShipBtn}
                                            style={{ background: '#334155' }}
                                        >
                                            <Printer size={18} />
                                            <span>Print Picking List</span>
                                        </button>

                                        {pickFilter !== 'pending' && (
                                            <button
                                                onClick={handleFinishPicking}
                                                disabled={isUpdatingBulk}
                                                className={styles.bulkShipBtn}
                                                style={{ background: '#2563eb' }}
                                            >
                                                <CheckCircle2 size={18} className={isUpdatingBulk ? 'animate-spin' : ''} />
                                                <span>{isUpdatingBulk ? 'Updating...' : 'Finish Picking'}</span>
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {deliveryFilter === 'awaiting_export' && (
                                            <button
                                                onClick={handleBulkShip}
                                                disabled={isShippingBulk}
                                                className={styles.bulkShipBtn}
                                            >
                                                <Truck size={18} className={isShippingBulk ? 'animate-spin' : ''} />
                                                <span>{isShippingBulk ? 'Exporting...' : 'Export to Cathedis'}</span>
                                            </button>
                                        )}
                                        {deliveryFilter !== 'awaiting_export' && (
                                            <button
                                                onClick={async () => {
                                                    const selectedShipped = deliveryOrders.filter(o => selectedOrderIds.includes(o.id) && o.shippingId);
                                                    if (selectedShipped.length === 0) {
                                                        alert('No shipped orders selected for pickup.');
                                                        return;
                                                    }

                                                    // Check if all selected orders have been printed
                                                    const unprintedOrders = selectedShipped.filter(o => !o.deliveryNotePrinted);
                                                    if (unprintedOrders.length > 0) {
                                                        alert(`Cannot request pickup: ${unprintedOrders.length} orders have not had their labels printed yet.\nPlease print labels first.`);
                                                        return;
                                                    }

                                                    setIsPickupModalOpen(true);
                                                }}
                                                disabled={isShippingBulk}
                                                className={styles.bulkShipBtn}
                                                style={{ background: '#7c3aed' }} // Violet color
                                            >
                                                <Truck size={18} className={isShippingBulk ? 'animate-spin' : ''} />
                                                <span>Request Pickup</span>
                                            </button>
                                        )}
                                    </>
                                )}

                                <button
                                    onClick={() => setSelectedOrderIds([])}
                                    className={styles.bulkCloseBtn}
                                    style={{ marginLeft: '1.5rem' }}
                                    title="Cancel Selection"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )
                }
                {/* Pickup Selection Modal */}
                {isPickupModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60
                    }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '400px', maxWidth: '90%' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Select Pickup Point</h3>
                            <p style={{ marginBottom: '1.5rem', color: '#64748b' }}>Where should the driver pick up these {selectedOrderIds.length} orders?</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                {effectivePickupLocations.map((loc) => (
                                    <button
                                        key={loc.id}
                                        onClick={() => handlePickupRequest(loc.id)}
                                        disabled={isShippingBulk}
                                        style={{
                                            padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                                            background: isShippingBulk ? '#f1f5f9' : 'white', cursor: isShippingBulk ? 'not-allowed' : 'pointer',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                                            transition: 'all 0.2s'
                                        }}
                                        className="hover:border-blue-500 hover:bg-blue-50"
                                    >
                                        <MapPin size={24} className="text-blue-600" />
                                        <span style={{ fontWeight: 600, textAlign: 'center' }}>{loc.label}</span>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setIsPickupModalOpen(false)}
                                disabled={isShippingBulk}
                                style={{
                                    width: '100%', padding: '0.75rem', background: 'transparent',
                                    border: 'none', color: '#64748b', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div >

            {/* PRINT ONLY SECTION */}


            <style dangerouslySetInnerHTML={{
                __html: `
                @media screen {
                    .print-only-container { display: none !important; }
                }
                @media print {
                    /* Hide everything by default using visibility to keep layout flow but hide pixels */
                    body * {
                        visibility: hidden;
                    }
                    
                    /* Reset the print container and its children to be visible */
                    .print-only-container, .print-only-container * {
                        visibility: visible;
                    }

                    /* Position the print container at the absolute top/left of the page */
                    .print-only-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    
                    /* Enhance standard print resets */
                    body, html {
                        background: white !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    
                    /* Ensure no-print elements are definitely gone */
                    .no-print { display: none !important; }
                }
            `}} />
        </div>
    );
}
