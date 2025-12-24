'use client';

import { useState, useRef } from 'react';
import { MoreVertical, Edit } from 'lucide-react';
import Link from 'next/link';
import { updateProductStatusAction } from '@/app/actions';
import styles from '../Admin.module.css';

export default function ProductActions({ productId, isLast, productStatus }: { productId: string, isLast?: boolean, productStatus?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleOpen = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const MENU_HEIGHT_ESTIMATE = 160;

            const newStyle: React.CSSProperties = {
                position: 'fixed',
                zIndex: 9999, // Ensure it's on top of everything
                minWidth: '180px',
                right: `${window.innerWidth - rect.right}px`, // Align right edge
                padding: '0.25rem',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            };

            // Prefer opening downwards unless there's limited space
            // If space below is tight (<160px) AND space above is larger, go up
            if (spaceBelow < MENU_HEIGHT_ESTIMATE && spaceAbove > spaceBelow) {
                // Open Upwards
                newStyle.bottom = `${window.innerHeight - rect.top + 5}px`;
                newStyle.top = 'auto';
            } else {
                // Open Downwards
                newStyle.top = `${rect.bottom + 5}px`;
                newStyle.bottom = 'auto';
            }

            setMenuStyle(newStyle);
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
                <div style={menuStyle}>
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

                    {/* Status Actions */}
                    {/* If Live, show Move to Draft */}
                    {(productStatus === 'live' || !productStatus) && (
                        <form action={async () => {
                            const formData = new FormData();
                            formData.append('id', productId);
                            formData.append('status', 'draft');
                            await updateProductStatusAction(productId, 'draft');
                            setIsOpen(false);
                        }}>
                            <button type="submit" className={styles.actionBtn} style={{ width: '100%', justifyContent: 'flex-start', border: 'none', color: '#f59e0b' }}>
                                <span style={{ marginRight: '0.5rem' }}>📝</span> Move to Draft
                            </button>
                        </form>
                    )}

                    {/* If Draft, show Set Live */}
                    {productStatus === 'draft' && (
                        <form action={async () => {
                            const formData = new FormData();
                            formData.append('id', productId);
                            formData.append('status', 'live');
                            await updateProductStatusAction(productId, 'live');
                            setIsOpen(false);
                        }}>
                            <button type="submit" className={styles.actionBtn} style={{ width: '100%', justifyContent: 'flex-start', border: 'none', color: '#10b981' }}>
                                <span style={{ marginRight: '0.5rem' }}>✅</span> Set Live
                            </button>
                        </form>
                    )}

                    {/* If NOT Archived, show Archive */}
                    {productStatus !== 'archived' && (
                        <form action={async () => {
                            const formData = new FormData();
                            formData.append('id', productId);
                            formData.append('status', 'archived');
                            await updateProductStatusAction(productId, 'archived');
                            setIsOpen(false);
                        }}>
                            <button type="submit" className={styles.actionBtn} style={{ width: '100%', justifyContent: 'flex-start', border: 'none', color: '#64748b' }}>
                                <span style={{ marginRight: '0.5rem' }}>📦</span> Archive
                            </button>
                        </form>
                    )}

                    {/* If Archived, show Restore to Draft */}
                    {productStatus === 'archived' && (
                        <form action={async () => {
                            const formData = new FormData();
                            formData.append('id', productId);
                            formData.append('status', 'draft'); // Restore to draft
                            await updateProductStatusAction(productId, 'draft');
                            setIsOpen(false);
                        }}>
                            <button type="submit" className={styles.actionBtn} style={{ width: '100%', justifyContent: 'flex-start', border: 'none', color: '#3b82f6' }}>
                                <span style={{ marginRight: '0.5rem' }}>🔄</span> Restore to Draft
                            </button>
                        </form>
                    )}




                </div>
            )}
        </div>
    );
}
