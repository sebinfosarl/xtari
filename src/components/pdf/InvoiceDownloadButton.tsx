'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Order, Product, SalesPerson } from '@/lib/db';
import { Download } from 'lucide-react';

// Dynamically import the component that USES the PDF library.
// This ensures the library itself is never loaded on the server.
const InvoiceDownloadLink = dynamic(() => import('./InvoiceDownloadLink'), {
    ssr: false, // This is crucial
    loading: () => (
        <button className="btn btn-outline btn-sm" disabled>
            <Download className="w-4 h-4 mr-2" /> Loading PDF...
        </button>
    ),
});

interface InvoiceDownloadButtonProps {
    order: Order;
    products: Product[];
    salesPeople: SalesPerson[];
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    onClick?: () => void;
}

export default function InvoiceDownloadButton({ order, products, salesPeople, className, style, children, onClick }: InvoiceDownloadButtonProps) {
    return (
        <InvoiceDownloadLink
            order={order}
            products={products}
            salesPeople={salesPeople}
            className={className || "btn btn-outline"}
            style={style || { textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            onClick={onClick}
        >
            {children}
        </InvoiceDownloadLink>
    );
}

