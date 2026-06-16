import type { AlertSubscription, Feedback } from '@prisma/client';
import { buildAlertSegmentKey, escapeCsvValue } from './utils/marketing.js';

type AlertSegment = {
  make: string;
  model: string;
  location: string;
  count: number;
};

export function buildFeedbackStats(feedback: Feedback[]) {
  return {
    total: feedback.length,
    avgRating: feedback.length > 0
      ? +(feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1)
      : 0,
  };
}

export function buildAlertStats(alerts: AlertSubscription[]) {
  const segments = new Map<string, AlertSegment>();

  for (const alert of alerts) {
    const location = alert.location ?? 'Tutta Italia';
    const key = buildAlertSegmentKey({ make: alert.make, model: alert.model, location });
    const current = segments.get(key);
    if (current) {
      current.count += 1;
    } else {
      segments.set(key, {
        make: alert.make,
        model: alert.model,
        location,
        count: 1,
      });
    }
  }

  return {
    total: alerts.length,
    uniqueEmails: new Set(alerts.map((alert) => alert.email)).size,
    active: alerts.filter((alert) => alert.active).length,
    topSegments: [...segments.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

export function buildAlertsCsv(alerts: AlertSubscription[]): string {
  const headers = ['createdAt', 'email', 'make', 'model', 'location', 'radius', 'yearFrom', 'yearTo', 'kmMax', 'fuel', 'active'];
  const rows = alerts.map((alert) => [
    alert.createdAt.toISOString(),
    alert.email,
    alert.make,
    alert.model,
    alert.location ?? '',
    alert.radius ?? '',
    alert.yearFrom ?? '',
    alert.yearTo ?? '',
    alert.kmMax ?? '',
    alert.fuel ?? '',
    alert.active,
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\n');
}
