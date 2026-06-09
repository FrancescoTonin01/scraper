import { describe, it, expect } from 'vitest';
import {
  resolveLocationInput,
  extractLocationName,
  isRegion,
  getLocationOptions,
} from '../data/italianLocations';

describe('resolveLocationInput', () => {
  it('resolves exact region names', () => {
    expect(resolveLocationInput('Lombardia')).toBe('Lombardia');
    expect(resolveLocationInput('Veneto')).toBe('Veneto');
    expect(resolveLocationInput('Sicilia')).toBe('Sicilia');
  });

  it('resolves exact city names to "City (Region)" format', () => {
    expect(resolveLocationInput('Milano')).toBe('Milano (Lombardia)');
    expect(resolveLocationInput('Roma')).toBe('Roma (Lazio)');
    expect(resolveLocationInput('Padova')).toBe('Padova (Veneto)');
  });

  it('is case-insensitive', () => {
    expect(resolveLocationInput('lombardia')).toBe('Lombardia');
    expect(resolveLocationInput('MILANO')).toBe('Milano (Lombardia)');
  });

  it('resolves full option strings', () => {
    expect(resolveLocationInput('Milano (Lombardia)')).toBe('Milano (Lombardia)');
  });

  it('returns null for unknown locations', () => {
    expect(resolveLocationInput('Narnia')).toBeNull();
    expect(resolveLocationInput('')).toBeNull();
  });

  it('handles special characters', () => {
    expect(resolveLocationInput("L'Aquila")).toBe("L'Aquila (Abruzzo)");
    expect(resolveLocationInput('Forlì-Cesena')).toBe('Forlì-Cesena (Emilia-Romagna)');
  });
});

describe('extractLocationName', () => {
  it('extracts city from "City (Region)" format', () => {
    expect(extractLocationName('Milano (Lombardia)')).toBe('Milano');
    expect(extractLocationName('Roma (Lazio)')).toBe('Roma');
  });

  it('returns region names as-is', () => {
    expect(extractLocationName('Lombardia')).toBe('Lombardia');
    expect(extractLocationName('Veneto')).toBe('Veneto');
  });
});

describe('isRegion', () => {
  it('returns true for regions', () => {
    expect(isRegion('Lombardia')).toBe(true);
    expect(isRegion('Veneto')).toBe(true);
    expect(isRegion('Sicilia')).toBe(true);
  });

  it('returns false for provinces', () => {
    expect(isRegion('Milano')).toBe(false);
    expect(isRegion('Roma')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isRegion('lombardia')).toBe(true);
    expect(isRegion('VENETO')).toBe(true);
  });
});

describe('getLocationOptions', () => {
  it('includes all 20 regions', () => {
    const options = getLocationOptions();
    const regions = ['Lombardia', 'Lazio', 'Sicilia', 'Veneto', 'Piemonte', 'Toscana'];
    for (const r of regions) {
      expect(options).toContain(r);
    }
  });

  it('includes provinces with region suffix', () => {
    const options = getLocationOptions();
    expect(options).toContain('Milano (Lombardia)');
    expect(options).toContain('Roma (Lazio)');
  });
});
