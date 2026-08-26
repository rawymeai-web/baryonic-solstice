import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "راوي | Rawy - اجعل طفلك بطل قصته الخاصة 📖✨",
  description: "كتاب مصور فاخر مطبوع باسم وملامح طفلك الحقيقية. تخصيص كامل في دقيقة واحدة وشحن سريع لجميع الدول.",
  openGraph: {
    title: "راوي | Rawy - اجعل طفلك بطل قصته الخاصة 📖✨",
    description: "كتاب مصور فاخر مطبوع باسم وملامح طفلك الحقيقية. تخصيص كامل في دقيقة واحدة وشحن سريع لجميع الدول.",
    url: "https://rawytime.com",
    siteName: "Rawy | راوي",
    images: [
      {
        url: "https://rawytime.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Rawy Personalized Storybooks",
      },
    ],
    locale: "ar_KW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "راوي | Rawy - اجعل طفلك بطل قصته الخاصة 📖✨",
    description: "كتاب مصور فاخر مطبوع باسم وملامح طفلك الحقيقية. تخصيص كامل في دقيقة واحدة.",
    images: ["https://rawytime.com/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
