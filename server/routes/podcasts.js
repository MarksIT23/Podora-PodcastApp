import { Router } from 'express';
import {
  createPodcastSchema,
  updatePodcastSchema,
  bulkUpdatePodcastsSchema,
  validateBody,
} from '../validation/schemas.js';

export default function podcastRoutes(prisma) {
  const router = Router();

  // Helper: recalculate category podcast counts
  async function recalcCategoryCount(categoryId) {
    if (!categoryId) return;
    const count = await prisma.podcast.count({
      where: { categories: { some: { id: categoryId } } },
    });
    await prisma.category.update({ where: { id: categoryId }, data: { podcastCount: count } });
  }

  // Helper: format podcast response
  function formatPodcast(p, countMap) {
    return {
      id: p.id,
      title: p.title,
      host: p.host,
      categories: (p.categories || []).map(c => ({ id: c.id, name: c.name, slug: c.slug, color: c.color })),
      description: p.description,
      episodes: countMap ? (countMap[p.id] ?? p.episodeCount) : p.episodeCount,
      plays: p.plays,
      status: p.status,
      coverImage: p.coverImage,
      createdAt: p.createdAt.toISOString().split('T')[0],
      rating: p.rating,
      language: p.language,
      featured: p.featured,
      summary: p.summary,
      tags: JSON.parse(p.tags || '[]'),
    };
  }

  // List podcasts with pagination, search, and filters
  router.get('/podcasts', async (req, res) => {
    try {
      const { page = 1, pageSize = 10, search = '', category = '', status = '' } = req.query;
      const where = {};

      if (search) where.title = { contains: search };
      if (category) {
        const catRecord = await prisma.category.findFirst({
          where: { name: { equals: category } },
        });
        if (catRecord) where.categories = { some: { id: catRecord.id } };
      }
      if (status) where.status = status;

      const [data, total] = await Promise.all([
        prisma.podcast.findMany({
          where,
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { createdAt: 'desc' },
          include: { categories: true },
        }),
        prisma.podcast.count({ where }),
      ]);

      const podcastIds = data.map((p) => p.id);
      const countMap = {};
      if (podcastIds.length) {
        const feeds = await prisma.feed.findMany({
          where: { podcastId: { in: podcastIds } },
          select: { podcastId: true, _count: { select: { episodes: true } } },
        });
        for (const feed of feeds) {
          countMap[feed.podcastId] = (countMap[feed.podcastId] || 0) + feed._count.episodes;
        }
      }

      res.json({ data: data.map(p => formatPodcast(p, countMap)), total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Search podcasts
  router.get('/podcasts/search', async (req, res) => {
    try {
      const { q = '', page = 1, pageSize = 20 } = req.query;
      if (!q) return res.json({ data: [], total: 0, page: 1, pageSize: Number(pageSize) });

      const where = {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { host: { contains: q } },
        ],
      };

      const [data, total] = await Promise.all([
        prisma.podcast.findMany({
          where,
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { plays: 'desc' },
          include: { categories: true },
        }),
        prisma.podcast.count({ where }),
      ]);

      res.json({ data: data.map(p => formatPodcast(p)), total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Raw episodes (legacy support)
  router.get('/podcasts/raw', async (req, res) => {
    try {
      const { page = 1, pageSize = 20, search } = req.query;
      const where = search ? { title: { contains: search } } : {};
      const [data, total] = await Promise.all([
        prisma.episode.findMany({
          where,
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { createdAt: 'desc' },
          include: { feed: { select: { url: true, category: true, podcastId: true } } },
        }),
        prisma.episode.count({ where }),
      ]);
      res.json({ data, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single podcast
  router.get('/podcasts/:id', async (req, res) => {
    try {
      const podcast = await prisma.podcast.findUnique({
        where: { id: req.params.id },
        include: {
          categories: true,
          feeds: { include: { _count: { select: { episodes: true } } } },
        },
      });
      if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

      const feedEpisodesCount = podcast.feeds.reduce((sum, f) => sum + f._count.episodes, 0);

      res.json({
        data: {
          ...formatPodcast(podcast),
          feedEpisodes: feedEpisodesCount,
          categoryIds: podcast.categories.map(c => c.id),
          feeds: podcast.feeds.map(f => ({
            id: f.id,
            url: f.url,
            category: f.category,
            status: f.status,
            lastFetched: f.lastFetched,
            episodeCount: f._count.episodes,
          })),
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create podcast
  router.post('/podcasts', validateBody(createPodcastSchema), async (req, res) => {
    try {
      const { title, host, description, coverImage, status, categoryIds, featured, summary, language, tags } = req.body;

      const podcast = await prisma.podcast.create({
        data: {
          title,
          host: host || '',
          description: description || '',
          coverImage: coverImage || '',
          status: status || 'published',
          featured: featured || false,
          summary: summary || '',
          language: language || 'English',
          tags: JSON.stringify(tags || []),
          categories: categoryIds?.length
            ? { connect: categoryIds.map(id => ({ id })) }
            : undefined,
        },
        include: { categories: true },
      });

      for (const catId of categoryIds || []) {
        await recalcCategoryCount(catId);
      }

      res.json({ data: formatPodcast(podcast) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update podcast
  router.put('/podcasts/:id', validateBody(updatePodcastSchema), async (req, res) => {
    try {
      const {
        title, host, description, coverImage, status, categoryIds,
        featured, summary, language, tags, rating, plays, episodeCount,
      } = req.body;

      // Get old category IDs for count recalculation
      const old = await prisma.podcast.findUnique({
        where: { id: req.params.id },
        select: { categories: { select: { id: true } } },
      });
      const oldCategoryIds = (old?.categories || []).map(c => c.id);

      const data = {};
      if (title !== undefined) data.title = title;
      if (host !== undefined) data.host = host;
      if (description !== undefined) data.description = description;
      if (coverImage !== undefined) data.coverImage = coverImage;
      if (status !== undefined) data.status = status;
      if (featured !== undefined) data.featured = featured;
      if (summary !== undefined) data.summary = summary;
      if (language !== undefined) data.language = language;
      if (tags !== undefined) data.tags = JSON.stringify(tags);
      if (rating !== undefined) data.rating = rating;
      if (plays !== undefined) data.plays = plays;
      if (episodeCount !== undefined) data.episodeCount = episodeCount;
      if (categoryIds !== undefined) {
        data.categories = {
          set: categoryIds.map(id => ({ id })),
        };
      }

      const podcast = await prisma.podcast.update({
        where: { id: req.params.id },
        data,
        include: { categories: true },
      });

      // Recalculate counts for old and new categories
      const allIds = new Set([...oldCategoryIds, ...(categoryIds || [])]);
      for (const catId of allIds) {
        await recalcCategoryCount(catId);
      }

      res.json({ data: formatPodcast(podcast) });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Podcast not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Delete podcast
  router.delete('/podcasts/:id', async (req, res) => {
    try {
      const p = await prisma.podcast.findUnique({
        where: { id: req.params.id },
        select: { categories: { select: { id: true } } },
      });
      await prisma.podcast.delete({ where: { id: req.params.id } });
      for (const cat of (p?.categories || [])) {
        await recalcCategoryCount(cat.id);
      }
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Podcast not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Duplicate podcast
  router.post('/podcasts/:id/duplicate', async (req, res) => {
    try {
      const original = await prisma.podcast.findUnique({
        where: { id: req.params.id },
        include: { categories: true },
      });
      if (!original) return res.status(404).json({ error: 'Podcast not found' });

      const podcast = await prisma.podcast.create({
        data: {
          title: `${original.title} (Copy)`,
          host: original.host,
          description: original.description,
          coverImage: original.coverImage,
          status: 'draft',
          language: original.language,
          tags: original.tags,
          categories: { connect: original.categories.map(c => ({ id: c.id })) },
        },
        include: { categories: true },
      });

      res.json({ data: formatPodcast(podcast) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk update podcasts
  router.post('/podcasts/bulk-update', validateBody(bulkUpdatePodcastsSchema), async (req, res) => {
    try {
      const { ids, updates } = req.body;

      const data = {};
      if (updates.status !== undefined) data.status = updates.status;
      if (updates.featured !== undefined) data.featured = updates.featured;

      // categoryIds needs special handling for M:N
      if (updates.categoryIds !== undefined) {
        for (const id of ids) {
          await prisma.podcast.update({
            where: { id },
            data: { categories: { set: updates.categoryIds.map(cid => ({ id: cid })) } },
          });
          for (const catId of updates.categoryIds) {
            await recalcCategoryCount(catId);
          }
        }
      }

      if (Object.keys(data).length > 0) {
        await prisma.podcast.updateMany({ where: { id: { in: ids } }, data });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
