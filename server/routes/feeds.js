import { Router } from 'express';
import { createFeedSchema, validateBody } from '../validation/schemas.js';

export default function feedRoutes(prisma) {
  const router = Router();

  router.get('/feeds', async (req, res) => {
    try {
      const { page = 1, pageSize = 20, status } = req.query;
      const where = status ? { status } : {};
      const [data, total] = await Promise.all([
        prisma.feed.findMany({
          where,
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { episodes: true, jobs: true } }, podcast: { select: { id: true, title: true } } },
        }),
        prisma.feed.count({ where }),
      ]);
      res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/feeds', validateBody(createFeedSchema), async (req, res) => {
    try {
      const { url, category, podcastId } = req.body;
      const feed = await prisma.feed.create({
        data: { url, category: category || null, podcastId: podcastId || null },
      });
      res.json({ data: feed });
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Feed URL already exists' });
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/feeds/:id', async (req, res) => {
    try {
      await prisma.feed.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/feeds/:id', async (req, res) => {
    try {
      const feed = await prisma.feed.findUnique({
        where: { id: req.params.id },
        include: { episodes: { orderBy: { publishedAt: 'desc' }, take: 50 }, podcast: { select: { id: true, title: true } } },
      });
      if (!feed) return res.status(404).json({ error: 'Feed not found' });
      res.json({ data: feed });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
