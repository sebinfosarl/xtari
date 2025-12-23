
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Order, Product, SalesPerson, Supplier, PurchaseOrder } from '@/lib/db';
import { Search, User as UserIcon, Phone, Mail, MapPin, ShoppingBag, TrendingUp, History, ExternalLink, X, Briefcase, FileText, IdCard, Users, Truck, Edit2, PackageOpen } from 'lucide-react';
import styles from '../Admin.module.css';
import OrderDialog from '@/components/OrderDialog';
import PurchaseOrderDialog from '@/components/PurchaseOrderDialog';
import { saveSupplierAction } from '@/app/actions';
import { useRouter } from 'next/navigation';

interface ContactIdentity {
    name: string;
    address: string;
    orderCount: number;
    successfulOrders: number;
    failedOrders: number;
    invoiceCount: number;
    lastUsed: string;
}

interface Contact {
    phone: string;
    originalName: string;
    email?: string;
    address: string; // Primary/Latest address
    ordersCount: number;
    successfulOrders: number;
    failedOrders: number;
    totalInvoices: number;
    totalSpent: number;
    lastOrderDate: string;
    isBusiness: boolean;
    companyNames: Set<string>;
    identities: ContactIdentity[];
}

interface SupplierContact {
    id: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    poCount: number;
    totalInvested: number;
    lastPODate: string;
}

