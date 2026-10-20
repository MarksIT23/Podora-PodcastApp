import { Router } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key-change-in-production';

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
    } catch {
      // ignore
    }
  }
  next();
};

export default function publicRoutes(prisma) {
  const router = Router();

  // Latest episodes — used by homepage
  router.get('/episodes', async (req, res) => {
    try {
      const { page = 1, pageSize = 20 } = req.query;

      const [data, total] = await Promise.all([
        prisma.episode.findMany({
          where: { publishedAt: { not: null } },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { publishedAt: 'desc' },
          include: {
            feed: {
              select: {
                category: true,
                podcast: { select: { id: true, title: true, host: true, coverImage: true } },
              },
            },
          },
        }),
        prisma.episode.count({ where: { publishedAt: { not: null } } }),
      ]);

      const mapped = data.map((e) => ({
        id: e.id,
        title: e.title,
        host: e.feed?.podcast?.host || '',
        podcastTitle: e.feed?.podcast?.title || '',
        podcastId: e.feed?.podcast?.id || null,
        coverImage: e.feed?.podcast?.coverImage || '',
        date: e.publishedAt ? e.publishedAt.toISOString().split('T')[0] : '',
        duration: e.duration ? String(e.duration) : '',
        category: e.feed?.category || 'General',
        excerpt: (e.description || '').slice(0, 200),
        audioUrl: e.audioUrl,
      }));

      res.json({ data: mapped, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Featured podcasts — used by homepage
  router.get('/podcasts', async (req, res) => {
    try {
      const { page = 1, pageSize = 20 } = req.query;

      const [data, total] = await Promise.all([
        prisma.podcast.findMany({
          where: { status: 'published' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { createdAt: 'desc' },
          include: {
            categories: { select: { name: true, slug: true, color: true } },
            feeds: { select: { id: true, category: true } },
          },
        }),
        prisma.podcast.count({ where: { status: 'published' } }),
      ]);

      const mapped = await Promise.all(
        data.map(async (p) => {
          const episodeCount = await prisma.episode.count({
            where: { feedId: { in: p.feeds.map((f) => f.id) } },
          });

          // Use linked Category records if available; fall back to the feed's
          // plain category string so the badge always has something to display.
          let categories = (p.categories || []).map(c => ({ name: c.name, slug: c.slug, color: c.color }));
          if (categories.length === 0) {
            const feedCat = p.feeds.find(f => f.category)?.category;
            if (feedCat) {
              categories = [{ name: feedCat, slug: feedCat.toLowerCase().replace(/\s+/g, '-'), color: '#6366f1' }];
            }
          }

          return {
            id: p.id,
            title: p.title,
            host: p.host || '',
            categories,
            description: p.description || '',
            coverImage: p.coverImage || '',
            episodes: episodeCount,
            summary: p.summary || '',
          };
        })
      );

      res.json({ data: mapped, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Playback progress — save position
  router.post('/progress', optionalAuth, async (req, res) => {
    try {
      const { episodeId, progress } = req.body;
      if (!episodeId || progress === undefined) {
        return res.status(400).json({ error: 'episodeId and progress are required' });
      }

      // Find existing record for this episode, or create one
      const existing = await prisma.listeningHistory.findFirst({
        where: { episodeId, userId: req.user?.id || null },
        orderBy: { playedAt: 'desc' },
      });

      let record;
      if (existing) {
        record = await prisma.listeningHistory.update({
          where: { id: existing.id },
          data: { progress: Math.min(100, Math.max(0, progress)), playedAt: new Date() },
        });
      } else {
        record = await prisma.listeningHistory.create({
          data: { episodeId, progress: Math.min(100, Math.max(0, progress)), playedAt: new Date(), userId: req.user?.id || null },
        });
      }
      res.json({ data: record });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Playback progress — get position
  router.get('/progress/:episodeId', optionalAuth, async (req, res) => {
    try {
      const record = await prisma.listeningHistory.findFirst({
        where: { episodeId: req.params.episodeId, userId: req.user?.id || null },
        orderBy: { playedAt: 'desc' },
      });
      res.json({ data: record ? { progress: record.progress, playedAt: record.playedAt } : null });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Log a play event
  router.post('/history', optionalAuth, async (req, res) => {
    try {
      const { episodeId } = req.body;
      if (!episodeId) return res.status(400).json({ error: 'episodeId is required' });

      // Create history record
      const record = await prisma.listeningHistory.create({
        data: { episodeId, progress: 0, playedAt: new Date(), userId: req.user?.id || null },
      });

      // Increment plays on the Episode
      const updatedEpisode = await prisma.episode.update({
        where: { id: episodeId },
        data: {
          plays: {
            increment: 1,
          },
        },
        include: {
          feed: true,
        },
      });

      // Increment plays on the parent Podcast if it has one linked via feed
      if (updatedEpisode.feed && updatedEpisode.feed.podcastId) {
        await prisma.podcast.update({
          where: { id: updatedEpisode.feed.podcastId },
          data: {
            plays: {
              increment: 1,
            },
          },
        });
      }

      res.json({ data: record });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // Public highlights
  // ============================================================

  router.get('/highlights', async (req, res) => {
    try {
      const { page = 1, pageSize = 20, collectionId } = req.query;
      const where = { status: 'approved' };
      if (collectionId) where.collectionId = collectionId;

      const [data, total] = await Promise.all([
        prisma.highlight.findMany({
          where,
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { createdAt: 'desc' },
          include: {
            episode: { select: { id: true, title: true, duration: true, audioUrl: true } },
            collection: { select: { id: true, name: true, slug: true, color: true } },
            segments: { select: { id: true, label: true, startTime: true, endTime: true, text: true } },
          },
        }),
        prisma.highlight.count({ where }),
      ]);

      res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/highlights/:id', async (req, res) => {
    try {
      const highlight = await prisma.highlight.findUnique({
        where: { id: req.params.id },
        include: {
          episode: { select: { id: true, title: true, duration: true, audioUrl: true } },
          collection: { select: { id: true, name: true, slug: true, color: true } },
          segments: { select: { id: true, label: true, startTime: true, endTime: true, text: true } },
        },
      });
      if (!highlight || highlight.status !== 'approved') {
        return res.status(404).json({ error: 'Highlight not found' });
      }
      res.json({ data: highlight });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/highlight-collections', async (req, res) => {
    try {
      const collections = await prisma.highlightCollection.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { highlights: { where: { status: 'approved' } } },
          },
        },
      });
      res.json({ data: collections });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/stats', async (req, res) => {
    try {
      const [totalPodcasts, totalEpisodes, totalPlaysResult] = await Promise.all([
        prisma.podcast.count({ where: { status: 'published' } }),
        prisma.episode.count(),
        prisma.episode.aggregate({ _sum: { plays: true } }),
      ]);

      const totalPlays = totalPlaysResult._sum.plays || 0;
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weeklyPlays = dayNames.map((label, i) => ({
        label,
        value: Math.round((totalPlays / 7) * (0.7 + Math.random() * 0.6)),
      }));

      res.json({
        data: {
          totalPodcasts,
          totalEpisodes,
          totalPlays,
          weeklyPlays,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
