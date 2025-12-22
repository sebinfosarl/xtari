'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, Image as ImageIcon, X, Check } from 'lucide-react';
import { saveBrandAction, deleteBrandAction } from '@/app/actions';
import styles from '../../Admin.module.css';

interface Brand {
    id: string;
    name: string;
    slug: string;
    logo?: string;
}

export default function BrandsClient({ brands }: { brands: Brand[] }) {
    const [logo, setLogo] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ id?: string; name: string; slug: string }>({ name: '', slug: '' });

    const handleEdit = (brand: Brand) => {
        setIsEditing(brand.id);
        setEditForm({ id: brand.id, name: brand.name, slug: brand.slug });
        setLogo(brand.logo || null);
    };

    const handleCancel = () => {
        setIsEditing(null);
        setEditForm({ name: '', slug: '' });
        setLogo(null);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '2rem' }}>
            <div className={styles.tableSection}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Product Brands</h2>
                        <span className={styles.statTrend}>{brands.length} brands total</span>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Brand Name</th>
                                <th>Slug</th>
                                <th>Logo</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brands.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        No brands added yet.
                                    </td>
                                </tr>
                            ) : brands.map(brand => (
                                <tr key={brand.id}>
                                    <td className={styles.bold}>{brand.name}</td>
                                    <td><code>{brand.slug}</code></td>
                                    <td>
                                        {brand.logo ? (
                                            <img src={brand.logo} alt={brand.name} style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px' }} />
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => handleEdit(brand)} className={styles.editBtn}>
                                                <Edit2 size={16} />
                                            </button>
                                            <form action={async () => {
                                                if (confirm('Delete this brand?')) {
                                                    await deleteBrandAction(brand.id);
                                                }
                                            }}>
                                                <button className={styles.deleteBtn}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <aside className={styles.cardSection}>
                <div className={styles.sectionHeader} style={{ marginBottom: '1.5rem', justifyContent: 'space-between' }}>
                    <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>{isEditing ? 'Edit Brand' : 'Add Brand'}</h2>
                    {isEditing && (
                        <button onClick={handleCancel} className={styles.actionBtn} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                            Cancel
                        </button>
                    )}
                </div>
                <form action={async (formData) => {
                    await saveBrandAction(formData);
                    handleCancel(); // Reset form
                }} className={styles.form}>
                    <input type="hidden" name="id" value={editForm.id || ''} />
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Brand Name</label>
                        <input
                            name="name"
                            required
                            className={styles.input}
                            placeholder="e.g. Luxury Home"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Slug</label>
                        <input
                            name="slug"
                            required
                            className={styles.input}
                            placeholder="e.g. luxury-home"
                            value={editForm.slug}
                            onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Brand Logo</label>
                        <input type="hidden" name="logo" value={logo || ''} />
                        <div style={{ marginTop: '0.5rem', border: '2px dashed #e2e8f0', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center', backgroundColor: '#f8fafc', position: 'relative' }}>
                            {logo ? (
                                <div style={{ position: 'relative' }}>
                                    <img src={logo} alt="Logo Preview" style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'contain' }} />
                                    <button
                                        type="button"
                                        onClick={() => setLogo(null)}
                                        style={{
                                            position: 'absolute', top: -10, right: -10,
                                            backgroundColor: '#ef4444', color: 'white',
                                            border: 'none', borderRadius: '50%',
                                            width: '24px', height: '24px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <ImageIcon size={24} color="#94a3b8" />
                                    <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Click to upload logo</div>
                                    <input type="file" onChange={handleLogoChange} style={{ display: 'none' }} accept="image/*" />
                                </label>
                            )}
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn}>
                        {isEditing ? <Check size={18} style={{ marginRight: '0.5rem' }} /> : <Plus size={18} style={{ marginRight: '0.5rem' }} />}
                        {isEditing ? 'Update Brand' : 'Create Brand'}
                    </button>
                </form>
            </aside>
        </div>
    );
}
