import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineBanner({ offlineCount, onSyncOffline, isSyncing }) {
  if (offlineCount === 0) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-medium">
      <div className="flex items-center space-x-2 max-w-xl">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>
          You have <strong className="underline">{offlineCount} offline draft expense{offlineCount > 1 ? 's' : ''}</strong> queued locally.
        </span>
      </div>
      <button
        onClick={onSyncOffline}
        disabled={isSyncing}
        className="px-3 py-1 rounded-lg bg-white text-amber-800 font-bold hover:bg-amber-50 active:scale-95 transition flex items-center space-x-1.5 shadow-xs"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
      </button>
    </div>
  );
}
