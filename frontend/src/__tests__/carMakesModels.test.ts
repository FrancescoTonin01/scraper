import { describe, it, expect } from 'vitest';
import {
  getMakeNames,
  getModelsForMake,
  getGroupedModelsForMake,
  getParentModel,
  getSubModels,
} from '../data/carMakesModels';

describe('getMakeNames', () => {
  it('returns an array of make names', () => {
    const makes = getMakeNames();
    expect(makes.length).toBeGreaterThan(20);
    expect(makes).toContain('BMW');
    expect(makes).toContain('Fiat');
    expect(makes).toContain('Mercedes-Benz');
  });
});

describe('getModelsForMake', () => {
  it('returns models for a valid make', () => {
    const models = getModelsForMake('BMW');
    expect(models).toContain('Serie 3');
    expect(models).toContain('X5');
    expect(models).toContain('320');
  });

  it('is case-insensitive', () => {
    expect(getModelsForMake('bmw')).toEqual(getModelsForMake('BMW'));
  });

  it('returns empty array for unknown make', () => {
    expect(getModelsForMake('UnknownBrand')).toEqual([]);
  });
});

describe('getGroupedModelsForMake', () => {
  it('returns grouped models for BMW', () => {
    const groups = getGroupedModelsForMake('BMW');
    expect(groups.length).toBeGreaterThan(1);

    const serie3Group = groups.find((g) => g.label === 'Serie 3');
    expect(serie3Group).toBeDefined();
    expect(serie3Group!.options).toContain('Serie 3');
    expect(serie3Group!.options).toContain('320');
    expect(serie3Group!.options).toContain('318');
  });

  it('returns flat list for makes without groups', () => {
    const groups = getGroupedModelsForMake('Toyota');
    expect(groups.length).toBe(1);
    expect(groups[0].label).toBe('');
  });

  it('includes Altro group for ungrouped models', () => {
    const groups = getGroupedModelsForMake('BMW');
    const altroGroup = groups.find((g) => g.label === 'Altro');
    expect(altroGroup).toBeDefined();
    expect(altroGroup!.options).toContain('X5');
    expect(altroGroup!.options).toContain('i4');
  });
});

describe('getParentModel', () => {
  it('finds parent for BMW sub-models', () => {
    expect(getParentModel('BMW', '318')).toBe('Serie 3');
    expect(getParentModel('BMW', '520')).toBe('Serie 5');
  });

  it('returns null for models without parent', () => {
    expect(getParentModel('BMW', 'X5')).toBeNull();
    expect(getParentModel('Toyota', 'Yaris')).toBeNull();
  });
});

describe('getSubModels', () => {
  it('returns sub-models for BMW Serie 3', () => {
    const subs = getSubModels('BMW', 'Serie 3');
    expect(subs).toContain('316');
    expect(subs).toContain('318');
    expect(subs).toContain('320');
  });

  it('returns empty for unknown group', () => {
    expect(getSubModels('BMW', 'X5')).toEqual([]);
  });
});
