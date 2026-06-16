import type { Express, NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { buildAlertStats, buildAlertsCsv, buildFeedbackStats } from '../admin.js';

export function registerAdminRoutes(app: Express, prisma: PrismaClient, adminKey: string): void {
  function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!adminKey || req.query.key !== adminKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  }

  app.get('/api/admin/feedback', requireAdmin, async (_req, res) => {
    const feedback = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const stats = buildFeedbackStats(feedback);
    res.json({ stats, feedback });
  });

  app.get('/api/admin/alerts', requireAdmin, async (_req, res) => {
    const alerts = await prisma.alertSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const stats = buildAlertStats(alerts);
    res.json({ stats, alerts });
  });

  app.get('/api/admin/alerts.csv', requireAdmin, async (_req, res) => {
    const alerts = await prisma.alertSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const csv = buildAlertsCsv(alerts);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="autoradar-alerts.csv"');
    res.send(csv);
  });
}
