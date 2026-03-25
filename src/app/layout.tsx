import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { VibetorchInspector } from "@vibetorch/inspector";

export const metadata: Metadata = {
  title: "ABGs : DM your favorite ABG",
  description: "DM your favorite ABG on Instagram",
  metadataBase: new URL("https://abgs.app"),
  icons: {
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ABGs : DM AI ABG GF",
    description: "DM your favorite ABG on Instagram",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ABGs : DM AI ABG GF",
    description: "DM your favorite ABG on Instagram",
    images: ["/og-twitter.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />

        <VibetorchInspector />
      </body>
    </html>
  );
}
