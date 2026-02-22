import React from "react"
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const _inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const _jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Project A1 - Digital Companion",
  description: "आपका अपना इंटेलिजेंट AI जो आपको समझता है। Made in India.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a0705", /* Warm dark theme color */
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${_inter.variable} ${_jetbrains.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
