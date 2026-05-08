import Link from 'next/link';

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main className="flex-grow">
        {children}
      </main>
    </>
  );
}
