// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

export interface ChallanViolationOption {
  id: string;
  label: string;
  mva: string;
  max: string;
  danger?: string;
}

export interface ChallanStateOption {
  code: string;
  label: string;
}

const STATE_NAMES: Record<string, string> = {
  AP: 'Andhra Pradesh',
  DL: 'Delhi',
  GJ: 'Gujarat',
  KA: 'Karnataka',
  MH: 'Maharashtra',
  TN: 'Tamil Nadu',
  UP: 'Uttar Pradesh',
  WB: 'West Bengal',
};

function parseCSV(text: string) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const values: string[] = [];
    let current = '';
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

export async function loadChallanMetadata() {
  const [violationsText, overridesText] = await Promise.all([
    fetch('/offline-data/violations.csv').then((res) => res.text()),
    fetch('/offline-data/state_overrides.csv').then((res) => res.text()),
  ]);

  const violationRows = parseCSV(violationsText);
  const overrideRows = parseCSV(overridesText);

  const violations: ChallanViolationOption[] = violationRows
    .filter((row) => row.violation_code && row.description)
    .map((row) => {
      const maxFine = Math.max(
        Number(row.base_fine || 0),
        Number(row.base_fine_2w || 0),
        Number(row.base_fine_4w || 0),
        Number(row.base_fine_htv || 0),
        Number(row.base_fine_bus || 0),
        Number(row.repeat_fine || 0),
        Number(row.repeat_fine_2w || 0),
        Number(row.repeat_fine_4w || 0),
        Number(row.repeat_fine_htv || 0),
        Number(row.repeat_fine_bus || 0),
      );
      return {
        id: row.violation_code,
        label: row.description,
        mva: row.section || `Section ${row.violation_code}`,
        max: maxFine ? String(maxFine) : 'Variable',
        danger: row.violation_code === '185' ? 'Up to 6 months imprisonment' : undefined,
      };
    });

  const stateCodes = Array.from(new Set(['TN', ...overrideRows.map((row) => row.state_code).filter(Boolean)])).sort();
  const states: ChallanStateOption[] = stateCodes.map((code) => ({
    code,
    label: `${STATE_NAMES[code] || code} (${code})`,
  }));

  return { violations, states };
}
