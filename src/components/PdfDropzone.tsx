'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X, Send, AlertCircle, CheckCircle2, ArrowRightCircle } from 'lucide-react';
import styles from './PdfDropzone.module.css';
import { analyzePdf } from '@/app/actions/analyze-pdf';
import { markOrderAsDeliveredAction } from '@/app/actions';
import { Order } from '@/lib/db';

interface PdfDropzoneProps {
    orders?: Order[];
}

export default function PdfDropzone({ orders = [] }: PdfDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logs, setLogs] = useState<{ fileName: string; result: string; success: boolean; movedOrder?: string }[]>([]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            (file) => file.type === 'application/pdf'
        );

        if (droppedFiles.length === 0) {
            alert('Please drop PDF files only.');
            return;
        }

        setFiles((prev) => [...prev, ...droppedFiles]);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(
                (file) => file.type === 'application/pdf'
            );
            setFiles((prev) => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (files.length === 0) return;

        setIsSubmitting(true);
        setLogs([]);

        const newLogs: { fileName: string; result: string; success: boolean; movedOrder?: string }[] = [];

        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await analyzePdf(formData);
                if (res.success) {
                    const data = res.data as { summary: string; foundIds: string[] };
                    let resultLog = data.summary;
                    let movedInfo = undefined;

                    // Logic to check IDs and move to done
                    if (data.foundIds && data.foundIds.length > 0) {
                        for (const id of data.foundIds) {
                            // Normalize ID for comparison (simple check)
                            const match = orders.find(o =>
                                o.id === id ||
                                o.shippingId === id ||
                                (o.shippingId && id.includes(o.shippingId)) || // lenient check
                                (o.id && id.includes(o.id))
                            );

                            if (match) {
                                const moveRes = await markOrderAsDeliveredAction(match.id, file.name);
                                if (moveRes.success) {
                                    resultLog += `\n\n✅ MATCH FOUND: Order #${moveRes.orderId} (${moveRes.orderName}) has been marked as DELIVERED (Done).`;
                                    movedInfo = `Order #${moveRes.orderId} -> Done`;
                                } else {
                                    resultLog += `\n\n⚠️ MATCH FOUND: Order #${match.id} but failed to update status: ${moveRes.error}`;
                                }
                            }
                        }
                    }

                    newLogs.push({ fileName: file.name, result: resultLog, success: true, movedOrder: movedInfo });
                } else {
                    newLogs.push({ fileName: file.name, result: res.error || 'Failed to analyze', success: false });
                }
            } catch (err: any) {
                newLogs.push({ fileName: file.name, result: err.message, success: false });
            }
        }

        setLogs(newLogs);
        setIsSubmitting(false);
        if (newLogs.every(l => l.success)) {
            setFiles([]);
        }
    };

    return (
        <div className={styles.container}>
            <label
                className={`${styles.dropzone} ${isDragging ? styles.active : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
                <div className={styles.iconWrapper}>
                    <Upload size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-sm mx-auto">
                        Drag and drop a file, or click to upload
                    </p>
                </div>
            </label>

            {files.length > 0 && (
                <>
                    <div className={styles.fileList}>
                        {files.map((file, index) => (
                            <div key={`${file.name}-${index}`} className={styles.fileItem}>
                                <div className={styles.fileIcon}>
                                    <FileText size={20} />
                                </div>
                                <div className={styles.fileInfo}>
                                    <p className={styles.fileName}>{file.name}</p>
                                    <p className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className={styles.removeBtn}
                                    title="Remove file"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>Processing...</>
                        ) : (
                            <>
                                <Send size={18} />
                                Analyze {files.length} {files.length === 1 ? 'File' : 'Files'}
                            </>
                        )}
                    </button>
                </>
            )}
        </div>
    );
}
