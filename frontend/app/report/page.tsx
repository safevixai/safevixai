
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  Mic,
  Navigation,
  Phone,
  RefreshCcw,
  Send,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { usePageEntry } from '@/hooks/usePageEntry';

import TopSearch from '@/components/dashboard/TopSearch';
import { TerminalHeader } from '@/components/ui/TerminalHeader';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import HazardViewfinder from '@/components/report/HazardViewfinder';
import {
  type AuthorityPreviewResponse,
  type RoadInfrastructureResponse,
  type RoadReportResponse,
  fetchAuthorityPreview,
  fetchRoadInfrastructure,
  reverseGeocode,
  submitReport,
} from '@/lib/api';
import { useGeolocation } from '@/lib/geolocation';
import {
  formatAccuracyLabel,
  formatLocationLabel,
  formatLocationSubtitle,
  isApproximateLocation,
} from '@/lib/location-utils';
import { useAppStore } from '@/lib/store';
import { track } from '@/lib/analytics';

const ISSUE_OPTIONS_BY_CATEGORY = {
  roads: [
    ['pothole', 'Pothole', 'Surface collapse or broken asphalt'],
    ['crack', 'Road Crack', 'Structural fissures or surface wear'],
    ['waterlogging', 'Waterlogging', 'Flooding, drainage failure, waterlogged lanes'],
    ['debris', 'Road Debris', 'Objects blocking lanes or endangering traffic'],
    ['footpath', 'Footpath', 'Broken pavements or pedestrian path blockages'],
    ['markings', 'Road Markings', 'Faded lanes, zebra crossing wear, missing paint'],
  ],
  traffic: [
    ['signal_outage', 'Signal Outage', 'Traffic light dark, flashing, or broken'],
    ['missing_sign', 'Missing Sign', 'Stop, speed limits, or warning signs missing'],
    ['zebra_crossing', 'Zebra Crossing', 'Dangerous or faded crosswalks needing repair'],
    ['speed_bump', 'Speed Bump', 'Missing warning lines or broken speed calmers'],
    ['encroachment', 'Obstruction', 'Vendors, illegal parking, or structural blocks'],
  ],
  streetlight: [
    ['dark_street', 'Dark Street', 'Entire stretch or segment with dead streetlights'],
    ['bulb_out', 'Bulb Out', 'Single lamp post bulb burned out or dim'],
    ['pole_damage', 'Pole Damage', 'Critically tilted, rusted, or structurally unsafe pole'],
    ['electrical_hazard', 'Electrical Hazard', 'Exposed wires, open junction boxes, spark risk'],
  ],
} as const;

const SEVERITY_OPTIONS = [
  [1, 'Low', 'Monitor only'],
  [2, 'Guarded', 'Needs maintenance soon'],
  [3, 'Serious', 'Affects safe driving now'],
  [4, 'Critical', 'Immediate authority response'],
  [5, 'Extreme', 'High-risk emergency condition'],
] as const;

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function extractApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const maybe = error as { response?: { data?: { detail?: string } }; message?: string };
    if (typeof maybe.response?.data?.detail === 'string') return maybe.response.data.detail;
    if (typeof maybe.message === 'string') return maybe.message;
  }
  return fallback;
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Not published';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function normalizeExternalUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}


