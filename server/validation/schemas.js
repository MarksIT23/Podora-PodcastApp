import { z } from 'zod';

// --- Shared primitives ---
const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);
const urlSchema = z.string().url();
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const tagsArray = z.array(z.string().max(50)).max(20);

// --- Podcast ---
export const createPodcastSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  host: z.string().max(200).default(''),
  description: z.string().max(10000).default(''),
  coverImage: z.string().max(500).default(''),
  status: z.enum(['published', 'draft', 'archived']).default('published'),
  featured: z.boolean().default(false),
  summary: z.string().max(2000).default(''),
  language: z.string().max(50).default('English'),
  tags: tagsArray.default([]),
  categoryIds: z.array(z.string()).max(20).default([]),
});

export const updatePodcastSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  host: z.string().max(200).optional(),
  description: z.string().max(10000).optional(),
  coverImage: z.string().max(500).optional(),
  status: z.enum(['published', 'draft', 'archived']).optional(),
  featured: z.boolean().optional(),
  summary: z.string().max(2000).optional(),
  language: z.string().max(50).optional(),
  tags: tagsArray.optional(),
  rating: z.number().min(0).max(10).optional(),
  plays: z.number().int().min(0).optional(),
  episodeCount: z.number().int().min(0).optional(),
  categoryIds: z.array(z.string()).max(20).optional(),
});

export const bulkUpdatePodcastsSchema = z.object({
  ids: z.array(z.string()).min(1, 'ids array is required'),
  updates: z.object({
    status: z.enum(['published', 'draft', 'archived']).optional(),
    featured: z.boolean().optional(),
    categoryIds: z.array(z.string()).max(20).optional(),
  }),
});

// --- Episode ---
export const updateEpisodeSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  published: z.boolean().optional(),
  tags: tagsArray.optional(),
  status: z.enum(['published', 'hidden']).optional(),
});

// --- Feed ---
export const createFeedSchema = z.object({
  url: z.string().url('A valid URL is required'),
  category: z.string().max(100).nullable().default(null),
  podcastId: z.string().nullable().default(null),
});

// --- Category ---
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: slugSchema,
  description: z.string().max(500).default(''),
  color: hexColor.default('#6366f1'),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional(),
  color: hexColor.optional(),
});

// --- Highlight ---
export const updateHighlightSchema = z.object({
  title: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  startTime: z.number().min(0).optional(),
  endTime: z.number().min(0).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  tags: tagsArray.optional(),
  collectionId: z.string().nullable().optional(),
});

// --- Highlight Collection ---
export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).default(''),
  slug: slugSchema.default(''),
  coverImage: z.string().max(500).default(''),
  color: hexColor.default('#3B82F6'),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  slug: slugSchema.optional(),
  coverImage: z.string().max(500).optional(),
  color: hexColor.optional(),
});

// --- Settings ---
export const updateSettingsSchema = z.record(
  z.string(),
  z.record(z.string(), z.unknown()),
);

// --- User (Admin) ---
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  role: z.enum(['user', 'moderator', 'admin']).default('user'),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'banned'], { required_error: 'status is required' }),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'moderator', 'admin'], { required_error: 'role is required' }),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

// --- Auth ---
export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

// --- User Data (Playlists, Saved) ---
export const createPlaylistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).default(''),
  emoji: z.string().max(10).default('\uD83D\uDCCB'),
});

export const updatePlaylistSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  emoji: z.string().max(10).optional(),
});

export const savePodcastSchema = z.object({
  podcastId: z.string().min(1, 'podcastId is required'),
});

export const addPlaylistEpisodeSchema = z.object({
  episodeId: z.string().min(1, 'episodeId is required'),
});

// --- Query parameter validation ---
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Validation middleware factory ---
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(issue.message);
      }
      return res.status(400).json({ error: 'Validation failed', details });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(issue.message);
      }
      return res.status(400).json({ error: 'Invalid query parameters', details });
    }
    req.query = result.data;
    next();
  };
}
