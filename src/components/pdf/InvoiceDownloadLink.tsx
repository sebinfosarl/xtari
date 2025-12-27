'use client';

import React from 'react';
import { usePDF } from '@react-pdf/renderer';
import InvoicePdf from './InvoicePdf';
import { Order, Product, SalesPerson } from '@/lib/db';
import { Download, AlertCircle } from 'lucide-react';

interface InvoiceDownloadLinkProps {
    order: Order;
    products: Product[];
    salesPeople: SalesPerson[];
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    onClick?: () => void;
}

const InvoiceDownloadLink = ({ order, products, salesPeople, className, style, children, onClick }: InvoiceDownloadLinkProps) => {
    const [instance, updateInstance] = usePDF({ document: <InvoicePdf order={order} products={products} salesPeople={salesPeople} /> });

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) onClick();
    };

    // Render children or default content
    const content = children ? (
        typeof children === 'function'
            // @ts-ignore
            ? (children as any)({ loading: instance.loading, url: instance.url, error: instance.error, blob: instance.blob })
            : children
    ) : (
        <>
            <Download className="w-4 h-4 mr-2" />
            {instance.loading ? 'Preparing...' : 'Download Invoice'}
        </>
    );

    if (instance.loading) {
        return (
            <span className={className} style={{ ...style, cursor: 'wait', opacity: 0.7 }}>
                {content}
            </span>
        );
    }

    if (instance.error) {
        console.error("PDF Generation Error:", instance.error);
        return (
            <span className={className} style={{ ...style, cursor: 'not-allowed', color: 'red' }} title="Error generating PDF">
                <AlertCircle size={16} />
            </span>
        );
    }

    return (
        <a
            href={instance.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Invoice PDF"
            className={className}
            style={style}
            onClick={handleClick}
        >
            {content}
        </a>
    );
};

export default InvoiceDownloadLink;
