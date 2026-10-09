import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI ExamGuard — Intelligent Anti-Cheating Examination System",
  description: "AI-Based Intelligent Anti-Cheating Online Examination and Automated Proctoring System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-900 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
