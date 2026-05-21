import { FirstAidClient } from './FirstAidClient';

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

// Static guide data - this could be fetched from a CMS or API in production
const GUIDES: Record<string, Guide> = {
  cpr: {
    id: 'cpr',
    title: 'CPR',
    subtitle: 'Step-by-step resuscitation for adults, children, and infants. Essential life support.',
    accent: '#ffb4aa',
    icon: 'ecg_heart',
    iconType: 'filled',
    steps: [
      'Check scene safety — shout "Are you OK?" and tap shoulders',
      'Call 112 now or ask a bystander to call immediately',
      'Tilt head back, lift chin, check for breathing (10 sec)',
      'Give 30 chest compressions: hard, fast, center of chest',
      'Give 2 rescue breaths — seal mouth, watch for chest rise',
      'Continue 30:2 cycles until paramedics arrive',
    ]
  },
  choking: {
    id: 'choking',
    title: 'Choking',
    subtitle: 'Heimlich maneuver and airway clearance techniques for all ages.',
    accent: 'var(--brand-light)',
    icon: 'airwave',
    iconType: 'outlined',
    steps: [
      'Ask "Are you choking?" — if unable to speak/cough, act',
      'Give 5 firm back blows between shoulder blades',
      'Give 5 abdominal thrusts (Heimlich maneuver)',
      'Repeat back blows + thrusts until object dislodges',
      'If unconscious: lay down, begin CPR, check mouth before breaths',
    ]
  },
  bleeding: {
    id: 'bleeding',
    title: 'Severe Bleeding',
    subtitle: 'Tourniquet application and pressure points to control hemorrhaging.',
    accent: '#ffb4aa',
    icon: 'blood_pressure',
    iconType: 'filled',
    steps: [
      'Apply firm direct pressure with clean cloth — do NOT remove',
      'Elevate the wound above the heart level if possible',
      'Apply tourniquet 5–7cm above wound for limb bleeding',
      'Note exact time of tourniquet application (write on skin)',
      'Keep victim warm and calm — monitor for shock',
      'Call 108 and keep pressure until medics arrive',
    ]
  },
  burns: {
    id: 'burns',
    title: 'Burns',
    subtitle: 'Treating thermal, chemical, and electrical burns. Degrees of severity.',
    accent: '#FFB45B',
    icon: 'local_fire_department',
    iconType: 'outlined',
    steps: [
      'Remove from heat source — ensure your own safety first',
      'Cool burn under cool (NOT cold) running water for 20 minutes',
      'Do NOT use ice, butter, toothpaste or any home remedies',
      'Remove jewelry/clothing near burn — but NOT if stuck to skin',
      'Cover loosely with non-fluffy sterile dressing (cling film ideal)',
      'Call 108 for burns larger than palm, or face/genital area',
    ]
  },
  fractures: {
    id: 'fractures',
    title: 'Fractures',
    subtitle: 'Stabilizing broken bones and suspected spinal injuries safely.',
    accent: 'var(--brand-light)',
    icon: 'skeleton',
    iconType: 'outlined',
    steps: [
      'Do not move the victim unless in immediate danger',
      'Control any bleeding with direct pressure',
      'Immobilize the injured area using a splint or sling',
      'Apply cold packs wrapped in cloth to reduce swelling',
      'Monitor for signs of shock (paleness, rapid breathing)',
      'Wait for emergency medical personnel',
    ]
  }
};

// Phase 0.8: Add metadata for SEO
export const metadata = {
  title: 'First Aid Guide | SafeVixAI',
  description: 'Emergency first aid protocols for road accident victims. CPR, bleeding control, burns, and fracture management.',
  keywords: ['first aid', 'CPR', 'emergency', 'road safety', 'accident response'],
};

export default function FirstAidPage() {
  // Pass static data from server to client component
  return <FirstAidClient guides={GUIDES} />;
}
