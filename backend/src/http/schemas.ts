import { z } from 'zod';
import { SORT_OPTIONS } from '../searchResults.js';

export const searchSchema = z.object({
  make: z.string().min(1, 'make is required'),
  model: z.string().min(1, 'model is required'),
  location: z.string().optional(),
  locationType: z.enum(['region', 'city']).optional(),
  radius: z.coerce.number().min(1).max(500).default(100),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
  sort: z.enum(SORT_OPTIONS).default('price_asc'),
  yearFrom: z.coerce.number().min(1900).max(2030).optional(),
  yearTo: z.coerce.number().min(1900).max(2030).optional(),
  kmMax: z.coerce.number().min(0).optional(),
  priceFrom: z.coerce.number().min(0).optional(),
  priceTo: z.coerce.number().min(0).optional(),
  fuel: z.string().optional(),
  snapshotId: z.string().optional(),
  debug: z.enum(['1', 'true']).optional(),
  noCache: z.enum(['1', 'true']).optional(),
}).refine((data) => data.priceFrom == null || data.priceTo == null || data.priceFrom <= data.priceTo, {
  message: 'priceFrom must be less than or equal to priceTo',
  path: ['priceTo'],
});

export const alertSchema = z.object({
  email: z.string().email('Email non valida'),
  make: z.string().min(1),
  model: z.string().min(1),
  location: z.string().optional(),
  radius: z.number().min(1).max(500).optional(),
  yearFrom: z.number().min(1900).max(2030).optional(),
  yearTo: z.number().min(1900).max(2030).optional(),
  kmMax: z.number().min(0).optional(),
  fuel: z.string().optional(),
});

export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().max(2000).optional(),
  page: z.string().max(500).optional(),
});
