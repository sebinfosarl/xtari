
import { adminLoginAction } from "@/app/actions";
import Link from 'next/link';
import styles from '../Auth.module.css';

export default function LoginPage() {
    return (
        <>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Enter your credentials to access the admin panel.</p>

            <form action={adminLoginAction}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Username</label>
                    <input
                        name="username"
                        required
                        className={styles.input}
                        placeholder="e.g. admin"
                        autoComplete="username"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Password</label>
                    <input
                        name="password"
                        type="password"
                        required
                        className={styles.input}
                        placeholder="••••••••"
                        autoComplete="current-password"
                    />
                </div>

                <button type="submit" className={styles.submitBtn}>
                    Sign in
                </button>

                <div className={styles.footerText}>
                    Don't have an account? <Link href="/signup" className={styles.footerLink}>Request access</Link>
                </div>
            </form>
        </>
    );
}
