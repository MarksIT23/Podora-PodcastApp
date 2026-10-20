import { Router } from 'express';
import { detectHighlightsForEpisode } from '../jobs/highlight-detection.js';
import { updateHighlightSchema, createCollectionSchema, updateCollectionSchema, validateBody } from '../validation/schemas.js';

export default function highlightRoutes(prisma) {
  const router = Router();

  // ============================================================
  // Admin endpoints (mounted under /api/admin)
  // ============================================================

  // List highlights with filters
  router.get('/highlights', async (req, res) => {
    try {
      const { page = 1, pageSize = 20, status, episodeId, collectionId } = req.query;
      const where = {};
      if (status) where.status = status;
      if (episodeId) where.episodeId = episodeId;
      if (collectionId) where.collectionId = collectionId;

      const [data, total] = await Promise.all([
        prisma.highlight.findMany({
          where,
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { createdAt: 'desc' },
          include: {
            episode: {
              select: {
                id: true, title: true, duration: true, audioUrl: true,
                feed: { select: { podcast: { select: { coverImage: true } } } },
              },
            },
            collection: { select: { id: true, name: true, slug: true, color: true } },
            segments: true,
          },
        }),
        prisma.highlight.count({ where }),
      ]);

      res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single highlight with all relations
  router.get('/highlights/:id', async (req, res) => {
    try {
      const highlight = await prisma.highlight.findUnique({
        where: { id: req.params.id },
        include: {
          episode: {
            select: {
              id: true, title: true, duration: true, audioUrl: true,
              feed: { select: { podcast: { select: { coverImage: true } } } },
            },
          },
          collection: { select: { id: true, name: true, slug: true, color: true } },
          segments: true,
        },
      });
      if (!highlight) return res.status(404).json({ error: 'Highlight not found' });
      res.json({ data: highlight });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update highlight
  router.put('/highlights/:id', validateBody(updateHighlightSchema), async (req, res) => {
    try {
      const { title, description, startTime, endTime, status, tags, collectionId } = req.body;
      const data = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (startTime !== undefined) data.startTime = startTime;
      if (endTime !== undefined) data.endTime = endTime;
      if (status !== undefined) data.status = status;
      if (tags !== undefined) data.tags = JSON.stringify(tags);
      if (collectionId !== undefined) data.collectionId = collectionId || null;

      const updated = await prisma.highlight.update({
        where: { id: req.params.id },
        data,
        include: {
          episode: { select: { id: true, title: true, feed: { select: { podcast: { select: { coverImage: true } } } } } },
          collection: { select: { id: true, name: true, slug: true } },
          segments: true,
        },
      });

      res.json({ data: updated });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Highlight not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Approve highlight shortcut
  router.post('/highlights/:id/approve', async (req, res) => {
    try {
      const updated = await prisma.highlight.update({
        where: { id: req.params.id },
        data: { status: 'approved' },
      });
      res.json({ data: updated });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Highlight not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Reject highlight shortcut
  router.post('/highlights/:id/reject', async (req, res) => {
    try {
      const updated = await prisma.highlight.update({
        where: { id: req.params.id },
        data: { status: 'rejected' },
      });
      res.json({ data: updated });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Highlight not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Delete highlight
  router.delete('/highlights/:id', async (req, res) => {
    try {
      await prisma.highlight.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Highlight not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Manually trigger detection for an episode
  router.post('/episodes/:id/detect', async (req, res) => {
    try {
      const episode = await prisma.episode.findUnique({ where: { id: req.params.id } });
      if (!episode) return res.status(404).json({ error: 'Episode not found' });

      const count = await detectHighlightsForEpisode(prisma, episode);
      res.json({ data: { highlightsCreated: count } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // Collection admin endpoints
  // ============================================================

  router.get('/highlight-collections', async (req, res) => {
    try {
      const collections = await prisma.highlightCollection.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { highlights: true } } },
      });
      res.json({ data: collections });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/highlight-collections', validateBody(createCollectionSchema), async (req, res) => {
    try {
      const { name, description, slug, coverImage, color } = req.body;

      const collection = await prisma.highlightCollection.create({
        data: {
          name,
          description: description || '',
          slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          coverImage: coverImage || '',
          color: color || '#3B82F6',
        },
      });
      res.json({ data: collection });
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'A collection with this slug already exists' });
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/highlight-collections/:id', validateBody(updateCollectionSchema), async (req, res) => {
    try {
      const { name, description, slug, coverImage, color } = req.body;

      const updated = await prisma.highlightCollection.update({
        where: { id: req.params.id },
        data,
      });
      res.json({ data: updated });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Collection not found' });
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/highlight-collections/:id', async (req, res) => {
    try {
      await prisma.highlightCollection.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Collection not found' });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
