import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CogniFlow - AI-Powered BPMN Builder",
  description:
    "Build business processes using natural language and visual drag-and-drop editing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased`} suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
