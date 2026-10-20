import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { z } from 'zod';
import { validator } from 'hono/validator';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = process.env.EDITOR_PORT || 3003;
const app = new Hono();

// CORS
app.use('/*', cors());

let mongoServer;
let mongoUri = null;

async function startMongo() {
  const uri = process.env.MONGODB_URI;
  const dbPath = process.env.MONGODB_DB_PATH;

  if (uri) {
    mongoUri = uri;
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'editor' });
    console.log(`[Editor] Connected to MongoDB at ${uri}`);
  } else if (dbPath) {
    const resolvedPath = path.resolve(dbPath);
    fs.mkdirSync(resolvedPath, { recursive: true });
    mongoServer = await MongoMemoryServer.create({
      instance: { dbPath: resolvedPath, storageEngine: 'wiredTiger' },
    });
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log(`[Editor] Using persistent MongoDB at ${dbPath}`);
    console.log(`[Editor] Connect with Compass: ${mongoUri}`);
  } else {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log(`[Editor] Using in-memory MongoDB at ${mongoUri}`);
  }
}

await startMongo();

// --- Mongoose Schemas ---

const contentBlockSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'image', 'embed', 'quote', 'heading', 'list'], default: 'text' },
  order: { type: Number, default: 0 },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: true });

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  excerpt: String,
  coverImage: String,
  authorId: { type: String, default: 'system' },
  status: { type: String, enum: ['draft', 'review', 'published', 'archived'], default: 'draft' },
  tags: [String],
  contentBlocks: [contentBlockSchema],
  publishedAt: Date,
  podcastId: String,
  episodeId: String,
  seo: {
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
  },
}, { timestamps: true });

articleSchema.pre('save', function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now().toString(36);
  }
});

const Article = mongoose.model('Article', articleSchema);

const draftSchema = new mongoose.Schema({
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  version: { type: Number, default: 1 },
  content: { type: mongoose.Schema.Types.Mixed, default: {} },
  changes: String,
  savedBy: String,
}, { timestamps: true });

const Draft = mongoose.model('Draft', draftSchema);

const editorSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const EditorSettings = mongoose.model('EditorSettings', editorSettingsSchema);

// --- Zod Validation Schemas ---

const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  coverImage: z.string().optional(),
  authorId: z.string().optional(),
  status: z.enum(['draft', 'review', 'published', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
  contentBlocks: z.array(z.object({
    type: z.enum(['text', 'image', 'embed', 'quote', 'heading', 'list']).optional(),
    order: z.number().optional(),
    data: z.any().optional(),
  })).optional(),
  podcastId: z.string().optional(),
  episodeId: z.string().optional(),
});

const updateArticleSchema = createArticleSchema.partial();

const createDraftSchema = z.object({
  articleId: z.string().min(1, 'articleId is required'),
  content: z.any().optional(),
  changes: z.string().optional(),
  savedBy: z.string().optional(),
});

const updateSettingSchema = z.object({
  value: z.any(),
});

const syncSchema = z.object({
  model: z.string().min(1),
  action: z.enum(['create', 'update', 'delete']),
  data: z.record(z.any()),
});

// --- Simple in-memory rate limiter ---

const requestCounts = new Map();

function rateLimit(maxRequests = 100, windowMs = 60000) {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries and get current count
    if (!requestCounts.has(key)) {
      requestCounts.set(key, []);
    }
    const timestamps = requestCounts.get(key).filter(t => t > windowStart);
    timestamps.push(now);
    requestCounts.set(key, timestamps);

    if (timestamps.length > maxRequests) {
      return c.json({ error: 'Too many requests' }, 429);
    }
    await next();
  };
}

// Apply rate limiting globally
app.use('/*', rateLimit(100, 60000));

// --- API base path ---

const api = app.basePath('/api/editor');

// GET /api/editor/health
api.get('/health', (c) => {
  return c.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mongoUri: mongoUri,
  });
});

