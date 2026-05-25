import {
  EMERGENCY_NUMBER_LIST,
  PRIMARY_EMERGENCY_BAR,
  EMERGENCY_NUMBER_MAP,
} from '../emergency-numbers';

describe('emergency-numbers', () => {
  describe('EMERGENCY_NUMBER_LIST', () => {
    it('contains 13 entries', () => {
      expect(EMERGENCY_NUMBER_LIST).toHaveLength(13);
    });

    it('each entry has required fields', () => {
      for (const entry of EMERGENCY_NUMBER_LIST) {
        expect(entry.id).toBeTruthy();
        expect(entry.service).toBeTruthy();
        expect(entry.label).toBeTruthy();
        expect(entry.coverage).toBeTruthy();
        expect(entry.color).toBeTruthy();
      }
    });

    it('includes national emergency 112', () => {
      const e112 = EMERGENCY_NUMBER_LIST.find((e) => e.service === '112');
      expect(e112).toBeDefined();
      expect(e112?.label).toBe('Emergency');
      expect(e112?.coverage).toBe('Pan-India');
    });

    it('includes ambulance 102', () => {
      const e102 = EMERGENCY_NUMBER_LIST.find((e) => e.service === '102');
      expect(e102).toBeDefined();
      expect(e102?.label).toBe('Ambulance');
    });

    it('includes police 100', () => {
      const e100 = EMERGENCY_NUMBER_LIST.find((e) => e.service === '100');
      expect(e100).toBeDefined();
      expect(e100?.label).toBe('Police');
    });

    it('includes fire 101', () => {
      const e101 = EMERGENCY_NUMBER_LIST.find((e) => e.service === '101');
      expect(e101).toBeDefined();
      expect(e101?.label).toBe('Fire');
    });

    it('includes highway helpline 1033', () => {
      const e1033 = EMERGENCY_NUMBER_LIST.find((e) => e.service === '1033');
      expect(e1033).toBeDefined();
      expect(e1033?.label).toBe('Highway');
    });

    it('includes women helpline 1091', () => {
      const e1091 = EMERGENCY_NUMBER_LIST.find((e) => e.service === '1091');
      expect(e1091).toBeDefined();
      expect(e1091?.label).toBe('Women Helpline');
    });

    it('includes child helpline 1098', () => {
      const e1098 = EMERGENCY_NUMBER_LIST.find((e) => e.service === '1098');
      expect(e1098).toBeDefined();
      expect(e1098?.label).toBe('Child Helpline');
    });
  });

  describe('PRIMARY_EMERGENCY_BAR', () => {
    it('contains 4 entries', () => {
      expect(PRIMARY_EMERGENCY_BAR).toHaveLength(4);
    });

    it('includes 112, 102, 100, 1033', () => {
      const services = PRIMARY_EMERGENCY_BAR.map((e) => e.service);
      expect(services).toContain('112');
      expect(services).toContain('102');
      expect(services).toContain('100');
      expect(services).toContain('1033');
    });

    it('does not include other services', () => {
      for (const entry of PRIMARY_EMERGENCY_BAR) {
        expect(['112', '102', '100', '1033']).toContain(entry.service);
      }
    });
  });

  describe('EMERGENCY_NUMBER_MAP', () => {
    it('maps all entries by id', () => {
      for (const entry of EMERGENCY_NUMBER_LIST) {
        expect(EMERGENCY_NUMBER_MAP[entry.id]).toEqual(entry);
      }
    });

    it('contains national_emergency entry', () => {
      expect(EMERGENCY_NUMBER_MAP.national_emergency).toBeDefined();
      expect(EMERGENCY_NUMBER_MAP.national_emergency.service).toBe('112');
    });

    it('contains all 13 keys', () => {
      expect(Object.keys(EMERGENCY_NUMBER_MAP)).toHaveLength(13);
    });
  });
});
