import { getOrderById, getProducts } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function DeliveryNotePage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ packageCount?: string; allowOpening?: string; fragile?: string }>;
}) {
    const { id } = await params;
    const urlParams = await searchParams;

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

    // Get params - prioritize URL parameter over database value
    const packageCount = urlParams.packageCount
        ? parseInt(urlParams.packageCount)
        : (order.packageCount || 1);

    const allowOpening = urlParams.allowOpening
        ? parseInt(urlParams.allowOpening)
        : (order.allowOpening ?? 0);

    const isFragile = urlParams.fragile
        ? urlParams.fragile === '1'
        : (order.fragile || false);

    const isMultiPackage = packageCount > 1;

    // Debug logging
    console.log('=== DELIVERY NOTE DEBUG ===');
    console.log('Order ID:', order.id);
    console.log('URL packageCount:', urlParams.packageCount);
    console.log('URL allowOpening:', urlParams.allowOpening);
    console.log('URL fragile:', urlParams.fragile);
    console.log('Final allowOpening:', allowOpening);
    console.log('Final isFragile:', isFragile);
    console.log('Final packageCount:', packageCount);
    console.log('Database packageCount:', order.packageCount);
    console.log('Final packageCount:', packageCount);

    // Generate array of package numbers [1, 2, 3, ...] based on package count
    const packages = Array.from({ length: packageCount }, (_, i) => i + 1);
    console.log('Packages array:', packages);
    console.log('Number of labels to render:', packages.length);



    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @page { 
                    size: 100mm 100mm; 
                    margin: 0; 
                }
                
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: Arial, sans-serif; 
                    background: white; 
                    color: black; 
                }

                .label-container {
                    width: 100mm;
                    height: 100mm;
                    border: 2px solid black;
                    display: flex;
                    flex-direction: column;
                    background: white;
                    box-sizing: border-box;
                    overflow: hidden;
                    position: relative;
                    break-after: page;
                    page-break-after: always;
                }
                
                .label-container[data-last="true"] {
                    break-after: avoid;
                    page-break-after: avoid;
                }

                /* Package indicator in top-right corner */
                .package-indicator {
                    position: absolute;
                    top: 2mm;
                    right: 2mm;
                    font-size: 8px;
                    font-weight: bold;
                    color: #666;
                    z-index: 10;
                }
                
                /* 1. HEADER */
                .header {
                    flex: 0 0 auto;
                    min-height: 20mm;
                    display: flex;
                    padding: 1mm 2mm;
                    border-bottom: 2px solid black;
                }
                .logo-area { width: 30%; display: flex; flex-direction: column; justify-content: center; }
                .logo-area img { max-height: 12mm; object-fit: contain; }
                .header-info { flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; }
                .edit-date { font-size: 8px; }
                .tracking-id { 
                    font-size: 18px; 
                    font-weight: 900; 
                    white-space: nowrap; 
                    overflow: hidden; 
                    text-overflow: ellipsis;
                }
                .cmd-ref { font-size: 10px; font-weight: bold; }
                .qr-area { width: 22mm; display: flex; justify-content: flex-end; align-items: center; }
                
                /* 2. PRODUCT SECTION - Now Auto-Expands */
                .product-row {
                    flex: 1; /* Allow it to grow to fill available space */
                    min-height: 8mm;
                    padding: 1mm 2mm;
                    border-bottom: 2px solid black;
                    font-size: 9px;
                    line-height: 1.1;
                    word-wrap: break-word;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                
                .open-box-icon {
                    position: absolute;
                    bottom: 2mm;
                    right: 2mm;
                    width: 6mm;
                    height: 6mm;
                    opacity: 0.8;
                }
                
                /* 3. ADDRESS SECTION - Flexible height */
                .address-section {
                    flex: 1 1 auto;
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
                    word-break: break-all;
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
                
                @media print { 
                    .no-print { display: none !important; }
                    body { 
                        width: auto; 
                        height: auto; 
                    }
                    .label-container {
                        margin: 0;
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }

                @media screen {
                    body {
                        background: #f0f0f0;
                        padding: 10mm;
                    }
                    .label-container {
                        margin-bottom: 10mm;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                }
                `
            }} />

            {packages.map(packageNum => {
                // Create unique barcode for each package
                // Format: deliveryID-1/3, deliveryID-2/3, deliveryID-3/3
                // If only 1 package, just use deliveryID
                const packageBarcode = packageCount === 1
                    ? rawId.toString()
                    : `${rawId}-${packageNum}/${packageCount}`;

                const packageTrackingId = packageCount === 1
                    ? trackingId
                    : (trackingId.toString().startsWith('LD')
                        ? `${trackingId}-${packageNum}/${packageCount}`
                        : `LD00${rawId}-${packageNum}/${packageCount}`);

                return (
                    <div
                        key={packageNum}
                        className="label-container"
                        data-last={packageNum === packageCount ? "true" : "false"}
                    >
                        <div className="header">
                            <div className="logo-area">
                                <img src="/xtari-logo.png" alt="XTARI.SHOP" />
                                <span style={{ fontSize: '7px', fontWeight: 'bold' }}>livraison express</span>
                            </div>
                            <div className="header-info">
                                <div className="edit-date">Edité le: {dateStr}</div>
                                <div className="tracking-id">{packageTrackingId}</div>
                                <div className="cmd-ref">#CMD {order.id}#</div>
                            </div>
                            <div className="qr-area">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${packageBarcode}`}
                                    style={{ height: '16mm', width: '16mm' }}
                                    alt="QR"
                                />
                            </div>
                        </div>

                        <div className="product-row">
                            <div className="product-content">
                                {order.items.map(i => {
                                    const pName = products.find(p => p.id === i.productId)?.title || i.productId;
                                    return `${pName} (x${i.quantity})`;
                                }).join(', ')}
                            </div>

                            {/* Allow Opening Icon moved to footer */}
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
                                {packageNum === 1
                                    ? <>{order.total?.toFixed(2).replace('.', ',')} <span style={{ fontSize: '12px' }}>MAD</span></>
                                    : <span style={{ fontSize: '14px' }}>Voir Colis 1/{packageCount}</span>
                                }
                            </div>
                            <div className="sort-code">{sortCode}</div>
                        </div>

                        <div className="barcode-strip">
                            <img
                                src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${packageBarcode}&scale=2&height=12&includetext=false`}
                                className="barcode-img"
                                alt="Barcode"
                            />
                            <div className="barcode-text">{packageTrackingId}</div>
                        </div>

                        <div className="footer">
                            <div>
                                <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Commentaire</div>
                                <div>Livraison standard</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {(allowOpening === 1) && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Ouvrir Colis">
                                        <img src="/icon-open.png" alt="Open" style={{ width: '8mm', height: '8mm', objectFit: 'contain' }} />
                                    </div>
                                )}
                                {isFragile && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Fragile">
                                        <img src="/icon-fragile.png" alt="Fragile" style={{ width: '8mm', height: '8mm', objectFit: 'contain' }} />
                                    </div>
                                )}
                                {isMultiPackage && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Multi-Colis">
                                        <img src="/icon-multi.png" alt="Multi" style={{ width: '8mm', height: '8mm', objectFit: 'contain' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}


            <script dangerouslySetInnerHTML={{
                __html: `
                    // Wait for all images to load before printing
                    window.onload = function() {
                        const images = document.querySelectorAll('img');
                        let loadedCount = 0;
                        const totalImages = images.length;
                        
                        if (totalImages === 0) {
                            // No images, print immediately
                            setTimeout(() => window.print(), 100);
                            return;
                        }
                        
                        function checkAllLoaded() {
                            loadedCount++;
                            if (loadedCount === totalImages) {
                                // All images loaded, wait a bit more then print
                                setTimeout(() => window.print(), 300);
                            }
                        }
                        
                        images.forEach(img => {
                            if (img.complete) {
                                checkAllLoaded();
                            } else {
                                img.addEventListener('load', checkAllLoaded);
                                img.addEventListener('error', checkAllLoaded); // Count errors too
                            }
                        });
                    };
                `
            }} />
        </>
    );
}
