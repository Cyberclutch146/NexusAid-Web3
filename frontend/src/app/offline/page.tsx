import Link from 'next/link';
import { WifiOff, Home, RotateCcw } from 'lucide-react';

export const metadata = {
  title: 'Offline',
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-background text-on-background">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-12 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: 'rgba(59,107,74,0.1)',
            color: 'var(--color-primary-base)',
            border: '1px solid rgba(59,107,74,0.16)',
          }}
        >
          <WifiOff size={30} />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-on-surface">You are offline</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-on-surface-variant">
          NexusAid can still open cached pages, but live alerts, maps, payments, and event updates need a network connection.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
              boxShadow: '0 4px 14px rgba(59,107,74,0.22)',
            }}
          >
            <Home size={16} />
            Cached Home
          </Link>
          <a
            href="/offline"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-on-surface transition-transform active:scale-95"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <RotateCcw size={16} />
            Try Again
          </a>
        </div>
      </div>
    </main>
  );
}
