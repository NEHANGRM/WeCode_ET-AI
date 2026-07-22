import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "./LayoutWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WatchDog | Cyber-Defense",
  description: "Autonomous Cyber Defense System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body suppressHydrationWarning className="h-full flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)] overflow-hidden relative">
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#0B0D14]">
          {/* Base gradient — very dark slate */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1E2336] via-[#0B0D14] to-[#050608]" />
          
          {/* Large slow-rotating mesh gradient — deep purple & indigo */}
          <div
            className="absolute top-[-30%] right-[-20%] w-[80%] h-[80%] opacity-25"
            style={{
              background: 'conic-gradient(from 180deg, rgba(138,88,252,0.3), rgba(67,56,202,0.2), rgba(138,88,252,0.1), rgba(138,88,252,0.3))',
              borderRadius: '40%',
              filter: 'blur(100px)',
              animation: 'mesh-rotate 60s linear infinite',
            }}
          />
          
          {/* Violet blob — top right */}
          <div
            className="absolute top-[-10%] right-[5%] w-[45%] h-[45%] rounded-full opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(138,88,252,0.35) 0%, rgba(100,50,220,0.1) 40%, transparent 70%)',
              animation: 'float-1 25s ease-in-out infinite',
            }}
          />
          
          {/* Deep slate blue blob — bottom left */}
          <div
            className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full opacity-25"
            style={{
              background: 'radial-gradient(circle, rgba(70,90,140,0.3) 0%, rgba(40,55,95,0.1) 40%, transparent 70%)',
              animation: 'float-2 30s ease-in-out infinite',
            }}
          />
          
          {/* Purple accent — center-right */}
          <div
            className="absolute top-[25%] right-[20%] w-[35%] h-[35%] rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, rgba(160,110,255,0.25) 0%, rgba(120,70,230,0.1) 40%, transparent 70%)',
              animation: 'float-3 20s ease-in-out infinite',
            }}
          />

          {/* Deep emerald accent — bottom right */}
          <div
            className="absolute bottom-[5%] right-[10%] w-[28%] h-[28%] rounded-full opacity-15"
            style={{
              background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 60%)',
              animation: 'float-2 28s ease-in-out infinite reverse',
            }}
          />
        </div>

        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
