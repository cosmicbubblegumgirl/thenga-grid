import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'THENGA//GRID — Your neighbourhood. Live.',
  description: 'Find nearby shops, compare live prices, reserve local drops and manage a neighbourhood store.',
  applicationName: 'THENGA//GRID',
  openGraph: {
    title: 'THENGA//GRID — Your neighbourhood. Live.',
    description: 'A live commerce network for your neighbourhood.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'THENGA//GRID — Your neighbourhood. Live.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'THENGA//GRID — Your neighbourhood. Live.',
    description: 'A live commerce network for your neighbourhood.',
    images: ['/og.png'],
  },
  icons: { icon: '/favicon.svg', apple: '/app-icon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
