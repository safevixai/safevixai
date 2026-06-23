// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { loadChallanMetadata } from '../challan-metadata';

var mockViolationsCSV = [
  'violation_code,description,section,base_fine,base_fine_2w,base_fine_4w,base_fine_htv,base_fine_bus,repeat_fine,repeat_fine_2w,repeat_fine_4w,repeat_fine_htv,repeat_fine_bus',
  '185,Drunk Driving,MVA 185,10000,0,0,0,0,15000,0,0,0,0',
  '177,Rash Driving,MVA 177,5000,3000,5000,7000,9000,10000,6000,10000,14000,18000',
  'MVA_001,Minor,,0,0,0,0,0,0,0,0,0,0',
  'MVA_999,,MVA 999,0,0,0,0,0,0,0,0,0,0',
].join('\n');

var mockOverridesCSV = ['state_code', 'KA', 'GJ'].join('\n');

describe('challan-metadata', function() {
  var originalFetch = global.fetch;

  beforeEach(function() {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ text: () => Promise.resolve(mockViolationsCSV) })
      .mockResolvedValueOnce({ text: () => Promise.resolve(mockOverridesCSV) });
  });

  afterEach(function() {
    global.fetch = originalFetch;
  });

  describe('loadChallanMetadata', function() {
    it('fetches both CSV files', async function() {
      await loadChallanMetadata();
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        '/offline-data/violations.csv',
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/offline-data/state_overrides.csv',
      );
    });

    it('returns violations array', async function() {
      var result = await loadChallanMetadata();
      expect(result).toHaveProperty('violations');
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('returns states array', async function() {
      var result = await loadChallanMetadata();
      expect(result).toHaveProperty('states');
      expect(Array.isArray(result.states)).toBe(true);
    });

    it('parses violation with correct fields', async function() {
      var result = await loadChallanMetadata();
      var drunkDriving = result.violations.find((v) => v.id === '185');
      expect(drunkDriving).toBeDefined();
      expect(drunkDriving!.label).toBe('Drunk Driving');
      expect(drunkDriving!.mva).toBe('MVA 185');
      expect(drunkDriving!.max).toBe('15000');
      expect(drunkDriving!.danger).toBe('Up to 6 months imprisonment');
    });

    it('computes max as highest of all fine columns', async function() {
      var result = await loadChallanMetadata();
      var rash = result.violations.find((v) => v.id === '177');
      expect(rash).toBeDefined();
      expect(rash!.max).toBe('18000');
      expect(rash!.danger).toBeUndefined();
    });

    it('sets max to "Variable" when all fines are zero', async function() {
      var result = await loadChallanMetadata();
      var minor = result.violations.find((v) => v.id === 'MVA_001');
      expect(minor).toBeDefined();
      expect(minor!.max).toBe('Variable');
    });

    it('filters out rows without description', async function() {
      var result = await loadChallanMetadata();
      var emptyDesc = result.violations.find((v) => v.id === 'MVA_999');
      expect(emptyDesc).toBeUndefined();
    });

    it('falls back to "Section {code}" when no section is given', async function() {
      var result = await loadChallanMetadata();
      var minor = result.violations.find((v) => v.id === 'MVA_001');
      expect(minor).toBeDefined();
      expect(minor!.mva).toBe('Section MVA_001');
    });

    it('parses states from override rows', async function() {
      var result = await loadChallanMetadata();
      var ka = result.states.find((s) => s.code === 'KA');
      expect(ka).toBeDefined();
      expect(ka!.label).toBe('Karnataka (KA)');
    });

    it('always includes TN as default state', async function() {
      var result = await loadChallanMetadata();
      var tn = result.states.find((s) => s.code === 'TN');
      expect(tn).toBeDefined();
      expect(tn!.label).toBe('Tamil Nadu (TN)');
    });

    it('sorts states alphabetically by code', async function() {
      var result = await loadChallanMetadata();
      var codes = result.states.map((s) => s.code);
      expect(codes).toEqual([...codes].sort());
    });

    it('uses STATE_NAMES lookup for known codes', async function() {
      var result = await loadChallanMetadata();
      var gj = result.states.find((s) => s.code === 'GJ');
      expect(gj).toBeDefined();
      expect(gj!.label).toBe('Gujarat (GJ)');
    });

    it('falls back to raw code for unknown states', async function() {
      var result = await loadChallanMetadata();
      var xy = result.states.find((s) => s.code === 'XY');
      expect(xy).toBeUndefined();
    });
  });

  describe('CSV parsing with quoted fields', function() {
    it('handles commas inside quoted fields', async function() {
      var csvWithQuotes = [
        'violation_code,description,section,base_fine',
        '200,"Driving, erratically",MVA 200,5000',
      ].join('\n');

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ text: () => Promise.resolve(csvWithQuotes) })
        .mockResolvedValueOnce({
          text: () => Promise.resolve('state_code\nTN'),
        });

      var result = await loadChallanMetadata();
      var v = result.violations.find((x) => x.id === '200');
      expect(v).toBeDefined();
      expect(v!.label).toBe('Driving, erratically');
    });
  });
});


