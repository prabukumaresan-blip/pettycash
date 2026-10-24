'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-slate-200/80 p-2 flex items-center justify-center">
          <img src="/logo-192.png" alt="Bright Flowers" className="w-full h-full object-contain animate-pulse" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-600">Loading Bright Flowers Petty Cash...</p>
        </div>
      </div>
    </div>
  )
});

export default function Home() {
  return <App />;
}
