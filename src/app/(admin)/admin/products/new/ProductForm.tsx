'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Plus, Image as ImageIcon, Layout, Box, Link as LinkIcon,
    Settings, Bold, Italic, List, Maximize2, Trash2, Search, X, Check, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import styles from '../../Admin.module.css';
import { addProductAction } from '@/app/actions';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface ProductFormProps {
    categories: any[];
    brands: any[];
    products: any[];
    globalAttributes: any[];
    initialData?: any; // Add initialData prop
    hideBackButton?: boolean;
}

export default function ProductForm({ categories, brands, products, globalAttributes, initialData, hideBackButton = false }: ProductFormProps) {
    const [activeTab, setActiveTab] = useState('general');
    // Initialize state with initialData if available
    const [description, setDescription] = useState(initialData?.description || '');
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [mainImage, setMainImage] = useState<string | null>(initialData?.image || null);
    const [gallery, setGallery] = useState<string[]>(initialData?.gallery || []);
    const [isLinkedModalOpen, setIsLinkedModalOpen] = useState(false);
    const [linkedType, setLinkedType] = useState<'upsells' | 'crossSells' | 'frequentlyBoughtTogether'>('upsells');

    // Parse initial linked products or default to empty
    const [selectedLinked, setSelectedLinked] = useState<Record<string, string[]>>({
        upsells: initialData?.linkedProducts?.upsells || [],
        crossSells: initialData?.linkedProducts?.crossSells || [],
        frequentlyBoughtTogether: initialData?.linkedProducts?.frequentlyBoughtTogether || [],
    });

    // Parse initial attributes or use empty array
    const [attributes, setAttributes] = useState<{ name: string; values: string[] }[]>(initialData?.attributes || []);
    const [searchTerm, setSearchTerm] = useState('');

    // Categories hierarchy helper
    const buildHierarchy = (parentId: string | undefined = undefined, level = 0): any[] => {
        return categories
            .filter(cat => cat.parentId === parentId)
            .map(cat => [
                { ...cat, level },
                ...buildHierarchy(cat.id, level + 1)
            ])
            .flat();
    };
    const hierarchicalCategories = buildHierarchy();

    // Quill modules
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'script': 'sub' }, { 'script': 'super' }],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }, { 'align': [] }],
            ['link', 'image', 'video'],
            ['clean']
        ],
    };

    // Simulated File Upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'gallery') => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                if (type === 'main') setMainImage(base64String);
                else setGallery(prev => [...prev, base64String]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeGalleryImage = (index: number) => {
        setGallery(prev => prev.filter((_, i) => i !== index));
    };

    // Linked Products Modal logic
    const toggleLinkedProduct = (id: string) => {
        setSelectedLinked(prev => {
            const current = (prev as any)[linkedType];
            const updated = current.includes(id)
                ? current.filter((item: string) => item !== id)
                : [...current, id];
            return { ...prev, [linkedType]: updated };
        });
    };

    // Attributes Logic
    const addAttribute = () => {
        setAttributes(prev => [...prev, { name: '', values: [] }]);
    };

    const updateAttribute = (index: number, field: 'name' | 'values', value: any) => {
        setAttributes(prev => {
            const newAttrs = [...prev];
            if (field === 'name') {
                newAttrs[index].name = value;
            } else {
                newAttrs[index].values = value; // Expecting array here
            }
            return newAttrs;
        });
    };

    const handleValueKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, currentInput: string) => {
        if ((e.key === 'Enter' || e.key === ',') && currentInput.trim()) {
            e.preventDefault();
            const valToAdd = currentInput.trim().replace(/,$/, '');
            if (valToAdd) {
                const currentValues = attributes[index].values;
                if (!currentValues.includes(valToAdd)) {
                    updateAttribute(index, 'values', [...currentValues, valToAdd]);
                }
                // Clear the input needs to happen in render logic or controlled input state
                // Since mapped inputs are tricky, we'll handle this by clearing the event target value if possible
                // OR better, manage a separate state for inputs. For simplicity in this list, we might need a local state map
            }
        } else if (e.key === 'Backspace' && !currentInput && attributes[index].values.length > 0) {
            const currentValues = attributes[index].values;
            updateAttribute(index, 'values', currentValues.slice(0, -1));
        }
    };

    const removeAttribute = (index: number) => {
        setAttributes(prev => prev.filter((_, i) => i !== index));
    };

    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            {!hideBackButton && (
                <div style={{ marginBottom: '1rem' }}>
                    <Link href="/admin/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
                        <ArrowLeft size={16} /> Back to Products
                    </Link>
                </div>
            )}
            <form action={addProductAction}>
                <input type="hidden" name="id" value={initialData?.id || ''} /> {/* Hidden ID for updates */}
                {/* Hidden Inputs for state-managed fields */}
                <input type="hidden" name="description" value={description} />
                <input type="hidden" name="image" value={mainImage || ''} />
                {gallery.map((img, i) => <input key={i} type="hidden" name="gallery" value={img} />)}
                {Object.entries(selectedLinked).map(([type, ids]) =>
                    ids.map(id => <input key={`${type}-${id}`} type="hidden" name={type} value={id} />)
                )}
                <input type="hidden" name="attributes" value={JSON.stringify(attributes)} />

                <div className={styles.responsiveGrid}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Title Section */}
                        <div className={styles.cardSection}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Product Title</label>
                                <input
                                    name="title"
                                    required
                                    className={styles.input}
                                    style={{ fontSize: '1.25rem', fontWeight: 600 }}
                                    placeholder="Enter product title..."
                                    defaultValue={initialData?.title}
                                />
                            </div>
                        </div>

                        {/* React Quill Editor */}
                        <div className={styles.cardSection} style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <label className={styles.label}>Product Description</label>
                                <button
                                    type="button"
                                    onClick={() => setIsHtmlMode(!isHtmlMode)}
                                    className={styles.actionBtn}
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                                >
                                    {isHtmlMode ? 'Visual Mode' : 'HTML Source'}
                                </button>
                            </div>
                            <div style={{ backgroundColor: 'white', minHeight: '350px', position: 'relative' }}>
                                {isHtmlMode ? (
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className={styles.htmlEditor}
                                        placeholder="Paste or write HTML here..."
                                    />
                                ) : (
                                    <ReactQuill
                                        theme="snow"
                                        value={description}
                                        onChange={setDescription}
                                        modules={modules}
                                        className="premium-quill"
                                        style={{ height: '300px', marginBottom: '50px' }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Functional Tabs */}
                        <div className={styles.cardSection} style={{ padding: '0' }}>
                            <div className={styles.tabsContainer} style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
                                {[
                                    { id: 'general', icon: Settings, label: 'General' },
                                    { id: 'inventory', icon: Box, label: 'Inventory' },
                                    { id: 'linked', icon: LinkIcon, label: 'Linked Products' },
                                    { id: 'attributes', icon: Layout, label: 'Attributes' }
                                ].map(tab => (
                                    <div
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={styles.tab}
                                        style={{
                                            padding: '1rem 1.5rem',
                                            borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : 'none',
                                            color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <tab.icon size={16} /> {tab.label}
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ display: activeTab === 'general' ? 'block' : 'none' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Regular Price ($)</label>
                                            <input name="price" type="number" step="0.01" required className={styles.input} defaultValue={initialData?.price} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Sale Price ($)</label>
                                            <input name="salePrice" type="number" step="0.01" className={styles.input} defaultValue={initialData?.salePrice} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: activeTab === 'inventory' ? 'block' : 'none' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                            <div className={styles.formGroup}><label className={styles.label}>SKU</label><input name="sku" className={styles.input} defaultValue={initialData?.sku} /></div>
                                            <div className={styles.formGroup}><label className={styles.label}>Stock Quantity</label><input name="stock" type="number" className={styles.input} defaultValue={initialData?.stock || 0} /></div>

                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem' }}>
                                            <div className={styles.formGroup}><label className={styles.label}>Weight (kg)</label><input name="weight" type="number" className={styles.input} defaultValue={initialData?.weight} /></div>
                                            <div className={styles.formGroup}><label className={styles.label}>Length (cm)</label><input name="length" type="number" className={styles.input} defaultValue={initialData?.dimensions?.length} /></div>
                                            <div className={styles.formGroup}><label className={styles.label}>Width (cm)</label><input name="width" type="number" className={styles.input} defaultValue={initialData?.dimensions?.width} /></div>
                                            <div className={styles.formGroup}><label className={styles.label}>Height (cm)</label><input name="height" type="number" className={styles.input} defaultValue={initialData?.dimensions?.height} /></div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: activeTab === 'linked' ? 'block' : 'none' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {['upsells', 'crossSells', 'frequentlyBoughtTogether'].map(type => (
                                            <div key={type} className={styles.formGroup}>
                                                <label className={styles.label}>{type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                                    {selectedLinked[type as any].map(id => {
                                                        const p = products.find(prod => prod.id === id);
                                                        return (
                                                            <div key={id} style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                                {p?.title}
                                                                <button type="button" onClick={() => toggleLinkedProduct(id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                                                            </div>
                                                        );
                                                    })}
                                                    <button
                                                        type="button"
                                                        onClick={() => { setLinkedType(type as any); setIsLinkedModalOpen(true); }}
                                                        className={styles.actionBtn}
                                                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                    >
                                                        + Select Products
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: activeTab === 'attributes' ? 'block' : 'none' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {attributes.length === 0 && (
                                            <div className={styles.empty} style={{ padding: '2rem', fontSize: '0.9rem' }}>
                                                No attributes added yet. Add specifications like "Color", "Size", or "Material".
                                            </div>
                                        )}

                                        {attributes.map((attr, index) => (
                                            <div key={index} className={styles.formGroup} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <label className={styles.label} style={{ fontSize: '0.75rem', alignSelf: 'center' }}>Attribute #{index + 1}</label>
                                                    <button type="button" onClick={() => removeAttribute(index)} className={styles.deleteBtn} style={{ width: '24px', height: '24px' }}><X size={14} /></button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                                                    <div>
                                                        <input
                                                            placeholder="Name (e.g. Material)"
                                                            className={styles.input}
                                                            value={attr.name}
                                                            onChange={(e) => updateAttribute(index, 'name', e.target.value)}
                                                            list={`attr-suggestions-${index}`}
                                                        />
                                                        <datalist id={`attr-suggestions-${index}`}>
                                                            {globalAttributes.map(ga => (
                                                                <option key={ga.id} value={ga.name} />
                                                            ))}
                                                        </datalist>
                                                    </div>
                                                    <div>
                                                        <div className={styles.input} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', minHeight: '42px' }}>
                                                            {attr.values.map((val, vIdx) => (
                                                                <span key={vIdx} className={styles.filterPill || 'filterPill'} style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#eff6ff', color: '#2563eb', borderColor: '#dbeafe', borderRadius: '1rem', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>
                                                                    {val}
                                                                    <button type="button" onClick={() => updateAttribute(index, 'values', attr.values.filter((_, i) => i !== vIdx))} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                                                                        <X size={12} color="#2563eb" />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                            <input
                                                                placeholder={attr.values.length === 0 ? "Type & press comma..." : ""}
                                                                style={{ border: 'none', outline: 'none', flex: 1, minWidth: '100px', background: 'transparent', fontSize: '0.9rem' }}
                                                                onKeyDown={(e) => {
                                                                    const target = e.currentTarget;
                                                                    if ((e.key === 'Enter' || e.key === ',') && target.value.trim()) {
                                                                        e.preventDefault();
                                                                        const valToAdd = target.value.trim().replace(/,$/, '');
                                                                        if (valToAdd && !attr.values.includes(valToAdd)) {
                                                                            updateAttribute(index, 'values', [...attr.values, valToAdd]);
                                                                            target.value = '';
                                                                        }
                                                                        target.value = ''; // Ensure clear on comma
                                                                    } else if (e.key === 'Backspace' && !target.value && attr.values.length > 0) {
                                                                        updateAttribute(index, 'values', attr.values.slice(0, -1));
                                                                    }
                                                                }}
                                                                list={`val-suggestions-${index}`}
                                                                disabled={!attr.name.trim()}
                                                            />
                                                        </div>
                                                        {globalAttributes.find(ga => ga.name.toLowerCase() === attr.name.toLowerCase()) && (
                                                            <datalist id={`val-suggestions-${index}`}>
                                                                {globalAttributes.find(ga => ga.name.toLowerCase() === attr.name.toLowerCase())?.values.map((v: string) => (
                                                                    <option key={v} value={v} />
                                                                ))}
                                                            </datalist>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={addAttribute}
                                            className={styles.actionBtn}
                                            style={{ alignSelf: 'flex-start' }}
                                        >
                                            <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Attribute
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Publish */}
                        <div className={styles.cardSection}>
                            <h3 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '1rem' }}>Publishing</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <input type="checkbox" name="featured" id="featured" defaultChecked={initialData?.featured} />
                                <label htmlFor="featured">Featured Product</label>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <input type="checkbox" name="isHidden" id="isHidden" defaultChecked={initialData ? !initialData.isVisible : false} />
                                <label htmlFor="isHidden">Hide from Website</label>
                            </div>
                            <button type="submit" className={styles.submitBtn} style={{ width: '100%' }}>
                                <Plus size={18} style={{ marginRight: '0.5rem' }} /> {initialData ? 'Update Product' : 'Create Product'}
                            </button>
                        </div>

                        {/* File Upload Images */}
                        <div className={styles.cardSection}>
                            <h3 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '1.5rem' }}><ImageIcon size={18} /> Product Images</h3>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Main Image</label>
                                <div style={{ marginTop: '0.5rem', border: '2px dashed #e2e8f0', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
                                    {mainImage ? (
                                        <div style={{ position: 'relative' }}>
                                            <img src={mainImage} alt="Main" style={{ width: '100%', borderRadius: '0.5rem' }} />
                                            <button type="button" onClick={() => setMainImage(null)} style={{ position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <label style={{ cursor: 'pointer' }}>
                                            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Click to upload main image</div>
                                            <input type="file" onChange={(e) => handleFileChange(e, 'main')} style={{ display: 'none' }} accept="image/*" />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
                                <label className={styles.label}>Gallery</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {gallery.map((img, i) => (
                                        <div key={i} style={{ position: 'relative' }}>
                                            <img src={img} alt="Gallery" style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '0.5rem' }} />
                                            <button type="button" onClick={() => removeGalleryImage(i)} style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer' }}><X size={10} /></button>
                                        </div>
                                    ))}
                                    <label style={{ height: '60px', border: '2px dashed #e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <Plus size={20} color="#64748b" />
                                        <input type="file" multiple onChange={(e) => handleFileChange(e, 'gallery')} style={{ display: 'none' }} accept="image/*" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Hierarchical Categories Checklist */}
                        <div className={styles.cardSection}>
                            <h3 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '1rem' }}>Categories</h3>
                            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                {hierarchicalCategories.map(cat => (
                                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0', marginLeft: `${cat.level * 1.5}rem` }}>
                                        <input
                                            type="checkbox"
                                            name="categoryIds"
                                            value={cat.id}
                                            id={`cat-${cat.id}`}
                                            defaultChecked={initialData?.categoryIds?.includes(cat.id)}
                                        />
                                        <label htmlFor={`cat-${cat.id}`} style={{ fontSize: '0.9rem', color: cat.level === 0 ? '#000' : '#64748b', fontWeight: cat.level === 0 ? 600 : 400 }}>{cat.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Brands */}
                        <div className={styles.cardSection}>
                            <h3 className={styles.sectionTitle} style={{ fontSize: '1rem', marginBottom: '1rem' }}>Brand</h3>
                            <select name="brandId" className={styles.input} defaultValue={initialData?.brandId || ''}>
                                <option value="">No brand</option>
                                {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </form>

            {/* Linked Products Modal */}
            {isLinkedModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.orderModal} style={{ maxHeight: '80vh', maxWidth: '600px' }}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Select {linkedType}</h2>
                            <button onClick={() => setIsLinkedModalOpen(false)} className={styles.closeBtn}><X size={24} /></button>
                        </div>
                        <div className={styles.gallerySearchWrapper}>
                            <Search size={18} color="#64748b" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.gallerySearchInput}
                                placeholder="Search products..."
                            />
                        </div>
                        <div className={styles.modalBody} style={{ padding: '0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {filteredProducts.map(p => {
                                    const isSelected = (selectedLinked as any)[linkedType].includes(p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => toggleLinkedProduct(p.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 2rem',
                                                borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                                backgroundColor: isSelected ? '#eff6ff' : 'transparent'
                                            }}
                                        >
                                            <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden' }}>
                                                <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.title}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>${p.price}</div>
                                            </div>
                                            {isSelected && <Check size={20} color="#2563eb" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setIsLinkedModalOpen(false)} className={styles.submitBtn} style={{ padding: '0.5rem 2rem' }}>Done</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
