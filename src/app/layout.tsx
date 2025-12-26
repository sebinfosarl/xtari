import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    display: 'swap',
});

const cairo = Cairo({
    subsets: ["arabic"],
    variable: "--font-cairo",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Xtari Premium Store",
    description: "High-quality office and home essentials.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} ${cairo.variable}`}>
                {children}
            </body>
        </html>
    );
}
