import { Geist } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata = {
  metadataBase: new URL('https://fx.sheetsolved.com'),
  title: 'FX Tracker — Sheet Solved',
  description:
    'Daily exchange rates, technical indicators and statistical forecasts for currency pairs. Built by Sheet Solved.',
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfd' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1017' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
