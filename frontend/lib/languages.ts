// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  recognitionCode: string; // Used for Web Speech API (Browser STT)
  speechTargetCode: string; // Used for Backend Speech model (hin, tam, etc.)
  synthesisCode: string;    // Used for window.speechSynthesis (Browser TTS)
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', recognitionCode: 'en-IN', speechTargetCode: 'eng', synthesisCode: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', recognitionCode: 'hi-IN', speechTargetCode: 'hin', synthesisCode: 'hi-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', recognitionCode: 'ta-IN', speechTargetCode: 'tam', synthesisCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', recognitionCode: 'te-IN', speechTargetCode: 'tel', synthesisCode: 'te-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', recognitionCode: 'kn-IN', speechTargetCode: 'kan', synthesisCode: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', recognitionCode: 'ml-IN', speechTargetCode: 'mal', synthesisCode: 'ml-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', recognitionCode: 'mr-IN', speechTargetCode: 'mar', synthesisCode: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', recognitionCode: 'gu-IN', speechTargetCode: 'guj', synthesisCode: 'gu-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', recognitionCode: 'bn-IN', speechTargetCode: 'ben', synthesisCode: 'bn-IN' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', recognitionCode: 'pa-IN', speechTargetCode: 'pan', synthesisCode: 'pa-IN' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', recognitionCode: 'ur-PK', speechTargetCode: 'urd', synthesisCode: 'ur-PK' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', recognitionCode: 'ar-AE', speechTargetCode: 'ara', synthesisCode: 'ar-AE' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', recognitionCode: 'es-ES', speechTargetCode: 'spa', synthesisCode: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', recognitionCode: 'fr-FR', speechTargetCode: 'fra', synthesisCode: 'fr-FR' },
];

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}
