'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { 
  Car, Truck, Bike, Bus, AlertTriangle, 
  Scale, MapPin, 
  ArrowRight, Activity, Zap
} from 'lucide-react';
import TopSearch from '@/components/dashboard/TopSearch';
import SystemHeader from '@/components/dashboard/SystemHeader';
import { useAppStore } from '@/lib/store';
import useSWR from 'swr';
import { calculateChallan } from '@/lib/api';
import { loadChallanMetadata } from '@/lib/challan-metadata';
import { useShallow } from 'zustand/react/shallow';
import { track } from '@/lib/analytics';
import { useSwipe } from '@/hooks/useSwipe';

const STATES = [
  'Tamil Nadu (TN)',
  'Delhi (DL)',
  'Maharashtra (MH)',
  'Karnataka (KA)',
  'Uttar Pradesh (UP)',
  'West Bengal (WB)',
];

// Mapped to backend violation_codes
const VIOLATIONS = [
  { id: '183', label: 'Speeding (>20km/h Limit)', mva: 'Section 112/183', max: '4000' },
  { id: '179', label: 'Disobedience / Red Light', mva: 'Section 179', max: '4000' },
  { id: '185', label: 'Section 185 - Drunk driving', mva: 'Section 185', max: '15000 + Imprisonment', danger: 'Up to 6 months imprisonment' },
  { id: '181', label: 'Driving Without License', mva: 'Section 3/181', max: '10000 + 3 Months' },
  { id: '194D', label: 'No Seatbelt/Helmet', mva: 'Section 129/194D', max: '2000 + Disqualification' },
];

const VEHICLE_CLASSES = [
  { id: '2W', icon: <Bike size={28} />, title: '2-Wheeler', subtitle: 'Motorcycle / Scooter' },
  { id: '4W', icon: <Car size={28} />, title: 'Car/LMV', subtitle: 'Light Motor Vehicle' },
  { id: 'HTV', icon: <Truck size={28} />, title: 'Truck', subtitle: 'Heavy Goods Vehicle' },
  { id: 'BUS', icon: <Bus size={28} />, title: 'Bus/COMM', subtitle: 'Public Transport' },
];

