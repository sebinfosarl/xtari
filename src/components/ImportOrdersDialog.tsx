
import { useState } from 'react';
import { X, Calendar, Download, Loader2, AlertCircle } from 'lucide-react';
import { importWoocommerceOrdersAction } from '@/app/actions';
import styles from './ImportOrdersDialog.module.css';

interface ImportOrdersDialogProps {
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ImportOrdersDialog({ onClose, onSuccess }: ImportOrdersDialogProps) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            setResult({ success: false, error: 'Start date cannot be after end date.' });
            return;
        }

        setIsImporting(true);
        setResult(null);

        try {
            const after = startDate ? new Date(startDate).toISOString() : undefined;
            const before = endDate ? new Date(endDate).toISOString() : undefined;

            const res = await importWoocommerceOrdersAction(after, before);

            if (res.success) {
                setResult({ success: true, count: res.count });
                if (onSuccess) onSuccess();
            } else {
                setResult({ success: false, error: res.error });
            }
        } catch (err: any) {
            setResult({ success: false, error: err.message || 'An unexpected error occurred.' });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.dialog}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>
                            <Download size={20} color="#4f46e5" />
                            Import Orders
                        </h2>
                        <p className={styles.subtitle}>Fetch orders from WooCommerce</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={styles.closeBtn}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    {result?.success ? (
                        <div className={styles.successView}>
                            <div className={styles.successIcon}>
                                <Download size={32} />
                            </div>
                            <h3 className={styles.successTitle}>Import Successful!</h3>
                            <p className={styles.successText}>
                                Successfully imported <span className={styles.count}>{result.count}</span> new orders.
                            </p>
                            <button
                                onClick={() => {
                                    onClose();
                                    window.location.reload();
                                }}
                                className={styles.refreshBtn}
                            >
                                Close & Refresh
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleImport} className={styles.form}>
                            {result?.error && (
                                <div className={styles.error}>
                                    <AlertCircle size={16} style={{ marginTop: '2px' }} />
                                    <span>{result.error}</span>
                                </div>
                            )}

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>From Date & Time</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className={styles.input}
                                    />
                                    <Calendar className={styles.inputIcon} size={16} />
                                </div>
                                <p className={styles.hint}>Leave empty to include earliest available.</p>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>To Date & Time</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className={styles.input}
                                    />
                                    <Calendar className={styles.inputIcon} size={16} />
                                </div>
                                <p className={styles.hint}>Leave empty to include up to now.</p>
                            </div>

                            <div style={{ paddingTop: '0.5rem' }}>
                                <button
                                    type="submit"
                                    disabled={isImporting}
                                    className={styles.importBtn}
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 size={18} className={styles.animateSpin} />
                                            Importing Orders...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={18} />
                                            Start Import
                                        </>
                                    )}
                                </button>
                                <p className={styles.infoText}>
                                    Only new orders will be added. Existing orders are skipped.
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
