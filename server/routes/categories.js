import { Router } from 'express';
import { createCategorySchema, updateCategorySchema, validateBody } from '../validation/schemas.js';

export default function categoryRoutes(prisma) {
  const router = Router();

  // List all categories
  router.get('/categories', async (req, res) => {
    try {
      const data = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { podcasts: true } } },
      });

      const mapped = data.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        color: c.color,
        podcastCount: c._count.podcasts,
      }));

      res.json({ data: mapped });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create category
  router.post('/categories', validateBody(createCategorySchema), async (req, res) => {
    try {
      const { name, slug, description, color } = req.body;

      const category = await prisma.category.create({
        data: { name, slug, description: description || '', color: color || '#6366f1' },
      });

      res.json({
        data: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          color: category.color,
          podcastCount: 0,
        },
      });
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Category with this name or slug already exists' });
      res.status(500).json({ error: err.message });
    }
  });

  // Update category
  router.put('/categories/:id', validateBody(updateCategorySchema), async (req, res) => {
    try {
      const { name, slug, description, color } = req.body;

      const category = await prisma.category.update({
        where: { id: req.params.id },
        data,
      });

      res.json({
        data: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          color: category.color,
          podcastCount: await prisma.podcast.count({ where: { categories: { some: { id: category.id } } } }),
        },
      });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Delete category
  router.delete('/categories/:id', async (req, res) => {
    try {
      await prisma.category.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
