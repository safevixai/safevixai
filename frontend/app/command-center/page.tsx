'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ShieldAlert,
  Loader2,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  UserCheck,
  Send,
  MapPin,
  Calendar,
  CheckCircle,
  ThumbsUp,
  Activity,
  PlusCircle,
  BarChart3,
  Clock,
} from 'lucide-react';

import { TerminalHeader } from '@/components/ui/TerminalHeader';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { client } from '@/lib/api';

// Dynamically import MapLibre Component to disable SSR
const MapLibreDashboard = dynamic(() => import('@/components/command-center/MapLibreDashboard'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] bg-slate-900 rounded-[1.8rem] flex items-center justify-center border border-border">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-brand" />
        <span className="text-xs font-semibold uppercase tracking-widest text-text-3">Warming GIS Engines...</span>
      </div>
    </div>
  ),
});

interface KPI {
  active_complaints: number;
  resolved_complaints: number;
  total_complaints: number;
  sla_breaches: number;
  active_field_officers: number;
  overall_resolution_rate: number;
}

interface Officer {
  id: string;
  name: string;
  department: string;
  role: string;
  is_active: boolean;
  ward_id: string;
  last_checkin?: string | null;
}

interface Complaint {
  uuid: string;
  complaint_ref: string;
  issue_type: string;
  severity: number;
  description: string;
  location_address: string;
  status: string;
  created_at: string;
  category: string;
  ward_name: string;
  assigned_officer_id?: string | null;
  sla_deadline?: string | null;
}

interface WardSummary {
  ward_id: string;
  ward_name: string;
  zone_name: string;
  open_issues: number;
  resolved_issues: number;
  resolution_rate: number;
  sla_breach_count: number;
}

