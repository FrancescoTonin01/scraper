import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import { feedbackSchema } from '../http/schemas.js';

export function registerFeedbackRoutes(app: Express, prisma: PrismaClient): void {
  app.post('/api/feedback', async (req, res) => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Dati non validi',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    await prisma.feedback.create({ data: parsed.data });
    console.log(`[feedback] rating=${parsed.data.rating} page=${parsed.data.page ?? '/'}`);
    res.status(201).json({ message: 'Grazie per il tuo feedback!' });
  });
}
