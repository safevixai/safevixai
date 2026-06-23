// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { FirstAidClient } from './FirstAidClient';
import firstAidData from '@/public/offline-data/first-aid.json';

// Phase 0.8: Server Component wrapper for First Aid page
// Static guide data is passed from server, interactive parts remain client-side

interface Guide {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: string;
  iconType: 'filled' | 'outlined';
  steps: string[];
}

interface OfflineFirstAidGuide {
  id: string;
  title: string;
  category: string;
  steps: string[];
  warning?: string;
  call_ambulance_if?: string[];
}

const CPR_GUIDE: Guide = {
  id: 'cpr',
  title: 'CPR',
  subtitle: 'Step-by-step resuscitation for adults when a person is unresponsive and not breathing normally.',
  accent: 'var(--emergency)',
  icon: 'ecg_heart',
  iconType: 'filled',
  steps: [
    'Check scene safety, tap shoulders, and shout clearly.',
    'Call 112 immediately or ask a bystander to call.',
    'Open the airway and check breathing for no more than 10 seconds.',
    'Give 30 hard, fast chest compressions in the center of the chest.',
    'Give 2 rescue breaths if trained and safe to do so.',
    'Continue 30:2 cycles until an AED or emergency team takes over.',
  ],
};

const GUIDE_STYLES: Record<string, Pick<Guide, 'accent' | 'icon' | 'iconType'>> = {
  general: { accent: 'var(--brand-light)', icon: 'shield', iconType: 'outlined' },
  bleeding: { accent: 'var(--emergency)', icon: 'blood_pressure', iconType: 'filled' },
  fracture: { accent: 'var(--brand-light)', icon: 'skeleton', iconType: 'outlined' },
  burns: { accent: 'var(--warning)', icon: 'local_fire_department', iconType: 'outlined' },
  choking: { accent: 'var(--brand-light)', icon: 'airwave', iconType: 'outlined' },
  cardiac: { accent: 'var(--emergency)', icon: 'ecg_heart', iconType: 'filled' },
};

function keyForGuide(guide: OfflineFirstAidGuide) {
  if (guide.category === 'fracture') return 'fractures';
  return guide.category.replace(/_/g, '-');
}

function buildGuidesFromOfflineData(): Record<string, Guide> {
  return (firstAidData as OfflineFirstAidGuide[]).reduce<Record<string, Guide>>((acc, guide) => {
    const style = GUIDE_STYLES[guide.category] || GUIDE_STYLES.general;
    const callouts = guide.call_ambulance_if?.length
      ? [`Call 112 immediately if ${guide.call_ambulance_if.join(', ')}.`]
      : [];
    const warning = guide.warning ? [`Warning: ${guide.warning}`] : [];
    acc[keyForGuide(guide)] = {
      id: guide.id,
      title: guide.title,
      subtitle: guide.warning || 'Offline first-aid protocol cached for emergency use.',
      accent: style.accent,
      icon: style.icon,
      iconType: style.iconType,
      steps: [...guide.steps, ...warning, ...callouts],
    };
    return acc;
  }, { cpr: CPR_GUIDE });
}

// Phase 0.8: Add metadata for SEO
export const metadata = {
  title: 'First Aid Guide | SafeVixAI',
  description: 'Emergency first aid protocols for road accident victims. CPR, bleeding control, burns, and fracture management.',
  keywords: ['first aid', 'CPR', 'emergency', 'road safety', 'accident response'],
};

export default function FirstAidPage() {
  return <FirstAidClient guides={buildGuidesFromOfflineData()} />;
}