export default function CommandCenterPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [categories, setCategories] = useState<Record<string, number>>({ roads: 0, traffic: 0, streetlight: 0 });
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [breaches, setBreaches] = useState<Complaint[]>([]);
  
  // Selection states for assignment modal/inline
  const [assigningUuid, setAssigningUuid] = useState<string | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  async function loadDashboardData() {
    try {
      // 1. Fetch Overall Stats (Admin Dashboard)
      const statsRes = await client.get('/api/v1/admin/dashboard');
      setKpis(statsRes.data.kpis);
      setCategories(statsRes.data.category_breakdown);

      // 2. Fetch Open Complaints
      const complaintsRes = await client.get('/api/v1/admin/complaints', { params: { limit: 50 } });
      setComplaints(complaintsRes.data.issues || []);

      // 3. Fetch Officers
      const officersRes = await client.get('/api/v1/admin/officers');
      setOfficers(officersRes.data || []);

      // 4. Fetch Ward Summaries
      const wardsRes = await client.get('/api/v1/analytics/ward-summary');
      setWards(wardsRes.data || []);

      // 5. Fetch SLA Breaches
      const breachesRes = await client.get('/api/v1/analytics/sla-breach');
      setBreaches(breachesRes.data || []);

    } catch (err) {
      console.error("Failed to load command center data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    document.title = 'Command Center | SafeVixAI';
    loadDashboardData();
    // Refresh every 30 seconds for live feel
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleAssign(issueUuid: string) {
    if (!selectedOfficerId) return;
    setActionLoading(true);
    try {
      await client.post(`/api/v1/admin/complaints/${issueUuid}/assign`, null, {
        params: { officer_id: selectedOfficerId },
      });
      setAssigningUuid(null);
      setSelectedOfficerId('');
      // Reload dashboard KPIs and lists
      await loadDashboardData();
    } catch (err) {
      console.error("Assignment failed:", err);
    } finally {
      setActionLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="sv-page aurora-glow relative min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute right-[-10%] top-[-10%] h-[40rem] w-[40rem] rounded-full bg-brand/5 blur-[150px]" />
        <div className="absolute left-[-5%] top-[10%] h-[30rem] w-[30rem] rounded-full bg-cyan-500/5 blur-[130px]" />
      </div>

      <TerminalHeader title="Civic Intelligence Center" subtitle="GCC ROAD WATCH COMMAND SENTINEL" />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-28 sm:px-6">
        
        {loading ? (
          <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
            <Loader2 size={42} className="animate-spin text-brand" />
            <div className="text-xs font-black uppercase tracking-[0.2em] text-text-3">DISPATCHING SENSORS...</div>
          </div>
        ) : (
          <div className="grid gap-6">
            
            {/* ── KPI Grid ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SurfaceCard className="border-cyan-500/20 bg-cyan-950/10">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">ACTIVE INCIDENTS</div>
                  <Activity size={16} className="text-cyan-400 animate-pulse" />
                </div>
                <div className="mt-4 text-3xl font-black font-space tracking-tight text-white">{kpis?.active_complaints ?? 0}</div>
                <div className="mt-2 text-[10px] font-semibold text-text-3 uppercase tracking-wider">Deserving Immediate Patrol</div>
              </SurfaceCard>

              <SurfaceCard className="border-red-500/20 bg-red-950/10">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">SLA BREACHES</div>
                  <Clock size={16} className="text-red-400 animate-bounce" />
                </div>
                <div className="mt-4 text-3xl font-black font-space tracking-tight text-white">{kpis?.sla_breaches ?? 0}</div>
                <div className="mt-2 text-[10px] font-semibold text-red-400 uppercase tracking-wider font-semibold animate-pulse">Needs Escalation</div>
              </SurfaceCard>

              <SurfaceCard className="border-emerald-500/20 bg-emerald-950/10">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">RESOLVED TICKETS</div>
                  <CheckCircle size={16} className="text-emerald-400" />
                </div>
                <div className="mt-4 text-3xl font-black font-space tracking-tight text-white">{kpis?.resolved_complaints ?? 0}</div>
                <div className="mt-2 text-[10px] font-semibold text-text-3 uppercase tracking-wider">{kpis?.overall_resolution_rate ?? 0}% overall resolution rate</div>
              </SurfaceCard>

              <SurfaceCard className="border-brand/20 bg-brand/10">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-light">ACTIVE TEAMS</div>
                  <UserCheck size={16} className="text-brand-light" />
                </div>
                <div className="mt-4 text-3xl font-black font-space tracking-tight text-white">{kpis?.active_field_officers ?? 0}</div>
                <div className="mt-2 text-[10px] font-semibold text-text-3 uppercase tracking-wider">GPS tracked field squads</div>
              </SurfaceCard>
            </div>

            {/* ── GIS Map and Breakdown Row ── */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SurfaceCard padding="none" className="h-full overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">GCC LIVE FEEDS</div>
                    <h2 className="text-lg font-black font-space tracking-tight text-text-1">GCC CHOROPLETH WARD HEATMAP</h2>
                  </div>
                  <div className="h-[380px] w-full">
                    <MapLibreDashboard activeCategory="" />
                  </div>
                </SurfaceCard>
              </div>

              {/* Category charts & breaches */}
              <div className="flex flex-col gap-6">
                <SurfaceCard className="flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Category Breakdown</div>
                  <h3 className="mt-1 text-lg font-black font-space tracking-tight text-text-1 uppercase">DISTRIBUTION BY DEPARTMENTS</h3>
                  
                  <div className="mt-6 space-y-4">
                    {/* Roads */}
                    <div>
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-text-2">
                        <span>🛣️ Roads & Bridges</span>
                        <span>{categories.roads}</span>
                      </div>
                      <div className="mt-2 h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(categories.roads / (kpis?.active_complaints || 1)) * 100}%` }} />
                      </div>
                    </div>

                    {/* Traffic */}
                    <div>
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-text-2">
                        <span>🚦 Traffic & Signage</span>
                        <span>{categories.traffic}</span>
                      </div>
                      <div className="mt-2 h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(categories.traffic / (kpis?.active_complaints || 1)) * 100}%` }} />
                      </div>
                    </div>

                    {/* Streetlight */}
                    <div>
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-text-2">
                        <span>💡 Public Streetlighting</span>
                        <span>{categories.streetlight}</span>
                      </div>
                      <div className="mt-2 h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-brand-light rounded-full" style={{ width: `${(categories.streetlight / (kpis?.active_complaints || 1)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </SurfaceCard>

                {/* SLA Breaches Alerts */}
                <SurfaceCard className="max-h-[220px] overflow-y-auto">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                    <AlertTriangle size={12} className="animate-pulse" />
                    CRITICAL SLA BREACH FEED ({breaches.length})
                  </div>
                  
                  <div className="mt-3 divide-y divide-border/10">
                    {breaches.slice(0, 5).map((b) => (
                      <div key={b.uuid} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase tracking-wider text-white truncate">{b.complaint_ref} — {b.issue_type}</div>
                          <div className="text-[10px] text-text-3 mt-0.5 truncate">{b.location_address}</div>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                          OVERDUE
                        </span>
                      </div>
                    ))}
                    {breaches.length === 0 && (
                      <div className="text-xs text-text-3 font-semibold py-4 text-center">No active SLA breaches! Good response time.</div>
                    )}
                  </div>
                </SurfaceCard>
              </div>
            </div>

            {/* ── Active Incident Feed & Live Assignment ── */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Incident list */}
              <div className="lg:col-span-2">
                <SurfaceCard>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Dispatch Desk</div>
                  <h2 className="mt-1 text-xl font-black font-space tracking-tight text-text-1 uppercase">LIVE CITIZEN COMPLAINT STREAM</h2>
                  
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/20 text-[10px] font-black uppercase tracking-widest text-text-3">
                          <th className="pb-3">REF / TYPE</th>
                          <th className="pb-3">LOCATION</th>
                          <th className="pb-3">SEVERITY</th>
                          <th className="pb-3 text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10 text-xs">
                        {complaints.map((c) => (
                          <tr key={c.uuid} className="hover:bg-surface-2 transition">
                            <td className="py-4 pr-3">
                              <div className="font-black text-white">{c.complaint_ref}</div>
                              <div className="text-[10px] text-text-3 mt-1 uppercase tracking-wider">{c.category} - {c.issue_type}</div>
                            </td>
                            <td className="py-4 pr-3 max-w-[200px] truncate">
                              <div className="font-semibold text-text-2">{c.location_address || 'Chennai Link Road'}</div>
                              <div className="text-[10px] text-text-3 mt-1 uppercase tracking-wider">{c.ward_name}</div>
                            </td>
                            <td className="py-4 pr-3">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                c.severity >= 4 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-brand/10 text-brand-light border border-brand/20'
                              }`}>
                                Sev {c.severity}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              {assigningUuid === c.uuid ? (
                                <div className="inline-flex items-center gap-2">
                                  <select
                                    value={selectedOfficerId}
                                    onChange={(e) => setSelectedOfficerId(e.target.value)}
                                    className="rounded bg-slate-900 border border-border text-xs px-2 py-1 outline-none font-semibold"
                                  >
                                    <option value="">Select Officer</option>
                                    {officers.map((o) => (
                                      <option key={o.id} value={o.id}>{o.name} ({o.department})</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleAssign(c.uuid)}
                                    disabled={actionLoading || !selectedOfficerId}
                                    className="bg-brand text-white text-[10px] font-black px-2.5 py-1 rounded transition hover:bg-brand-light disabled:opacity-50"
                                  >
                                    OK
                                  </button>
                                  <button
                                    onClick={() => setAssigningUuid(null)}
                                    className="bg-slate-800 text-text-2 text-[10px] font-black px-2.5 py-1 rounded hover:bg-slate-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setAssigningUuid(c.uuid);
                                    setSelectedOfficerId('');
                                  }}
                                  className={`px-3 py-1.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-wider border transition ${
                                    c.assigned_officer_id
                                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                      : 'border-brand/20 bg-brand/10 text-brand-light hover:bg-brand/20'
                                  }`}
                                >
                                  {c.assigned_officer_id ? 'Assigned ✅' : 'Assign Squad'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SurfaceCard>
              </div>

              {/* Ward leaderboards */}
              <div className="flex flex-col gap-6">
                <SurfaceCard>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-3">Ward Leaderboard</div>
                  <h3 className="mt-1 text-lg font-black font-space tracking-tight text-text-1 uppercase">RESOLUTION SPEED RANKINGS</h3>
                  
                  <div className="mt-5 divide-y divide-border/10">
                    {wards.map((w, index) => (
                      <div key={w.ward_id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-text-3">{index + 1}</span>
                          <div>
                            <div className="font-bold text-white uppercase tracking-wider">{w.ward_name}</div>
                            <div className="text-[10px] text-text-3 mt-0.5">{w.zone_name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-brand-light">{w.resolution_rate}%</div>
                          <div className="text-[9px] text-text-3 mt-0.5">{w.open_issues} Open / {w.sla_breach_count} Breached</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