export default function ChallanPage() {
  // Use shared store instead of local state so values don't reset upon tab change
  const { challanState, setChallanState } = useAppStore(useShallow((s) => ({ challanState: s.challanState, setChallanState: s.setChallanState })));
  
  // Backwards compatibility for old cached local storage values
  const violationId = (challanState.violation === 'dui') ? '185' : 
                      (challanState.violation === 'speeding') ? '183' :
                      (challanState.violation === 'nolicense') ? '181' :
                      (challanState.violation === 'helmet_seatbelt') ? '194D' :
                      (challanState.violation === 'redlight') ? '179' :
                      challanState.violation;
                      
  const vehicleId = challanState.vehicle.toUpperCase();
  const { jurisdiction, isRepeat } = challanState;
  
  const stateCodeMatch = jurisdiction.match(/\((.*?)\)/);
  const stateCode = stateCodeMatch ? stateCodeMatch[1] : 'TN';

  const [showDetailToast, setShowDetailToast] = useState(false);
  const { data: metadata } = useSWR('challan-metadata', loadChallanMetadata, {
    revalidateOnFocus: false,
  });
  const violationOptions = metadata?.violations?.length ? metadata.violations : VIOLATIONS;
  const stateOptions = metadata?.states?.length ? metadata.states.map((state) => state.label) : STATES;

  // Swipe section navigation
  const [swipeSection, setSwipeSection] = useState(0);
  const violationRef = useRef<HTMLElement>(null);
  const vehicleSectionRef = useRef<HTMLElement>(null);
  const paramsRef = useRef<HTMLElement>(null);
  const insightRef = useRef<HTMLDivElement>(null);
  const swipeSections = useMemo(() => [violationRef, vehicleSectionRef, paramsRef, insightRef], []);

  const { onTouchStart: swipeStart, onTouchEnd: swipeEnd } = useSwipe({
    onSwipeLeft: () => {
      if (swipeSection < swipeSections.length - 1) {
        const next = swipeSection + 1;
        setSwipeSection(next);
        swipeSections[next].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    onSwipeRight: () => {
      if (swipeSection > 0) {
        const prev = swipeSection - 1;
        setSwipeSection(prev);
        swipeSections[prev].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  });

  // GSAP refs
  const fineRef = useRef<HTMLHeadingElement>(null);
  const resultCardRef = useRef<HTMLElement>(null);
  const dangerRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const vehicleGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = 'Challan Calculator | SafeVixAI'; }, []);



  // GSAP: Toggle animation
  useGSAP(() => {
    if (!toggleRef.current) return;
    gsap.to(toggleRef.current, {
      x: isRepeat ? 22 : 2,
      duration: 0.2,
      ease: 'bounce',
    });
  }, { dependencies: [isRepeat] });

  // GSAP: Vehicle cards stagger
  useGSAP(() => {
    if (!vehicleGridRef.current) return;
    gsap.fromTo(vehicleGridRef.current.children,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: 'power2.out' }
    );
  }, { scope: vehicleGridRef });



  // GSAP: Toast
  useGSAP(() => {
    if (!toastRef.current) return;
    if (showDetailToast) {
      gsap.fromTo(toastRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.2 }
      );
    } else {
      gsap.to(toastRef.current, { opacity: 0, y: 10, duration: 0.2 });
    }
  }, { dependencies: [showDetailToast] });

  const activeViolation = violationOptions.find(v => v.id === violationId) || violationOptions[0];
  
  const { data: result, isLoading } = useSWR(
    ['challan', violationId, vehicleId, stateCode, isRepeat],
    () => calculateChallan({
      violation_code: activeViolation.id,
      vehicle_class: vehicleId,
      state_code: stateCode,
      is_repeat: isRepeat
    }),
    { keepPreviousData: true }
  );
  
  const finalFine = result?.amount_due ?? 0;

  // Track calculation event
  useEffect(() => {
    if (result) {
      track.challanCalculated(
        stateCode,
        activeViolation.mva,
        finalFine,
        isRepeat
      );
    }
  }, [result, stateCode, activeViolation.mva, finalFine, isRepeat]);

  // GSAP: Animate fine amount on change
  useGSAP(() => {
    if (!fineRef.current) return;
    
    const obj = { val: 0 };
    gsap.to(obj, {
      val: finalFine,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: () => {
        if (fineRef.current) {
          fineRef.current.innerText = `Rs. ${Math.round(obj.val).toLocaleString('en-IN')}`;
        }
      }
    });

    gsap.fromTo(fineRef.current,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
    );
  }, { dependencies: [finalFine] });

  // GSAP: Danger badge
  useGSAP(() => {
    if (!dangerRef.current) return;
    if (activeViolation.danger) {
      gsap.fromTo(dangerRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, { dependencies: [activeViolation.danger] });

  return (
    <div className="sv-page aurora-glow relative flex flex-col overflow-x-hidden transition-colors duration-500">
      
      {/* ── Unified Tactical Navigation Header ── */}
      <SystemHeader title="Challan Terminal" showBack={false} />
      
      <div className="lg:hidden relative z-[100]">
        <TopSearch isMapPage={false} forceShow={true} showBack={false} />
      </div>
      <main className="flex-1 w-full max-w-7xl mx-auto pt-28 lg:pt-24 pb-44 px-5 sm:px-12 flex flex-col lg:grid lg:grid-cols-[1.2fr,2fr] lg:gap-14 lg:items-start transition-all duration-500">
        
        {/* ── Left Column: System Summary & Real-time Quote ── */}
        <aside className="lg:sticky lg:top-28 flex flex-col gap-8 order-2 lg:order-1 mt-10 lg:mt-0">
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light/10 border border-brand-light/20 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-light animate-pulse"></span>
              <span className="text-[10px] font-semibold text-brand dark:text-brand-light uppercase tracking-[0.1em] font-space leading-none">Terminal Active</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-text-1 uppercase font-space leading-tight">
              Estimation<br />Terminal
            </h1>
          </section>

          {/* ── Big Result Card (The "Star" of the UI) ── */}
          <section 
            ref={resultCardRef}
            className="scan-line-overlay relative p-8 rounded-[2.5rem] bg-white dark:bg-white/5 border border-border shadow-2xl shadow-surface-3/50 dark:shadow-none overflow-hidden group"
          >
            {/* Background Glow */}
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-brand-light/10 blur-[80px] rounded-full group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative z-10 flex flex-col gap-6">
               <div className="flex flex-col gap-1">
                 <p className="text-[10px] font-semibold text-text-3 uppercase tracking-[0.1em] font-space">Total Liability</p>
                 <h2 
                   ref={fineRef}
                   className={`text-5xl sm:text-7xl font-black text-brand dark:text-brand-light tracking-tighter ${isLoading ? 'opacity-50 blur-sm transition-all' : ''}`}
                 >
                   Rs. 0
                 </h2>
               </div>

               <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-2 border border-border">
                    <Scale size={16} className="text-brand-light" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-text-1 tracking-tight leading-none uppercase">{activeViolation.mva}</span>
                      <span className="text-[9px] font-bold text-text-3 uppercase tracking-widest mt-1">{isRepeat ? 'Repeat Offence (2x)' : 'First Occurrence'}</span>
                    </div>
                 </div>

                 {activeViolation.danger && (
                   <div 
                     ref={dangerRef}
                     className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
                   >
                     <AlertTriangle size={12} className="text-red-500" />
                     <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">{activeViolation.danger}</span>
                   </div>
                 )}
               </div>

               <div className="relative">
                 <button 
                   onClick={() => {
                     setShowDetailToast(true);
                     setTimeout(() => setShowDetailToast(false), 3000);
                   }}
                   className="w-full h-16 bg-brand dark:bg-brand-light rounded-lg flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all group/btn"
                 >
                    <span className="text-white dark:text-text-1 font-black text-sm tracking-[0.1em] uppercase font-space">DETAILED REPORT</span>
                    <ArrowRight size={18} className="text-white dark:text-text-1 group-hover/btn:translate-x-1 transition-transform" />
                 </button>
                 <div 
                   ref={toastRef}
                   style={{ opacity: 0 }}
                   className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-surface-3 text-text-1 text-[10px] uppercase tracking-widest font-bold rounded-full shadow-xl whitespace-nowrap"
                 >
                   Detailed report currently offline
                 </div>
               </div>
            </div>
          </section>

          {/* Quick Meta */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-xl bg-surface-2 border border-border">
                <p className="text-[9px] font-semibold text-text-3 uppercase tracking-widest mb-1">Max Penalty</p>
                <p className="text-xs font-semibold text-text-1">Rs. {activeViolation.max}</p>
             </div>
             <div className="p-4 rounded-xl bg-surface-2 border border-border">
                <p className="text-[9px] font-semibold text-text-3 uppercase tracking-widest mb-1">Act Sync</p>
                <p className="text-xs font-semibold text-brand-light">MVA_ACT_2019</p>
             </div>
          </div>
        </aside>

        {/* ── Right Column: Input Portfolio ("Big & Simple") ── */}
        <div className="flex flex-col gap-10 order-1 lg:order-2 sv-swipe-area" onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
           {/* Swipe indicator */}
           <div className="flex justify-center gap-1.5 pb-2 lg:hidden">
             {swipeSections.map((_, i) => (
               <div key={i} className={`h-0.5 rounded-full transition-all duration-300 ${i === swipeSection ? 'w-6 bg-brand-light' : 'w-2 bg-border'}`} />
             ))}
             <span className="text-[9px] font-semibold text-text-3 uppercase tracking-widest ml-2 self-center">Swipe ↔</span>
           </div>
           {/* Section 1: Violation */}
           <section ref={violationRef} className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-text-3 font-space flex items-center gap-2">
                  <Activity size={14} className="text-brand-light" />
                  01. Violation Protocol
                </h3>
                <div className="px-3 py-1 rounded-full bg-brand dark:bg-brand-light text-white dark:text-text-1 text-[9px] font-semibold uppercase tracking-widest">
                  {jurisdiction.split(' ')[0]}
                </div>
              </div>

              <div className="relative group">
                <select
                  aria-label="Select violation type"
                  value={violationId}
                  onChange={(e) => setChallanState({ violation: e.target.value })}
                  className="w-full bg-transparent border-2 border-border rounded-xl p-6 text-lg font-black text-text-1 appearance-none focus:border-brand-light transition-all outline-none cursor-pointer"
                >
                  {violationOptions.map(v => (
                    <option key={v.id} value={v.id} className="bg-white dark:bg-bg">{v.label}</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-text-3">
                  <ArrowRight size={24} className="rotate-90" />
                </div>
              </div>
           </section>

           {/* Section 2: Vehicle Selection (The "Big" UI) */}
            <section ref={vehicleSectionRef} className="flex flex-col gap-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-text-3 font-space flex items-center gap-2">
                <Car size={14} className="text-brand-light" />
                02. Vehicle Identification
              </h3>
              
              <div ref={vehicleGridRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-entrance">
                 {VEHICLE_CLASSES.map(cls => (
                   <button 
                     key={cls.id}
                     onClick={() => setChallanState({ vehicle: cls.id })}
                     className={`card-premium flex flex-col items-center justify-center gap-4 p-6 rounded-[2rem] border-2 transition-all duration-300 active:scale-95 ${
                       vehicleId === cls.id 
                        ? 'bg-brand-light border-brand-light/30 text-text-1 shadow-xl shadow-brand-light/20 ring-2 ring-brand-light/20' 
                        : 'bg-white dark:bg-white/5 border-border text-text-3 hover:border-text-3 dark:hover:border-white/10 hover:shadow-md'
                     }`}
                   >
                     <div className={`p-4 rounded-lg ${vehicleId === cls.id ? 'bg-white/30' : 'bg-surface-2'}`}>
                       {cls.icon}
                     </div>
                     <div className="flex flex-col items-center">
                       <span className={`text-xs font-semibold uppercase tracking-widest ${vehicleId === cls.id ? 'text-text-1' : 'text-text-1'}`}>
                         {cls.title}
                       </span>
                       <span className={`text-[8px] font-bold uppercase mt-1 opacity-60 ${vehicleId === cls.id ? 'text-text-1' : 'text-text-3'}`}>
                         {cls.id === 'HTV' ? 'Heavy' : cls.id === '2W' ? 'Light' : 'Standard'}
                       </span>
                     </div>
                   </button>
                 ))}
              </div>
           </section>

           {/* Section 3: Parameters & Jurisdiction */}
            <section ref={paramsRef} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-text-3 font-space">03. Jurisdiction</h3>
                <div className="relative">
                  <select
                    aria-label="Select jurisdiction state"
                    value={jurisdiction}
                    onChange={(e) => setChallanState({ jurisdiction: e.target.value })}
                    className="w-full bg-transparent border-2 border-border rounded-lg py-4 px-5 text-sm font-bold text-text-1 appearance-none focus:border-brand-light transition-all outline-none cursor-pointer"
                  >
                    {stateOptions.map(s => (
                      <option key={s} value={s} className="bg-white dark:bg-bg">{s}</option>
                    ))}
                  </select>
                  <MapPin size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-text-3 font-space">04. History</h3>
                <button 
                  onClick={() => setChallanState({ isRepeat: !isRepeat })}
                  className={`w-full h-[58px] rounded-lg border-2 flex items-center justify-between px-6 transition-all ${
                    isRepeat 
                    ? 'bg-red-500/10 border-red-500/20 text-red-600' 
                    : 'bg-white dark:bg-white/5 border-border text-text-3'
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest">Repeat Offender?</span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${isRepeat ? 'bg-red-500' : 'bg-surface-3'}`}>
                    <div 
                      ref={toggleRef}
                      className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm" 
                      style={{ transform: `translateX(${isRepeat ? 22 : 2}px)` }}
                    />
                  </div>
                </button>
              </div>
           </section>

           {/* AI Insight Footer */}
            <div ref={insightRef} className="glass-panel p-6 rounded-[2rem] bg-gradient-to-br from-brand-light/10 to-transparent border border-brand-light/20 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-light/20 flex items-center justify-center flex-shrink-0">
                <Zap size={20} className="text-brand-light" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold text-brand-light uppercase tracking-widest">AI Tactical Insight</p>
                <p className="text-[11px] font-medium text-text-2 leading-relaxed">
                  {result?.description || `Based on recent MVA amendments, high-risk offences like DUI (${activeViolation.mva}) have immediate license disqualification protocols active in ${jurisdiction.split(' ')[0]}.`}
                </p>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
