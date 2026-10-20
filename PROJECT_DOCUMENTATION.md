# Podcast Platform — Complete Project Documentation

> **Internal Reference:** `D:\PODCAST`
> **Version:** 1.0.0
> **Last Updated:** June 12, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Services & Ports](#3-services--ports)
4. [Getting Started](#4-getting-started)
5. [Database Model](#5-database-model)
6. [API Reference](#6-api-reference)
7. [Frontend Routes](#7-frontend-routes)
8. [Features by Category](#8-features-by-category)
9. [Admin Panel Guide](#9-admin-panel-guide)
10. [Content Editor Guide](#10-content-editor-guide)
11. [User Dashboard Guide](#11-user-dashboard-guide)
12. [AI Highlight System](#12-ai-highlight-system)
13. [RSS Feed Ingestion](#13-rss-feed-ingestion)
14. [Cross-System Data Sync](#14-cross-system-data-sync)
15. [Review Queue System](#15-review-queue-system)
16. [Episode Toggle (Publish/Hide)](#16-episode-toggle-publishhide)
17. [Authentication & Roles](#17-authentication--roles)
18. [Input Validation](#18-input-validation)
19. [Rate Limiting](#19-rate-limiting)
20. [Scheduled Jobs](#20-scheduled-jobs)
21. [Subsystems & Gateway](#21-subsystems--gateway)
22. [Common Operations](#22-common-operations)
23. [Troubleshooting](#23-troubleshooting)

---

## 1. Project Overview

A full-stack **podcast content management platform** built with a **React (Vite)** frontend and a multi-server backend architecture. It manages podcast feeds, episodes, AI-generated highlights, user accounts, editorial content, analytics, and review workflows.

**Tech Stack:**

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, Framer Motion, GSAP |
| **UI Library** | Radix UI primitives (Avatar, Dialog, Dropdown, Slider, Switch, Tabs, Tooltip) |
| **Admin API** | Express 4 (port 3002) — Prisma ORM + SQLite |
| **Editor API** | Hono 4 (port 3003) — Mongoose + MongoDB (in-memory or persistent) |
| **Gateway** | Express 4 (port 3100) — Webhook relay between subsystems |
| **Validation** | Zod 4 on both Admin and Editor servers |
| **Auth** | JWT (jsonwebtoken) with bcrypt password hashing |
| **Icons** | Lucide React |
| **Replication** | Supabase (optional PostgreSQL) |

**Database:** SQLite via Prisma ORM (Admin server). MongoDB via Mongoose (Editor server). Data is synced between them in real-time.

---

## 2. Architecture

```
                        ┌─────────────────────────────────┐
                        │    Browser (React + Vite)       │
                        │    http://localhost:5173         │
                        └──────────┬──────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
          ┌─────────────────┐ ┌──────────┐ ┌──────────┐
          │ Admin API       │ │Editor API│ │ Gateway  │
          │ Express (3002)  │ │Hono (3003)│ │ (3100)   │
          │ Prisma + SQLite │ │Mongoose  │ │ Webhooks │
          │                 │ │MongoDB   │ │          │
          └────────┬────────┘ └──────────┘ └──────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    ┌──────┐ ┌──────────┐ ┌──────────┐
    │SQLite│ │ MongoDB  │ │Supabase  │
    │      │ │(Editor)  │ │(optional)│
    └──────┘ └──────────┘ └──────────┘
```

### Data Flow

1. **Admin API** (Express + Prisma) is the primary data source. All CRUD operations run through it.
2. **Editor API** (Hono + MongoDB) manages editorial content (articles, drafts, settings) independently.
3. **Cross-system sync:** Admin Prisma writes auto-replicate to Editor's MongoDB and optionally to Supabase/PostgreSQL via `prisma.$extends` middleware.
4. **Gateway** provides event-driven webhook relay between subsystems — subscribe/unsubscribe pattern.
5. **Frontend** calls Admin API for most data, Editor API for article management, and optionally Supabase for public data.

---

## 3. Services & Ports

| Service | Port | Command | Description |
|---------|------|---------|-------------|
| Admin API Server | `3002` | `cd server && node index.js` | Express + Prisma + SQLite |
| Editor Server | `3003` | `cd server && node editor/index.js` | Hono + Mongoose + MongoDB |
| Frontend (Vite) | `5173` | `npm run dev` | React + Vite dev server |
| Gateway | `3100` | `cd gateway && node index.js` | Webhook relay |
| Prisma Studio | `5555` | `cd server && npx prisma studio` | DB browser |

**Quick status check:** `node start-all.js` shows all running/stopped services.

---

## 4. Getting Started

### Prerequisites

- **Node.js** >= 20
- **npm** | `npm install` in both `D:\PODCAST\` and `D:\PODCAST\server\`

### Setup Steps

```bash
# 1. Install dependencies (root + server + gateway)
cd D:\PODCAST
npm install
cd server
npm install
cd ../gateway
npm install
cd ..

# 2. Set up environment
#    Server uses: D:\PODCAST\server\.env
#    Required: DATABASE_URL (default: file:./prisma/dev.db)
#    Optional: JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY, MONGODB_URI

# 3. Initialize the SQLite database
cd server
npx prisma db push
node prisma/seed.js

# 4. Start all services (in separate terminals)
#    Terminal 1: Admin Server
cd server && node index.js

#    Terminal 2: Editor Server
cd server && node editor/index.js

#    Terminal 3: Frontend
npm run dev

#    Terminal 4: Gateway (optional)
cd gateway && node index.js

# 5. Open http://localhost:5173 in your browser
```

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@podcastapp.com` | `admin123` |
| Moderator | `mod@podcastapp.com` | `mod123` |

---

## 5. Database Model

### SQLite — Admin Server (Prisma)

The complete schema lives in `server/prisma/schema.prisma`. Key models:

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Podcast** | Curated shows | `title`, `host`, `description`, `coverImage`, `status`, `featured`, `language`, `plays` |
| **Category** | Podcast categories | `name`, `slug`, `description`, `color` (M:N with Podcast) |
| **Feed** | RSS feed sources | `url`, `category`, `status`, `lastFetched` (linked to Podcast) |
| **Episode** | Episodes from RSS feeds | `title`, `description`, `audioUrl`, `duration`, `publishedAt`, `status`, `plays`, `rawData` |
| **Job** | Feed ingestion jobs | `feedId`, `status`, `message`, `runAt` |
| **AdminUser** | Admin/moderator accounts | `email`, `password`, `name`, `role` |
| **AppUser** | End-user accounts | `name`, `email`, `password`, `role`, `status`, `preferences` |
| **Activity** | Platform activity log | `type`, `user`, `detail`, `timestamp` |
| **Setting** | Key-value settings store | `key`, `value` (JSON-encoded) |
| **ReviewItem** | Moderation queue | `episodeId`, `title`, `reason`, `status`, `notes`, `flaggedBy` |
| **Highlight** | AI-generated highlights | `episodeId`, `title`, `description`, `startTime`, `endTime`, `confidence`, `status` |
| **HighlightCollection** | Groups of highlights | `name`, `description`, `slug`, `coverImage`, `color` |
| **HighlightSegment** | Sub-sections within highlights | `label`, `startTime`, `endTime`, `text`, `confidence` |
| **Playlist** | User-created playlists | `name`, `description`, `emoji` (M:N with Episode via PlaylistEpisode) |
| **SavedPodcast** | Bookmarked podcasts | `podcastId`, `userId` |
| **ListeningHistory** | User listen tracking | `episodeId`, `progress`, `playedAt` |
| **PlaylistEpisode** | Playlist-episode junction | `playlistId`, `episodeId`, `addedAt` |

### MongoDB — Editor Server (Mongoose)

Collections managed by the Editor Hono server:

| Collection | Schema | Purpose |
|-----------|--------|---------|
| **articles** | `articleSchema` | Editorial articles with `title`, `slug`, `excerpt`, `coverImage`, `status`, `tags`, `contentBlocks`, `seo` |
| **drafts** | `draftSchema` | Article versions with `articleId`, `version`, `content`, `changes`, `savedBy` |
| **editor_settings** | `editorSettingsSchema` | Key-value editor settings |
| **podcast, episode, category, highlight, highlightcollection** | Auto-synced | Replicated from Admin SQLite (see [§14](#14-cross-system-data-sync)) |

---

## 6. API Reference

### Admin API (Express — Port 3002)

All endpoints prefixed with `/api/` or `/api/admin/`. Protected routes require `Authorization: Bearer <token>` header.

#### Authentication

| Method | Endpoint | Auth | Rate Limited | Body |
|--------|----------|------|--------------|------|
| `GET` | `/api/health` | No | No | — |
| `POST` | `/api/admin/login` | No | Yes (20/15m) | `{ email, password }` |
| `POST` | `/api/login` | No | Yes (20/15m) | `{ email, password }` |
| `POST` | `/api/register` | No | Yes (20/15m) | `{ name, email, password }` |

#### Podcasts

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| `GET` | `/api/admin/podcasts` | Yes | Any |
| `GET` | `/api/admin/podcasts/search?q=` | Yes | Any |
| `GET` | `/api/admin/podcasts/raw` | Yes | Any |
| `GET` | `/api/admin/podcasts/:id` | Yes | Any |
| `POST` | `/api/admin/podcasts` | Yes | Any |
| `PUT` | `/api/admin/podcasts/:id` | Yes | Any |
| `DELETE` | `/api/admin/podcasts/:id` | Yes | Any |
| `POST` | `/api/admin/podcasts/:id/duplicate` | Yes | Any |
| `POST` | `/api/admin/podcasts/bulk-update` | Yes | Any |

#### Episodes

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| `GET` | `/api/admin/episodes` | Yes | Any |
| `PUT` | `/api/admin/episodes/:id` | Yes | Any |
| `POST` | `/api/admin/episodes/:id/detect` | Yes | Any |

#### Feeds (RSS)

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| `GET` | `/api/admin/feeds` | Yes | Admin |
| `POST` | `/api/admin/feeds` | Yes | Admin |
| `DELETE` | `/api/admin/feeds/:id` | Yes | Admin |
| `POST` | `/api/admin/feeds/:id/ingest` | Yes | Admin |
| `POST` | `/api/admin/feeds/ingest-all` | Yes | Admin |

#### Users (App Users)

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| `GET` | `/api/admin/users` | Yes | Admin |
| `GET` | `/api/admin/users/:id` | Yes | Admin |
| `POST` | `/api/admin/users` | Yes | Admin |
| `PUT` | `/api/admin/users/:id/status` | Yes | Admin |
| `PUT` | `/api/admin/users/:id/role` | Yes | Admin |
| `PUT` | `/api/admin/users/:id/password` | Yes | Admin |
| `DELETE` | `/api/admin/users/:id` | Yes | Admin |

#### Highlights

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| `GET` | `/api/admin/highlights` | Yes | Any |
| `GET` | `/api/admin/highlights/:id` | Yes | Any |
| `PUT` | `/api/admin/highlights/:id` | Yes | Any |
| `DELETE` | `/api/admin/highlights/:id` | Yes | Any |
| `POST` | `/api/admin/highlights/:id/approve` | Yes | Any |
| `POST` | `/api/admin/highlights/:id/reject` | Yes | Any |
| `GET` | `/api/admin/highlight-collections` | Yes | Any |
| `POST` | `/api/admin/highlight-collections` | Yes | Any |
| `PUT` | `/api/admin/highlight-collections/:id` | Yes | Any |
| `DELETE` | `/api/admin/highlight-collections/:id` | Yes | Any |

#### Review Queue

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| `GET` | `/api/admin/reviews` | Yes | Any |
| `POST` | `/api/admin/reviews` | Yes | Any |
| `PUT` | `/api/admin/reviews/:id` | Yes | Any |
| `DELETE` | `/api/admin/reviews/:id` | Yes | Any |

#### Dashboard & Analytics

| Method | Endpoint | Auth |
|--------|----------|------|
| `GET` | `/api/admin/dashboard` | Yes |
| `GET` | `/api/admin/activity` | Yes |

#### Settings

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| `GET` | `/api/admin/settings` | Yes | Admin |
| `PUT` | `/api/admin/settings` | Yes | Admin |

#### User Data (per-user)

| Method | Endpoint | Auth |
|--------|----------|------|
| `GET` | `/api/admin/listening-history` | Yes |
| `GET` | `/api/admin/playlists` | Yes |
| `POST` | `/api/admin/playlists` | Yes |
| `PUT` | `/api/admin/playlists/:id` | Yes |
| `DELETE` | `/api/admin/playlists/:id` | Yes |
| `GET` | `/api/admin/saved-podcasts` | Yes |
| `POST` | `/api/admin/saved-podcasts` | Yes |
| `DELETE` | `/api/admin/saved-podcasts/:podcastId` | Yes |
| `GET` | `/api/admin/playlists/:id/episodes` | Yes |
| `POST` | `/api/admin/playlists/:id/episodes` | Yes |
| `DELETE` | `/api/admin/playlists/:id/episodes/:episodeId` | Yes |

#### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/episodes` | Public episodes list |
| `GET` | `/api/podcasts` | Public podcasts list |
| `GET` | `/api/podcasts/:id` | Public podcast detail |
| `GET` | `/api/categories` | Public categories |
| `GET` | `/api/highlights` | Public highlights |
| `GET` | `/api/highlights/:id` | Public highlight detail |
| `GET` | `/api/highlight-collections` | Public collections |
| `GET` | `/api/highlight-collections/:slug` | Public collection detail |
| `GET` | `/api/stats` | Public platform statistics |

### Editor API (Hono — Port 3003)

All endpoints prefixed with `/api/editor/`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/editor/health` | Health check + MongoDB status |
| `GET` | `/api/editor/articles` | List articles (query: `status`, `page`, `pageSize`, `tag`) |
| `GET` | `/api/editor/articles/:id` | Get one article (full content) |
| `POST` | `/api/editor/articles` | Create article |
| `PUT` | `/api/editor/articles/:id` | Update article |
| `DELETE` | `/api/editor/articles/:id` | Delete article |
| `POST` | `/api/editor/articles/:id/publish` | Publish article |
| `GET` | `/api/editor/drafts/:articleId` | List drafts for an article |
| `POST` | `/api/editor/drafts` | Create/save draft |
| `GET` | `/api/editor/settings/:key` | Get editor setting |
| `PUT` | `/api/editor/settings/:key` | Upsert editor setting |
| `POST` | `/api/editor/sync` | Receive sync from Admin |

### Gateway API (Express — Port 3100)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/subscribers` | List subscribers |
| `POST` | `/subscribe` | Subscribe subsystem to events |
| `POST` | `/unsubscribe` | Unsubscribe subsystem |
| `POST` | `/webhook/:event` | Receive event webhook |

---

## 7. Frontend Routes

### Public Routes

| Path | Page | Component |
|------|------|-----------|
| `/` | Home | `HomePage` — Hero, Featured Podcasts, Latest Episodes, AI Highlights, Analytics, Stats, Footer |
| `/podcasts` | Browse All | `PodcastsPage` — searchable grid of podcasts |
| `/podcast/:id` | Podcast Detail | `PodcastDetailPage` — episodes list, metadata |
| `/search` | Search Results | `SearchResultsPage` — full-text search |
| `/highlights` | Highlight Gallery | `HighlightsPage` — browse all AI highlights |
| `/highlights/:id` | Highlight Detail | `HighlightDetailPage` — single highlight with segments |
| `/highlights/collection/:slug` | Collection | `HighlightCollectionPage` — curated highlight groups |
| `/category/:slug` | Category Browse | `CategoryBrowsePage` — podcasts filtered by category |
| `/auth` | Login / Register | `AuthPage` — authentication form |

### User Routes (Protected — any authenticated user)

| Path | Page | Component |
|------|------|-----------|
| `/dashboard` | User Dashboard | `UserDashboard` — activity, listening history, saved |
| `/library` | User Library | `UserLibrary` — playlists, saved podcasts |
| `/profile` | Profile | `UserProfile` — edit name, bio, preferences |

### Admin Routes (Protected — admin or moderator role)

| Path | Page | Component |
|------|------|-----------|
| `/admin` | Dashboard | `AdminDashboard` (admin) / `EditorDashboard` (moderator) |
| `/admin/podcasts` | Podcasts | `AdminPodcasts` — CRUD table with search, filter, bulk |
| `/admin/podcasts/new` | New Podcast | `AdminPodcastForm` — create form |
| `/admin/podcasts/:id/edit` | Edit Podcast | `AdminPodcastForm` — edit form |
| `/admin/episodes` | Episodes | `AdminEpisodes` — filter, search, toggle publish/hide |
| `/admin/users` | Users | `AdminUsers` — manage app users, roles, statuses |
| `/admin/analytics` | Analytics | `AdminAnalytics` — charts, trends, metrics |
| `/admin/settings` | Settings | `AdminSettings` — platform configuration |
| `/admin/feeds` | Feeds | `AdminFeeds` — manage RSS feed sources, trigger ingestion |
| `/admin/highlights` | Highlights | `AdminHighlights` — approve/reject/edit AI highlights |
| `/admin/highlights/new` | New Highlight | `AdminHighlightEditor` — manual highlight creation |
| `/admin/highlights/collections` | Collections | `AdminHighlightCollections` — manage groups |
| `/admin/highlights/:id` | Edit Highlight | `AdminHighlightEditor` — edit mode |
| `/admin/reviews` | Review Queue | `AdminReviewQueue` — moderate flagged episodes |
| `/admin/raw-data` | Raw Data | `AdminRawData` — inspect raw episode JSON |
| `/editor/articles` | Articles | `EditorArticles` — list of editorial articles |
| `/editor/articles/:id` | Article Editor | `EditorArticleEdit` — full article editor with blocks |

---

## 8. Features by Category

### Public-Facing Features
- **Homepage** with animated GSAP intro, hero section, featured podcasts, latest episodes, AI highlights showcase, analytics dashboard, statistics strip, and footer
- **Podcast Browsing** with search, category filtering, and detail pages
- **Episode Discovery** with search results and pagination
- **AI Highlight Gallery** with public viewing, detail pages, and curated collections
- **Category Browsing** by slug
- **User Authentication** — login and registration

### User Dashboard Features
- **Listening History** — track what you've listened to and progress
- **Playlist Management** — create/delete/edit playlists with emoji identifiers
- **Saved Podcasts** — bookmark podcasts for quick access
- **Profile Management** — edit name, bio, social links, theme preferences and notification settings

### Admin Features
- **Dashboard** — KPIs (users, episodes, plays, feeds), charts (plays by month, user growth, revenue, weekly plays, retention, devices, countries, plays by category), recent ingestion jobs
- **Podcast Management** — full CRUD, duplicate, bulk update (status, featured, categories), search, pagination
- **Episode Management** — list/filter by podcast, edit title/description, toggle publish/hide status, trigger highlight detection
- **Feed Management** — add/remove RSS feeds, manual ingestion, view ingestion job history
- **User Management** — create/edit/delete users, change roles (user/moderator/admin), suspend/activate, reset passwords
- **Analytics** — interactive charts for user growth, plays, revenue, devices, retention, countries, categories
- **Settings** — key-value platform configuration
- **Highlight Management** — approve/reject/edit AI-detected highlights, manage collections, manual creation
- **Review Queue** — moderate flagged episodes
- **Raw Data Viewer** — inspect raw episode JSON data with expandable viewer

### Editor Features
- **Articles** — full editorial content management with rich content blocks (text, image, embed, quote, heading, list)
- **Draft System** — versioned drafts with auto-increment
- **Publishing Workflow** — draft → review → published → archived
- **SEO Management** — meta title, description, canonical URL per article
- **Settings** — key-value editor configuration
- **Cross-System Sync** — receives replicated podcast/episode/highlight data from Admin

---

## 9. Admin Panel Guide

### Accessing the Admin Panel

1. Go to **http://localhost:5173/admin**
2. If not logged in, you'll be redirected to `/auth`
3. Log in with **admin@podcastapp.com / admin123**
4. Admins see the full sidebar. Moderators see the Editor Dashboard.

### Admin Sidebar Navigation

The sidebar is organized into sections:

```
📊 Dashboard
🎙️ Podcasts
📻 Episodes
👥 Users
📈 Analytics
⚙️ Settings
📡 Feeds
✨ Highlights
📝 Collections
🔍 Review Queue
📋 Raw Data
📰 Articles
```

### Podcasts Page
- **Search** by title or description
- **Filter** by category or status (published/draft/archived)
- **Sort** by plays (descending by default)
- **Actions per podcast:** Edit, Delete, Duplicate
- **Bulk actions:** Select multiple → update status or featured flag
- **Pagination** with configurable page size

### Episodes Page
- **Filter** by podcast (dropdown selector)
- **Edit** episode title and description inline
- **Toggle published/hidden** status with a switch
- **Trigger highlight detection** per episode
- **Pagination** with configurable page size

### Feeds Page
- **Add Feed** — enter URL, optional category, optional podcast association
- **Status indicators** — active/failed/pending
- **Actions:** Ingest now, Delete, View job history
- **Ingest All** button to trigger all feeds at once
- **Automatic ingestion** runs every 15 minutes via cron

### Users Page
- **Search** by name or email
- **Filter** by role (user/moderator/admin) or status (active/suspended/inactive)
- **Actions:** Change role, Suspend/Activate, Change password, Delete
- **Add new user** with name, email, password, role

### Analytics Page
Displays interactive charts:
- **User Growth** — 12-month trend
- **Plays by Month** — traffic over time
- **Revenue by Month** — estimated ($3.99 per user)
- **Weekly Plays** — day-of-week distribution
- **User Retention** — week-over-week cohort retention
- **Devices** — mobile/desktop/tablet/Smart TV split
- **Top Countries** — geographic distribution
- **Plays by Category** — per-category breakdown

### Settings Page
Key-value configuration editor. Add/edit/delete platform settings.

### Review Queue Page
- **Filter by status** — Pending / Reviewed / Dismissed
- **Approve** or **Dismiss** flagged items
- **Pagination** with status filter buttons

### Raw Data Page
- **Search** across episode titles
- **Expandable JSON viewer** — click any row to see full raw data
- **Pagination**

---

## 10. Content Editor Guide

### Accessing the Editor

1. Navigate to **/admin** → if you're a moderator, you see the Editor Dashboard
2. Click **Articles** in the sidebar to see the articles list
3. Admins can access it via `/editor/articles`

### Articles List
- Shows all articles with status badges (draft/review/published/archived)
- Filter by **status** (dropdown) or **tag** (click on tags)
- Create new article or edit existing ones

### Article Editor

The editor provides a structured content-block-based editing experience:

**Metadata:**
- **Title** — article headline
- **Slug** — URL-friendly identifier (auto-generated)
- **Excerpt** — short description
- **Cover Image** — URL to hero image
- **Status** — draft → review → published → archived
- **Tags** — array of string tags
- **Podcast ID** — optional link to a podcast
- **Episode ID** — optional link to an episode

**Content Blocks:**
Add, reorder, and edit content sections:

| Block Type | Description |
|------------|-------------|
| **Text** | Rich text content |
| **Image** | Image embed with URL |
| **Embed** | External embed (e.g., YouTube) |
| **Quote** | Pull quote styling |
| **Heading** | Section header |
| **List** | Bulleted or numbered list |

**SEO Panel:**
- Meta Title
- Meta Description
- Canonical URL

**Publishing:**
- Click **Publish** to set status to `published` with timestamp
- Save as **draft** for later editing
- Each save creates a new **versioned draft** (undo history)

---

## 11. User Dashboard Guide

### Accessing User Features

1. Register at `/auth` or use an existing account
2. Navigate to `/dashboard` for personalized features

### User Dashboard
- **Overview** of recent activity
- Quick access to listening history

### Library (`/library`)
- **Playlists** — create named playlists with emoji icons
- **Saved Podcasts** — quick access to bookmarked shows

### Profile (`/profile`)
- Edit display **name**
- Update **bio**
- Set **social links** (JSON format)
- Configure **preferences:**
  - Theme (dark/light)
  - Email notifications
  - Push notifications
  - Digest emails

---

## 12. AI Highlight System

### Overview
The platform automatically detects and creates highlights from podcast episodes using content analysis. Highlights represent interesting moments, key points, quotes, and sentiment shifts within episodes.

### Highlight Structure
```
Highlight
├── title, description
├── startTime, endTime (seconds from episode start)
├── confidence (0.0 - 1.0)
├── status (pending → approved → rejected)
├── tags (JSON array)
├── collection (optional HighlightCollection)
└── segments[]
    ├── label: key_point | quote | summary | sentiment_shift
    ├── startTime, endTime
    ├── text
    └── confidence
```

### How Highlight Detection Works
- Runs as a **scheduled job** (`startHighlightDetectionJob`) every 5 minutes
- Processes episodes that have `audioUrl` but no existing highlights
- For each episode, creates 1-3 simulated highlights with segments (text extraction from episode description)
- Highlights are created in `pending` status and need **approval**

### Managing Highlights (Admin)

**Highlights List** (`/admin/highlights`):
- Filter by status (pending/approved/rejected)
- Search by episode
- **Approve** — mark as approved, visible to public
- **Reject** — mark as rejected
- **Edit** — modify title, description, timing, tags
- **Delete** — remove highlight

**Collections** (`/admin/highlights/collections`):
- Create thematic groups (name, description, slug, cover image, color)
- Assign highlights to collections
- Collections are publicly accessible via `/highlights/collection/:slug`

### Public Display
- `/highlights` — gallery of approved highlights
- `/highlights/:id` — individual highlight with audio timestamps and segments
- `/highlights/collection/:slug` — curated collection view

---

## 13. RSS Feed Ingestion

### How It Works

1. **Feeds are added** via the Admin Feeds page or API (`POST /api/admin/feeds`)
2. Each feed has a **URL** pointing to an RSS/Atom XML feed
3. **Ingestion** fetches the feed, parses episodes, and stores them

### Ingestion Triggers

| Method | Trigger |
|--------|---------|
| **Automatic** | Cron job every 15 minutes — `startIngestionJob` in `server/jobs/ingestion.js` |
| **Manual (single)** | Click "Ingest Now" on a feed row or `POST /api/admin/feeds/:id/ingest` |
| **Manual (all)** | Click "Ingest All" button or `POST /api/admin/feeds/ingest-all` |

### Ingestion Process
1. Fetches the RSS XML from feed URL
2. Parses with `rss-parser`
3. For each episode item:
   - Checks for duplicate by comparing published date and title
   - Creates new `Episode` record with parsed metadata
   - Stores raw RSS XML in episode `rawData` field
4. Creates a **Job** record tracking the result
5. Failed feeds are marked with `failed` status

### Feed Statuses
| Status | Meaning |
|--------|---------|
| `active` | Feed is being monitored |
| `failed` | Last ingestion failed |
| `pending` | Just added, not yet ingested |

---

## 14. Cross-System Data Sync

### Prisma → MongoDB Sync

Every write operation (create/update/delete) on the Admin Prisma models is automatically replicated to the Editor's MongoDB. This is implemented via `prisma.$extends` middleware in `server/index.js`.

**Synchronized models:** `podcast`, `episode`, `category`, `highlight`, `highlightcollection`

The sync is best-effort — failures log warnings but don't block the original operation.

### Prisma → Supabase Sync (Optional)

If `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in environment, the same middleware also replicates to Supabase/PostgreSQL.

### Gateway Webhook System

The Gateway (port 3100) provides a publish/subscribe webhook relay:

```bash
# Subscribe a subsystem
curl -X POST http://localhost:3100/subscribe \
  -H "Content-Type: application/json" \
  -d '{"subsystem":"my-service","url":"http://localhost:4000/webhooks","events":["podcast.created","episode.updated"]}'

# Send a webhook event
curl -X POST http://localhost:3100/webhook/podcast.created \
  -H "Content-Type: application/json" \
  -d '{"id":"123","title":"Example"}'

# List subscribers
curl http://localhost:3100/subscribers

# Unsubscribe
curl -X POST http://localhost:3100/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"subsystem":"my-service"}'
```

The gateway retries failed deliveries with exponential backoff (1s → 2s → 4s).

---

## 15. Review Queue System

### Overview
The Review Queue provides a moderation workflow for flagging and reviewing episodes that need attention.

### Database Model (`ReviewItem`)
| Field | Type | Description |
|-------|------|-------------|
| `id` | String | UUID primary key |
| `episodeId` | String | Referenced episode |
| `feedId` | String? | Source feed |
| `podcastId` | String? | Parent podcast |
| `title` | String | Episode title |
| `reason` | String | Flag reason: `duplicate`, `inappropriate`, `broken_audio`, `user_report`, `other` |
| `status` | String | `pending`, `reviewed`, `dismissed` |
| `notes` | String | Moderator notes |
| `flaggedBy` | String | System or user ID |
| `reviewedBy` | String? | Moderator who reviewed |

### How to Use

**Admin page:** `/admin/reviews`

1. View **pending** items by default
2. Filter by status: Pending / Reviewed / Dismissed
3. Click **Approve** to mark as reviewed
4. Click **Dismiss** to dismiss the flag
5. Items can also be created via the API for automatic flagging

### API Usage

```bash
# List reviews (filter by status)
GET /api/admin/reviews?status=pending

# Create a review item
POST /api/admin/reviews
Body: { "episodeId": "...", "title": "...", "reason": "broken_audio" }

# Update (approve/dismiss)
PUT /api/admin/reviews/:id
Body: { "status": "reviewed", "notes": "Audio works fine" }

# Delete
DELETE /api/admin/reviews/:id
```

---

## 16. Episode Toggle (Publish/Hide)

### Overview
Admins can toggle individual episodes between `published` and `hidden` status without deleting them.

### How It Works
- Each episode has a `status` field: `"published"` or `"hidden"`
- The frontend provides a **switch toggle** on each episode row
- Hidden episodes are excluded from public lists

### Toggling from the Admin Panel

1. Go to **/admin/episodes**
2. Find the episode you want to toggle
3. Click the **Publish/Hide** switch
4. The change takes effect immediately via `PUT /api/admin/episodes/:id`

### API Reference

```bash
# Get episodes (status field returned)
GET /api/admin/episodes
Response: { data: [{ ..., status: "published" }], ... }

# Toggle status
PUT /api/admin/episodes/:id
Body: { "status": "hidden" }
Body: { "status": "published" }
```

---

## 17. Authentication & Roles

### Role System

Three tiers of users exist with distinct permissions:

| Role | Scope | Access |
|------|-------|--------|
| **admin** | Full platform | All admin features, user management, settings |
| **moderator** | Content editorial | Editor dashboard, highlights, reviews, articles |
| **user** | End-user features | Dashboard, library, profile, listening history |

### Authentication Flow

1. **Login** via `POST /api/login` (user) or `POST /api/admin/login` (admin)
2. Receives `{ token, user: { id, name, email, role } }`
3. Token stored in `localStorage` under key `podcastai_auth`
4. Token attached to all subsequent API requests via axios interceptor
5. Token expires after **24 hours**
6. On 401 response, session is cleared and user is redirected to `/auth`

### Registration
- Public registration at `POST /api/register`
- Creates user with `"user"` role and `"active"` status
- Auto-logs in after registration

### Route Protection (Frontend)

| Component | Behavior |
|-----------|----------|
| `ProtectedRoute` | Redirects unauthenticated to `/auth` |
| `AdminRoute` | Requires auth + staff role (admin/moderator), else redirects to `/dashboard` |

### Role-Based API Protection (Backend)

Admin-only routes (feeds, jobs, users, settings) are protected with:
```js
app.use('/api/admin/feeds', authorize(['admin']));
app.use('/api/admin/jobs', authorize(['admin']));
app.use('/api/admin/users', authorize(['admin']));
app.use('/api/admin/settings', authorize(['admin']));
```

All other `/api/admin` routes are accessible to any authenticated staff user (admin or moderator).

---

## 18. Input Validation

Both servers use **Zod 4** for request body validation.

### Admin Server (Express)

Defined in `server/validation/schemas.js` — 20 Zod schemas:

| Schema | Used For |
|--------|----------|
| `createPodcastSchema` | POST /podcasts |
| `updatePodcastSchema` | PUT /podcasts/:id |
| `bulkUpdatePodcastsSchema` | POST /podcasts/bulk-update |
| `updateEpisodeSchema` | PUT /episodes/:id |
| `createFeedSchema` | POST /feeds |
| `createCategorySchema` | POST /categories |
| `updateCategorySchema` | PUT /categories/:id |
| `updateHighlightSchema` | PUT /highlights/:id |
| `createCollectionSchema` | POST /highlight-collections |
| `updateCollectionSchema` | PUT /highlight-collections/:id |
| `updateSettingSchema` | PUT /settings |
| `createUserSchema` | POST /users |
| `updateUserSchema` | PUT /users/:id |
| `loginSchema` | POST /login, /admin/login |
| `registerSchema` | POST /register |
| `changePasswordSchema` | PUT /users/:id/password |
| `statusChangeSchema` | PUT /users/:id/status |
| `roleChangeSchema` | PUT /users/:id/role |
| `createPlaylistSchema` | POST /playlists |
| `addPlaylistEpisodeSchema` | POST /playlists/:id/episodes |
| `paginationSchema` | Query validation for list endpoints |

**Validation middleware:**
- `validateBody(schema)` — validates `req.body`, returns `{ error, details }` on failure
- `validateQuery(schema)` — validates `req.query`, same error format

### Editor Server (Hono)

Defined in `server/editor/index.js` — 5 Zod schemas:

| Schema | Validator |
|--------|-----------|
| `createArticleSchema` | `validator('json')` on POST /articles |
| `updateArticleSchema` | `validator('json')` on PUT /articles/:id |
| `createDraftSchema` | `validator('json')` on POST /drafts |
| `updateSettingSchema` | `validator('json')` on PUT /settings/:key |
| `syncSchema` | `validator('json')` on POST /sync |

**Error format:**
```json
{
  "error": "Validation failed",
  "details": {
    "title": ["Invalid input: expected string"],
    "email": ["Invalid email format"]
  }
}
```

---

## 19. Rate Limiting

### Admin Server (Express)

Using `express-rate-limit`:

| Limiter | Window | Max Requests | Applied To |
|---------|--------|-------------|------------|
| `authLimiter` | 15 minutes | 20 | Login endpoints, registration |
| `apiLimiter` | 15 minutes | 200 | All other API routes |

Headers: `RateLimit-*` standard headers enabled.

### Editor Server (Hono)

Custom in-memory rate limiter:

| Limiter | Window | Max Requests | Applied To |
|---------|--------|-------------|------------|
| Default | 60 seconds | 100 | All routes globally |

Keyed by IP + path combination.

---

## 20. Scheduled Jobs

Two cron jobs run on the Admin server:

### Feed Ingestion Job (`server/jobs/ingestion.js`)
- **Schedule:** Every 15 minutes
- **Function:** `startIngestionJob(prisma)`
- **Action:** Iterates all feeds with `active` status, fetches and parses RSS, creates new episodes, records job results

### Highlight Detection Job (`server/jobs/highlight-detection.js`)
- **Schedule:** Every 5 minutes
- **Function:** `startHighlightDetectionJob(prisma)`
- **Action:** Finds episodes with no existing highlights, runs auto-detection algorithm, creates pending highlights with segments

---

## 21. Subsystems & Gateway

### Subsystems Directory (`D:\PODCAST\subsystems\`)

Planned/experimental subsystem implementations:

| Subsystem | Path | Description |
|-----------|------|-------------|
| `admin-next/` | `subsystems/admin-next/` | Admin redesign experiment |
| `editor-vue/` | `subsystems/editor-vue/` | Vue-based editor experiment |

These are **not active** — they demonstrate how separate services can integrate via the Gateway.

### Gateway (`D:\PODCAST\gateway\`)

A lightweight **webhook relay** on port 3100. Any service can subscribe to events and receive real-time notifications. The Gateway maintains a `subscribers.json` file for persistence and retries failed deliveries with exponential backoff (1s → 2s → 4s).

---

## 22. Common Operations

### Start All Services (Quick Reference)

```bash
# Terminal 1: Admin API
cd D:\PODCAST\server
node index.js

# Terminal 2: Editor Server
cd D:\PODCAST\server
node editor\index.js

# Terminal 3: Frontend
cd D:\PODCAST
npm run dev

# Terminal 4: Gateway (optional)
cd D:\PODCAST\gateway
node index.js
```

### Database Management

```bash
# View database structure
cd server && npx prisma studio

# Push schema changes (safe for existing data)
cd server && npx prisma db push

# Reset database (deletes all data)
cd server && npx prisma db push --force-reset

# Seed initial data
cd server && node prisma/seed.js

# Create a new migration
cd server && npx prisma migrate dev --name description
```

### Running Tests / Linting

```bash
# Lint frontend
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Adding a New RSS Feed

1. Go to **Admin → Feeds** (`/admin/feeds`)
2. Click "Add Feed"
3. Enter:
   - **URL** — the RSS/Atom feed XML URL
   - **Category** — optional category label
   - **Podcast** — link to an existing podcast (or leave unlinked)
4. Click "Add Feed" → feed appears in the list
5. Click "Ingest Now" to fetch immediately, or wait for the 15-minute cron job

### Bulk Operations on Podcasts

1. Go to **Admin → Podcasts** (`/admin/podcasts`)
2. Select rows using checkboxes
3. Choose bulk action:
   - **Update Status** — set all to published/draft/archived
   - **Toggle Featured** — mark/unmark as featured
   - **Set Categories** — assign categories in bulk
4. Click "Apply" to execute

### Soft-Hiding an Episode

1. Go to **Admin → Episodes** (`/admin/episodes`)
2. Find the episode
3. Click the **toggle switch** — it turns from green (published) to gray (hidden)
4. To unhide, click the switch again

### Running Highlight Detection Manually

1. Go to **Admin → Episodes** (`/admin/episodes`)
2. Find an episode (preferably with a long description)
3. Click the "Detect" button in the actions column
4. Go to **Admin → Highlights** (`/admin/highlights`)
5. Filter by `pending` to see the newly detected highlights
6. **Approve** or **Reject** each highlight

---

## 23. Troubleshooting

### Server Won't Start

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `Cannot find module '@prisma/client'` | Prisma not generated | `cd server && npx prisma generate` |
| `Can't reach database` | Missing `.env` file | Create `server/.env` with `DATABASE_URL="file:./prisma/dev.db"` |
| Port already in use | Another process on the port | Kill the process: `npx kill-port 3002` or change port in `.env` |
| `prisma db push` hangs | DB lock from another process | Kill other `node index.js` or Prisma Studio instances |

### Database Reset (Complete)

```bash
cd server
del prisma\dev.db       # Delete SQLite database
npx prisma db push       # Recreate schema
node prisma/seed.js      # Seed with default data
```

### Login Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Invalid credentials" | Wrong email/password | Re-seed: `cd server && node prisma/seed.js` |
| "Too many login attempts" | Rate limited (20/15min) | Wait 15 minutes |
| Session expires immediately | Token clock skew | Check server/system time sync |
| 401 on API calls | Missing or expired token | Re-login at `/auth` |

### Editor Server MongoDB

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Editor won't start | MongoDB download fails | Set `MONGODB_URI` in env to use an external MongoDB |
| Slow first startup | Downloading mongod binary | Wait — happens once on first run |
| Data lost on restart | In-memory MongoDB | Set `MONGODB_DB_PATH` env for persistent storage |

### Sync Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Editor MongoDB has stale data | Sync warning in logs | Check that Editor server is running and reachable |
| Supabase sync failing | Missing env vars | Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` |
| Data appears on one server but not the other | Best-effort sync | Sync is not transactional — data will eventually propagate |

### 404 on `/admin/reviews` or `/admin/raw-data`

These are lazy-loaded admin routes. If you get a 404 in the browser:
1. The React dev server handles client-side routing — make sure Vite is running
2. Hard refresh or navigate from the sidebar
3. If the API itself returns 404, check that the server route files are present in `server/routes/`

### Feature Not Appearing

If a feature or UI element seems missing:
1. Check the **role** of your logged-in user — some features require `admin` role
2. Try logging in as `admin@podcastapp.com / admin123`
3. Check the browser console for API errors
4. Verify all required services are running (`node start-all.js`)

---

> **Need help?** Check the `.omo/` directory for implementation plans and session logs, or look at individual route/component source files for detailed implementation.
