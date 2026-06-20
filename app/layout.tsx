import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import SiteFooter from "@/components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AE | Elexir",
  description: "It's not Rocket Science. It's Chemistry",
    icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-white text-black">
  <div className="flex min-h-screen flex-col">
    
    {/* Main Content */}
    <main className="flex-1">
      {children}
    </main>

    {/* Footer */}
<SiteFooter />

  </div>
  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ""} />
</body>
    </html>
  );
}
