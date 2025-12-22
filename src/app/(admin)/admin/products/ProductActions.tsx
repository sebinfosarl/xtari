'use client';

import { useState, useRef } from 'react';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteProductAction } from '@/app/actions';
import styles from '../Admin.module.css';

export default function ProductActions({ productId }: { productId: string }) {
    const [isOpen, setIsOpen] = useState(false);

    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleOpen = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // If less than 150px below, show on top
            setPosition(spaceBelow < 150 ? 'top' : 'bottom');
        }
        setIsOpen(!isOpen);
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                ref={buttonRef}
                onClick={toggleOpen}
                className={styles.eyeBtn}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            >
                <MoreVertical size={16} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: position === 'bottom' ? '100%' : 'auto',
                    bottom: position === 'top' ? '100%' : 'auto',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    zIndex: 50,
                    minWidth: '120px',
                    padding: '0.25rem'
                }}>
                    <Link
                        href={`/admin/products/edit/${productId}`}
                        className={styles.actionBtn}
                        style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            border: 'none',
                            marginBottom: '0.25rem',
                            textDecoration: 'none',
                            color: '#64748b'
                        }}
                    >
                        <Edit size={14} style={{ marginRight: '0.5rem' }} /> Edit
                    </Link>

                    <form action={async () => {
                        if (confirm('Are you sure you want to delete this product?')) {
                            // Since we are in a form, we need to bind the ID or use a hidden input
                            // But for server actions in client components, we can just call it if it takes simple args, 
                            // OR better, pass FormData to match the server action signature if it expects it.
                            // The current deleteProductAction in actions.ts expects FormData (based on previous view).
                            // Let's check actions.ts again to be sure, but standard pattern is a form.
                            const formData = new FormData();
                            formData.append('id', productId);
                            await deleteProductAction(formData);
                            setIsOpen(false);
                        }
                    }}>
                        <button
                            type="submit"
                            className={styles.actionBtn}
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                border: 'none',
                                color: '#ef4444'
                            }}
                        >
                            <Trash2 size={14} style={{ marginRight: '0.5rem' }} /> Delete
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
