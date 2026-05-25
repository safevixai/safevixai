import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../languages';

describe('languages', () => {
  describe('SUPPORTED_LANGUAGES', () => {
    it('has 14 entries', () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(14);
    });

    it('each entry has required string fields', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(typeof lang.code).toBe('string');
        expect(typeof lang.name).toBe('string');
        expect(typeof lang.nativeName).toBe('string');
        expect(typeof lang.recognitionCode).toBe('string');
        expect(typeof lang.speechTargetCode).toBe('string');
        expect(typeof lang.synthesisCode).toBe('string');
      }
    });

    it('includes English and major Indian languages', () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      expect(codes).toContain('en');
      expect(codes).toContain('hi');
      expect(codes).toContain('ta');
      expect(codes).toContain('te');
      expect(codes).toContain('kn');
      expect(codes).toContain('ml');
      expect(codes).toContain('mr');
      expect(codes).toContain('gu');
      expect(codes).toContain('bn');
      expect(codes).toContain('pa');
      expect(codes).toContain('ur');
    });

    it('includes Arabic, Spanish, and French', () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      expect(codes).toContain('ar');
      expect(codes).toContain('es');
      expect(codes).toContain('fr');
    });

    it('has correct speech target codes', () => {
      const findByCode = (code: string) => SUPPORTED_LANGUAGES.find((l) => l.code === code)!;
      expect(findByCode('en').speechTargetCode).toBe('eng');
      expect(findByCode('hi').speechTargetCode).toBe('hin');
      expect(findByCode('ta').speechTargetCode).toBe('tam');
      expect(findByCode('bn').speechTargetCode).toBe('ben');
    });

    it('has correct synthesis codes', () => {
      const findByCode = (code: string) => SUPPORTED_LANGUAGES.find((l) => l.code === code)!;
      expect(findByCode('en').synthesisCode).toBe('en-IN');
      expect(findByCode('hi').synthesisCode).toBe('hi-IN');
      expect(findByCode('ur').synthesisCode).toBe('ur-PK');
    });

    it('has unique codes', () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('has unique speechTargetCodes', () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.speechTargetCode);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });

  describe('getLanguageByCode', () => {
    it('returns English for "en"', () => {
      const lang = getLanguageByCode('en');
      expect(lang).toBeDefined();
      expect(lang!.name).toBe('English');
      expect(lang!.nativeName).toBe('English');
    });

    it('returns Hindi for "hi"', () => {
      const lang = getLanguageByCode('hi');
      expect(lang).toBeDefined();
      expect(lang!.name).toBe('Hindi');
      expect(lang!.nativeName).toBe('हिन्दी');
    });

    it('returns undefined for unsupported code', () => {
      expect(getLanguageByCode('xx')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getLanguageByCode('')).toBeUndefined();
    });

    it('is case-sensitive', () => {
      expect(getLanguageByCode('EN')).toBeUndefined();
    });
  });
});
