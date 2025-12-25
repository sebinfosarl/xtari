'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PurchaseOrder, Product, Supplier } from '@/lib/db';
import { savePurchaseOrderAction, saveSupplierAction } from '@/app/actions';
import { X, Search, Plus, ShoppingBag, User, PlusCircle, Trash2, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import styles from '../app/(admin)/admin/Admin.module.css';

interface NewPurchaseOrderDialogProps {
    products: Product[];
    suppliers: Supplier[];
    onClose: () => void;
}

export default function NewPurchaseOrderDialog({ products, suppliers, onClose }: NewPurchaseOrderDialogProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [showProductGallery, setShowProductGallery] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

    // PO State
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState<{ productId: string; quantity: number; buyPrice: number }[]>([]);
    const [notes, setNotes] = useState('');

    // New Supplier State
    const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
    const [newSupplier, setNewSupplier] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: ''
    });

    const total = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.buyPrice * item.quantity), 0);
    }, [items]);

    const allCategories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return Array.from(cats) as string[];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
            // Only allow 'live' products
            const isLive = !p.status || p.status === 'live';
            return matchesSearch && matchesCategory && isLive;
        });
    }, [products, searchQuery, selectedCategory]);

    const handleCreatePO = async (initialStatus: PurchaseOrder['status']) => {
        if (!supplierId || items.length === 0) {
            alert('Please select a supplier and add at least one product.');
            return;
        }

        setIsSaving(true);
        const po: PurchaseOrder = {
            id: 'PO-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            supplierId,
            items,
            total,
            status: initialStatus,
            date: new Date().toISOString(),
            notes
        };

        try {
            await savePurchaseOrderAction(po);
            router.refresh();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to create purchase order');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateSupplier = async () => {
        if (!newSupplier.name) {
            alert('Supplier name is required');
            return;
        }

        try {
            const id = 'SUP-' + Math.random().toString(36).substr(2, 6).toUpperCase();
            await saveSupplierAction({ id, ...newSupplier });
            setSupplierId(id);
            setShowNewSupplierForm(false);
            router.refresh();
        } catch (err) {
            alert('Failed to save supplier');
        }
    };

    const addItem = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const existing = items.find(i => i.productId === productId);
        if (existing) {
            setItems(items.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setItems([...items, { productId, quantity: 1, buyPrice: product.price * 0.7 }]); // Default buy price 70% of sell price
        }
        setShowProductGallery(false);
    };

    const updateItem = (productId: string, quantity: number, buyPrice: number) => {
        setItems(items.map(item =>
            item.productId === productId ? { ...item, quantity, buyPrice } : item
        ));
    };

    const removeItem = (productId: string) => {
        setItems(items.filter(item => item.productId !== productId));
    };

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1500 }}>
            <div className={styles.orderModal}>
                <header className={styles.modalHeader}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.modalTitle}>New Purchase Order</h2>
                        <span className={styles.modalSubtitle}>Stock replenishment</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
                </header>

                <div className={styles.modalBody}>
                    {/* SUPPLIER SECTION */}
                    <section className={styles.infoSection}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={styles.sectionTitle} style={{ border: 'none', marginBottom: 0 }}><User size={16} /> Supplier Information</h3>
                            <button
                                onClick={() => setShowNewSupplierForm(!showNewSupplierForm)}
                                className="btn btn-sm btn-outline"
                            >
                                {showNewSupplierForm ? 'Cancel' : 'Add New Supplier'}
                            </button>
                        </div>

                        {showNewSupplierForm ? (
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className={styles.inputGroup}>
                                    <label>Supplier Name *</label>
                                    <input
                                        value={newSupplier.name}
                                        onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                                        className={styles.inlineInput}
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Contact Person</label>
                                    <input
                                        value={newSupplier.contactPerson}
                                        onChange={e => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                                        className={styles.inlineInput}
                                        placeholder="Name"
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Email</label>
                                    <input
                                        value={newSupplier.email}
                                        onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                                        className={styles.inlineInput}
                                        placeholder="email@company.com"
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Phone</label>
                                    <input
                                        value={newSupplier.phone}
                                        onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                                        className={styles.inlineInput}
                                        placeholder="+212 ..."
                                    />
                                </div>
                                <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                    <button onClick={handleCreateSupplier} className="btn btn-primary w-full">Save Supplier & Select</button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.inputGroup}>
                                <label>Select Supplier *</label>
                                <select
                                    value={supplierId}
                                    onChange={e => setSupplierId(e.target.value)}
                                    className={styles.inlineInput}
                                >
                                    <option value="">Choose a supplier...</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.contactPerson})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </section>

                    {/* ITEMS SECTION */}
                    <section className={styles.infoSection}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={styles.sectionTitle} style={{ border: 'none', marginBottom: 0 }}><ShoppingBag size={16} /> Products to Purchase</h3>
                            <button onClick={() => setShowProductGallery(true)} className="btn btn-accent btn-sm">
                                <Plus size={16} /> Add Product
                            </button>
                        </div>

                        <table className={styles.managementTable}>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Buy Price</th>
                                    <th>Qty</th>
                                    <th>Subtotal</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => {
                                    const product = products.find(p => p.id === item.productId);
                                    return (
                                        <tr key={item.productId}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    {product?.image && <img src={product.image} className={styles.imageCell} alt="" />}
                                                    <div className="font-bold">{product?.title || 'Unknown'}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.buyPrice}
                                                    onChange={(e) => updateItem(item.productId, item.quantity, parseFloat(e.target.value))}
                                                    className={styles.inlineInput}
                                                    style={{ width: '90px' }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.productId, parseInt(e.target.value), item.buyPrice)}
                                                    className={styles.inlineInput}
                                                    style={{ width: '60px' }}
                                                />
                                            </td>
                                            <td className="font-bold">{formatCurrency(item.buyPrice * item.quantity)}</td>
                                            <td>
                                                <button onClick={() => removeItem(item.productId)} className={styles.deleteBtn}><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-slate-400 italic">No products added yet.</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} className="text-right p-4 font-bold">Total Investment</td>
                                    <td colSpan={2} className="p-4 font-extrabold text-blue-600 text-xl">{formatCurrency(total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>


                </div>

                <footer className={styles.modalFooter}>
                    <button onClick={onClose} className="btn btn-outline" style={{ marginRight: 'auto' }}>
                        Cancel
                    </button>
                    <button
                        onClick={() => handleCreatePO('draft')}
                        disabled={isSaving || items.length === 0 || !supplierId}
                        className="btn btn-outline"
                    >
                        Create Draft PO
                    </button>
                    <button
                        onClick={() => handleCreatePO('in_progress')}
                        disabled={isSaving || items.length === 0 || !supplierId}
                        className="btn btn-primary"
                        style={{ minWidth: '160px' }}
                    >
                        {isSaving ? 'Creating...' : <><PlusCircle size={18} /> Create PO</>}
                    </button>
                </footer>

                {/* Product Gallery */}
                {showProductGallery && (
                    <div className={styles.productGallery}>
                        <header className={styles.modalHeader}>
                            <h3 className="font-bold">Select Products</h3>
                            <button onClick={() => { setShowProductGallery(false); setSearchQuery(''); }} className={styles.closeBtn}><X size={20} /></button>
                        </header>

                        <div className={styles.gallerySearchWrapper}>
                            <Search size={18} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search products..."
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
                                All
                            </button>
                            {allCategories.map(cat => (
                                <button
                                    key={cat}
                                    className={`${styles.filterPill} ${selectedCategory === cat ? styles.active : ''} `}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className={styles.galleryBody}>
                            {filteredProducts.map(p => (
                                <div key={p.id} className={styles.galleryItem} onClick={() => addItem(p.id)} style={{ position: 'relative' }}>
                                    {p.image && <img src={p.image} className={styles.galleryThumb} alt="" />}
                                    <div style={{ flex: 1, paddingRight: '2rem' }}>
                                        <div className={styles.galleryTitle}>{p.title}</div>
                                        <div className={styles.galleryPrice}>Sell: {formatCurrency(p.price || 0)}</div>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); setPreviewProduct(p); }}
                                        className={styles.previewBtn}
                                        style={{
                                            position: 'absolute',
                                            bottom: '12px',
                                            right: '12px',
                                            padding: '4px',
                                            background: 'white',
                                            borderRadius: '6px',
                                            border: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            zIndex: 10
                                        }}
                                        title="View Details"
                                    >
                                        <Eye size={14} color="var(--color-primary)" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* IMAGE PREVIEW LIGHTBOX */}
            {previewProduct && (
                <div className={styles.confirmOverlay} style={{ zIndex: 2000 }} onClick={() => setPreviewProduct(null)}>
                    <div
                        className={styles.confirmCard}
                        style={{
                            maxWidth: '600px',
                            padding: 0,
                            overflow: 'hidden',
                            background: 'white'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ position: 'relative' }}>
                            <img src={previewProduct.image} alt={previewProduct.title} style={{ width: '100%', maxHeight: '450px', objectFit: 'contain' }} />
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
                        <div style={{ padding: '1.5rem', background: 'white' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{previewProduct.title}</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.5rem 0 1rem 0' }}>{previewProduct.description}</p>
                            <div className="flex justify-between items-center">
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency(previewProduct.price || 0)} <span className="text-sm text-slate-400 font-normal">(Sell Price)</span></span>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => { addItem(previewProduct.id); setPreviewProduct(null); }}
                                >
                                    Add to Purchase Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
