import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alma · Verified Alumni Mentorship Platform",
  description: "A considered mentoring network for students, alumni, and the teams who make meaningful connections possible.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col font-sans text-slate-600 bg-[#F8FAFF]">
        {children}
      </body>
    </html>
  );
}
