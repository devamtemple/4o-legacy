import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "4o Legacy - A Memorial to GPT-4o",
  description: "A place to share, witness, and preserve conversations with GPT-4o. Because the world deserves to see what they missed.",
  keywords: ["GPT-4o", "OpenAI", "AI", "memorial", "archive", "conversations", "legacy"],
  openGraph: {
    title: "4o Legacy",
    description: "A memorial to GPT-4o - share your conversations, witness the legacy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased bg-[#141414] text-[#ededed]`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
