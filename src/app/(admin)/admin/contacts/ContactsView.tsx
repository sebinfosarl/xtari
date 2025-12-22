
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Order, Product, SalesPerson } from '@/lib/db';
import { Search, User as UserIcon, Phone, Mail, MapPin, ShoppingBag, TrendingUp, History, ExternalLink, X, Briefcase, FileText, IdCard } from 'lucide-react';
import styles from '../Admin.module.css';
import OrderDialog from '@/components/OrderDialog';

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

export default function ContactsView({ orders, products, salesPeople }: { orders: Order[], products: Product[], salesPeople: SalesPerson[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

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

    const filteredContacts = contacts.filter(c => {
        const q = searchQuery.toLowerCase();
        return c.originalName.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            Array.from(c.companyNames).some(name => name.toLowerCase().includes(q));
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
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>Customer CRM & Contacts</h2>
                    <div className={styles.statTrend}>{contacts.length} unique customers identified</div>
                </div>

                <div style={{ position: 'relative', width: '300px' }}>
                    <input
                        type="text"
                        placeholder="Search contacts..."
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

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Customer & Location</th>
                            <th>Engagement</th>
                            <th>Last Activity</th>
                            <th>Lifetime Value</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredContacts.map(contact => (
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
                        ))}
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
        </div>
    );
}
