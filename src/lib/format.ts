
export function formatCurrency(amount: number | undefined | null): string {
    const value = amount || 0;
    // Format with 2 decimal places
    const formatted = value.toFixed(2);
    // Use DHS for amounts > 1, DH otherwise
    const suffix = value > 1 ? 'DHS' : 'DH';
    return `${formatted} ${suffix}`;
}
