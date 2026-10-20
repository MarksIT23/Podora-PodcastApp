import { Router } from 'express';

export default function reviewRoutes(prisma) {
  const router = Router();

  // List review queue
  router.get('/reviews', async (req, res) => {
    try {
      const { page = 1, pageSize = 20, status = '' } = req.query;
      const where = status ? { status } : {};

      const [data, total] = await Promise.all([
        prisma.reviewItem.findMany({
          where,
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.reviewItem.count({ where }),
      ]);

      res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single review item
  router.get('/reviews/:id', async (req, res) => {
    try {
      const item = await prisma.reviewItem.findUnique({ where: { id: req.params.id } });
      if (!item) return res.status(404).json({ error: 'Review item not found' });
      res.json({ data: item });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create review item
  router.post('/reviews', async (req, res) => {
    try {
      const { episodeId, feedId, podcastId, title, reason, notes } = req.body;
      if (!episodeId || !title) {
        return res.status(400).json({ error: 'episodeId and title are required' });
      }

      const item = await prisma.reviewItem.create({
        data: {
          episodeId,
          feedId: feedId || null,
          podcastId: podcastId || null,
          title,
          reason: reason || '',
          notes: notes || '',
          flaggedBy: req.user?.id || 'system',
        },
      });

      res.json({ data: item });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update review item (review/dismiss)
  router.put('/reviews/:id', async (req, res) => {
    try {
      const { status, notes } = req.body;
      if (status && !['pending', 'reviewed', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const data = {};
      if (status) data.status = status;
      if (notes !== undefined) data.notes = notes;
      if (status === 'reviewed') data.reviewedBy = req.user?.id || 'admin';

      const updated = await prisma.reviewItem.update({
        where: { id: req.params.id },
        data,
      });

      res.json({ data: updated });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Review item not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Delete review item
  router.delete('/reviews/:id', async (req, res) => {
    try {
      await prisma.reviewItem.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Review item not found' });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
