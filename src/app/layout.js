import { Inter } from "next/font/google";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/ux-states.css";

import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ToastProvider } from "../components/Toast";
import { BodyClassManager } from "../components/BodyClassManager";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  metadataBase: new URL("https://needhelp-modul8.local"),
  title: {
    default: "NeedHelp - Platform Bantuan dan Teman Situasional",
    template: "%s - NeedHelp",
  },
  description:
    "NeedHelp adalah platform digital untuk menemukan bantuan dan teman situasional di Kota Yogyakarta.",
  openGraph: {
    title: "NeedHelp - Platform Bantuan dan Teman Situasional",
    description:
      "Temukan orang di sekitar yang bisa membantu atau tawarkan bantuanmu di Yogyakarta.",
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
          {children}
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
