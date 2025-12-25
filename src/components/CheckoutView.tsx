'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import styles from './CheckoutView.module.css';
import { formatCurrency } from '@/lib/format';
import { Product } from '@/lib/db';
import Image from 'next/image';
import { Trash2, CheckCircle2, MapPin, Truck } from 'lucide-react';
import { createOrderAction } from '@/app/actions';

export default function CheckoutView({ upsells }: { upsells: Product[] }) {
    const { items, removeFromCart, total, clearCart, addToCart } = useCart();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    async function onSubmit(formData: FormData) {
        setLoading(true);

        // Append cart data
        formData.append('items', JSON.stringify(items.map(i => ({
            productId: i.id,
            quantity: i.quantity,
            price: i.price
        }))));
        formData.append('total', total.toString());

        try {
            await createOrderAction(formData);
            clearCart();
            setSuccess(true);
        } catch (err) {
            console.error(err);
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className={styles.success}>
                <div className="flex justify-center mb-4 text-green-500">
                    <CheckCircle2 size={64} />
                </div>
                <h2>Order Confirmed!</h2>
                <p>Your order has been placed successfully.</p>
                <div className={styles.codBadge} style={{ margin: '1rem auto', display: 'inline-block' }}>
                    Payment: Cash on Delivery
                </div>
                <p className="text-muted" style={{ marginBottom: '2rem' }}>We will contact you shortly to confirm delivery.</p>
                <button onClick={() => window.location.href = '/'} className="btn btn-primary">Back to Store</button>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className={styles.empty}>
                <h2>Your cart is empty</h2>
                <a href="/" className="btn btn-primary">Start Shopping</a>
            </div>
        );
    }

    return (
        <div className={styles.checkoutGrid}>
            {/* Left: Cart Items */}
            <div className={styles.cartSection}>
                <h2 className={styles.header}>Your Selection</h2>
                <div className={styles.items}>
                    {items.map(item => (
                        <div key={item.id} className={styles.item}>
                            <div className={styles.itemImg}>
                                <Image src={item.image} alt={item.title} width={80} height={80} style={{ objectFit: 'cover' }} />
                            </div>
                            <div className={styles.itemInfo}>
                                <h4>{item.title}</h4>
                                <p className={styles.itemPrice}>{formatCurrency(item.price)}</p>
                            </div>
                            <div className={styles.itemActions}>
                                <span className="text-sm font-bold">x{item.quantity}</span>
                                <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                {upsells.length > 0 && (
                    <div className={styles.upsells}>
                        <h3>Don't Miss Out</h3>
                        <div className={styles.upsellGrid}>
                            {upsells.slice(0, 2).map((p) => (
                                <div key={p.id} className={styles.upsellCard}>
                                    <div className={styles.upsellInfo}>
                                        <p className={styles.upsellTitle}>{p.title}</p>
                                        <p className={styles.upsellPrice}>{formatCurrency(p.price)}</p>
                                    </div>
                                    <button onClick={() => addToCart(p)} className="btn btn-outline" style={{ padding: '0.2rem 0.8rem', fontSize: '0.8rem' }}>Add</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Checkout Form */}
            <div className={styles.formSection}>
                <div className={styles.stickySummary}>
                    <h2 className={styles.header}>Shipping Details</h2>

                    <form action={onSubmit} className={styles.form}>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className={styles.label}>Full Name</label>
                                <input required name="name" className={styles.input} placeholder="John Doe" />
                            </div>
                            <div>
                                <label className={styles.label}>Email Address</label>
                                <input required name="email" type="email" className={styles.input} placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className={styles.label}>Phone Number</label>
                                <input required name="phone" type="tel" className={styles.input} placeholder="+1 234 567 890" />
                            </div>
                            <div>
                                <label className={styles.label}>Shipping Address</label>
                                <textarea required name="address" className={styles.input} rows={3} placeholder="Full address with city and zip code" />
                            </div>
                        </div>

                        <div className={styles.codBox}>
                            <div className="flex items-center gap-2 font-bold mb-1">
                                <Truck size={20} />
                                Cash on Delivery
                            </div>
                            <p className="text-sm text-muted">Pay securely with cash when your order arrives at your doorstep.</p>
                        </div>

                        <div className={styles.summary}>
                            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
                            <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
                            <hr className={styles.divider} />
                            <div className="flex justify-between" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                                <span>Total to Pay</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ padding: '1rem' }}>
                            {loading ? 'Processing Order...' : `Place Order (COD)`}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
