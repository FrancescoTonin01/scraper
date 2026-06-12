import { describe, expect, it } from 'vitest';
import { getProvincesForRegion, getRegionForProvince, isCityInRegion } from '../data/locations.js';
import { isValidMake, isValidModelForMake } from '../data/makes.js';

describe('isValidMake', () => {
  it('validates known makes (case-insensitive)', () => {
    expect(isValidMake('BMW')).toBe(true);
    expect(isValidMake('bmw')).toBe(true);
    expect(isValidMake('Mercedes-Benz')).toBe(true);
    expect(isValidMake('Fiat')).toBe(true);
  });

  it('rejects unknown makes', () => {
    expect(isValidMake('UnknownBrand')).toBe(false);
    expect(isValidMake('')).toBe(false);
  });
});

describe('isValidModelForMakeß', () => {
  it('validates known models for a make', () => {
    expect(isValidModelForMake('BMW', 'Serie 3')).toBe(true);
    expect(isValidModelForMake('Fiat', '500')).toBe(true);
  });

  it('rejects models not belonging to the make', () => {
    expect(isValidModelForMake('BMW', 'Punto')).toBe(false);
    expect(isValidModelForMake('Fiat', 'Serie 3')).toBe(false);
  });
});

describe('getProvincesForRegion', () => {
  it('returns provinces for a valid region', () => {
    const provinces = getProvincesForRegion('Lombardia');
    expect(provinces).toContain('Milano');
    expect(provinces).toContain('Bergamo');
    expect(provinces.length).toBeGreaterThan(5);
  });

  it('returns empty array for unknown region', () => {
    expect(getProvincesForRegion('UnknownRegion')).toEqual([]);
  });

  it('is case-insensitive', () => {
    expect(getProvincesForRegion('lombardia')).toContain('Milano');
  });
});

describe('getRegionForProvince', () => {
  it('returns the parent region for a province', () => {
    expect(getRegionForProvince('Milano')).toBe('Lombardia');
    expect(getRegionForProvince('Roma')).toBe('Lazio');
  });

  it('is case-insensitive', () => {
    expect(getRegionForProvince('milano')).toBe('Lombardia');
  });

  it('returns null for regions and unknown locations', () => {
    expect(getRegionForProvince('Lombardia')).toBeNull();
    expect(getRegionForProvince('UnknownRegion')).toBeNull();
  });
});

describe('isCityInRegion', () => {
  it('matches city to correct region', () => {
    expect(isCityInRegion('Milano', 'Lombardia')).toBe(true);
    expect(isCityInRegion('Roma', 'Lazio')).toBe(true);
    expect(isCityInRegion('Napoli', 'Campania')).toBe(true);
  });

  it('rejects city from wrong region', () => {
    expect(isCityInRegion('Milano', 'Lazio')).toBe(false);
    expect(isCityInRegion('Roma', 'Lombardia')).toBe(false);
  });

  it('handles partial matches in city text', () => {
    expect(isCityInRegion('Milano (MI)', 'Lombardia')).toBe(true);
  });

  it('matches region by province code', () => {
    expect(isCityInRegion('Cadoneghe (PD)', 'Veneto')).toBe(true);
    expect(isCityInRegion('Cadoneghe (PD)', 'Lombardia')).toBe(false);
  });
});
