'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { saveAttributeAction, deleteAttributeAction } from '@/app/actions';
import styles from '../../Admin.module.css';

interface Attribute {
    id: string;
    name: string;
    values: string[];
}

export default function AttributesPage({
    initialAttributes
}: {
    initialAttributes: Attribute[];
}) {
    const [attributes, setAttributes] = useState(initialAttributes);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ id?: string; name: string; values: string }>({ name: '', values: '' });

    // Sync state with props when server revalidates
    useEffect(() => {
        setAttributes(initialAttributes);
    }, [initialAttributes]);

    // New Attribute State
    const [newName, setNewName] = useState('');
    const [newValues, setNewValues] = useState<string[]>([]);
    const [curValInput, setCurValInput] = useState('');

    const handleValueInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.includes(',')) {
            const parts = val.split(',');
            const newTags = parts.map(p => p.trim()).filter(Boolean);
            if (newTags.length > 0) {
                setNewValues(prev => [...prev, ...newTags]);
            }
            setCurValInput('');
        } else {
            setCurValInput(val);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && curValInput.trim()) {
            e.preventDefault();
            setNewValues(prev => [...prev, curValInput.trim()]);
            setCurValInput('');
        } else if (e.key === 'Backspace' && !curValInput && newValues.length > 0) {
            setNewValues(prev => prev.slice(0, -1));
        }
    };

    const removeNewValue = (index: number) => {
        setNewValues(prev => prev.filter((_, i) => i !== index));
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this attribute?')) {
            await deleteAttributeAction(id);
        }
    };

    const handleEdit = (attr: Attribute) => {
        setIsEditing(attr.id);
        setEditForm({ id: attr.id, name: attr.name, values: attr.values.join(', ') });
    };

    const handleCancel = () => {
        setIsEditing(null);
        setEditForm({ name: '', values: '' });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header} style={{ marginBottom: '2rem' }}>
                <h1 className={styles.title} style={{ marginBottom: '0.5rem' }}>Attributes</h1>
                <p className={styles.subtitle}>Manage global product attributes (e.g., Color, Size)</p>
            </div>

            <div className={styles.cardSection}>
                <div className={styles.sectionHeader} style={{ marginBottom: '1rem' }}>
                    <h2 className={styles.sectionTitle} style={{ marginBottom: 0, border: 'none' }}>Add New Attribute</h2>
                </div>
                <div>
                    <form action={async (formData) => {
                        await saveAttributeAction(formData);
                        // Reset form state on success (optimistic UI or simple reset)
                        setNewName('');
                        setNewValues([]);
                    }} className={styles.formRow} style={{ alignItems: 'flex-start' }}>
                        <div className={styles.formGroup} style={{ flex: 1 }}>
                            <label className={styles.label}>Attribute Name</label>
                            <input
                                name="name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g. Material"
                                className={styles.input}
                                required
                            />
                        </div>
                        <div className={styles.formGroup} style={{ flex: 2 }}>
                            <label className={styles.label}>Attribute Values</label>
                            <div className={styles.input} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                                {newValues.map((val, idx) => (
                                    <span key={idx} className={styles.filterPill} style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#eff6ff', color: '#2563eb', borderColor: '#dbeafe' }}>
                                        {val}
                                        <button type="button" onClick={() => removeNewValue(idx)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                                            <X size={12} color="#2563eb" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    value={curValInput}
                                    onChange={handleValueInput}
                                    onKeyDown={handleKeyDown}
                                    placeholder={newValues.length === 0 ? "Type values and press comma..." : ""}
                                    style={{ border: 'none', outline: 'none', flex: 1, minWidth: '120px', background: 'transparent', fontSize: '0.9375rem' }}
                                    disabled={!newName.trim()}
                                />
                            </div>
                            {/* Hidden input to submit the values array */}
                            <input type="hidden" name="values" value={newValues.join(',')} />
                            {!newName.trim() && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fill name first to add values</span>}
                        </div>
                        <button type="submit" className={styles.submitBtn} style={{ marginTop: '1.7rem' }} disabled={!newName.trim() || newValues.length === 0}>
                            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Add Attribute
                        </button>
                    </form>
                </div>
            </div>

            <div className={styles.cardSection} style={{ marginTop: '3rem' }}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Values</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attributes.length === 0 ? (
                            <tr>
                                <td colSpan={3} className={styles.empty}>No attributes found.</td>
                            </tr>
                        ) : (
                            attributes.map(attr => (
                                <tr key={attr.id}>
                                    <td>
                                        {isEditing === attr.id ? (
                                            <input
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                className={styles.input}
                                                autoFocus
                                            />
                                        ) : (
                                            <span style={{ fontWeight: 500 }}>{attr.name}</span>
                                        )}
                                    </td>
                                    <td>
                                        {isEditing === attr.id ? (
                                            <div className={styles.input} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', minHeight: '42px' }}>
                                                {editForm.values.split(', ').filter(Boolean).map((val, idx) => (
                                                    <span key={idx} className={styles.filterPill || 'filterPill'} style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#eff6ff', color: '#2563eb', borderColor: '#dbeafe', borderRadius: '1rem', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>
                                                        {val}
                                                        <button type="button" onClick={() => {
                                                            const currentVals = editForm.values.split(', ').filter(Boolean);
                                                            const newVals = currentVals.filter((_, i) => i !== idx).join(', ');
                                                            setEditForm({ ...editForm, values: newVals });
                                                        }} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                                                            <X size={12} color="#2563eb" />
                                                        </button>
                                                    </span>
                                                ))}
                                                <input
                                                    placeholder={!editForm.values ? "Type & press comma..." : ""}
                                                    style={{ border: 'none', outline: 'none', flex: 1, minWidth: '100px', background: 'transparent', fontSize: '0.9rem' }}
                                                    onKeyDown={(e) => {
                                                        const target = e.currentTarget;
                                                        if ((e.key === 'Enter' || e.key === ',') && target.value.trim()) {
                                                            e.preventDefault();
                                                            const valToAdd = target.value.trim().replace(/,$/, '');
                                                            const currentVals = editForm.values ? editForm.values.split(', ').filter(Boolean) : [];
                                                            if (valToAdd && !currentVals.includes(valToAdd)) {
                                                                const newVals = [...currentVals, valToAdd].join(', ');
                                                                setEditForm({ ...editForm, values: newVals });
                                                                target.value = '';
                                                            }
                                                            target.value = '';
                                                        } else if (e.key === 'Backspace' && !target.value && editForm.values) {
                                                            const currentVals = editForm.values.split(', ').filter(Boolean);
                                                            if (currentVals.length > 0) {
                                                                const newVals = currentVals.slice(0, -1).join(', ');
                                                                setEditForm({ ...editForm, values: newVals });
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {attr.values.map((v, i) => (
                                                    <span key={i} className={styles.filterPill} style={{ cursor: 'default' }}>{v}</span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {isEditing === attr.id ? (
                                            <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                                                <form action={saveAttributeAction}>
                                                    <input type="hidden" name="id" value={editForm.id} />
                                                    <input type="hidden" name="name" value={editForm.name} />
                                                    <input type="hidden" name="values" value={editForm.values} />
                                                    <button type="submit" className={styles.actionBtn} style={{ color: '#10b981', borderColor: '#10b981', padding: '0.4rem' }}>
                                                        <Check size={16} />
                                                    </button>
                                                </form>
                                                <button onClick={handleCancel} className={styles.actionBtn} style={{ color: '#ef4444', borderColor: '#ef4444', padding: '0.4rem' }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleEdit(attr)} className={styles.editBtn}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(attr.id)} className={styles.deleteBtn}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
