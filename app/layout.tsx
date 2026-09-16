import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Radar 365',
  description: 'Radar autónomo de oportunidades de fútbol',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Radar 365', statusBarStyle: 'black-translucent' }
};

export const viewport: Viewport = { themeColor: '#090b10', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
