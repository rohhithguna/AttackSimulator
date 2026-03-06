import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Attack Simulator — Infrastructure Security Analysis",
  description: "Visual attack path simulation engine. Model your infrastructure and simulate how an attacker would exploit it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
        style={{ margin: 0, padding: 0, background: "#FFFFFF" }}
      >
        {children}
      </body>
    </html>
  );
}