// GET /api/editor/articles
api.get('/articles', async (c) => {
  try {
    const status = c.req.query('status');
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('pageSize') || '20');
    const tag = c.req.query('tag');
    const filter = {};
    if (status) filter.status = status;
    if (tag) filter.tags = { $in: [tag] };

    const total = await Article.countDocuments(filter);
    const articles = await Article.find(filter)
      .select('-contentBlocks')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    return c.json({ data: articles, total, page, pageSize });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /api/editor/articles/:id
api.get('/articles/:id', async (c) => {
  try {
    const article = await Article.findById(c.req.param('id'));
    if (!article) return c.json({ error: 'Not found' }, 404);
    return c.json(article);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/editor/articles
api.post('/articles',
  validator('json', (value, c) => {
    const parsed = createArticleSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const article = await Article.create(data);
      return c.json(article, 201);
    } catch (err) {
      return c.json({ error: err.message }, 400);
    }
  }
);

// PUT /api/editor/articles/:id
api.put('/articles/:id',
  validator('json', (value, c) => {
    const parsed = updateArticleSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const article = await Article.findByIdAndUpdate(c.req.param('id'), data, { new: true });
      if (!article) return c.json({ error: 'Not found' }, 404);
      return c.json(article);
    } catch (err) {
      return c.json({ error: err.message }, 400);
    }
  }
);

// DELETE /api/editor/articles/:id
api.delete('/articles/:id', async (c) => {
  try {
    const article = await Article.findByIdAndDelete(c.req.param('id'));
    if (!article) return c.json({ error: 'Not found' }, 404);
    return c.json({ deleted: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/editor/articles/:id/publish
api.post('/articles/:id/publish', async (c) => {
  try {
    const article = await Article.findByIdAndUpdate(
      c.req.param('id'),
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
    if (!article) return c.json({ error: 'Not found' }, 404);
    return c.json(article);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /api/editor/drafts/:articleId
api.get('/drafts/:articleId', async (c) => {
  try {
    const drafts = await Draft.find({ articleId: c.req.param('articleId') })
      .sort({ version: -1 })
      .limit(10);
    return c.json(drafts);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/editor/drafts
api.post('/drafts',
  validator('json', (value, c) => {
    const parsed = createDraftSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const { articleId, ...rest } = c.req.valid('json');
      const lastDraft = await Draft.findOne({ articleId })
        .sort({ version: -1 });
      const draft = await Draft.create({
        articleId,
        ...rest,
        version: (lastDraft?.version || 0) + 1,
      });
      return c.json(draft, 201);
    } catch (err) {
      return c.json({ error: err.message }, 400);
    }
  }
);

// GET /api/editor/settings/:key
api.get('/settings/:key', async (c) => {
  try {
    const setting = await EditorSettings.findOne({ key: c.req.param('key') });
    return c.json(setting || { key: c.req.param('key'), value: null });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// PUT /api/editor/settings/:key
api.put('/settings/:key',
  validator('json', (value, c) => {
    const parsed = updateSettingSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const { value } = c.req.valid('json');
      const setting = await EditorSettings.findOneAndUpdate(
        { key: c.req.param('key') },
        { value },
        { upsert: true, new: true }
      );
      return c.json(setting);
    } catch (err) {
      return c.json({ error: err.message }, 400);
    }
  }
);

// POST /api/editor/sync — receive replicated data from admin server
api.post('/sync',
  validator('json', (value, c) => {
    const parsed = syncSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const { model, action, data } = c.req.valid('json');
      const collection = mongoose.connection.db.collection(model);
      if (action === 'create') {
        await collection.insertOne({ ...data, syncedAt: new Date() });
      } else if (action === 'update') {
        await collection.updateOne({ id: data.id }, { $set: { ...data, syncedAt: new Date() } });
      } else if (action === 'delete') {
        await collection.deleteOne({ id: data.id });
      }
      return c.json({ synced: true });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  }
);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[Editor Server] Running on port ${info.port}`);
});
