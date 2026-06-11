import { describe, expect, it } from 'vitest';
import { buildAlertLookup, buildAlertSegmentKey, escapeCsvValue, normalizeEmail } from '../utils/marketing.js';

describe('marketing helpers', () => {
  it('normalizes alert emails', () => {
    expect(normalizeEmail('  Test@Example.COM ')).toBe('test@example.com');
  });

  it('builds an exact alert lookup including filters', () => {
    expect(buildAlertLookup({
      email: 'USER@EXAMPLE.COM',
      make: 'BMW',
      model: 'Serie 3',
      location: undefined,
      radius: 100,
      yearFrom: undefined,
      yearTo: 2022,
      kmMax: 100000,
      fuel: 'diesel',
    })).toEqual({
      email: 'user@example.com',
      make: 'BMW',
      model: 'Serie 3',
      location: null,
      radius: 100,
      yearFrom: null,
      yearTo: 2022,
      kmMax: 100000,
      fuel: 'diesel',
    });
  });

  it('builds readable segment keys', () => {
    expect(buildAlertSegmentKey({ make: 'Fiat', model: 'Panda', location: null })).toBe('Fiat | Panda | Tutta Italia');
    expect(buildAlertSegmentKey({ make: 'Volkswagen', model: 'Golf', location: 'Lombardia' })).toBe('Volkswagen | Golf | Lombardia');
  });

  it('escapes CSV values', () => {
    expect(escapeCsvValue('plain')).toBe('plain');
    expect(escapeCsvValue('Milano, Lombardia')).toBe('"Milano, Lombardia"');
    expect(escapeCsvValue('Dice "ok"')).toBe('"Dice ""ok"""');
  });
});
