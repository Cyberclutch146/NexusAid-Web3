import type { Metadata } from 'next';
import { MobileBottomNav, MobileHeader } from '@/components/Navigation';
import NavbarTop from '@/components/Navbar_top';
import { Toaster } from 'sonner';
import DynamicBackground from '@/components/DynamicBackground';
import AIChatWidget from '@/components/AIChatWidget';
import AppAccessGate from '@/components/AppAccessGate';

export const metadata: Metadata = {
  title: 'Home - Outreach & Relief',
  description: 'NexusAid - Local Response Team',
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <DynamicBackground>
        <div className="fixed top-0 left-0 w-full z-50 hidden md:block">
          <NavbarTop />
        </div>
        <div className="flex-1 flex flex-col min-w-0 md:pt-24 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          <MobileHeader />
          <AppAccessGate>{children}</AppAccessGate>
        </div>
        <AIChatWidget />
        <MobileBottomNav />
      </DynamicBackground>
    </>
  );
}
