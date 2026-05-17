export const FEATURES = {
  webllmOffline: process.env.NEXT_PUBLIC_ENABLE_WEBLLM_OFFLINE === 'true',
  crashDetection: process.env.NEXT_PUBLIC_ENABLE_CRASH_DETECTION !== 'false',
  familyTracking: process.env.NEXT_PUBLIC_ENABLE_FAMILY_TRACKING !== 'false',
} as const;
