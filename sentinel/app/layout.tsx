import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/ui/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sentinel | Cyber-Defense",
  description: "Autonomous AI cyber-defense pipeline for critical infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="h-full flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)] overflow-hidden relative">
        {/* Animated Hackathon Background Elements */}
        <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-[scanline_8s_linear_infinite]" />
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-900/5 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
        </div>

        <Navbar />
        <div className="flex flex-1 overflow-hidden z-0">
          <Sidebar />
          <main className="flex-1 overflow-y-auto relative backdrop-blur-[2px]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
