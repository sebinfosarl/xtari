
'use client';

import { useState } from 'react';
import { SalesPerson } from '@/lib/db';
import { saveSalesPersonAction, deleteSalesPersonAction } from '@/app/actions';
import {
    Plus, Trash2, Edit2, Mail, Phone,
    MapPin, User, FileText, Upload, Save, X,
    IdCard, Briefcase
} from 'lucide-react';
import styles from '../Admin.module.css';

export default function SalesTeamView({ initialSalesPeople }: { initialSalesPeople: SalesPerson[] }) {
    const [people, setPeople] = useState(initialSalesPeople);
    const [editingPerson, setEditingPerson] = useState<SalesPerson | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'signature' | 'cachet') => {
        const file = e.target.files?.[0];
        if (file && editingPerson) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditingPerson({
                    ...editingPerson,
                    [field]: reader.result as string
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (person: SalesPerson) => {
        await saveSalesPersonAction(person);
        if (isAdding) {
            setPeople([...people, person]);
            setIsAdding(false);
        } else {
            setPeople(people.map(p => p.id === person.id ? person : p));
        }
        setEditingPerson(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this sales person?')) {
            await deleteSalesPersonAction(id);
            setPeople(people.filter(p => p.id !== id));
        }
    };

    const startAdd = () => {
        const newPerson: SalesPerson = {
            id: Math.random().toString(36).substr(2, 9),
            fullName: '',
            cnie: '',
            address: '',
            ice: '',
            if: '',
            tp: '',
            tel: '',
            email: '',
        };
        setEditingPerson(newPerson);
        setIsAdding(true);
    };

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Sales Team Management</h2>
                <button onClick={startAdd} className="btn btn-primary">
                    <Plus size={20} /> Add New Member
                </button>
            </header>

            <div className="flex flex-col gap-4 mt-8">
                {people.map(person => (
                    <div
                        key={person.id}
                        className={styles.cardSection}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1.25rem 2rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            background: '#ffffff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    >
                        {/* LEFT: INFO */}
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                                <User size={28} />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-slate-900">{person.fullName || 'Unnamed Member'}</h3>
                                <p className="text-sm text-slate-500 font-medium">Sales Representative</p>
                            </div>
                        </div>

                        {/* RIGHT: ACTIONS */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setEditingPerson(person)}
                                style={{
                                    minWidth: '150px',
                                    padding: '14px 28px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: 'white',
                                    fontWeight: '700',
                                    fontSize: '15px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                }}
                            >
                                <Edit2 size={20} strokeWidth={2.5} /> Edit
                            </button>
                            <button
                                onClick={() => handleDelete(person.id)}
                                style={{
                                    minWidth: '150px',
                                    padding: '14px 28px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    color: 'white',
                                    fontWeight: '700',
                                    fontSize: '15px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                                }}
                            >
                                <Trash2 size={20} strokeWidth={2.5} /> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {editingPerson && (
                <div className={styles.modalOverlay}>
                    <div className={styles.orderModal} style={{ maxWidth: '600px', height: 'auto', maxHeight: '90vh' }}>
                        <header className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{isAdding ? 'Add Member' : 'Edit Profile'}</h3>
                            <button onClick={() => { setEditingPerson(null); setIsAdding(false); }} className={styles.closeBtn}><X size={24} /></button>
                        </header>

                        <div className={styles.modalBody}>
                            <div className="grid grid-cols-1 gap-4">
                                <div className={styles.inputGroup}>
                                    <label>Full Name</label>
                                    <input className={styles.inlineInput} value={editingPerson.fullName} onChange={e => setEditingPerson({ ...editingPerson, fullName: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={styles.inputGroup}>
                                        <label>Email Address</label>
                                        <input className={styles.inlineInput} value={editingPerson.email} onChange={e => setEditingPerson({ ...editingPerson, email: e.target.value })} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Phone Number</label>
                                        <input className={styles.inlineInput} value={editingPerson.tel} onChange={e => setEditingPerson({ ...editingPerson, tel: e.target.value })} />
                                    </div>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>CNIE</label>
                                    <input className={styles.inlineInput} value={editingPerson.cnie} onChange={e => setEditingPerson({ ...editingPerson, cnie: e.target.value })} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Address</label>
                                    <textarea className={styles.inlineInput} value={editingPerson.address} onChange={e => setEditingPerson({ ...editingPerson, address: e.target.value })} rows={2} />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className={styles.inputGroup}>
                                        <label>ICE</label>
                                        <input className={styles.inlineInput} value={editingPerson.ice} onChange={e => setEditingPerson({ ...editingPerson, ice: e.target.value })} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>IF</label>
                                        <input className={styles.inlineInput} value={editingPerson.if} onChange={e => setEditingPerson({ ...editingPerson, if: e.target.value })} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>TP</label>
                                        <input className={styles.inlineInput} value={editingPerson.tp} onChange={e => setEditingPerson({ ...editingPerson, tp: e.target.value })} />
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label>Signature Image</label>
                                    <div className="flex flex-col gap-2">
                                        {editingPerson.signature && <img src={editingPerson.signature} className="h-32 object-contain bg-white border rounded p-1 w-fit" alt="Preview" />}
                                        <label className="btn btn-outline btn-sm cursor-pointer !w-full">
                                            <Upload size={14} /> Upload Signature
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'signature')} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <footer className={styles.modalFooter}>
                            <button onClick={() => handleSave(editingPerson)} className="btn btn-primary flex-1">
                                <Save size={20} /> Save Profile
                            </button>
                            <button onClick={() => { setEditingPerson(null); setIsAdding(false); }} className="btn btn-outline flex-1">Cancel</button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
