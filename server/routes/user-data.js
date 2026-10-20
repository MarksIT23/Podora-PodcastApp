import { Router } from 'express';

export default function userDataRoutes(prisma) {
  const router = Router();

  // Listening history
  router.get('/listening-history', async (req, res) => {
    try {
      const { page = 1, pageSize = 10 } = req.query;

      const [data, total] = await Promise.all([
        prisma.listeningHistory.findMany({
          where: { userId: req.user.id },
          orderBy: { playedAt: 'desc' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          include: {
            episode: {
              include: {
                feed: { select: { podcastId: true, podcast: { select: { title: true } } } },
              },
            },
          },
        }),
        prisma.listeningHistory.count({ where: { userId: req.user.id } }),
      ]);

      const mapped = data.map(h => ({
        id: h.id,
        episodeId: h.episodeId,
        episodeTitle: h.episode.title,
        podcastTitle: h.episode.feed?.podcast?.title || '',
        podcastId: h.episode.feed?.podcastId || null,
        coverImage: h.episode.feed?.podcast?.coverImage || '',
        podcastEmoji: '🎧',
        playedAt: h.playedAt.toISOString(),
        duration: h.episode.duration ? String(h.episode.duration) : '',
        progress: h.progress,
        audioUrl: h.episode.audioUrl,
      }));

      res.json({ data: mapped, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Playlists — list
  router.get('/playlists', async (req, res) => {
    try {
      const data = await prisma.playlist.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
      });

      const mapped = data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        episodeCount: p.episodeCount,
        createdAt: p.createdAt.toISOString().split('T')[0],
        emoji: p.emoji,
      }));

      res.json({ data: mapped });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Playlists — create
  router.post('/playlists', async (req, res) => {
    try {
      const { name, description, emoji } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const playlist = await prisma.playlist.create({
        data: {
          name,
          description: description || '',
          emoji: emoji || '📋',
          episodeCount: 0,
          userId: req.user.id,
        },
      });

      res.json({
        data: {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          episodeCount: playlist.episodeCount,
          createdAt: playlist.createdAt.toISOString().split('T')[0],
          emoji: playlist.emoji,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Playlists — update
  router.put('/playlists/:id', async (req, res) => {
    try {
      const { name, description, emoji } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (emoji !== undefined) data.emoji = emoji;

      const existing = await prisma.playlist.findFirst({ where: { id: req.params.id, userId: req.user.id } });
      if (!existing) return res.status(404).json({ error: 'Playlist not found' });

      const playlist = await prisma.playlist.update({
        where: { id: req.params.id },
        data,
      });

      res.json({
        data: {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          episodeCount: playlist.episodeCount,
          createdAt: playlist.createdAt.toISOString().split('T')[0],
          emoji: playlist.emoji,
        },
      });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Playlist not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Playlists — delete
  router.delete('/playlists/:id', async (req, res) => {
    try {
      const existing = await prisma.playlist.findFirst({ where: { id: req.params.id, userId: req.user.id } });
      if (!existing) return res.status(404).json({ error: 'Playlist not found' });
      await prisma.playlist.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Playlist not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Saved podcasts
  router.get('/saved-podcasts', async (req, res) => {
    try {
      const saved = await prisma.savedPodcast.findMany({
        where: { userId: req.user.id },
        include: {
          podcast: {
            include: {
              categories: { select: { id: true, name: true, slug: true, color: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const mapped = saved.map(s => ({
        id: s.podcast.id,
        title: s.podcast.title,
        host: s.podcast.host,
        categories: (s.podcast.categories || []).map(c => c.name),
        description: s.podcast.description,
        episodes: s.podcast.episodeCount,
        plays: s.podcast.plays,
        status: s.podcast.status,
        coverImage: s.podcast.coverImage,
        createdAt: s.podcast.createdAt.toISOString().split('T')[0],
        rating: s.podcast.rating,
        language: s.podcast.language,
        featured: s.podcast.featured,
        summary: s.podcast.summary,
        tags: JSON.parse(s.podcast.tags || '[]'),
      }));

      res.json({ data: mapped });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Saved podcasts — create
  router.post('/saved-podcasts', async (req, res) => {
    try {
      const { podcastId } = req.body;
      if (!podcastId) return res.status(400).json({ error: 'podcastId is required' });

      const existing = await prisma.savedPodcast.findFirst({ where: { podcastId, userId: req.user.id } });
      if (existing) return res.json({ data: { id: existing.id, podcastId: existing.podcastId } });

      const saved = await prisma.savedPodcast.create({ data: { podcastId, userId: req.user.id } });
      res.json({ data: { id: saved.id, podcastId: saved.podcastId } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Saved podcasts — delete
  router.delete('/saved-podcasts/:podcastId', async (req, res) => {
    try {
      const record = await prisma.savedPodcast.findFirst({ where: { podcastId: req.params.podcastId, userId: req.user.id } });
      if (!record) return res.status(404).json({ error: 'Saved podcast not found' });

      await prisma.savedPodcast.delete({ where: { id: record.id } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Playlist episodes — list
  router.get('/playlists/:id/episodes', async (req, res) => {
    try {
      const playlist = await prisma.playlist.findFirst({ where: { id: req.params.id, userId: req.user.id } });
      if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

      const entries = await prisma.playlistEpisode.findMany({
        where: { playlistId: req.params.id },
        include: {
          episode: {
            include: {
              feed: { select: { podcastId: true, podcast: { select: { title: true, coverImage: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const mapped = entries.map(e => ({
        id: e.id,
        episodeId: e.episodeId,
        episodeTitle: e.episode.title,
        podcastTitle: e.episode.feed?.podcast?.title || '',
        podcastId: e.episode.feed?.podcastId || null,
        coverImage: e.episode.feed?.podcast?.coverImage || '',
        duration: e.episode.duration || 0,
        audioUrl: e.episode.audioUrl,
        addedAt: e.createdAt.toISOString(),
      }));

      res.json({ data: mapped });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Playlist episodes — add
  router.post('/playlists/:id/episodes', async (req, res) => {
    try {
      const { episodeId } = req.body;
      if (!episodeId) return res.status(400).json({ error: 'episodeId is required' });

      const playlist = await prisma.playlist.findFirst({ where: { id: req.params.id, userId: req.user.id } });
      if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

      const existing = await prisma.playlistEpisode.findFirst({
        where: { playlistId: req.params.id, episodeId },
      });
      if (existing) return res.json({ data: { id: existing.id, episodeId: existing.episodeId } });

      const entry = await prisma.playlistEpisode.create({
        data: { playlistId: req.params.id, episodeId },
      });

      // Update count
      const count = await prisma.playlistEpisode.count({ where: { playlistId: req.params.id } });
      await prisma.playlist.update({ where: { id: req.params.id }, data: { episodeCount: count } });

      res.json({ data: { id: entry.id, episodeId: entry.episodeId } });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Playlist not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Playlist episodes — remove
  router.delete('/playlists/:id/episodes/:episodeId', async (req, res) => {
    try {
      const playlist = await prisma.playlist.findFirst({ where: { id: req.params.id, userId: req.user.id } });
      if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

      const record = await prisma.playlistEpisode.findFirst({
        where: { playlistId: req.params.id, episodeId: req.params.episodeId },
      });
      if (!record) return res.status(404).json({ error: 'Episode not in playlist' });

      await prisma.playlistEpisode.delete({ where: { id: record.id } });

      // Update count
      const count = await prisma.playlistEpisode.count({ where: { playlistId: req.params.id } });
      await prisma.playlist.update({ where: { id: req.params.id }, data: { episodeCount: count } });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
