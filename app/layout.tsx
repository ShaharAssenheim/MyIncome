import "./globals.css";
import React from "react";
import { AuthProvider } from "../lib/useAuth";
import { AccountNavigation } from "../components/AccountNavigation";

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
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body>
        <a href="#main-content" className="ui-skip-link">
          דילוג לתוכן הראשי
        </a>
        <AuthProvider>
          <AccountNavigation />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
