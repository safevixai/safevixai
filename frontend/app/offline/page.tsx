import Link from 'next/link';
import { AlertTriangle, BookOpen, MapPin, Siren } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="sv-page min-h-dvh px-5 py-10">
      <section className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-lg flex-col justify-center gap-6">
        <div className="sv-card p-6">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-emergency/30 bg-emergency/10 text-emergency">
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <p className="sv-terminal-overline">Offline Mode</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-text-1">
            SafeVixAI is running from cached emergency tools.
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-text-2">
            Network services are unavailable right now. SOS, first aid, emergency numbers, and queued reports remain available.
          </p>
        </div>

        <div className="grid gap-3">
          <Link href="/sos" className="sv-card sv-card-interactive flex items-center gap-3 p-4">
            <Siren className="text-emergency" size={20} aria-hidden="true" />
            <span className="text-sm font-bold text-text-1">Open Emergency SOS</span>
          </Link>
          <Link href="/first-aid" className="sv-card sv-card-interactive flex items-center gap-3 p-4">
            <BookOpen className="text-brand" size={20} aria-hidden="true" />
            <span className="text-sm font-bold text-text-1">Open First Aid Guides</span>
          </Link>
          <Link href="/locator" className="sv-card sv-card-interactive flex items-center gap-3 p-4">
            <MapPin className="text-warning" size={20} aria-hidden="true" />
            <span className="text-sm font-bold text-text-1">Open Cached Locator</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
