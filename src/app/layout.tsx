import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Newsreader, Inter } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`h-full bg-[#F8FAFF] antialiased scroll-smooth ${plusJakarta.variable} ${newsreader.variable} ${inter.variable}`}
    >
      <body className="min-h-full flex flex-col font-sans text-slate-600 bg-[#F8FAFF]">
        {children}
      </body>
    </html>
  );
}
