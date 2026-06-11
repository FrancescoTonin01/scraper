import { describe, it, expect } from 'vitest';
import { getModelSlug, getMakeSlug, isListingRelevantToModel } from '../data/modelSlugs.js';

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

describe('isListingRelevantToModel', () => {
  it('matches short Mercedes model codes as whole tokens', () => {
    expect(isListingRelevantToModel('Mercedes-Benz', 'CLA', 'Mercedes-Benz CLA 200 d Automatic')).toBe(true);
    expect(isListingRelevantToModel('Mercedes-Benz', 'CLA', 'Mercedes CLA-250 Shooting Brake')).toBe(true);
    expect(isListingRelevantToModel('Mercedes-Benz', 'CLA', 'Mercedes CLA250 Shooting Brake')).toBe(true);
    expect(isListingRelevantToModel('Mercedes-Benz', 'CLA', 'Mercedes-Benz CLE 220 d Coupé')).toBe(false);
    expect(isListingRelevantToModel('Mercedes-Benz', 'CLA', 'Mercedes Classe A 180 d')).toBe(false);
  });

  it('does not cross-match adjacent Mercedes codes', () => {
    expect(isListingRelevantToModel('Mercedes-Benz', 'CLE', 'Mercedes-Benz CLA 200')).toBe(false);
    expect(isListingRelevantToModel('Mercedes-Benz', 'GLA', 'Mercedes-Benz GLE 350')).toBe(false);
    expect(isListingRelevantToModel('Mercedes-Benz', 'EQA', 'Mercedes EQB 250')).toBe(false);
  });

  it('accepts Mercedes class shorthand without matching compact model codes', () => {
    expect(isListingRelevantToModel('Mercedes-Benz', 'Classe C', 'Mercedes-Benz C 220 d Station Wagon')).toBe(true);
    expect(isListingRelevantToModel('Mercedes-Benz', 'Classe C', 'Mercedes-Benz C220 d Station Wagon')).toBe(true);
    expect(isListingRelevantToModel('Mercedes-Benz', 'Classe E', 'Mercedes E 300 de Plug-in')).toBe(true);
    expect(isListingRelevantToModel('Mercedes-Benz', 'Classe C', 'Mercedes-Benz CLA 200')).toBe(false);
  });

  it('keeps BMW series searches broad but numeric searches precise', () => {
    expect(isListingRelevantToModel('BMW', 'Serie 3', 'BMW 320d Touring Business Advantage')).toBe(true);
    expect(isListingRelevantToModel('BMW', '318', 'BMW 318d Touring')).toBe(true);
    expect(isListingRelevantToModel('BMW', '318', 'BMW 320d Touring')).toBe(false);
    expect(isListingRelevantToModel('BMW', '318', 'BMW Serie 3 Touring')).toBe(true);
  });

  it('requires Porsche variant tokens for variant searches', () => {
    expect(isListingRelevantToModel('Porsche', '911 GT3', 'Porsche 911 GT3 RS')).toBe(true);
    expect(isListingRelevantToModel('Porsche', '911 GT3', 'Porsche 911 Carrera 4S')).toBe(false);
    expect(isListingRelevantToModel('Porsche', '911', 'Porsche 911 Carrera 4S')).toBe(true);
  });
});
