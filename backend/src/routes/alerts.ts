import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import { alertSchema } from '../http/schemas.js';
import { buildAlertLookup } from '../utils/marketing.js';

export function registerAlertRoutes(app: Express, prisma: PrismaClient): void {
  app.post('/api/alerts', async (req, res) => {
    const parsed = alertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Dati non validi',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = buildAlertLookup(parsed.data);

    const existing = await prisma.alertSubscription.findFirst({
      where: {
        email: data.email,
        make: data.make,
        model: data.model,
        location: data.location ?? null,
        radius: data.radius ?? null,
        yearFrom: data.yearFrom ?? null,
        yearTo: data.yearTo ?? null,
        kmMax: data.kmMax ?? null,
        fuel: data.fuel ?? null,
        active: true,
      },
    });

    if (existing) {
      res.json({ message: 'Hai già salvato questa ricerca.' });
      return;
    }

    await prisma.alertSubscription.create({ data });
    console.log(`[alert] New subscription: ${data.email} → ${data.make} ${data.model}`);
    res.status(201).json({ message: 'Ricerca salvata. Ti avviseremo quando attiveremo gli alert.' });
  });
}
