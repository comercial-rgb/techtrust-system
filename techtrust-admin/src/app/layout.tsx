import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TechTrust Admin — Content',
  description: 'Manage banners, offers, articles, and notices',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
