import Link from 'next/link';

export const metadata = {
  title: 'Offline | KriyaOS',
};

export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <section className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">Offline</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">KriyaOS is offline</h1>
        <p className="mt-3 text-sm leading-6">
          You appear to be offline. Reconnect to load current manuals, maintenance records, integration status, and diagnosis services.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6">
          <li><strong>Safety first:</strong> do not rely on cached diagnosis or safety decisions. The deterministic safety gate and current data must be checked when online.</li>
          <li><strong>No offline AI diagnosis:</strong> Gemini diagnosis, watchdog services, and live API data are unavailable offline.</li>
          <li><strong>Limited scope:</strong> this fallback only indicates offline status. Cached UI/assets, if any, may be stale and must not be treated as current operational guidance.</li>
          <li><strong>Live equipment:</strong> never attempt live/energized repair. If you cannot confirm de-energized isolation, stop and escalate to a qualified technician.</li>
        </ul>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-amber-50">Try again</Link>
      </section>
    </main>
  );
}
