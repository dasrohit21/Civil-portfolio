import type { Metadata, Viewport } from "next";
import { Archivo, Architects_Daughter } from "next/font/google";
import { profile } from "@/content/profile";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// The hand lettering on the drawings.
const hand = Architects_Daughter({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: { default: `${profile.name} · ${profile.role}`, template: `%s · ${profile.name}` },
  description: `${profile.name}, ${profile.role} in ${profile.place}. Structural design, solar PV, NDT audits and green buildings.`,
};

export const viewport: Viewport = {
  themeColor: "#f3eee3",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${hand.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
