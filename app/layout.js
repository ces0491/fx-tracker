import { IBM_Plex_Sans } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
});

export const metadata = {
  metadataBase: new URL('https://fx.sheetsolved.com'),
  title: 'FX Tracker — daily exchange rates and forecasts',
  description:
    'Daily exchange rates, technical indicators and statistical forecasts with their track record. Built by Sheet Solved.',
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1312' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={plexSans.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
