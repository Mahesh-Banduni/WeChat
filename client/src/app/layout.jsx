import { Geist, Geist_Mono, Poppins } from "next/font/google";
import ToastManager from '@/components/ui/toastWrapper';
import { SocketProvider } from '@/providers/socket-provider';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata = {
  title: "WeChat",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
      >
        <SocketProvider>
        <ToastManager />
        {children}
        </SocketProvider>
      </body>
    </html>
  );
}

