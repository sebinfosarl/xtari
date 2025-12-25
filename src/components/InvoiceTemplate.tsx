'use client';

import { Order, Product, SalesPerson } from '@/lib/db';
import { formatCurrency } from '@/lib/format';

interface InvoiceTemplateProps {
    order: Order;
    products: Product[];
    salesPeople: SalesPerson[];
}

export default function InvoiceTemplate({ order, products, salesPeople }: InvoiceTemplateProps) {
    const autoEntrepreneur = salesPeople.find(p => p.fullName === order.salesPerson);
    const issueDate = order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');

    const totalNet = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <div className="invoice-container">
            <style dangerouslySetInnerHTML={{
                __html: `
                @page { size: A4; margin: 0; }
                body { 
                    margin: 0; 
                    padding: 0; 
                    background: white; 
                    font-family: 'Arial', sans-serif;
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                }
                .invoice-container {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm;
                    margin: 0 auto;
                    color: #000;
                    box-sizing: border-box;
                    position: relative;
                }
                .header-grid { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 30px; }
                .logo-placeholder { width: 150px; height: auto; }
                .facture-title { font-size: 18px; font-weight: bold; text-align: right; }
                
                .client-box { 
                    border: 1px solid #000; 
                    padding: 10px; 
                    width: 45%; 
                    margin-left: auto; 
                    margin-bottom: 30px;
                    border-radius: 4px;
                }
                
                .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .invoice-table th, .invoice-table td { 
                    border: 1px solid #000; 
                    padding: 8px; 
                    text-align: left; 
                    font-size: 12px; 
                }
                .text-center { text-align: center !important; }
                .text-right { text-align: right !important; }
                
                .total-section { margin-left: auto; width: 40%; margin-top: 10px; }
                .total-row { display: flex; justify-content: space-between; font-weight: bold; border: 1px solid #000; padding: 8px; }
                
                .legal-notice { font-size: 10px; margin-top: 20px; font-style: italic; }
                .arrest-sum { font-weight: bold; margin-top: 15px; font-size: 12px; text-transform: uppercase; }

                .footer {
                    position: absolute;
                    bottom: 20mm;
                    left: 20mm;
                    right: 20mm;
                    font-size: 10px;
                    border-top: 1px solid #000;
                    padding-top: 10px;
                }
                .footer-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 10px; }
                .signature-box { text-align: right; margin-top: 20px; font-weight: bold; }

                @media print {
                    .no-print { display: none !important; }
                }
                `
            }} />

            {/* HEADER */}
            <div className="header-grid">
                <div>
                    <img src="/auto-entrepreneur-logo.png" alt="Auto-Entrepreneur" style={{ width: '150px', height: 'auto' }} />
                </div>
                <div className="facture-title">
                    Facture numéro : {order.id} <br />
                    Date : {issueDate}
                </div>
            </div>

            {/* CLIENT INFO */}
            <div className="client-box">
                <div style={{ marginBottom: '5px' }}><strong>Client :</strong> {order.companyName || order.customer.name}</div>
                <div style={{ marginBottom: '5px' }}><strong>Adresse :</strong> {order.customer.address}, {order.customer.city}</div>
                {order.ice && <div><strong>ICE :</strong> {order.ice}</div>}
            </div>

            {/* ITEMS TABLE */}
            <table className="invoice-table">
                <thead>
                    <tr>
                        <th style={{ width: '50%' }}>Désignation</th>
                        <th className="text-center">Quantité</th>
                        <th className="text-right">Prix unitaire</th>
                        <th className="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, idx) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                            <tr key={idx}>
                                <td>{product?.title || item.productId}</td>
                                <td className="text-center">{item.quantity}</td>
                                <td className="text-right">{formatCurrency(item.price)}</td>
                                <td className="text-right">{formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* TOTALS & LEGAL */}
            <div className="total-section">
                <div className="total-row">
                    <span>Total Net à payer</span>
                    <span>{formatCurrency(totalNet)}</span>
                </div>
            </div>

            <div className="legal-notice">
                Montant en dirhams exonéré de la TVA¹ <br />
                ¹ Art 91-II-1 du Code Général des Impôts.
            </div>

            <div className="arrest-sum">
                ARRETE LA PRESENTE FACTURE A LA SOMME DE : <br />
                <span style={{ fontSize: '14px' }}>{totalNet.toLocaleString('fr-FR')} DIRHAMS</span>
            </div>

            <div className="signature-box" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '20px' }}>
                <div style={{ marginBottom: '10px' }}>Signature :</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '20px' }}>
                    {autoEntrepreneur?.cachet && (
                        <img src={autoEntrepreneur.cachet} alt="Cachet" style={{ height: '170px', objectFit: 'contain', opacity: 0.9, marginBottom: '-50px', position: 'relative', zIndex: 1 }} />
                    )}
                    {autoEntrepreneur?.signature && (
                        <img src={autoEntrepreneur.signature} alt="Signature" style={{ height: '120px', objectFit: 'contain', position: 'relative', zIndex: 2 }} />
                    )}
                </div>
            </div>

            {/* FOOTER (AUTO-ENTREPRENEUR INFO) */}
            <div className="footer" style={{ textAlign: 'center', fontSize: '13px', lineHeight: '1.6' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', textTransform: 'uppercase' }}>
                    {autoEntrepreneur?.fullName}
                </div>
                <div>
                    {autoEntrepreneur?.address}
                </div>
                <div>
                    {autoEntrepreneur?.tel && <span><strong>TEL:</strong> {autoEntrepreneur.tel}</span>}
                    {autoEntrepreneur?.email && <span> | <strong>Email:</strong> {autoEntrepreneur.email}</span>}
                </div>
                <div style={{ marginTop: '4px' }}>
                    {autoEntrepreneur?.cnie && <span style={{ marginRight: '10px' }}><strong>CNIE:</strong> {autoEntrepreneur.cnie}</span>}
                    {autoEntrepreneur?.ice && <span style={{ marginRight: '10px' }}><strong>ICE:</strong> {autoEntrepreneur.ice}</span>}
                    {autoEntrepreneur?.if && <span style={{ marginRight: '10px' }}><strong>IF:</strong> {autoEntrepreneur.if}</span>}
                    {autoEntrepreneur?.tp && <span><strong>TP:</strong> {autoEntrepreneur.tp}</span>}
                </div>
            </div>
        </div>
    );
}
