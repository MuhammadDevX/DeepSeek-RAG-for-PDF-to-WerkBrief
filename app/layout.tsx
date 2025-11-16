import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Navbar } from "./page";
import { WerkbriefProvider } from "@/contexts/WerkbriefContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quick Declare - AI Powered Werkbrief Generator",
  description:
    "Werkbrief Generation by quickdeclare. We use AI Agents to create werkbriefs from your invoices. Fast, accurate, and efficient. The invoices do not require any special formatting. Just upload your PDF invoices and let our AI handle the rest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <WerkbriefProvider>
            <Navbar />
            {children}
          </WerkbriefProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
