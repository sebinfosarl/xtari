export default function PrintLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ margin: 0, padding: 0, background: 'white', color: 'black' }}>
            {children}
        </div>
    );
}
