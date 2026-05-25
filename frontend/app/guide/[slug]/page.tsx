'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Users,
  MapPin,
  Phone,
  Ruler,
  Loader2,
  Landmark,
  Info,
  Wrench,
} from 'lucide-react';

import { ContactChannels } from '@/components/guide/ContactChannels';
import { LeadershipCard } from '@/components/guide/LeadershipCard';
import type { Municipality, MunicipalityDetail } from '@/lib/api';
import { fetchMunicipalityBySlug } from '@/lib/api';

function formatPopulation(pop: number | null): string {
  if (!pop) return '—';
  if (pop >= 10_000_000) return `${(pop / 10_000_000).toFixed(2)} Crore`;
  if (pop >= 100_000) return `${(pop / 100_000).toFixed(2)} Lakh`;
  return pop.toLocaleString('en-IN');
}

export default function MunicipalityDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [municipality, setMunicipality] = useState<MunicipalityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMunicipalityBySlug(slug);
        setMunicipality(data);
      } catch {
        // Fallback to offline bundle
        try {
          const res = await fetch('/offline-data/municipalities_bundle.json');
          const all = await res.json();
          const found = all.find((m: Municipality) => m.slug === slug);
          if (found) {
            setMunicipality({
              slug: found.slug,
              name: found.name,
              shortName: found.short_name ?? '',
              city: found.city,
              stateCode: found.state_code ?? '',
              municipalityType: found.municipality_type ?? '',
              wardCount: found.ward_count ?? null,
              population: found.population ?? null,
              helplinePhone: found.helpline_phone ?? null,
              centroidLat: found.centroid_lat ?? 0,
              centroidLon: found.centroid_lon ?? 0,
              headquartersAddress: null,
              email: null,
              websiteUrl: null,
              whatsappNumber: null,
              appName: null,
              appUrl: null,
              grievancePortalUrl: null,
              mayorName: null,
              mayorPhotoUrl: null,
              commissionerName: null,
              commissionerPhone: null,
              areaSqkm: null,
              description: null,
              servicesOffered: null,
            });
          } else {
            setError('Municipality not found');
          }
        } catch {
          setError('Failed to load municipality details');
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-brand" />
          <p className="text-sm font-semibold uppercase tracking-widest text-text-3">Loading municipality...</p>
        </div>
      </div>
    );
  }

  if (error || !municipality) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Building2 size={48} className="text-text-3" />
          <p className="text-sm font-semibold text-text-3">{error || 'Municipality not found'}</p>
          <Link href="/guide" className="text-sm text-brand-light hover:underline">← Back to Guide</Link>
        </div>
      </div>
    );
  }

  const m = municipality;

  return (
    <div className="min-h-screen bg-surface-1 px-4 md:px-8 py-6 pb-24">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-3 mb-4">
        <Link href="/" className="hover:text-text-1 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/guide" className="hover:text-text-1 transition-colors">Guide</Link>
        <span>/</span>
        <span className="text-text-2 font-semibold truncate">{m.name}</span>
      </div>

      {/* Back button */}
      <Link
        href="/guide"
        className="inline-flex items-center gap-2 mb-4 text-sm text-text-2 hover:text-brand-light transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Guide</span>
      </Link>

      {/* Hero */}
      <div className="relative p-6 md:p-8 rounded-2xl bg-surface-2/70 border border-border overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.06] to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-lg bg-brand/20 text-brand-light text-xs font-bold uppercase tracking-wider">
              {m.shortName || m.stateCode}
            </span>
            <span className="px-3 py-1 rounded-lg bg-surface-3 text-text-3 text-xs font-bold uppercase tracking-wider">
              {m.municipalityType === 'municipal_corporation' ? 'Municipal Corporation' : 'Municipality'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-text-1 mb-2">{m.name}</h1>
          <div className="flex items-center gap-2 text-text-2">
            <MapPin size={14} />
            <span className="text-sm">{m.city}, {m.stateCode}</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Users size={18} />} label="Population" value={formatPopulation(m.population)} />
        <StatCard icon={<Ruler size={18} />} label="Area" value={m.areaSqkm ? `${m.areaSqkm} km²` : '—'} />
        <StatCard icon={<Building2 size={18} />} label="Wards" value={m.wardCount ? String(m.wardCount) : '—'} />
        <StatCard icon={<Phone size={18} />} label="Helpline" value={m.helplinePhone || '—'} isPhone={!!m.helplinePhone} phone={m.helplinePhone} />
      </div>

      {/* Contact Channels */}
      <Section icon={<Phone size={18} />} title="Contact Channels">
        <ContactChannels municipality={m} />
      </Section>

      {/* Leadership */}
      <Section icon={<Landmark size={18} />} title="Leadership">
        <LeadershipCard municipality={m} />
      </Section>

      {/* About */}
      {m.description && (
        <Section icon={<Info size={18} />} title="About">
          <p className="text-sm text-text-2 leading-relaxed">{m.description}</p>
        </Section>
      )}

      {/* Services */}
      {m.servicesOffered && m.servicesOffered.length > 0 && (
        <Section icon={<Wrench size={18} />} title="Services Offered">
          <div className="flex flex-wrap gap-2">
            {m.servicesOffered.map((svc) => (
              <span
                key={svc}
                className="px-3 py-1.5 rounded-lg bg-surface-3 text-xs font-semibold text-text-2 border border-border"
              >
                {svc}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-brand/10 text-brand-light">{icon}</div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-1">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  isPhone,
  phone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isPhone?: boolean;
  phone?: string | null;
}) {
  const content = (
    <div className={`flex flex-col items-center justify-center p-4 rounded-xl bg-surface-2/70 border border-border text-center ${isPhone ? 'hover:border-brand/40 cursor-pointer' : ''}`}>
      <div className="text-brand-light mb-2">{icon}</div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-3 mb-1">{label}</p>
      <p className="text-sm font-bold text-text-1 font-mono">{value}</p>
    </div>
  );

  if (isPhone && phone) {
    return <a href={`tel:${phone}`}>{content}</a>;
  }
  return content;
}
