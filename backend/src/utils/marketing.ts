export type AlertInput = {
  email: string;
  make: string;
  model: string;
  location?: string | null;
  radius?: number | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  kmMax?: number | null;
  fuel?: string | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildAlertLookup(data: AlertInput): AlertInput {
  return {
    email: normalizeEmail(data.email),
    make: data.make,
    model: data.model,
    location: data.location ?? null,
    radius: data.radius ?? null,
    yearFrom: data.yearFrom ?? null,
    yearTo: data.yearTo ?? null,
    kmMax: data.kmMax ?? null,
    fuel: data.fuel ?? null,
  };
}

export function buildAlertSegmentKey(data: Pick<AlertInput, 'make' | 'model' | 'location'>): string {
  return [
    data.make,
    data.model,
    data.location || 'Tutta Italia',
  ].join(' | ');
}

export function escapeCsvValue(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
