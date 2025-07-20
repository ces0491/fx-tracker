import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'FX Tracker Pro - NZD/ZAR Exchange Rates',
  description: 'Professional forex tracking with real-time rates, forecasting, and technical analysis',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}