import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Monthly Income App',
  description: 'Track and visualize monthly income categories',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}