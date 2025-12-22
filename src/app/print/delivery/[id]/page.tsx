import { getOrderById } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function DeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
        notFound();
    }

    // Standard Cathedis format: LD00 + numeric ID
    const rawId = order.shippingId || order.id;
    const trackingId = rawId.toString().startsWith('LD') ? rawId : `LD00${rawId}`;
    const dateStr = new Date().toLocaleDateString('fr-FR');

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @page {
                    size: 100mm 100mm;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Arial Narrow', Arial, sans-serif; /* Condensed font for better fit */
                    background: white;
                    color: black;
                    width: 100mm;
                    height: 100mm;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .label-container {
                    width: 98mm; /* Slightly smaller to ensure fit */
                    height: 98mm;
                    border: 2px solid black;
                    padding: 2mm;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden; /* Prevent spillover */
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    height: 22mm;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 2px;
                }
                .logo-section {
                    width: 30%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .info-section {
                    width: 45%;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    line-height: 1.1;
                }
                .qr-section {
                    width: 25%;
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                }
                
                .product-line {
                    font-size: 0.75rem;
                    border-bottom: 2px solid black;
                    padding: 3px 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-weight: bold;
                }

                .mid-section {
                    display: flex;
                    flex: 1; /* Allow to grow */
                    border-bottom: 2px solid black;
                    margin-top: 2px;
                }
                .sender-col {
                    width: 40%;
                    border-right: 2px solid black;
                    padding: 4px;
                    font-size: 0.7rem;
                    display: flex;
                    flex-direction: column;
                }
                .receiver-col {
                    width: 60%;
                    padding: 4px 6px;
                    font-size: 0.8rem;
                    position: relative;
                }
                
                .col-title {
                    text-decoration: underline;
                    font-weight: bold;
                    margin-bottom: 4px;
                    font-size: 0.7rem;
                    text-transform: uppercase;
                }
                .s-icon {
                    background: black;
                    color: white;
                    width: 16px;
                    height: 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 0.7rem;
                    margin-right: 4px;
                    border-radius: 2px;
                }

                .price-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid black;
                    padding: 6px 8px;
                    height: 14mm;
                    background: #f9f9f9;
                }
                .price-main {
                    font-size: 1.8rem;
                    font-weight: 800;
                }
                .routing-code {
                    font-size: 1.4rem;
                    font-weight: bold;
                    border: 2px solid black;
                    padding: 0 4px;
                }

                .barcode-section {
                    height: 16mm;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    border-bottom: 1px solid black;
                    padding: 2px 0;
                }

                .footer {
                    height: 18mm;
                    padding: 4px 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .footer-text {
                    font-size: 0.75rem;
                }
                .footer-icons {
                    display: flex;
                    gap: 8px;
                }
                .icon-box {
                   border: 1px solid black;
                   padding: 2px;
                   border-radius: 4px;
                   display: flex;
                   align-items: center;
                   justify-content: center;
                   width: 24px;
                   height: 24px;
                }

                @media print {
                    .no-print { display: none; }
                }
            `}} />

            <div className="label-container">

                <div className="header">
                    <div className="logo-section">
                        <img
                            src="/xtari-logo.png"
                            alt="XTARI"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '18mm',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                    <div className="info-section">
                        <div className="edit-date" style={{ fontSize: '0.6rem' }}>{dateStr}</div>
                        <div className="tracking-big" style={{ fontSize: '1.25rem' }}>{trackingId}</div>
                    </div>
                    <div className="qr-section">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${rawId}`}
                            style={{ width: '16mm', height: '16mm', marginRight: '2mm' }}
                            alt="QR"
                        />
                    </div>
                </div>

                <div className="product-line">
                    📦 {order.items.map(i => `${i.productId} (x${i.quantity})`).join(', ')}
                </div>

                <div className="mid-section">
                    <div className="sender-col">
                        <div className="col-title">Expéditeur</div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '0.9rem' }}>XTARI.SHOP</strong>
                        </div>
                        <div style={{ fontSize: '0.65rem', lineHeight: '1.2' }}>
                            contact@xtari.shop<br />
                            TANGER, Maroc
                        </div>
                    </div>
                    <div className="receiver-col">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="col-title">Destinataire</div>
                        </div>

                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '2px' }}>{order.customer.name}</div>
                        <div style={{ fontSize: '0.8rem', marginBottom: '4px' }}>{order.customer.phone}</div>
                        <div style={{ fontSize: '0.75rem', lineHeight: '1.2', height: '2.4em', overflow: 'hidden' }}>
                            {order.customer.address}
                        </div>
                        <div style={{ fontWeight: 'bold', marginTop: 'auto', fontSize: '1.1rem', textAlign: 'right' }}>
                            {order.customer.city}
                        </div>
                    </div>
                </div>

                <div className="price-bar">
                    <div className="price-main">
                        {order.total?.toFixed(2).replace('.', ',')} <span style={{ fontSize: '0.8rem' }}>MAD</span>
                    </div>
                    <div className="routing-code">KF-084</div>
                </div>

                <div className="barcode-section">
                    <img
                        src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${rawId}&scale=1.2&height=7&includetext=false`}
                        style={{ height: '7mm', width: '75%' }}
                        alt="Barcode"
                    />
                    <div style={{ fontSize: '0.75rem', marginTop: '1px', fontWeight: 'bold' }}>{trackingId}</div>
                </div>

                <div className="footer">
                    <div className="footer-text">
                        <strong style={{ textDecoration: 'underline' }}>Commentaire</strong>
                        <div style={{ marginTop: '2px' }}>Livraison standard</div>
                    </div>
                    <div className="footer-icons" style={{ display: 'flex', gap: '8px' }}>
                        {order.allowOpening === 1 && (
                            <div className="icon-box" title="Ouvrir Colis" style={{ width: '24px', height: '24px' }}>
                                <img src="/openbox-icon.png" alt="Box" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                        {order.fragile && (
                            <div className="icon-box" title="Fragile" style={{ width: '24px', height: '24px' }}>
                                <img src="/fragile-icon.png" alt="Fragile" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{
                __html: `window.onload = function() { window.print(); }`
            }} />
        </>
    );
}
