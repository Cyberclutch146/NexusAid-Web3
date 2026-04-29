'use client';

import dynamic from 'next/dynamic';

import { SentinelAlert } from '@/types/sentinel';

const MapAreaComponent = dynamic(() => import('./MapArea'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#f0eee9] animate-pulse rounded-2xl flex items-center justify-center text-[#1f3d2b]/40 border border-black/5 shadow-sm">
      <div className="flex flex-col items-center gap-2">
        <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm font-medium font-serif">Loading map...</p>
      </div>
    </div>
  )
});

export default function MapWrapper(props: any) {
  return <MapAreaComponent {...props} />;
}