export default function ContactsView({
    orders,
    products,
    salesPeople,
    suppliers = [],
    purchaseOrders = [],
    mode = 'customers'
}: {
    orders: Order[],
    products: Product[],
    salesPeople: SalesPerson[],
    suppliers?: Supplier[],
    purchaseOrders?: PurchaseOrder[],
    mode?: 'customers' | 'suppliers'
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

    // Supplier Management States
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [viewingSupplierHistory, setViewingSupplierHistory] = useState<SupplierContact | null>(null);
    const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Date Filtering States
    const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // Jan 1st of current year
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]); // Today

    const router = useRouter();

    const handleSaveSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSupplier) return;

        setIsSaving(true);
        try {
            await saveSupplierAction(editingSupplier);
            setEditingSupplier(null);
            router.refresh();
        } catch (err) {
            alert('Failed to save supplier changes');
        } finally {
            setIsSaving(false);
        }
    };

    // Smart Aggregation Logic
    const contacts = useMemo(() => {
        const aggregated: Record<string, Contact> = {};

        orders.forEach(order => {
            const phone = order.customer.phone.replace(/\s+/g, '');
            if (!aggregated[phone]) {
                aggregated[phone] = {
                    phone: order.customer.phone,
                    originalName: order.customer.name,
                    email: order.customer.email,
                    address: order.customer.address,
                    ordersCount: 0,
                    successfulOrders: 0,
                    failedOrders: 0,
                    totalInvoices: 0,
                    totalSpent: 0,
                    lastOrderDate: order.date,
                    isBusiness: false,
                    companyNames: new Set(),
                    identities: []
                };
            }

            const c = aggregated[phone];
            const isSuccess = order.status === 'sales_order';
            const isFailed = order.status === 'canceled' || order.status === 'no_reply';
            const isInvoice = !!order.invoiceDownloaded && isSuccess;

            c.ordersCount += 1;
            if (isSuccess) {
                c.successfulOrders += 1;
                c.totalSpent += order.total;
            } else if (isFailed) {
                c.failedOrders += 1;
            }

            if (isInvoice) c.totalInvoices += 1;

            if (new Date(order.date) >= new Date(c.lastOrderDate)) {
                c.lastOrderDate = order.date;
                c.originalName = order.customer.name;
                c.address = order.customer.address;
            }

            if (order.companyName) {
                c.isBusiness = true;
                c.companyNames.add(order.companyName);
            }

            // Identity Clustering
            const idKey = `${order.customer.name}|${order.customer.address}`.toLowerCase();
            let identity = c.identities.find(id => `${id.name}|${id.address}`.toLowerCase() === idKey);
            if (!identity) {
                identity = {
                    name: order.customer.name,
                    address: order.customer.address,
                    orderCount: 0,
                    successfulOrders: 0,
                    failedOrders: 0,
                    invoiceCount: 0,
                    lastUsed: order.date
                };
                c.identities.push(identity);
            }
            identity.orderCount += 1;
            if (isSuccess) identity.successfulOrders += 1;
            if (isFailed) identity.failedOrders += 1;
            if (isInvoice) identity.invoiceCount += 1;

            if (new Date(order.date) > new Date(identity.lastUsed)) {
                identity.lastUsed = order.date;
            }
        });

        // Sort identities by latest used
        Object.values(aggregated).forEach(c => {
            c.identities.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
        });

        return Object.values(aggregated).sort((a, b) => b.successfulOrders - a.successfulOrders || b.ordersCount - a.ordersCount);
    }, [orders]);

    const supplierContacts = useMemo(() => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000); // Include full end day

        return suppliers.map(s => {
            const pos = purchaseOrders.filter(po => {
                const poTime = new Date(po.date).getTime();
                return po.supplierId === s.id && poTime >= start && poTime <= end;
            });
            const total = pos.reduce((acc, po) => acc + (po.total || 0), 0);
            const latestPO = pos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            return {
                ...s,
                poCount: pos.length,
                totalInvested: total,
                lastPODate: latestPO ? latestPO.date : 'N/A'
            };
        }).sort((a, b) => b.totalInvested - a.totalInvested);
    }, [suppliers, purchaseOrders, startDate, endDate]);

    const filteredContacts = mode === 'customers'
        ? contacts.filter(c => {
            const q = searchQuery.toLowerCase();
            return c.originalName.toLowerCase().includes(q) ||
                c.phone.toLowerCase().includes(q) ||
                Array.from(c.companyNames).some(name => name.toLowerCase().includes(q));
        })
        : supplierContacts.filter(s => {
            const q = searchQuery.toLowerCase();
            return s.name.toLowerCase().includes(q) ||
                (s.phone && s.phone.toLowerCase().includes(q)) ||
                (s.contactPerson && s.contactPerson.toLowerCase().includes(q));
        });

    const contactOrders = useMemo(() => {
        if (!selectedContact) return [];
        const phone = selectedContact.phone.replace(/\s+/g, '');
        return orders
            .filter(o => o.customer.phone.replace(/\s+/g, '') === phone)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedContact, orders]);

    return (
        <div className={styles.tableSection}>
            <div className={styles.sectionHeader} style={{ gap: '1.5rem' }}>
                <div>
                    <h2 className={styles.sectionTitle}>{mode === 'customers' ? 'Customer CRM & Contacts' : 'Supplier Directory'}</h2>
                    <div className={styles.statTrend}>
                        {mode === 'customers' ? `${contacts.length} unique customers identified` : `${suppliers.length} active suppliers registered`}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {mode === 'suppliers' && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div className="flex items-center gap-2">
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>PERIOD</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', outline: 'none' }}
                                />
                                <span style={{ color: '#94a3b8' }}>→</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', outline: 'none' }}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ position: 'relative', width: '300px' }}>
                        <input
                            type="text"
                            placeholder={`Search ${mode}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.9rem'
                            }}
                        />
                        <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    </div>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        {mode === 'customers' ? (
                            <tr>
                                <th>Customer & Location</th>
                                <th>Engagement</th>
                                <th>Last Activity</th>
                                <th>Lifetime Value</th>
                                <th>Actions</th>
                            </tr>
                        ) : (
                            <tr>
                                <th>Supplier & Location</th>
                                <th>Contact Person</th>
                                <th>PO Stats</th>
                                <th>Total Invested</th>
                                <th>Actions</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {mode === 'customers' ? (
                            (filteredContacts as Contact[]).map(contact => (
                                <tr key={contact.phone}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '12px',
                                                background: '#f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748b'
                                            }}>
                                                <UserIcon size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{contact.originalName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Phone size={10} /> {contact.phone}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                    <MapPin size={10} /> {contact.address}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <div style={{
                                                    padding: '4px 12px',
                                                    background: contact.successfulOrders > 0 ? '#ecfdf5' : '#f8fafc',
                                                    color: contact.successfulOrders > 0 ? '#059669' : '#64748b',
                                                    borderRadius: 'full',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800,
                                                    border: contact.successfulOrders > 0 ? '1px solid #d1fae5' : '1px solid #e2e8f0'
                                                }}>
                                                    {contact.successfulOrders} {contact.successfulOrders === 1 ? 'Purchase' : 'Purchases'}
                                                </div>
                                                {contact.isBusiness && (
                                                    <div style={{
                                                        padding: '4px 12px',
                                                        background: '#eff6ff',
                                                        color: '#2563eb',
                                                        borderRadius: 'full',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 800,
                                                        border: '1px solid #dbeafe'
                                                    }}>
                                                        BUSINESS
                                                    </div>
                                                )}
                                            </div>
                                            {contact.failedOrders > 0 && (
                                                <div style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    color: contact.failedOrders > contact.successfulOrders ? '#ef4444' : '#94a3b8',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    marginLeft: '8px'
                                                }}>
                                                    <X size={10} /> {contact.failedOrders} {contact.failedOrders === 1 ? 'Failed Attempt' : 'Failed Attempts'}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>{new Date(contact.lastOrderDate).toLocaleDateString()}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(contact.lastOrderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1 font-extrabold text-blue-600">
                                            <TrendingUp size={14} />
                                            ${contact.totalSpent.toFixed(2)}
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => setSelectedContact(contact)}
                                            className="btn btn-outline btn-sm"
                                            style={{ gap: '6px', fontSize: '0.75rem' }}
                                        >
                                            <History size={14} /> SMART HISTORY
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            (filteredContacts as SupplierContact[]).map(supplier => (
                                <tr key={supplier.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '12px',
                                                background: '#f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748b'
                                            }}>
                                                <Truck size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{supplier.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Phone size={10} /> {supplier.phone || 'No phone'}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                    <MapPin size={10} /> {supplier.address || 'No address'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#475569' }}>{supplier.contactPerson || 'N/A'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{supplier.email || ''}</div>
                                    </td>
                                    <td>
                                        <div
                                            onClick={() => setViewingSupplierHistory(supplier)}
                                            className="flex flex-col gap-1 group"
                                            style={{ width: 'fit-content', cursor: 'pointer' }}
                                        >
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155' }}>{supplier.poCount} Orders</span>
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: 900,
                                                color: '#2563eb',
                                                background: '#eff6ff',
                                                padding: '5px 12px',
                                                borderRadius: '8px',
                                                border: '1.5px solid #dbeafe',
                                                textTransform: 'uppercase',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                display: 'inline-block',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                letterSpacing: '0.025em'
                                            }} className="group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-700 group-hover:shadow-md group-hover:-translate-y-0.5 active:translate-y-0">
                                                PURCHASE HISTORY
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1 font-extrabold text-emerald-600">
                                            <ShoppingBag size={14} />
                                            ${supplier.totalInvested.toFixed(2)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingSupplier(supplier)}
                                                className="btn btn-ghost btn-xs"
                                                style={{ color: '#2563eb' }}
                                            >
                                                EDIT
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* SMART HISTORY MODAL */}
            {selectedContact && (
                <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
                    <div className={styles.orderModal} style={{ maxWidth: '800px', width: '90%' }}>
                        <header className={styles.modalHeader}>
                            <div className="flex items-center gap-4">
                                <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ShoppingBag size={24} />
                                </div>
                                <div>
                                    <h2 className={styles.modalTitle}>Purchase History: {selectedContact.originalName}</h2>
                                    <p className={styles.modalSubtitle}>{selectedContact.phone} • {selectedContact.ordersCount} Total Orders</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedContact(null)} className={styles.closeBtn}><X size={24} /></button>
                        </header>

                        <div className={styles.modalBody} style={{ padding: '2rem' }}>
                            {/* IDENTITY CARDS DECK */}
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b', marginBottom: '1rem', letterSpacing: '0.05em' }}>Known Customer Identities</h3>
                                <div style={{
                                    display: 'flex',
                                    gap: '1rem',
                                    overflowX: 'auto',
                                    paddingBottom: '10px',
                                    scrollbarWidth: 'thin'
                                }}>
                                    {selectedContact.identities.map((id, idx) => (
                                        <div key={idx} style={{
                                            minWidth: '280px',
                                            background: idx === 0 ? '#eff6ff' : 'white',
                                            border: idx === 0 ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                            borderRadius: '16px',
                                            padding: '1.25rem',
                                            position: 'relative',
                                            boxShadow: idx === 0 ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : 'none'
                                        }}>
                                            {idx === 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '10px',
                                                    right: '10px',
                                                    background: '#2563eb',
                                                    color: 'white',
                                                    fontSize: '0.6rem',
                                                    fontWeight: 900,
                                                    padding: '2px 8px',
                                                    borderRadius: '20px'
                                                }}>LATEST</div>
                                            )}
                                            <div className="flex items-center gap-2 mb-2">
                                                <IdCard size={14} style={{ color: idx === 0 ? '#2563eb' : '#64748b' }} />
                                                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{id.name}</div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                                                <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                {id.address}
                                            </div>
                                            <div className="flex justify-between items-center pt-3 border-top" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669' }}>
                                                    {id.successfulOrders} Purchases
                                                </div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444' }}>
                                                    {id.failedOrders} Fails
                                                </div>
                                                <Link
                                                    href={`/admin/invoices?q=${id.name}`}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 800,
                                                        color: id.invoiceCount > 0 ? '#ea580c' : '#94a3b8',
                                                        textDecoration: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                    onClick={(e) => id.invoiceCount === 0 && e.preventDefault()}
                                                >
                                                    <FileText size={10} /> {id.invoiceCount}
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}>Total Lifetime Value</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb' }}>${selectedContact.totalSpent.toFixed(2)}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}>Success Rate</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669' }}>
                                        {((selectedContact.successfulOrders / (selectedContact.ordersCount || 1)) * 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}>Invoices / Total</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{selectedContact.totalInvoices} / {selectedContact.successfulOrders}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}>Order Breakdown</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ color: '#059669' }}>{selectedContact.successfulOrders} Sales</span>
                                        <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{selectedContact.failedOrders} Fails</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.logContainer} style={{ background: 'transparent', padding: 0 }}>
                                {contactOrders.map((order, idx) => (
                                    <div key={order.id} style={{
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        padding: '1.5rem',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s',
                                        gap: '2rem'
                                    }}>
                                        <div className="flex items-center gap-5 flex-1">
                                            <div style={{
                                                fontSize: '1.1rem',
                                                fontWeight: 800,
                                                color: '#1e293b',
                                                padding: '8px 12px',
                                                background: '#f1f5f9',
                                                borderRadius: '10px',
                                                minWidth: '100px',
                                                textAlign: 'center'
                                            }}>#{order.id}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 900,
                                                        textTransform: 'uppercase',
                                                        padding: '2px 8px',
                                                        borderRadius: 'full',
                                                        background: order.status === 'sales_order' ? '#f0fdf4' : '#fef2f2',
                                                        color: order.status === 'sales_order' ? '#16a34a' : '#dc2626'
                                                    }}>{order.status.replace('_', ' ')}</span>
                                                    {order.companyName && <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#2563eb', padding: '2px 8px', background: '#eff6ff', borderRadius: 'full' }}>B2B</span>}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    {new Date(order.date).toLocaleDateString()} at {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8" style={{ minWidth: 'fit-content' }}>
                                            <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>${order.total.toFixed(2)}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{order.items.length} Items Sold</div>
                                            </div>
                                            <button
                                                onClick={() => setViewingOrder(order)}
                                                className="btn btn-primary btn-sm"
                                                style={{
                                                    borderRadius: '12px',
                                                    height: '44px',
                                                    padding: '0 1.25rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    fontWeight: 700,
                                                    fontSize: '0.8rem',
                                                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -1px rgba(37, 99, 235, 0.06)'
                                                }}
                                            >
                                                VIEW <ExternalLink size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ORDER DETAIL DRILL-DOWN */}
            {viewingOrder && (
                <OrderDialog
                    order={viewingOrder}
                    products={products}
                    salesPeople={salesPeople}
                    onClose={() => setViewingOrder(null)}
                    readOnly={true}
                />
            )}

            {/* EDIT SUPPLIER MODAL */}
            {editingSupplier && (
                <div className={styles.modalOverlay} style={{ zIndex: 1200 }}>
                    <div className={styles.orderModal} style={{ maxWidth: '500px' }}>
                        <header className={styles.modalHeader}>
                            <div className="flex items-center gap-3">
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Edit2 size={20} />
                                </div>
                                <div>
                                    <h2 className={styles.modalTitle}>Edit Supplier</h2>
                                    <p className={styles.modalSubtitle}>{editingSupplier.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingSupplier(null)} className={styles.closeBtn}><X size={24} /></button>
                        </header>

                        <form onSubmit={handleSaveSupplier} className={styles.modalBody} style={{ padding: '2rem' }}>
                            <div className="flex flex-col gap-4">
                                <div className={styles.inputGroup}>
                                    <label>Company Name</label>
                                    <input
                                        value={editingSupplier.name}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                                        className={styles.inlineInput}
                                        required
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Contact Person</label>
                                    <input
                                        value={editingSupplier.contactPerson || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                                        className={styles.inlineInput}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Phone</label>
                                    <input
                                        value={editingSupplier.phone || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                                        className={styles.inlineInput}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={editingSupplier.email || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                                        className={styles.inlineInput}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Address</label>
                                    <textarea
                                        value={editingSupplier.address || ''}
                                        onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                                        className={styles.inlineInput}
                                        style={{ height: '80px', paddingTop: '8px' }}
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button type="button" onClick={() => setEditingSupplier(null)} className="btn btn-ghost flex-1">Cancel</button>
                                <button type="submit" disabled={isSaving} className="btn btn-primary flex-1">
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SUPPLIER HISTORY MODAL */}
            {viewingSupplierHistory && (
                <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
                    <div className={styles.orderModal} style={{ maxWidth: '800px', width: '90%' }}>
                        <header className={styles.modalHeader}>
                            <div className="flex items-center gap-4">
                                <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <PackageOpen size={24} />
                                </div>
                                <div>
                                    <h2 className={styles.modalTitle}>PO History: {viewingSupplierHistory.name}</h2>
                                    <p className={styles.modalSubtitle}>{viewingSupplierHistory.contactPerson} • {viewingSupplierHistory.poCount} Orders</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingSupplierHistory(null)} className={styles.closeBtn}><X size={24} /></button>
                        </header>

                        <div className={styles.modalBody} style={{ padding: '2rem' }}>
                            <div className={styles.logContainer} style={{ background: 'transparent', padding: 0 }}>
                                {purchaseOrders
                                    .filter(po => po.supplierId === viewingSupplierHistory.id)
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((po) => (
                                        <div key={po.id} style={{
                                            background: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '16px',
                                            padding: '1.5rem',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '2rem'
                                        }}>
                                            <div className="flex items-center gap-5 flex-1">
                                                <div style={{
                                                    fontSize: '1.1rem',
                                                    fontWeight: 800,
                                                    color: '#1e293b',
                                                    padding: '8px 12px',
                                                    background: '#f1f5f9',
                                                    borderRadius: '10px',
                                                    minWidth: '100px',
                                                    textAlign: 'center'
                                                }}>#{po.id}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 900,
                                                            textTransform: 'uppercase',
                                                            padding: '2px 8px',
                                                            borderRadius: 'full',
                                                            background: po.status === 'received' ? '#f0fdf4' : '#eff6ff',
                                                            color: po.status === 'received' ? '#16a34a' : '#2563eb'
                                                        }}>{po.status.replace('_', ' ')}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                        {new Date(po.date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>${(po.total || 0).toFixed(2)}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{(po.items || []).length} Items</div>
                                                </div>
                                                <button
                                                    onClick={() => setViewingPO(po)}
                                                    className="btn btn-primary btn-sm"
                                                    style={{ borderRadius: '12px' }}
                                                >
                                                    VIEW
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PO DETAIL DRILL-DOWN */}
            {viewingPO && (
                <PurchaseOrderDialog
                    po={viewingPO}
                    onClose={() => setViewingPO(null)}
                    products={products}
                    suppliers={suppliers}
                />
            )}
        </div>
    );
}
