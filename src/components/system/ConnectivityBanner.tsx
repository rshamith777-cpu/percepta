'use client';

import { useSyncExternalStore } from 'react';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

function getSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getServerSnapshot() {
  return true;
}

export function ConnectivityBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      className={`mb-4 rounded-xl border px-3 py-2 text-sm ${online ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'}`}
      role="status"
      aria-live="polite"
    >
      <strong>{online ? 'Connectivity: online' : 'Connectivity: offline'}</strong>
      <span className="ml-2 text-foreground/80">
        {online
          ? 'Server/API features (diagnosis, uploads, saving records) are available when the app server is reachable. Gemini requires internet/credentials/quota.'
          : 'Browser is offline. Server-dependent features (diagnosis, uploads, manual/record API calls) may be unavailable. Safety guidance shown on screen remains visible; do not assume offline AI diagnosis. Reconnect to use online services.'}
      </span>
    </div>
  );
}
