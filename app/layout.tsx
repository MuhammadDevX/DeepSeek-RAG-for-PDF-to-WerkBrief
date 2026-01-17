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

// Script to disable React DevTools in production
const disableDevToolsScript = `
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Disable React DevTools
    if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
      for (let [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => {} : null;
      }
    }
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.NODE_ENV === "production";
  
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {isProduction && (
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  // Disable React DevTools in production
                  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
                    for (let [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
                      window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => {} : null;
                    }
                  }
                  // Disable right-click context menu (optional - can be annoying for users)
                  // document.addEventListener('contextmenu', e => e.preventDefault());
                `,
              }}
            />
          )}
        </head>
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
