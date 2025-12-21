
import { adminSignupAction } from "@/app/actions";
import Link from 'next/link';
import styles from '../Auth.module.css';

export default function SignupPage() {
    return (
        <>
            <h1 className={styles.title}>Create account</h1>
            <p className={styles.subtitle}>Join the XTARI administration team.</p>

            <form action={adminSignupAction}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Choose Username</label>
                    <input
                        name="username"
                        required
                        className={styles.input}
                        placeholder="johndoe"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Create Password</label>
                    <input
                        name="password"
                        type="password"
                        required
                        className={styles.input}
                        placeholder="••••••••"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Confirm Password</label>
                    <input
                        name="confirmPassword"
                        type="password"
                        required
                        className={styles.input}
                        placeholder="••••••••"
                    />
                </div>

                <button type="submit" className={styles.submitBtn}>
                    Create account
                </button>

                <div className={styles.footerText}>
                    Already have an account? <Link href="/login" className={styles.footerLink}>Sign in</Link>
                </div>
            </form>
        </>
    );
}
