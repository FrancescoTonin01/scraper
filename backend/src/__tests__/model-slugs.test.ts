import { describe, it, expect } from 'vitest';
import { getModelSlug, getMakeSlug } from '../data/modelSlugs.js';

describe('getMakeSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(getMakeSlug('BMW')).toBe('bmw');
    expect(getMakeSlug('Alfa Romeo')).toBe('alfa-romeo');
    expect(getMakeSlug('Mercedes-Benz')).toBe('mercedes-benz');
  });

  it('strips diacritics', () => {
    expect(getMakeSlug('Škoda')).toBe('skoda');
    expect(getMakeSlug('Citroën')).toBe('citroen');
  });
});

describe('getModelSlug', () => {
  it('returns AutoScout overrides with (tutto)', () => {
    expect(getModelSlug('BMW', 'Serie 3', 'autoscout')).toBe('serie-3-(tutto)');
    expect(getModelSlug('Mercedes-Benz', 'Classe A', 'autoscout')).toBe('classe-a-(tutto)');
  });

  it('returns Subito overrides mapping sub-models to parent', () => {
    expect(getModelSlug('BMW', '318', 'subito')).toBe('serie-3');
    expect(getModelSlug('BMW', '520', 'subito')).toBe('serie-5');
  });

  it('falls back to naive slug for unknown models', () => {
    expect(getModelSlug('Toyota', 'Yaris', 'autoscout')).toBe('yaris');
    expect(getModelSlug('Toyota', 'Yaris Cross', 'subito')).toBe('yaris-cross');
  });

  it('handles Porsche sub-variant overrides', () => {
    expect(getModelSlug('Porsche', '911 GT3', 'autoscout')).toBe('911-(tutto)');
    expect(getModelSlug('Porsche', '911 GT3', 'subito')).toBe('911');
  });
});
