import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import StickyCta from "@/components/StickyCta";
import "@/styles/base.css";
import "@/styles/sections.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});
const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Maisons Essensya — Des maisons pensées pour l'essentiel",
    template: "%s — Maisons Essensya",
  },
  description:
    "Maisons Essensya, constructeur nouvelle génération. Des maisons catalogues conçues intelligemment : maîtrise du produit, maîtrise du prix.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Maisons Essensya",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${instrument.variable} ${plexMono.variable}`}
    >
      <body>
        <Header />
        {children}
        <StickyCta />
        <Footer />
        <Reveal />
      </body>
    </html>
  );
}
