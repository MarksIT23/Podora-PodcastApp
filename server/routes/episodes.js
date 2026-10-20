import { Router } from 'express';
import { updateEpisodeSchema, validateBody } from '../validation/schemas.js';

export default function episodeRoutes(prisma) {
  const router = Router();

  // List episodes with pagination, optional podcast filter
  router.get('/episodes', async (req, res) => {
    try {
      const { page = 1, pageSize = 20, podcastId, search = '' } = req.query;
      const where = {};
      if (podcastId) {
        where.feed = { podcastId };
      }
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { description: { contains: search } },
        ];
      }

      const [data, total] = await Promise.all([
        prisma.episode.findMany({
          where,
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { publishedAt: 'desc' },
          include: {
            feed: { select: { category: true, podcastId: true, podcast: { select: { title: true, host: true } } } },
          },
        }),
        prisma.episode.count({ where }),
      ]);

      const episodeIds = data.map(e => e.id);
      const allHighlights = await prisma.highlight.findMany({
        where: { episodeId: { in: episodeIds }, status: 'approved' },
        include: { segments: true },
      });
      const highlightsByEpisode = {};
      for (const hl of allHighlights) {
        if (!highlightsByEpisode[hl.episodeId]) highlightsByEpisode[hl.episodeId] = [];
        highlightsByEpisode[hl.episodeId].push(hl);
      }

      const mapped = data.map(e => ({
        id: e.id,
        podcastId: e.feed?.podcastId || e.feedId,
        podcastTitle: e.feed?.podcast?.title || '',
        title: e.title,
        host: e.host || e.feed?.podcast?.host || '',
        date: e.publishedAt ? e.publishedAt.toISOString().split('T')[0] : '',
        duration: e.duration ? String(e.duration) : '',
        plays: e.plays,
        category: e.feed?.category || '',
        excerpt: e.description || '',
        tags: JSON.parse(e.tags || '[]'),
        audioUrl: e.audioUrl,
        published: !!e.publishedAt,
        status: e.status || 'published',
        aiHighlights: highlightsByEpisode[e.id] || [],
      }));

      res.json({ data: mapped, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single episode
  router.get('/episodes/:id', async (req, res) => {
    try {
      const episode = await prisma.episode.findUnique({
        where: { id: req.params.id },
        include: {
          feed: { select: { category: true, podcastId: true, podcast: { select: { title: true, host: true } } } },
        },
      });
      if (!episode) return res.status(404).json({ error: 'Episode not found' });

      const episodeHighlights = await prisma.highlight.findMany({
        where: { episodeId: episode.id, status: 'approved' },
        include: { segments: true },
      });

      res.json({
        data: {
          id: episode.id,
          podcastId: episode.feed?.podcastId || episode.feedId,
          podcastTitle: episode.feed?.podcast?.title || '',
          title: episode.title,
          host: episode.host || episode.feed?.podcast?.host || '',
          date: episode.publishedAt ? episode.publishedAt.toISOString().split('T')[0] : '',
          duration: episode.duration ? String(episode.duration) : '',
          plays: episode.plays,
          category: episode.feed?.category || '',
          excerpt: episode.description || '',
          tags: JSON.parse(episode.tags || '[]'),
          audioUrl: episode.audioUrl,
          published: !!episode.publishedAt,
          status: episode.status || 'published',
          aiHighlights: episodeHighlights,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update episode
  router.put('/episodes/:id', validateBody(updateEpisodeSchema), async (req, res) => {
    try {
      const { title, description, published, tags, status } = req.body;
      const data = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (tags !== undefined) data.tags = JSON.stringify(tags);
      if (status !== undefined) data.status = status;
      
      if (published !== undefined) {
        if (published) {
          data.publishedAt = new Date();
        } else {
          data.publishedAt = null;
        }
      }

      const updated = await prisma.episode.update({
        where: { id: req.params.id },
        data,
      });

      res.json({ data: updated });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Episode not found' });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
