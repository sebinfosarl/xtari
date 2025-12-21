import Navbar from "@/components/Navbar";
import { Providers } from "@/components/Providers";

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <Navbar />
      {children}
    </Providers>
  );
}
