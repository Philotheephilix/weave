import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Weave',
  description: 'Decentralized private collaboration over Tor + ENSv2',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
