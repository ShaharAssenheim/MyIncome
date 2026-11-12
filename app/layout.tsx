import React from "react";
import { AccountNavigation } from "../components/AccountNavigation";
import { DirectionProvider } from "../components/ui/direction";
import { AuthProvider } from "../lib/useAuth";
import "./globals.css";

export const metadata = {
  title: "MyIncome · הכנסות המשפחה",
  description: "הכנסות, חיסכון ומצב החשבון המשפחתי במקום אחד",
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
          <AuthProvider>
            <AccountNavigation />
            {children}
          </AuthProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
