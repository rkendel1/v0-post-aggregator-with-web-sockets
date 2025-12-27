import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AudioPlayerProvider } from '@/contexts/audio-player-context'
import { AudioPlayer } from '@/components/audio/audio-player'
import { UserProvider } from '@/contexts/user-context'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'PodBridge',
  description: 'Your podcasts, unified.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/pb_black.PNG',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/pb_white.PNG',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <UserProvider>
          <AudioPlayerProvider>
            <main>{children}</main>
            <AudioPlayer />
          </AudioPlayerProvider>
        </UserProvider>
        <Analytics />
      </body>
    </html>
  )
}