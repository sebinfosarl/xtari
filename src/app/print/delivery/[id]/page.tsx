import { getOrderById, getProducts } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function DeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const order = await getOrderById(id);
    const products = await getProducts();

    if (!order) {
        notFound();
    }

    const rawId = order.shippingId || order.id;
    const trackingId = rawId.toString().startsWith('LD') ? rawId : `LD00${rawId}`;
    const dateStr = new Date().toLocaleDateString('fr-FR');

    const cityCode = order.customer.city?.substring(0, 2).toUpperCase() || 'XX';
    const numericPart = (parseInt(order.id.replace(/\D/g, '')) % 999).toString().padStart(3, '0');
    const sortCode = `${cityCode}-${numericPart}`;

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @page { size: 100mm 100mm; margin: 0; }
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; color: black; width: 100mm; height: 100mm; display: flex; justify-content: center; align-items: center; }

                .label-container {
                    width: 98mm;
                    height: 98mm; /* Keep total height fixed to 10cm */
                    border: 2px solid black;
                    display: flex;
                    flex-direction: column;
                    background: white;
                    box-sizing: border-box;
                    overflow: hidden; /* Prevents long text from pushing content to page 2 */
                }
                
                /* 1. HEADER */
                .header {
                    flex: 0 0 auto; /* Don't shrink */
                    min-height: 20mm;
                    display: flex;
                    padding: 1mm 2mm;
                    border-bottom: 2px solid black;
                }
                .logo-area { width: 30%; display: flex; flex-direction: column; justify-content: center; }
                .logo-area img { max-height: 12mm; object-fit: contain; }
                .header-info { flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; }
                .edit-date { font-size: 8px; }
                .tracking-id { font-size: 18px; font-weight: 900; }
                .cmd-ref { font-size: 10px; font-weight: bold; }
                .qr-area { width: 22mm; display: flex; justify-content: flex-end; align-items: center; }
                
                /* 2. PRODUCT SECTION - Now Auto-Expands */
                .product-row {
                    flex: 0 0 auto;
                    min-height: 8mm;
                    padding: 1mm 2mm;
                    border-bottom: 2px solid black;
                    font-size: 9px;
                    line-height: 1.1;
                    word-wrap: break-word; /* Allows long product names to wrap */
                }
                
                /* 3. ADDRESS SECTION - Flexible height */
                .address-section {
                    flex: 1 1 auto; /* This section takes up available space */
                    display: flex;
                    border-bottom: 2px solid black;
                    min-height: 25mm; 
                }
                .sender-col { width: 35%; border-right: 2px solid black; padding: 1.5mm; font-size: 8px; }
                .receiver-col { width: 65%; padding: 1.5mm; position: relative; display: flex; flex-direction: column; }
                .col-label { text-decoration: underline; font-weight: bold; font-size: 9px; margin-bottom: 2px; }
                .sender-name { font-weight: 800; font-size: 11px; }
                
                /* Receiver specific fixes */
                .receiver-name { font-weight: 800; font-size: 11px; margin-bottom: 1px; }
                .receiver-address { 
                    font-size: 9px; 
                    font-weight: bold; 
                    text-transform: uppercase; 
                    line-height: 1.1; 
                    word-break: break-all; /* Prevents overflow of very long words */
                }

                /* 4. PRICE & SORT CODE */
                .price-strip {
                    flex: 0 0 auto;
                    height: 12mm;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 4mm;
                    border-bottom: 2px solid black;
                }
                .price-box { font-size: 20px; font-weight: 900; }
                .sort-code { font-size: 22px; font-weight: 900; }

                /* 5. BARCODE SECTION */
                .barcode-strip {
                    flex: 0 0 auto;
                    height: 15mm;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .barcode-img { height: 10mm; width: auto; max-width: 80%; object-fit: contain; }
                .barcode-text { font-size: 9px; font-weight: bold; margin-top: 1px; }

                /* FOOTER */
                .footer { flex: 0 0 auto; height: 7mm; padding: 0 2mm; display: flex; justify-content: space-between; align-items: center; font-size: 8px; border-top: 1px solid black; }
                
                @media print { .no-print { display: none; } }
                `
            }} />

            <div className="label-container">
                <div className="header">
                    <div className="logo-area">
                        <img src="/xtari-logo.png" alt="XTARI.SHOP" />
                        <span style={{ fontSize: '7px', fontWeight: 'bold' }}>livraison express</span>
                    </div>
                    <div className="header-info">
                        <div className="edit-date">Edité le: {dateStr}</div>
                        <div className="tracking-id">{trackingId}</div>
                        <div className="cmd-ref">#CMD {order.id}#</div>
                    </div>
                    <div className="qr-area">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${rawId}`}
                            style={{ height: '16mm', width: '16mm' }}
                            alt="QR"
                        />
                    </div>
                </div>

                <div className="product-row">
                    {order.items.map(i => {
                        const pName = products.find(p => p.id === i.productId)?.title || i.productId;
                        return `${pName} (x${i.quantity})`;
                    }).join(', ')}
                </div>

                <div className="address-section">
                    <div className="sender-col">
                        <div className="col-label">Expéditeur</div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1mm' }}>
                            <span className="sender-name">XTARI.SHOP</span>
                        </div>
                        <div>
                            contact@xtari.shop<br />
                            TANGER
                        </div>
                    </div>

                    <div className="receiver-col">
                        <div className="col-label">Destinataire</div>
                        <div className="receiver-name">{order.customer.name}</div>
                        <div className="receiver-phone" style={{ fontSize: '10px', marginBottom: '2px' }}>{order.customer.phone}</div>
                        <div className="receiver-address">
                            {order.customer.address} <br />
                            {order.customer.city} - {order.customer.sector?.toUpperCase()}
                        </div>
                    </div>
                </div>

                <div className="price-strip">
                    <div className="price-box">
                        {order.total?.toFixed(2).replace('.', ',')} <span style={{ fontSize: '12px' }}>MAD</span>
                    </div>
                    <div className="sort-code">{sortCode}</div>
                </div>

                <div className="barcode-strip">
                    <img
                        src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${rawId}&scale=2&height=12&includetext=false`}
                        className="barcode-img"
                        alt="Barcode"
                    />
                    <div className="barcode-text">{trackingId}</div>
                </div>

                <div className="footer">
                    <div>
                        <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Commentaire</div>
                        <div>Livraison standard</div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {order.allowOpening === 1 && (
                            <div style={{ border: '1px solid black', padding: '1px', borderRadius: '3px', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Ouvrir Colis">
                                <img src="/openbox-icon.png" alt="Open" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                            </div>
                        )}
                        {order.fragile && (
                            <div style={{ border: '1px solid black', padding: '1px', borderRadius: '3px', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Fragile">
                                <img src="/fragile-icon.png" alt="Fragile" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
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
