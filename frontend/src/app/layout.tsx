import type { Metadata, Viewport } from 'next';
import { Elms_Sans, Literata, Nunito_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeProvider';

const literata = Literata({
  variable: '--font-literata',
  subsets: ['latin'],
  display: 'swap',
});

const nunitoSans = Nunito_Sans({
  variable: '--font-nunito-sans',
  subsets: ['latin'],
  display: 'swap',
});

const elmsSans = Elms_Sans({
  variable: '--font-elms-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  applicationName: 'NexusAid',
  title: {
    default: 'NexusAid - Outreach & Relief',
    template: '%s | NexusAid',
  },
  description: 'Rooted in community, grown through care.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NexusAid',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'NexusAid - Outreach & Relief',
    description: 'Community relief, event coordination, emergency alerts, and volunteer response tools.',
    siteName: 'NexusAid',
    images: [{ url: '/images/banner.png', width: 1024, height: 1024, alt: 'NexusAid' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexusAid - Outreach & Relief',
    description: 'Community relief, event coordination, emergency alerts, and volunteer response tools.',
    images: ['/images/banner.png'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F4ED' },
    { media: '(prefers-color-scheme: dark)', color: '#111411' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${literata.variable} ${nunitoSans.variable} ${elmsSans.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        {/* Preload gives the browser an early fetch hint for the icon font */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@100..700,0..1,0..1,20..48&display=swap"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@100..700,0..1,0..1,20..48&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col font-body bg-background text-on-background">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