export default function ReportPage() {
  const [mounted, setMounted] = useState(false);
  const pageRef = usePageEntry();
  const [activeCategory, setActiveCategory] = useState<'roads' | 'traffic' | 'streetlight'>('roads');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [citizenPhone, setCitizenPhone] = useState('');
  const [severity, setSeverity] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | undefined>();
  const [authorityPreview, setAuthorityPreview] = useState<AuthorityPreviewResponse | null>(null);
  const [infrastructure, setInfrastructure] = useState<RoadInfrastructureResponse | null>(null);
  const [locationDisplay, setLocationDisplay] = useState<string | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<RoadReportResponse | null>(null);

  const setGpsLocation = useAppStore((state) => state.setGpsLocation);
  const { location: gpsLocation, error: gpsError, loading: locating, refresh } = useGeolocation();

  const coordinateSignature = useMemo(() => (gpsLocation ? `${gpsLocation.lat.toFixed(4)}:${gpsLocation.lon.toFixed(4)}` : null), [gpsLocation]);

  useEffect(() => { setMounted(true); document.title = 'Report Issue | SafeVixAI'; }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoBlobUrl(undefined);
      return;
    }
    const nextUrl = URL.createObjectURL(photoFile);
    setPhotoBlobUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [photoFile]);

  useEffect(() => {
    const location = gpsLocation;
    if (!coordinateSignature || !location) return;

    const baseLocation = {
      lat: location.lat,
      lon: location.lon,
      accuracy: location.accuracy,
      timestamp: location.timestamp,
    };

    let cancelled = false;

    async function syncLocationContext() {
      setContextLoading(true);
      setContextError(null);

      const [reverseResult, authorityResult, infrastructureResult] = await Promise.allSettled([
        reverseGeocode({ lat: baseLocation.lat, lon: baseLocation.lon }),
        fetchAuthorityPreview({ lat: baseLocation.lat, lon: baseLocation.lon }),
        fetchRoadInfrastructure({ lat: baseLocation.lat, lon: baseLocation.lon }),
      ]);

      if (cancelled) return;

      let nextError: string | null = null;

      if (reverseResult.status === 'fulfilled') {
        setLocationDisplay(reverseResult.value.displayName ?? null);
        setGpsLocation({
          ...baseLocation,
          city: reverseResult.value.city ?? undefined,
          state: reverseResult.value.state ?? undefined,
          displayName: reverseResult.value.displayName ?? undefined,
        });
      } else {
        setLocationDisplay(null);
        nextError = extractApiError(
          reverseResult.reason,
          'Unable to resolve a readable address for your current coordinates.'
        );
      }

      if (authorityResult.status === 'fulfilled') {
        setAuthorityPreview(authorityResult.value);
      } else {
        setAuthorityPreview(null);
        nextError =
          nextError ??
          extractApiError(
            authorityResult.reason,
            'Road ownership lookup is temporarily unavailable.'
          );
      }

      if (infrastructureResult.status === 'fulfilled') {
        setInfrastructure(infrastructureResult.value);
      } else {
        setInfrastructure(null);
        nextError =
          nextError ??
          extractApiError(
            infrastructureResult.reason,
            'Road infrastructure data could not be loaded right now.'
          );
      }

      setContextError(nextError);
      setContextLoading(false);
    }

    void syncLocationContext();

    return () => {
      cancelled = true;
    };
  }, [coordinateSignature, gpsLocation, setGpsLocation]);

  const severityMeta = SEVERITY_OPTIONS.find((option) => option[0] === severity) ?? SEVERITY_OPTIONS[2];
  const locationLabel = formatLocationLabel(gpsLocation, gpsError);
  const locationSubtitle = gpsLocation ? locationDisplay ?? formatLocationSubtitle(gpsLocation) : 'Enable location to match the exact road-owning authority.';
  const accuracyLabel = formatAccuracyLabel(gpsLocation);
  const accuracyMeters = gpsLocation?.accuracy ?? 15;
  const accuracyColor = accuracyMeters < 10 
    ? 'text-brand-light dark:text-brand-light' 
    : accuracyMeters < 30 
      ? 'text-warning dark:text-amber-400' 
      : 'text-red-500 dark:text-red-400';
  const approximateLocation = isApproximateLocation(gpsLocation);
  const photoHint = photoFile ? `${photoFile.name} - ${(photoFile.size / (1024 * 1024)).toFixed(2)} MB` : 'JPG, PNG, or WEBP. Optional, but it speeds up verification.';

  const portalUrl = normalizeExternalUrl(submittedReport?.complaintPortal ?? authorityPreview?.complaintPortal ?? null);
  const helpline = submittedReport?.authorityPhone ?? authorityPreview?.helpline ?? null;
  const reportRoadName = submittedReport?.roadName ?? infrastructure?.roadName ?? authorityPreview?.roadName ?? null;
  const reportRoadNumber = submittedReport?.roadNumber ?? infrastructure?.roadNumber ?? authorityPreview?.roadNumber ?? null;
  const reportAuthority = submittedReport?.authorityName ?? authorityPreview?.authorityName ?? null;
  const reportType = submittedReport?.roadType ?? infrastructure?.roadType ?? authorityPreview?.roadType ?? null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gpsLocation || !selectedType) {
      setSubmitError('Please select a hazard type and enable location before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await submitReport({
        lat: gpsLocation.lat,
        lon: gpsLocation.lon,
        issue_type: selectedType,
        severity,
        description: notes,
        photo: photoFile,
        citizen_phone: citizenPhone,
      });
      setSubmittedReport(response);
      track.reportSubmitted(selectedType, !!photoFile, false);
    } catch (error) {
      setSubmittedReport(null);
      setSubmitError(extractApiError(error, 'Unable to submit the report right now. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPhotoFile(event.target.files?.[0] ?? null);
  }

  function resetForm() {
    setActiveCategory('roads');
    setSelectedType(null);
    setCitizenPhone('');
    setSeverity(3);
    setNotes('');
    setPhotoFile(null);
    setSubmitError(null);
    setSubmittedReport(null);
  }

  if (!mounted) return null;

  return (
    <div ref={pageRef} className="sv-page aurora-glow relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute right-[-10%] top-[-12%] hidden h-[38rem] w-[38rem] rounded-full bg-cyan-500/10 blur-[150px] dark:block" />
        <div className="absolute left-[22%] top-[4%] hidden h-[20rem] w-[20rem] rounded-full bg-violet-500/8 blur-[120px] dark:block" />
        <div className="absolute bottom-[-16%] left-[-8%] hidden h-[28rem] w-[28rem] rounded-full bg-brand/12 blur-[140px] dark:block" />
      </div>

      {/* ── Unified Tactical Navigation Header ── */}
      <TerminalHeader title="Hazard Dispatch Terminal" subtitle="REPORT LIVE ROAD INCIDENT" />
      
      <div className="lg:hidden relative z-[100]">
        <TopSearch isMapPage={false} forceShow={true} showBack={false} />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-44 pt-28 lg:pt-24 sm:px-6 lg:pb-10">
        
        {/* ── Dispatch Hero Section ── */}
        <section className="mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-fit items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 dark:border-brand/15 dark:bg-brand/12">
              <span className="w-1.5 h-1.5 rounded-full bg-brand/80 animate-pulse"></span>
              <span className="text-[10px] font-semibold text-brand dark:text-brand-light uppercase tracking-widest">Dispatch Sentinel</span>
            </div>
            {approximateLocation && gpsLocation && (
              <div className="flex w-fit items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 dark:border-orange-400/15 dark:bg-orange-500/12">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-widest">Approximate GPS</span>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight text-text-1 uppercase font-space leading-tight dark:bg-gradient-to-r dark:from-white dark:via-text-1 dark:to-cyan-200 dark:bg-clip-text dark:text-transparent sm:text-3xl">
              Real-Time Road Hazard Reporting
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm font-medium text-text-3 mt-1 uppercase tracking-wider opacity-70">
              Uplinking live road intel to matching authorities. Precision reporting for safer transit networks.
            </p>
          </div>
        </section>
        <div className="grid gap-6">
          <section className="space-y-6">
            <SurfaceCard padding="none" className="overflow-hidden">
              <div className="min-h-[360px] sm:min-h-[420px]">
                <HazardViewfinder imageSrc={photoBlobUrl} isDetecting={contextLoading || submitting} confidence={submittedReport ? 99.4 : contextLoading ? 96.2 : 97.8} statusLabel={submittedReport ? 'Dispatch confirmed' : contextLoading ? 'Syncing live road intel' : photoFile ? 'Photo attached and ready' : 'Live hazard viewport'} signalLabel={accuracyLabel ?? (locating ? 'Acquiring GPS' : 'Awaiting GPS')} locationLabel={gpsLocation ? `${gpsLocation.lat.toFixed(5)}, ${gpsLocation.lon.toFixed(5)}` : 'Awaiting live coordinates'} viewportId={submittedReport ? submittedReport.uuid : 'RW-LIVE-REPORT-01'} />
              </div>
            </SurfaceCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <SurfaceCard>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Location Lock</div>
                    <h2 className="mt-2 text-xl font-black tracking-tight text-text-1">{locationLabel}</h2>
                  </div>
                  <button type="button" onClick={refresh} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-2 transition hover:border-brand/20 hover:bg-brand/8 hover:text-brand active:scale-95" aria-label="Refresh location">
                    {locating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-text-2">{gpsError ?? locationSubtitle}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Accuracy</div>
                    <div className={cx("mt-2 text-sm font-semibold", gpsLocation ? accuracyColor : "text-text-1")}>{accuracyLabel ?? 'Pending device fix'}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Coordinates</div>
                    <div className="mt-2 text-sm font-semibold text-text-1">{gpsLocation ? `${gpsLocation.lat.toFixed(5)}, ${gpsLocation.lon.toFixed(5)}` : '--'}</div>
                  </div>
                </div>
                {approximateLocation && gpsLocation ? <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-400/20 dark:bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(120,53,15,0.16))] dark:text-warning">Your browser is giving an approximate location. You can still report, but a sharper GPS fix will improve road ownership matching.</div> : null}
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Evidence Capture</div>
                    <h2 className="mt-2 text-xl font-black tracking-tight text-text-1">Optional photo uplink</h2>
                  </div>
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-2"><Camera size={18} /></div>
                </div>
                <label htmlFor="hazard-photo" className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-surface-2 px-5 py-8 text-center transition hover:border-brand/30 hover:bg-brand/70 dark:hover:border-brand/20 dark:hover:bg-brand/10 relative overflow-hidden group">
                  {photoBlobUrl && (
                    <div className="absolute inset-0 w-full h-full bg-black/60 z-0">
                      <Image src={photoBlobUrl} alt="Preview" fill unoptimized className="object-cover opacity-60 group-hover:opacity-40 transition" />
                    </div>
                  )}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-brand/15 text-brand dark:bg-brand/16 dark:text-white shadow-sm"><Upload size={22} /></div>
                    <div className={`mt-4 text-sm font-semibold uppercase tracking-[0.18em] ${photoBlobUrl ? 'text-white' : 'text-text-1'}`}>{photoFile ? 'Replace photo' : 'Attach road image'}</div>
                    <p className={`mt-2 max-w-xs text-sm ${photoBlobUrl ? 'text-text-1' : 'text-text-3'}`}>{photoHint}</p>
                  </div>
                </label>
                <input id="hazard-photo" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
              </SurfaceCard>
            </div>
          </section>

          <section className="space-y-6">
            <SurfaceCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Report Dispatch Form</div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-text-1">Flag the hazard with live authority routing</h2>
                </div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-2"><Send size={18} /></div>
              </div>

              {!submittedReport ? (
                <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                  {/* Category Tabs */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Incident Category</div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {(['roads', 'traffic', 'streetlight'] as const).map((cat) => {
                        const active = activeCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setActiveCategory(cat);
                              setSelectedType(null);
                            }}
                            className={cx(
                              'rounded-xl border px-3 py-3 text-center transition font-semibold uppercase tracking-[0.1em] text-xs',
                              active
                                ? 'border-brand bg-brand/10 text-brand-light'
                                : 'border-border bg-surface-2 text-text-2 hover:bg-surface-3'
                            )}
                          >
                            {cat === 'roads' ? '🛣️ Roads' : cat === 'traffic' ? '🚦 Traffic' : '💡 Streetlights'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category specific sub-types */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Hazard Type</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {ISSUE_OPTIONS_BY_CATEGORY[activeCategory].map(([value, label, detail], index) => {
                        const active = value === selectedType;
                        const activeAccent = [
                          'border-brand/30 bg-brand/10 text-brand-light dark:border-brand-light/30',
                          'border-orange-500/30 bg-orange-500/10 text-orange-400',
                          'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
                          'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                          'border-purple-500/30 bg-purple-500/10 text-purple-400',
                          'border-rose-500/30 bg-rose-500/10 text-rose-400',
                        ][index % 6];
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setSelectedType(value)}
                            className={cx(
                              'rounded-[1.5rem] border px-4 py-4 text-left transition',
                              active
                                ? activeAccent
                                : 'border-border bg-surface-2 text-text-2 hover:bg-surface-3'
                            )}
                          >
                            <div className="text-sm font-semibold uppercase tracking-[0.16em]">{label}</div>
                            <p className="mt-2 text-xs font-medium opacity-80">{detail}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Citizen Phone Input */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Your Phone Number</div>
                    <input
                      type="tel"
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value.replace(/[^0-9+]/g, '').slice(0, 15))}
                      placeholder="e.g. +919876543210 (For real-time SMS updates)"
                      className="mt-3 w-full rounded-[1.5rem] border border-border bg-surface-2 px-4 py-3 text-sm font-medium text-text-1 outline-none transition placeholder:text-text-3 focus:border-brand/40 focus:bg-surface-3"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Severity</div>
                      <div className="text-sm font-semibold text-text-2">{severityMeta[1]} - {severityMeta[2]}</div>
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {SEVERITY_OPTIONS.map(([value, label]) => {
                        const active = value === severity;
                        return (
                          <button key={value} type="button" onClick={() => setSeverity(value)} className={cx('rounded-lg border px-3 py-4 text-center transition', active ? value >= 4 ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/20' : 'border-brand bg-brand/80 text-white shadow-lg shadow-brand/20' : 'border-border bg-surface-2 text-text-2 hover:border-border dark:text-text-1')}>
                            <div className="text-lg font-black leading-none">{value}</div>
                            <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Notes for the authority desk</div>
                      <div className="text-xs font-semibold text-text-3">{notes.trim().length}/480</div>
                    </div>
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 480))} placeholder="Describe lane blockage, vehicle risk, traffic density, or how the hazard presents on the road." className="mt-3 min-h-[140px] w-full rounded-[1.5rem] border border-border bg-surface-2 px-4 py-4 text-sm font-medium text-text-1 outline-none transition placeholder:text-text-3 focus:border-brand/40 focus:bg-white dark:focus:border-brand/40 dark:focus:bg-surface-3" />
                  </div>

                  {submitError ? <div className="rounded-[1.5rem] border border-emergency/20 bg-emergency/10 px-4 py-3 text-sm font-semibold text-red-900 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-100">{submitError}</div> : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" disabled={submitting || !gpsLocation || !selectedType} className="inline-flex flex-1 items-center justify-center gap-3 rounded-[1.6rem] bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 px-5 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-[0_24px_80px_rgba(239,68,68,0.24)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      {submitting ? 'Submitting...' : 'Submit live report'}
                    </button>
                    <button type="button" onClick={resetForm} className="inline-flex items-center justify-center gap-3 rounded-[1.6rem] border border-border bg-surface-2 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-text-2 transition hover:border-border hover:bg-white dark:hover:border-white/20 dark:hover:bg-white/10">
                      <RefreshCcw size={18} />Reset
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center text-center py-10">
                  <div className="w-24 h-24 rounded-full bg-brand-light/20 flex items-center justify-center animate-pulse mb-6">
                    <CheckCircle2 size={48} className="text-brand-light" />
                  </div>
                  <h3 className="text-3xl font-black text-text-1 font-space tracking-tight">Report Uplinked</h3>
                  <p className="mt-3 text-text-3 max-w-sm">Your hazard report has been successfully dispatched to the regional authority dashboard.</p>
                </div>
              )}
            </SurfaceCard>
                  {submittedReport ? (
                <div>
                  <SurfaceCard className="border-brand-light/20 bg-brand-light/10 dark:border-brand-light/20 dark:bg-brand-light/10">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-brand-light/20 bg-brand-light/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand dark:border-brand-light/20 dark:bg-brand-light/10 dark:text-brand-light"><span className="h-1.5 w-1.5 rounded-full bg-current" />Report uplinked</span>
                        <h3 className="mt-3 text-2xl font-black tracking-tight text-text-1 dark:text-brand-light">Complaint reference {submittedReport.complaintRef ?? submittedReport.uuid}</h3>
                        <p className="mt-2 text-sm font-semibold text-text-2 dark:text-brand-light">The report is now tagged to {submittedReport.authorityName} for the {submittedReport.roadType} network.</p>
                      </div>
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-brand text-white shadow-lg shadow-brand/20"><CheckCircle2 size={22} /></div>
                    </div>

                    {submittedReport.duplicateOfUuid && (
                      <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-600 dark:border-amber-400/20 dark:bg-amber-500/12 dark:text-warning flex items-center gap-3">
                        <AlertTriangle className="animate-pulse flex-shrink-0" size={18} />
                        <span>Duplicate Detected: A similar issue has already been reported here. Your feedback has been merged into the main ticket to escalate resolution priority!</span>
                      </div>
                    )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-brand-light/20 bg-white/80 px-4 py-3 dark:border-brand-light/20 dark:bg-brand/10">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand dark:text-brand-light">Authority desk</div>
                        <div className="mt-2 text-lg font-black text-text-1 dark:text-brand-light">{submittedReport.authorityName}</div>
                        <a href={`tel:${submittedReport.authorityPhone}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-brand underline decoration-brand-light underline-offset-4 dark:text-brand-light"><Phone size={14} />{submittedReport.authorityPhone}</a>
                      </div>
                      <div className="rounded-lg border border-brand-light/20 bg-white/80 px-4 py-3 dark:border-brand-light/20 dark:bg-brand/10">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand dark:text-brand-light">Tagged road asset</div>
                        <div className="mt-2 text-lg font-black text-text-1 dark:text-brand-light">{[submittedReport.roadNumber, submittedReport.roadName].filter(Boolean).join(' - ') || submittedReport.roadType}</div>
                        <div className="mt-2 text-sm font-semibold text-text-2 dark:text-brand-light">{submittedReport.roadType}</div>
                      </div>
                      {submittedReport.slaDeadline && (
                        <div className="rounded-lg border border-brand-light/20 bg-white/80 px-4 py-3 dark:border-brand-light/20 dark:bg-brand/10 sm:col-span-2">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand dark:text-brand-light">SLA Resolution Target</div>
                          <div className="mt-2 text-lg font-black text-text-1 dark:text-brand-light">
                            {new Date(submittedReport.slaDeadline).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                          <div className="mt-2 text-xs font-semibold text-text-3 dark:text-brand-light">Guaranteed response timeline</div>
                        </div>
                      )}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link href={`/report/track?ref=${submittedReport.complaintRef ?? submittedReport.uuid}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500"><MapPin size={16} />Track Complaint Progress</Link>
                      {portalUrl ? <a href={portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-lg shadow-brand/20 transition hover:bg-brand-light"><Navigation size={16} />Open complaint portal</a> : null}
                      <button type="button" onClick={resetForm} className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-light/20 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand transition hover:border-brand-light dark:border-brand-light/20 dark:bg-brand/10 dark:text-brand-light dark:hover:bg-brand/20"><RefreshCcw size={16} />File another report</button>
                    </div>
                  </SurfaceCard>
                </div>
              ) : null}

            <SurfaceCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Live Authority Match</div>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-text-1">{reportAuthority ?? 'Waiting for road ownership lookup'}</h2>
                </div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-2">{contextLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}</div>
              </div>
              {contextError ? <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-400/20 dark:bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(120,53,15,0.16))] dark:text-warning">{contextError}</div> : null}
              <div className="mt-4 divide-y divide-border">
                <div className="flex items-start justify-between gap-4 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Road</div><div className="max-w-[65%] text-right text-sm font-semibold text-text-1">{[reportRoadNumber, reportRoadName].filter(Boolean).join(' - ') || reportType || 'Not available'}</div></div>
                <div className="flex items-start justify-between gap-4 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Authority</div><div className="max-w-[65%] text-right text-sm font-semibold text-text-1">{reportAuthority ?? 'Not available'}</div></div>
                <div className="flex items-start justify-between gap-4 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Helpline</div><div className="max-w-[65%] text-right text-sm font-semibold text-text-1">{helpline ? <a href={`tel:${helpline}`} className="text-brand dark:text-brand-light underline decoration-brand-light underline-offset-4 hover:text-brand dark:text-brand-light">{helpline}</a> : 'Not available'}</div></div>
                <div className="flex items-start justify-between gap-4 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Portal</div><div className="max-w-[65%] text-right text-sm font-semibold text-text-1">{portalUrl ? <a href={portalUrl} target="_blank" rel="noreferrer" className="text-brand dark:text-brand-light underline decoration-brand-light underline-offset-4 hover:text-brand dark:text-brand-light">Open official complaint portal</a> : 'Portal not listed'}</div></div>
                <div className="flex items-start justify-between gap-4 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Escalation</div><div className="max-w-[65%] text-right text-sm font-semibold text-text-1">{authorityPreview?.escalationPath ?? 'Not available'}</div></div>
                <div className="flex items-start justify-between gap-4 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Executive engineer</div><div className="max-w-[65%] text-right text-sm font-semibold text-text-1">{authorityPreview?.execEngineer ?? infrastructure?.execEngineer ?? 'Not available'}</div></div>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Road Asset Intelligence</div>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-text-1">{reportRoadNumber ?? reportRoadName ?? 'Infrastructure metadata pending'}</h2>
                </div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-2"><MapPin size={18} /></div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface-2 px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Road type</div><div className="mt-2 text-sm font-semibold text-text-1">{reportType ?? 'Waiting for live match'}</div></div>
                <div className="rounded-lg border border-border bg-surface-2 px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Contractor</div><div className="mt-2 text-sm font-semibold text-text-1">{infrastructure?.contractorName ?? submittedReport?.contractorName ?? 'Not published'}</div></div>
                <div className="rounded-lg border border-border bg-surface-2 px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Budget sanctioned</div><div className="mt-2 text-sm font-semibold text-text-1">{formatMoney(submittedReport?.budgetSanctioned ?? infrastructure?.budgetSanctioned ?? null)}</div></div>
                <div className="rounded-lg border border-border bg-surface-2 px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Next maintenance</div><div className="mt-2 text-sm font-semibold text-text-1">{submittedReport?.nextMaintenance ?? infrastructure?.nextMaintenance ?? authorityPreview?.nextMaintenance ?? 'Not scheduled'}</div></div>
              </div>
            </SurfaceCard>

            {/* Powered by SafeVixAI notice */}
            <SurfaceCard className="border-border">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-white dark:bg-brand-light dark:text-text-1"><ShieldAlert size={18} /></div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">SafeVixAI Platform</div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-text-2">Reports are dispatched to the correct road-owning authority using live GPS coordinates, real-time infrastructure data, and India&apos;s road ownership database. Your report helps make roads safer.</p>
                </div>
              </div>
            </SurfaceCard>
          </section>
        </div>
      </main>

      <div className="fixed right-4 top-[92px] z-30 flex flex-col gap-3 lg:right-8">
        <button type="button" onClick={refresh} className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-1/75 text-text-2 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-brand" aria-label="Refresh live location">
          {locating ? <Loader2 size={20} className="animate-spin" /> : <Navigation size={20} />}
        </button>
      </div>

      <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-30 lg:hidden">
        <Link href="/locator" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-1/85 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-text-1 shadow-xl backdrop-blur-xl">
          <Mic size={16} />Nearby help
        </Link>
      </div>

    </div>
  );
}

