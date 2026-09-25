import type { Metadata, Viewport } from "next";
import { ClientApp } from "./ClientApp";
import "./app.css";

export const metadata: Metadata = {
  title: "Haritam · Arkipel",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function AppPage() {
  return <ClientApp />;
}
