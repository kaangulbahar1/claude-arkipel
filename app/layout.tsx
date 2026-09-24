import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-bricolage", weight: ["600", "700", "800"] });
const source = Source_Sans_3({ subsets: ["latin", "latin-ext"], variable: "--font-source" });
const jetbrains = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-jetbrains", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: "Arkipel",
  description: "Notlarının içinde kaybolma. Her konu bir ada, alt notlar uydu adalar, hepsi tek bir haritada.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Arkipel",
    title: "Arkipel: notlarının içinde kaybolma",
    description: "Ada haritasıyla çalışan bir not uygulaması üzerinde çalışıyoruz. 5 dakikalık ankete katılıp şekillendirmemize yardım et.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e4eeea" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1d23" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${bricolage.variable} ${source.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
