'use client';

import dynamic from 'next/dynamic';

const LocationPickerWrapper = dynamic(() => import('./LocationPicker'), { 
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full bg-surface-container-low animate-pulse rounded-2xl flex items-center justify-center text-on-surface-variant/40 border border-outline-variant/30">
      <div className="flex flex-col items-center gap-2">
        <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        <p className="text-sm font-medium">Loading map...</p>
      </div>
    </div>
  )
});

export default LocationPickerWrapper;
