
import styles from './Auth.module.css';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.brand}>
                    <span className={styles.brandName}>XTARI PREMIUM</span>
                </div>
                {children}
            </div>
        </div>
    );
}
