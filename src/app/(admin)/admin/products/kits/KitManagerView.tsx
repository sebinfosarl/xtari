
'use client';

import { useState } from 'react';
import { Kit, Product } from '@/lib/db';
import { deleteKitAction } from '@/app/actions';
import { Plus, Package, Trash2, Edit2, Search } from 'lucide-react';
import styles from '../../Admin.module.css';
import KitDialog from '@/components/KitDialog';

interface KitManagerViewProps {
    kits: Kit[];
    products: Product[];
}

export default function KitManagerView({ kits, products }: KitManagerViewProps) {
    const [showDialog, setShowDialog] = useState(false);
    const [editingKit, setEditingKit] = useState<Kit | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredKits = kits.filter(k =>
        k.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        products.find(p => p.id === k.targetProductId)?.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this kit definition?')) {
            await deleteKitAction(id);
        }
    };

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle} style={{ border: 'none', margin: 0, padding: 0 }}>Kit Manager</h2>
                    <p className={styles.statTrend}>{kits.length} kits defined</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={styles.searchBarWrapper} style={{ width: '300px', margin: 0 }}>
                        <Search className={styles.searchIcon} size={20} />
                        <input
                            type="text"
                            placeholder="Search kits..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}
                        />
                    </div>
                    <button
                        onClick={() => { setEditingKit(undefined); setShowDialog(true); }}
                        className={styles.submitBtn}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                    >
                        <Plus size={18} /> Add New Kit
                    </button>
                </div>
            </div>

            <div className={styles.tableSection}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Target Product</th>
                                <th>Reference</th>
                                <th>Output Qty</th>

                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredKits.map(kit => {
                                const targetProduct = products.find(p => p.id === kit.targetProductId);

                                return (
                                    <tr key={kit.id} className="hover:bg-slate-50 transition-colors">
                                        <td>
                                            <div className="flex items-center" style={{ gap: '30px' }}>
                                                <div className="bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200" style={{ width: '48px', height: '48px' }}>
                                                    {targetProduct?.image && <img src={targetProduct.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{targetProduct?.title || 'Unknown Product'}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{targetProduct?.sku}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-mono bg-slate-100 px-3 py-1 rounded-md text-sm font-bold text-slate-600 border border-slate-200">
                                                {kit.reference}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-blue-600 text-lg bg-blue-50 px-3 py-1 rounded-md">{kit.outputQuantity}</span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { setEditingKit(kit); setShowDialog(true); }}
                                                    className={styles.editBtn}
                                                    title="Edit Kit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(kit.id)}
                                                    className={styles.deleteBtn}
                                                    title="Delete Kit"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredKits.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-4 text-slate-300">
                                            <Package size={64} strokeWidth={1} />
                                            <div className="text-center">
                                                <p className="text-xl font-semibold text-slate-400">No kits found</p>
                                                <p className="text-sm text-slate-400 mt-1">Get started by creating your first product kit</p>
                                            </div>
                                            <button
                                                onClick={() => { setEditingKit(undefined); setShowDialog(true); }}
                                                className={styles.submitBtn}
                                            >
                                                Create New Kit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showDialog && (
                <KitDialog
                    products={products}
                    existingKit={editingKit}
                    kits={kits}
                    onClose={() => setShowDialog(false)}
                />
            )}
        </div>
    );
}
