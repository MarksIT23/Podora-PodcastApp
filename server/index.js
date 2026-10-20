import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';

import { loginSchema, registerSchema, validateBody } from './validation/schemas.js';
import feedRoutes from './routes/feeds.js';
import jobRoutes from './routes/jobs.js';
import dashboardRoutes from './routes/dashboard.js';
import podcastRoutes from './routes/podcasts.js';
import categoryRoutes from './routes/categories.js';
import episodeRoutes from './routes/episodes.js';
import userRoutes from './routes/users.js';
import activityRoutes from './routes/activity.js';
import userDataRoutes from './routes/user-data.js';
import settingsRoutes from './routes/settings.js';
import highlightRoutes from './routes/highlights.js';
import reviewRoutes from './routes/reviews.js';
import { startIngestionJob } from './jobs/ingestion.js';
import { startHighlightDetectionJob } from './jobs/highlight-detection.js';
import publicRoutes from './routes/public.js';

import { getCollection } from './lib/mongodb.js';
import { createClient } from '@supabase/supabase-js';

const rawPrisma = new PrismaClient();

// Configure Supabase (PostgreSQL) replication if credentials are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
  console.log('[Sync System] Real-time Supabase replication configured.');
}

const supabaseTablesOk = new Map();
const supabaseTableErrorPatterns = ['not found', 'not find', 'does not exist', 'relation'];

function isSupabaseTableError(error) {
  if (!error || !error.message) return false;
  const msg = error.message.toLowerCase();
  return supabaseTableErrorPatterns.some(p => msg.includes(p));
}

async function ensureSupabaseTables() {
  if (!supabase) return;
  const tables = ['podcast', 'episode', 'category', 'highlight', 'highlightcollection'];
  for (const name of tables) {
    const { error } = await supabase.from(name).select('id', { count: 'exact', head: true });
    if (error) {
      console.warn(`[Supabase] Table "public.${name}" not found — sync skipped for this table. Create it in your Supabase dashboard SQL editor.`);
      supabaseTablesOk.set(name, false);
    } else {
      supabaseTablesOk.set(name, true);
    }
  }
}

// Await the check before the server starts accepting requests
await ensureSupabaseTables().catch(() => {});

async function replicateToOthers(model, action, data) {
  try {
    // 1. Replicate to Editor's MongoDB Collection
    const mongoCollection = getCollection(model.toLowerCase());
    if (action === 'create') {
      await mongoCollection.insertOne({ ...data, syncSource: 'sqlite' });
    } else if (action === 'update') {
      await mongoCollection.updateOne({ id: data.id }, { $set: data });
    } else if (action === 'delete') {
      await mongoCollection.deleteOne({ id: data.id });
    }
  } catch (err) {
    console.warn(`[MongoDB Sync Warning] Failed to sync ${model} ${action}:`, err.message);
  }

  try {
    // 2. Replicate to User's Supabase (PostgreSQL) database
    if (supabase) {
      const tableName = model.toLowerCase();
      const supportedTables = ['podcast', 'episode', 'category', 'highlight', 'highlightcollection'];
      if (supportedTables.includes(tableName) && supabaseTablesOk.get(tableName)) {
        if (action === 'create') {
          const cleanData = { ...data };
          delete cleanData.categories;
          delete cleanData.feeds;
          delete cleanData.episodes;
          const { error } = await supabase.from(tableName).insert([cleanData]);
          if (error && !isSupabaseTableError(error)) console.warn(`[Supabase Sync Warning] Insert on ${tableName} failed:`, error.message);
        } else if (action === 'update') {
          const cleanData = { ...data };
          delete cleanData.categories;
          delete cleanData.feeds;
          delete cleanData.episodes;
          const { error } = await supabase.from(tableName).update(cleanData).eq('id', data.id);
          if (error && !isSupabaseTableError(error)) console.warn(`[Supabase Sync Warning] Update on ${tableName} failed:`, error.message);
        } else if (action === 'delete') {
          const { error } = await supabase.from(tableName).delete().eq('id', data.id);
          if (error && !isSupabaseTableError(error)) console.warn(`[Supabase Sync Warning] Delete on ${tableName} failed:`, error.message);
        }
      }
    }
  } catch (err) {
    if (!isSupabaseTableError(err)) console.warn(`[Supabase Sync Warning] Failed to sync ${model} ${action}:`, err.message);
  }
}

const prisma = rawPrisma.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const result = await query(args);
        await replicateToOthers(model, 'create', result);
        return result;
      },
      async update({ model, args, query }) {
        const result = await query(args);
        await replicateToOthers(model, 'update', result);
        return result;
      },
      async delete({ model, args, query }) {
        const result = await query(args);
        await replicateToOthers(model, 'delete', result);
        return result;
      }
    }
  }
});

const app = express();
const PORT = process.env.ADMIN_PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key-change-in-production';

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function apiRateLimit(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const user = jwt.verify(token, JWT_SECRET);
      if (user.role === 'admin' || user.role === 'editor') return next();
    }
  } catch {}
  apiLimiter(req, res, next);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Auth middleware
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Role-based authorization middleware
function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}

// Health check (unprotected)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Login (unprotected)
app.post('/api/admin/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public routes (no auth required)
app.use('/api', apiLimiter, publicRoutes(prisma));

// Public registration
app.post('/api/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.appUser.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.appUser.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'user',
        status: 'active',
        joinedAt: new Date(),
        lastActive: new Date(),
      },
    });

    // Generate JWT for auto-login after registration
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

// Public user login
app.post('/api/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.appUser.findUnique({ where: { email } });
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All routes below are protected
app.use('/api/admin', apiRateLimit, authenticate);

// Apply role restrictions to specific paths BEFORE mounting routers
app.use('/api/admin/feeds', authorize(['admin']));
app.use('/api/admin/jobs', authorize(['admin']));
app.use('/api/admin/users', authorize(['admin']));
app.use('/api/admin/settings', authorize(['admin']));

// Shared (Admin + Moderator) routes
app.use('/api/admin', dashboardRoutes(prisma));
app.use('/api/admin', feedRoutes(prisma));
app.use('/api/admin', jobRoutes(prisma));
app.use('/api/admin', podcastRoutes(prisma));
app.use('/api/admin', categoryRoutes(prisma));
app.use('/api/admin', episodeRoutes(prisma));
app.use('/api/admin', userRoutes(prisma));
app.use('/api/admin', activityRoutes(prisma));
app.use('/api/admin', userDataRoutes(prisma));
app.use('/api/admin', settingsRoutes(prisma));
app.use('/api/admin', highlightRoutes(prisma));
app.use('/api/admin', reviewRoutes(prisma));

// Start RSS ingestion cron (every 15 minutes)
startIngestionJob(prisma);
startHighlightDetectionJob(prisma);

app.listen(PORT, () => {
  console.log(`[Admin Server] Running on port ${PORT}`);
});
