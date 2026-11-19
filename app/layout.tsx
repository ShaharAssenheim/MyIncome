import React from "react";
import type { Metadata, Viewport } from "next";
import { AccountNavigation } from "../components/AccountNavigation";
import { PwaProvider } from "../components/PwaProvider";
import { DirectionProvider } from "../components/ui/direction";
import { AuthProvider } from "../lib/useAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyIncome · הכנסות המשפחה",
  description: "ניהול הכנסות, חיסכון וחשבונות בנק",
  applicationName: "MyIncome",
  appleWebApp: {
    capable: true,
    title: "MyIncome",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f8fc",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <DirectionProvider direction="rtl">
          <a href="#main-content" className="ui-skip-link">
            דילוג לתוכן הראשי
          </a>
          <PwaProvider>
            <AuthProvider>
              <AccountNavigation>{children}</AccountNavigation>
            </AuthProvider>
          </PwaProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
