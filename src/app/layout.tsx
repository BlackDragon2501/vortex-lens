import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vórtex Lens - Lee el texto de tus imágenes",
  description: "Vórtex Lens, de Vortex Company: OCR local con Tesseract.js. Extrae texto de fotos y capturas con la cámara o del archivo, edítalo, cópialo o envíalo a Vórtex Notes. Gratis, sin anuncios y 100% local.",
  keywords: ["Vórtex Lens","OCR online","extraer texto de imagen","tesseract","reconocimiento de texto","escáner de texto","sin anuncios"],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><circle cx="24" cy="24" r="17" fill="none" stroke="#06b6d4" stroke-width="3.5"/><path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke="#22d3ee" stroke-width="3.5" stroke-linecap="round"/><path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke="#22d3ee" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="24" r="3" fill="#22d3ee"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex Lens - Lee el texto de tus imágenes",
    description: "Vórtex Lens, de Vortex Company: OCR local con Tesseract.js. Extrae texto de fotos y capturas con la cámara o del archivo, edítalo, cópialo o envíalo a Vórtex Notes. Gratis, sin anuncios y 100% local.",
    siteName: "Vórtex Lens - Lee el texto de tus imágenes",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#0f0f10] text-[#ececf1]">{children}</body>
    </html>
  );
}
