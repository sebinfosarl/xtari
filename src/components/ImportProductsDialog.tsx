
import { useState } from 'react';
import { X, Download, Loader2, AlertCircle, Package } from 'lucide-react';
import { importWoocommerceProductsAction } from '@/app/actions';
import styles from './ImportProductsDialog.module.css';

interface ImportProductsDialogProps {
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ImportProductsDialog({ onClose, onSuccess }: ImportProductsDialogProps) {
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; count?: number; skipped?: number; error?: string } | null>(null);

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsImporting(true);
        setResult(null);

        try {
            const res = await importWoocommerceProductsAction();

            if (res.success) {
                setResult({ success: true, count: res.count, skipped: res.skipped });
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
                            <Package size={20} color="#4f46e5" />
                            Import Products
                        </h2>
                        <p className={styles.subtitle}>Fetch products from WooCommerce</p>
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
                                <Package size={32} />
                            </div>
                            <h3 className={styles.successTitle}>Import Successful!</h3>
                            <p className={styles.successText}>
                                Added <span className={styles.count}>{result.count}</span> new products.<br />
                                Skipped <span className={styles.count}>{result.skipped}</span> existing products.
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

                            <div style={{ paddingTop: '0.5rem' }}>
                                <button
                                    type="submit"
                                    disabled={isImporting}
                                    className={styles.importBtn}
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 size={18} className={styles.animateSpin} />
                                            Importing Products...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={18} />
                                            Start Import
                                        </>
                                    )}
                                </button>
                                <p className={styles.infoText}>
                                    Imports latest 100 products. Skips existing products.
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
