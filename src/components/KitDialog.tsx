'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Kit } from '@/lib/db';
import { saveKitAction } from '@/app/actions';
import { X, Search, Plus, Trash2, Save, Package } from 'lucide-react';
import styles from '../app/(admin)/admin/Admin.module.css';

interface KitDialogProps {
    products: Product[];
    onClose: () => void;
    existingKit?: Kit;
    kits?: Kit[];
}

export default function KitDialog({ products, onClose, existingKit, kits }: KitDialogProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [targetProductId, setTargetProductId] = useState(existingKit?.targetProductId || '');
    const [reference, setReference] = useState(existingKit?.reference || '');
    const [outputQuantity, setOutputQuantity] = useState(existingKit?.outputQuantity || 1);
    const [components, setComponents] = useState<{ productId: string; quantity: number }[]>(existingKit?.components || []);

    // Selection State
    const [showProductSelector, setShowProductSelector] = useState<'target' | 'component' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const targetProduct = products.find(p => p.id === targetProductId);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))) &&
            (!p.status || p.status === 'live')
        );
    }, [products, searchQuery]);

    const handleSelectProduct = (product: Product) => {
        if (showProductSelector === 'target') {
            setTargetProductId(product.id);
            if (!reference && product.sku) {
                setReference(product.sku + '-KIT');
            }
        } else if (showProductSelector === 'component') {
            const existing = components.find(c => c.productId === product.id);
            if (existing) {
                setComponents(components.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c));
            } else {
                setComponents([...components, { productId: product.id, quantity: 1 }]);
            }
        }
        setShowProductSelector(null);
        setSearchQuery('');
    };

    const updateComponentQuantity = (productId: string, qty: number) => {
        if (qty < 1) return;
        setComponents(components.map(c => c.productId === productId ? { ...c, quantity: qty } : c));
    };

    const removeComponent = (productId: string) => {
        setComponents(components.filter(c => c.productId !== productId));
    };

    const handleSave = async () => {
        if (!targetProductId) {
            alert('Please select a target product for the kit.');
            return;
        }
        if (!reference) {
            alert('Please enter a reference code.');
            return;
        }
        if (components.length === 0) {
            alert('Please add at least one component.');
            return;
        }

        setIsSaving(true);
        const kit: Kit = {
            id: existingKit?.id || Math.random().toString(36).substr(2, 9),
            targetProductId,
            reference,
            outputQuantity,
            components
        };

        try {
            await saveKitAction(kit);
            router.refresh();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to save kit');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1500 }}>
            <div className={styles.orderModal} style={{ maxWidth: '900px' }}>
                <header className={styles.modalHeader}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.modalTitle}>{existingKit ? 'Edit Kit' : 'New Kit Definition'}</h2>
                        <span className={styles.modalSubtitle}>Configure product bundles and manufacturing recipes</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
                </header>

                <div className={styles.modalBody}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Target Product Section */}
                        <div className={styles.infoSection}>
                            <h3 className={styles.sectionTitle}>
                                <Package size={18} className="text-blue-600" /> Target Product
                            </h3>

                            {targetProduct ? (
                                <div className={styles.kitTargetCard}>
                                    <img src={targetProduct.image || '/placeholder.png'} className={styles.kitTargetCardImage} alt="" />
                                    <div className={styles.kitTargetCardContent}>
                                        <div className={styles.cardTitle} style={{ fontSize: '1.125rem' }}>{targetProduct.title}</div>
                                        <div className={styles.cardSku}>SKU: {targetProduct.sku || 'N/A'}</div>
                                    </div>
                                    <button
                                        onClick={() => setTargetProductId('')}
                                        className={styles.deleteBtn}
                                        title="Remove Target Product"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowProductSelector('target')}
                                    className={styles.dashedPlaceholder}
                                >
                                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                                        <Plus size={32} />
                                    </div>
                                    <div className="text-center">
                                        <span className="block font-bold text-slate-700">Select Target Product</span>
                                        <span className="text-sm text-slate-400">The product this kit creates</span>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Configuration Section */}
                        <div className={styles.infoSection}>
                            <h3 className={styles.sectionTitle}>
                                <Package size={18} className="text-purple-600" /> Configuration
                            </h3>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Internal Reference</label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    className={styles.input}
                                    placeholder="e.g. KIT-001"
                                />
                                <p className="text-xs text-slate-500">A unique code to identify this kit in the system.</p>
                            </div>
                            <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
                                <label className={styles.label}>Output Quantity</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        value={outputQuantity}
                                        onChange={e => setOutputQuantity(parseInt(e.target.value) || 1)}
                                        className={styles.input}
                                        style={{ width: '120px' }}
                                    />
                                    <span className="text-sm text-slate-500 font-medium">unit(s) created per kit</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Components Section */}
                    <div>
                        <div className="flex justify-between items-end border-b border-slate-100 pb-4" style={{ marginBottom: '32px' }}>
                            <div>
                                <h3 className={styles.sectionTitle} style={{ border: 'none', margin: 0, padding: 0 }}>Components</h3>
                                <p className="text-sm text-slate-500 mt-1">Raw materials required to assemble one unit</p>
                            </div>
                            <button
                                onClick={() => setShowProductSelector('component')}
                                className={styles.actionBtn}
                            >
                                <Plus size={16} className="mr-2" /> Add Component
                            </button>
                        </div>

                        <div className={styles.dialogTableWrapper}>
                            <table className={styles.dialogTable}>
                                <thead>
                                    <tr>
                                        <th className="pl-6">Component Product</th>
                                        <th className="text-center w-32">Qty Needed</th>
                                        <th className="w-16"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {components.map(comp => {
                                        const p = products.find(prod => prod.id === comp.productId);
                                        return (
                                            <tr key={comp.productId}>
                                                <td className="pl-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200" style={{ width: '40px', height: '40px' }}>
                                                            {p?.image && <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-800">{p?.title || 'Unknown Product'}</div>
                                                            <div className="text-xs text-slate-500 font-mono">{p?.sku}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={comp.quantity}
                                                        onChange={e => updateComponentQuantity(comp.productId, parseInt(e.target.value) || 1)}
                                                        className={styles.qtyInput}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        onClick={() => removeComponent(comp.productId)}
                                                        className={styles.deleteBtn}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {components.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="text-center py-16 text-slate-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                                        <Package size={32} className="text-slate-300" />
                                                    </div>
                                                    <p className="font-medium text-slate-500">No components added yet</p>
                                                    <button
                                                        onClick={() => setShowProductSelector('component')}
                                                        className="hover:border-blue-500 hover:text-blue-600 transition-all"
                                                        style={{
                                                            marginTop: '0.5rem',
                                                            padding: '8px 16px',
                                                            backgroundColor: 'white',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            color: '#334155',
                                                            fontWeight: '700',
                                                            fontSize: '0.875rem',
                                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Plus size={16} />
                                                        Add your first component
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <footer className={styles.modalFooter}>
                    <button onClick={onClose} className={styles.actionBtn}>Cancel</button>
                    <button
                        onClick={handleSave}
                        className={styles.submitBtn}
                        disabled={isSaving}
                    >
                        <Save size={18} className="mr-2" /> {isSaving ? 'Saving...' : 'Save Kit Definition'}
                    </button>
                </footer>
            </div>

            {/* Product Selector Overlay - Rebuilt */}
            {showProductSelector && (
                <div className={styles.selectorOverlay}>
                    <header className={styles.selectorHeader}>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Select {showProductSelector === 'target' ? 'Target Product' : 'Component'}</h3>
                            <p className="text-slate-500 text-sm">Search and select a product from your catalog</p>
                        </div>
                        <button onClick={() => setShowProductSelector(null)} className={styles.closeBtn}>
                            <X size={24} />
                        </button>
                    </header>

                    <div className="bg-white border-b border-slate-200 px-4" style={{ paddingTop: '50px', paddingBottom: '24px' }}>
                        <div className={styles.searchBarWrapper}>
                            <Search className={styles.searchIcon} size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or SKU..."
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className={styles.selectorBody}>
                        <div className={styles.productGrid}>
                            {filteredProducts.map(p => {
                                const isUsedInOtherKit = kits?.some(k => k.targetProductId === p.id && k.id !== existingKit?.id);
                                const isDisabled =
                                    (showProductSelector === 'component' && p.id === targetProductId) ||
                                    (showProductSelector === 'target' && (components.some(c => c.productId === p.id) || isUsedInOtherKit));

                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => !isDisabled && handleSelectProduct(p)}
                                        disabled={isDisabled}
                                        className={`${styles.selectionCard} ${isDisabled ? styles.disabled : ''}`}
                                    >
                                        <div className={styles.cardImageWrapper}>
                                            <img src={p.image || '/placeholder.png'} className={styles.cardImage} alt="" />
                                        </div>
                                        <div className={styles.cardContent}>
                                            <div className={styles.cardTitle} title={p.title}>{p.title}</div>
                                            <div className={styles.cardSku}>{p.sku || 'No SKU'}</div>
                                            <div className={styles.cardPrice}>${p.price}</div>
                                            {isDisabled && (
                                                <div className="mt-2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                                                    {isUsedInOtherKit ? 'Kit Already Exists' : 'Already In Kit'}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}

                            {filteredProducts.length === 0 && (
                                <div className="col-span-full text-center py-20">
                                    <div className="flex flex-col items-center gap-4 text-slate-400">
                                        <Search size={48} strokeWidth={1} />
                                        <p className="text-lg">No products found for "{searchQuery}"</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
