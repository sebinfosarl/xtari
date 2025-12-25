
export function formatCurrency(amount: number | undefined | null): string {
    const value = amount || 0;
    // Format the number part, e.g., "1,200.00" or just "1200" depending on preference? 
    // User request focused on the suffix. Let's keep the number as is or simple string.
    // The user example "0 DH", "1 DH" suggests integers or simple display.
    // I will use standard string conversion for the number for now, or toLocaleString('en-US')?
    // Let's use simple generic formatting but respect the suffix.

    // Check strict > 1 rule
    // 0 -> 0 DH
    // 1 -> 1 DH
    // 1.5 -> 1.5 DHS (since 1.5 > 1)

    const suffix = value > 1 ? 'DHS' : 'DH';

    // Optional: thousands separators? The user didn't ask, but it's good practice.
    // I'll stick to simple implementation first.
    return `${value} ${suffix}`;
}
