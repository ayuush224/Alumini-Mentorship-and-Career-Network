import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alma · Verified Alumni Mentorship Platform",
  description: "A considered mentoring network for students, alumni, and the teams who make meaningful connections possible.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      style={{ colorScheme: "light" }}
      className={`h-full bg-background antialiased scroll-smooth ${plusJakarta.variable} ${inter.variable}`}
    >
      <body className="min-h-full flex flex-col font-sans text-slate-600 bg-background">
        {children}
      </body>
    </html>
  );
}
