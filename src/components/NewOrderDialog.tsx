'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Product, SalesPerson, Kit } from '@/lib/db';
import { createOrderAction, getCathedisCitiesAction } from '@/app/actions';
import {
    X, Search, Plus, ShoppingCart, User as UserIcon, Briefcase, ChevronRight, Eye, MapPin, Trash2, PlusCircle
} from 'lucide-react';
import styles from '../app/(admin)/admin/Admin.module.css';
import SearchableCitySelect from './SearchableCitySelect';

interface NewOrderDialogProps {
    products: Product[];
    salesPeople: SalesPerson[];
    onClose: () => void;
    kits?: Kit[];
}

export default function NewOrderDialog({ products, salesPeople, onClose, kits }: NewOrderDialogProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    // Order State
    const [customer, setCustomer] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        sector: ''
    });
    const [items, setItems] = useState<{ productId: string; quantity: number; price: number }[]>([]);
    const [businessInfo, setBusinessInfo] = useState<{ companyName?: string; ice?: string }>({});
    const [salesPerson, setSalesPerson] = useState('');

    // UI States
    const [showProductGallery, setShowProductGallery] = useState(false);
    const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
    const [showAddButton, setShowAddButton] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [cathedisCities, setCathedisCities] = useState<any[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    useEffect(() => {
        async function fetchCities() {
            setIsLoadingCities(true);
            const cities = await getCathedisCitiesAction();
            setCathedisCities(cities);
            setIsLoadingCities(false);
        }
        fetchCities();
    }, []);

    const total = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [items]);

    const allCategories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return Array.from(cats) as string[];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
            // Only allow 'live' products (undefined status defaults to live for legacy)
            const isLive = !p.status || p.status === 'live';
            return matchesSearch && matchesCategory && isLive;
        });
    }, [products, searchQuery, selectedCategory]);

    const handleCreate = async () => {
        if (!customer.name || !customer.phone || items.length === 0) {
            alert('Please fill in customer details and add at least one product.');
            return;
        }

        setIsSaving(true);
        const formData = new FormData();
        formData.append('name', customer.name);
        formData.append('phone', customer.phone);
        formData.append('email', customer.email);
        formData.append('address', customer.address);
        formData.append('city', customer.city);
        formData.append('sector', customer.sector);
        formData.append('total', total.toString());
        formData.append('items', JSON.stringify(items));

        if (businessInfo.companyName) formData.append('companyName', businessInfo.companyName);
        if (businessInfo.ice) formData.append('ice', businessInfo.ice);
        if (salesPerson) formData.append('salesPerson', salesPerson);

        try {
            await createOrderAction(formData);
            router.refresh();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to create order');
        } finally {
            setIsSaving(false);
        }
    };

    const updateItem = (productId: string, quantity: number, price: number) => {
        setItems(items.map(item =>
            item.productId === productId ? { ...item, quantity, price } : item
        ));
    };

    const addItem = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const existing = items.find(i => i.productId === productId);
        if (existing) {
            updateItem(productId, existing.quantity + 1, existing.price);
        } else {
            setItems([...items, { productId, quantity: 1, price: product.price }]);
        }
        setShowProductGallery(false);
    };

    const removeItem = (productId: string) => {
        setItems(items.filter(item => item.productId !== productId));
    };

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1500 }}>
            <div className={styles.orderModal}>
                <header className={styles.modalHeader}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.modalTitle}>Create New Order</h2>
                        <span className={styles.modalSubtitle}>Manual order entry</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
                </header>

                <div className={styles.modalBody}>
                    {/* SECTION 1: CUSTOMER INFO */}
                    <section className={styles.infoSection}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={styles.sectionTitle} style={{ border: 'none', marginBottom: 0 }}><UserIcon size={16} /> Customer Details</h3>
                            <button
                                onClick={() => {
                                    if (businessInfo.companyName !== undefined || businessInfo.ice !== undefined) {
                                        setBusinessInfo({});
                                    } else {
                                        setBusinessInfo({ companyName: '', ice: '' });
                                    }
                                }}
                                style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '6px 14px',
                                    borderRadius: 'full',
                                    background: (businessInfo.companyName !== undefined) ? 'rgba(59, 130, 246, 0.1)' : '#f8fafc',
                                    color: (businessInfo.companyName !== undefined) ? '#2563eb' : '#94a3b8',
                                    border: (businessInfo.companyName !== undefined) ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Briefcase size={14} />
                                {(businessInfo.companyName !== undefined) ? 'BUSINESS MODE ACTIVE' : 'SWITCH TO BUSINESS INVOICE'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className={styles.inputGroup} style={{ marginRight: '0.75rem' }}>
                                <label>Full Name *</label>
                                <input
                                    value={customer.name}
                                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                                    className={styles.inlineInput}
                                    placeholder="Customer name"
                                />
                            </div>
                            <div className={styles.inputGroup} style={{ marginLeft: '0.75rem' }}>
                                <label>Phone Number *</label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.5rem',
                                    overflow: 'hidden',
                                    background: 'white',
                                    transition: 'all 0.2s',
                                    borderColor: (customer.phone && (!['5', '6', '7'].includes(customer.phone[0]) || customer.phone.length !== 9)) ? '#ef4444' : '#e2e8f0',
                                    boxShadow: (customer.phone && (!['5', '6', '7'].includes(customer.phone[0]) || customer.phone.length !== 9)) ? '0 0 0 1px #ef4444' : 'none'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '0.5rem 0.75rem',
                                        background: '#f8fafc',
                                        borderRight: '1px solid #e2e8f0',
                                        color: '#475569',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        userSelect: 'none'
                                    }}>
                                        <img
                                            src="https://flagcdn.com/w40/ma.png"
                                            alt="Morocco"
                                            style={{ width: '20px', height: 'auto', borderRadius: '2px' }}
                                        />
                                        <span>+212</span>
                                    </div>
                                    <input
                                        value={customer.phone}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                            if (val.startsWith('0')) val = val.substring(1); // Remove leading 0
                                            if (val.length > 9) val = val.substring(0, 9); // Max 9 digits

                                            setCustomer({ ...customer, phone: val });
                                        }}
                                        placeholder="612345678"
                                        className={styles.inlineInput}
                                        style={{
                                            border: 'none',
                                            boxShadow: 'none',
                                            borderRadius: '0',
                                            flex: 1,
                                            padding: '0.5rem 0.75rem',
                                            color: (customer.phone && (!['5', '6', '7'].includes(customer.phone[0]) || customer.phone.length !== 9)) ? '#ef4444' : 'inherit'
                                        }}
                                    />
                                </div>
                                {customer.phone && (
                                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#ef4444', height: '1.25rem' }}>
                                        {!['5', '6', '7'].includes(customer.phone[0]) && <span>Must start with 5, 6, or 7. </span>}
                                        {customer.phone.length !== 9 && <span>Must be 9 digits.</span>}
                                    </div>
                                )}
                            </div>
                            <div className={styles.inputGroup} style={{ marginRight: '0.75rem' }}>
                                <label>Email Address</label>
                                <input
                                    value={customer.email}
                                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                                    className={styles.inlineInput}
                                    placeholder="Email (optional)"
                                />
                            </div>
                            <div className={styles.inputGroup} style={{ marginLeft: '0.75rem' }}>
                                <label>City *</label>
                                <SearchableCitySelect
                                    cities={cathedisCities}
                                    value={customer.city}
                                    onChange={(cityName) => {
                                        const city = cathedisCities.find(c => c.name === cityName);
                                        setCustomer({
                                            ...customer,
                                            city: cityName,
                                            sector: city?.sectors?.[0]?.name || ''
                                        });
                                    }}
                                    disabled={isLoadingCities}
                                    placeholder="Select City..."
                                />
                            </div>
                            <div className={styles.inputGroup} style={{ marginRight: '0.75rem' }}>
                                <label>Sector/Neighborhood *</label>
                                <select
                                    value={customer.sector}
                                    onChange={(e) => setCustomer({ ...customer, sector: e.target.value })}
                                    className={styles.inlineInput}
                                    disabled={!customer.city}
                                >
                                    <option value="">Select Sector...</option>
                                    {cathedisCities.find(c => c.name === customer.city)?.sectors?.map((s: any) => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                    {!cathedisCities.find(c => c.name === customer.city)?.sectors?.length && customer.city && (
                                        <option value="Autre">Autre</option>
                                    )}
                                </select>
                            </div>
                            <div className={styles.inputGroup} style={{ marginLeft: '0.75rem' }}>
                                <label>Sales Person</label>
                                <select
                                    className={styles.inlineInput}
                                    value={salesPerson}
                                    onChange={(e) => setSalesPerson(e.target.value)}
                                >
                                    <option value="">Select Sales Person...</option>
                                    {salesPeople.map(p => (
                                        <option key={p.id} value={p.fullName}>{p.fullName}</option>
                                    ))}
                                </select>
                            </div>

                            {businessInfo.companyName !== undefined && (
                                <>
                                    <div className={styles.inputGroup} style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bae6fd', gridColumn: 'span 1', marginRight: '0.75rem' }}>
                                        <label style={{ color: '#0369a1' }}>Company/Business Name</label>
                                        <input
                                            value={businessInfo.companyName || ''}
                                            onChange={(e) => setBusinessInfo({ ...businessInfo, companyName: e.target.value })}
                                            className={styles.inlineInput}
                                            placeholder="e.g. Acme Corp"
                                            style={{ background: 'white', borderColor: '#7dd3fc' }}
                                        />
                                    </div>
                                    <div className={styles.inputGroup} style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bae6fd', gridColumn: 'span 1', marginLeft: '0.75rem' }}>
                                        <label style={{ color: '#0369a1' }}>ICE (Tax ID)</label>
                                        <input
                                            value={businessInfo.ice || ''}
                                            onChange={(e) => setBusinessInfo({ ...businessInfo, ice: e.target.value })}
                                            className={styles.inlineInput}
                                            placeholder="Registration Number"
                                            style={{ background: 'white', borderColor: '#7dd3fc' }}
                                        />
                                    </div>
                                </>
                            )}

                            <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                <label>Shipping Address</label>
                                <textarea
                                    value={customer.address}
                                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                                    className={styles.inlineInput}
                                    rows={2}
                                    placeholder="Enter full address"
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: ORDER CONTENT */}
                    <section className={styles.infoSection}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                            <h3 className={styles.sectionTitle} style={{ border: 'none', marginBottom: 0 }}><ShoppingCart size={16} /> Order Content</h3>
                            <button onClick={() => setShowProductGallery(true)} className="btn btn-accent btn-sm">
                                <Plus size={16} /> Add Product
                            </button>
                        </div>

                        <table
                            className={styles.managementTable}
                            style={{
                                border: '2px solid #cbd5e1',
                                borderCollapse: 'collapse',
                                background: 'white'
                            }}
                        >
                            <thead>
                                <tr>
                                    <th style={{
                                        border: '1px solid #cbd5e1',
                                        background: '#f1f5f9',
                                        padding: '1rem',
                                        fontWeight: '700',
                                        textAlign: 'left',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                        letterSpacing: '0.05em'
                                    }}>Item</th>
                                    <th style={{
                                        border: '1px solid #cbd5e1',
                                        background: '#f1f5f9',
                                        padding: '1rem',
                                        fontWeight: '700',
                                        textAlign: 'center',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                        letterSpacing: '0.05em'
                                    }}>Price</th>
                                    <th style={{
                                        border: '1px solid #cbd5e1',
                                        background: '#f1f5f9',
                                        padding: '1rem',
                                        fontWeight: '700',
                                        textAlign: 'center',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                        letterSpacing: '0.05em'
                                    }}>Qty</th>
                                    <th style={{
                                        border: '1px solid #cbd5e1',
                                        background: '#f1f5f9',
                                        padding: '1rem',
                                        fontWeight: '700',
                                        textAlign: 'right',
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                        letterSpacing: '0.05em'
                                    }}>Subtotal</th>
                                    <th style={{
                                        border: '1px solid #cbd5e1',
                                        background: '#f1f5f9',
                                        padding: '1rem',
                                        width: '60px'
                                    }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => {
                                    const product = products.find(p => p.id === item.productId);
                                    return (
                                        <tr key={item.productId}>
                                            <td style={{
                                                border: '1px solid #cbd5e1',
                                                padding: '1rem'
                                            }}>
                                                <div className="flex items-center gap-8">
                                                    {product?.image && <img src={product.image} className={styles.imageCell} alt="" />}
                                                    <div className="flex flex-col">
                                                        <div className="font-bold flex items-center gap-2">
                                                            {product?.title || 'Unknown'}
                                                            {kits?.some(k => k.targetProductId === product?.id) && (
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '2px 6px',
                                                                    fontSize: '10px',
                                                                    fontWeight: 'bold',
                                                                    color: 'white',
                                                                    backgroundColor: '#9333ea',
                                                                    borderRadius: '2px',
                                                                    boxShadow: '0 0 5px rgba(147, 51, 234, 0.6)',
                                                                    letterSpacing: '0.05em',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    KIT
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{
                                                border: '1px solid #cbd5e1',
                                                padding: '1rem',
                                                textAlign: 'center'
                                            }}>
                                                <input type="number" step="0.01" value={item.price ?? ''} onChange={(e) => updateItem(item.productId, item.quantity, parseFloat(e.target.value) || 0)} className={styles.inlineInput} style={{ width: '90px' }} />
                                            </td>
                                            <td style={{
                                                border: '1px solid #cbd5e1',
                                                padding: '1rem',
                                                textAlign: 'center'
                                            }}>
                                                <input type="number" value={item.quantity ?? ''} onChange={(e) => updateItem(item.productId, parseInt(e.target.value) || 1, item.price)} className={styles.inlineInput} style={{ width: '60px' }} />
                                            </td>
                                            <td style={{
                                                border: '1px solid #cbd5e1',
                                                padding: '1rem',
                                                textAlign: 'right',
                                                fontWeight: 'bold'
                                            }}>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                                            <td style={{
                                                border: '1px solid #cbd5e1',
                                                padding: '1rem',
                                                textAlign: 'center'
                                            }}>
                                                <button onClick={() => removeItem(item.productId)} className={styles.deleteBtn}><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{
                                            border: '1px solid #cbd5e1',
                                            padding: '2rem',
                                            textAlign: 'center',
                                            color: '#94a3b8',
                                            fontStyle: 'italic'
                                        }}>No products added yet.</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f8fafc' }}>
                                    <td colSpan={3} style={{
                                        border: '2px solid #cbd5e1',
                                        padding: '1rem',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        fontSize: '1rem'
                                    }}>Total Amount</td>
                                    <td colSpan={2} style={{
                                        border: '2px solid #cbd5e1',
                                        padding: '1rem',
                                        fontWeight: '800',
                                        color: '#2563eb',
                                        fontSize: '1.25rem'
                                    }}>${total.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>
                </div>

                <footer className={styles.modalFooter}>
                    <button onClick={onClose} className="btn btn-outline" style={{ marginLeft: 'auto' }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={isSaving || items.length === 0}
                        className="btn btn-primary"
                        style={{ minWidth: '160px' }}
                    >
                        {isSaving ? 'Creating...' : <><PlusCircle size={18} /> Create Order</>}
                    </button>
                </footer>

                {/* Product Gallery (Reused from OrderDialog logic) */}
                {showProductGallery && (
                    <div className={styles.productGallery}>
                        <header className={styles.modalHeader}>
                            <h3 className="font-bold">Inventory Selection</h3>
                            <button onClick={() => { setShowProductGallery(false); setSearchQuery(''); setSelectedCategory('all'); }} className={styles.closeBtn}><X size={20} /></button>
                        </header>

                        <div className={styles.gallerySearchWrapper}>
                            <Search size={18} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search products by title..."
                                className={styles.gallerySearchInput}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className={styles.galleryFilters}>
                            <button
                                className={`${styles.filterPill} ${selectedCategory === 'all' ? styles.active : ''} `}
                                onClick={() => setSelectedCategory('all')}
                            >
                                All Products
                            </button>
                            {allCategories.map((cat: string) => (
                                <button
                                    key={cat}
                                    className={`${styles.filterPill} ${selectedCategory === cat ? styles.active : ''} `}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat ? cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ') : 'General'}
                                </button>
                            ))}
                        </div>

                        <div className={styles.galleryBody}>
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((p: Product) => (
                                    <div key={p.id} className={styles.galleryItem} onClick={() => addItem(p.id)}>
                                        <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                                            <img src={p.image} className={styles.galleryThumb} alt="" />
                                        </div>
                                        <div style={{ flex: 1, paddingRight: '2.5rem' }}>
                                            <div className={styles.galleryTitle}>{p.title}</div>
                                            <div className={styles.galleryPrice}>${(p.price || 0).toFixed(2)}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{p.category}</div>
                                        </div>
                                        {kits?.some(k => k.targetProductId === p.id) && (
                                            <span style={{
                                                position: 'absolute',
                                                top: '10px',
                                                right: '12px',
                                                display: 'inline-block',
                                                padding: '2px 6px',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                color: 'white',
                                                backgroundColor: '#9333ea',
                                                borderRadius: '2px',
                                                boxShadow: '0 0 5px rgba(147, 51, 234, 0.6)',
                                                letterSpacing: '0.05em',
                                                textTransform: 'uppercase',
                                                zIndex: 4
                                            }}>
                                                KIT
                                            </span>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPreviewProduct(p); setShowAddButton(true); }}
                                            className={styles.previewBtn}
                                            style={{
                                                position: 'absolute',
                                                bottom: '12px',
                                                right: '12px',
                                                background: 'white',
                                                borderRadius: '6px',
                                                padding: '4px',
                                                border: '1px solid #e2e8f0',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 5
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.15)';
                                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(37, 99, 235, 0.25)';
                                                e.currentTarget.style.background = '#eff6ff';
                                                e.currentTarget.style.borderColor = '#2563eb';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                                e.currentTarget.style.background = 'white';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                            }}
                                        >
                                            <Eye size={14} color="var(--color-primary)" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 py-12 text-center text-slate-400 italic">
                                    No products found matching your search or category.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* IMAGE PREVIEW LIGHTBOX */}
                {previewProduct && (
                    <div className={styles.confirmOverlay} style={{ zIndex: 2000 }} onClick={() => setPreviewProduct(null)}>
                        <div
                            className={styles.confirmCard}
                            style={{
                                maxWidth: '600px',
                                maxHeight: '90vh',
                                padding: 0,
                                overflow: 'auto',
                                background: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                // Modern scrollbar styling
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#cbd5e1 #f1f5f9'
                            } as React.CSSProperties & { scrollbarWidth?: string; scrollbarColor?: string }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ position: 'relative', flexShrink: 0, width: '100%', aspectRatio: '1/1', overflow: 'hidden' }}>
                                <img src={previewProduct.image} alt={previewProduct.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                    onClick={() => setPreviewProduct(null)}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '10px',
                                        background: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        borderRadius: '50%',
                                        padding: '4px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{
                                padding: '1.5rem',
                                background: 'white'
                            }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700' }}>{previewProduct.title}</h3>
                                <div
                                    style={{
                                        color: '#64748b',
                                        fontSize: '0.9rem',
                                        margin: '0 0 1.5rem 0',
                                        lineHeight: '1.6'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: previewProduct.description }}
                                />
                                <div className="flex justify-between items-center" style={{
                                    borderTop: '1px solid #f1f5f9',
                                    paddingTop: '1rem'
                                }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>${(previewProduct.price || 0).toFixed(2)}</span>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => { addItem(previewProduct.id); setPreviewProduct(null); }}
                                    >
                                        Add to Order
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
