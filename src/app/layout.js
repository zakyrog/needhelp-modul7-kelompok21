import { Inter } from "next/font/google";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/ux-states.css";
import "../styles/three-column.css";

import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ToastProvider } from "../components/Toast";
import { BodyClassManager } from "../components/BodyClassManager";
import { BottomNav } from "../components/BottomNav";
import { DockedChatDrawer } from "../components/DockedChatDrawer";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  metadataBase: new URL("https://needhelp-modul8.local"),
  title: {
    default: "NeedHelp Jogja - Platform Bantuan & Teman Situasional Mahasiswa",
    template: "%s - NeedHelp Jogja",
  },
  description:
    "NeedHelp Jogja adalah platform komunitas saling bantu dan teman situasional untuk mahasiswa dan pekerja muda di Daerah Istimewa Yogyakarta.",
  openGraph: {
    title: "NeedHelp Jogja - Platform Saling Bantu di Yogyakarta",
    description:
      "Temukan bantuan fisik, teman belajar, pendampingan, atau tawarkan keahlianmu di 5 kabupaten/kota DIY.",
    images: ["/assets/images/logo.svg"],
    type: "website",
    locale: "id_ID",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.variable}>
      <body>
        <BodyClassManager />
        <ToastProvider>
          <Header />
          <div className="site-main-shell">
            {children}
          </div>
          <Footer />
          <DockedChatDrawer />
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
